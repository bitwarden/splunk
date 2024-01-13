import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))

import logging

from config import Config
from bitwarden_api import BitwardenApi
from mappers import get_bitwarden_api_config
from utils import read_session_token, get_logger
from splunk_api import SplunkApi
from event_logs import EventLogsWriter


class App:
    def __init__(self):
        self.logger = get_logger()
        self.splunk_api = self.create_splunk_api()

        self.config = Config(self.splunk_api)
        self.settings_config = self.config.get_settings_config()
        self.bitwarden_api_key = self.config.get_bitwarden_api_key()
        self.checkpoint = self.config.get_checkpoint()

        self.bitwarden_api = self.create_bitwarden_api()
        self.event_logs_writer = self.create_event_logs_writer()

    def create_splunk_api(self):
        session_token = read_session_token()
        self.logger.debug('session token %s', session_token)

        return SplunkApi(session_token)

    def create_bitwarden_api(self):
        bitwarden_api_config = get_bitwarden_api_config(self.settings_config,
                                                        self.bitwarden_api_key)

        self.logger.debug('bitwarden api config %s', bitwarden_api_config)

        return BitwardenApi(bitwarden_api_config)

    def create_event_logs_writer(self):
        return EventLogsWriter(self.bitwarden_api, self.checkpoint, self.settings_config)

    def run(self):
        for next_request, events in self.event_logs_writer.read_events():
            self.event_logs_writer.write_events(events)

            self.checkpoint = self.config.update_checkpoint(self.checkpoint, next_request)

        self.checkpoint = self.config.update_checkpoint(self.checkpoint, None)


def main():
    logging.basicConfig(level=logging.CRITICAL)

    logger = get_logger()
    logger.info('started')
    try:
        app = App()
        app.run()

    except Exception as e:
        logger.error(e, exc_info=logger.level == logging.DEBUG)

    logger.info('finished')


if __name__ == '__main__':
    main()
