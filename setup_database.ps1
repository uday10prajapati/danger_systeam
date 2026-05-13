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

Write-Log "🔍 Checking for PostgreSQL installation..."

# Check if any PostgreSQL service exists
$pgService = Get-Service -Name "postgreSQL*" -ErrorAction SilentlyContinue

if ($pgService) {
    Write-Log "✅ PostgreSQL service found ($($pgService.Name)). Skipping engine installation."
} else {
    Write-Log "📥 PostgreSQL service not found. Proceeding with installation..."
    
    # Check if the installer exists at the provided path or fallback to TEMP
    if (-not $InstallerPath -or -not (Test-Path $InstallerPath)) {
        $InstallerPath = Join-Path $env:TEMP "postgresql-18.3-2-windows-x64.exe"
    }

    if (Test-Path $InstallerPath) {
        Write-Log "⚙️ Installing PostgreSQL silently from: $InstallerPath"
        # We use a standard service name or let the installer decide
        $arguments = "--mode unattended --superpassword $PG_PASSWORD --unattendedmodeui none --serverport 5432"
        
        try {
            $process = Start-Process -FilePath "$InstallerPath" -ArgumentList $arguments -Wait -Verb RunAs -PassThru
            Write-Log "✅ PostgreSQL installation finished with exit code: $($process.ExitCode)"
        } catch {
            Write-Log "❌ CRITICAL ERROR during Start-Process: $($_.Exception.Message)"
            exit 1
        }
    } else {
        Write-Log "❌ Error: PostgreSQL installer not found at $InstallerPath"
        exit 1
    }
}

# Wait for service to initialize
Write-Log "⏳ Waiting for service to start..."
Start-Sleep -Seconds 15

Write-Log "🗄️ Configuring database 'danger_systeam'..."
$env:PGPASSWORD = $PG_PASSWORD

# Find psql.exe dynamically
$psqlPath = Get-ChildItem -Path "C:\Program Files\PostgreSQL" -Filter "psql.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName

if ($psqlPath) {
    Write-Log "Found psql.exe at: $psqlPath"
    # Create database if it doesn't exist
    & "$psqlPath" -U postgres -h localhost -c "SELECT 1 FROM pg_database WHERE datname = 'danger_systeam'" | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Log "Creating database 'danger_systeam'..."
        & "$psqlPath" -U postgres -h localhost -c "CREATE DATABASE danger_systeam;" 2>&1 | Out-File -FilePath $LogPath -Append
    } else {
        Write-Log "✅ Database 'danger_systeam' already exists."
    }
} else {
    Write-Log "⚠️ psql.exe not found. Manual configuration might be required."
}

Write-Log "✨ PostgreSQL setup workflow complete."
exit 0
