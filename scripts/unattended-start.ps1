# scripts/unattended-start.ps1 — 无人值守生产启动入口（三道闸齐备后启动 runner）
#
# 为什么需要它：直接在命令行里设 $env:MOHEN_WRITE_ENABLED 再起后台进程时，
# 嵌套引号经常把值变成字面量 'true'，runner 判断 `=== "true"` 失败 → 静默降级为 DRY_RUN
# （跑一整夜却一行没写）。本脚本把环境变量与启动动作固化在一处，避免这个陷阱。
#
# 用法：
#   powershell -File scripts/unattended-start.ps1 -Until 06:00 -IntervalMin 2
#   powershell -File scripts/unattended-start.ps1 -Until 06:00 -IntervalMin 2 -Tag UNATTENDED-20261003
#
# 产物：tasks/results/<Tag>/（runner.log · progress.json · result.md · report.html）
# 停止：在 tasks/results/<Tag>/ 下创建 STOP 文件即可（runner 每个周期检查）
param(
  [string]$Until = "06:00",
  [double]$IntervalMin = 2,
  [string]$Tag = "",
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $root

# 三道闸：写开关 + 环境（data-access 自行从 .env.local 取 DATABASE_URL）
if ($DryRun) {
  $env:MOHEN_WRITE_ENABLED = "false"
} else {
  $env:MOHEN_WRITE_ENABLED = "true"
}
$env:MOHEN_ENV = "dev"
$env:PGCLIENTENCODING = "UTF8"

if (-not $Tag) { $Tag = "UNATTENDED-" + (Get-Date).ToString("yyyyMMdd") }

Write-Host "UNATTENDED_START mode=$(if($DryRun){'DRY_RUN'}else{'WRITE'}) env=$($env:MOHEN_ENV) until=$Until interval=$IntervalMin tag=$Tag"
node pipelines/legacy/unattended-runner.mjs --until $Until --interval-min $IntervalMin --tag $Tag
Write-Host "UNATTENDED_EXIT exit=$LASTEXITCODE"
