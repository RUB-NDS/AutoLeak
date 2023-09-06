# Celery Configuration Options
broker_url = 'redis://redis:6379'
broker_transport = 'redis'
result_backend = 'redis://redis:6379'

task_serializer = 'json'
result_serializer = 'json'
accept_content = ['json']
timezone = 'Europe/Berlin'
enable_utc = True
task_time_limit = 60*10 # 10 minutes hard limit for tasks
