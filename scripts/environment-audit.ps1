$ErrorActionPreference = "SilentlyContinue"
Write-Output "=== MoHen Environment Audit (read-only) ==="
Write-Output ("OS: " + (Get-CimInstance Win32_OperatingSystem).Caption)
$ram = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 1)
Write-Output ("RAM_GB: " + $ram)
Get-PSDrive -PSProvider FileSystem | ForEach-Object {
  Write-Output ("DRIVE {0}: free={1}GB used={2}GB" -f $_.Name,
    [math]::Round($_.Free/1GB,1), [math]::Round($_.Used/1GB,1))
}
foreach($cmd in @("git","node","pnpm","docker","psql")) {
  $found = Get-Command $cmd -ErrorAction SilentlyContinue
  if($found){ Write-Output ("FOUND " + $cmd + ": " + $found.Source) }
  else { Write-Output ("MISSING " + $cmd) }
}
Write-Output "No files were modified by this audit."
