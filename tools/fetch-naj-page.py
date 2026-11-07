# -*- coding: utf-8 -*-
"""A线：从 NAJ IIIF 取指定页派生 JPEG，保存到系统临时目录（降频单页，避免 403）。"""
import urllib.request, os, sys, hashlib

# canvas 编号 C101041974900 + index*100；文件 _0001.._0073
BASE = 101041974900
def canvas_for(index):
    return "C" + str(BASE + index * 100)
def file_for(index):
    return f"M2016092009552459771_{index+1:04d}.jp2"

def fetch(index, width=1800):
    canvas = canvas_for(index)
    fname = file_for(index)
    url = f"https://www.digital.archives.go.jp/api/content/item/da12/{canvas}/iiif/{fname}/full/{width},/0/default.jpg"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (MoHen research)"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()

if __name__ == "__main__":
    index = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    width = int(sys.argv[2]) if len(sys.argv) > 2 else 1800
    data = fetch(index, width)
    outdir = os.path.join(os.environ.get("TEMP", "/tmp"), "naj_pages")
    os.makedirs(outdir, exist_ok=True)
    out = os.path.join(outdir, f"naj_{index+1:03d}_w{width}.jpg")
    with open(out, "wb") as f:
        f.write(data)
    print(f"页 index={index} canvas={canvas_for(index)} 文件={file_for(index)}")
    print(f"字节数={len(data)} sha256={hashlib.sha256(data).hexdigest()}")
    print(f"已保存: {out}")
