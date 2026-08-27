$ErrorActionPreference = 'Stop';
$toolsDir   = $(Split-Path -parent $MyInvocation.MyCommand.Definition)
$fileLocation = Join-Path $toolsDir 'novaterm.msi'

$packageArgs = @{
  packageName   = 'novaterm'
  fileType      = 'msi'
  file          = $fileLocation
  silentArgs    = "/qn /norestart"
  validExitCodes= @(0, 3010, 1641, 2359302)
}

Install-ChocolateyInstallPackage @packageArgs
