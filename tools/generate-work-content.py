# -*- coding: utf-8 -*-
"""M5：受控生成《松江府田赋》作品内容（绑定 NAJ 真实史料出处，记录费用）。"""
import base64, json, os, urllib.request

def load_key():
    for path in [".env.local", ".env"]:
        if os.path.exists(path):
            for line in open(path, encoding="utf-8"):
                line = line.strip()
                if line.startswith("DEEPSEEK_API_KEY="):
                    v = line.split("=", 1)[1].strip()
                    return v if v else None
    return None

MATERIALS = [
    "草蕩一頃七畝九分八釐（第31页）",
    "二区五图八亩四分六厘（第32页）",
    "熟田六十七畝八分一釐七毫（第33页）",
    "九十六图四百八十六丁（第34页）",
    "青浦縣屬上鄉（第35页）",
    "均科正耗平米三斗六升五合，以下低田等准熟起科同（第37页）",
    "四十二保七区（第38页）",
]

system = """你是墨痕的创作编导。基于给定的真实历史材料（明代《松江府志》田赋卷的 OCR 转录），创作一部短篇历史图文作品的章节内容。

铁律：
1. 只能使用材料里出现的事实，禁止新增任何年份、地名、人物、关系、事件、数字；
2. 旁白用纪录片口吻，2-3 句，只讲有据内容，不虚构、不揣测；
3. 每章必须给 provenanceRefs，逐项原样引用输入材料中的完整字符串（不能自编）；
4. 共 6 章：从"翻开田赋卷"到"账本之外的今天"，体现认识增量；
5. 只输出 JSON，格式：
{"title":"作品标题","description":"一句话简介","beats":[{"title":"章标题","narration":"旁白","visual":"画面描述","directorTimecodeMs":0,"provenanceRefs":["..."]}]}
directorTimecodeMs 从 0 递增，每章间隔约 8000 毫秒。"""

def main():
    key = load_key()
    if not key:
        print("无 key"); return
    user = "真实材料：\n" + "\n".join("- " + m for m in MATERIALS) + "\n\n主题：明代松江府的田赋——官府如何丈量土地、折算平米、征收赋税，百姓如何与土地相处。"
    payload = {
        "model": "deepseek-flash",
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        "max_tokens": 6000,
        "temperature": 0.6,
    }
    req = urllib.request.Request("https://api.deepseek.com/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "Authorization": "Bearer " + key})
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            resp = json.load(r)
    except urllib.error.HTTPError as e:
        print("HTTP", e.code, e.read().decode()[:500]); return
    content = resp["choices"][0]["message"]["content"].strip()
    usage = resp.get("usage", {})
    print("=== usage ===", json.dumps(usage, ensure_ascii=False))
    # 提取 JSON（去掉可能的 markdown 围栏）
    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"): content = content[4:]
        content = content.strip()
    try:
        obj = json.loads(content)
    except Exception as e:
        print("JSON 解析失败，原文：")
        print(content)
        return
    out = os.path.join(os.environ.get("TEMP", "/tmp"), "naj", "work_content.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
    print("=== 生成内容 ===")
    print(json.dumps(obj, ensure_ascii=False, indent=2))
    print("已保存:", out)

if __name__ == "__main__":
    main()
