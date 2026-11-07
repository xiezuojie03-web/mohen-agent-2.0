# -*- coding: utf-8 -*-
"""M1 本地隔离身份链 provision：
1) 生成/复用 MOHEN_DATABASE_SESSION_SECRET（HMAC 验签 key，>=32 字符）；
2) 写入 control.session_verification_keys（key_slot=true，与 .env.local 一致）；
3) 追加私有原件存储开关到 .env.local（本地文件系统后端）。
secret 值绝不打印、绝不提交（.env.local 已 gitignored）。"""
import subprocess, secrets, os, sys

PSQL = "D:/MoHen/tools/PostgreSQL/18/bin/psql.exe"
ENV = ".env.local"

def read_env():
    d = {}
    if os.path.exists(ENV):
        for line in open(ENV, encoding="utf-8"):
            line = line.rstrip("\n")
            if "=" in line and not line.lstrip().startswith("#"):
                k, v = line.split("=", 1)
                d[k.strip()] = v.strip()
    return d

env = read_env()
url = env["DATABASE_URL"]

# 1) session secret：已有则复用，否则生成 64 hex（256-bit）
secret = env.get("MOHEN_DATABASE_SESSION_SECRET") or secrets.token_hex(32)
assert len(secret) >= 32

# 2) 写 DB session_verification_keys（key_slot=true 唯一）
sql = (
    "insert into control.session_verification_keys(key_slot,verification_key) values(true,'" +
    secret.replace("'", "''") + "') on conflict(key_slot) do update set verification_key=excluded.verification_key, provisioned_at=now();"
)
r = subprocess.run([PSQL, url, "-v", "ON_ERROR_STOP=1", "-c", sql],
                   capture_output=True, text=True, encoding="utf-8", errors="replace")
if r.returncode != 0:
    print("DB 写入失败:", (r.stderr or "")[-600:])
    sys.exit(1)

# 3) 追加/更新 .env.local（不打印 secret 值）
additions = {
    "MOHEN_DATABASE_SESSION_SECRET": secret,
    "MOHEN_PRIVATE_ORIGINAL_UPLOAD_ENABLED": "true",
    "MOHEN_PRIVATE_ORIGINAL_LOCAL_FS": "true",
    "MOHEN_PRIVATE_ORIGINAL_LOCAL_DIR": "D:/MoHen/data/private_originals",
}
lines = []
existing = set()
if os.path.exists(ENV):
    for line in open(ENV, encoding="utf-8"):
        line = line.rstrip("\n")
        if "=" in line and not line.lstrip().startswith("#"):
            existing.add(line.split("=", 1)[0].strip())
        lines.append(line)
    if lines and lines[-1] != "":
        lines.append("")
for k, v in additions.items():
    if k in existing:
        continue
    lines.append(f"{k}={v}")
    existing.add(k)
open(ENV, "w", encoding="utf-8").write("\n".join(lines) + "\n")

# 4) 校验（不打印值）
chk = subprocess.run([PSQL, url, "-t", "-A", "-c",
                      "select 'provisioned='||count(*) from control.session_verification_keys where key_slot=true;"],
                     capture_output=True, text=True, encoding="utf-8", errors="replace")
print(chk.stdout.strip())
print("DONE（secret 已写入 .env.local 与 DB，未打印）")
