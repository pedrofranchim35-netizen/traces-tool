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

// Verifica se o servidor local na porta 3033 está respondendo HTTP 200 em /api/ping
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

    DWORD timeout = 400;
    setsockopt(s, SOL_SOCKET, SO_RCVTIMEO, (const char*)&timeout, sizeof(timeout));
    setsockopt(s, SOL_SOCKET, SO_SNDTIMEO, (const char*)&timeout, sizeof(timeout));

    struct sockaddr_in addr;
    memset(&addr, 0, sizeof(addr));
    addr.sin_family = AF_INET;
    addr.sin_port = htons(PORT);
    addr.sin_addr.s_addr = inet_addr("127.0.0.1");

    BOOL healthy = FALSE;
    if (connect(s, (struct sockaddr*)&addr, sizeof(addr)) == 0) {
        const char *req = "GET /api/ping HTTP/1.0\r\nHost: 127.0.0.1:3033\r\nConnection: close\r\n\r\n";
        if (send(s, req, (int)strlen(req), 0) > 0) {
            char buf[512];
            int n = recv(s, buf, sizeof(buf) - 1, 0);
            if (n > 0) {
                buf[n] = '\0';
                if (strstr(buf, "200") != NULL && strstr(buf, "online") != NULL) {
                    healthy = TRUE;
                }
            }
        }
    }

    closesocket(s);
    WSACleanup();
    return healthy;
}

static BOOL FindPython(char *outPath, size_t outSize, const char *appDir) {
    char test[MAX_PATH];

    snprintf(test, sizeof(test), "%s\\python\\python.exe", appDir);
    if (GetFileAttributesA(test) != INVALID_FILE_ATTRIBUTES) {
        strncpy(outPath, test, outSize);
        return TRUE;
    }

    snprintf(test, sizeof(test), "%s\\python.exe", appDir);
    if (GetFileAttributesA(test) != INVALID_FILE_ATTRIBUTES) {
        strncpy(outPath, test, outSize);
        return TRUE;
    }

    char localAppData[MAX_PATH];
    if (SUCCEEDED(SHGetFolderPathA(NULL, CSIDL_LOCAL_APPDATA, NULL, 0, localAppData))) {
        const char *pyVersions[] = {
            "\\Programs\\Python\\Python311\\python.exe",
            "\\Programs\\Python\\Python312\\python.exe",
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

    const char *progPaths[] = {
        "C:\\Program Files\\Python311\\python.exe",
        "C:\\Program Files\\Python312\\python.exe",
        "C:\\Program Files\\Python310\\python.exe",
        "C:\\Program Files\\Python313\\python.exe",
        "C:\\Python311\\python.exe",
        "C:\\Python312\\python.exe",
        "C:\\Python310\\python.exe",
        NULL
    };
    for (int i = 0; progPaths[i]; i++) {
        if (GetFileAttributesA(progPaths[i]) != INVALID_FILE_ATTRIBUTES) {
            strncpy(outPath, progPaths[i], outSize);
            return TRUE;
        }
    }

    char foundInPath[MAX_PATH];
    if (SearchPathA(NULL, "python.exe", NULL, MAX_PATH, foundInPath, NULL) > 0) {
        if (strstr(foundInPath, "WindowsApps") == NULL) {
            strncpy(outPath, foundInPath, outSize);
            return TRUE;
        }
    }

    return FALSE;
}

static void StartBackgroundServer(const char *appDir) {
    char pyExe[MAX_PATH];
    char cmdLine[MAX_PATH * 3];
    STARTUPINFOA si;
    PROCESS_INFORMATION pi;

    SECURITY_ATTRIBUTES sa;
    sa.nLength = sizeof(sa);
    sa.lpSecurityDescriptor = NULL;
    sa.bInheritHandles = TRUE;

    char logPath[MAX_PATH];
    GetTempPathA(MAX_PATH, logPath);
    strncat(logPath, "traces_toad_server.log", MAX_PATH - strlen(logPath) - 1);
    HANDLE hLog = CreateFileA(logPath, GENERIC_WRITE, FILE_SHARE_READ | FILE_SHARE_WRITE, &sa, CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, NULL);

    memset(&si, 0, sizeof(si));
    si.cb = sizeof(si);
    si.dwFlags = STARTF_USESHOWWINDOW | STARTF_USESTDHANDLES;
    si.wShowWindow = SW_HIDE;
    si.hStdOutput = hLog;
    si.hStdError = hLog;
    si.hStdInput = NULL;
    memset(&pi, 0, sizeof(pi));

    if (FindPython(pyExe, sizeof(pyExe), appDir)) {
        char scriptPath[MAX_PATH];
        snprintf(scriptPath, sizeof(scriptPath), "%s\\bridge\\oracle_server.py", appDir);
        snprintf(cmdLine, sizeof(cmdLine), "\"%s\" \"%s\"", pyExe, scriptPath);
    } else {
        snprintf(cmdLine, sizeof(cmdLine),
                 "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"%s\\installer\\TracesLauncher.ps1\"",
                 appDir);
    }

    CreateProcessA(NULL, cmdLine, NULL, NULL, TRUE, CREATE_NO_WINDOW, NULL, appDir, &si, &pi);

    if (pi.hProcess) CloseHandle(pi.hProcess);
    if (pi.hThread) CloseHandle(pi.hThread);
    if (hLog && hLog != INVALID_HANDLE_VALUE) CloseHandle(hLog);
}

static void LaunchAppWindow(void) {
    const char *browsers[] = {
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
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

    ShellExecuteA(NULL, "open", APP_URL, NULL, NULL, SW_SHOWNORMAL);
}

int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow) {
    char exePath[MAX_PATH];
    GetModuleFileNameA(NULL, exePath, MAX_PATH);
    char *lastSlash = strrchr(exePath, '\\');
    if (lastSlash) *lastSlash = '\0';
    char appDir[MAX_PATH];
    strncpy(appDir, exePath, MAX_PATH);

    char testIndex[MAX_PATH];
    snprintf(testIndex, sizeof(testIndex), "%s\\index.html", appDir);
    if (GetFileAttributesA(testIndex) == INVALID_FILE_ATTRIBUTES) {
        char *parentSlash = strrchr(appDir, '\\');
        if (parentSlash) {
            *parentSlash = '\0';
            snprintf(testIndex, sizeof(testIndex), "%s\\index.html", appDir);
            if (GetFileAttributesA(testIndex) == INVALID_FILE_ATTRIBUTES) {
                strncpy(appDir, exePath, MAX_PATH);
            }
        }
    }

    if (strstr(lpCmdLine, "--update") != NULL) {
        char updateScript[MAX_PATH];
        snprintf(updateScript, sizeof(updateScript), "%s\\update.bat", appDir);
        if (GetFileAttributesA(updateScript) != INVALID_FILE_ATTRIBUTES) {
            ShellExecuteA(NULL, "open", updateScript, NULL, appDir, SW_SHOWNORMAL);
            return 0;
        }
    }

    if (!IsServerRunning()) {
        StartBackgroundServer(appDir);
        for (int i = 0; i < 60; i++) {
            Sleep(100);
            if (IsServerRunning()) {
                break;
            }
        }
    }

    LaunchAppWindow();
    return 0;
}
