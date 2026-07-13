#!/bin/bash
set -e

DEFAULT_APP_NAME="bitwarden_event_logs"
LABEL=""

usage() {
  cat <<EOF
Usage: $(basename "$0") [--label <value> | -dev | -qa] [-h|--help]

Builds and packages the Bitwarden Event Logs Splunk app.

Options:
  --label <value>   Build label (e.g. dev, qa, staging). When set, the build's
                    app name becomes '${DEFAULT_APP_NAME}_<value>' and the
                    display label in Splunk's UI becomes '[<VALUE>] Bitwarden
                    Event Logs'. Must be lowercase letters, digits, and
                    underscores, start with a letter, and be at most 32
                    characters. Omit for a default build under '${DEFAULT_APP_NAME}'.
  -dev              Shortcut for --label dev
  -qa               Shortcut for --label qa
  -h, --help        Show this help.

Output: output/<app_name>.tar.gz
EOF
}

validate_label() {
  local v="$1"
  if [[ ${#v} -gt 32 || ! "$v" =~ ^[a-z][a-z0-9_]*$ ]]; then
    echo "Error: invalid label '$v'." >&2
    echo "       Must be lowercase letters/digits/underscore, start with a letter, max 32 chars." >&2
    return 1
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --label)
      # A bare `--label` with no following value would make `shift 2` fail under
      # `set -e` and exit silently; catch it with a clear message instead.
      if [[ -z "${2:-}" ]]; then
        echo "Error: --label requires a value (e.g. --label staging)." >&2
        usage >&2
        exit 1
      fi
      LABEL="$2"; shift 2 ;;
    -dev) LABEL="dev"; shift ;;
    -qa) LABEL="qa"; shift ;;
    -h|--help) usage; exit 0 ;;
    *)
      echo "Error: unknown argument '$1'" >&2
      usage >&2
      exit 1
      ;;
  esac
done

# Compute the full app name from the (optional) label.
if [[ -n "$LABEL" ]]; then
  validate_label "$LABEL" || { usage >&2; exit 1; }
  APP_NAME="${DEFAULT_APP_NAME}_${LABEL}"
  LABEL_UPPER="$(echo "$LABEL" | tr '[:lower:]' '[:upper:]')"
else
  APP_NAME="$DEFAULT_APP_NAME"
fi

# When building under a labeled name, substitute it into the places the app reads
# its identity from. We modify the source files in place (so Poetry can resolve
# its per-project venv normally) and restore the originals on exit — including
# on errors and Ctrl-C — so the source tree always ends up clean.
#
# Backups are kept OUTSIDE the source tree (in a temp dir), not as sibling
# "<file>.bak" files: those would live for the whole build, and ucc-gen's
# package/ copy plus "cp -R src/*" would sweep them into the output and ship
# them in the tarball under the wrong (unlabeled) identity.
BACKUP_DIR="$(mktemp -d)"
RESTORE_FILES=()
backup_path_for() { printf '%s/%s' "$BACKUP_DIR" "$(printf '%s' "$1" | tr '/' '_')"; }
restore_source_files() {
  local f bak
  for f in "${RESTORE_FILES[@]}"; do
    bak="$(backup_path_for "$f")"
    [[ -f "$bak" ]] && cp "$bak" "$f"
  done
  rm -rf "$BACKUP_DIR"
}
trap restore_source_files EXIT INT TERM

substitute_app_name() {
  local file="$1" old="$2" new="$3" bak
  if ! grep -qF "$old" "$file"; then
    echo "Error: expected pattern not found in ${file}: ${old}" >&2
    echo "       If a previous build was interrupted, the file may still be in a modified state." >&2
    echo "       Run 'git checkout ${file}' to restore, then retry." >&2
    exit 1
  fi
  # Back up the original once, the first time this file is touched.
  bak="$(backup_path_for "$file")"
  if [[ ! -f "$bak" ]]; then
    cp "$file" "$bak"
    RESTORE_FILES+=("$file")
  fi
  sed "s|${old}|${new}|" "$file" > "${file}.new"
  mv "${file}.new" "$file"
}

if [[ -n "$LABEL" ]]; then
  echo "Building under app name: $APP_NAME"

  # --- Technical identity ---
  # ucc-gen requires these two to match and builds the app's folder name and
  # app.conf id from them. (package/default/app.conf is left alone — ucc-gen
  # regenerates it from these values.)

  # Sets the output folder name and the generated app.conf id.
  substitute_app_name "globalConfig.json" \
    "\"name\": \"${DEFAULT_APP_NAME}\"" \
    "\"name\": \"${APP_NAME}\""
  # Must equal the name above, or ucc-gen fails the build.
  substitute_app_name "package/app.manifest" \
    "\"name\": \"${DEFAULT_APP_NAME}\"" \
    "\"name\": \"${APP_NAME}\""

  # --- Runtime identity ---
  # Read by the app while it runs (ucc-gen never touches these), so each slot
  # needs its own value.

  # Builds the storage-password realm and the REST app namespace.
  substitute_app_name "src/utils.py" \
    "app_name = \"${DEFAULT_APP_NAME}\"" \
    "app_name = \"${APP_NAME}\""
  # The UI uses this for its REST calls.
  substitute_app_name "ui/src/config.ts" \
    "appName = \"${DEFAULT_APP_NAME}\"" \
    "appName = \"${APP_NAME}\""

  # --- Scripted input path ---
  # Point the input stanza at this slot's bin/. If it doesn't match the app
  # folder, the setup form's stanza won't merge and the script loses passAuth
  # (no Splunk session token -> it fails).
  substitute_app_name "package/default/inputs.conf" \
    "${DEFAULT_APP_NAME}/bin/" \
    "${APP_NAME}/bin/"

  # --- Display labels ---
  # Prefix the human-readable name with [LABEL] so each slot is recognizable.

  # The Splunk app label is generated from this manifest title.
  substitute_app_name "package/app.manifest" \
    "\"title\": \"Bitwarden Event Logs\"" \
    "\"title\": \"[${LABEL_UPPER}] Bitwarden Event Logs\""
  # The name shown in the UCC-generated config UI.
  substitute_app_name "globalConfig.json" \
    "\"displayName\": \"Bitwarden Event Logs\"" \
    "\"displayName\": \"[${LABEL_UPPER}] Bitwarden Event Logs\""
  # The heading on the setup page.
  substitute_app_name "ui/src/app/app.component.html" \
    "Bitwarden Event Logs Setup" \
    "[${LABEL_UPPER}] Bitwarden Event Logs Setup"

  # --- Deliberately left alone ---
  # restRoot (globalConfig.json): names the generated REST handler files, which
  #   the cleanup below strips anyway; dev and qa installs coexist fine with it.
  # [bitwarden_event_logs_index] (macros.conf): macros are app-scoped, so the
  #   name can repeat safely; renaming it would break in-app dashboards.
  # bitwarden_event_logs.py: this is the input script's filename, the same in
  #   every slot -- only the folder in the input path above changes per slot.
fi

VERSION=$(poetry version | awk -F ' ' '{print $2}')

mkdir -p package/bin
mkdir -p package/lib
mkdir -p package/appserver/static/setup

# Clean
rm -rf output/
rm -rf package/bin/*
rm -rf package/lib/*
rm -rf package/appserver/static/setup/*

# Build, Package
## Build UI frontend
pushd ui || exit
npm install
npm run build
popd || exit
cp ui/dist/setup/{scripts.js,runtime.js,polyfills.js,main.js,styles.css} package/appserver/static/setup
## Build Python app
poetry export -f requirements.txt --output package/lib/requirements.txt
cp -R src/* package/bin/

poetry run ucc-gen build --ta-version "${VERSION}"
## cleanup python files
rm -rf output/$APP_NAME/{bin,lib}/__pycache__
rm -rf output/$APP_NAME/bin/{bitwarden_event_logs_rh_settings.py,import_declare_test.py}
## remove ucc-gen not used files
rm -rf output/$APP_NAME/appserver/static/{css,js,openapi.json}
rm -rf output/$APP_NAME/appserver/templates/base.html
rm -rf output/$APP_NAME/default/{restmap.conf,web.conf,bitwarden_event_logs_settings.conf}
rm -rf output/$APP_NAME/README/bitwarden_event_logs_settings.conf.spec
poetry run ucc-gen package --path output/$APP_NAME/ -o output/

mv "output/${APP_NAME}-${VERSION}.tar.gz" "output/${APP_NAME}.tar.gz"

# Validate
poetry run splunk-appinspect inspect --mode precert "output/${APP_NAME}.tar.gz"

echo
echo "Done."
echo "  App name: $APP_NAME"
echo "  Output:   $(pwd)/output/${APP_NAME}.tar.gz"
