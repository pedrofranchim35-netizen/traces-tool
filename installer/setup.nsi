; ==============================================================================
; TRACES TOAD FOR ORACLE - INSTALADOR & ATUALIZADOR NATIVO (.EXE)
; Dual-mode: Instalação Limpa e Atualização Automática de Versão Existente
; Aplicativo 100% Nativo Standalone para Windows (Zero dependência de navegador)
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
!define MUI_WELCOMEPAGE_TEXT "Este assistente instalará ou atualizará o aplicativo nativo ${PRODUCT_NAME} para a versão ${PRODUCT_VERSION}.$\r$\n$\r$\nO aplicativo é 100% nativo para Windows, não depende de navegadores web nem de portas locais, e mantém todas as suas configurações, históricos e conexões intactos.$\r$\n$\r$\nClique em Avançar para continuar."

; Páginas do Instalador
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES

; Página de Conclusão com opção de iniciar aplicativo nativo
!define MUI_FINISHPAGE_RUN "$INSTDIR\${MAIN_EXE}"
!define MUI_FINISHPAGE_RUN_TEXT "Iniciar o ${PRODUCT_NAME} agora"
!define MUI_FINISHPAGE_TITLE "Instalação / Atualização Concluída!"
!define MUI_FINISHPAGE_TEXT "O ${PRODUCT_NAME} foi instalado com sucesso como aplicativo nativo para Windows e está pronto para uso imediato."
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
    ${AndIf} ${FileExists} "$0\${MAIN_EXE}"
        StrCpy $INSTDIR $0
        StrCpy $IS_UPDATE "1"
    ${ElseIf} ${FileExists} "$LOCALAPPDATA\TracesToad\${MAIN_EXE}"
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
        DetailPrint "Atualizando aplicativo nativo em: $INSTDIR"
    ${Else}
        DetailPrint "Instalando aplicativo nativo em: $INSTDIR"
    ${EndIf}
    DetailPrint "--------------------------------------------------"

    ; 1. Encerrar processos em execução para permitir sobrescrever executáveis
    DetailPrint "[1/4] Verificando e encerrando instancias anteriores..."
    nsExec::Exec 'taskkill /F /IM TracesToad.exe /IM Toad.exe /T'
    nsExec::Exec 'powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3033 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $$_.OwningProcess -Force -ErrorAction SilentlyContinue }"'
    Sleep 600

    ; 2. Criar diretório
    CreateDirectory "$INSTDIR"
    SetOutPath "$INSTDIR"

    ; 3. Extrair Aplicativo Nativo Completo (Zero dependência de navegador)
    DetailPrint "[2/4] Instalando arquivos do aplicativo nativo (TracesToad.exe)..."
    File /r "..\dist-win\TracesToad-win32-x64\*.*"

    ; Copiar ícone e scripts de suporte
    CreateDirectory "$INSTDIR\assets"
    SetOutPath "$INSTDIR\assets"
    File "..\assets\traces.ico"
    File "..\assets\traces-logo.png"

    SetOutPath "$INSTDIR"

    ; Salvar arquivo de versão
    FileOpen $4 "$INSTDIR\.version" w
    FileWrite $4 "${PRODUCT_VERSION}"
    FileClose $4

    ; 4. Criar Desinstalador
    DetailPrint "[3/4] Registrando desinstalador..."
    WriteUninstaller "$INSTDIR\Uninstall.exe"

    ; 5. Criar Atalhos (Área de Trabalho e Menu Iniciar)
    DetailPrint "[4/4] Criando atalhos na Area de Trabalho e Menu Iniciar..."
    CreateDirectory "$SMPROGRAMS\${PRODUCT_NAME}"
    CreateShortcut "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME}.lnk" "$INSTDIR\${MAIN_EXE}" "" "$INSTDIR\${MAIN_EXE}" 0
    CreateShortcut "$SMPROGRAMS\${PRODUCT_NAME}\Desinstalar.lnk" "$INSTDIR\Uninstall.exe" "" "$INSTDIR\Uninstall.exe" 0
    CreateShortcut "$DESKTOP\${PRODUCT_NAME}.lnk" "$INSTDIR\${MAIN_EXE}" "" "$INSTDIR\${MAIN_EXE}" 0

    ; 6. Registrar no Windows (Painel de Controle / Adicionar ou Remover Programas)
    WriteRegStr HKCU "${PRODUCT_DIR_REGKEY}" "InstallDir" "$INSTDIR"
    WriteRegStr HKCU "${PRODUCT_DIR_REGKEY}" "Version" "${PRODUCT_VERSION}"
    WriteRegStr HKCU "${PRODUCT_UNINST_KEY}" "DisplayName" "${PRODUCT_NAME}"
    WriteRegStr HKCU "${PRODUCT_UNINST_KEY}" "DisplayVersion" "${PRODUCT_VERSION}"
    WriteRegStr HKCU "${PRODUCT_UNINST_KEY}" "Publisher" "${PRODUCT_PUBLISHER}"
    WriteRegStr HKCU "${PRODUCT_UNINST_KEY}" "DisplayIcon" "$INSTDIR\${MAIN_EXE}"
    WriteRegStr HKCU "${PRODUCT_UNINST_KEY}" "UninstallString" "$INSTDIR\Uninstall.exe"
    WriteRegStr HKCU "${PRODUCT_UNINST_KEY}" "InstallLocation" "$INSTDIR"
    WriteRegStr HKCU "${PRODUCT_UNINST_KEY}" "URLInfoAbout" "${PRODUCT_WEB_SITE}"
    WriteRegDWORD HKCU "${PRODUCT_UNINST_KEY}" "NoModify" 1
    WriteRegDWORD HKCU "${PRODUCT_UNINST_KEY}" "NoRepair" 1

    DetailPrint "Instalacao/Atualizacao do aplicativo nativo concluida com sucesso!"
SectionEnd

; ------------------------------------------------------------------------------
; Seção de Desinstalação
; ------------------------------------------------------------------------------
Section "Uninstall"
    SetShellVarContext current

    ; Encerrar processos antes de remover
    nsExec::Exec 'taskkill /F /IM TracesToad.exe /IM Toad.exe /T'

    ; Remover atalhos
    Delete "$DESKTOP\${PRODUCT_NAME}.lnk"
    Delete "$SMPROGRAMS\${PRODUCT_NAME}\*.*"
    RMDir "$SMPROGRAMS\${PRODUCT_NAME}"

    ; Remover arquivos da instalação
    Delete "$INSTDIR\TracesToad.exe"
    Delete "$INSTDIR\Uninstall.exe"
    Delete "$INSTDIR\.version"
    Delete "$INSTDIR\LICENSE"
    Delete "$INSTDIR\LICENSES.chromium.html"
    Delete "$INSTDIR\version"
    Delete "$INSTDIR\vk_swiftshader_icd.json"

    RMDir /r "$INSTDIR\locales"
    RMDir /r "$INSTDIR\resources"
    RMDir /r "$INSTDIR\assets"
    RMDir "$INSTDIR"

    ; Remover registros
    DeleteRegKey HKCU "${PRODUCT_UNINST_KEY}"
    DeleteRegKey HKCU "${PRODUCT_DIR_REGKEY}"
SectionEnd
