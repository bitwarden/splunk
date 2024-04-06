from datetime import datetime, date, time, timezone

from mappers import datetime_from_str, datetime_to_str

DATETIME_NO_TIME = datetime.combine(date(2024, 4, 6), time(tzinfo=timezone.utc), tzinfo=timezone.utc)
DATETIME_TIME_NO_FRACTIONAL = DATETIME_NO_TIME.replace(hour=13, minute=30, second=45)
DATETIME_TIME_WITH_FRACTIONAL_LONG = DATETIME_TIME_NO_FRACTIONAL.replace(microsecond=123456)

DATETIME_TIME_WITH_FRACTIONAL_SHORT = DATETIME_TIME_NO_FRACTIONAL.replace(microsecond=123000)


def test_datetime_from_str_none_expect_none():
    assert datetime_from_str(None) is None


def test_datetime_from_str_empty_string_expect_none():
    assert datetime_from_str('') is None


def test_datetime_from_str_empty_string_not_trimmed_expect_none():
    assert datetime_from_str(' \t\n') is None


def test_datetime_from_str_date_without_time():
    assert datetime_from_str('2024-04-06') == DATETIME_NO_TIME


def test_datetime_from_str_datetime_no_fractional_seconds_no_timezone():
    assert datetime_from_str('2024-04-06T13:30:45') == DATETIME_TIME_NO_FRACTIONAL


def test_datetime_from_str_datetime_no_fractional_seconds_utc_z_timezone():
    assert datetime_from_str('2024-04-06T13:30:45Z') == DATETIME_TIME_NO_FRACTIONAL


def test_datetime_from_str_datetime_no_fractional_seconds_utc_offset_timezone():
    assert datetime_from_str('2024-04-06T13:30:45+00:00') == DATETIME_TIME_NO_FRACTIONAL


def test_datetime_from_str_datetime_0_digits_fractional_seconds_no_timezone():
    assert datetime_from_str('2024-04-06T13:30:45.0') == DATETIME_TIME_NO_FRACTIONAL


def test_datetime_from_str_datetime_0_digits_fractional_utc_z_timezone():
    assert datetime_from_str('2024-04-06T13:30:45.0Z') == DATETIME_TIME_NO_FRACTIONAL


def test_datetime_from_str_datetime_0_digits_fractional_utc_offset_timezone():
    assert datetime_from_str('2024-04-06T13:30:45.0+00:00') == DATETIME_TIME_NO_FRACTIONAL


def test_datetime_from_str_datetime_no_timezone():
    assert datetime_from_str('2024-04-06T13:30:45.123456') == DATETIME_TIME_WITH_FRACTIONAL_LONG


def test_datetime_from_str_datetime_utc_z_timezone():
    assert datetime_from_str('2024-04-06T13:30:45.123456Z') == DATETIME_TIME_WITH_FRACTIONAL_LONG


def test_datetime_from_str_datetime_utc_offset_timezone():
    assert datetime_from_str('2024-04-06T13:30:45.123456+00:00') == DATETIME_TIME_WITH_FRACTIONAL_LONG


def test_datetime_from_str_datetime_short_fractional_seconds_no_timezone():
    assert datetime_from_str('2024-04-06T13:30:45.123') == DATETIME_TIME_WITH_FRACTIONAL_SHORT


def test_datetime_from_str_datetime_short_fractional_seconds_utc_z_timezone():
    assert datetime_from_str('2024-04-06T13:30:45.123Z') == DATETIME_TIME_WITH_FRACTIONAL_SHORT


def test_datetime_from_str_datetime_short_fractional_seconds_utc_offset_timezone():
    assert datetime_from_str('2024-04-06T13:30:45.123+00:00') == DATETIME_TIME_WITH_FRACTIONAL_SHORT


def test_datetime_from_str_datetime_7_digits_fractional_seconds_no_timezone():
    assert datetime_from_str('2024-04-06T13:30:45.1234567') == DATETIME_TIME_WITH_FRACTIONAL_LONG


def test_datetime_from_str_datetime_7_digits_fractional_seconds_utc_z_timezone():
    assert datetime_from_str('2024-04-06T13:30:45.1234567Z') == DATETIME_TIME_WITH_FRACTIONAL_LONG


def test_datetime_from_str_datetime_7_digits_fractional_seconds_utc_offset_timezone():
    assert datetime_from_str('2024-04-06T13:30:45.1234567+00:00') == DATETIME_TIME_WITH_FRACTIONAL_LONG


def test_datetime_to_str_no_time_no_time():
    assert datetime_to_str(DATETIME_NO_TIME) == '2024-04-06T00:00:00.000000Z'


def test_datetime_to_str_no_fractional_seconds():
    assert datetime_to_str(DATETIME_TIME_NO_FRACTIONAL) == '2024-04-06T13:30:45.000000Z'


def test_datetime_to_str_short_fractional_seconds():
    assert datetime_to_str(DATETIME_TIME_WITH_FRACTIONAL_SHORT) == '2024-04-06T13:30:45.123000Z'


def test_datetime_to_str_long_fractional_seconds():
    assert datetime_to_str(DATETIME_TIME_WITH_FRACTIONAL_LONG) == '2024-04-06T13:30:45.123456Z'


def test_datetime_to_str_no_timezone():
    datetime_no_tz = DATETIME_TIME_WITH_FRACTIONAL_LONG.replace(tzinfo=None)
    assert datetime_to_str(datetime_no_tz) == '2024-04-06T13:30:45.123456Z'
