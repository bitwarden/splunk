import sys
from script import read_session_token, get_logger
from service import AppService
from events import EventsWriter


def main():
    logger = get_logger()
    logger.info('started')

    try:
        session_token = read_session_token()
        logger.debug('session token %s', session_token)

        service = AppService(session_token, logger)
        # TODO config

        events_writer = EventsWriter()

        # TODO in a loop go through bitwarden events
        events_writer.write()
    except Exception as e:
        logger.exception('error', e)

    logger.info('finished')


if __name__ == '__main__':
    main()
