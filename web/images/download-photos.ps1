# Saves the website photos into this folder so the site doesn't depend on the remote image host.
# Run from the repository root in PowerShell:  .\web\images\download-photos.ps1
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Get-Content (Join-Path $here 'photos.txt') | ForEach-Object {
  $file, $url = $_ -split ' ', 2
  if ($file -and $url) {
    Write-Host "Downloading $file"
    Invoke-WebRequest -Uri $url -OutFile (Join-Path $here $file)
  }
}
Write-Host 'Done.'
