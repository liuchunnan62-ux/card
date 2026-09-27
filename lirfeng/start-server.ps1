[CmdletBinding()]
param(
    [int]$Port = 8765,
    [switch]$NoBrowser
)

$gameRoot = [IO.Path]::GetFullPath((Split-Path -Parent $MyInvocation.MyCommand.Path))
$listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $port)
$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "text/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".svg"  = "image/svg+xml"
}

function Send-Response {
    param($Stream, [int]$Status, [string]$StatusText, [byte[]]$Body, [string]$ContentType)
    $header = "HTTP/1.1 $Status $StatusText`r`nContent-Type: $ContentType`r`nContent-Length: $($Body.Length)`r`nConnection: close`r`n`r`n"
    $headerBytes = [Text.Encoding]::ASCII.GetBytes($header)
    $Stream.Write($headerBytes, 0, $headerBytes.Length)
    $Stream.Write($Body, 0, $Body.Length)
}

try {
    $listener.Start()
    Write-Host "Rift Expedition is running at http://127.0.0.1:$port/"
    Write-Host "Press Ctrl+C to stop the server."
    if (-not $NoBrowser) { Start-Process -FilePath "http://127.0.0.1:$port/" }
    while ($true) {
        $client = $listener.AcceptTcpClient()
        try {
            $stream = $client.GetStream()
            $reader = [IO.StreamReader]::new($stream, [Text.Encoding]::ASCII, $false, 1024, $true)
            $requestLine = $reader.ReadLine()
            while (($line = $reader.ReadLine()) -ne $null -and $line -ne "") { }
            if ($requestLine -notmatch '^GET\s+([^\s]+)') {
                $body = [Text.Encoding]::UTF8.GetBytes("Method Not Allowed")
                Send-Response $stream 405 "Method Not Allowed" $body "text/plain; charset=utf-8"
                continue
            }
            $relative = [Uri]::UnescapeDataString(($Matches[1] -split '\?')[0]).TrimStart('/')
            if ([string]::IsNullOrWhiteSpace($relative)) { $relative = "index.html" }
            $target = [IO.Path]::GetFullPath((Join-Path $gameRoot $relative))
            if (-not $target.StartsWith($gameRoot, [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $target -PathType Leaf)) {
                $body = [Text.Encoding]::UTF8.GetBytes("Not Found")
                Send-Response $stream 404 "Not Found" $body "text/plain; charset=utf-8"
                continue
            }
            $extension = [IO.Path]::GetExtension($target).ToLowerInvariant()
            $contentType = if ($mimeTypes.ContainsKey($extension)) { $mimeTypes[$extension] } else { "application/octet-stream" }
            Send-Response $stream 200 "OK" ([IO.File]::ReadAllBytes($target)) $contentType
        }
        finally {
            $client.Close()
        }
    }
}
finally {
    $listener.Stop()
}
