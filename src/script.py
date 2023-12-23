import sys
import os
from logging import DEBUG, INFO, Logger

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))

from solnlib.log import Logs


def read_session_token() -> str:
    return sys.stdin.readline(5000).strip()


def get_logger() -> Logger:
    Logs.set_context(namespace='bitwarden')
    logger = Logs().get_logger('event_logs')
    logger.setLevel(DEBUG)
    return logger
