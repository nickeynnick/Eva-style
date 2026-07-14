param(
    [Parameter(Mandatory=$true)]
    [string]$Token,
    
    [Parameter(Mandatory=$false)]
    [string]$Repo = "nickeynnick/Eva-style",
    
    [Parameter(Mandatory=$false)]
    [string]$Tag = "v1.2.4",
    
    [Parameter(Mandatory=$false)]
    [string]$InstallerPath = "release\eva-style-setup-1.2.4.exe",
    
    [Parameter(Mandatory=$false)]
    [string]$PortablePath = "release\eva-style-1.2.4-portable.exe"
)

$ErrorActionPreference = "Stop"

$notes = @"
## Ева-стиль 1.2.4

См. release-notes.md в корне репозитория.

## Файлы
- `eva-style-setup-1.2.4.exe` — установщик (NSIS)
- `eva-style-1.2.4-portable.exe` — портативная версия
"@

$headers = @{
    "Authorization" = "Bearer $Token"
    "Accept" = "application/vnd.github+json"
}

Write-Host "Creating release $Tag ..." -ForegroundColor Cyan

# Create the release
$body = @{
    tag_name = $Tag
    name = $Tag
    body = $notes
    draft = $false
    prerelease = $false
} | ConvertTo-Json

$release = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases" `
    -Method Post `
    -Headers $headers `
    -Body $body `
    -ContentType "application/json"

$releaseId = $release.id
$uploadUrl = $release.upload_url -replace '\{.*\}', ''
Write-Host "Release created (ID: $releaseId). Uploading assets..." -ForegroundColor Cyan

# Upload installer
Write-Host "Uploading installer..." -ForegroundColor Cyan
$installerName = Split-Path $InstallerPath -Leaf
$installerContentType = "application/vnd.microsoft.portable-executable"
Invoke-RestMethod -Uri "$uploadUrl`?name=$installerName" `
    -Method Post `
    -Headers $headers `
    -ContentType $installerContentType `
    -InFile (Resolve-Path $InstallerPath)

# Upload portable
Write-Host "Uploading portable version..." -ForegroundColor Cyan
$portableName = Split-Path $PortablePath -Leaf
Invoke-RestMethod -Uri "$uploadUrl`?name=$portableName" `
    -Method Post `
    -Headers $headers `
    -ContentType $installerContentType `
    -InFile (Resolve-Path $PortablePath)

Write-Host "`nDone! Release created: https://github.com/$Repo/releases/tags/$Tag" -ForegroundColor Green
