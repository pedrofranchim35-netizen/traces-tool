using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Reflection;
using System.Threading;
using System.Windows.Forms;

namespace TracesToad
{
    static class Program
    {
        const int PORT = 3033;
        const string APP_URL = "http://localhost:3033/index.html";
        const string PING_URL = "http://127.0.0.1:3033/api/ping";

        static bool IsServerHealthy()
        {
            try
            {
                HttpWebRequest req = (HttpWebRequest)WebRequest.Create(PING_URL);
                req.Timeout = 450;
                req.ReadWriteTimeout = 450;
                req.Method = "GET";
                using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse())
                {
                    if (resp.StatusCode == HttpStatusCode.OK)
                    {
                        using (StreamReader sr = new StreamReader(resp.GetResponseStream()))
                        {
                            string body = sr.ReadToEnd();
                            return body != null && body.Contains("online");
                        }
                    }
                }
            }
            catch { }
            return false;
        }

        static void KillStuckPortProcess()
        {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo("cmd.exe", "/c for /f \"tokens=5\" %a in ('netstat -ano ^| findstr :3033 ^| findstr LISTENING') do taskkill /F /PID %a")
                {
                    CreateNoWindow = true,
                    UseShellExecute = false,
                    WindowStyle = ProcessWindowStyle.Hidden
                };
                using (Process p = Process.Start(psi))
                {
                    if (p != null) p.WaitForExit(1500);
                }
            }
            catch { }
        }

        static string GetAppDir()
        {
            string exeDir = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
            if (File.Exists(Path.Combine(exeDir, "index.html"))) return exeDir;
            DirectoryInfo parent = Directory.GetParent(exeDir);
            if (parent != null && File.Exists(Path.Combine(parent.FullName, "index.html"))) return parent.FullName;
            string localInstalled = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "TracesToad");
            if (File.Exists(Path.Combine(localInstalled, "index.html"))) return localInstalled;
            return exeDir;
        }

        static string FindPython(string appDir)
        {
            string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            string[] candidates = new string[]
            {
                Path.Combine(appDir, "python", "python.exe"),
                Path.Combine(appDir, "python.exe"),
                Path.Combine(localAppData, @"Programs\Python\Python311\python.exe"),
                Path.Combine(localAppData, @"Programs\Python\Python314\python.exe"),
                Path.Combine(localAppData, @"Programs\Python\Python313\python.exe"),
                Path.Combine(localAppData, @"Programs\Python\Python312\python.exe"),
                Path.Combine(localAppData, @"Programs\Python\Python311\python.exe"),
                Path.Combine(localAppData, @"Programs\Python\Python310\python.exe"),
                @"C:\Python314\python.exe",
                @"C:\Python313\python.exe",
                @"C:\Python312\python.exe",
                @"C:\Python311\python.exe",
                @"C:\Program Files\Python314\python.exe",
                @"C:\Program Files\Python313\python.exe",
                @"C:\Program Files\Python312\python.exe",
                @"C:\Program Files\Python311\python.exe"
            };
            foreach (string c in candidates)
            {
                if (File.Exists(c)) return c;
            }
            try
            {
                ProcessStartInfo wherePsi = new ProcessStartInfo("where.exe", "python.exe")
                {
                    CreateNoWindow = true,
                    UseShellExecute = false,
                    RedirectStandardOutput = true
                };
                using (Process wp = Process.Start(wherePsi))
                {
                    if (wp != null)
                    {
                        string firstLine = wp.StandardOutput.ReadLine();
                        wp.WaitForExit(1000);
                        if (!string.IsNullOrEmpty(firstLine) && File.Exists(firstLine.Trim())) return firstLine.Trim();
                    }
                }
            }
            catch { }
            return "python.exe";
        }

        static void StartBackendServer(string appDir)
        {
            KillStuckPortProcess();
            string pyExe = FindPython(appDir);
            string scriptPath = Path.Combine(appDir, "bridge", "oracle_server.py");
            if (pyExe != null && File.Exists(scriptPath))
            {
                string cmdArgs = string.Format("/c \"\"{0}\" \"{1}\" >\"{2}\" 2>&1\"",
                    pyExe, scriptPath, Path.Combine(Path.GetTempPath(), "traces_toad_server.log"));
                ProcessStartInfo psi = new ProcessStartInfo("cmd.exe", cmdArgs)
                {
                    WorkingDirectory = appDir,
                    CreateNoWindow = true,
                    UseShellExecute = false,
                    WindowStyle = ProcessWindowStyle.Hidden
                };
                Process.Start(psi);
            }
            else
            {
                string ps1 = Path.Combine(appDir, "installer", "TracesLauncher.ps1");
                if (File.Exists(ps1))
                {
                    ProcessStartInfo psi = new ProcessStartInfo("powershell.exe",
                        "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"" + ps1 + "\"")
                    {
                        WorkingDirectory = appDir,
                        CreateNoWindow = true,
                        UseShellExecute = false,
                        WindowStyle = ProcessWindowStyle.Hidden
                    };
                    Process.Start(psi);
                }
            }
        }

        static void OpenAppWindow()
        {
            string[] browsers = new string[]
            {
                @"C:\Program Files\Google\Chrome\Application\chrome.exe",
                @"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
                @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
                @"C:\Program Files\Microsoft\Edge\Application\msedge.exe"
            };
            foreach (string b in browsers)
            {
                if (File.Exists(b))
                {
                    try
                    {
                        ProcessStartInfo psi = new ProcessStartInfo(b, "--app=" + APP_URL)
                        {
                            UseShellExecute = false
                        };
                        Process.Start(psi);
                        return;
                    }
                    catch { }
                }
            }
            try
            {
                Process.Start(new ProcessStartInfo(APP_URL) { UseShellExecute = true });
            }
            catch { }
        }

        [STAThread]
        static void Main(string[] args)
        {
            string appDir = GetAppDir();
            if (args != null && args.Length > 0 && args[0] == "--update")
            {
                string upd = Path.Combine(appDir, "update.bat");
                if (File.Exists(upd))
                {
                    Process.Start(new ProcessStartInfo(upd) { WorkingDirectory = appDir, UseShellExecute = true });
                    return;
                }
            }

            // Limpa processos zumbis anteriores na porta 3033 para garantir código Python 100% atualizado
            KillStuckPortProcess();

            // Caso contrário, exibe splash rápido enquanto inicia o servidor
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            Form splash = new Form
            {
                FormBorderStyle = FormBorderStyle.None,
                StartPosition = FormStartPosition.CenterScreen,
                Size = new Size(420, 130),
                BackColor = Color.FromArgb(18, 24, 38),
                TopMost = true,
                ShowInTaskbar = false
            };

            Label title = new Label
            {
                Text = "TRACES Toad for Oracle",
                ForeColor = Color.White,
                Font = new Font("Segoe UI", 14, FontStyle.Bold),
                AutoSize = false,
                TextAlign = ContentAlignment.MiddleCenter,
                Dock = DockStyle.Top,
                Height = 55
            };

            Label status = new Label
            {
                Text = "Iniciando motor Oracle & servidor local...",
                ForeColor = Color.FromArgb(148, 163, 184),
                Font = new Font("Segoe UI", 9.5f, FontStyle.Regular),
                AutoSize = false,
                TextAlign = ContentAlignment.TopCenter,
                Dock = DockStyle.Fill
            };

            ProgressBar bar = new ProgressBar
            {
                Style = ProgressBarStyle.Marquee,
                MarqueeAnimationSpeed = 20,
                Dock = DockStyle.Bottom,
                Height = 6
            };

            splash.Controls.Add(status);
            splash.Controls.Add(title);
            splash.Controls.Add(bar);

            splash.Shown += (s, e) =>
            {
                ThreadPool.QueueUserWorkItem(_ =>
                {
                    StartBackendServer(appDir);
                    for (int i = 0; i < 50; i++)
                    {
                        Thread.Sleep(150);
                        if (IsServerHealthy()) break;
                    }
                    try
                    {
                        splash.Invoke((MethodInvoker)delegate
                        {
                            OpenAppWindow();
                            splash.Close();
                        });
                    }
                    catch
                    {
                        OpenAppWindow();
                    }
                });
            };

            Application.Run(splash);
        }
    }
}
