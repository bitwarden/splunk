import requests

from mappers import get_bitwarden_event
from models import (
    BitwardenApiConfig,
    BitwardenEventsResponse,
    BitwardenEventsRequest
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

        self.logger.debug('Request url %s, headers %s, data %s',
                          url, headers, data)

        response = requests.post(url,
                                 headers=headers,
                                 data=data,
                                 timeout=REQUESTS_TIMEOUT)
        self.logger.debug('Response status code %s', response.status_code)
        response.raise_for_status()

        response_json = response.json()
        self.logger.debug('Response json %s', response_json)

        if 'access_token' not in response_json:
            raise Exception('Access token not found in response')

        return response_json["access_token"]

    def get_events(self, request: BitwardenEventsRequest) -> BitwardenEventsResponse:
        url = _join_urls(self.api_config.events_api_url, "/public/events")
        headers = {
            "Authorization": f"Bearer {self.access_token}"
        }
        query_params = {
            "start": request.start,
            "end": request.end
        }

        if request.continuation_token is not None:
            query_params["continuationToken"] = request.continuation_token

        self.logger.debug('Request url %s, headers %s, query params %s',
                          url, headers, query_params)

        response = requests.get(url,
                                headers=headers,
                                params=query_params,
                                timeout=REQUESTS_TIMEOUT)
        self.logger.debug('Response status code %s', response.status_code)
        response.raise_for_status()

        response_dict = response.json()
        self.logger.debug('Response %s', response_dict)

        data = [get_bitwarden_event(item_dict) for item_dict in response_dict.get("data", [])]

        return BitwardenEventsResponse(data,
                                       response_dict.get("continuationToken", None))
