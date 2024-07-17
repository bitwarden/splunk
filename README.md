# Bitwarden Splunk App

A Splunk app for reporting Bitwarden event logs.

## Getting started

Follow the steps in [Bitwarden Splunk SIEM][Bitwarden Splunk SIEM]

## Contributing

### Set up Splunk Enterprise

1. Install Docker
2. If you're using an Apple Silicon Mac, open *Docker* -> *Settings* -> *Features in development* -> enable "Use Rosetta for x86/amd64 emulation on Apple Silicon"
3. Run Splunk Enterprise
  `docker run --rm --platform linux/amd64 --name splunk -d -p 8001:8000 -p 8089:8089 -e SPLUNK_START_ARGS='--accept-license' -e SPLUNK_PASSWORD='password' splunk/splunk:latest` (replace 'password' with your desired admin password)

### Configure your environment

1. Clone the Github repository: `git clone https://github.com/bitwarden/splunk.git`
2. Install Python 3.8
3. Install [Poetry][poetry]
4. Navigate to your local repository
5. Activate the poetry shell: `poetry shell`
6. Tell poetry to use Python 3.8: `poetry env use python3.8`
7. Install dependencies: `poetry install --with dev`

### Deploy the app

1. Package the app: `./package.sh`
2. Deploy the app to Splunk: `./deploy.sh`
3. (optional) Check the logs for errors or for debugging purposes later:
  - `docker exec -u splunk -it splunk bash`
  - `tail -f /opt/splunk/var/log/splunk/bitwarden_event_logs_beta.log`

### Configure the app

1. Access Splunk url in the browser: http://localhost:8001
2. Enter credentials, login: `admin`, password: `password` (or the password you set above)
3. Click on the *Apps* -> *Bitwarden Event Logs*
4. Complete the setup. Refer to the [Bitwarden Help Center][Bitwarden Splunk SIEM] for more information about configuration

## Preparing for release

Modify the version in the [pyproject.toml](pyproject.toml)

#### Preparing for prod (non-beta) release

Remove the `_beta` suffix from:

- `app_name` variable in [utils.py](src%2Futils.py)
- `app_name` variable in [setup_page.js](package%2Fappserver%2Fstatic%2Fjavascript%2Fviews%2Fsetup_page.js)
- `app_name` variable in [setup_page.js](package%2Fappserver%2Fstatic%2Fjavascript%2Fsetup_page.js)
- `info/id/name` variable in [app.manifest](package%2Fapp.manifest)
- from first line `[script://` in [inputs.conf](package%2Fdefault%2Finputs.conf)
- `id.name` and `package.id` in [app.conf](package%2Fdefault%2Fapp.conf)

[Bitwarden Splunk SIEM]: https://bitwarden.com/help/splunk-siem/
[poetry]: https://python-poetry.org/docs/#installation
