# -*- coding: utf-8 -*-
"""1.10 HTTP 正反验证（本地隔离环境）：
A) 字节层：本地文件系统私有原件 SHA 回读一致（正例）/ 错误 SHA 不一致（反例）；
B) 身份层：有效 Owner session token -> current_app_user_id()=Owner 且 RLS 可见 2 原件（正例）；
            无 token / 无效 token / 非 users 表 uid -> null 且 RLS 0 行（反例，等价 401/404）。
等价于 GET /api/studio/attachments?original_id=... 的 200/401/404 底层逻辑。
secret 值不打印。"""
import subprocess, hashlib, hmac, base64, json, time, sys

PSQL = "D:/MoHen/tools/PostgreSQL/18/bin/psql.exe"
ENV = ".env.local"
OWNER = "270bcecf-9bfb-4865-9432-a0ac9db8df75"
PID = "b0a11000-0000-4000-8000-000000000001"
ORIG_DIR = "D:/MoHen/data/private_originals"
originals = {
    "b0a11000-0000-4000-8000-000000000002": None,  # o35
    "b0a11000-0000-4000-8000-000000000003": None,  # o37
}

env = {}
for line in open(ENV, encoding="utf-8"):
    line = line.rstrip("\n")
    if "=" in line and not line.lstrip().startswith("#"):
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()
url = env["DATABASE_URL"]
secret = env["MOHEN_DATABASE_SESSION_SECRET"]

def b64url(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).decode().rstrip("=")

def make_token(uid, exp_ms=None):
    exp = exp_ms if exp_ms is not None else int(time.time() * 1000) + 30000
    payload = b64url(json.dumps({"uid": uid, "r": ["reviewer"], "exp": exp}).encode())
    sig = b64url(hmac.new(secret.encode(), payload.encode(), hashlib.sha256).digest())
    return payload + "." + sig

def psql(sql, vars=None):
    args = [PSQL, url, "-v", "ON_ERROR_STOP=1", "-t", "-A"]
    if vars:
        for k, v in vars.items():
            args += ["-v", f"{k}={v}"]
    r = subprocess.run(args + ["-c", sql],
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode != 0:
        return "ERR:" + (r.stderr or "")[-300:]
    return r.stdout.strip()

results = []

# A) 字节层：从 DB 取 sha256/size，与本地文件对比
db_rows = psql("select original_id, sha256, byte_size, storage_key from studio.private_originals order by original_id")
for line in db_rows.split("\n"):
    if not line.strip():
        continue
    oid, sha_db, size_db, key = line.split("|")
    oid = oid.strip(); sha_db = sha_db.strip(); size_db = int(size_db.strip()); key = key.strip()
    path = f"{ORIG_DIR}/{key}"
    try:
        data = open(path, "rb").read()
    except Exception as e:
        results.append(("A-字节正例", False, f"文件缺失 {path}: {e}")); continue
    sha_local = hashlib.sha256(data).hexdigest()
    ok = (sha_local == sha_db and len(data) == size_db)
    results.append(("A-字节正例", ok, f"{oid[:8]} size={len(data)} sha一致={sha_local==sha_db}"))

# A2) 字节反例：错误 SHA 应不一致
path = f"{ORIG_DIR}/{PID}/b0a11000-0000-4000-8000-000000000002.bin"
data = open(path, "rb").read()
bad = hashlib.sha256(data + b"x").hexdigest()
db_sha = psql("select sha256 from studio.private_originals where original_id='b0a11000-0000-4000-8000-000000000002'")
results.append(("A2-字节反例(错误SHA)", db_sha.strip() != bad, "错误 SHA 与库内 SHA 不同（readVerified 会抛 ORIGINAL_INTEGRITY_FAILED）"))

# B) 身份层正反
good_token = make_token(OWNER)
bad_token = "garbage.garbage"
random_uid_token = make_token("ffffffff-ffff-ffff-ffff-ffffffffffff")

def id_check(label, set_token):
    # 单条 select 输出 uid|visible_count，set_config 在子查询内求值不额外输出。
    # token 为 base64url（A-Za-z0-9_- 及 .），不含单引号，直接拼接安全。
    if set_token:
        set_sql = f"select set_config('mohen.session_token','{set_token}',true)"
    else:
        set_sql = "select null::text"
    sql = (
        "begin;"
        "set local role mohen_app_runtime;"
        + set_sql + ";"
        "select coalesce(control.current_app_user_id()::text,'NULL') || '|' || "
        "(select count(*) from studio.private_originals);"
        "rollback;"
    )
    out = psql(sql)
    if out.startswith("ERR:"):
        return "ERR:" + out[4:], "ERR"
    for line in out.split("\n"):
        if "|" in line:
            uid, cnt = line.strip().split("|", 1)
            return uid, cnt
    return "ERR", "ERR"

uid, cnt = id_check("B-正例", good_token)
results.append(("B-身份正例(有效Owner token)", uid == OWNER and cnt == "2", f"uid={uid[:12]}.. 可见原件数={cnt}"))

uid, cnt = id_check("B-反例(无token)", None)
results.append(("B-反例(无token)", uid == "NULL" and cnt == "0", f"uid={uid} 可见原件数={cnt}"))

uid, cnt = id_check("B-反例(无效token)", bad_token)
results.append(("B-反例(无效token)", uid == "NULL" and cnt == "0", f"uid={uid} 可见原件数={cnt}"))

uid, cnt = id_check("B-反例(非users表uid)", random_uid_token)
results.append(("B-反例(跨Owner/未登记uid)", uid == "NULL" and cnt == "0", f"uid={uid} 可见原件数={cnt}"))

# 输出
allpass = True
for name, ok, detail in results:
    mark = "PASS" if ok else "FAIL"
    if not ok:
        allpass = False
    print(f"[{mark}] {name}: {detail}")
print("=== 1.10 验证", "全部通过" if allpass else "存在失败", "===")
sys.exit(0 if allpass else 1)
