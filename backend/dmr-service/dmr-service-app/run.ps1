$envFile = ".env"

if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()

    if (-not $line -or $line.StartsWith("#")) {
      return
    }

    if ($line -match "^(.*?)=(.*)$") {
      $name = $matches[1].Trim()
      $value = $matches[2].Trim()
      [System.Environment]::SetEnvironmentVariable($name, $value, [System.EnvironmentVariableTarget]::Process)
      Write-Host "Setting $name"
    }
  }
}

mvn clean
mvn spring-boot:run
