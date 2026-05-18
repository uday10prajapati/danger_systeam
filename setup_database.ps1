param(
    [string]$InstallerPath = ""
)

$LogPath = Join-Path $PSScriptRoot "db_setup_log.txt"
$PG_PASSWORD = "6099"

function Write-Log([string]$msg) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $fullMsg = "[$timestamp] $msg"
    Write-Host $fullMsg
    $fullMsg | Out-File -FilePath $LogPath -Append
}

"--- PostgreSQL Setup Started ---" | Out-File -FilePath $LogPath

Write-Log "Checking for PostgreSQL installation..."

$pgService = Get-Service -Name "postgreSQL*" -ErrorAction SilentlyContinue

if ($pgService -and $pgService.Status -eq 'Running') {
    Write-Log "PostgreSQL service found and running ($($pgService.Name)). Skipping engine installation."
} else {
    if ($pgService -and $pgService.Status -ne 'Running') {
        Write-Log "PostgreSQL service found but stopped ($($pgService.Name)). Starting service..."
        Start-Service -Name $pgService.Name -ErrorAction SilentlyContinue
    } else {
        Write-Log "PostgreSQL service not found. Proceeding with installation..."
    
    # Check if the installer exists at the provided path or fallback to TEMP
    if (-not $InstallerPath -or -not (Test-Path $InstallerPath)) {
        $InstallerPath = Join-Path $env:TEMP "postgresql-18.3-2-windows-x64.exe"
    }

    if (Test-Path $InstallerPath) {
        Write-Log "Installing PostgreSQL silently from: $InstallerPath"
        
        # Refined arguments for EDB PostgreSQL Installer
        # --install_runtimes 1: Installs VC++ redist if missing
        # --unattendedmodeui none: True silent
        $arguments = "--mode unattended --unattendedmodeui none --superpassword $PG_PASSWORD --serverport 5432 --install_runtimes 1"
        
        try {
            Write-Log "Running: Start-Process -FilePath $InstallerPath -ArgumentList $arguments -Wait"
            $process = Start-Process -FilePath "$InstallerPath" -ArgumentList $arguments -Wait -Verb RunAs -PassThru
            
            if ($process.ExitCode -eq 0) {
                Write-Log "PostgreSQL installation finished successfully (Code: 0)."
            } else {
                Write-Log "⚠️ PostgreSQL installation finished with exit code: $($process.ExitCode). Checking if it succeeded anyway..."
            }
        } catch {
            Write-Log "CRITICAL ERROR during Start-Process: $($_.Exception.Message)"
            exit 1
        }
    } else {
        Write-Log "Error: PostgreSQL installer not found at $InstallerPath"
        exit 1
        }
    }
    Write-Log "Waiting for service to initialize..."
    Start-Sleep -Seconds 30
}

Write-Log "Configuring database 'danger_systeam'..."
$env:PGPASSWORD = $PG_PASSWORD

# Find psql.exe dynamically in standard installation paths
$possiblePaths = @(
    "C:\Program Files\PostgreSQL\*\bin\psql.exe",
    "C:\Program Files (x86)\PostgreSQL\*\bin\psql.exe"
)

$psqlPath = $null
foreach ($p in $possiblePaths) {
    $psqlPath = Resolve-Path $p -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Path
    if ($psqlPath) { break }
}

if (-not $psqlPath) {
    Write-Log "Searching recursively for psql.exe (this may take time)..."
    $psqlPath = Get-ChildItem -Path "C:\Program Files\PostgreSQL" -Filter "psql.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
}

if ($psqlPath) {
    Write-Log "Found psql.exe at: $psqlPath"
    # Create database if it doesn't exist
    # Using -w to not prompt for password (uses PGPASSWORD env)
    & "$psqlPath" -U postgres -h localhost -w -c "SELECT 1 FROM pg_database WHERE datname = 'danger_systeam'" 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Log "Creating database 'danger_systeam'..."
        & "$psqlPath" -U postgres -h localhost -w -c "CREATE DATABASE danger_systeam;" 2>&1 | Out-File -FilePath $LogPath -Append
    } else {
        Write-Log "Database 'danger_systeam' already exists."
    }
} else {
    Write-Log "ERROR: psql.exe not found. Database could not be created automatically."
    exit 1
}

Write-Log "PostgreSQL setup workflow complete."
exit 0
