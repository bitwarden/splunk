#!/bin/bash

# Upload
docker cp output/bitwarden_event_logs.tar.gz splunk:/opt/splunk/bitwarden_event_logs.tar.gz
docker exec -u root splunk bash -c "chown -R splunk:splunk /opt/splunk/bitwarden_event_logs.tar.gz"
docker exec -u splunk splunk bash -c "/opt/splunk/bin/splunk install app bitwarden_event_logs.tar.gz -update 1 -auth admin:password"
docker exec -u splunk splunk bash -c "rm -f /opt/splunk/bitwarden_event_logs.tar.gz"
docker exec -u splunk splunk bash -c "/opt/splunk/bin/splunk restart"