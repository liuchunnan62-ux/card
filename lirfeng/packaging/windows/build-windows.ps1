param(
    [string]$OutputRoot = "",
    [string]$NodeExe = ""
)

$ErrorActionPreference = "Stop"
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $scriptRoot "..\.."))
if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
    $OutputRoot = Join-Path $projectRoot "release"
}
$OutputRoot = [System.IO.Path]::GetFullPath($OutputRoot)
$packageName = "RiftExpedition-v1.0.0-Windows"
$stageRoot = [System.IO.Path]::GetFullPath((Join-Path $OutputRoot $packageName))
$zipPath = [System.IO.Path]::GetFullPath((Join-Path $OutputRoot "RiftExpedition-v1.0.0-Windows.zip"))
if (-not $stageRoot.StartsWith($OutputRoot + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Windows staging directory escaped the release directory."
}

if ([string]::IsNullOrWhiteSpace($NodeExe)) {
    $candidates = @(
        "C:\Users\user\Documents\rpg\.codex\toolchains\node-v22.23.2-win-x64\node.exe",
        (Join-Path $env:LOCALAPPDATA "CodexBuildTools\node\node.exe")
    )
    $commandNode = Get-Command node.exe -ErrorAction SilentlyContinue
    if ($commandNode) { $candidates += $commandNode.Source }
    $NodeExe = $candidates | Where-Object { $_ -and (Test-Path -LiteralPath $_ -PathType Leaf) } | Select-Object -First 1
}
if (-not $NodeExe -or -not (Test-Path -LiteralPath $NodeExe -PathType Leaf)) {
    throw "A Windows Node.js runtime is required to build the offline package."
}

$csc = "$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path -LiteralPath $csc)) { throw "Missing C# compiler: $csc" }

New-Item -ItemType Directory -Force -Path $OutputRoot | Out-Null
if (Test-Path -LiteralPath $stageRoot) {
    Remove-Item -LiteralPath $stageRoot -Recurse -Force
}
if (Test-Path -LiteralPath $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
}
$gameRoot = Join-Path $stageRoot "game"
$runtimeRoot = Join-Path $stageRoot "runtime"
New-Item -ItemType Directory -Force -Path $gameRoot, $runtimeRoot | Out-Null

Copy-Item -LiteralPath (Join-Path $projectRoot "index.html") -Destination $gameRoot
Copy-Item -LiteralPath (Join-Path $projectRoot "css") -Destination $gameRoot -Recurse
Copy-Item -LiteralPath (Join-Path $projectRoot "js") -Destination $gameRoot -Recurse
Copy-Item -LiteralPath (Join-Path $projectRoot "assets") -Destination $gameRoot -Recurse
Copy-Item -LiteralPath (Join-Path $scriptRoot "portable-server.mjs") -Destination $stageRoot
Copy-Item -LiteralPath (Join-Path $scriptRoot "README.txt") -Destination $stageRoot
Copy-Item -LiteralPath $NodeExe -Destination (Join-Path $runtimeRoot "node.exe")

$launcher = Join-Path $stageRoot "裂隙征途.exe"
& $csc /nologo /target:winexe /platform:anycpu /optimize+ /out:$launcher /reference:System.Windows.Forms.dll /reference:System.Drawing.dll (Join-Path $scriptRoot "Program.cs")
if ($LASTEXITCODE -ne 0) { throw "Windows launcher compilation failed." }

Compress-Archive -LiteralPath $stageRoot -DestinationPath $zipPath -CompressionLevel Optimal
Write-Output $stageRoot
Write-Output $zipPath
