using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;

namespace WorkshopHub
{
    static class Program
    {
        private static HttpListener listener;
        private static string baseDir;
        private static bool isRunning = true;

        [STAThread]
        static void Main(string[] args)
        {
            baseDir = AppDomain.CurrentDomain.BaseDirectory;

            // 1. Find a free available TCP port
            int port = GetAvailablePort();

            // 2. Start internal lightweight HTTP server
            string url = "http://127.0.0.1:" + port + "/";
            listener = new HttpListener();
            listener.Prefixes.Add(url);
            try
            {
                listener.Start();
            }
            catch (Exception ex)
            {
                // Fallback to direct file launch if port binding fails
                LaunchFallback();
                return;
            }

            // 3. Start async request handler thread
            Thread serverThread = new Thread(ListenLoop);
            serverThread.IsBackground = true;
            serverThread.Start();

            // 4. Launch Desktop Window (Edge in App Mode)
            LaunchAppWindow(port, url);
        }

        private static int GetAvailablePort()
        {
            TcpListener l = new TcpListener(IPAddress.Loopback, 0);
            l.Start();
            int port = ((IPEndPoint)l.LocalEndpoint).Port;
            l.Stop();
            return port;
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

                // Prevent path traversal
                rawUrl = rawUrl.Replace("..", "").Replace("/", "\\");
                string filePath = Path.Combine(baseDir, rawUrl);

                if (!File.Exists(filePath))
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
                // --app makes Edge open in a native app window without URL bars, tabs, or bookmarks
                // --user-data-dir gives it an isolated, private persistent profile
                psi.Arguments = string.Format("--app=\"{0}\" --user-data-dir=\"{1}\" --window-size=1280,840 --app-id=workshophub_app", url, profileDir);
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

            // Fallback: Open in default browser
            try
            {
                Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
            }
            catch
            {
                LaunchFallback();
            }

            // Keep server alive for 12 hours or until terminated
            Thread.Sleep(12 * 60 * 60 * 1000);
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
