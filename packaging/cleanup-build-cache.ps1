$ErrorActionPreference = "Stop"
$scriptRoot = [System.IO.Path]::GetFullPath((Split-Path -Parent $MyInvocation.MyCommand.Path))
$legacyBuild = [System.IO.Path]::GetFullPath((Join-Path $scriptRoot "android\build"))
$cacheParent = [System.IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA "CodexBuildTools"))
$androidBuild = [System.IO.Path]::GetFullPath((Join-Path $cacheParent "rift-expedition-android-build"))

$expectedLegacyParent = [System.IO.Path]::GetFullPath((Join-Path $scriptRoot "android"))
if (-not $legacyBuild.StartsWith($expectedLegacyParent + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Unsafe legacy build path."
}
if (-not $androidBuild.StartsWith($cacheParent + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Unsafe Android cache path."
}

foreach ($target in @($legacyBuild, $androidBuild)) {
    if (Test-Path -LiteralPath $target -PathType Container) {
        Remove-Item -LiteralPath $target -Recurse -Force
        Write-Output "Removed rebuildable cache: $target"
    }
}
