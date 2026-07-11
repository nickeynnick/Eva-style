param(
    [string]$Repo = "nickeynnick/Eva-style",
    [string]$Tag = "v1.2.1"
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

$credInput = "protocol=https`nhost=github.com`n`n"
$credOutput = $credInput | git credential fill
$token = ($credOutput | Where-Object { $_ -match '^password=' }) -replace '^password=', ''

$headers = @{
    Authorization = "Bearer $token"
    Accept = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
}

try {
    $existing = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/tags/$Tag" -Headers $headers
    if ($existing.id) {
        Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/$($existing.id)" -Method Delete -Headers $headers
        Write-Host "Deleted old release"
    }
} catch {
    Write-Host "No existing release to delete"
}

$version = $Tag -replace '^v', ''
$notes = [System.IO.File]::ReadAllText((Join-Path $projectRoot "release-notes.md"), [System.Text.Encoding]::UTF8)
$payload = [ordered]@{
    tag_name = $Tag
    name = $version
    body = $notes
    draft = $false
    prerelease = $false
}
$body = $payload | ConvertTo-Json -Depth 3

$release = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases" -Method Post -Headers $headers -Body $body -ContentType "application/json; charset=utf-8"
Write-Host "Created release ID: $($release.id)"

$assets = @(
    @{ Path = (Join-Path $projectRoot "release\eva-style-setup-$version.exe"); Name = "eva-style-setup-$version.exe"; Type = "application/octet-stream" },
    @{ Path = (Join-Path $projectRoot "release\eva-style-$version-portable.exe"); Name = "eva-style-$version-portable.exe"; Type = "application/octet-stream" },
    @{ Path = (Join-Path $projectRoot "release\latest.yml"); Name = "latest.yml"; Type = "text/yaml" }
)

foreach ($asset in $assets) {
    $filePath = (Resolve-Path $asset.Path).Path
    $uploadUrl = "https://uploads.github.com/repos/$Repo/releases/$($release.id)/assets?name=$([uri]::EscapeDataString($asset.Name))"
    Invoke-RestMethod -Uri $uploadUrl -Method Post -Headers $headers -ContentType $asset.Type -InFile $filePath
    Write-Host "Uploaded: $($asset.Name)"
}

Write-Host "Release URL: $($release.html_url)"
