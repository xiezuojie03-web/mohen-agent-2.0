# -*- coding: utf-8 -*-
"""验证 qualification_allows 是否对已发布的田赋作品返回 true。"""
import subprocess

line = [l for l in open(".env.local", encoding="utf-8") if l.startswith("DATABASE_URL=")][0]
url = line.split("=", 1)[1].strip()

sql = (
    "select control.qualification_allows("
    "'c0ffee00-0000-4000-8000-00000000a006','watch','mohen.watch','display','1',"
    "'{\"mode\":\"public_watch\"}'::jsonb);"
)
r = subprocess.run(
    ["D:/MoHen/tools/PostgreSQL/18/bin/psql.exe", url, "-t", "-A", "-c", sql],
    capture_output=True, text=True,
)
print("qualification_allows =", r.stdout.strip())
if r.stderr.strip():
    print("stderr:", r.stderr.strip()[:300])
