from typing import Optional, Dict, Any, List

from mappers import datetime_from_str
from models import (
    SettingsConfig,
    BitwardenApiKey,
    EventLogsCheckpoint,
    BitwardenEventsRequest
)


def parse_settings_config(settings: Optional[Dict[str, Dict[str, Any]]]) -> SettingsConfig:
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

    return SettingsConfig(api_url,
                          identity_url,
                          start_date,
                          settings_config.get('loggingLevel', None))


def parse_bitwarden_api_key(bitwarden_api_key: Optional[str]) -> BitwardenApiKey:
    if bitwarden_api_key is None or "_" not in bitwarden_api_key:
        raise Exception("Invalid Bitwarden API key")

    client_id, client_secret = bitwarden_api_key.split("_", 1)

    return BitwardenApiKey(client_id, client_secret)


def parse_checkpoint(events_api_config_list: Optional[List[Any]]) -> EventLogsCheckpoint:
    if events_api_config_list is None or len(events_api_config_list) == 0:
        return EventLogsCheckpoint()

    events_api_config = events_api_config_list[0]

    if events_api_config is None or '_key' not in events_api_config:
        raise Exception("Invalid checkpoint")

    next_request = None
    next_request_dict = events_api_config.get('next_request', None)
    if next_request_dict is not None:
        next_request = BitwardenEventsRequest(datetime_from_str(next_request_dict['start']),
                                              datetime_from_str(next_request_dict['end']),
                                              next_request_dict.get('continuation_token', None))

    last_log_date = datetime_from_str(events_api_config.get('last_log_date', None))

    return EventLogsCheckpoint(events_api_config['_key'],
                               next_request,
                               last_log_date)
