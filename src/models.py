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
    date: datetime
    itemId: Optional[str]
    collectionId: Optional[str]
    groupId: Optional[str]
    policyId: Optional[str]
    memberId: Optional[str]
    actingUserId: Optional[str]
    device: Optional[int]
    ipAddress: Optional[str]
    secretId: Optional[str]
    serviceAccountId: Optional[str]

@dataclass
class BitwardenEnhancedEvent(BitwardenEvent):
    groupName: Optional[str]
    actingUserName: Optional[str]
    actingUserEmail: Optional[str]
    memberName: Optional[str]
    memberEmail: Optional[str]


@dataclass
class BitwardenGroup:
    id: str
    name: str


@dataclass
class BitwardenGroupsResponse:
    data: List[BitwardenGroup]


@dataclass
class BitwardenMember:
    id: str
    email: str
    userId: str
    name: Optional[str]


@dataclass
class BitwardenMembersResponse:
    data: List[BitwardenMember]


@dataclass
class BitwardenEventsResponse:
    data: List[BitwardenEvent]
    continuationToken: Optional[str] = None


@dataclass
class EventLogsCheckpoint:
    key_id: Optional[str] = None
    next_request: Optional[BitwardenEventsRequest] = None
    last_log_date: Optional[datetime] = None
