; ==============================================================================
; TRACES TOAD FOR ORACLE - INNO SETUP SCRIPT (.EXE INSTALLER)
; ==============================================================================

#define MyAppName "TRACES Toad for Oracle"
#define MyAppVersion "2026.2.0"
#define MyAppPublisher "Traces Group"
#define MyAppURL "https://traces.com.br"
#define MyAppExeName "TracesLauncher.bat"

[Setup]
AppId={{5E28B841-B882-4161-9493-27D519BA0B28}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={localappdata}\TracesToad
DisableProgramGroupPage=yes
OutputBaseFilename=Traces-Toad-Setup
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
SetupIconFile=..\assets\traces.ico
PrivilegesRequired=lowest

[Languages]
Name: "brazilianportuguese"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "..\\*"; DestDir: "{app}\\app"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: ".git\*,installer\dist\*,installer\build\*"
Source: "TracesLauncher.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "TracesLauncher.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "config.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\assets\traces.ico"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\traces.ico"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\traces.ico"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent
