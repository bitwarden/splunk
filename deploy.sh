#!/bin/bash

VERSION=$(poetry version | awk -F ' ' '{print $2}')

# Upload
docker cp output/bitwarden_event_logs_beta-${VERSION}.tar.gz splunk:/opt/splunk
docker exec -u splunk splunk bash -c "/opt/splunk/bin/splunk install app bitwarden_event_logs-${VERSION}.tar.gz -update 1 -auth admin:password"
docker exec -u splunk splunk bash -c "rm -f /opt/splunk/bitwarden_event_logs-${VERSION}.tar.gz"
docker exec -u splunk splunk bash -c "/opt/splunk/bin/splunk restart"