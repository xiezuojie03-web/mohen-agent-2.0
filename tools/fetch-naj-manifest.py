# -*- coding: utf-8 -*-
"""A线：解析 NAJ《松江府志7》IIIF manifest，列出 canvas 结构，确定取页方案（只读网络请求）。"""
import json, urllib.request

URL = "https://www.digital.archives.go.jp/api/iiif/4252790/manifest.json"
req = urllib.request.Request(URL, headers={"User-Agent": "Mozilla/5.0 (MoHen research)"})
with urllib.request.urlopen(req, timeout=30) as r:
    data = json.load(r)

print("顶层 label:", data.get("label"))
print("顶层 keys:", list(data.keys()))
print("sequences 数:", len(data.get("sequences", [])))

for si, seq in enumerate(data.get("sequences", [])):
    canvases = seq.get("canvases", [])
    print(f"\n=== sequence[{si}] canvas 数 = {len(canvases)} ===")
    for i, c in enumerate(canvases):
        label = c.get("label")
        images = c.get("images", [])
        res_id = ""
        svc_id = ""
        if images:
            res = images[0].get("resource", {})
            res_id = res.get("@id", "")
            svc = res.get("service", {})
            svc_id = svc.get("@id", "") if isinstance(svc, dict) else str(svc)
        print(f"[{i:02d}] label={label} | img={res_id} | svc={svc_id}")
