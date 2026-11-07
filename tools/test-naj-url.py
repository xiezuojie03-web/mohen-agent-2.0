# -*- coding: utf-8 -*-
"""A线：测试 NAJ IIIF 图片 URL 变体 + header 组合，找出可行的取图方式。"""
import urllib.request

canvas = "C101041974900"
fname = "M2016092009552459771_0001.jp2"
base = f"https://www.digital.archives.go.jp/api/content/item/da12/{canvas}/iiif/{fname}"

urls = {
    "native-max": f"{base}/full/max/0/native.jpg",
    "default-1800": f"{base}/full/1800,/0/default.jpg",
    "native-1800": f"{base}/full/1800,/0/native.jpg",
    "default-max": f"{base}/full/max/0/default.jpg",
}

ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
headers_variants = {
    "ua-only": {"User-Agent": ua},
    "ua+referer": {"User-Agent": ua, "Referer": "https://www.digital.archives.go.jp/item/4252790"},
    "ua+accept": {"User-Agent": ua, "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"},
}

for name, url in urls.items():
    for hname, h in headers_variants.items():
        try:
            req = urllib.request.Request(url, headers=h)
            with urllib.request.urlopen(req, timeout=30) as r:
                data = r.read()
                ct = r.headers.get("Content-Type")
                print(f"[OK] {name} / {hname} -> {r.status}, {len(data)} bytes, ct={ct}")
        except Exception as e:
            code = getattr(e, "code", None)
            print(f"[FAIL] {name} / {hname} -> {type(e).__name__} {code} {e}")
