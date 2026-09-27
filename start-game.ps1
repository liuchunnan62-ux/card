$gameRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$indexPath = Join-Path $gameRoot "index.html"
Start-Process -FilePath $indexPath
