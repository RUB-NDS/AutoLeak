import celery

import tagging
from init import mongo_reconnect
from makeGraph import makeGraph
from model import Testcase
import time
from log import log
import asyncio
import io
import logging
from diff import diffGraphs
from datetime import datetime
from celery import Celery
from celery.signals import task_prerun
from config import celeryconfig


# Start the Celery application
celeryapp = Celery('autograph',
                   result_backend=celeryconfig.result_backend,
                   broker_url=celeryconfig.broker_url,
                   broker_host="redis",
                   broker_port=6379,
                   redis_host='redis',
                   redis_port=6379,
                   SECRET_KEY='not_a_secret',
                   broker_transport='redis',
                   cache_backend='memory',
                   )
celeryapp.config_from_object(celeryconfig)
celeryapp.set_default()
# celeryapp.conf.update(celeryconfig)
celeryapp.autodiscover_tasks()


@task_prerun.connect
def on_task_init(*args, **kwargs):
    mongo_reconnect()


@celery.shared_task(max_retries=3,
                    throws=(ValueError,),
                    autoretry_for=(ValueError,),
                    retry_backoff=1,
                    retry_jitter=True,
                    retry_backoff_max=60)
def run_testcase(basedomain, inclusionmethod, difference, filetype, browser):
    start = time.time()
    log(f"Started with {inclusionmethod}-{difference}-{filetype}-{browser}")
    try:
        # delete the test case so we can re-run it
        Testcase.objects(
            inclusionmethod=inclusionmethod,
            difference=difference,
            filetype=filetype,
            browser=browser).delete()
    except:
        pass

    result = Testcase(
        inclusionmethod=inclusionmethod,
        difference=difference,
        filetype=filetype,
        browser=browser,
    )

    result.url = f"https://{basedomain}/test/{inclusionmethod}/{difference}/{filetype}/{browser}"
    result.time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    result.logs = "Running...\n"
    result.save()

    # logging is a bit of magic
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    log_stream = io.StringIO()
    logger.addHandler(logging.StreamHandler(log_stream))

    try:
        # create first graph
        g1 = asyncio.run(makeGraph(
            result.url,
            browser,
            verbose=True,
            headless=False,
            logger=logger
        ))
        result.logs = log_stream.getvalue()
        result.save()

        # switch state
        result.switch_state()

        # create second graph
        g2 = asyncio.run(makeGraph(
            result.url,
            browser,
            verbose=True,
            headless=False,
            logger=logger
        ))
        result.logs = log_stream.getvalue()
        result.save()

        # switch state back
        result.switch_state()

        # diff graphs and save results
        diff = diffGraphs(g1, g2)
        result.diff_results.clear()
        result.diff_results.update(diff)
        result.logs = log_stream.getvalue()

        result.length = len(diff['paths'])
        # update result in db
        result.duration = f'{time.time() - start:.2f}s'
        result.time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    except Exception as e:
        log(f"Error {e}")
        result.logs += f'An exception occurred: {repr(e)}'
        result.save()
        raise e
    result.save()


def delete_queue():
    celeryapp.control.purge()


def status_info():
    i = celeryapp.control.inspect()
    actives = i.active() or {}
    reserved = i.reserved() or {}
    return {
        'workers': len(actives),  # get a list of active tasks
        # get a list of tasks registered
        'queue': ["/".join(task['args']) for worker in actives.values() for task in worker],
        # get a list of tasks registered
        'reserved': ["/".join(task['args']) for worker in reserved.values() for task in worker],
    }


@celery.shared_task(max_retries=3,
                    throws=(ValueError,),
                    autoretry_for=(ValueError,),
                    retry_backoff=1,
                    retry_jitter=True,
                    retry_backoff_max=60,
                    bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
    return "the debug task return value"


@celery.shared_task(max_retries=1,
                    throws=(ValueError,),
                    autoretry_for=(ValueError,),
                    retry_backoff=1,
                    retry_jitter=True,
                    retry_backoff_max=60,
                    bind=True,
                    time_limit=3600*3)
def run_tagging(self):
    with open('config/tagrules.yml', 'r') as f:
        tagrules = tagging.load_tagrules(f)

    # only get testcases that have a result
    # no_cache otherwise we run into memory issues :/
    testcases = Testcase.objects(length__ne=0).no_cache().only(
        'diff_results', 'diff_tags').order_by('-time')
    n = 0
    m = testcases.count()
    for testcase in testcases:
        n += 1
        if (n % 100 == 0):
            print(f'[Tagging] Tagged {n}/{m}')
        diffpaths = [x['path'] for x in testcase.diff_results.get(
            "structural_difference", {}).get("roots_of_change", [])]
        try:
            if diffpaths:
                tags = list(tagging.tag(diffpaths, tagrules))
                testcase.diff_tags = tags
                testcase.save()
        except Exception as e:
            print('[Tagging] Error:', e)

    print('[Tagging] Done tagging!')


@celery.shared_task(max_retries=1,
                    throws=(ValueError,),
                    autoretry_for=(ValueError,),
                    retry_backoff=1,
                    retry_jitter=True,
                    retry_backoff_max=60,
                    bind=True,
                    time_limit=600)
def run_tagging_single(self, inclusionmethod, difference, filetype, browser):
    with open('config/tagrules.yml', 'r') as f:
        tagrules = tagging.load_tagrules(f)

    testcase = Testcase.objects(
        inclusionmethod=inclusionmethod,
        difference=difference,
        filetype=filetype,
        browser=browser
    ).first()

    diffpaths = [x['path'] for x in testcase.diff_results.get(
        "structural_difference", {}).get("roots_of_change", [])]
    try:
        if diffpaths:
            tags = list(tagging.tag(diffpaths, tagrules))
            testcase.diff_tags = tags
            testcase.save()
    except Exception as e:
        print('[Tagging] Error:', e)
