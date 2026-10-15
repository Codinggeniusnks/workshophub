# Compiles WorkshopHub.exe from desktop/Launcher.cs using Windows built-in csc.exe
$csc = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path $csc)) {
    Write-Error "Microsoft .NET C# compiler not found at $csc"
    exit 1
}

$output = "WorkshopHub.exe"
Write-Host "Compiling $output..."
& $csc /target:winexe /optimize+ /out:$output desktop\Launcher.cs

if ($LASTEXITCODE -eq 0) {
    Write-Host "Build successful: $output ($( (Get-Item $output).Length ) bytes)" -ForegroundColor Green
} else {
    Write-Error "Build failed with exit code $LASTEXITCODE"
}
