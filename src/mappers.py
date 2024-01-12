import re
from datetime import datetime
from typing import Dict, Any, Optional

import dateutil
import dateutil.parser

from models import (
    BitwardenEvent,
    SettingsConfig,
    BitwardenApiKey,
    BitwardenApiConfig
)


def get_bitwarden_event(data: Dict[str, Any]):
    if "type" not in data or "date" not in data:
        raise Exception("Invalid Bitwarden event")

    date = datetime_from_str(data["date"])

    device = None
    device_str: Optional[str] = data.get("device", None)
    if device_str is not None:
        device = int(device_str)

    return BitwardenEvent(data["type"],
                          data.get("itemId", None),
                          data.get("collectionId", None),
                          data.get("groupId", None),
                          data.get("policyId", None),
                          data.get("memberId", None),
                          data.get("actingUserId", None),
                          date,
                          device,
                          data.get("ipAddress", None))


def get_bitwarden_api_config(settings_config: SettingsConfig,
                             api_key: BitwardenApiKey) -> BitwardenApiConfig:
    return BitwardenApiConfig(settings_config.api_url,
                              settings_config.identity_url,
                              api_key.client_id,
                              api_key.client_secret)


def datetime_from_str(date_str: Optional[str]) -> Optional[datetime]:
    if date_str is None:
        return None

    if "." not in date_str:
        return dateutil.parser.isoparse(date_str)

    date_str_split = date_str.split(".")

    fractional_seconds_str = date_str_split[1]
    fractional_seconds_str = re.sub(r"\D", "", fractional_seconds_str)
    if len(fractional_seconds_str) > 6:
        fractional_seconds_str = fractional_seconds_str[:6]

    new_date_str = f"{date_str_split[0]}.{fractional_seconds_str}Z"

    return dateutil.parser.isoparse(new_date_str)


def datetime_to_str(date: datetime) -> str:
    return date.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
