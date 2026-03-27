param(
    [string]$AppId = "d3pbfqt9mklwfw",
    [string]$Branch = "staging",
    [string]$Region = "us-west-2",
    [string]$Profile = "lac-customer"
)

$BuildDir = "$PSScriptRoot\build"
$ZipPath = "$PSScriptRoot\build.zip"

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
$deploy = aws amplify create-deployment --app-id $AppId --branch-name $Branch --region $Region --profile $Profile | ConvertFrom-Json
$jobId = $deploy.jobId
$uploadUrl = $deploy.zipUploadUrl
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
