# -*- coding: utf-8 -*-
"""应用 M3 缺失迁移 20261103234154（gate_service_credentials + authenticate_gate_service + mohen_gate_reader）。"""
import subprocess, sys
PSQL = "D:/MoHen/tools/PostgreSQL/18/bin/psql.exe"
line = [l for l in open(".env.local", encoding="utf-8") if l.startswith("DATABASE_URL=")][0]
url = line.split("=", 1)[1].strip()

migration = "supabase/migrations/20261103234154_mab_m3_gate_service_auth.sql"
r = subprocess.run([PSQL, url, "-v", "ON_ERROR_STOP=1", "-f", migration],
                   capture_output=True, text=True, encoding="utf-8", errors="replace")
print("EXIT", r.returncode)
if r.returncode != 0:
    print("STDERR:", (r.stderr or "")[-1500:])
    sys.exit(1)
print("应用成功")
# 验证
chk = subprocess.run([PSQL, url, "-t", "-A", "-c",
    "select 'reader_role='||count(*) from pg_roles where rolname='mohen_gate_reader';"
    "select 'cred_table='||(to_regclass('control.gate_service_credentials') is not null)::text;"
    "select 'auth_fn='||count(*) from pg_proc where proname='authenticate_gate_service';"],
    capture_output=True, text=True, encoding="utf-8", errors="replace")
print(chk.stdout)
