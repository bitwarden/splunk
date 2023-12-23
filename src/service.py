from logging import Logger
from splunklib.client import connect, Service, Configurations, Index


class AppService:
    def __init__(self, session_token: str, logger: Logger):
        self.logger = logger

        self.service = connect(
            token=session_token,
            auto_login=True
        )
