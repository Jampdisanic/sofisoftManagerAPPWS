[Setup]
AppName=Sofisoft Manager Server
AppVersion=1.2.0
DefaultDirName={pf}\SofisoftManagerServer
DefaultGroupName=Sofisoft Manager Server
UninstallDisplayIcon={app}\SOFIManagerWS.exe
Compression=lzma2
SolidCompression=yes
OutputDir=.\installer
OutputBaseFilename=SofisoftManagerServerSetup
; Se requieren permisos de administrador para abrir puertos de Firewall y agregar claves de inicio global
PrivilegesRequired=admin

[Files]
; Copia todos los archivos de tu compilación publish
Source: "C:\Users\DESARROLLO\source\repos\SOFIManagerPVMaster\SOFIManagerWS\SOFIManagerWS\SOFIManagerWS\publish\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Registry]
; Limpieza
Root: HKLM; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueName: "SofisoftManagerServer"; Flags: deletevalue uninsdeletevalue

[Run]
; 1. Instala el Servicio de Windows
Filename: "{sys}\sc.exe"; Parameters: "create SofisoftManagerServer binPath= ""{app}\SOFIManagerWS.exe"" start= auto DisplayName= ""Sofisoft Manager Server"""; Flags: runhidden
; 2. Abre el puerto 5246 TCP para cualquier perfil de red (Pública/Privada)
Filename: "{sys}\netsh.exe"; Parameters: "advfirewall firewall add rule name=""Sofisoft Manager API"" dir=in action=allow protocol=TCP localport=5246 profile=any"; Flags: runhidden
; 3. Inicia el servicio
Filename: "{sys}\sc.exe"; Parameters: "start SofisoftManagerServer"; Flags: runhidden

[UninstallRun]
; 1. Detiene el servicio
Filename: "{sys}\sc.exe"; Parameters: "stop SofisoftManagerServer"; Flags: runhidden
; 2. Elimina el servicio
Filename: "{sys}\sc.exe"; Parameters: "delete SofisoftManagerServer"; Flags: runhidden
; 3. Elimina la regla del Firewall
Filename: "{sys}\netsh.exe"; Parameters: "advfirewall firewall delete rule name=""Sofisoft Manager API"""; Flags: runhidden
