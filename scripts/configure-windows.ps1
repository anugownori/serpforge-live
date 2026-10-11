# Creates private .env.local without echoing API key or putting it in source control.
$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $project '.env.local'
$exampleFile = Join-Path $project '.env.example'
if (-not (Test-Path $exampleFile)) { throw '.env.example not found.' }
if ((Test-Path $envFile) -and ((Get-Content $envFile -Raw) -match '(?m)^SERPAPI_KEY=[A-Za-z0-9_-]{32,160}\s*$')) {
  Write-Host 'Private SerpApi configuration already exists. No key needs to be pasted again.' -ForegroundColor Green
  exit 0
}
Write-Host 'Enter the SerpApi key from your account dashboard locally.' -ForegroundColor Cyan
Write-Host 'Do not paste keys into chat, GitHub, or screenshots.'
$secret = Read-Host 'SERPAPI_KEY (input hidden)' -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
try {
  $key = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  if ($key -notmatch '^[a-zA-Z0-9_-]{32,160}$') { throw 'Key appears empty or invalid. Nothing was saved.' }
  # Preserve other server settings when an environment file already exists.
  if (Test-Path $envFile) { $body = Get-Content $envFile -Raw }
  else { $body = Get-Content $exampleFile -Raw }
  if ($body -match '(?m)^SERPAPI_KEY=') {
    $body = $body -replace '(?m)^SERPAPI_KEY=.*$', "SERPAPI_KEY=$key"
  } else {
    $body = "SERPAPI_KEY=$key`r`n" + $body
  }
  # Restrict this configuration to the local machine and do not send it in source archives.
  [IO.File]::WriteAllText($envFile, $body, [Text.UTF8Encoding]::new($false))
  Write-Host 'Private .env.local created. This file is excluded by .gitignore and .dockerignore.' -ForegroundColor Green
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  Remove-Variable key -ErrorAction SilentlyContinue
}
