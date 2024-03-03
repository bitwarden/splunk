import re
from datetime import datetime
from typing import Dict, Any, Optional

import dateutil
import dateutil.parser

from models import (
    BitwardenEvent,
    SettingsConfig,
    BitwardenApiKey,
    BitwardenApiConfig,
    BitwardenGroup,
    BitwardenMember
)


def get_bitwarden_event(data: Dict[str, Any]):
    if "type" not in data or "date" not in data:
        raise Exception("Invalid Bitwarden event")

    date = datetime_from_str(data["date"])

    device = None
    device_str: Optional[str] = data.get("device", None)
    if device_str is not None:
        device = int(device_str)

    return BitwardenEvent(type=data["type"],
                          date=date,
                          itemId=data.get("itemId", None),
                          collectionId=data.get("collectionId", None),
                          groupId=data.get("groupId", None),
                          policyId=data.get("policyId", None),
                          memberId=data.get("memberId", None),
                          actingUserId=data.get("actingUserId", None),
                          device=device,
                          ipAddress=data.get("ipAddress", None))


def get_bitwarden_group(data: Dict[str, Any]):
    if "id" not in data or "name" not in data:
        raise Exception("Invalid Bitwarden group")

    return BitwardenGroup(id=data["id"],
                          name=data["name"])


def get_bitwarden_member(data: Dict[str, Any]):
    if "id" not in data or "email" not in data or "userId" not in data:
        raise Exception("Invalid Bitwarden member")

    return BitwardenMember(id=data["id"],
                           userId=data["userId"],
                           email=data["email"],
                           name=data.get("name", None))


def get_bitwarden_api_config(settings_config: SettingsConfig,
                             api_key: BitwardenApiKey) -> BitwardenApiConfig:
    return BitwardenApiConfig(events_api_url=settings_config.api_url,
                              identity_api_url=settings_config.identity_url,
                              client_id=api_key.client_id,
                              client_secret=api_key.client_secret)


def datetime_from_str(date_str: Optional[str]) -> Optional[datetime]:
    if date_str is None:
        return None

    date_str = date_str.strip()
    if date_str == '':
        return None

    # no time
    if ":" not in date_str:
        date_str = date_str + "T00:00:00"

    # no fractional seconds
    if "." not in date_str:
        date_str = date_str + ".0"

    date_str_split = date_str.split(".")

    fractional_seconds_str = date_str_split[1]
    fractional_seconds_str = re.sub(r"\D", "", fractional_seconds_str)
    if len(fractional_seconds_str) > 6:
        fractional_seconds_str = fractional_seconds_str[:6]

    new_date_str = f"{date_str_split[0]}.{fractional_seconds_str}Z"

    return dateutil.parser.isoparse(new_date_str)


def datetime_to_str(date: datetime) -> str:
    return date.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
