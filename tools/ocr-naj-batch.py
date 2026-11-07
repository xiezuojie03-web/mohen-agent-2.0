# -*- coding: utf-8 -*-
"""A线：批量 OCR NAJ 关键分界页，定位卷次分布（max_tokens 充足、降频、累计用量）。"""
import base64, json, os, time, urllib.request

PAGES_DIR = os.path.join(os.environ.get("TEMP", "/tmp"), "naj", "pages")
def load_key():
    for path in [".env.local", ".env"]:
        if os.path.exists(path):
            for line in open(path, encoding="utf-8"):
                line = line.strip()
                if line.startswith("DEEPSEEK_API_KEY="):
                    v = line.split("=", 1)[1].strip()
                    return v if v else None
    return None

def ocr_one(img_path, key):
    with open(img_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    payload = {
        "model": "deepseek-flash",
        "messages": [{
            "role": "user",
            "content": [
                {"type": "text", "text": "古籍扫描页。直接给出：卷次=？（版心'卷之X'是几，无则'无'）；卷名=？（该卷标题如田赋/水利/建置，无则'无'）。只输出这两个字段，不要解释。"},
                {"type": "image_url", "image_url": {"url": "data:image/png;base64," + b64}},
            ],
        }],
        "max_tokens": 8000,
    }
    req = urllib.request.Request(
        "https://api.deepseek.com/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "Authorization": "Bearer " + key},
    )
    with urllib.request.urlopen(req, timeout=180) as r:
        resp = json.load(r)
    return resp["choices"][0]["message"]["content"].strip(), resp.get("usage", {})

def main():
    key = load_key()
    if not key:
        print("无 key")
        return
    pages = [f"page_{i:03d}.png" for i in [7, 13, 25, 49, 61, 67]]
    tot = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
    for p in pages:
        img = os.path.join(PAGES_DIR, p)
        try:
            content, usage = ocr_one(img, key)
            print(f"[{p}] {content.replace(chr(10), ' | ')}")
            for k in tot:
                tot[k] += usage.get(k, 0)
        except Exception as e:
            print(f"[{p}] 失败: {type(e).__name__} {e}")
        time.sleep(3)
    print("=== 累计 usage ===", json.dumps(tot, ensure_ascii=False))

if __name__ == "__main__":
    main()
