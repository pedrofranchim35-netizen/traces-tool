; ==============================================================================
; TRACES TOAD FOR ORACLE - INSTALADOR & ATUALIZADOR NATIVO (.EXE)
; Dual-mode: Instalacao Limpa e Atualizacao Automatica de Versao Existente
; Aplicativo 100% Nativo Standalone para Windows
; ==============================================================================

Unicode True
!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "FileFunc.nsh"

; Informacoes do Produto
!define PRODUCT_NAME "TRACES Toad for Oracle"
!define PRODUCT_VERSION "2026.2.0"
!define PRODUCT_PUBLISHER "TRACES Group"
!define PRODUCT_WEB_SITE "https://github.com/pedrofranchim35-netizen/traces-tool"
!define PRODUCT_DIR_REGKEY "Software\TracesToad"
!define PRODUCT_UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\TracesToad"
!define MAIN_EXE "Traces.exe"

Name "${PRODUCT_NAME} ${PRODUCT_VERSION}"
OutFile "..\TracesToad-Setup.exe"
InstallDir "$LOCALAPPDATA\TracesToad"
InstallDirRegKey HKCU "${PRODUCT_DIR_REGKEY}" "InstallDir"
RequestExecutionLevel user
SetCompressor /SOLID lzma

; Icones
!define MUI_ICON "..\assets/traces.ico"
!define MUI_UNICON "..\assets/traces.ico"

; Variavel de modo (Instalacao vs Atualizacao)
Var IS_UPDATE

; ------------------------------------------------------------------------------
; Configuracoes da Interface Moderna (MUI2)
; ------------------------------------------------------------------------------
!define MUI_ABORTWARNING
!define MUI_WELCOMEPAGE_TITLE "Bem-vindo ao Instalador / Atualizador do ${PRODUCT_NAME}"
!define MUI_WELCOMEPAGE_TEXT "Este assistente instalara ou atualizara o ${PRODUCT_NAME} para a versao ${PRODUCT_VERSION}.$\r$\n$\r$\nSe voce ja possui uma versao anterior instalada, todos os arquivos serao atualizados mantendo intactos seus historicos de conexao, workspaces e configuracoes salvas.$\r$\n$\r$\nClique em Avancar para continuar."

; Paginas do Instalador
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES

; Pagina de Conclusao com opcao de iniciar
!define MUI_FINISHPAGE_RUN "$INSTDIR\${MAIN_EXE}"
!define MUI_FINISHPAGE_RUN_TEXT "Iniciar o ${PRODUCT_NAME} agora"
!define MUI_FINISHPAGE_TITLE "Instalacao / Atualizacao Concluida!"
!define MUI_FINISHPAGE_TEXT "${PRODUCT_NAME} versao ${PRODUCT_VERSION} esta pronto para uso com todas as funcionalidades e sem restricoes de licenca."
!insertmacro MUI_PAGE_FINISH

; Paginas do Desinstalador
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; Idiomas
!insertmacro MUI_LANGUAGE "PortugueseBR"
!insertmacro MUI_LANGUAGE "English"

; ------------------------------------------------------------------------------
; Inicializacao: Detectar se e Instalacao ou Atualizacao
; ------------------------------------------------------------------------------
Function .onInit
    StrCpy $IS_UPDATE "0"
    
    ; Ler diretorio de instalacao existente no registro
    ReadRegStr $0 HKCU "${PRODUCT_DIR_REGKEY}" "InstallDir"
    ${If} $0 != ""
    ${AndIf} ${FileExists} "$0\index.html"
        StrCpy $INSTDIR $0
        StrCpy $IS_UPDATE "1"
    ${ElseIf} ${FileExists} "$LOCALAPPDATA\TracesToad\index.html"
        StrCpy $INSTDIR "$LOCALAPPDATA\TracesToad"
        StrCpy $IS_UPDATE "1"
    ${EndIf}
FunctionEnd

; ------------------------------------------------------------------------------
; Secao Principal de Instalacao e Atualizacao
; ------------------------------------------------------------------------------
Section "MainSection" SEC01
    SetShellVarContext current

    DetailPrint "--------------------------------------------------"
    ${If} $IS_UPDATE == "1"
        DetailPrint "Atualizando instalacao existente em: $INSTDIR"
    ${Else}
        DetailPrint "Instalando nova versao em: $INSTDIR"
    ${EndIf}
    DetailPrint "--------------------------------------------------"

    ; 1. Encerrar processos em execucao para permitir sobrescrever executaveis
    DetailPrint "[1/5] Verificando e encerrando instancias ativas do Toad..."
    nsExec::Exec 'taskkill /F /IM Traces.exe /IM TracesOracle.exe /IM TracesDBA.exe /IM TracesToad.exe /IM Toad.exe /T'
    nsExec::Exec 'powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3033 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $$_.OwningProcess -Force -ErrorAction SilentlyContinue }"'
    Sleep 500

    ; 2. Criar diretorio
    CreateDirectory "$INSTDIR"
    SetOutPath "$INSTDIR"

    ; 3. Copiar Executaveis Nativos (.exe) e Scripts Principais
    DetailPrint "[2/5] Copiando executaveis nativos (.exe)..."
    File "..\Traces.exe"
    File /nonfatal "..\TracesOracle.exe"
    File /nonfatal "..\TracesDBA.exe"
    File /nonfatal "..\TracesToad.exe"
    File /nonfatal "..\Toad.exe"
    File "..\start.bat"
    File "..\start.sh"
    File "..\update.bat"
    File "..\update.sh"
    File "..\index.html"
    File "..\README.md"
    File /nonfatal "..\Instalar.bat"
    File /nonfatal "..\main.js"
    File /nonfatal "..\preload.js"
    File /nonfatal "..\package.json"

    ; 4. Copiar Subpastas de Recursos e Dependencias
    DetailPrint "[3/5] Copiando modulos do aplicativo (JS, CSS, Assets, Bridge, Instant Client)..."
    CreateDirectory "$INSTDIR\assets"
    SetOutPath "$INSTDIR\assets"
    File /r "..\assets\*.*"

    CreateDirectory "$INSTDIR\js"
    SetOutPath "$INSTDIR\js"
    File /r "..\js\*.*"

    CreateDirectory "$INSTDIR\css"
    SetOutPath "$INSTDIR\css"
    File /r "..\css\*.*"

    CreateDirectory "$INSTDIR\bridge"
    SetOutPath "$INSTDIR\bridge"
    File /r "..\bridge\*.*"

    CreateDirectory "$INSTDIR\installer"
    SetOutPath "$INSTDIR\installer"
    File /r "..\installer\*.*"

    CreateDirectory "$INSTDIR\instantclient"
    SetOutPath "$INSTDIR\instantclient"
    File /r "..\instantclient\*.*"

    SetOutPath "$INSTDIR"

    ; Salvar arquivo de versao
    FileOpen $4 "$INSTDIR\.version" w
    FileWrite $4 "${PRODUCT_VERSION}"
    FileClose $4

    ; 5. Criar Desinstalador
    DetailPrint "[4/5] Registrando desinstalador..."
    WriteUninstaller "$INSTDIR\Uninstall.exe"

    ; 6. Criar Atalhos (Area de Trabalho e Menu Iniciar)
    DetailPrint "[5/5] Criando atalhos na Area de Trabalho e Menu Iniciar..."
    CreateDirectory "$SMPROGRAMS\${PRODUCT_NAME}"
    CreateShortcut "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME}.lnk" "$INSTDIR\${MAIN_EXE}" "" "$INSTDIR\assets\traces.ico" 0
    CreateShortcut "$SMPROGRAMS\${PRODUCT_NAME}\Atualizar ${PRODUCT_NAME}.lnk" "$INSTDIR\update.bat" "" "$INSTDIR\assets\traces.ico" 0
    CreateShortcut "$SMPROGRAMS\${PRODUCT_NAME}\Desinstalar.lnk" "$INSTDIR\Uninstall.exe" "" "$INSTDIR\Uninstall.exe" 0
    CreateShortcut "$DESKTOP\${PRODUCT_NAME}.lnk" "$INSTDIR\${MAIN_EXE}" "" "$INSTDIR\assets\traces.ico" 0

    ; 7. Registrar no Windows (Painel de Controle / Adicionar ou Remover Programas)
    WriteRegStr HKCU "${PRODUCT_DIR_REGKEY}" "InstallDir" "$INSTDIR"
    WriteRegStr HKCU "${PRODUCT_DIR_REGKEY}" "Version" "${PRODUCT_VERSION}"
    WriteRegStr HKCU "${PRODUCT_UNINST_KEY}" "DisplayName" "${PRODUCT_NAME}"
    WriteRegStr HKCU "${PRODUCT_UNINST_KEY}" "DisplayVersion" "${PRODUCT_VERSION}"
    WriteRegStr HKCU "${PRODUCT_UNINST_KEY}" "Publisher" "${PRODUCT_PUBLISHER}"
    WriteRegStr HKCU "${PRODUCT_UNINST_KEY}" "DisplayIcon" "$INSTDIR\assets\traces.ico"
    WriteRegStr HKCU "${PRODUCT_UNINST_KEY}" "UninstallString" "$INSTDIR\Uninstall.exe"
    WriteRegStr HKCU "${PRODUCT_UNINST_KEY}" "InstallLocation" "$INSTDIR"
    WriteRegStr HKCU "${PRODUCT_UNINST_KEY}" "URLInfoAbout" "${PRODUCT_WEB_SITE}"
    WriteRegDWORD HKCU "${PRODUCT_UNINST_KEY}" "NoModify" 1
    WriteRegDWORD HKCU "${PRODUCT_UNINST_KEY}" "NoRepair" 1

    DetailPrint "Instalacao/Atualizacao concluida com sucesso!"
SectionEnd

; ------------------------------------------------------------------------------
; Secao de Desinstalacao
; ------------------------------------------------------------------------------
Section "Uninstall"
    SetShellVarContext current

    ; Encerrar processos antes de remover
    nsExec::Exec 'taskkill /F /IM TracesToad.exe /IM Toad.exe /T'
    nsExec::Exec 'powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3033 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $$_.OwningProcess -Force -ErrorAction SilentlyContinue }"'

    ; Remover atalhos
    Delete "$DESKTOP\${PRODUCT_NAME}.lnk"
    Delete "$SMPROGRAMS\${PRODUCT_NAME}\*.*"
    RMDir "$SMPROGRAMS\${PRODUCT_NAME}"

    ; Remover arquivos da instalacao
    Delete "$INSTDIR\TracesToad.exe"
    Delete "$INSTDIR\Toad.exe"
    Delete "$INSTDIR\Uninstall.exe"
    Delete "$INSTDIR\start.bat"
    Delete "$INSTDIR\start.sh"
    Delete "$INSTDIR\update.bat"
    Delete "$INSTDIR\update.sh"
    Delete "$INSTDIR\index.html"
    Delete "$INSTDIR\README.md"
    Delete "$INSTDIR\.version"
    Delete "$INSTDIR\Instalar.bat"
    Delete "$INSTDIR\main.js"
    Delete "$INSTDIR\preload.js"
    Delete "$INSTDIR\package.json"

    RMDir /r "$INSTDIR\assets"
    RMDir /r "$INSTDIR\js"
    RMDir /r "$INSTDIR\css"
    RMDir /r "$INSTDIR\bridge"
    RMDir /r "$INSTDIR\installer"
    RMDir /r "$INSTDIR\instantclient"
    RMDir "$INSTDIR"

    ; Remover registros
    DeleteRegKey HKCU "${PRODUCT_UNINST_KEY}"
    DeleteRegKey HKCU "${PRODUCT_DIR_REGKEY}"
SectionEnd
