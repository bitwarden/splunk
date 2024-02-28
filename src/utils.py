import json
import sys
import os
import logging
from dataclasses import is_dataclass, asdict
from datetime import datetime, date

from solnlib.log import Logs

from mappers import datetime_to_str

app_name = "bitwarden_event_logs_beta"

def read_session_token() -> str:
    session_token = sys.stdin.readline(5000).strip()
    if session_token is None or session_token == '':
        raise Exception('Session token not found')
    return session_token


def is_splunk_environment():
    return os.environ.get("SPLUNK_HOME") is not None


def set_logging_level(logging_level: str):
    get_logger().setLevel(logging_level)


def get_logger() -> logging.Logger:
    if not is_splunk_environment():
        logger = logging.Logger(app_name)
        logger.addHandler(logging.StreamHandler(sys.stdout))
        logger.setLevel(logging.DEBUG)
    else:
        Logs.set_context(log_level=logging.DEBUG)
        logger = Logs().get_logger(app_name)

    return logger


def obj_to_json(obj):
    def json_serial(obj2):
        if isinstance(obj2, (datetime, date)):
            return datetime_to_str(obj2)
        raise TypeError("Type %s not serializable" % type(obj2))

    if is_dataclass(obj):
        obj_dict = asdict(obj)
    elif isinstance(obj, dict):
        obj_dict = obj
    else:
        raise Exception("Object of type %s is not json serializable", type(obj))

    return json.dumps(obj_dict,
                      default=json_serial,
                      separators=(",", ":"))
