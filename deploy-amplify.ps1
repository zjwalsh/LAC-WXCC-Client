param(
    [string]$AppId = "d3pbfqt9mklwfw",
    [string]$Branch = "staging",
    [string]$Region = "us-west-2",
    [string]$Profile = "lac-customer"
)

$BuildDir = "$PSScriptRoot\build"
$ZipPath = "$PSScriptRoot\build.zip"

Write-Host "Creating stable bundle filenames..."
$jsBundle = Get-Item "$BuildDir\static\js\main.*.js" | Where-Object { $_.Name -notlike "*.map" -and $_.Name -notlike "*.LICENSE.txt" } | Select-Object -First 1
$cssBundle = Get-Item "$BuildDir\static\css\main.*.css" | Where-Object { $_.Name -notlike "*.map" } | Select-Object -First 1
if (-not $jsBundle) { Write-Error "Could not find main.*.js in $BuildDir\static\js"; exit 1 }
if (-not $cssBundle) { Write-Error "Could not find main.*.css in $BuildDir\static\css"; exit 1 }
Copy-Item $jsBundle.FullName "$BuildDir\static\js\widget.bundle.js" -Force
Copy-Item $cssBundle.FullName "$BuildDir\static\css\widget.styles.css" -Force
Write-Host "Copied $($jsBundle.Name) -> widget.bundle.js"
Write-Host "Copied $($cssBundle.Name) -> widget.styles.css"

Write-Host "Creating zip with correct forward-slash paths..."
Remove-Item $ZipPath -ErrorAction SilentlyContinue
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression

$zip = [System.IO.Compression.ZipFile]::Open($ZipPath, 'Create')
Get-ChildItem -Path $BuildDir -Recurse -File | ForEach-Object {
    $relativePath = $_.FullName.Substring($BuildDir.Length + 1).Replace('\', '/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $relativePath) | Out-Null
}
$zip.Dispose()
Write-Host "Zip created: $ZipPath"

Write-Host "Creating Amplify deployment..."
$deployRaw = aws amplify create-deployment --app-id $AppId --branch-name $Branch --region $Region --profile $Profile
Write-Host "Raw response: $deployRaw"
$deploy = $deployRaw | ConvertFrom-Json
$jobId = $deploy.jobId
$uploadUrl = $deploy.zipUploadUrl
if (-not $uploadUrl) { Write-Error "zipUploadUrl is null. Check the raw response above."; exit 1 }
Write-Host "Job ID: $jobId"

Write-Host "Uploading zip..."
Invoke-WebRequest -Uri $uploadUrl -Method PUT -InFile $ZipPath -ContentType "application/zip"

Write-Host "Starting deployment..."
aws amplify start-deployment --app-id $AppId --branch-name $Branch --job-id $jobId --region $Region --profile $Profile

Write-Host "Done. Monitoring job $jobId..."
do {
    Start-Sleep -Seconds 5
    $job = aws amplify get-job --app-id $AppId --branch-name $Branch --job-id $jobId --region $Region --profile $Profile | ConvertFrom-Json
    Write-Host "Status: $($job.job.summary.status)"
} while ($job.job.summary.status -eq "PENDING" -or $job.job.summary.status -eq "RUNNING")

Write-Host "Final status: $($job.job.summary.status)"
