# Bitwarden Splunk App

A Splunk app for reporting Bitwarden event logs.

# Getting started

Follow the steps in [Bitwarden Splunk SIEM][Bitwarden Splunk SIEM]

# Contributing

Please refer to [Bitwarden Contributing Docs - Splunk app][contributingdocs].

# Preparing for release

Modify the version in the [pyproject.toml](pyproject.toml)

## Preparing for prod (non-beta) release

Remove the `_beta` suffix from:

- `app_name` variable in [utils.py](src%2Futils.py)
- `app_name` variable in [setup_page.js](package%2Fappserver%2Fstatic%2Fjavascript%2Fviews%2Fsetup_page.js)
- `app_name` variable in [setup_page.js](package%2Fappserver%2Fstatic%2Fjavascript%2Fsetup_page.js)
- `info/id/name` variable in [app.manifest](package%2Fapp.manifest)
- from first line `[script://` in [inputs.conf](package%2Fdefault%2Finputs.conf)
- `id.name` and `package.id` in [app.conf](package%2Fdefault%2Fapp.conf)

[Bitwarden Splunk SIEM]: https://bitwarden.com/help/splunk-siem/
[poetry]: https://python-poetry.org/docs/#installation
[contributingdocs]: https://contributing.bitwarden.com/getting-started/business/splunk-app
