# db-verify.ps1 — 验证核心对象与 Evidence Gate（受控对照实证）。
#
# 连接信息来自本机安全环境 .env.local；由 mohen_app 即可运行。
#
# 设计要点（为什么要「受控对照」而不是只看报错文本）：
#   PowerShell 5.1 捕获原生命令 stderr 不可靠（会转成 ErrorRecord 或直接打到宿主），
#   因此不依赖解析错误文本。改为：**同一行数据只改变一个变量**（status / tier），
#   对照组必须成功、实验组必须失败 —— 成败之差即证明「是门禁生效」，而不是外键或
#   NOT NULL 等其它约束造成的假阳性。
#
# 验证项：
#   1) 4 张 Data Factory 新表 + 2 个 Gate 触发器存在；
#   2) G-invariant：无 evidence 时，claim 置 candidate 成功 / 置 published 失败；
#   3) 阳性对照：挂上 evidence 后，同一 claim 置 published 成功（门禁不是一律拒绝）；
#   4) Tier C：置 pending 成功 / 置 approved 失败（不得自动通过）；
#   5) Tier A：置 approved 成功。
# 所有探针在事务内回滚，不产生脏数据。
#
# 注意（Windows PowerShell 5.1 坑）：
#   - 本文件必须保存为 UTF-8 **带 BOM**，否则中文注释会被按 ANSI 解码导致解析失败；
#   - 原生命令写 stderr 时 ErrorActionPreference=Stop 会直接终止脚本，故调用处临时降级。

param(
  [string]$PsqlPath = 'D:\MoHen\tools\PostgreSQL\18\bin\psql.exe'
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
if (-not $env:DATABASE_URL) { throw "DATABASE_URL 未设置" }
if ($env:DATABASE_URL -match '://[^:]+:([^@]+)@') { $env:PGPASSWORD = $matches[1] }
$env:PGCLIENTENCODING = 'UTF8'

$fail = $false

# 执行 SQL，返回退出码。临时降级 ErrorActionPreference，避免 psql 写 stderr 时终止脚本。
function Invoke-Sql {
  param([string]$Sql, [string[]]$Extra)
  $prev = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $argList = @('-v', 'ON_ERROR_STOP=1')
    if ($Extra) { $argList += $Extra }
    $argList += @('-c', $Sql, $env:DATABASE_URL)
    & $PsqlPath @argList | Out-Null
    return $LASTEXITCODE
  }
  finally { $ErrorActionPreference = $prev }
}

function Assert-Expect {
  param([string]$Name, [int]$Exit, [int]$Expected)
  if ($Exit -eq $Expected) { Write-Host "PASS: $Name" }
  else { Write-Host "FAIL: $Name (exit=$Exit, expected=$Expected)"; $script:fail = $true }
}

# 1) 表 + 触发器存在性
Write-Host "== verify: objects =="
$chk = "select (select count(*) from information_schema.tables where table_schema='public' and table_name in ('ingest_runs','review_queue','legacy_mappings','evidence_gate_audit')) as new_tables, (select count(distinct trigger_name) from information_schema.triggers where trigger_schema='public' and trigger_name in ('claims_require_evidence','review_queue_tier_c_guard')) as gates;"
$prevEap = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
$objOut = (& $PsqlPath -t -A -c $chk $env:DATABASE_URL | Out-String)
$ErrorActionPreference = $prevEap
$parts = $objOut.Trim().Split('|')
if ($parts[0].Trim() -ne '4') { Write-Host "FAIL: expected 4 new tables, got $($parts[0])"; $fail = $true }
else { Write-Host "PASS: 4 new tables present" }
if ($parts[1].Trim() -ne '2') { Write-Host "FAIL: expected 2 gate triggers, got $($parts[1])"; $fail = $true }
else { Write-Host "PASS: 2 gate triggers present" }

# 2) G-invariant 受控对照：同一行，只改 status
#    2a 对照组：status='candidate' 必须成功（证明外键/NOT NULL 都已满足，排除假阳性）
#
# 关键：claims_require_evidence 是 **deferrable initially deferred**（提交时才检查）。
# 若探针以 rollback 结束，延迟触发器根本不会触发，会造成「门禁没生效」的假象。
# 因此在 rollback 前先 set constraints all immediate 强制检查，同时仍回滚不留脏数据。
Write-Host "== verify: G-invariant (no evidence -> no publish) =="
$base = @"
begin;
insert into entities(entity_type,canonical_name,status) values ('probe','verify-probe-entity','candidate');
insert into source_records(provider,title,content_type,checksum,raw_path)
  values ('probe','verify-probe-source','text','probe-checksum','probe://raw');
insert into claims(subject_id,predicate,certainty,status,review_tier)
  select e.entity_id,'probe-no-evidence',0.5,'STATUS_HERE','C'
  from entities e where e.canonical_name='verify-probe-entity';
set constraints all immediate;
rollback;
"@
$e1 = Invoke-Sql ($base -replace 'STATUS_HERE', 'candidate')
Assert-Expect "control: claim WITHOUT evidence -> status=candidate allowed" $e1 0

#    2b 实验组：status='published' 必须失败（唯一差异是 published → 即门禁拦截）
$e2 = Invoke-Sql ($base -replace 'STATUS_HERE', 'published')
if ($e2 -ne 0) { Write-Host "PASS: claim WITHOUT evidence -> status=published rejected (by evidence gate)" }
else { Write-Host "FAIL: published claim without evidence was allowed"; $fail = $true }

# 3) 阳性对照：同一行挂上 evidence 后，published 必须成功（证明门禁不是一律拒绝）
Write-Host "== verify: positive control (claim WITH evidence -> published allowed) =="
$e3 = Invoke-Sql @"
begin;
insert into entities(entity_type,canonical_name,status) values ('probe','verify-probe-entity','candidate');
insert into source_records(provider,title,content_type,checksum,raw_path)
  values ('probe','verify-probe-source','text','probe-checksum','probe://raw');
insert into evidence(source_id,evidence_type,locator,extraction_method,confidence,verification_status)
  select source_id,'text','probe://locator','probe',0,'candidate'
  from source_records where title='verify-probe-source';
insert into claims(subject_id,predicate,certainty,status,review_tier)
  select e.entity_id,'probe-with-evidence',0.5,'published','C'
  from entities e where e.canonical_name='verify-probe-entity';
insert into claim_evidence(claim_id,evidence_id,support_type)
  select c.claim_id, ev.evidence_id,'supports'
  from claims c join evidence ev on ev.locator='probe://locator'
  where c.predicate='probe-with-evidence';
set constraints all immediate;
rollback;
"@
Assert-Expect "claim WITH evidence -> published allowed" $e3 0

# 4) Tier C 受控对照：pending 成功 / approved 失败
Write-Host "== verify: Tier C cannot auto-approve =="
$e4 = Invoke-Sql "begin; insert into review_queue(object_type,object_id,review_tier,status) values ('entity','probe-c','C','pending'); rollback;"
Assert-Expect "control: Tier C -> pending allowed" $e4 0
$e5 = Invoke-Sql "begin; insert into review_queue(object_type,object_id,review_tier,status) values ('entity','probe-c','C','approved'); rollback;"
if ($e5 -ne 0) { Write-Host "PASS: Tier C -> approved rejected (by tier guard)" }
else { Write-Host "FAIL: Tier C auto-approve was allowed"; $fail = $true }

# 5) Tier A 可自动 approved
Write-Host "== verify: Tier A can auto-approve =="
$e6 = Invoke-Sql "begin; insert into review_queue(object_type,object_id,review_tier,status) values ('entity','probe-a','A','approved'); rollback;"
Assert-Expect "Tier A -> approved allowed" $e6 0

if ($fail) { Write-Host "VERIFY FAILED"; exit 1 } else { Write-Host "VERIFY OK" }
