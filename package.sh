#!/bin/bash

rm -rf output/
#rm -rf package/bin/*
rm -rf package/lib/*

poetry export -f requirements.txt --output package/lib/requirements.txt
cp -R src/* package/bin/

ucc-gen build --ta-version 2.0.0
ucc-gen package --path output/bitwarden_event_logs/ -o output/

docker cp output/bitwarden_event_logs-2.0.0.tar.gz c292e9:/opt/splunk
docker exec -u splunk c292e9 bash -c "/opt/splunk/bin/splunk install app bitwarden_event_logs-2.0.0.tar.gz -update 1 -auth admin:password"
docker exec -u splunk c292e9 bash -c "/opt/splunk/bin/splunk restart"