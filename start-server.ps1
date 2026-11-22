# ==============================================================================
# The Ghost Store — Native Local Web Server
# Powered by .NET System.Net.HttpListener
# ==============================================================================

$port = 3000
$publicDir = Join-Path $PSScriptRoot "public"

if (-not (Test-Path $publicDir)) {
    Write-Error "public directory not found at $publicDir"
    exit 1
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Prefixes.Add("http://127.0.0.1:$port/")

try {
    $listener.Start()
    Write-Host ""
    Write-Host "👻 =================================================================" -ForegroundColor Magenta
    Write-Host "   THE GHOST STORE — Ethereal Haute Parfumerie is LIVE!" -ForegroundColor Yellow
    Write-Host "   Website URL:  http://localhost:$port" -ForegroundColor Cyan
    Write-Host "   Admin Portal: http://localhost:$port/admin/index.html" -ForegroundColor Green
    Write-Host "   Shop Catalog: http://localhost:$port/shop.html" -ForegroundColor Cyan
    Write-Host "=================================================================" -ForegroundColor Magenta
    Write-Host ""
} catch {
    Write-Error "Could not start listener on port $port : $_"
    exit 1
}

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".htm"  = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".gif"  = "image/gif"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".woff" = "font/woff"
    ".woff2"= "font/woff2"
    ".ttf"  = "font/ttf"
}

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        try {
            $response.AddHeader("Access-Control-Allow-Origin", "*")
            $response.AddHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
            $response.AddHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
        } catch {}

        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 204
            $response.Close()
            continue
        }

        $rawPath = $request.Url.LocalPath.TrimStart('/')
        if ([string]::IsNullOrWhiteSpace($rawPath)) {
            $rawPath = "index.html"
        }

        # Health endpoint
        if ($rawPath -eq "api/health") {
            $json = '{"status":"ok","store":"The Ghost Store","mode":"ethereal-live"}'
            $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
            $response.ContentType = "application/json; charset=utf-8"
            $response.ContentLength64 = $buffer.Length
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
            $response.Close()
            continue
        }

        $filePath = Join-Path $publicDir $rawPath

        # Check if file exists, or if appending .html works
        if (-not (Test-Path $filePath -PathType Leaf)) {
            if (Test-Path "$filePath.html" -PathType Leaf) {
                $filePath = "$filePath.html"
            } elseif (Test-Path (Join-Path $filePath "index.html") -PathType Leaf) {
                $filePath = Join-Path $filePath "index.html"
            }
        }

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
            $response.ContentType = $contentType

            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentLength64 = $bytes.Length
            $response.StatusCode = 200
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            # 404 fallback to index.html for SPA
            $fallback = Join-Path $publicDir "index.html"
            if (Test-Path $fallback) {
                $bytes = [System.IO.File]::ReadAllBytes($fallback)
                $response.ContentType = "text/html; charset=utf-8"
                $response.ContentLength64 = $bytes.Length
                $response.StatusCode = 200
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $response.StatusCode = 404
                $errBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
                $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
            }
        }

        $response.Close()
    } catch {
        try { if ($response) { $response.Close() } } catch {}
    }
}
