# -*- coding: utf-8 -*-
"""A线：测试 Wikimedia Commons 上 NAJDA-292-0017 松江府志7.pdf 是否可下载。"""
import urllib.request, urllib.parse, json

title = "File:NAJDA-292-0017 松江府志7.pdf"
api = "https://commons.wikimedia.org/w/api.php?action=query&titles=" + urllib.parse.quote(title) + "&prop=imageinfo&iiprop=url|size|sha1|mime&format=json"
req = urllib.request.Request(api, headers={"User-Agent": "MoHenResearch/1.0"})
try:
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.load(r)
    pages = data.get("query", {}).get("pages", {})
    for pid, p in pages.items():
        if pid == "-1":
            print("文件不存在:", p.get("missing"))
            continue
        ii = p.get("imageinfo", [{}])[0]
        print("标题:", p.get("title"))
        print("URL:", ii.get("url"))
        print("大小(bytes):", ii.get("size"))
        print("sha1:", ii.get("sha1"))
        print("mime:", ii.get("mime"))
except Exception as e:
    print("API 失败:", type(e).__name__, e)
