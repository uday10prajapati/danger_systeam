# Danger Systeam Build & Log Script
$LOG_FILE = "build_output.log"

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $formattedMessage = "[$timestamp] $Message"
    Write-Host $formattedMessage
    $formattedMessage | Out-File -FilePath $LOG_FILE -Append
}

# Clear previous log
if (Test-Path $LOG_FILE) { Remove-Item $LOG_FILE }

Write-Log "Starting Build Process for Danger Systeam Pro"

# 1. Clean previous builds
Write-Log "Cleaning previous build artifacts..."

# Kill any processes running from the output directory to release file locks
$outputExe = "D:\Danger Systeam\installer\Output_Final\win-unpacked\Danger Systeam Pro.exe"
Get-Process | Where-Object { $_.Path -eq $outputExe } | Stop-Process -Force -ErrorAction SilentlyContinue

# Aggressive cleanup of Output folder
if (Test-Path "installer/Output_Final") {
    try {
        Remove-Item -Recurse -Force "installer/Output_Final" -ErrorAction Stop
    } catch {
        Write-Log "⚠️ Warning: Could not fully clean installer/Output_Final. Attempting to continue anyway..."
    }
}
if (Test-Path "frontend/dist") { Remove-Item -Recurse -Force "frontend/dist" }

# 2. Build Frontend
Write-Log "Building Frontend..."
npm run build --workspace=frontend 2>&1 | Out-File -FilePath $LOG_FILE -Append
if ($LASTEXITCODE -ne 0) {
    Write-Log "Frontend build failed. Check $LOG_FILE for details."
    exit 1
}
Write-Log "Frontend build successful."

# 2.5 Prepare Backend Dependencies
Write-Log "Installing Backend Dependencies (Local)..."
npm install --prefix backend --omit=dev --no-package-lock 2>&1 | Out-File -FilePath $LOG_FILE -Append
if ($LASTEXITCODE -ne 0) {
    Write-Log "Backend dependencies install failed. Check $LOG_FILE for details."
    exit 1
}
Write-Log "Backend dependencies ready."

# 3. Package Electron App (Unpacked)
Write-Log "Packaging Electron Application (Unpacked)..."
npx electron-builder --win --dir 2>&1 | Out-File -FilePath $LOG_FILE -Append
if ($LASTEXITCODE -ne 0) {
    Write-Log "Packaging failed. Check $LOG_FILE for details."
    exit 1
}
Write-Log "Packaging successful."

# 4. Compile Inno Setup Installer
Write-Log "Compiling Inno Setup Installer..."
$isccPath = "C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
if (-not (Test-Path $isccPath)) {
    $isccPath = Get-ChildItem -Path "C:\Program Files (x86)\Inno Setup*" -Filter "ISCC.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
}

if ($isccPath) {
    & $isccPath "installer\electron_setup.iss" 2>&1 | Out-File -FilePath $LOG_FILE -Append
    if ($LASTEXITCODE -ne 0) {
        Write-Log "Inno Setup compilation failed. Check $LOG_FILE for details."
        exit 1
    }
    Write-Log "Inno Setup Installer created successfully in installer\Output_Final"
} else {
    Write-Log "Inno Setup Compiler (ISCC.exe) not found. Skipping Inno Setup build."
}

Write-Log "Build Process Complete! Your final installer is in installer\Output_Final"
