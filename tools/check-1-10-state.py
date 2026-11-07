# -*- coding: utf-8 -*-
"""1.10 前置状态查询：session 验签链 / 私有原件 / 角色 / 用户。"""
import subprocess, sys
PSQL = "D:/MoHen/tools/PostgreSQL/18/bin/psql.exe"
line = [l for l in open(".env.local", encoding="utf-8") if l.startswith("DATABASE_URL=")][0]
url = line.split("=", 1)[1].strip()

sql = """
select 'KEYS' as item, count(*)::text as val from control.session_verification_keys
union all select 'PGCRYPTO', count(*)::text from pg_extension where extname='pgcrypto'
union all select 'ROLE_'||rolname, 'present' from pg_roles where rolname in ('mohen_app_runtime','mohen_producer','mohen_gate_signer','anon','authenticated','service_role')
union all select 'ORIGINAL_'||original_id::text||'_'||state, byte_size::text||' sha='||left(sha256,12) from studio.private_originals
union all select 'USER_'||user_id::text, coalesce(email,'')||' roles='||roles::text||' status='||status from public.users
order by 1;
"""
r = subprocess.run([PSQL, url, "-v", "ON_ERROR_STOP=1", "-c", sql],
                   capture_output=True, text=True, encoding="utf-8", errors="replace")
print(r.stdout)
if r.returncode != 0:
    print("STDERR:", (r.stderr or "")[-800:])
    sys.exit(1)
