import json
import os
import sys
from dataclasses import asdict
from typing import Optional

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))

from datetime import date, datetime, timedelta
import logging

from config import (
    parse_settings_config,
    parse_bitwarden_api_key,
    parse_checkpoint
)
from bitwarden_api import BitwardenApi
from models import BitwardenEventsRequest, EventLogsCheckpoint
from mappers import get_bitwarden_api_config
from utils import read_session_token, get_logger, set_logging_level, obj_to_json
from splunk_api import SplunkApi
from event_logs import EventLogsWriter


class App:
    def __init__(self):
        self.logger = get_logger()
        self.splunk_api = self.create_splunk_api()
        self.settings_config = self.get_settings_config()
        self.bitwarden_api = self.create_bitwarden_api()
        self.checkpoint = self.get_checkpoint()
        self.event_logs_writer = self.create_event_logs_writer()

    def create_splunk_api(self):
        session_token = read_session_token()
        self.logger.debug('session token %s', session_token)

        return SplunkApi(session_token)

    def get_settings_config(self):
        settings_config_dict = self.splunk_api.get_configuration('script')
        settings_config = parse_settings_config(settings_config_dict)

        self.logger.debug('settings config %s', settings_config)

        if settings_config.logging_level is not None:
            set_logging_level(settings_config.logging_level)
        return settings_config

    def create_bitwarden_api(self):
        bitwarden_api_key_dict = self.splunk_api.get_storage_password("bitwarden_event_logs_realm:api_key")
        bitwarden_api_key = parse_bitwarden_api_key(bitwarden_api_key_dict)

        bitwarden_api_config = get_bitwarden_api_config(self.settings_config, bitwarden_api_key)

        self.logger.debug('bitwarden api config %s', bitwarden_api_config)

        return BitwardenApi(bitwarden_api_config)

    def get_checkpoint(self) -> EventLogsCheckpoint:
        events_api_config_list = self.splunk_api.get_storage_configuration('eventsapi')
        checkpoint = parse_checkpoint(events_api_config_list)
        self.logger.debug('checkpoint %s', checkpoint)

        return checkpoint

    def create_event_logs_writer(self):
        return EventLogsWriter(self.bitwarden_api, self.checkpoint, self.settings_config)

    def update_checkpoint(self, next_request: Optional[BitwardenEventsRequest]):

        last_log_date = self.checkpoint.last_log_date
        if next_request is None and self.checkpoint.next_request is not None:
            last_log_date = self.checkpoint.next_request.end

        checkpoint = EventLogsCheckpoint(self.checkpoint.key_id,
                                         next_request,
                                         last_log_date)

        checkpoint_json = obj_to_json(checkpoint)

        if checkpoint.key_id is None:
            self.splunk_api.create_storage_configuration('eventsapi',
                                                         checkpoint_json)
            self.checkpoint = self.get_checkpoint()
        else:
            self.splunk_api.update_storage_configuration('eventsapi',
                                                         checkpoint.key_id,
                                                         checkpoint_json)
            self.checkpoint = checkpoint

    def run(self):
        for next_request, events in self.event_logs_writer.read_events():
            self.event_logs_writer.write_events(events)

            self.update_checkpoint(next_request)

        self.update_checkpoint(None)


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
