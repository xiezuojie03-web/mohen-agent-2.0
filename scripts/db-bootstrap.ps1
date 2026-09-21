# db-bootstrap.ps1 — TASK-0003 bootstrap（超级用户环境前置）
#
# 职责：首次搭建本地 PostgreSQL 真源的环境前置：
#   - 确保 pgcrypto 扩展存在（trusted extension，DB owner 亦可建）
#   - 确保最小权限角色 mohen_app 存在（仅首次需要超级用户）
#   - 确保 mohen_dev / mohen_test 库存在并归属 mohen_app
#
# 不硬编码任何密码；密码来自：
#   1) 环境变量 $env:MOHEN_SUPERUSER_PASSWORD（本机安全环境），或
#   2) 交互输入（Read-Host -AsSecureString，不回显、不落盘）。
#
# 日常可复现重建（fresh DB → migrate → verify）由 mohen_app 即可完成，
# 见 db-apply.ps1 / db-verify.ps1（mohen_app 拥有 createdb 权限且 pgcrypto 为 trusted）。

param(
  [string]$Superuser = 'postgres',
  [string]$HostName = '127.0.0.1',
  [int]$Port = 5432,
  [string]$AppRole = 'mohen_app',
  [string]$AppPassword = $env:MOHEN_APP_PASSWORD,
  [string]$PsqlPath = 'D:\MoHen\tools\PostgreSQL\18\bin\psql.exe'
)

$ErrorActionPreference = 'Stop'
if (-not (Test-Path $PsqlPath)) { throw "psql not found at $PsqlPath" }

# 超级用户密码：交互或环境变量；绝不回显。
$superPw = $env:MOHEN_SUPERUSER_PASSWORD
if (-not $superPw) {
  $sec = Read-Host -Prompt "Enter PostgreSQL superuser '$Superuser' password" -AsSecureString
  $superPw = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
}
$env:PGPASSWORD = $superPw

$bootSql = "do `$\`$ begin" + `
  "  if not exists (select 1 from pg_extension where extname='pgcrypto') then" + `
  "    create extension if not exists pgcrypto;" + `
  "  end if;" + `
  "  if not exists (select 1 from pg_roles where rolname='$AppRole') then" + `
  "    execute format('create role $AppRole with login password %L', '$AppPassword');" + `
  "  end if;" + `
  "  if not exists (select 1 from pg_database where datname='mohen_dev') then" + `
  "    execute 'create database mohen_dev owner $AppRole';" + `
  "  end if;" + `
  "  if not exists (select 1 from pg_database where datname='mohen_test') then" + `
  "    execute 'create database mohen_test owner $AppRole';" + `
  "  end if;" + `
  "end; `$\`$;"

Write-Host "bootstrap: extension + role + databases (idempotent)..."
& $PsqlPath -h $HostName -p $Port -U $Superuser -d postgres -v ON_ERROR_STOP=1 -c $bootSql
if ($LASTEXITCODE -ne 0) { throw "bootstrap failed" }

Write-Host "bootstrap: grant privileges..."
$grantSql = "grant all privileges on database mohen_dev to $AppRole; grant all privileges on database mohen_test to $AppRole;"
& $PsqlPath -h $HostName -p $Port -U $Superuser -d postgres -v ON_ERROR_STOP=1 -c $grantSql
if ($LASTEXITCODE -ne 0) { throw "grant failed" }

Write-Host "BOOTSTRAP OK"
