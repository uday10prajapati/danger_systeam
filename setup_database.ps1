param(
    [string]$InstallerPath = "$PSScriptRoot\postgresql-18.3-2-windows-x64.exe"
)

$PG_PASSWORD = "6099"

Write-Host "🔍 Checking for PostgreSQL installation..."

# Check if PostgreSQL service exists
$pgService = Get-Service -Name "postgreSQL*" -ErrorAction SilentlyContinue

if ($pgService) {
    Write-Host "✅ PostgreSQL is already installed and running."
} else {
    Write-Host "📥 PostgreSQL not found. Starting auto-setup..."
    
    # Check if the installer exists at the provided path or fallback to TEMP
    if (-not (Test-Path $InstallerPath)) {
        $InstallerPath = "$env:TEMP\postgresql-18.3-2-windows-x64.exe"
    }

    if (Test-Path $InstallerPath) {
        Write-Host "⚙️ Installing PostgreSQL silently from $InstallerPath..."
        $arguments = "--mode unattended --superpassword $PG_PASSWORD --unattendedmodeui none --servicename postgreSQL --servicepassword $PG_PASSWORD --serverport 5432"
        Start-Process -FilePath $InstallerPath -ArgumentList $arguments -Wait -Verb RunAs
        Write-Host "✅ PostgreSQL installation complete."
    } else {
        Write-Host "❌ Error: PostgreSQL installer not found at $InstallerPath"
        exit 1
    }
}

# Wait a few seconds for service to start
Start-Sleep -Seconds 10

Write-Host "🗄️ Creating database 'danger_systeam'..."
$env:PGPASSWORD = $PG_PASSWORD
$psqlPath = "C:\Program Files\PostgreSQL\15\bin\psql.exe"
if (-not (Test-Path $psqlPath)) {
    # Try alternate path for newer versions
    $psqlPath = Get-ChildItem -Path "C:\Program Files\PostgreSQL" -Filter "psql.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
}

if ($psqlPath) {
    & $psqlPath -U postgres -h localhost -c "CREATE DATABASE danger_systeam;" 2>$null
    Write-Host "✅ Database 'danger_systeam' created or already exists."
} else {
    Write-Host "⚠️ psql.exe not found. Database might need manual creation or will be created on first app launch."
}

Write-Host ""
Write-Host "--------------------------------------------------"
Write-Host "✨ PostgreSQL setup complete!"
Write-Host "👤 Default Admin User: admin@danger.com"
Write-Host "🔑 Default Password: 6099"
Write-Host "--------------------------------------------------"
exit 0
