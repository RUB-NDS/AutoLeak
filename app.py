#!/usr/bin/env python

from flask import Flask, request, render_template, make_response, jsonify, send_from_directory
from init import mongo_reconnect
from model import Testcase
from log import log
from  config.webrunnerconfig import load_config
import tasks
import sys
import os
from tagging import load_tagrules
import json
from functools import wraps




PORT = int(os.getenv('PORT', '9876'))
BIND_ADDR = os.getenv('BIND_ADDR', '0.0.0.0')
app = Flask(__name__)
# from werkzeug.middleware.profiler import ProfilerMiddleware
# app.wsgi_app = ProfilerMiddleware(app.wsgi_app, profile_dir='.')
app.debug = False


# main config dict, loaded when app starts
config = {}

# some endpoints are not available in demo mode
def demo_mode_check(func):
    @wraps(func)
    def check(*args, **kwargs):
        if os.getenv('DEMO_MODE', '0') != '0':
            return 'Error: This public instance of Autoleak is in Demo Mode.', 400
        return func(*args, **kwargs)

    return check


@app.route('/', methods=['GET'])
def index():
    return render_template('app/index.html',
        browsers=config.get('browsers', []),
        differences=[i['name'] for i in config.get('differences', [])],
        inclusionmethods=[i['name'] for i in config.get('inclusionmethods', [])],
        filetypes=[i['name'] for i in config.get('filetypes', [])],
    )

@app.route('/faq', methods=['GET'])
def faq():
    return render_template('app/faq.html', 
        inclusionmethods=[i['name'] for i in config.get('inclusionmethods', [])]
    )


@app.route('/api/results', methods=['POST'])
def api_results():
    # get post json data
    FILTERCONFIG = request.get_json(force=True)
    if not FILTERCONFIG :
        return 'filterconfig as json not found'
    
    dbargs = {}
    if FILTERCONFIG.get('onlyfindings'):
        dbargs['length__ne'] = 0
    if FILTERCONFIG.get('inclusionmethods') != []:
        dbargs['inclusionmethod__in'] = FILTERCONFIG.get('inclusionmethods')
    if FILTERCONFIG.get('differences') != []:
        dbargs['difference__in'] =  FILTERCONFIG.get('differences')
    if FILTERCONFIG.get('filetypes') != []:
        dbargs['filetype__in'] =  FILTERCONFIG.get('filetypes')
    if FILTERCONFIG.get('browsers') != []:
        dbargs['browser__in'] =  FILTERCONFIG.get('browsers')
    
    results = Testcase.objects(**dbargs).only('inclusionmethod', 'difference', 'filetype', 'browser', 'length', 'diff_tags')
    
    total = results.count()

    # sort
    order = request.args.get('order', default='')
    orderdir = request.args.get('dir', default='')

    if order and orderdir:
        if orderdir == '-':
            results = results.order_by('-'+order)
        else:
            results = results.order_by(order)

    # pagination
    offset = request.args.get('offset', type=int, default=-1)
    limit = request.args.get('limit', type=int, default=-1)
    if offset != -1 and limit != -1:
        results = results[offset:offset+limit]
    
    # TODO i want a dict for the json response
    # this is not the slow part
    r = json.loads(results.to_json())
    # response
    return {
        'results': r,
        'total': total,
    }


@app.route('/admin', methods=['GET', 'POST'])
@demo_mode_check
def admin():

    # POST request to filter results
    if request.method == 'POST':
        if 'inclusionmethods' not in request.form:
            return 'inclusionmethod not found'
        if 'differences' not in request.form:
            return 'difference not found'
        if 'filetypes' not in request.form:
            return 'filetype not found'
        if 'browsers' not in request.form:
            return 'browser not found'


        results=Testcase.objects(
            inclusionmethod__in=request.form.getlist('inclusionmethods'),
            difference__in=request.form.getlist('differences'),
            filetype__in=request.form.getlist('filetypes'),
            browser__in=request.form.getlist('browsers')
        ).exclude('diff_results','logs', 'testsuite', 'url').all()

    if request.method == 'GET':
        # how many to show
        if request.args.get('n'):
            n = int(request.args.get('n'))
        else:
            n = 100


        if request.args.get('findings'):
            # return only findings where Testcase.length != 0 
            results=Testcase.objects(length__ne=0).exclude('diff_results','logs', 'testsuite', 'url').all()
        else:
            # return only latest testcases
            results=Testcase.objects.exclude('diff_results','logs', 'testsuite', 'url').order_by('-time').limit(n) 

    return render_template('app/admin.html',
        browsers=config.get('browsers', []),
        differences=[i['name'] for i in config.get('differences', [])],
        inclusionmethods=[i['name'] for i in config.get('inclusionmethods', [])],
        filetypes=[i['name'] for i in config.get('filetypes', [])],
        results=results
    )


@app.route('/runner', methods=['POST'])
@demo_mode_check
def runner():
    tasksamount = 0
    basedomain = os.environ.get('BASEDOMAIN')
    if 'inclusionmethods' not in request.form:
        return 'inclusionmethod not found'
    if 'differences' not in request.form:
        return 'difference not found'
    if 'filetypes' not in request.form:
        return 'filetype not found'
    if 'browsers' not in request.form:
        return 'browser not found'

    for i in request.form.getlist('inclusionmethods'):
        for d in request.form.getlist('differences'):
            for f in request.form.getlist('filetypes'):
                for b in request.form.getlist('browsers'):
                    if(not d.isalnum() or not i.isalnum() or not f.isalnum() or not b.isalnum()):
                        log('[app]', '[-] Bad Chars')
                        return 'bad chars'
                    tasksamount+=1
                    tasks.run_testcase.apply_async(args=[ basedomain, i, d, f, b])

    return f'{tasksamount} testcases added!'


@app.route('/deleter', methods=['POST'])
@demo_mode_check
def deleter():
    tasksamount = 0
    if 'inclusionmethods' not in request.form:
        return 'inclusionmethod not found'
    if 'differences' not in request.form:
        return 'difference not found'
    if 'filetypes' not in request.form:
        return 'filetype not found'
    if 'browsers' not in request.form:
        return 'browser not found'
    for i in request.form.getlist('inclusionmethods'):
        for d in request.form.getlist('differences'):
            for f in request.form.getlist('filetypes'):
                for b in request.form.getlist('browsers'):
                    if(not d.isalnum() or not i.isalnum() or not f.isalnum() or not b.isalnum()):
                        log('[app]', '[-] Bad Chars')
                        return 'bad chars'
                    tasksamount+=1
                    try:
                        Testcase.objects.filter(
                            inclusionmethod=i,
                            difference=d,
                            filetype=f,
                            browser=b
                        ).delete()
                    except:
                        log('[app]', f"[-] Error deleting testcase {i}/{d}/{f}/{b}")

    return f'{tasksamount} testcases deleted!'
        

@app.route('/test/<inclusionmethod>/<difference>/<filetype>/<browser>')
def test(inclusionmethod, difference, filetype, browser):
    inclusionmethods = config.get('inclusionmethods', [])
    crossorigindomain = os.environ.get('CROSSORIGINDOMAIN')

    i = next((i for i in inclusionmethods if i['name'] == inclusionmethod), None)

    if not i:
        return 'Inclusionmethod not found', 404

    if request.args.get('show', None):
        with open(f'./templates/inclusionmethods/{i["template"]}', 'rb') as f:
            return f.read(), 200, {'Content-Type': 'text/plain; charset=utf-8'}
    url = f"https://{crossorigindomain}/differences/{inclusionmethod}/{difference}/{filetype}/{browser}"
    return render_template(f'inclusionmethods/{i["template"]}', url=url)



# include custom url for real world tests
@app.route('/include/<inclusionmethod>/')
def include(inclusionmethod):
    inclusionmethods = config.get('inclusionmethods', [])

    i = next((i for i in inclusionmethods if i['name'] == inclusionmethod), None)

    if i and request.args.get('url') and request.args.get('url').startswith('http'):
        return render_template(f'inclusionmethods/{i["template"]}', url=request.args.get('url'))
    return 'Inclusionmethods or URL GET parameter not found, must start with http'


@app.route('/differences/<inclusionmethod>/<difference>/<filetype>/<browser>')
def differences(inclusionmethod, difference, filetype, browser):
    differences = config.get('differences', [])
    filetypes = config.get('filetypes', [])

    # check if difference and filetype are valid
    f = next((i for i in filetypes if i['name'] == filetype), None)
    if not f:
        log('[app]', f"[-] filetype not found")
        return 'filetype not found'

    d = next((i for i in differences if i['name'] == difference), None)
    if not d:
        log('[app]', f"[-] difference not found")
        return 'difference not found'
                

    # get difference and state from db
    
    try:
        result = Testcase.objects.filter(
            inclusionmethod=inclusionmethod,
            difference=difference,
            filetype=filetype,
            browser=browser
        ).only('includee_state').first()
        state = result.includee_state
        # log('[app]', f"[+] testcase {result} has state {state}")
    except:
        log('[app]', 'difference for unknown test cases requested')
        return 'difference not in database'

    # show the current diffeence as json
    if request.args.get('show', None):
        return jsonify(d['response0'], d['response1'])
    
    # here we get response0 or response1 depending on state
    response_dict = d['response1'] if state else d['response0']

    # get current settings with state
    if request.args.get('json', None):
        response_dict['state'] = 1 if state else 0
        return jsonify(response_dict)

    # file_type can also be set from difference
    if response_dict.get('filetype', None):
        f = response_dict.get('filetype')

    # cant use send_file because it adds etags :/
    with open(f"./filetemplates/{f['filetemplate']}", 'rb') as file:
        resp = make_response(file.read())

    resp.headers['Content-Type'] = f['contenttype']

    # set statuscode
    resp.status_code = response_dict['status']
    # set headers
    for h in response_dict['headers']:
        resp.headers[h['name']] = h['value']

    return resp



@app.route('/run/<inclusionmethod>/<difference>/<filetype>/<browser>')
@demo_mode_check
def run(inclusionmethod, difference, filetype, browser):
    basedomain = os.getenv('BASEDOMAIN')
    tasks.run_testcase.apply_async(args=[basedomain, inclusionmethod, difference, filetype, browser])
    return 'Task added!'


# for manual switching 
@app.route('/switch/<inclusionmethod>/<difference>/<filetype>/<browser>')
def switch(inclusionmethod, difference, filetype, browser):

    #TODO: can mongodb negate a boolean atomically?
    result = Testcase.objects.filter(
        inclusionmethod=inclusionmethod,
        difference=difference,
        filetype=filetype,
        browser=browser
    ).first()

    if result:
        # switch state
        result.switch_state()

        return f"Switched State to {1 if result.includee_state else 0}"
    
    return 'Result not found', 404




@app.route('/logs/<inclusionmethod>/<difference>/<filetype>/<browser>')
def logs(inclusionmethod, difference, filetype, browser):
    result = Testcase.objects(
        inclusionmethod=inclusionmethod,
        difference=difference,
        filetype=filetype,
        browser=browser
    ).first()

    if result and result.logs:
        return result.logs
    return 'Logs not found', 404



@app.route('/results/<inclusionmethod>/<difference>/<filetype>/<browser>')
def results(inclusionmethod, difference, filetype, browser):
    result = Testcase.objects(
        inclusionmethod=inclusionmethod,
        difference=difference,
        filetype=filetype,
        browser=browser
    ).first()

    if not result:
        return jsonify('result entry not found')
    if not result.diff_results:
        return jsonify('result entry has no diff_results')
    
    return jsonify(result.diff_results)


@app.route('/details/<inclusionmethod>/<difference>/<filetype>/<browser>')
def details(inclusionmethod, difference, filetype, browser):
    result = Testcase.objects(
        inclusionmethod=inclusionmethod,
        difference=difference,
        filetype=filetype,
        browser=browser
    ).only(
        'diff_results.structural_difference',
        'length',
        'diff_tags',
        'time',
        'duration',
    ).first()
    
    return jsonify({
        'structural_difference': result.diff_results.get('structural_difference', None),
        'time': result.time,
        'duration': result.duration,
        'length': result.length,
        'diff_tags': result.diff_tags,
    })


@app.route('/delete/<inclusionmethod>/<difference>/<filetype>/<browser>')
@demo_mode_check
def delete(inclusionmethod, difference, filetype, browser):
    try:
        Testcase.objects.filter(
            inclusionmethod=inclusionmethod,
            difference=difference,
            filetype=filetype,
            browser=browser
        ).delete()
        return 'Result deleted'
    except:
        return 'Result not found'


@app.route('/status')
@demo_mode_check
def status():
    info = tasks.status_info()
    return info


@app.route('/celerytest')
@demo_mode_check
def celerytest():
    print("Calling debug task via", tasks.celeryapp.pool.connection)
    return tasks.debug_task.apply_async().wait()


@app.route('/flush', methods=['POST'])
@demo_mode_check
def flush():
    tasks.delete_queue()
    return 'Queue deleted'


@app.route('/resetstate', methods=['POST'])
@demo_mode_check
def resetstate():
    # set all states to 0
    Testcase.objects.update(includee_state=False)
    return 'All states set to 0'


@app.route('/purge', methods=['POST'])
@demo_mode_check
def purge_db():
    # delete all documents in the collection
    Testcase.objects.delete()
    return "Purged database"


@app.route('/tags/clean', methods=['POST'])
@demo_mode_check
def tag_clean():
    # start the celery task for tagging
    Testcase.objects.all().update( diff_tags = [] )
    return "Deleted all previous tags."


@app.route('/tags/start', methods=['POST'])
@demo_mode_check
def tag_start():
    # start the celery task for tagging
    tasks.run_tagging.apply_async()
    return "Started task of tagging all untagged results!"

# tag single test case
@app.route('/tag/<inclusionmethod>/<difference>/<filetype>/<browser>')
@demo_mode_check
def tag(inclusionmethod, difference, filetype, browser):
    tasks.run_tagging_single(inclusionmethod, difference, filetype, browser)
    return "Started task of tagging a single result!"


@app.route('/favicon.ico')
def favicon():
    return send_from_directory('static', 'favicon.ico')


@app.route('/paper.pdf')
def paper():
    return send_from_directory('static', 'autoleak_preprint.pdf')


# validate parameters
@app.before_request
def valid_params():
    if request.view_args is None:
        return
    if 'inclusionmethod' in request.view_args:
        if not request.view_args['inclusionmethod'].isalnum():
            return 'inclusionmethod must be alphanumeric', 400
    if 'difference' in request.view_args:
        if not request.view_args['difference'].isalnum():
            return 'difference must be alphanumeric', 400
    if 'filetype' in request.view_args:
        if not request.view_args['filetype'].isalnum():
            return 'filetype must be alphanumeric', 400
    if 'browser' in request.view_args:
        if not request.view_args['browser'].isalnum():
            return 'browser must be alphanumeric', 400
    return
    



def main():
    global config
    default_config = os.getenv('TEST_CONFIG', "testconfigs/default.json")

    log('[init]', f"Using config: {default_config}")


    ####################################################
    # Load the config from file
    config = load_config(default_config)

    mongo_reconnect()

    app.run(host=BIND_ADDR, port=PORT)

if "gunicorn" in os.environ.get("SERVER_SOFTWARE", ""):
    default_config = os.getenv('TEST_CONFIG', "testconfigs/default.json")
    print("Detected gunicorn, using config file", default_config)
    config = load_config(default_config)
    mongo_reconnect()


if __name__ == '__main__':
    main()
