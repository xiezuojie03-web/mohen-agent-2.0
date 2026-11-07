# -*- coding: utf-8 -*-
"""第1步施工：补建 Supabase 默认角色 + 应用 M2 studio/私有原件迁移（本地隔离环境）。"""
import subprocess

PSQL = "D:/MoHen/tools/PostgreSQL/18/bin/psql.exe"
line = [l for l in open(".env.local", encoding="utf-8") if l.startswith("DATABASE_URL=")][0]
url = line.split("=", 1)[1].strip()

def run(sql=None, file=None):
    args = [PSQL, url, "-v", "ON_ERROR_STOP=1"]
    if sql:
        args += ["-c", sql]
    if file:
        args += ["-f", file]
    r = subprocess.run(args, capture_output=True, text=True)
    return r.returncode, r.stdout, r.stderr

# 1) 补建角色
create_roles = """
do $$
begin
  if not exists(select from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists(select from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists(select from pg_roles where rolname='service_role') then create role service_role nologin; end if;
end $$;
"""
code, out, err = run(sql=create_roles)
print("创建角色:", "OK" if code == 0 else "FAIL", err.strip()[:200])

# 2) 应用三个 M2 迁移
for m in [
    "20261102140000_mab_m2_private_originals.sql",
    "20261102145410_mab_m2_evidence_bridge.sql",
    "20261103143451_mab_m2_private_text_reading.sql",
]:
    code, out, err = run(file=f"supabase/migrations/{m}")
    print(f"{m}: {'OK' if code == 0 else 'FAIL'}", (err or out).strip()[:200])

# 3) 验证 studio 表
code, out, err = run(sql="select tablename from pg_tables where schemaname='studio' order by 1;")
print("=== studio schema 表 ===")
print(out)
