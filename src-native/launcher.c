#include <winsock2.h>
#include <windows.h>
#include <ws2tcpip.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <shlobj.h>

#pragma comment(lib, "ws2_32.lib")
#pragma comment(lib, "shell32.lib")

#define PORT 3033
#define APP_URL "http://localhost:3033/index.html"

// Verifica se o servidor local na porta 3033 já está respondendo
static BOOL IsServerRunning(void) {
    WSADATA wsaData;
    if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0) {
        return FALSE;
    }

    SOCKET s = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    if (s == INVALID_SOCKET) {
        WSACleanup();
        return FALSE;
    }

    // Timeout de 300ms
    DWORD timeout = 300;
    setsockopt(s, SOL_SOCKET, SO_RCVTIMEO, (const char*)&timeout, sizeof(timeout));
    setsockopt(s, SOL_SOCKET, SO_SNDTIMEO, (const char*)&timeout, sizeof(timeout));

    struct sockaddr_in addr;
    memset(&addr, 0, sizeof(addr));
    addr.sin_family = AF_INET;
    addr.sin_port = htons(PORT);
    addr.sin_addr.s_addr = inet_addr("127.0.0.1");

    int res = connect(s, (struct sockaddr*)&addr, sizeof(addr));
    closesocket(s);
    WSACleanup();

    return (res == 0);
}

// Localiza o executável do Python ou retorna NULL
static BOOL FindPython(char *outPath, size_t outSize, const char *appDir) {
    char test[MAX_PATH];
    
    // 1. Python na mesma pasta
    snprintf(test, sizeof(test), "%s\\python.exe", appDir);
    if (GetFileAttributesA(test) != INVALID_FILE_ATTRIBUTES) {
        strncpy(outPath, test, outSize);
        return TRUE;
    }

    // 2. Python em %LOCALAPPDATA%\Programs\Python\...
    char localAppData[MAX_PATH];
    if (SUCCEEDED(SHGetFolderPathA(NULL, CSIDL_LOCAL_APPDATA, NULL, 0, localAppData))) {
        const char *pyVersions[] = {
            "\\Programs\\Python\\Python312\\python.exe",
            "\\Programs\\Python\\Python311\\python.exe",
            "\\Programs\\Python\\Python310\\python.exe",
            "\\Programs\\Python\\Python313\\python.exe",
            "\\Programs\\Python\\Python39\\python.exe",
            NULL
        };
        for (int i = 0; pyVersions[i]; i++) {
            snprintf(test, sizeof(test), "%s%s", localAppData, pyVersions[i]);
            if (GetFileAttributesA(test) != INVALID_FILE_ATTRIBUTES) {
                strncpy(outPath, test, outSize);
                return TRUE;
            }
        }
    }

    // 3. Python em C:\Program Files\Python...
    const char *progPaths[] = {
        "C:\\Program Files\\Python312\\python.exe",
        "C:\\Program Files\\Python311\\python.exe",
        "C:\\Program Files\\Python310\\python.exe",
        "C:\\Program Files\\Python313\\python.exe",
        "C:\\Python312\\python.exe",
        "C:\\Python311\\python.exe",
        "C:\\Python310\\python.exe",
        NULL
    };
    for (int i = 0; progPaths[i]; i++) {
        if (GetFileAttributesA(progPaths[i]) != INVALID_FILE_ATTRIBUTES) {
            strncpy(outPath, progPaths[i], outSize);
            return TRUE;
        }
    }

    // 4. Testar python no PATH
    char foundInPath[MAX_PATH];
    if (SearchPathA(NULL, "python.exe", NULL, MAX_PATH, foundInPath, NULL) > 0) {
        strncpy(outPath, foundInPath, outSize);
        return TRUE;
    }

    return FALSE;
}

// Inicia o servidor Python em segundo plano silencioso
static void StartBackgroundServer(const char *appDir) {
    char pyExe[MAX_PATH];
    char cmdLine[MAX_PATH * 3];
    STARTUPINFOA si;
    PROCESS_INFORMATION pi;

    memset(&si, 0, sizeof(si));
    si.cb = sizeof(si);
    si.dwFlags = STARTF_USESHOWWINDOW;
    si.wShowWindow = SW_HIDE;
    memset(&pi, 0, sizeof(pi));

    if (FindPython(pyExe, sizeof(pyExe), appDir)) {
        char scriptPath[MAX_PATH];
        snprintf(scriptPath, sizeof(scriptPath), "%s\\bridge\\oracle_server.py", appDir);
        if (GetFileAttributesA(scriptPath) != INVALID_FILE_ATTRIBUTES) {
            snprintf(cmdLine, sizeof(cmdLine), "\"%s\" \"%s\"", pyExe, scriptPath);
        } else {
            snprintf(cmdLine, sizeof(cmdLine), "\"%s\" -m http.server %d", pyExe, PORT);
        }
    } else {
        // Fallback: usar PowerShell launcher
        snprintf(cmdLine, sizeof(cmdLine),
                 "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"%s\\installer\\TracesLauncher.ps1\"",
                 appDir);
    }

    CreateProcessA(NULL, cmdLine, NULL, NULL, FALSE, CREATE_NO_WINDOW | DETACHED_PROCESS, NULL, appDir, &si, &pi);

    if (pi.hProcess) CloseHandle(pi.hProcess);
    if (pi.hThread) CloseHandle(pi.hThread);
}

// Lança a janela em modo de aplicativo desktop nativo
static void LaunchAppWindow(void) {
    const char *browsers[] = {
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        NULL
    };

    char cmdLine[MAX_PATH * 2];
    for (int i = 0; browsers[i]; i++) {
        if (GetFileAttributesA(browsers[i]) != INVALID_FILE_ATTRIBUTES) {
            snprintf(cmdLine, sizeof(cmdLine), "\"%s\" --app=%s", browsers[i], APP_URL);
            STARTUPINFOA si;
            PROCESS_INFORMATION pi;
            memset(&si, 0, sizeof(si));
            si.cb = sizeof(si);
            memset(&pi, 0, sizeof(pi));
            if (CreateProcessA(NULL, cmdLine, NULL, NULL, FALSE, 0, NULL, NULL, &si, &pi)) {
                if (pi.hProcess) CloseHandle(pi.hProcess);
                if (pi.hThread) CloseHandle(pi.hThread);
                return;
            }
        }
    }

    // Fallback: navegador padrão
    ShellExecuteA(NULL, "open", APP_URL, NULL, NULL, SW_SHOWNORMAL);
}

int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow) {
    // 1. Obter diretório do aplicativo
    char exePath[MAX_PATH];
    GetModuleFileNameA(NULL, exePath, MAX_PATH);
    char *lastSlash = strrchr(exePath, '\\');
    if (lastSlash) *lastSlash = '\0';
    char appDir[MAX_PATH];
    strncpy(appDir, exePath, MAX_PATH);

    // Se estiver em uma subpasta (ex: installer\ ou bin\), subir um nível se index.html estiver lá
    char testIndex[MAX_PATH];
    snprintf(testIndex, sizeof(testIndex), "%s\\index.html", appDir);
    if (GetFileAttributesA(testIndex) == INVALID_FILE_ATTRIBUTES) {
        char *parentSlash = strrchr(appDir, '\\');
        if (parentSlash) {
            *parentSlash = '\0';
            snprintf(testIndex, sizeof(testIndex), "%s\\index.html", appDir);
            if (GetFileAttributesA(testIndex) == INVALID_FILE_ATTRIBUTES) {
                // Voltar
                strncpy(appDir, exePath, MAX_PATH);
            }
        }
    }

    // 2. Se o usuário passou parâmetro --update, rodar o atualizador
    if (strstr(lpCmdLine, "--update") != NULL) {
        char updateScript[MAX_PATH];
        snprintf(updateScript, sizeof(updateScript), "%s\\update.bat", appDir);
        if (GetFileAttributesA(updateScript) != INVALID_FILE_ATTRIBUTES) {
            ShellExecuteA(NULL, "open", updateScript, NULL, appDir, SW_SHOWNORMAL);
            return 0;
        }
    }

    // 3. Verificar se o servidor já está ativo; se não, iniciar
    if (!IsServerRunning()) {
        StartBackgroundServer(appDir);

        // Aguardar o servidor abrir a porta (até 2.5s)
        for (int i = 0; i < 25; i++) {
            Sleep(100);
            if (IsServerRunning()) {
                break;
            }
        }
    }

    // 4. Abrir janela do aplicativo
    LaunchAppWindow();

    return 0;
}
