using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Reflection;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

namespace TracesToadSetup
{
    static class Program
    {
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

        static void RunCmdHidden(string args, int timeoutMs = 15000)
        {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo("cmd.exe", "/c " + args)
                {
                    CreateNoWindow = true,
                    UseShellExecute = false,
                    WindowStyle = ProcessWindowStyle.Hidden
                };
                using (Process p = Process.Start(psi))
                {
                    if (p != null) p.WaitForExit(timeoutMs);
                }
            }
            catch { }
        }

        static void CopyDirFast(string src, string dst)
        {
            if (!Directory.Exists(src)) return;
            RunCmdHidden(string.Format("robocopy \"{0}\" \"{1}\" /E /MT:16 /NFL /NDL /NJH /NJS /nc /ns /np", src, dst), 30000);
        }

        static string LocateSourcePayloadDir()
        {
            string exeDir = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
            if (File.Exists(Path.Combine(exeDir, "index.html"))) return exeDir;
            string sub = Path.Combine(exeDir, "traces-tool-main");
            if (File.Exists(Path.Combine(sub, "index.html"))) return sub;
            string sub2 = Path.Combine(sub, "traces-tool-main");
            if (File.Exists(Path.Combine(sub2, "index.html"))) return sub2;
            string dl = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), @"Downloads\traces-tool-main\traces-tool-main");
            if (File.Exists(Path.Combine(dl, "index.html"))) return dl;
            string installed = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "TracesToad");
            if (File.Exists(Path.Combine(installed, "index.html"))) return installed;
            return exeDir;
        }

        static void CreateShortcut(string lnkPath, string targetExe, string workDir, string iconPath)
        {
            try
            {
                Type t = Type.GetTypeFromProgID("WScript.Shell");
                if (t == null) return;
                object shell = Activator.CreateInstance(t);
                object sc = t.InvokeMember("CreateShortcut", BindingFlags.InvokeMethod, null, shell, new object[] { lnkPath });
                Type scType = sc.GetType();
                scType.InvokeMember("TargetPath", BindingFlags.SetProperty, null, sc, new object[] { targetExe });
                scType.InvokeMember("WorkingDirectory", BindingFlags.SetProperty, null, sc, new object[] { workDir });
                scType.InvokeMember("Description", BindingFlags.SetProperty, null, sc, new object[] { "TRACES Toad for Oracle" });
                if (File.Exists(iconPath))
                {
                    scType.InvokeMember("IconLocation", BindingFlags.SetProperty, null, sc, new object[] { iconPath });
                }
                scType.InvokeMember("Save", BindingFlags.InvokeMethod, null, sc, null);
            }
            catch { }
        }

        [STAThread]
        static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            Form form = new Form
            {
                Text = "Instalador Rápido - TRACES Toad for Oracle 2026.2.0",
                FormBorderStyle = FormBorderStyle.FixedDialog,
                MaximizeBox = false,
                MinimizeBox = false,
                StartPosition = FormStartPosition.CenterScreen,
                Size = new Size(480, 190),
                BackColor = Color.FromArgb(18, 24, 38),
                TopMost = true
            };

            Label header = new Label
            {
                Text = "TRACES Toad for Oracle 2026.2.0",
                ForeColor = Color.White,
                Font = new Font("Segoe UI", 14, FontStyle.Bold),
                AutoSize = false,
                TextAlign = ContentAlignment.MiddleCenter,
                Dock = DockStyle.Top,
                Height = 52
            };

            Label stepLabel = new Label
            {
                Text = "Preparando instalação rápida...",
                ForeColor = Color.FromArgb(16, 185, 129),
                Font = new Font("Segoe UI", 10f, FontStyle.Regular),
                AutoSize = false,
                TextAlign = ContentAlignment.MiddleCenter,
                Dock = DockStyle.Top,
                Height = 36
            };

            ProgressBar progress = new ProgressBar
            {
                Minimum = 0,
                Maximum = 100,
                Value = 10,
                Dock = DockStyle.Bottom,
                Height = 14
            };

            form.Controls.Add(stepLabel);
            form.Controls.Add(header);
            form.Controls.Add(progress);

            Action<string, int> updateUi = (msg, val) =>
            {
                try
                {
                    form.Invoke((MethodInvoker)delegate
                    {
                        stepLabel.Text = msg;
                        progress.Value = Math.Min(100, Math.Max(0, val));
                    });
                }
                catch { }
            };

            form.Shown += (s, e) =>
            {
                ThreadPool.QueueUserWorkItem(_ =>
                {
                    try
                    {
                        string srcDir = LocateSourcePayloadDir();
                        string installDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "TracesToad");
                        Directory.CreateDirectory(installDir);

                        updateUi("[1/4] Copiando arquivos do aplicativo...", 25);

                        if (!string.Equals(Path.GetFullPath(srcDir).TrimEnd('\\'), Path.GetFullPath(installDir).TrimEnd('\\'), StringComparison.OrdinalIgnoreCase))
                        {
                            string[] topFiles = new string[] { "index.html", "TracesToad.exe", "Toad.exe", "start.bat", "update.bat", "README.md", ".version", "main.js", "preload.js", "package.json" };
                            foreach (string f in topFiles)
                            {
                                string sf = Path.Combine(srcDir, f);
                                string df = Path.Combine(installDir, f);
                                if (File.Exists(sf))
                                {
                                    try { File.Copy(sf, df, true); } catch { }
                                }
                            }

                            string[] folders = new string[] { "assets", "css", "js", "bridge", "installer" };
                            foreach (string fld in folders)
                            {
                                CopyDirFast(Path.Combine(srcDir, fld), Path.Combine(installDir, fld));
                            }

                            // Só copia instantclient se ainda não existir no destino (economiza ~25s)
                            string dstOci = Path.Combine(installDir, @"instantclient\instantclient_19_23\oci.dll");
                            if (!File.Exists(dstOci))
                            {
                                updateUi("[1/4] Instalando Oracle Instant Client 19.23...", 45);
                                CopyDirFast(Path.Combine(srcDir, "instantclient"), Path.Combine(installDir, "instantclient"));
                            }
                        }

                        updateUi("[2/4] Criando atalhos na Área de Trabalho e Menu Iniciar...", 65);

                        string mainExe = Path.Combine(installDir, "TracesToad.exe");
                        string iconPath = Path.Combine(installDir, @"assets\traces.ico");
                        string desktopLnk = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory), "TRACES Toad for Oracle.lnk");
                        CreateShortcut(desktopLnk, mainExe, installDir, iconPath);

                        string startMenuDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Programs), "TRACES Toad for Oracle");
                        Directory.CreateDirectory(startMenuDir);
                        CreateShortcut(Path.Combine(startMenuDir, "TRACES Toad for Oracle.lnk"), mainExe, installDir, iconPath);

                        try
                        {
                            using (RegistryKey k = Registry.CurrentUser.CreateSubKey(@"Software\TracesToad"))
                            {
                                if (k != null)
                                {
                                    k.SetValue("InstallDir", installDir);
                                    k.SetValue("Version", "2026.2.0");
                                }
                            }
                        }
                        catch { }

                        updateUi("[3/4] Iniciando servidor local Oracle...", 85);

                        if (!IsServerHealthy())
                        {
                            RunCmdHidden("for /f \"tokens=5\" %a in ('netstat -ano ^| findstr :3033 ^| findstr LISTENING') do taskkill /F /PID %a", 2000);
                            string pyExe = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Programs\Python\Python311\python.exe");
                            if (!File.Exists(pyExe)) pyExe = "python";
                            string srvScript = Path.Combine(installDir, @"bridge\oracle_server.py");
                            string logPath = Path.Combine(Path.GetTempPath(), "traces_toad_server.log");
                            ProcessStartInfo psi = new ProcessStartInfo("cmd.exe", string.Format("/c \"\"{0}\" \"{1}\" >\"{2}\" 2>&1\"", pyExe, srvScript, logPath))
                            {
                                WorkingDirectory = installDir,
                                CreateNoWindow = true,
                                UseShellExecute = false,
                                WindowStyle = ProcessWindowStyle.Hidden
                            };
                            Process.Start(psi);

                            for (int i = 0; i < 40; i++)
                            {
                                Thread.Sleep(150);
                                if (IsServerHealthy()) break;
                            }
                        }

                        updateUi("[4/4] Abrindo TRACES Toad for Oracle!", 100);
                        Thread.Sleep(200);

                        if (File.Exists(mainExe))
                        {
                            Process.Start(new ProcessStartInfo(mainExe) { WorkingDirectory = installDir, UseShellExecute = false });
                        }
                    }
                    catch { }
                    finally
                    {
                        try
                        {
                            form.Invoke((MethodInvoker)delegate { form.Close(); });
                        }
                        catch { }
                    }
                });
            };

            Application.Run(form);
        }
    }
}
