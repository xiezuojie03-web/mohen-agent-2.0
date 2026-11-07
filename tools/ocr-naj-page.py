# -*- coding: utf-8 -*-
"""A线：用 DeepSeek 图像识读 OCR NAJ 原件页，定位卷次（读取本地 key 不输出；记录 token 用量）。"""
import base64, json, os, sys, urllib.request

def load_key():
    for path in [".env.local", ".env"]:
        if os.path.exists(path):
            for line in open(path, encoding="utf-8"):
                line = line.strip()
                if line.startswith("DEEPSEEK_API_KEY="):
                    v = line.split("=", 1)[1].strip()
                    return v if v else None
    return None

def ocr(img_path):
    key = load_key()
    if not key:
        print("DEEPSEEK_API_KEY 未找到")
        return
    with open(img_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    payload = {
        "model": "deepseek-flash",
        "messages": [{
            "role": "user",
            "content": [
                {"type": "text", "text": "这是清代《松江府志》的一页古籍扫描图。请：1) 指出页面版心/卷首是否有'松江府志卷之X'或'卷X'的卷次标记，卷次是几；2) 如有卷名（如'水利''建置'等）请指出；3) 简要转录可见正文前两三行。用简洁中文回答。"},
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
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            resp = json.load(r)
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}:", e.read().decode()[:400])
        return
    except Exception as e:
        print("请求失败:", type(e).__name__, e)
        return
    content = resp["choices"][0]["message"]["content"]
    usage = resp.get("usage", {})
    print("=== 识别结果 ===")
    print(content)
    print("=== usage ===", json.dumps(usage, ensure_ascii=False))

if __name__ == "__main__":
    img = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.environ.get("TEMP", "/tmp"), "naj", "pages", "page_001.png")
    print("识别文件:", os.path.basename(img))
    ocr(img)
