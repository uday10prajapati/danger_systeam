[Setup]
AppName=Danger Systeam
AppVersion=1.0.0
DefaultDirName={autopf}\DangerSysteam
DefaultGroupName=Danger Systeam
OutputDir=Output
OutputBaseFilename=DangerSysteamSetup
Compression=lzma
SolidCompression=yes
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible

[Files]
; Application Files
Source: "build\server.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "build\.env"; DestDir: "{app}"; Flags: ignoreversion
Source: "build\dist\*"; DestDir: "{app}\dist"; Flags: ignoreversion recursesubdirs createallsubdirs

; SQL Scripts
Source: "scripts\create_db.sql"; DestDir: "{app}\scripts"; Flags: ignoreversion

; PostgreSQL Installer (User must place this in prerequisites folder before compiling)
Source: "prerequisites\postgresql-18.3-2-windows-x64.exe"; DestDir: "{tmp}"; Flags: deleteafterinstall

[Icons]
Name: "{group}\Danger Systeam"; Filename: "{app}\server.exe"
Name: "{autodesktop}\Danger Systeam"; Filename: "{app}\server.exe"

[Run]
; Install PostgreSQL Silently (only if not detected)
Filename: "{tmp}\postgresql-18.3-2-windows-x64.exe"; \
    Parameters: "--mode unattended --superpassword ""6099"" --servicename ""postgreSQL"" --servicepassword ""6099"" --serverport 5432"; \
    StatusMsg: "Installing PostgreSQL Database Server (this may take a few minutes)..."; \
    Check: NeedToInstallPostgreSQL; \
    Flags: waituntilterminated

; Create Database (Attempt to create if not exists)
Filename: "{cmd}"; \
    Parameters: "/c ""SET ""PGPASSWORD=6099"" & ""{commonpf}\PostgreSQL\18\bin\psql.exe"" -U postgres -h localhost -d postgres -f ""{app}\scripts\create_db.sql"""""; \
    StatusMsg: "Configuring database..."; \
    Flags: runhidden waituntilterminated

; Launch Application and Open Browser
Filename: "{app}\server.exe"; Description: "Launch Danger Systeam"; Flags: nowait postinstall
Filename: "http://localhost:3000"; Description: "Open Application in Browser"; Flags: shellexec postinstall

[Code]
var
  PGInstalled: Boolean;

function NeedToInstallPostgreSQL: Boolean;
begin
  // Check if PostgreSQL directory exists in Program Files
  PGInstalled := DirExists(ExpandConstant('{commonpf}\PostgreSQL'));
  Result := not PGInstalled;
end;

procedure InitializeWizard;
begin
  PGInstalled := DirExists(ExpandConstant('{commonpf}\PostgreSQL'));
end;
