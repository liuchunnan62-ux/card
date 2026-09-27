param(
    [string]$SdkRoot = "C:\Users\user\AppData\Local\CodexBuildTools\android-sdk",
    [string]$JdkRoot = "C:\Users\user\AppData\Local\CodexBuildTools\jdk17-extracted\jdk-17.0.20+8",
    [string]$OutputApk = "",
    [string]$WebAssetsRoot = "",
    [string]$KeystorePath = "",
    [string]$BuildToolsVersion = "35.0.0",
    [string]$PlatformVersion = "android-35"
)

$ErrorActionPreference = "Stop"
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $scriptRoot "..\.."))
$toolCacheRoot = [System.IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA "CodexBuildTools"))
$buildRoot = [System.IO.Path]::GetFullPath((Join-Path $toolCacheRoot "rift-expedition-android-build"))
if ([string]::IsNullOrWhiteSpace($OutputApk)) { $OutputApk = Join-Path $projectRoot "release\RiftExpedition-v1.0.0-Android.apk" }
if ([string]::IsNullOrWhiteSpace($WebAssetsRoot)) { $WebAssetsRoot = Join-Path $buildRoot "offline-web\assets" }
if ([string]::IsNullOrWhiteSpace($KeystorePath)) { $KeystorePath = Join-Path $scriptRoot ".keys\rift-expedition-release.keystore" }
$OutputApk = [System.IO.Path]::GetFullPath($OutputApk)
$WebAssetsRoot = [System.IO.Path]::GetFullPath($WebAssetsRoot)
$KeystorePath = [System.IO.Path]::GetFullPath($KeystorePath)

if (-not $buildRoot.StartsWith($toolCacheRoot + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Android build directory escaped the dedicated tool cache."
}
if (Test-Path -LiteralPath $buildRoot) { Remove-Item -LiteralPath $buildRoot -Recurse -Force }

$compiledDir = Join-Path $buildRoot "compiled"
$generatedDir = Join-Path $buildRoot "generated"
$classesDir = Join-Path $buildRoot "classes"
$dexDir = Join-Path $buildRoot "dex"
$assetStageRoot = Join-Path $buildRoot "offline-web"
$assetStageDirectory = Join-Path $assetStageRoot "assets"
$nativeSourceRoot = Join-Path $buildRoot "native-source"
New-Item -ItemType Directory -Force -Path $compiledDir, $generatedDir, $classesDir, $dexDir, $assetStageDirectory, $WebAssetsRoot, $nativeSourceRoot | Out-Null

# Android's Windows resource compiler cannot reliably open non-ASCII paths.
# Stage the small native wrapper under an English-only build path first.
Copy-Item -LiteralPath (Join-Path $scriptRoot "AndroidManifest.xml") -Destination $nativeSourceRoot
Copy-Item -LiteralPath (Join-Path $scriptRoot "res") -Destination $nativeSourceRoot -Recurse
Copy-Item -LiteralPath (Join-Path $scriptRoot "src") -Destination $nativeSourceRoot -Recurse

Copy-Item -LiteralPath (Join-Path $projectRoot "index.html") -Destination $WebAssetsRoot
Copy-Item -LiteralPath (Join-Path $projectRoot "css") -Destination $WebAssetsRoot -Recurse
Copy-Item -LiteralPath (Join-Path $projectRoot "js") -Destination $WebAssetsRoot -Recurse
Copy-Item -LiteralPath (Join-Path $projectRoot "assets") -Destination $WebAssetsRoot -Recurse

$buildTools = Join-Path $SdkRoot "build-tools\$BuildToolsVersion"
$androidJar = Join-Path $SdkRoot "platforms\$PlatformVersion\android.jar"
$aapt2 = Join-Path $buildTools "aapt2.exe"
$zipalign = Join-Path $buildTools "zipalign.exe"
$apksigner = Join-Path $buildTools "apksigner.bat"
$d8 = Join-Path $buildTools "d8.bat"
$javac = Join-Path $JdkRoot "bin\javac.exe"
$jar = Join-Path $JdkRoot "bin\jar.exe"
$keytool = Join-Path $JdkRoot "bin\keytool.exe"
foreach ($required in @($androidJar, $aapt2, $zipalign, $apksigner, $d8, $javac, $jar, $keytool)) {
    if (-not (Test-Path -LiteralPath $required -PathType Leaf)) { throw "Missing Android build tool: $required" }
}
$env:JAVA_HOME = $JdkRoot
$env:PATH = "$(Join-Path $JdkRoot 'bin');$env:PATH"

$compiledResources = Join-Path $compiledDir "resources.zip"
$unsignedApk = Join-Path $buildRoot "unsigned.apk"
$alignedApk = Join-Path $buildRoot "aligned.apk"
& $aapt2 compile --dir (Join-Path $nativeSourceRoot "res") -o $compiledResources
if ($LASTEXITCODE -ne 0) { throw "aapt2 compile failed." }
& $aapt2 link -I $androidJar --manifest (Join-Path $nativeSourceRoot "AndroidManifest.xml") --java $generatedDir --min-sdk-version 23 --target-sdk-version 35 --version-code 1 --version-name "1.0.0" --auto-add-overlay -o $unsignedApk $compiledResources
if ($LASTEXITCODE -ne 0) { throw "aapt2 link failed." }

$javaSources = @(Get-ChildItem -LiteralPath (Join-Path $nativeSourceRoot "src") -Recurse -Filter "*.java" | ForEach-Object FullName)
$javaSources += @(Get-ChildItem -LiteralPath $generatedDir -Recurse -Filter "*.java" | ForEach-Object FullName)
& $javac -encoding UTF-8 -source 8 -target 8 -bootclasspath $androidJar -d $classesDir @javaSources
if ($LASTEXITCODE -ne 0) { throw "javac failed." }
$classFiles = @(Get-ChildItem -LiteralPath $classesDir -Recurse -Filter "*.class" | ForEach-Object FullName)
& $d8 --lib $androidJar --min-api 23 --output $dexDir @classFiles
if ($LASTEXITCODE -ne 0) { throw "d8 failed." }
& $jar uf $unsignedApk -C $dexDir "classes.dex"
if ($LASTEXITCODE -ne 0) { throw "Adding classes.dex failed." }

$resolvedAssetStage = [System.IO.Path]::GetFullPath($assetStageDirectory)
if (-not $WebAssetsRoot.Equals($resolvedAssetStage, [System.StringComparison]::OrdinalIgnoreCase)) {
    Get-ChildItem -LiteralPath $WebAssetsRoot -Force | Copy-Item -Destination $assetStageDirectory -Recurse -Force
}
& $jar --update --file $unsignedApk --no-compress -C $assetStageRoot "assets"
if ($LASTEXITCODE -ne 0) { throw "Adding offline web assets failed." }
& $zipalign -f 4 $unsignedApk $alignedApk
if ($LASTEXITCODE -ne 0) { throw "zipalign failed." }

if (-not (Test-Path -LiteralPath $KeystorePath -PathType Leaf)) {
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $KeystorePath) | Out-Null
    & $keytool -genkeypair -v -keystore $KeystorePath -storepass "riftlocal1" -keypass "riftlocal1" -alias "rift-expedition" -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Rift Expedition, OU=Game, O=Rift Expedition, L=Taipei, ST=Taiwan, C=TW"
    if ($LASTEXITCODE -ne 0) { throw "keytool failed." }
}

$outputDirectory = Split-Path -Parent $OutputApk
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
$signedApk = Join-Path $buildRoot "signed.apk"
& $apksigner sign --ks $KeystorePath --ks-pass "pass:riftlocal1" --key-pass "pass:riftlocal1" --ks-key-alias "rift-expedition" --out $signedApk $alignedApk
if ($LASTEXITCODE -ne 0) { throw "apksigner failed." }
& $apksigner verify --verbose --print-certs $signedApk
if ($LASTEXITCODE -ne 0) { throw "APK verification failed." }
Copy-Item -LiteralPath $signedApk -Destination $OutputApk -Force
Write-Output $OutputApk

# The native compiler creates several full-size temporary APK copies. The final
# signed APK lives under release/, so reclaim the rebuildable cache after success.
if (-not $OutputApk.StartsWith($buildRoot + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
    Remove-Item -LiteralPath $buildRoot -Recurse -Force
}
