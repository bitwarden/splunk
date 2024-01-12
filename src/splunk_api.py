from typing import Optional, Dict, Any, List

from splunklib.client import (
    connect,
    Service,
    StoragePassword,
    ConfigurationFile,
    KVStoreCollection
)

from utils import get_logger


class SplunkApi:
    def __init__(self, session_token: str):
        self.logger = get_logger()
        self.service: Service = connect(
            token=session_token,
            auto_login=True,
            owner="nobody",
            app="bitwarden_event_logs",
            sharing="app"
        )

    def get_configuration(self, file_name: str) -> Optional[Dict[str, Dict[str, Any]]]:
        if file_name not in self.service.confs:
            self.logger.debug('configuration file %s not found', file_name)
            return None

        configuration_file: ConfigurationFile = self.service.confs[file_name]

        file_props = dict()

        for prop in configuration_file:
            file_props[prop.name] = prop.content

        self.logger.debug('configuration file %s for file name %s',
                          file_props, file_name)

        return file_props

    def create_storage_configuration(self,
                                     collection_id: str,
                                     value_json: str):
        kvstore_collection = self.__get_storage_collection(collection_id)

        self.logger.debug('inserting into kvstore collection %s value %s',
                          collection_id, value_json)

        kvstore_collection.data.insert(value_json)

    def update_storage_configuration(self,
                                     collection_id: str,
                                     key_id: str,
                                     value_json: str):
        kvstore_collection = self.__get_storage_collection(collection_id)

        self.logger.debug('updating kvstore collection %s for key %s value %s',
                          collection_id, key_id, value_json)

        kvstore_collection.data.update(key_id, value_json)

    def get_storage_configuration(self, collection_id: str) -> Optional[List[str]]:
        kvstore_collection = self.__get_storage_collection(collection_id)

        data = kvstore_collection.data.query()

        self.logger.debug('retrieved items from kvstore collection %s data %s',
                          collection_id, data)

        return list(data)

    def get_storage_password(self, key: str) -> Optional[str]:
        if key not in self.service.storage_passwords:
            self.logger.debug('storage password %s not found', key)
            return None

        storage_password: StoragePassword = self.service.storage_passwords[key]

        self.logger.debug('storage password %s for key %s',
                          storage_password, key)

        return storage_password.clear_password

    def __get_storage_collection(self, collection_id: str) -> KVStoreCollection:
        if collection_id not in self.service.kvstore:
            raise Exception('kvstore collection %s not found', collection_id)

        kvstore_collection: KVStoreCollection = self.service.kvstore[collection_id]

        self.logger.debug('kvstore collection exist %s for key %s',
                          kvstore_collection is not None, collection_id)

        return kvstore_collection
