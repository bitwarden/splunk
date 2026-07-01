import json
from typing import Optional, Dict, Any, List

from mappers import datetime_from_str, datetime_to_str
from models import (
    SettingsConfig,
    BitwardenApiKey,
    EventLogsCheckpoint,
    BitwardenEventsRequest
)
from splunk_api import SplunkApi
from utils import get_logger, set_logging_level, obj_to_json, app_name, secure_url

from solnlib.modular_input.checkpointer import KVStoreCheckpointer

CHECKPOINT_COLLECTION = "bitwarden_checkpoints"
CHECKPOINT_KEY = "event_logs"


class Config:
    def __init__(self, splunk_api: SplunkApi):
        self.logger = get_logger()
        self.splunk_api = splunk_api
        self._checkpointer = self._create_checkpointer()

    def _create_checkpointer(self) -> KVStoreCheckpointer:
        return KVStoreCheckpointer(
            CHECKPOINT_COLLECTION,
            self.splunk_api.service.token,
            app_name,
            owner="nobody",
        )

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
        try:
            data = self._checkpointer.get(CHECKPOINT_KEY)
        except Exception as e:
            self.logger.warning('failed to read checkpoint from KVStore: %s', e)
            data = None

        if data is None:
            data = self._migrate_legacy_checkpoint()

        checkpoint = Config._parse_checkpoint_data(data)
        self.logger.debug('checkpoint %s', checkpoint)
        return checkpoint

    def update_checkpoint(self,
                          checkpoint: EventLogsCheckpoint,
                          next_request: Optional[BitwardenEventsRequest]):

        last_log_date = checkpoint.last_log_date
        if next_request is None and checkpoint.next_request is not None:
            last_log_date = checkpoint.next_request.end

        new_checkpoint = EventLogsCheckpoint(next_request=next_request,
                                             last_log_date=last_log_date)

        checkpoint_data = Config._serialize_checkpoint(new_checkpoint)

        try:
            self._checkpointer.update(CHECKPOINT_KEY, checkpoint_data)
        except Exception as e:
            self.logger.error('failed to update checkpoint: %s', e)
            raise

        return new_checkpoint

    def _migrate_legacy_checkpoint(self) -> Optional[Dict[str, Any]]:
        """Attempt to read from the legacy 'eventsapi' KVStore collection."""
        try:
            legacy_data_list = self.splunk_api.get_storage_configuration('eventsapi')
            if legacy_data_list and len(legacy_data_list) > 0:
                legacy = legacy_data_list[0]
                self.logger.info('migrating legacy checkpoint from eventsapi KVStore')

                migrated = {}
                next_req = legacy.get('next_request', None)
                if next_req and isinstance(next_req, dict):
                    migrated['next_request_start'] = next_req.get('start')
                    migrated['next_request_end'] = next_req.get('end')
                    migrated['next_request_continuation_token'] = next_req.get('continuation_token')

                migrated['last_log_date'] = legacy.get('last_log_date')

                self._checkpointer.update(CHECKPOINT_KEY, migrated)
                return migrated
        except Exception as e:
            self.logger.debug('no legacy checkpoint to migrate: %s', e)
        return None

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

    @staticmethod
    def _parse_checkpoint_data(data: Optional[Dict[str, Any]]) -> EventLogsCheckpoint:
        if data is None:
            return EventLogsCheckpoint()

        next_request = None
        start = data.get('next_request_start')
        end = data.get('next_request_end')
        if start and end:
            next_request = BitwardenEventsRequest(
                start=datetime_from_str(start),
                end=datetime_from_str(end),
                continuation_token=data.get('next_request_continuation_token')
            )

        last_log_date = datetime_from_str(data.get('last_log_date'))

        return EventLogsCheckpoint(next_request=next_request,
                                   last_log_date=last_log_date)

    @staticmethod
    def _serialize_checkpoint(checkpoint: EventLogsCheckpoint) -> Dict[str, Any]:
        data = {}
        if checkpoint.next_request is not None:
            data['next_request_start'] = datetime_to_str(checkpoint.next_request.start)
            data['next_request_end'] = datetime_to_str(checkpoint.next_request.end)
            if checkpoint.next_request.continuation_token:
                data['next_request_continuation_token'] = checkpoint.next_request.continuation_token
        if checkpoint.last_log_date is not None:
            data['last_log_date'] = datetime_to_str(checkpoint.last_log_date)
        return data
