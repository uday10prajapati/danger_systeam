!macro customInstall
  DetailPrint "Initializing Danger Systeam Pro Database..."
  DetailPrint "Installing PostgreSQL and configuring database. Please wait..."
  
  nsExec::ExecToLog 'powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File "$INSTDIR\resources\setup_database.ps1" -InstallerPath "$INSTDIR\resources\prerequisites\postgresql-18.3-2-windows-x64.exe"'
  
  Pop $0 ; Get exit code
  IntCmp $0 0 success
    DetailPrint "⚠️ Database setup finished with non-zero code ($0). Check db_setup_log.txt in installation folder."
    Goto done
  success:
    DetailPrint "✅ Database setup completed successfully."
  done:
!macroend

!macro customUnInstall
  # Clean up logic
!macroend
