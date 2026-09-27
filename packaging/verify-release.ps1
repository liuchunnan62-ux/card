$ErrorActionPreference = "Stop"
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$project = [System.IO.Path]::GetFullPath((Join-Path $scriptRoot ".."))
$windowsRoot = Join-Path $project "release\RiftExpedition-v1.0.0-Windows"
$gameRoot = Join-Path $windowsRoot "game"
$node = Join-Path $windowsRoot "runtime\node.exe"
$server = Join-Path $windowsRoot "portable-server.mjs"

$serverProcess = Start-Process -FilePath $node -ArgumentList @($server, "--root", $gameRoot, "--port", "18766") -WorkingDirectory $windowsRoot -WindowStyle Hidden -PassThru
try {
    $ready = $false
    for ($i = 0; $i -lt 50; $i++) {
        try {
            $health = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:18766/health" -TimeoutSec 1
            if ($health.StatusCode -eq 200) { $ready = $true; break }
        } catch { Start-Sleep -Milliseconds 100 }
    }
    if (-not $ready) { throw "Windows server did not become ready." }
    $index = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:18766/" -TimeoutSec 5
    $image = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:18766/assets/ui/game-cover.png" -TimeoutSec 30
    if ($index.StatusCode -ne 200 -or $index.Content -notmatch "裂隙征途") { throw "Windows index smoke test failed." }
    if ($image.StatusCode -ne 200 -or $image.RawContentLength -lt 1000000) { throw "Windows image smoke test failed." }
    [pscustomobject]@{ WindowsHttp = "PASS"; IndexBytes = $index.RawContentLength; CoverBytes = $image.RawContentLength }
} finally {
    if ($serverProcess -and -not $serverProcess.HasExited) { Stop-Process -Id $serverProcess.Id -Force }
}

$sourceFiles = @((Get-Item -LiteralPath (Join-Path $project "index.html")))
$sourceFiles += @(Get-ChildItem -LiteralPath (Join-Path $project "css") -File -Recurse)
$sourceFiles += @(Get-ChildItem -LiteralPath (Join-Path $project "js") -File -Recurse)
$sourceFiles += @(Get-ChildItem -LiteralPath (Join-Path $project "assets") -File -Recurse)
$windowsFiles = @(Get-ChildItem -LiteralPath $gameRoot -File -Recurse)
if ($sourceFiles.Count -ne $windowsFiles.Count) { throw "Windows file count mismatch: $($sourceFiles.Count) vs $($windowsFiles.Count)" }

$badWindows = 0
foreach ($sourceFile in $sourceFiles) {
    $relative = [System.IO.Path]::GetRelativePath($project, $sourceFile.FullName)
    $packaged = Join-Path $gameRoot $relative
    if (-not (Test-Path -LiteralPath $packaged -PathType Leaf)) { $badWindows++; continue }
    $sourceHash = (Get-FileHash -LiteralPath $sourceFile.FullName -Algorithm SHA256).Hash
    $packagedHash = (Get-FileHash -LiteralPath $packaged -Algorithm SHA256).Hash
    if ($sourceHash -ne $packagedHash) { $badWindows++ }
}
if ($badWindows -ne 0) { throw "Windows hash mismatches: $badWindows" }
[pscustomobject]@{ WindowsFiles = $windowsFiles.Count; WindowsHashes = "PASS" }

Add-Type -AssemblyName System.IO.Compression.FileSystem
$zipPath = Join-Path $project "release\RiftExpedition-v1.0.0-Windows.zip"
$zip = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
try {
    $required = @(
        "RiftExpedition-v1.0.0-Windows/裂隙征途.exe",
        "RiftExpedition-v1.0.0-Windows/runtime/node.exe",
        "RiftExpedition-v1.0.0-Windows/game/index.html",
        "RiftExpedition-v1.0.0-Windows/game/assets/ui/game-cover.png"
    )
    $names = @{}
    foreach ($entry in $zip.Entries) { $names[$entry.FullName] = $true }
    foreach ($name in $required) {
        if (-not $names.ContainsKey($name)) { throw "Windows ZIP missing $name" }
    }
    [pscustomobject]@{ WindowsZip = "PASS"; ZipEntries = $zip.Entries.Count }
} finally { $zip.Dispose() }

$apkPath = Join-Path $project "release\RiftExpedition-v1.0.0-Android.apk"
$apk = [System.IO.Compression.ZipFile]::OpenRead($apkPath)
try {
    $assetEntries = @($apk.Entries | Where-Object { $_.FullName.StartsWith("assets/") -and -not $_.FullName.EndsWith("/") })
    $backslash = @($apk.Entries | Where-Object { $_.FullName.Contains("\") })
    if ($backslash.Count -ne 0) { throw "APK has $($backslash.Count) backslash paths." }
    if ($assetEntries.Count -ne $sourceFiles.Count) { throw "APK asset count mismatch: $($assetEntries.Count) vs $($sourceFiles.Count)" }
    $entryMap = @{}
    foreach ($entry in $assetEntries) { $entryMap[$entry.FullName] = $entry }
    $sha = [System.Security.Cryptography.SHA256]::Create()
    $badApk = 0
    foreach ($sourceFile in $sourceFiles) {
        $relative = [System.IO.Path]::GetRelativePath($project, $sourceFile.FullName).Replace("\", "/")
        $entryName = "assets/" + $relative
        if (-not $entryMap.ContainsKey($entryName)) { $badApk++; continue }
        $sourceHash = (Get-FileHash -LiteralPath $sourceFile.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
        $stream = $entryMap[$entryName].Open()
        try {
            $apkHash = ([System.BitConverter]::ToString($sha.ComputeHash($stream))).Replace("-", "").ToLowerInvariant()
        } finally { $stream.Dispose() }
        if ($sourceHash -ne $apkHash) { $badApk++ }
    }
    $sha.Dispose()
    if ($badApk -ne 0) { throw "APK asset hash mismatches: $badApk" }
    [pscustomobject]@{ ApkAssets = $assetEntries.Count; ApkHashes = "PASS"; BackslashPaths = $backslash.Count }
} finally { $apk.Dispose() }

Get-Item -LiteralPath $zipPath, $apkPath | Select-Object Name, Length, @{N="MiB";E={[math]::Round($_.Length / 1MB, 1)}}, @{N="SHA256";E={(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash}}
