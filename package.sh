#!/bin/bash

# Clean
rm -rf output/
rm -rf package/bin/*
rm -rf package/lib/*

# Build, Package
poetry export -f requirements.txt --output package/lib/requirements.txt
cp -R src/* package/bin/

VERSION=$(poetry version | awk -F ' ' '{print $2}')

ucc-gen build --ta-version ${VERSION}
## cleanup python files
rm -rf output/bitwarden_event_logs_beta/{bin,lib}/__pycache__
rm -rf output/bitwarden_event_logs_beta/bin/{bitwarden_event_logs_rh_settings.py,import_declare_test.py}
## remove ucc-gen not used files
rm -rf output/bitwarden_event_logs_beta/appserver/static/{css,js,openapi.json}
rm -rf output/bitwarden_event_logs_beta/appserver/templates/base.html
rm -rf output/bitwarden_event_logs_beta/default/{restmap.conf,web.conf,bitwarden_event_logs_settings.conf}
rm -rf output/bitwarden_event_logs_beta/README/bitwarden_event_logs_settings.conf.spec
ucc-gen package --path output/bitwarden_event_logs_beta/ -o output/

# Validate
poetry run slim validate output/bitwarden_event_logs_beta-${VERSION}.tar.gz
poetry run splunk-appinspect inspect --mode precert output/bitwarden_event_logs_beta-${VERSION}.tar.gz
