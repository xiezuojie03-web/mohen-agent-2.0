# -*- coding: utf-8 -*-
"""1.9 撤权拒绝验证：无有效 session token 时，RLS 应拒绝访问私有原件。"""
import subprocess

PSQL = "D:/MoHen/tools/PostgreSQL/18/bin/psql.exe"
line = [l for l in open(".env.local", encoding="utf-8") if l.startswith("DATABASE_URL=")][0]
url = line.split("=", 1)[1].strip()

def run(sql):
    r = subprocess.run([PSQL, url, "-t", "-A", "-c", sql], capture_output=True, text=True, encoding="utf-8", errors="replace")
    return r.stdout, r.stderr

# 正例：postgres 超级用户（绕过 RLS）能看到 2 个私有原件
out, err = run("select count(*) from studio.private_originals where original_id::text like 'b0a11000%';")
print("正例(超级用户)私有原件数:", out.strip())

# 负例：SET ROLE mohen_app_runtime（非超用户），无 session_token → current_app_user_id=null → RLS 拒绝
out, err = run("set role mohen_app_runtime; select count(*) from studio.private_originals where original_id::text like 'b0a11000%'; reset role;")
print("负例(无身份 mohen_app_runtime)私有原件数:", out.strip(), err.strip()[:200])

# 负例2：无身份的 material_evidence（跨 Owner 应拒绝，但 material_evidence 可能无 RLS）
out, err = run("set role mohen_app_runtime; select count(*) from evidence.material_evidence where evidence_id::text like 'b0a11000%'; reset role;")
print("负例(material_evidence 无身份)行数:", out.strip(), err.strip()[:200])
