Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot

$projectFile = Join-Path $PSScriptRoot "pom.xml"
if (-not (Test-Path $projectFile)) {
  throw "pom.xml not found in $PSScriptRoot"
}

function Get-ServerPort {
  $defaultPort = 8085
  $propertiesFile = Join-Path $PSScriptRoot "src\main\resources\application.properties"

  if (-not (Test-Path $propertiesFile)) {
    return $defaultPort
  }

  $line = Get-Content $propertiesFile | Where-Object { $_ -match "^\s*server\.port\s*=\s*\d+\s*$" } | Select-Object -First 1
  if ($null -eq $line) {
    return $defaultPort
  }

  $portText = ($line -split "=", 2)[1].Trim()
  return [int]$portText
}

function Stop-ProcessListeningOnPort([int]$port) {
  $listeners = @(
    Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue |
      Select-Object -ExpandProperty OwningProcess -Unique
  )

  if ($listeners.Length -eq 0) {
    return
  }

  foreach ($ownerPid in $listeners) {
    if ($ownerPid -eq $PID) {
      continue
    }

    try {
      $proc = Get-Process -Id $ownerPid -ErrorAction Stop
      Write-Host "Stopping process on port ${port}: PID=$ownerPid Name=$($proc.ProcessName)"
      Stop-Process -Id $ownerPid -Force -ErrorAction Stop
    }
    catch {
      Write-Warning "Could not stop PID $ownerPid on port $port. You may need to close it manually."
    }
  }
}

# Use Maven Wrapper when available so the project always runs with its expected Maven setup.
$mvnCommand = "mvn"
if (Test-Path (Join-Path $PSScriptRoot "mvnw.cmd")) {
  $mvnCommand = ".\\mvnw.cmd"
}

Write-Host "Cleaning previous build output..."
& $mvnCommand clean
if ($LASTEXITCODE -ne 0) {
  throw "Clean step failed with exit code $LASTEXITCODE"
}

$serverPort = Get-ServerPort
Write-Host "Checking if port $serverPort is already in use..."
Stop-ProcessListeningOnPort -port $serverPort

Write-Host "Starting hospital-service..."
& $mvnCommand spring-boot:run
if ($LASTEXITCODE -ne 0) {
  throw "Run step failed with exit code $LASTEXITCODE"
}
