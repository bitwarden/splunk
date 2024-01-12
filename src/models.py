from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional


@dataclass
class SettingsConfig:
    api_url: str
    identity_url: str
    start_date: Optional[datetime] = None
    logging_level: Optional[str] = None


@dataclass
class BitwardenApiKey:
    client_id: str
    client_secret: str


@dataclass
class BitwardenApiConfig:
    events_api_url: str
    identity_api_url: str
    client_id: str
    client_secret: str


@dataclass
class BitwardenEventsRequest:
    start: datetime
    end: datetime
    continuation_token: Optional[str] = None


@dataclass
class BitwardenEvent:
    type: int
    itemId: Optional[str]
    collectionId: Optional[str]
    groupId: Optional[str]
    policyId: Optional[str]
    memberId: Optional[str]
    actingUserId: Optional[str]
    date: datetime
    device: Optional[int]
    ipAddress: Optional[str]


@dataclass
class BitwardenEventsResponse:
    data: List[BitwardenEvent]
    continuationToken: Optional[str] = None


@dataclass
class SplunkEvent:
    actingUserEmail: str
    actingUserId: str
    actingUserName: str
    date: datetime
    device: int
    # hash: str
    ipAddress: str
    memberEmail: str
    memberId: str
    memberName: str
    type: int


@dataclass
class EventLogsCheckpoint:
    key_id: Optional[str] = None
    next_request: Optional[BitwardenEventsRequest] = None
    last_log_date: Optional[datetime] = None
