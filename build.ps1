param (
    [string] $task = "",
    [string] $os = "",
    [string] $output = "",
    [string] $version = ""
)

# Setup

$scriptPath = $MyInvocation.MyCommand.Path
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
if ($output -eq "") {
    $output = "${dir}\build"
}

$win_rids = @("win-x64", "win-x86")
$lin_rids = @("linux-x64", "linux-musl-x64", "linux-arm", "linux-arm64")
$mac_rids = @("osx-x64", "osx.11.0-arm64", "osx.12-arm64")

# Functions

function GetOsRids() {
    $rids = @()
    if ($os -eq "win") {
        $rids = $win_rids
    }
    elseif ($os -eq "lin") {
        $rids = $lin_rids
    }
    elseif ($os -eq "mac") {
        $rids = $mac_rids
    }
    else {
        echo "ERROR: ``os`` param should be win, lin, or mac."
    }
    $rids
}

function BuildBinary() {
    $rids = GetOsRids
    foreach ($rid in $rids) {
        $o = "$output\bin\$rid"
        Remove-Item -LiteralPath $o -Force -Recurse -ErrorAction Ignore

        echo "### Building binary for $rid to $o"
        dotnet publish -c Release -o $o -r $rid `
            -p:PublishReadyToRun=true -p:PublishSingleFile=true `
            -p:DebugType=None -p:DebugSymbols=false -p:PublishTrimmed=true `
            --self-contained true -p:IncludeNativeLibrariesForSelfExtract=true
    }
}

function BuildApp() {
    $rids = GetOsRids
    foreach ($rid in $rids) {
        $bin_out = "$output\bin\$rid"
        $app_out = "$output\app\$rid\bitwarden_event_logs"
        $app_bin_out = "$app_out\bin"
        $app_lib_out = "$app_out\lib\Bitwarden_Splunk"
        Remove-Item -LiteralPath $app_out -Force -Recurse -ErrorAction Ignore

        echo "### Building app for $rid to $app_out"
        Copy-Item -Path "$dir\app\bitwarden_event_logs" -Destination $app_out -Recurse

        New-Item -ItemType Directory -Path $app_bin_out | Out-Null
        Copy-Item -Path "$bin_out\*" -Destination $app_bin_out -Recurse

        New-Item -ItemType Directory -Path $app_lib_out | Out-Null
        Copy-Item -Path ".\src\Splunk\*" -Destination $app_lib_out -Recurse
        Remove-Item -LiteralPath "$app_lib_out\bin" -Force -Recurse -ErrorAction Ignore
        Remove-Item -LiteralPath "$app_lib_out\obj" -Force -Recurse -ErrorAction Ignore

        if ($rid.Contains("win")) {
            $o = "$app_out\default\inputs.conf"
            ((Get-Content -path $o -Raw) -replace "Bitwarden_Splunk", "Bitwarden_Splunk.exe") | `
                Set-Content -Path $o
        }
        if ($version -ne "") {
            $o = "$app_out\default\app.conf"
            ((Get-Content -path $o -Raw) -replace "version = 1.0.0", "version = $version") | `
                Set-Content -Path $o
        }
    }
}

function Clean() {
    Remove-Item -LiteralPath $output -Force -Recurse -ErrorAction Ignore
}

# Execute

echo "## Building Splunk ($task)"

if ($task -eq "binary") {
    BuildBinary
}
elseif ($task -eq "app") {
    BuildBinary
    BuildApp
}
elseif ($task -eq "clean") {
    Clean
}
else {
    echo "ERROR: ``task`` param should be binary, app, or clean."
}
