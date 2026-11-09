# -*- coding: utf-8 -*-
"""OCR page 51 of Chongzhen Songjiang Gazetteer via DeepSeek image API."""
import base64, json, os, urllib.request, sys

def load_key():
    for path in [".env.local", ".env"]:
        if os.path.exists(path):
            for line in open(path, encoding="utf-8"):
                line = line.strip()
                if line.startswith("DEEPSEEK_API_KEY="):
                    v = line.split("=", 1)[1].strip()
                    v = v.strip('"').strip("'")
                    return v if v else None
    return None

key = load_key()
if not key:
    print("NO_KEY"); sys.exit(1)

img_path = r"D:\work Buddy\2026-08-23-23-12-38\mohen-agent-2.0\work\page51.jpg"
with open(img_path, "rb") as f:
    b64 = base64.b64encode(f.read()).decode()

payload = {
    "model": "deepseek-chat",
    "messages": [{
        "role": "user",
        "content": [
            {"type": "text", "text": "请转录这页古籍上的汉字。竖排从右到左读。只输出文字，不加解释。"},
            {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64," + b64}},
        ],
    }],
    "max_tokens": 4000,
}
req = urllib.request.Request(
    "https://api.deepseek.com/chat/completions",
    data=json.dumps(payload).encode("utf-8"),
    headers={"Content-Type": "application/json", "Authorization": "Bearer " + key},
)
try:
    with urllib.request.urlopen(req, timeout=120) as r:
        resp = json.load(r)
    print(resp["choices"][0]["message"]["content"])
    print("=== usage ===", json.dumps(resp.get("usage", {}), ensure_ascii=False))
except urllib.error.HTTPError as e:
    print(f"HTTP {e.code}:", e.read().decode()[:400])
    sys.exit(1)
