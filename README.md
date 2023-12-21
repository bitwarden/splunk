# Bitwarden Splunk App

A Splunk app for reporting Bitwarden event logs.

# Getting started

Follow the steps in [Bitwarden Splunk SIEM][Bitwarden Splunk SIEM]

## Contributing

This app requires Python 3.7 installed.
Install [Poetry][poetry] if not already installed.

Activate shell: `poetry shell`

Install dependencies: `poetry install --with dev`

### Local Development

- Install docker.
- Run splunk enterprise
  `docker run -d -p 8001:8000 -p 8089:8089 -e SPLUNK_START_ARGS='--accept-license' -e SPLUNK_PASSWORD='password' splunk/splunk:latest`
- Access Splunk url in the browser: https://localhost:8081
- Enter credentials, login: `admin`, password: `password`
- TODO developer license


[Bitwarden Splunk SIEM]:https://bitwarden.com/help/splunk-siem/

[poetry]:https://python-poetry.org/docs/#installation


