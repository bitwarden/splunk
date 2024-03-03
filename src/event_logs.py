import sys
from dataclasses import asdict
from datetime import datetime, timedelta, timezone
from typing import Any, Optional, List

from bitwarden_api import BitwardenApi
from models import (
    BitwardenEventsRequest,
    EventLogsCheckpoint,
    SettingsConfig,
    BitwardenEvent,
    BitwardenEnhancedEvent,
    BitwardenGroup,
    BitwardenMember
)
from utils import get_logger, obj_to_json


class EventLogsWriter:
    def __init__(self,
                 bitwarden_api: BitwardenApi,
                 checkpoint: EventLogsCheckpoint,
                 settings_config: SettingsConfig):
        self.logger = get_logger()
        self.bitwarden_api = bitwarden_api
        self.checkpoint = checkpoint
        self.settings_config = settings_config
        self.bitwarden_groups = self.__get_bitwarden_groups()
        self.bitwarden_members_id, self.bitwarden_members_user_id = self.__get_bitwarden_members()

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

            events = self.__enhance_bitwarden_events(events_response.data)

            yield next_request, events

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
            # First run..
            if self.settings_config.start_date is not None:
                # and start_date enforced via configuration file
                start_datetime = self.settings_config.start_date
            else:
                # by default go back in time 1 year
                start_datetime = datetime.now(tz=timezone.utc) - timedelta(days=365)
        else:
            # last run's end date + 1 microsecond to avoid duplicates
            # (Bitwarden event api start and end dates are inclusive)
            start_datetime = start_datetime + timedelta(microseconds=1)

        # Bitwarden's events are stored in eventual consistent database
        end_datetime = datetime.now(tz=timezone.utc) - timedelta(seconds=30)

        if start_datetime.timestamp() >= end_datetime.timestamp():
            self.logger.debug('start date %s is past end date %s',
                              start_datetime, end_datetime)
            return None

        return BitwardenEventsRequest(start_datetime, end_datetime)

    def __write_event(self, obj: Any):
        self.logger.debug('writing event log %s', obj)

        obj_json = obj_to_json(obj)

        self.logger.debug('writing event log json %s', obj_json)

        print(obj_json)

    def __get_bitwarden_groups(self):
        response = self.bitwarden_api.get_groups()

        return {group.id: group for group in response.data}

    def __get_bitwarden_members(self):
        response = self.bitwarden_api.get_members()

        return ({member.id: member for member in response.data},
                {member.userId: member for member in response.data})

    def __enhance_bitwarden_events(self, bitwarden_events: List[BitwardenEvent]) -> List[BitwardenEnhancedEvent]:

        events = []

        for bitwarden_event in bitwarden_events:
            group: Optional[BitwardenGroup] = None
            member: Optional[BitwardenMember] = None
            acting_user: Optional[BitwardenMember] = None

            if bitwarden_event.groupId is not None:
                group = self.bitwarden_groups.get(bitwarden_event.groupId, None)

            if bitwarden_event.memberId is not None:
                member = self.bitwarden_members_id.get(bitwarden_event.memberId, None)

            if bitwarden_event.actingUserId is not None:
                acting_user = self.bitwarden_members_user_id.get(bitwarden_event.actingUserId, None)

            group_name = group.name if group is not None else None
            member_name = member.name if member is not None else None
            member_email = member.email if member is not None else None
            acting_user_name = acting_user.name if acting_user is not None else None
            acting_user_email = acting_user.email if acting_user is not None else None

            event = BitwardenEnhancedEvent(**asdict(bitwarden_event),
                                           groupName=group_name,
                                           memberName=member_name,
                                           memberEmail=member_email,
                                           actingUserName=acting_user_name,
                                           actingUserEmail=acting_user_email)

            events.append(event)

        return events
