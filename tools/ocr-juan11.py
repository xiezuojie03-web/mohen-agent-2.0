# -*- coding: utf-8 -*-
"""A线：OCR 第31-38页（300dpi），定位卷十一田赋卷首页。"""
import base64, json, os, time, urllib.request

DIR = os.path.join(os.environ.get("TEMP", "/tmp"), "naj", "juan11")
def load_key():
    for path in [".env.local", ".env"]:
        if os.path.exists(path):
            for line in open(path, encoding="utf-8"):
                line = line.strip()
                if line.startswith("DEEPSEEK_API_KEY="):
                    v = line.split("=", 1)[1].strip()
                    return v if v else None
    return None

def ocr_one(img, key):
    with open(img, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    payload = {
        "model": "deepseek-flash",
        "messages": [{
            "role": "user",
            "content": [
                {"type": "text", "text": "古籍页。回答三点：1)此页是否有大字卷首'松江府志卷之X'？卷次几？2)卷题/门类是什么（如田赋）？3)正文开头几个字。简洁。"},
                {"type": "image_url", "image_url": {"url": "data:image/png;base64," + b64}},
            ],
        }],
        "max_tokens": 8000,
    }
    req = urllib.request.Request("https://api.deepseek.com/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "Authorization": "Bearer " + key})
    with urllib.request.urlopen(req, timeout=180) as r:
        resp = json.load(r)
    return resp["choices"][0]["message"]["content"].strip(), resp.get("usage", {})

def main():
    key = load_key()
    if not key:
        print("无 key"); return
    tot = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
    for i in range(31, 39):
        img = os.path.join(DIR, f"page_{i:03d}.png")
        try:
            c, u = ocr_one(img, key)
            print(f"[第{i}页] {c.replace(chr(10), ' / ')}")
            for k in tot: tot[k] += u.get(k, 0)
        except Exception as e:
            print(f"[第{i}页] 失败: {type(e).__name__} {e}")
        time.sleep(3)
    print("=== 累计 ===", json.dumps(tot, ensure_ascii=False))

if __name__ == "__main__":
    main()
