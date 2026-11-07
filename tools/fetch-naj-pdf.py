# -*- coding: utf-8 -*-
"""A线：从 Wikimedia Commons 下载 NAJDA-292-0017 松江府志7.pdf（Public Domain），验证页数/文本层/SHA。"""
import urllib.request, hashlib, os
from PyPDF2 import PdfReader

URL = "https://upload.wikimedia.org/wikipedia/commons/e/e3/NAJDA-292-0017_%E6%9D%BE%E6%B1%9F%E5%BA%9C%E5%BF%977.pdf"
EXPECT_SHA1 = "dc7abb31b4e21ec3aefcb5314856ac6d1c4a4e15"

req = urllib.request.Request(URL, headers={"User-Agent": "MoHenResearch/1.0"})
with urllib.request.urlopen(req, timeout=180) as r:
    data = r.read()

print("下载字节:", len(data))
print("sha256:", hashlib.sha256(data).hexdigest())
print("sha1:", hashlib.sha1(data).hexdigest(), "(Commons 期望:", EXPECT_SHA1 + ")")
print("sha1 匹配:", hashlib.sha1(data).hexdigest() == EXPECT_SHA1)

outdir = os.path.join(os.environ.get("TEMP", "/tmp"), "naj")
os.makedirs(outdir, exist_ok=True)
out = os.path.join(outdir, "NAJDA-292-0017_松江府志7.pdf")
with open(out, "wb") as f:
    f.write(data)
print("保存:", out)

reader = PdfReader(out)
n = len(reader.pages)
print("页数:", n)
total = 0
for i in sorted(set([0, 1, 5, 10, 20, 36, 50, n - 1])):
    t = reader.pages[i].extract_text() or ""
    total += len(t)
    print(f"第{i+1}页 文本长度={len(t)}")
print("文本层结论:", "有(可提取)" if total > 100 else "无(扫描版，需OCR)")
