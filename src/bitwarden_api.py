import os
from typing import Optional, Dict, Any

import requests

from mappers import (
    get_bitwarden_event,
    get_bitwarden_group,
    get_bitwarden_member
)
from models import (
    BitwardenApiConfig,
    BitwardenEventsResponse,
    BitwardenEventsRequest,
    BitwardenGroupsResponse,
    BitwardenMembersResponse
)

from utils import get_logger

REQUESTS_TIMEOUT = (10, 30)


def _join_urls(base: str, *paths: str):
    url = base
    if not url.endswith("/"):
        url += "/"

    for path in paths:
        if path.startswith("/"):
            url += path[1:]
        else:
            url += path
        url += "/"

    url = url[:-1]

    return url


def _get_custom_ca_certificate_location() -> Optional[str]:
    if 'SPLUNK_HOME' not in os.environ:
        return None

    app_cacerts_file = os.path.join(os.environ.get('SPLUNK_HOME'), 'etc', 'auth',
                                    'bitwarden_event_logs_cacerts.pem')
    if not os.path.isfile(app_cacerts_file):
        return None

    return app_cacerts_file


class BitwardenApi:
    def __init__(self, api_config: BitwardenApiConfig):
        self.logger = get_logger()
        self.api_config = api_config
        self.access_token = self.get_access_token()

    def get_access_token(self) -> str:
        url = _join_urls(self.api_config.identity_api_url, "connect/token")
        headers = {
            "Content-Type": "application/x-www-form-urlencoded"
        }
        data = {
            "grant_type": "client_credentials",
            "client_id": self.api_config.client_id,
            "client_secret": self.api_config.client_secret,
            "scope": "api.organization",
        }

        self.logger.debug('Request url %s',
                          url)

        response = requests.post(url,
                                 headers=headers,
                                 data=data,
                                 timeout=REQUESTS_TIMEOUT,
                                 verify=_get_custom_ca_certificate_location())

        response_dict = self.__get_response_json(response)

        if 'access_token' not in response_dict:
            raise Exception('Access token not found in response')

        return response_dict["access_token"]

    def get_events(self, request: BitwardenEventsRequest) -> BitwardenEventsResponse:
        url = _join_urls(self.api_config.events_api_url, "/public/events")

        query_params = {
            "start": request.start,
            "end": request.end
        }

        if request.continuation_token is not None:
            query_params["continuationToken"] = request.continuation_token

        response_dict = self.__send_get_request(url, query_params)

        data = [get_bitwarden_event(item_dict) for item_dict in response_dict.get("data", [])]

        # The Bitwarden API may return an empty string for the continuationToken
        # when there are no more pages. Normalize this to "None" to ensure it is
        # handled properly.
        return BitwardenEventsResponse(
            data=data,
            continuationToken=response_dict.get("continuationToken", None) or None
        )

    def get_groups(self):
        url = _join_urls(self.api_config.events_api_url, "/public/groups")

        response_dict = self.__send_get_request(url, None)

        data = [get_bitwarden_group(item_dict) for item_dict in response_dict.get("data", [])]

        return BitwardenGroupsResponse(data)

    def get_members(self):
        url = _join_urls(self.api_config.events_api_url, "/public/members")

        response_dict = self.__send_get_request(url, None)

        data = [get_bitwarden_member(item_dict) for item_dict in response_dict.get("data", [])]

        return BitwardenMembersResponse(data)

    def __send_get_request(self, url: str, query_params: Optional[Dict[str, Any]]) -> Any:
        headers = {
            "Authorization": f"Bearer {self.access_token}"
        }

        self.logger.debug('Request url %s, query params %s',
                          url, query_params)

        response = requests.get(url,
                                headers=headers,
                                params=query_params,
                                timeout=REQUESTS_TIMEOUT,
                                verify=_get_custom_ca_certificate_location())

        return self.__get_response_json(response)

    def __get_response_json(self, response):
        self.logger.debug('Response status code %s', response.status_code)
        response.raise_for_status()

        return response.json()
