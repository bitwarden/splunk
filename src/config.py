from typing import Optional, Dict, Any, List

from mappers import datetime_from_str
from models import (
    SettingsConfig,
    BitwardenApiKey,
    EventLogsCheckpoint,
    BitwardenEventsRequest
)
from splunk_api import SplunkApi
from utils import get_logger, set_logging_level, obj_to_json, app_name, secure_url


class Config:
    def __init__(self, splunk_api: SplunkApi):
        self.logger = get_logger()
        self.splunk_api = splunk_api

    def get_settings_config(self):
        settings_config_dict = self.splunk_api.get_configuration('script')
        settings_config = Config.__parse_settings_config(settings_config_dict)

        self.logger.debug('settings config %s', settings_config)

        if settings_config.logging_level is not None:
            set_logging_level(settings_config.logging_level)
        return settings_config

    def get_bitwarden_api_key(self):
        bitwarden_api_key_dict = self.splunk_api.get_storage_password(f"{app_name}_realm:api_key")
        bitwarden_api_key = Config.__parse_bitwarden_api_key(bitwarden_api_key_dict)

        return bitwarden_api_key

    def get_checkpoint(self) -> EventLogsCheckpoint:
        events_api_config_list = self.splunk_api.get_storage_configuration('eventsapi')
        checkpoint = Config.__parse_checkpoint(events_api_config_list)

        self.logger.debug('checkpoint %s', checkpoint)

        return checkpoint

    def update_checkpoint(self,
                          checkpoint: EventLogsCheckpoint,
                          next_request: Optional[BitwardenEventsRequest]):

        last_log_date = checkpoint.last_log_date
        if next_request is None and checkpoint.next_request is not None:
            last_log_date = checkpoint.next_request.end

        new_checkpoint = EventLogsCheckpoint(checkpoint.key_id,
                                             next_request,
                                             last_log_date)

        new_checkpoint_json = obj_to_json(new_checkpoint)

        if new_checkpoint.key_id is None:
            self.splunk_api.create_storage_configuration('eventsapi',
                                                         new_checkpoint_json)
            return self.get_checkpoint()
        else:
            self.splunk_api.update_storage_configuration('eventsapi',
                                                         new_checkpoint.key_id,
                                                         new_checkpoint_json)
            return new_checkpoint

    @classmethod
    def __parse_settings_config(cls, settings: Optional[Dict[str, Dict[str, Any]]]) -> SettingsConfig:
        if settings is None or 'config' not in settings:
            raise Exception("Invalid settings configuration")

        settings_config = settings['config']

        if (settings_config is None
                or 'apiUrl' not in settings_config
                or 'identityUrl' not in settings_config):
            raise Exception("Invalid settings configuration")

        api_url: str = settings_config['apiUrl']
        identity_url: str = settings_config['identityUrl']

        # Backward compatibility
        api_url = api_url.strip(" \"'")
        identity_url = identity_url.strip(" \"")

        start_date = datetime_from_str(settings_config.get('startDate', None))

        return SettingsConfig(api_url=secure_url(api_url),
                              identity_url=secure_url(identity_url),
                              start_date=start_date,
                              logging_level=settings_config.get('loggingLevel', None))

    @classmethod
    def __parse_bitwarden_api_key(cls, bitwarden_api_key: Optional[str]) -> BitwardenApiKey:
        if bitwarden_api_key is None or "_" not in bitwarden_api_key:
            raise Exception("Invalid Bitwarden API key")

        client_id, client_secret = bitwarden_api_key.split("_", 1)

        return BitwardenApiKey(client_id, client_secret)

    @classmethod
    def __parse_checkpoint(cls, events_api_config_list: Optional[List[Any]]) -> EventLogsCheckpoint:
        if events_api_config_list is None or len(events_api_config_list) == 0:
            return EventLogsCheckpoint()

        events_api_config = events_api_config_list[0]

        if events_api_config is None or '_key' not in events_api_config:
            raise Exception("Invalid checkpoint")

        next_request = None
        next_request_dict = events_api_config.get('next_request', None)
        if next_request_dict is not None:
            next_request = BitwardenEventsRequest(start=datetime_from_str(next_request_dict['start']),
                                                  end=datetime_from_str(next_request_dict['end']),
                                                  continuation_token=next_request_dict.get('continuation_token', None))

        last_log_date = datetime_from_str(events_api_config.get('last_log_date', None))

        return EventLogsCheckpoint(events_api_config['_key'],
                                   next_request,
                                   last_log_date)
