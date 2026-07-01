"""Tests for checkpoint serialization/deserialization.

These test the static _serialize_checkpoint and _parse_checkpoint_data methods
without requiring splunklib or other Splunk dependencies.
"""

from datetime import datetime, timezone

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from models import EventLogsCheckpoint, BitwardenEventsRequest
from mappers import datetime_from_str, datetime_to_str


# Inline the static methods to avoid importing Config (which pulls in splunklib)
def _serialize_checkpoint(checkpoint: EventLogsCheckpoint):
    data = {}
    if checkpoint.next_request is not None:
        data['next_request_start'] = datetime_to_str(checkpoint.next_request.start)
        data['next_request_end'] = datetime_to_str(checkpoint.next_request.end)
        if checkpoint.next_request.continuation_token:
            data['next_request_continuation_token'] = checkpoint.next_request.continuation_token
    if checkpoint.last_log_date is not None:
        data['last_log_date'] = datetime_to_str(checkpoint.last_log_date)
    return data


def _parse_checkpoint_data(data):
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


def test_serialize_checkpoint_empty():
    checkpoint = EventLogsCheckpoint()
    data = _serialize_checkpoint(checkpoint)
    assert data == {}


def test_serialize_checkpoint_with_last_log_date():
    checkpoint = EventLogsCheckpoint(
        last_log_date=datetime(2024, 6, 15, 12, 0, 0, tzinfo=timezone.utc)
    )
    data = _serialize_checkpoint(checkpoint)
    assert data == {'last_log_date': '2024-06-15T12:00:00.000000Z'}


def test_serialize_checkpoint_with_next_request():
    checkpoint = EventLogsCheckpoint(
        next_request=BitwardenEventsRequest(
            start=datetime(2024, 6, 15, 12, 0, 0, tzinfo=timezone.utc),
            end=datetime(2024, 6, 16, 12, 0, 0, tzinfo=timezone.utc),
            continuation_token='abc123'
        ),
        last_log_date=datetime(2024, 6, 14, 0, 0, 0, tzinfo=timezone.utc)
    )
    data = _serialize_checkpoint(checkpoint)
    assert data == {
        'next_request_start': '2024-06-15T12:00:00.000000Z',
        'next_request_end': '2024-06-16T12:00:00.000000Z',
        'next_request_continuation_token': 'abc123',
        'last_log_date': '2024-06-14T00:00:00.000000Z'
    }


def test_parse_checkpoint_data_none():
    checkpoint = _parse_checkpoint_data(None)
    assert checkpoint.next_request is None
    assert checkpoint.last_log_date is None


def test_parse_checkpoint_data_empty():
    checkpoint = _parse_checkpoint_data({})
    assert checkpoint.next_request is None
    assert checkpoint.last_log_date is None


def test_parse_checkpoint_data_full():
    data = {
        'next_request_start': '2024-06-15T12:00:00.000000Z',
        'next_request_end': '2024-06-16T12:00:00.000000Z',
        'next_request_continuation_token': 'abc123',
        'last_log_date': '2024-06-14T00:00:00.000000Z'
    }
    checkpoint = _parse_checkpoint_data(data)
    assert checkpoint.next_request is not None
    assert checkpoint.next_request.continuation_token == 'abc123'
    assert checkpoint.last_log_date == datetime(2024, 6, 14, 0, 0, 0, tzinfo=timezone.utc)


def test_roundtrip_checkpoint():
    """Verify that serialize -> parse produces the same checkpoint."""
    original = EventLogsCheckpoint(
        next_request=BitwardenEventsRequest(
            start=datetime(2024, 6, 15, 12, 30, 45, 123456, tzinfo=timezone.utc),
            end=datetime(2024, 6, 16, 12, 30, 45, 654321, tzinfo=timezone.utc),
            continuation_token='token-xyz'
        ),
        last_log_date=datetime(2024, 6, 14, 0, 0, 0, tzinfo=timezone.utc)
    )
    data = _serialize_checkpoint(original)
    restored = _parse_checkpoint_data(data)

    assert restored.next_request.start == original.next_request.start
    assert restored.next_request.end == original.next_request.end
    assert restored.next_request.continuation_token == original.next_request.continuation_token
    assert restored.last_log_date == original.last_log_date
