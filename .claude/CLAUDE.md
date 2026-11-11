# Bitwarden Event Logs Splunk App

A Splunk app (`bitwarden_event_logs`) that fetches Bitwarden organization event logs from the Bitwarden Public API and indexes them in Splunk. Owned by `@bitwarden/team-data-insights-and-reporting-dev`.

Read first:

- `README.md`, "Architecture Overview" and "Project Structure": the two components and the source layout. Do not duplicate them here.
- Contributor setup: https://contributing.bitwarden.com/getting-started/business/splunk-app
- `docs/organization-event-logs-feature.md`: poll vs. push (HEC) delivery.
- `docs/test-hec-events.md`, `docs/migration-guide.md`: HEC testing and the poll-to-push migration.

## Layout

The README's "Project Structure" covers `src/`, `ui/`, `package/`, `tests/`, `package.sh`, and `deploy.sh`. Not listed there:

- `globalConfig.json`: Splunk UCC metadata (app name, version, display name).
- `dev/docker-compose.yml`: local Splunk containers for development.
- `docs/`: feature, testing, and migration guides.
- `ui/.nvmrc`: Node version used by CI.

## Python (Splunk UCC) / Angular split

- The Python side is built with the Splunk UCC framework (`splunk-add-on-ucc-framework`, `ucc-gen`), but UCC is used for building and packaging only. Both `package.sh` and `.github/workflows/build.yml` delete the UCC-generated REST handler, config UI assets, `restmap.conf`, `web.conf`, and settings conf after `ucc-gen build`. The configuration UI is the Angular app in `ui/`.
- The Angular build output (`ui/dist/setup/`) is copied into `package/appserver/static/setup` before `ucc-gen build`. `src/*` is copied into `package/bin/`, and `poetry export` writes `package/lib/requirements.txt`. These `package/` subfolders and `output/` are generated and gitignored.
- Python is pinned to `>=3.13, <3.14` in `pyproject.toml`.

## Commands

Python (from the repo root, as in `.github/workflows/build.yml`):

```bash
poetry install --no-root --with dev,test,splunkslim
poetry run pytest
```

UI (from `ui/`, scripts in `ui/package.json`):

```bash
npm ci
npm run build        # production build to ui/dist/setup
npm start            # ng serve
npm run prettier     # format
```

Full app build (`package.sh`, needs `poetry-plugin-export` for `poetry export`):

```bash
./package.sh                      # output/bitwarden_event_logs.tar.gz
./package.sh -dev | -qa | --label <name>   # labeled build: bitwarden_event_logs_<label>
./package.sh --help
./deploy.sh [container-name]      # default container name: splunk
```

## AppInspect and validation

What the repo actually runs:

- `package.sh` ends with `poetry run splunk-appinspect inspect --mode precert` on the built tarball.
- CI (`.github/workflows/build.yml`, job `build-artifacts`) runs `poetry run pytest`, builds with `ucc-gen`, then:
    - `poetry run slim validate` and fails on any `[ERROR]` line;
    - `poetry run splunk-appinspect inspect --mode precert` and fails unless both `error` and `failure` counts are 0.
- CI also runs monthly on a cron schedule to pick up new AppInspect checks with no code change.
- CI runs on `ubuntu-22.04-arm` because AppInspect requires aarch64/arm64 binaries (comment in `build.yml`).
- AppInspect check criteria: https://dev.splunk.com/enterprise/reference/appinspect/appinspectcheck/

`slim validate` runs only in CI, not in `package.sh`.

## Keep in sync

- `package.sh` and `.github/workflows/build.yml` repeat the same `ucc-gen` build and cleanup steps. When you change one, update the other.
- `package.sh --label` rewrites exact strings in `globalConfig.json`, `package/app.manifest`, `src/utils.py` (`app_name`), `ui/src/config.ts` (`appName`), `package/default/inputs.conf`, and `ui/src/app/app.component.html`. The script fails if a pattern is not found, so do not reformat those strings. The comments in `package.sh` explain each one.
- The UI writes the app's configuration into Splunk and the Python input reads it back. A config key change needs matching edits in `ui/src/splunk/bitwarden-splunk.service.ts` and `src/config.py`.

## API credentials

What the code does today:

- The setup page collects the Bitwarden organization API key (client ID and secret) and stores it in Splunk storage passwords: `upsertApiKey` in `ui/src/splunk/bitwarden-splunk.service.ts`.
- The Python input reads it back from storage passwords in `Config.get_bitwarden_api_key` (`src/config.py`). The realm is derived from `app_name` in `src/utils.py`, so labeled builds each get their own realm (see the comment in `package.sh`).
- Splunk passes the Python input a session token on stdin (`passAuth` in `package/default/inputs.conf`, read by `read_session_token` in `src/utils.py`).
- Bitwarden API and Identity URLs must be HTTPS: `secure_url` in `src/utils.py` and `ui/src/validators/secure-url.validator.ts`.
- `ui/src/environments/environment.development.ts` holds the local Splunk management URL and username/password fields, which are empty in the repo.

Never put real API keys, client secrets, HEC tokens, or Splunk credentials in committed files, test fixtures, or log output.

## Formatting

- `ui/`: Prettier, run on staged files by the husky pre-commit hook (`ui/.husky/pre-commit`, `lint-staged` in `ui/package.json`).
- `.editorconfig` at the root and in `ui/` sets indentation and line endings.
- No Python formatter or linter is configured.

## Release

Bump the version in `pyproject.toml` (README, "Preparing for Release") and in `meta.version` in `globalConfig.json`, and keep them equal. Every release commit in history bumps both. `package.sh` and CI pass the `pyproject.toml` version to `ucc-gen` via `--ta-version`, which does not update `globalConfig.json`.
