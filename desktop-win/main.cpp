#ifndef UNICODE
#define UNICODE
#endif
#ifndef _UNICODE
#define _UNICODE
#endif
#define WIN32_LEAN_AND_MEAN

#include <winsock2.h>
#include <ws2tcpip.h>
#include <windows.h>
#include <shellapi.h>
#include <shlobj.h>

#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <string>
#include <vector>

#include "assets_data.h"

static CRITICAL_SECTION g_storageLock;
static volatile LONGLONG g_lastHeartbeatMs = 0;
static volatile LONG g_hasReceivedHeartbeat = 0;

static bool SendAll(SOCKET s, const char* buf, size_t len) {
  size_t total = 0;
  while (total < len) {
    int chunk = (len - total > 65536) ? 65536 : static_cast<int>(len - total);
    int sent = send(s, buf + total, chunk, 0);
    if (sent <= 0) return false;
    total += static_cast<size_t>(sent);
  }
  return true;
}

static void SendHttpResponse(
    SOCKET s,
    const char* status,
    const char* contentType,
    const void* body,
    size_t bodyLen) {
  char header[512];
  int hlen = std::snprintf(
      header,
      sizeof(header),
      "HTTP/1.1 %s\r\n"
      "Content-Type: %s\r\n"
      "Content-Length: %zu\r\n"
      "Cache-Control: no-cache\r\n"
      "Connection: close\r\n"
      "\r\n",
      status,
      contentType,
      bodyLen);
  if (hlen > 0) {
    SendAll(s, header, static_cast<size_t>(hlen));
  }
  if (body && bodyLen > 0) {
    SendAll(s, static_cast<const char*>(body), bodyLen);
  }
}

static std::wstring GetAppDataDir(int csidl) {
  wchar_t base[MAX_PATH] = {0};
  if (FAILED(SHGetFolderPathW(NULL, csidl, NULL, 0, base))) {
    return L"";
  }
  std::wstring dir = std::wstring(base) + L"\\blue.ai";
  CreateDirectoryW(dir.c_str(), NULL);
  return dir;
}

static std::wstring GetStoragePath() {
  std::wstring dir = GetAppDataDir(CSIDL_APPDATA);
  if (dir.empty()) return L"blue-ai-data.json";
  return dir + L"\\blue-ai-data.json";
}

static std::string ReadStorageFile() {
  EnterCriticalSection(&g_storageLock);
  std::wstring path = GetStoragePath();
  HANDLE hFile = CreateFileW(
      path.c_str(),
      GENERIC_READ,
      FILE_SHARE_READ,
      NULL,
      OPEN_EXISTING,
      FILE_ATTRIBUTE_NORMAL,
      NULL);
  if (hFile == INVALID_HANDLE_VALUE) {
    LeaveCriticalSection(&g_storageLock);
    return "null";
  }
  LARGE_INTEGER sz;
  if (!GetFileSizeEx(hFile, &sz) || sz.QuadPart <= 0 || sz.QuadPart > 32 * 1024 * 1024) {
    CloseHandle(hFile);
    LeaveCriticalSection(&g_storageLock);
    return "null";
  }
  std::string out(static_cast<size_t>(sz.QuadPart), '\0');
  DWORD bytesRead = 0;
  BOOL ok = ReadFile(hFile, &out[0], static_cast<DWORD>(sz.QuadPart), &bytesRead, NULL);
  CloseHandle(hFile);
  LeaveCriticalSection(&g_storageLock);
  if (!ok || bytesRead == 0) return "null";
  out.resize(bytesRead);
  return out;
}

static bool WriteStorageFile(const std::string& content) {
  EnterCriticalSection(&g_storageLock);
  std::wstring finalPath = GetStoragePath();
  std::wstring tmpPath = finalPath + L".tmp";
  HANDLE hFile = CreateFileW(
      tmpPath.c_str(),
      GENERIC_WRITE,
      0,
      NULL,
      CREATE_ALWAYS,
      FILE_ATTRIBUTE_NORMAL,
      NULL);
  if (hFile == INVALID_HANDLE_VALUE) {
    LeaveCriticalSection(&g_storageLock);
    return false;
  }
  DWORD written = 0;
  BOOL ok = WriteFile(
      hFile,
      content.data(),
      static_cast<DWORD>(content.size()),
      &written,
      NULL);
  FlushFileBuffers(hFile);
  CloseHandle(hFile);
  if (ok && written == content.size()) {
    MoveFileExW(tmpPath.c_str(), finalPath.c_str(), MOVEFILE_REPLACE_EXISTING);
  } else {
    DeleteFileW(tmpPath.c_str());
  }
  LeaveCriticalSection(&g_storageLock);
  return ok != FALSE;
}

static void OpenExternalSafe(const std::string& utf8Url) {
  if (utf8Url.rfind("https://", 0) != 0 && utf8Url.rfind("http://", 0) != 0) {
    return;
  }
  int wlen = MultiByteToWideChar(CP_UTF8, 0, utf8Url.c_str(), -1, NULL, 0);
  if (wlen <= 0) return;
  std::wstring wurl(static_cast<size_t>(wlen), L'\0');
  MultiByteToWideChar(CP_UTF8, 0, utf8Url.c_str(), -1, &wurl[0], wlen);
  ShellExecuteW(NULL, L"open", wurl.c_str(), NULL, NULL, SW_SHOWNORMAL);
}

static DWORD WINAPI ClientThreadProc(LPVOID param) {
  SOCKET client = reinterpret_cast<SOCKET>(reinterpret_cast<ULONG_PTR>(param));
  DWORD timeoutMs = 10000;
  setsockopt(client, SOL_SOCKET, SO_RCVTIMEO, reinterpret_cast<const char*>(&timeoutMs), sizeof(timeoutMs));
  setsockopt(client, SOL_SOCKET, SO_SNDTIMEO, reinterpret_cast<const char*>(&timeoutMs), sizeof(timeoutMs));
  BOOL nodelay = TRUE;
  setsockopt(client, IPPROTO_TCP, TCP_NODELAY, reinterpret_cast<const char*>(&nodelay), sizeof(nodelay));

  std::string raw;
  raw.reserve(8192);
  char buf[4096];
  size_t headerEnd = std::string::npos;

  while (raw.size() < 65536) {
    int n = recv(client, buf, sizeof(buf), 0);
    if (n <= 0) break;
    raw.append(buf, static_cast<size_t>(n));
    headerEnd = raw.find("\r\n\r\n");
    if (headerEnd != std::string::npos) break;
  }

  if (headerEnd == std::string::npos) {
    closesocket(client);
    return 0;
  }

  std::string headerPart = raw.substr(0, headerEnd);
  size_t lineEnd = headerPart.find("\r\n");
  std::string reqLine = (lineEnd == std::string::npos) ? headerPart : headerPart.substr(0, lineEnd);

  std::string method, fullPath;
  {
    size_t sp1 = reqLine.find(' ');
    if (sp1 != std::string::npos) {
      method = reqLine.substr(0, sp1);
      size_t sp2 = reqLine.find(' ', sp1 + 1);
      fullPath = (sp2 == std::string::npos)
                     ? reqLine.substr(sp1 + 1)
                     : reqLine.substr(sp1 + 1, sp2 - sp1 - 1);
    }
  }

  size_t qpos = fullPath.find('?');
  std::string path = (qpos == std::string::npos) ? fullPath : fullPath.substr(0, qpos);

  // Parse Content-Length if POST
  size_t contentLength = 0;
  {
    std::string lowerHeaders = headerPart;
    for (char& c : lowerHeaders) {
      if (c >= 'A' && c <= 'Z') c = static_cast<char>(c - 'A' + 'a');
    }
    size_t clPos = lowerHeaders.find("\r\ncontent-length:");
    if (clPos != std::string::npos) {
      size_t valStart = clPos + 17;
      while (valStart < lowerHeaders.size() && lowerHeaders[valStart] == ' ') valStart++;
      contentLength = static_cast<size_t>(std::strtoull(lowerHeaders.c_str() + valStart, NULL, 10));
      if (contentLength > 16 * 1024 * 1024) contentLength = 16 * 1024 * 1024;
    }
  }

  std::string body = raw.substr(headerEnd + 4);
  while (body.size() < contentLength) {
    int n = recv(client, buf, sizeof(buf), 0);
    if (n <= 0) break;
    body.append(buf, static_cast<size_t>(n));
  }
  if (body.size() > contentLength && contentLength > 0) {
    body.resize(contentLength);
  }

  InterlockedExchange64(&g_lastHeartbeatMs, static_cast<LONGLONG>(GetTickCount64()));

  if (path == "/__desktop/ping") {
    const char* resp = "{\"ok\":true,\"app\":\"blue.ai-desktop\",\"platform\":\"win32\"}";
    SendHttpResponse(client, "200 OK", "application/json; charset=utf-8", resp, std::strlen(resp));
  } else if (path == "/__desktop/heartbeat") {
    InterlockedExchange(&g_hasReceivedHeartbeat, 1);
    InterlockedExchange64(&g_lastHeartbeatMs, static_cast<LONGLONG>(GetTickCount64()));
    const char* resp = "{\"ok\":true}";
    SendHttpResponse(client, "200 OK", "application/json; charset=utf-8", resp, std::strlen(resp));
  } else if (path == "/__desktop/storage") {
    if (method == "POST") {
      WriteStorageFile(body);
      const char* resp = "{\"ok\":true}";
      SendHttpResponse(client, "200 OK", "application/json; charset=utf-8", resp, std::strlen(resp));
    } else {
      std::string data = ReadStorageFile();
      SendHttpResponse(client, "200 OK", "application/json; charset=utf-8", data.data(), data.size());
    }
  } else if (path == "/__desktop/open-external" && method == "POST") {
    OpenExternalSafe(body);
    const char* resp = "{\"ok\":true}";
    SendHttpResponse(client, "200 OK", "application/json; charset=utf-8", resp, std::strlen(resp));
  } else {
    if (path.empty() || path == "/") path = "/index.html";

    const EmbeddedAsset* matched = nullptr;
    for (size_t i = 0; i < EMBEDDED_ASSETS_COUNT; ++i) {
      if (path == EMBEDDED_ASSETS[i].path) {
        matched = &EMBEDDED_ASSETS[i];
        break;
      }
    }

    // SPA fallback to index.html if extensionless route
    if (!matched && path.find('.') == std::string::npos) {
      for (size_t i = 0; i < EMBEDDED_ASSETS_COUNT; ++i) {
        if (std::strcmp(EMBEDDED_ASSETS[i].path, "/index.html") == 0) {
          matched = &EMBEDDED_ASSETS[i];
          break;
        }
      }
    }

    if (matched) {
      SendHttpResponse(client, "200 OK", matched->mime, matched->data, matched->size);
    } else {
      const char* nf = "Not Found";
      SendHttpResponse(client, "404 Not Found", "text/plain; charset=utf-8", nf, std::strlen(nf));
    }
  }

  shutdown(client, SD_SEND);
  closesocket(client);
  return 0;
}

static bool IsExistingBlueAiRunning(int port) {
  SOCKET s = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
  if (s == INVALID_SOCKET) return false;

  DWORD timeoutMs = 250;
  setsockopt(s, SOL_SOCKET, SO_RCVTIMEO, reinterpret_cast<const char*>(&timeoutMs), sizeof(timeoutMs));
  setsockopt(s, SOL_SOCKET, SO_SNDTIMEO, reinterpret_cast<const char*>(&timeoutMs), sizeof(timeoutMs));

  sockaddr_in addr = {};
  addr.sin_family = AF_INET;
  addr.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
  addr.sin_port = htons(static_cast<u_short>(port));

  if (connect(s, reinterpret_cast<sockaddr*>(&addr), sizeof(addr)) != 0) {
    closesocket(s);
    return false;
  }

  const char* req = "GET /__desktop/ping HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n";
  send(s, req, static_cast<int>(std::strlen(req)), 0);
  char resp[512] = {0};
  int n = recv(s, resp, sizeof(resp) - 1, 0);
  closesocket(s);
  if (n <= 0) return false;
  return std::strstr(resp, "blue.ai-desktop") != nullptr;
}

static bool FileExistsW(const std::wstring& path) {
  if (path.empty()) return false;
  DWORD attr = GetFileAttributesW(path.c_str());
  return (attr != INVALID_FILE_ATTRIBUTES) && !(attr & FILE_ATTRIBUTE_DIRECTORY);
}

static std::wstring QueryAppPathRegistry(HKEY root, const wchar_t* exeName) {
  std::wstring subkey = std::wstring(L"SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\") + exeName;
  wchar_t val[MAX_PATH] = {0};
  DWORD sz = sizeof(val);
  if (RegGetValueW(root, subkey.c_str(), NULL, RRF_RT_REG_SZ, NULL, val, &sz) == ERROR_SUCCESS) {
    if (FileExistsW(val)) return val;
  }
  return L"";
}

static std::wstring FindChromiumAppHost() {
  const wchar_t* browserExes[] = {L"msedge.exe", L"chrome.exe", L"brave.exe"};
  for (const wchar_t* exe : browserExes) {
    std::wstring p = QueryAppPathRegistry(HKEY_LOCAL_MACHINE, exe);
    if (!p.empty()) return p;
    p = QueryAppPathRegistry(HKEY_CURRENT_USER, exe);
    if (!p.empty()) return p;
  }

  const wchar_t* envVars[] = {L"ProgramFiles(x86)", L"ProgramFiles", L"LOCALAPPDATA"};
  const wchar_t* relPaths[] = {
      L"\\Microsoft\\Edge\\Application\\msedge.exe",
      L"\\Google\\Chrome\\Application\\chrome.exe",
      L"\\BraveSoftware\\Brave-Browser\\Application\\brave.exe"};

  for (const wchar_t* rel : relPaths) {
    for (const wchar_t* ev : envVars) {
      wchar_t base[MAX_PATH] = {0};
      DWORD len = GetEnvironmentVariableW(ev, base, MAX_PATH);
      if (len > 0 && len < MAX_PATH) {
        std::wstring candidate = std::wstring(base) + rel;
        if (FileExistsW(candidate)) return candidate;
      }
    }
  }
  return L"";
}

static HANDLE LaunchDesktopWindow(int port) {
  wchar_t url[128];
  std::swprintf(url, 128, L"http://127.0.0.1:%d", port);

  std::wstring hostExe = FindChromiumAppHost();
  if (!hostExe.empty()) {
    std::wstring localDir = GetAppDataDir(CSIDL_LOCAL_APPDATA);
    std::wstring profileDir = localDir + L"\\WindowProfile";
    CreateDirectoryW(profileDir.c_str(), NULL);

    std::wstring cmd = L"\"" + hostExe + L"\" --app=\"" + url +
                       L"\" --user-data-dir=\"" + profileDir +
                       L"\" --window-size=1320,860 --no-first-run --no-default-browser-check "
                       L"--disable-features=msEdgeSidebarV2,msHubApps,Translate";

    STARTUPINFOW si = {};
    si.cb = sizeof(si);
    PROCESS_INFORMATION pi = {};

    std::vector<wchar_t> cmdBuf(cmd.begin(), cmd.end());
    cmdBuf.push_back(L'\0');

    if (CreateProcessW(
            hostExe.c_str(),
            cmdBuf.data(),
            NULL,
            NULL,
            FALSE,
            0,
            NULL,
            NULL,
            &si,
            &pi)) {
      CloseHandle(pi.hThread);
      return pi.hProcess;
    }
  }

  ShellExecuteW(NULL, L"open", url, NULL, NULL, SW_SHOWNORMAL);
  return NULL;
}

struct ServerThreadArgs {
  SOCKET listenSock;
};

static DWORD WINAPI AcceptLoopProc(LPVOID param) {
  SOCKET listenSock = reinterpret_cast<ServerThreadArgs*>(param)->listenSock;
  while (true) {
    SOCKET client = accept(listenSock, NULL, NULL);
    if (client == INVALID_SOCKET) break;
    HANDLE hThread = CreateThread(
        NULL,
        0,
        ClientThreadProc,
        reinterpret_cast<LPVOID>(static_cast<ULONG_PTR>(client)),
        0,
        NULL);
    if (hThread) {
      CloseHandle(hThread);
    } else {
      closesocket(client);
    }
  }
  return 0;
}

int WINAPI WinMain(HINSTANCE, HINSTANCE, LPSTR, int) {
  WSADATA wsa;
  if (WSAStartup(MAKEWORD(2, 2), &wsa) != 0) {
    return 1;
  }

  InitializeCriticalSection(&g_storageLock);

  SOCKET listenSock = INVALID_SOCKET;
  int boundPort = 0;

  for (int port = 45731; port <= 45745; ++port) {
    SOCKET s = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    if (s == INVALID_SOCKET) continue;

    sockaddr_in addr = {};
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
    addr.sin_port = htons(static_cast<u_short>(port));

    if (bind(s, reinterpret_cast<sockaddr*>(&addr), sizeof(addr)) == 0 &&
        listen(s, SOMAXCONN) == 0) {
      listenSock = s;
      boundPort = port;
      break;
    }
    closesocket(s);
  }

  if (listenSock == INVALID_SOCKET) {
    MessageBoxW(
        NULL,
        L"Could not start local blue.ai studio engine.",
        L"blue.ai",
        MB_ICONERROR | MB_OK);
    DeleteCriticalSection(&g_storageLock);
    WSACleanup();
    return 1;
  }

  LONGLONG launchTick = static_cast<LONGLONG>(GetTickCount64());
  InterlockedExchange64(&g_lastHeartbeatMs, launchTick);

  ServerThreadArgs args = {listenSock};
  HANDLE hAcceptThread = CreateThread(NULL, 0, AcceptLoopProc, &args, 0, NULL);

  HANDLE hBrowserProc = LaunchDesktopWindow(boundPort);
  bool childOwnedWindow = false;

  if (hBrowserProc) {
    // Check if process stays alive beyond 4 seconds (meaning it owns the dedicated app profile)
    DWORD earlyWait = WaitForSingleObject(hBrowserProc, 4000);
    if (earlyWait == WAIT_TIMEOUT) {
      childOwnedWindow = true;
    } else {
      CloseHandle(hBrowserProc);
      hBrowserProc = NULL;
    }
  }

  while (true) {
    Sleep(1500);
    LONGLONG now = static_cast<LONGLONG>(GetTickCount64());
    LONGLONG lastBeat = InterlockedCompareExchange64(&g_lastHeartbeatMs, 0, 0);
    LONG gotBeat = InterlockedCompareExchange(&g_hasReceivedHeartbeat, 0, 0);

    if (childOwnedWindow && hBrowserProc) {
      DWORD st = WaitForSingleObject(hBrowserProc, 0);
      if (st == WAIT_OBJECT_0) {
        // Window process closed; wait briefly to ensure it wasn't a reload
        if (now - lastBeat > 5000) {
          break;
        }
      }
    } else {
      // Heartbeat mode (browser delegated to existing broker or default browser)
      LONGLONG timeoutWindow = (gotBeat != 0) ? 12000 : 45000;
      if (now - lastBeat > timeoutWindow) {
        break;
      }
    }
  }

  if (hBrowserProc) {
    CloseHandle(hBrowserProc);
  }
  closesocket(listenSock);
  if (hAcceptThread) {
    WaitForSingleObject(hAcceptThread, 1500);
    CloseHandle(hAcceptThread);
  }
  DeleteCriticalSection(&g_storageLock);
  WSACleanup();
  return 0;
}
