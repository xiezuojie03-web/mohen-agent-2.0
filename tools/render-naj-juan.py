# -*- coding: utf-8 -*-
"""A线：渲染 NAJ 第 31-38 页（300dpi），定位卷十一田赋卷首页。"""
import fitz, os, sys

pdf = os.path.join(os.environ.get("TEMP", "/tmp"), "naj", "NAJDA-292-0017_松江府志7.pdf")
doc = fitz.open(pdf)
outdir = os.path.join(os.environ.get("TEMP", "/tmp"), "naj", "juan11")
os.makedirs(outdir, exist_ok=True)

start = int(sys.argv[1]) if len(sys.argv) > 1 else 30
end = int(sys.argv[2]) if len(sys.argv) > 2 else 38
for idx in range(start - 1, end):
    page = doc[idx]
    pix = page.get_pixmap(dpi=300)
    out = os.path.join(outdir, f"page_{idx+1:03d}.png")
    pix.save(out)
    print(f"page {idx+1:03d} -> {pix.width}x{pix.height}px")
print("完成")
