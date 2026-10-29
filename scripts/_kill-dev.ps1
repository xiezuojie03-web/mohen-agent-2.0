$c = Get-NetTCPConnection -LocalPort 3100 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($c) {
    Write-Output ("PID=" + $c.OwningProcess)
    Stop-Process -Id $c.OwningProcess -Force
    Write-Output "KILLED"
} else {
    Write-Output "NO_LISTENER"
}
