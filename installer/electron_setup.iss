[Setup]
AppName=Danger Systeam Pro
AppVersion=1.0.1
DefaultDirName={autopf}\DangerSysteamPro
DefaultGroupName=Danger Systeam Pro
OutputDir=Output_Final
OutputBaseFilename=DangerSysteamPro_Setup
Compression=lzma
SolidCompression=yes
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible

[Files]
; Electron Packaged Files (from electron-builder)
Source: "Output_Final\win-unpacked\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

; Database Setup Script
Source: "..\setup_database.ps1"; DestDir: "{app}"; Flags: ignoreversion

; PostgreSQL Installer
Source: "prerequisites\postgresql-18.3-2-windows-x64.exe"; DestDir: "{tmp}"; Flags: deleteafterinstall

[Icons]
Name: "{group}\Danger Systeam Pro"; Filename: "{app}\Danger Systeam Pro.exe"
Name: "{autodesktop}\Danger Systeam Pro"; Filename: "{app}\Danger Systeam Pro.exe"

[Run]
; Run the PowerShell Setup Script (Installs PG and Creates DB)
Filename: "powershell.exe"; \
    Parameters: "-ExecutionPolicy Bypass -File ""{app}\setup_database.ps1"" -InstallerPath ""{tmp}\postgresql-18.3-2-windows-x64.exe"""; \
    StatusMsg: "Configuring PostgreSQL and Database (this may take a few minutes)..."; \
    Flags: runhidden waituntilterminated

; Launch Application
Filename: "{app}\Danger Systeam Pro.exe"; Description: "Launch Danger Systeam Pro"; Flags: nowait postinstall
