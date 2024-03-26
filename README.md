# Bitwarden Splunk App

A Splunk app for reporting Bitwarden event logs.

# Getting started

Follow the steps in [Bitwarden Splunk SIEM][Bitwarden Splunk SIEM]

## Contributing

This app requires Python 3.8 installed.
Install [Poetry][poetry] if not already installed.

Activate shell: `poetry shell`

Install dependencies: `poetry install --with dev`

### Local Development

- Install docker.
- Run splunk enterprise
  `docker run --rm --name splunk -d -p 8001:8000 -p 8089:8089 -e SPLUNK_START_ARGS='--accept-license' -e SPLUNK_PASSWORD='password' splunk/splunk:latest`
- Package and Deploy to splunk:
  - `./package.sh`
  - `./deploy.sh`
- Access logs:
  - `docker exec -u splunk -it splunk bash`
  - `tail -f /opt/splunk/var/log/splunk/bitwarden_event_logs_beta.log`
- Access Splunk url in the browser: http://localhost:8001
  - Enter credentials, login: `admin`, password: `password`
  - Click on the *Apps* -> *Bitwarden Event Logs*
  - Complete the Setup

### Preparing for release

Modify the version in the [pyproject.toml](pyproject.toml)

#### Preparing for prod (non-beta) release
Remove the `_beta` suffix from:
- `app_name` variable in [utils.py](src%2Futils.py)
- `app_name` variable in [setup_page.js](package%2Fappserver%2Fstatic%2Fjavascript%2Fviews%2Fsetup_page.js)
- `app_name` variable in [setup_page.js](package%2Fappserver%2Fstatic%2Fjavascript%2Fsetup_page.js)
- `info/id/name` variable in [app.manifest](package%2Fapp.manifest)
- from first line `[script://` in [inputs.conf](package%2Fdefault%2Finputs.conf)
- `id.name` and `package.id` in [app.conf](package%2Fdefault%2Fapp.conf)

[Bitwarden Splunk SIEM]:https://bitwarden.com/help/splunk-siem/

[poetry]:https://python-poetry.org/docs/#installation


