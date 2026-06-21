Set-Location $PSScriptRoot

# Load .env variables
if (Test-Path ".env") {
  Get-Content .env | ForEach-Object {
    if ($_ -match "^\s*#") { return }
    if ($_ -match "^(.*?)=(.*)$") {
      $name = $matches[1].Trim()
      $value = $matches[2].Trim()
      [System.Environment]::SetEnvironmentVariable($name, $value, "Process")
      Write-Host "Setting $name"
    }
  }
}

# Check if port 8080 is in use
$port = 8080
$connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue

if ($connection) {
  Write-Host "Port $port is in use. Stopping process..."

  $processIds = $connection | Select-Object -ExpandProperty OwningProcess -Unique

  foreach ($procId in $processIds) {
    try {
      Stop-Process -Id $procId -Force -ErrorAction Stop
      Write-Host "Stopped process with PID $procId"
    } catch {
      Write-Host "Failed to stop PID $procId : $_"
    }
  }

  Start-Sleep -Seconds 2

  $stillUsed = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
  if ($stillUsed) {
    Write-Host "Port $port is STILL in use. Aborting..."
    exit 1
  }

  
} else {
  Write-Host "Port $port is free."
}



# Run Maven cleanly
Write-Host "Running mvn clean..."
mvn clean

Write-Host "Starting Spring Boot..."
mvn spring-boot:run