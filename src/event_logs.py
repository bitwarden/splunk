import json
import sys
from dataclasses import asdict, is_dataclass
from datetime import datetime, date, timedelta, timezone
from logging import Logger
from typing import Any, Optional, List

from bitwarden_api import BitwardenApi
from models import BitwardenEventsRequest, EventLogsCheckpoint, SettingsConfig
from utils import get_logger, obj_to_json
from splunk_api import SplunkApi


class EventLogsWriter:
    def __init__(self,
                 bitwarden_api: BitwardenApi,
                 checkpoint: EventLogsCheckpoint,
                 settings_config: SettingsConfig):
        self.logger = get_logger()
        self.bitwarden_api = bitwarden_api
        self.checkpoint = checkpoint
        self.settings_config = settings_config

    def read_events(self):
        self.logger.debug('reading events')

        next_request = self.__get_first_request()
        if next_request is None:
            return

        while True:
            events_response = self.bitwarden_api.get_events(next_request)
            if len(events_response.data) == 0:
                break

            next_request = BitwardenEventsRequest(next_request.start,
                                                  next_request.end,
                                                  events_response.continuationToken)

            yield next_request, events_response.data

            if events_response.continuationToken is None:
                break

    def write_events(self, events: List[Any]):
        self.logger.info('writing %s events', len(events))

        for event in events:
            self.logger.debug('event %s', event)
            self.__write_event(event)

        # enforces checkpoint update after each batch of events
        sys.stdout.flush()

    def __get_first_request(self):
        #
        if self.checkpoint.next_request is not None:
            self.logger.debug('using next request from checkpoint %s',
                              self.checkpoint.next_request)
            return self.checkpoint.next_request

        start_datetime = self.checkpoint.last_log_date
        if start_datetime is None:
            # start_date enforced via configuration file
            if self.settings_config.start_date is not None:
                start_datetime = self.settings_config.start_date
            else:
                # by default go back up to 1 year
                start_datetime = datetime.now(tz=timezone.utc) - timedelta(days=365)
        else:
            # last run's end date + 1 microsecond to avoid duplicates
            # (Bitwarden event api start and end dates are inclusive)
            start_datetime = start_datetime + timedelta(microseconds=1)

        # Bitwarden's events are stored in eventual consistent database
        end_datetime = datetime.now(tz=timezone.utc) - timedelta(seconds=30)

        if start_datetime >= end_datetime:
            self.logger.debug('start date %s is past end date %s',
                              start_datetime, end_datetime)
            return None

        return BitwardenEventsRequest(start_datetime, end_datetime)

    def __write_event(self, obj: Any):
        self.logger.debug('writing event log %s', obj)

        obj_json = obj_to_json(obj)

        self.logger.debug('writing event log json %s', obj_json)

        print(obj_json)
