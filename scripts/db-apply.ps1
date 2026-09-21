# db-apply.ps1 — 顺序应用已提交 migration 到 DATABASE_URL 指定的库。
#
# 连接信息来自本机安全环境 .env.local（gitignored）：读取 DATABASE_URL 并从中
# 提取密码写入 $env:PGPASSWORD（不回显、不落盘、不提交）。
# 由 mohen_app 即可运行（拥有目标库，可建表；pgcrypto 为 trusted extension）。

param(
  [string]$PsqlPath = 'D:\MoHen\tools\PostgreSQL\18\bin\psql.exe',
  [string]$MigrationsDir = 'supabase/migrations'
)

$ErrorActionPreference = 'Stop'

function Load-DotEnv {
  param([string]$Path)
  if (Test-Path $Path) {
    $text = (Get-Content $Path -Raw) -replace '^\xEF\xBB\xBF', ''
    $text -split "`n" | ForEach-Object {
      if ($_ -match '^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$') {
        $k = $matches[1]; $v = $matches[2].Trim('"').Trim("'")
        if (-not (Test-Path "env:$k")) { Set-Item -Path "env:$k" -Value $v }
      }
    }
  }
}

$root = Resolve-Path (Join-Path $PSScriptRoot '..')
Load-DotEnv -Path (Join-Path $root '.env.local')
Load-DotEnv -Path (Join-Path $root '.env')

if (-not $env:DATABASE_URL) { throw "DATABASE_URL 未设置（请在 .env.local 或环境变量中提供）" }
if ($env:DATABASE_URL -match '://[^:]+:([^@]+)@') { $env:PGPASSWORD = $matches[1] }
$env:PGCLIENTENCODING = 'UTF8'

# 输出目标库时屏蔽凭据：只显示 user/host/port/db，密码绝不打印。
# 注意：用字符串拼接而非插值——双引号里的 "@$" 会被解析为展开运算符，导致脚本语法错误。
function Get-MaskedTarget {
  param([string]$Url)
  if ($Url -match '^postgresql://([^:]+):[^@]+@([^:/]+)(?::(\d+))?/(\S+)$') {
    $u = $matches[1]
    $h = $matches[2]
    $port = $matches[3]
    $db = $matches[4]
    if (-not $port) { $port = '5432' }
    return ($u + '@' + $h + ':' + $port + '/' + $db)
  }
  return "(masked)"
}

$migDir = Join-Path $root $MigrationsDir
$files = Get-ChildItem -Path $migDir -Filter '*.sql' | Sort-Object Name
Write-Host "Applying $($files.Count) migrations to $(Get-MaskedTarget $env:DATABASE_URL)"
foreach ($f in $files) {
  Write-Host "  -> $($f.Name)"
  & $PsqlPath -v ON_ERROR_STOP=1 -f $f.FullName $env:DATABASE_URL
  if ($LASTEXITCODE -ne 0) { throw "migration failed: $($f.Name)" }
}
Write-Host "APPLY OK"
