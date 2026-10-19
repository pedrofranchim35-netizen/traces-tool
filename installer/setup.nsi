; ==============================================================================
; TRACES TOAD FOR ORACLE - INSTALADOR & ATUALIZADOR NATIVO (.EXE)
; Dual-mode: Instalação Limpa e Atualização Automática de Versão Existente
; ==============================================================================

Unicode True
!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "FileFunc.nsh"

; Informações do Produto
!define PRODUCT_NAME "TRACES Toad for Oracle"
!define PRODUCT_VERSION "2026.2.0"
!define PRODUCT_PUBLISHER "TRACES Group"
!define PRODUCT_WEB_SITE "https://github.com/pedrofranchim35-netizen/traces-tool"
!define PRODUCT_DIR_REGKEY "Software\TracesToad"
!define PRODUCT_UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\TracesToad"
!define MAIN_EXE "TracesToad.exe"

Name "${PRODUCT_NAME} ${PRODUCT_VERSION}"
OutFile "../TracesToad-Setup.exe"
InstallDir "$LOCALAPPDATA\TracesToad"
InstallDirRegKey HKCU "${PRODUCT_DIR_REGKEY}" "InstallDir"
RequestExecutionLevel user
SetCompressor /SOLID lzma

; Ícones
!define MUI_ICON "../assets/traces.ico"
!define MUI_UNICON "../assets/traces.ico"

; Variável de modo (Instalação vs Atualização)
Var IS_UPDATE

; ------------------------------------------------------------------------------
; Configurações da Interface Moderna (MUI2)
; ------------------------------------------------------------------------------
!define MUI_ABORTWARNING
!define MUI_WELCOMEPAGE_TITLE "Bem-vindo ao Instalador / Atualizador do ${PRODUCT_NAME}"
!define MUI_WELCOMEPAGE_TEXT "Este assistente instalará ou atualizará o ${PRODUCT_NAME} para a versão ${PRODUCT_VERSION}.$\r$\n$\r$\nSe você já possui uma versão anterior instalada, todos os arquivos serão atualizados mantendo intactos seus históricos de conexão, workspaces e configurações salvas.$\r$\n$\r$\nClique em Avançar para continuar."

; Páginas do Instalador
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES

; Página de Conclusão com opção de iniciar
!define MUI_FINISHPAGE_RUN "$INSTDIR\${MAIN_EXE}"
!define MUI_FINISHPAGE_RUN_TEXT "Iniciar o ${PRODUCT_NAME} agora"
!define MUI_FINISHPAGE_TITLE "Instalação / Atualização Concluída!"
!define MUI_FINISHPAGE_TEXT "${PRODUCT_NAME} versão ${PRODUCT_VERSION} está pronto para uso com todas as funcionalidades e sem restrições de licença."
!insertmacro MUI_PAGE_FINISH

; Páginas do Desinstalador
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; Idiomas
!insertmacro MUI_LANGUAGE "PortugueseBR"
!insertmacro MUI_LANGUAGE "English"

; ------------------------------------------------------------------------------
; Inicialização: Detectar se é Instalação ou Atualização
; ------------------------------------------------------------------------------
Function .onInit
    StrCpy $IS_UPDATE "0"
    
    ; Ler diretório de instalação existente no registro
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
; Seção Principal de Instalação e Atualização
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

    ; 1. Encerrar processos em execução para permitir sobrescrever executáveis
    DetailPrint "[1/5] Verificando e encerrando instancias ativas do Toad..."
    nsExec::Exec 'taskkill /F /IM TracesToad.exe /IM Toad.exe /T'
    nsExec::Exec 'powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3033 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $$_.OwningProcess -Force -ErrorAction SilentlyContinue }"'
    Sleep 500

    ; 2. Criar diretório
    CreateDirectory "$INSTDIR"
    SetOutPath "$INSTDIR"

    ; 3. Copiar Executáveis Nativos (.exe)
    DetailPrint "[2/5] Copiando executaveis nativos (.exe)..."
    File "../TracesToad.exe"
    File "../Toad.exe"
    File "../start.bat"
    File "../start.sh"
    File "../update.bat"
    File "../update.sh"
    File "../index.html"
    File "../README.md"

    ; 4. Copiar Subpastas de Recursos e Dependências
    DetailPrint "[3/5] Copiando modulos do aplicativo (JS, CSS, Assets, Bridge)..."
    CreateDirectory "$INSTDIR\assets"
    SetOutPath "$INSTDIR\assets"
    File /r "../assets\*.*"

    CreateDirectory "$INSTDIR\js"
    SetOutPath "$INSTDIR\js"
    File /r "../js\*.*"

    CreateDirectory "$INSTDIR\css"
    SetOutPath "$INSTDIR\css"
    File /r "../css\*.*"

    CreateDirectory "$INSTDIR\bridge"
    SetOutPath "$INSTDIR\bridge"
    File /r "../bridge\*.*"

    CreateDirectory "$INSTDIR\installer"
    SetOutPath "$INSTDIR\installer"
    File /r "../installer\*.*"

    SetOutPath "$INSTDIR"

    ; Salvar arquivo de versão
    FileOpen $4 "$INSTDIR\.version" w
    FileWrite $4 "${PRODUCT_VERSION}"
    FileClose $4

    ; 5. Criar Desinstalador
    DetailPrint "[4/5] Registrando desinstalador..."
    WriteUninstaller "$INSTDIR\Uninstall.exe"

    ; 6. Criar Atalhos (Área de Trabalho e Menu Iniciar)
    DetailPrint "[5/5] Criando atalhos na Area de Trabalho e Menu Iniciar..."
    CreateDirectory "$SMPROGRAMS\${PRODUCT_NAME}"
    CreateShortcut "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME}.lnk" "$INSTDIR\${MAIN_EXE}" "" "$INSTDIR\assets\traces.ico" 0
    CreateShortcut "$SMPROGRAMS\${PRODUCT_NAME}\Atualizar ${PRODUCT_NAME}.lnk" "$INSTDIR\update.bat" "" "$INSTDIR\assets\traces.ico" 0
    CreateShortcut "$SMPROGRAMS\${PRODUCT_NAME}\Desinstalar.lnk" "$INSTDIR\Uninstall.exe" "" "$INSTDIR\Uninstall.exe" 0
    CreateShortcut "$DESKTOP\${PRODUCT_NAME}.lnk" "$INSTDIR\${MAIN_EXE}" "" "$INSTDIR\assets\traces.ico" 0

    ; 7. Registrar no Windows (Adicionar ou Remover Programas)
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
; Seção de Desinstalação
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

    ; Remover arquivos
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

    RMDir /r "$INSTDIR\assets"
    RMDir /r "$INSTDIR\js"
    RMDir /r "$INSTDIR\css"
    RMDir /r "$INSTDIR\bridge"
    RMDir /r "$INSTDIR\installer"
    RMDir "$INSTDIR"

    ; Remover registros
    DeleteRegKey HKCU "${PRODUCT_UNINST_KEY}"
    DeleteRegKey HKCU "${PRODUCT_DIR_REGKEY}"
SectionEnd
