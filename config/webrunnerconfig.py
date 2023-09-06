import json
from log import log
import os




def load_config(config_file):
    if not os.path.isfile(config_file):
        log("Config file does not exist:", config_file)

    # parse the config file
    with open(config_file, 'r') as f:
        config = json.loads(f.read())

    return config


