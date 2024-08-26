#!/bin/bash
set -x

DOCKER_NAME=${1:-splunk}

# docker exec -u splunk splunk bash -c "/opt/splunk/bin/splunk remove app bitwarden_event_logs -auth admin:password"

# Upload
docker cp output/bitwarden_event_logs.tar.gz $DOCKER_NAME:/opt/splunk/bitwarden_event_logs.tar.gz
docker exec -u root $DOCKER_NAME bash -c "chown -R splunk:splunk /opt/splunk/bitwarden_event_logs.tar.gz"
docker exec -u splunk $DOCKER_NAME bash -c "/opt/splunk/bin/splunk install app bitwarden_event_logs.tar.gz -update 1 -auth admin:password"
docker exec -u splunk $DOCKER_NAME bash -c "rm -f /opt/splunk/bitwarden_event_logs.tar.gz"
docker exec -u splunk $DOCKER_NAME bash -c "/opt/splunk/bin/splunk restart"
