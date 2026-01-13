# Bitwarden Splunk App

A Splunk app for reporting Bitwarden event logs. This app integrates with the Bitwarden Public API to fetch organization event logs and index them in Splunk for security monitoring, compliance reporting, and operational analytics.

## Getting Started

Follow the steps in [Bitwarden Splunk SIEM][Bitwarden Splunk SIEM]

## Architecture Overview

The app consists of two main components:

### Python Backend (`src/`)

-   **Event Collection**: Fetches event logs from the Bitwarden API at scheduled intervals
-   **Splunk Integration**: Indexes events into Splunk using the Splunk SDK
-   **Configuration Management**: Handles authentication and connection settings
-   Built using the Splunk UCC (Universal Configuration Console) framework: https://splunk.github.io/addonfactory-ucc-generator/
-   Uses the Splunk AppInspect CLI to validate compliance with Splunk requirements:
    -   Overview: https://dev.splunk.com/enterprise/docs/developapps/testvalidate/appinspect/
    -   Check criteria: https://dev.splunk.com/enterprise/reference/appinspect/appinspectcheck/

-   Dependencies are managed by poetry

### Angular Frontend (`ui/`)

-   **Configuration UI**: Modern Angular-based interface for app setup and configuration
-   **Settings Management**: Manages Bitwarden API credentials and collection preferences
-   **Dashboard Integration**: Provides a seamless configuration experience within Splunk
-   Built with Angular and Tailwind CSS
-   Dependencies are managed by npm

## Project Structure

The diagram below shows a simplified view of the project structure.

```
.
├── src/                          # Python backend
│   ├── bitwarden_event_logs.py  # Main entry point
│   ├── bitwarden_api.py         # Bitwarden API client
│   ├── event_logs.py            # Event log processing
│   ├── splunk_api.py            # Splunk API integration
│   ├── config.py                # Configuration management
│   ├── models.py                # Data models
│   ├── mappers.py               # Data transformation
│   └── utils.py                 # Utility functions
│
├── ui/                          # Angular frontend
│   ├── src/
│   │   ├── app/                 # Main application component
│   │   ├── splunk/              # Splunk-specific integrations
│   │   ├── models/              # Models
│   │   └── validators/          # Form validators
│   ├── package.json
│   └── angular.json
│
├── package/                     # Splunk app structure
│   ├── bin/                     # Executable scripts
│   ├── default/                 # App configuration files
│   ├── static/                  # Static assets
│   └── README/                  # App documentation
│
├── tests/                       # Test files
├── package.sh                   # Build and packaging script
└── deploy.sh                    # Deployment script
```

## Contributing

Please refer to [Bitwarden Contributing Docs - Splunk app][contributingdocs].

## Preparing for Release

Modify the version in the [pyproject.toml](pyproject.toml)

[Bitwarden Splunk SIEM]: https://bitwarden.com/help/splunk-siem/
[contributingdocs]: https://contributing.bitwarden.com/getting-started/business/splunk-app
