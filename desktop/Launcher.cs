using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Text;
using System.Threading;

namespace WorkshopHub
{
    static class Program
    {
        private const int FIXED_PORT = 47821; // Fixed origin prevents localStorage wipes across launches
        private static HttpListener listener;
        private static string baseDir;
        private static bool isRunning = true;
        private static Mutex singleInstanceMutex;

        [STAThread]
        static void Main(string[] args)
        {
            // 1. Single-instance check
            bool isNewInstance;
            singleInstanceMutex = new Mutex(true, "WorkshopHub_SingleInstance_Mutex_47821", out isNewInstance);
            if (!isNewInstance)
            {
                // Already running: open the browser window and exit
                LaunchBrowserWindow(string.Format("http://127.0.0.1:{0}/", FIXED_PORT));
                return;
            }

            baseDir = AppDomain.CurrentDomain.BaseDirectory;

            // 2. Start internal HTTP server on fixed port
            string url = string.Format("http://127.0.0.1:{0}/", FIXED_PORT);
            listener = new HttpListener();
            listener.Prefixes.Add(url);

            try
            {
                listener.Start();
            }
            catch (Exception ex)
            {
                // If port is occupied by another process, fallback to file protocol
                LaunchFallback();
                return;
            }

            // 3. Start request processing thread
            Thread serverThread = new Thread(ListenLoop);
            serverThread.IsBackground = true;
            serverThread.Start();

            // 4. Launch Desktop Window
            LaunchAppWindow(FIXED_PORT, url);
        }

        private static void ListenLoop()
        {
            while (isRunning && listener.IsListening)
            {
                try
                {
                    HttpListenerContext context = listener.GetContext();
                    ThreadPool.QueueUserWorkItem((state) => HandleRequest(context));
                }
                catch
                {
                    break;
                }
            }
        }

        private static void HandleRequest(HttpListenerContext context)
        {
            try
            {
                string rawUrl = context.Request.Url.AbsolutePath.TrimStart('/');
                if (string.IsNullOrEmpty(rawUrl) || rawUrl == "/")
                {
                    rawUrl = "index.html";
                }

                // Path traversal protection
                string filePath = Path.GetFullPath(Path.Combine(baseDir, rawUrl.Replace('/', '\\')));
                if (!filePath.StartsWith(baseDir, StringComparison.OrdinalIgnoreCase) || !File.Exists(filePath))
                {
                    context.Response.StatusCode = 404;
                    byte[] notFound = Encoding.UTF8.GetBytes("File Not Found: " + rawUrl);
                    context.Response.OutputStream.Write(notFound, 0, notFound.Length);
                    context.Response.Close();
                    return;
                }

                string ext = Path.GetExtension(filePath).ToLower();
                string contentType = "application/octet-stream";
                switch (ext)
                {
                    case ".html": contentType = "text/html; charset=utf-8"; break;
                    case ".js": contentType = "application/javascript; charset=utf-8"; break;
                    case ".css": contentType = "text/css; charset=utf-8"; break;
                    case ".json": contentType = "application/json; charset=utf-8"; break;
                    case ".webmanifest": contentType = "application/manifest+json; charset=utf-8"; break;
                    case ".png": contentType = "image/png"; break;
                    case ".jpg": case ".jpeg": contentType = "image/jpeg"; break;
                    case ".svg": contentType = "image/svg+xml"; break;
                    case ".ico": contentType = "image/x-icon"; break;
                }

                context.Response.ContentType = contentType;
                byte[] bytes = File.ReadAllBytes(filePath);
                context.Response.ContentLength64 = bytes.Length;
                context.Response.OutputStream.Write(bytes, 0, bytes.Length);
                context.Response.Close();
            }
            catch
            {
                try { context.Response.Close(); } catch { }
            }
        }

        private static void LaunchAppWindow(int port, string url)
        {
            string edgePath = @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe";
            if (!File.Exists(edgePath))
            {
                edgePath = @"C:\Program Files\Microsoft\Edge\Application\msedge.exe";
            }

            string appData = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "WorkshopHub");
            if (!Directory.Exists(appData)) Directory.CreateDirectory(appData);
            string profileDir = Path.Combine(appData, "DesktopProfile");

            if (File.Exists(edgePath))
            {
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = edgePath;
                psi.Arguments = string.Format("--app=\"{0}\" --user-data-dir=\"{1}\" --window-size=1280,840 --app-id=workshophub_desktop_app", url, profileDir);
                psi.UseShellExecute = false;

                try
                {
                    Process p = Process.Start(psi);
                    if (p != null)
                    {
                        p.WaitForExit();
                        isRunning = false;
                        try { listener.Stop(); } catch { }
                        return;
                    }
                }
                catch { }
            }

            LaunchBrowserWindow(url);
            // Keep server running
            while (isRunning)
            {
                Thread.Sleep(2000);
            }
        }

        private static void LaunchBrowserWindow(string url)
        {
            try
            {
                Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
            }
            catch
            {
                LaunchFallback();
            }
        }

        private static void LaunchFallback()
        {
            try
            {
                string indexPath = Path.Combine(baseDir, "index.html");
                Process.Start(new ProcessStartInfo(indexPath) { UseShellExecute = true });
            }
            catch { }
        }
    }
}
