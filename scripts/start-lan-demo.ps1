# Native Windows LAN Demo launcher for SafarRent (No Docker required).
# Prerequisites:
#   1. Native MongoDB Community service running with replica set rs0 (mongodb://127.0.0.1:27017/safarrent?replicaSet=rs0)
#   2. Native Ollama for Windows running on http://127.0.0.1:11434 with model qwen3:0.6b
#   3. Node.js LTS installed natively on Windows

[CmdletBinding()]
param(
  [Parameter()]
  [string]$LanHost,

  [Parameter()]
  [switch]$Launch
)

$ErrorActionPreference = 'Stop'

if (-not $LanHost) {
  $interfaces = [System.Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces() |
    Where-Object { $_.OperationalStatus -eq [System.Net.NetworkInformation.OperationalStatus]::Up -and $_.NetworkInterfaceType -in @([System.Net.NetworkInformation.OperationalStatus]::Up, [System.Net.NetworkInformation.NetworkInterfaceType]::Wireless80211, [System.Net.NetworkInformation.NetworkInterfaceType]::Ethernet) }
  foreach ($interface in $interfaces) {
    $properties = $interface.GetIPProperties()
    if (-not ($properties.GatewayAddresses | Where-Object { $_.Address.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork })) {
      continue
    }
    $candidate = $properties.UnicastAddresses |
      Where-Object { $_.Address.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork -and -not [System.Net.IPAddress]::IsLoopback($_.Address) -and $_.Address.ToString() -notlike '169.254.*' } |
      Select-Object -First 1 -ExpandProperty Address
    if ($candidate) {
      $LanHost = $candidate.ToString()
      break
    }
  }
}

if (-not $LanHost) {
  throw 'Could not detect a local network IPv4 address. Run again with -LanHost <your-computer-ip>.'
}

$parsedAddress = $null
if (-not [System.Net.IPAddress]::TryParse($LanHost, [ref]$parsedAddress) -or $parsedAddress.AddressFamily -ne [System.Net.Sockets.AddressFamily]::InterNetwork) {
  throw "LanHost must be an IPv4 address, received '$LanHost'."
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   SafarRent Native Windows LAN Demo (FYP Architecture)  " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Local IPv4:       $LanHost"
Write-Host "MongoDB:          mongodb://127.0.0.1:27017/safarrent?replicaSet=rs0"
Write-Host "Native Ollama:    http://127.0.0.1:11434 (model: qwen3:0.6b)"
Write-Host "Customer App:     http://${LanHost}:8080"
Write-Host "Operations Portal:http://${LanHost}:3001"
Write-Host "Backend API:      http://${LanHost}:4002"
Write-Host "----------------------------------------------------------"

if ($Launch) {
  Write-Host "Spawning native Windows services in separate windows..." -ForegroundColor Yellow

  # 1. Backend
  $backendCmd = "Set-Location '$repoRoot\backend'; `$env:NODE_ENV='development'; `$env:BC_ENABLE_FYP_DEMO='true'; `$env:BC_ADMIN_HOST='http://${LanHost}:3001/'; `$env:BC_FRONTEND_HOST='http://${LanHost}:8080/'; npm run dev"
  Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd

  # 2. Frontend
  $frontendCmd = "Set-Location '$repoRoot\frontend'; `$env:VITE_BC_API_HOST='http://${LanHost}:4002'; .\node_modules\.bin\vite.cmd --host 0.0.0.0 --port 8080 --strictPort"
  Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd

  # 3. Admin
  $adminCmd = "Set-Location '$repoRoot\admin'; `$env:VITE_BC_API_HOST='http://${LanHost}:4002'; .\node_modules\.bin\vite.cmd --host 0.0.0.0 --port 3001 --strictPort"
  Start-Process powershell -ArgumentList "-NoExit", "-Command", $adminCmd

  Write-Host "All 3 services launched in separate windows." -ForegroundColor Green
} else {
  Write-Host "To start the three native services manually, run in separate terminals:" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "  Terminal A (Backend API, port 4002):" -ForegroundColor White
  Write-Host "    npm --prefix backend run dev" -ForegroundColor Gray
  Write-Host ""
  Write-Host "  Terminal B (Customer App, port 8080):" -ForegroundColor White
  Write-Host "    `$env:VITE_BC_API_HOST='http://${LanHost}:4002'; npm --prefix frontend run dev" -ForegroundColor Gray
  Write-Host ""
  Write-Host "  Terminal C (Operations Portal, port 3001):" -ForegroundColor White
  Write-Host "    `$env:VITE_BC_API_HOST='http://${LanHost}:4002'; npm --prefix admin run dev" -ForegroundColor Gray
  Write-Host ""
  Write-Host "Or pass -Launch to start all 3 native PowerShell windows automatically:" -ForegroundColor Cyan
  Write-Host "    .\scripts\start-lan-demo.ps1 -Launch" -ForegroundColor Cyan
}

Write-Host "----------------------------------------------------------"
Write-Host "Use these URLs from any phone or laptop on the same Wi-Fi."
