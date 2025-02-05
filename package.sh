#!/bin/bash

VERSION=$(poetry version | awk -F ' ' '{print $2}')
APP_NAME="bitwarden_event_logs"

mkdir -p package/bin
mkdir -p package/lib

# Clean
rm -rf output/
rm -rf package/bin/*
rm -rf package/lib/*

# Build, Package
poetry export -f requirements.txt --output package/lib/requirements.txt
cp -R src/* package/bin/

poetry run ucc-gen build --ta-version ${VERSION}
## cleanup python files
rm -rf output/$APP_NAME/{bin,lib}/__pycache__
rm -rf output/$APP_NAME/bin/{bitwarden_event_logs_rh_settings.py,import_declare_test.py}
## remove ucc-gen not used files
rm -rf output/$APP_NAME/appserver/static/{css,js,openapi.json}
rm -rf output/$APP_NAME/appserver/templates/base.html
rm -rf output/$APP_NAME/default/{restmap.conf,web.conf,bitwarden_event_logs_settings.conf}
rm -rf output/$APP_NAME/README/bitwarden_event_logs_settings.conf.spec
poetry run ucc-gen package --path output/$APP_NAME/ -o output/

mv output/${APP_NAME}-${VERSION}.tar.gz output/bitwarden_event_logs.tar.gz

# Validate
poetry run splunk-appinspect inspect --mode precert output/bitwarden_event_logs.tar.gz
