using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Threading;
using System.Windows.Forms;

namespace RiftExpedition.Launcher
{
    internal static class Program
    {
        private const string Title = "裂隙征途";
        private const int Port = 18765;
        private static readonly string GameUrl = "http://127.0.0.1:" + Port + "/";

        [STAThread]
        private static int Main()
        {
            bool createdNew;
            using (var singleInstance = new Mutex(true, "RiftExpedition.OfflineGame", out createdNew))
            {
                if (!createdNew)
                {
                    OpenGame();
                    return 0;
                }

                string root = AppDomain.CurrentDomain.BaseDirectory;
                string nodePath = Path.Combine(root, "runtime", "node.exe");
                string serverPath = Path.Combine(root, "portable-server.mjs");
                string indexPath = Path.Combine(root, "game", "index.html");
                foreach (string required in new[] { nodePath, serverPath, indexPath })
                {
                    if (!File.Exists(required))
                    {
                        MessageBox.Show("缺少必要的游戏文件：\n" + required, Title, MessageBoxButtons.OK, MessageBoxIcon.Error);
                        return 2;
                    }
                }

                Process server = null;
                try
                {
                    var startInfo = new ProcessStartInfo
                    {
                        FileName = nodePath,
                        WorkingDirectory = root,
                        UseShellExecute = false,
                        CreateNoWindow = true,
                        Arguments = "\"" + serverPath + "\" --root \"" + Path.Combine(root, "game") + "\" --port " + Port
                    };
                    server = Process.Start(startInfo);
                    if (server == null || !WaitUntilReady(server, 15000))
                    {
                        throw new InvalidOperationException("本地游戏服务未能启动，请重新解压完整安装包后再试。");
                    }

                    Application.EnableVisualStyles();
                    Application.SetCompatibleTextRenderingDefault(false);
                    OpenGame();
                    using (var context = new GameApplicationContext(server))
                    {
                        Application.Run(context);
                    }
                    return 0;
                }
                catch (Exception error)
                {
                    if (server != null && !server.HasExited)
                    {
                        server.Kill();
                    }
                    MessageBox.Show("无法启动游戏：\n" + error.Message, Title, MessageBoxButtons.OK, MessageBoxIcon.Error);
                    return 1;
                }
            }
        }

        private static bool WaitUntilReady(Process server, int timeoutMilliseconds)
        {
            var timer = Stopwatch.StartNew();
            while (timer.ElapsedMilliseconds < timeoutMilliseconds)
            {
                if (server.HasExited)
                {
                    return false;
                }
                try
                {
                    var request = WebRequest.Create(GameUrl + "health");
                    request.Timeout = 600;
                    using (var response = request.GetResponse())
                    {
                        if (((HttpWebResponse)response).StatusCode == HttpStatusCode.OK)
                        {
                            return true;
                        }
                    }
                }
                catch
                {
                    Thread.Sleep(120);
                }
            }
            return false;
        }

        private static void OpenGame()
        {
            Process.Start(new ProcessStartInfo(GameUrl) { UseShellExecute = true });
        }

        private sealed class GameApplicationContext : ApplicationContext
        {
            private readonly Process server;
            private readonly NotifyIcon trayIcon;

            internal GameApplicationContext(Process serverProcess)
            {
                server = serverProcess;
                var menu = new ContextMenuStrip();
                menu.Items.Add("打开游戏", null, delegate { OpenGame(); });
                menu.Items.Add("退出", null, delegate { ExitThread(); });
                trayIcon = new NotifyIcon
                {
                    Icon = SystemIcons.Application,
                    Text = "裂隙征途（离线运行中）",
                    ContextMenuStrip = menu,
                    Visible = true
                };
                trayIcon.DoubleClick += delegate { OpenGame(); };
                trayIcon.ShowBalloonTip(2500, Title, "游戏已在浏览器中打开。右键托盘图标可退出。", ToolTipIcon.Info);
            }

            protected override void ExitThreadCore()
            {
                trayIcon.Visible = false;
                trayIcon.Dispose();
                if (!server.HasExited)
                {
                    server.Kill();
                    server.WaitForExit(3000);
                }
                server.Dispose();
                base.ExitThreadCore();
            }
        }
    }
}
