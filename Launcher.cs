using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;
using System.IO;
using System.Drawing;
using System.Net;
using System.Text;

namespace YumnaLauncher
{
    public class LauncherContext : ApplicationContext
    {
        private NotifyIcon trayIcon;
        private Process backendProcess;
        private Process edgeProcess;
        private System.Windows.Forms.Timer monitorTimer;
        private string panelRoot = @"C:\YumnaPanel";
        private string targetTitle = "Yumna Panel Control Center";
        private static Mutex mutex = new Mutex(true, "{YUMNA-PANEL-SINGLE-INSTANCE-GUID}");

        [DllImport("user32.dll")]
        static extern int GetWindowLong(IntPtr hWnd, int nIndex);

        [DllImport("user32.dll")]
        static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);

        [DllImport("user32.dll")]
        static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);

        [DllImport("user32.dll")]
        static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

        [DllImport("user32.dll")]
        static extern bool IsWindowVisible(IntPtr hWnd);

        [DllImport("user32.dll")]
        [return: MarshalAs(UnmanagedType.Bool)]
        static extern bool SetForegroundWindow(IntPtr hWnd);

        const int GWL_STYLE = -16;
        const int WS_MAXIMIZEBOX = 0x00010000;
        const int WS_THICKFRAME = 0x00040000;
        const int SW_RESTORE = 9;
        const int SW_SHOW = 5;

        public LauncherContext()
        {
            if (!mutex.WaitOne(TimeSpan.Zero, true))
            {
                MessageBox.Show("Yumna Panel is already running in the system tray.", "Already Running", MessageBoxButtons.OK, MessageBoxIcon.Information);
                Environment.Exit(0);
            }

            InitializeTray();
            StartBackend();
            StartEdge();

            monitorTimer = new System.Windows.Forms.Timer();
            monitorTimer.Interval = 1000;
            monitorTimer.Tick += MonitorTick;
            monitorTimer.Start();
        }

        private void InitializeTray()
        {
            ContextMenu trayMenu = new ContextMenu();
            trayMenu.MenuItems.Add("Open Dashboard", OnOpenDashboard);
            trayMenu.MenuItems.Add("-");
            trayMenu.MenuItems.Add("Start All Services", delegate { CallApi("start"); });
            trayMenu.MenuItems.Add("Stop All Services", delegate { CallApi("stop"); });
            trayMenu.MenuItems.Add("-");
            trayMenu.MenuItems.Add("Exit / Quit", OnExit);

            Icon appIcon = SystemIcons.Application;
            string iconPath = Path.Combine(panelRoot, "YumnaIcon.ico");
            if (File.Exists(iconPath)) 
            {
                try { appIcon = new Icon(iconPath); } catch { }
            }

            trayIcon = new NotifyIcon()
            {
                Icon = appIcon,
                ContextMenu = trayMenu,
                Visible = true,
                Text = "Yumna Panel Control Center"
            };
            trayIcon.DoubleClick += OnOpenDashboard;
        }

        private void StartBackend()
        {
            try
            {
                string backendPath = Path.Combine(panelRoot, "ControlCenterBackend.js");
                backendProcess = new Process();
                backendProcess.StartInfo.FileName = "node.exe";
                backendProcess.StartInfo.Arguments = "\"" + backendPath + "\"";
                backendProcess.StartInfo.WorkingDirectory = panelRoot;
                backendProcess.StartInfo.CreateNoWindow = true;
                backendProcess.StartInfo.UseShellExecute = false;
                backendProcess.Start();
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error starting backend: " + ex.Message);
            }
        }

        private void StartEdge()
        {
            try
            {
                string edgePath = @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe";
                if (!File.Exists(edgePath)) edgePath = @"C:\Program Files\Microsoft\Edge\Application\msedge.exe";

                edgeProcess = new Process();
                edgeProcess.StartInfo.FileName = edgePath;
                edgeProcess.StartInfo.Arguments = "--app=http://localhost:5001 --window-size=1020,770";
                edgeProcess.Start();
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error starting dashboard: " + ex.Message);
            }
        }

        private void CallApi(string action)
        {
            try
            {
                string url = "http://localhost:5001/api/" + action;
                HttpWebRequest request = (HttpWebRequest)WebRequest.Create(url);
                request.Method = "POST";
                request.ContentLength = 0;
                request.Timeout = 5000;
                using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
                {
                    trayIcon.ShowBalloonTip(2000, "Yumna Panel", "Services " + action + "ed successfully.", ToolTipIcon.Info);
                }
            }
            catch (Exception ex)
            {
                trayIcon.ShowBalloonTip(3000, "Error", "Failed to " + action + " services: " + ex.Message, ToolTipIcon.Error);
            }
        }

        private IntPtr FindDashboardWindow()
        {
            Process[] processes = Process.GetProcessesByName("msedge");
            foreach (Process p in processes)
            {
                if (!string.IsNullOrEmpty(p.MainWindowTitle) && p.MainWindowTitle.Contains(targetTitle))
                {
                    return p.MainWindowHandle;
                }
            }
            return IntPtr.Zero;
        }

        private void MonitorTick(object sender, EventArgs e)
        {
            IntPtr hwnd = FindDashboardWindow();
            if (hwnd != IntPtr.Zero)
            {
                ApplyWindowStyle(hwnd);
            }
        }

        private void ApplyWindowStyle(IntPtr hwnd)
        {
            int style = GetWindowLong(hwnd, GWL_STYLE);
            int newStyle = style;
            newStyle &= ~WS_MAXIMIZEBOX;
            newStyle &= ~WS_THICKFRAME;
            
            if (style != newStyle)
            {
                SetWindowLong(hwnd, GWL_STYLE, newStyle);
                SetWindowPos(hwnd, IntPtr.Zero, 0, 0, 0, 0, 0x0027);
            }
        }

        private void OnOpenDashboard(object sender, EventArgs e)
        {
            IntPtr hwnd = FindDashboardWindow();
            if (hwnd != IntPtr.Zero)
            {
                ShowWindow(hwnd, SW_RESTORE);
                ShowWindow(hwnd, SW_SHOW);
                SetForegroundWindow(hwnd);
            }
            else
            {
                // If window not found, check if process died or just window closed
                if (edgeProcess != null && !edgeProcess.HasExited)
                {
                    try { edgeProcess.Kill(); } catch { }
                }
                StartEdge();
            }
        }

        private void OnExit(object sender, EventArgs e)
        {
            trayIcon.Visible = false;
            try { if (edgeProcess != null && !edgeProcess.HasExited) edgeProcess.Kill(); } catch { }
            try { if (backendProcess != null && !backendProcess.HasExited) backendProcess.Kill(); } catch { }
            
            // Clean up ANY lingering edge processes we started (optional but safer)
            Process[] processes = Process.GetProcessesByName("msedge");
            foreach (Process p in processes)
            {
                if (p.MainWindowTitle.Contains(targetTitle))
                {
                    try { p.Kill(); } catch { }
                }
            }

            if (mutex != null)
            {
                mutex.ReleaseMutex();
                mutex.Dispose();
            }
            Application.Exit();
        }
    }

    static class Program
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new LauncherContext());
        }
    }
}
