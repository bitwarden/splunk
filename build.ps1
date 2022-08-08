param (
    [string] $os = "",
    [string] $output = ""
)

# Setup

$scriptPath = $MyInvocation.MyCommand.Path
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
if ($output -eq "") {
    $output = "${dir}\build"
}

# Functions

function BuildApp($rid) {
    $o = "$output\$rid"
    Remove-Item -LiteralPath $o -Force -Recurse

    echo "### Building for $rid to $o"
    dotnet publish -c Release -o $o -r $rid `
        -p:PublishReadyToRun=true -p:PublishSingleFile=true `
        --self-contained true -p:IncludeNativeLibrariesForSelfExtract=true
}

# Execute

echo "## Building Splunk"

if ($os -eq "win") {
    BuildApp "win-x64"
    BuildApp "win-x86"
}
elseif ($os -eq "lin") {
    BuildApp "linux-x64"
    BuildApp "linux-musl-x64"
    BuildApp "linux-arm"
    BuildApp "linux-arm64"
}
elseif ($os -eq "mac") {
    BuildApp "osx-x64"
    BuildApp "osx.11.0-arm64"
    BuildApp "osx.12-arm64"
}
else {
    echo "ERROR: ``os`` param should be win, lin, or mac."
}
