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
  PGPrereqPage: TWizardPage;
  PGInstallCheckBox: TCheckBox;
  PGStatusLabel: TLabel;

function NeedToInstallPostgreSQL: Boolean;
begin
  // Only install if checkbox is checked
  Result := PGInstallCheckBox.Checked;
end;

procedure InitializeWizard;
var
  PGPath: String;
  IsPGDetected: Boolean;
begin
  // Check common PostgreSQL paths (both 32-bit and 64-bit program files)
  // And also check the Registry for installations
  IsPGDetected := DirExists(ExpandConstant('{commonpf64}\PostgreSQL')) or 
                  DirExists(ExpandConstant('{commonpf}\PostgreSQL')) or
                  RegKeyExists(HKEY_LOCAL_MACHINE, 'SOFTWARE\PostgreSQL\Installations');

  // Create the Custom Page
  PGPrereqPage := CreateCustomPage(wpSelectDir, 'Database Prerequisites', 'PostgreSQL Database Engine check.');

  // Status Label
  PGStatusLabel := TLabel.Create(PGPrereqPage);
  PGStatusLabel.Parent := PGPrereqPage.Surface;
  PGStatusLabel.Top := 10;
  PGStatusLabel.Font.Style := [fsBold];
  
  if IsPGDetected then
  begin
    PGStatusLabel.Caption := 'PostgreSQL Status: Detected (Already Installed)';
    PGStatusLabel.Font.Color := clGreen;
  end
  else
  begin
    PGStatusLabel.Caption := 'PostgreSQL Status: Not Found';
    PGStatusLabel.Font.Color := clRed;
  end;

  // Checkbox for Installation
  PGInstallCheckBox := TCheckBox.Create(PGPrereqPage);
  PGInstallCheckBox.Parent := PGPrereqPage.Surface;
  PGInstallCheckBox.Top := PGStatusLabel.Top + 40;
  PGInstallCheckBox.Width := PGPrereqPage.SurfaceWidth;
  PGInstallCheckBox.Caption := 'Install PostgreSQL Database Server (Recommended if not installed)';
  
  // Default logic: 
  // If not detected, check the box. If detected, uncheck and disable (or just uncheck).
  if IsPGDetected then
  begin
    PGInstallCheckBox.Checked := False;
    // User can still check it if they want to reinstall/update, but let's leave it unchecked.
  end
  else
  begin
    PGInstallCheckBox.Checked := True;
  end;
end;
