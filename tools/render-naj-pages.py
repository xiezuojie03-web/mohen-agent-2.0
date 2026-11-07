# -*- coding: utf-8 -*-
"""A线：用 PyMuPDF 渲染 NAJ 松江府志7 的样本页为图像，供 OCR 定位卷次。"""
import fitz, os

pdf = os.path.join(os.environ.get("TEMP", "/tmp"), "naj", "NAJDA-292-0017_松江府志7.pdf")
doc = fitz.open(pdf)
print("页数:", len(doc))

outdir = os.path.join(os.environ.get("TEMP", "/tmp"), "naj", "pages")
os.makedirs(outdir, exist_ok=True)

# 均匀分布 13 页，用于快速判断卷次分布
for idx in [0, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72]:
    page = doc[idx]
    pix = page.get_pixmap(dpi=150)
    out = os.path.join(outdir, f"page_{idx+1:03d}.png")
    pix.save(out)
    print(f"page {idx+1:03d} -> {pix.width}x{pix.height}px -> {out}")
print("完成")
