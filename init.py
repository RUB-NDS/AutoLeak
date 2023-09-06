import config.mongodbconfig
from config import celeryconfig
from celery import Celery
import mongoengine



####################################################
# Connect mongoengine to the server
# Note: This is only for the flask webrunner.
# Celery will re-connect for each task, due to thread-safety

def mongo_reconnect(database_name=""):
    try:
        mongoengine.disconnect()
    except:
        print("Tried to discoconnect, but failed")

    mongoengine.connect(
        username=config.mongodbconfig.MONGO_USER,
        password=config.mongodbconfig.MONGO_PASS,
        host=config.mongodbconfig.MONGO_HOST,
        port=config.mongodbconfig.MONGO_PORT,
        db= ( database_name or 'autograph' ),
        authentication_source="admin") #, alias='default', connect=False
mongo_reconnect("default")

