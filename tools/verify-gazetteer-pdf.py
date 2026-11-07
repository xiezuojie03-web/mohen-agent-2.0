# -*- coding: utf-8 -*-
"""A线原件验证：检查崇祯松江府志 PDF 的页数、文本层、可提取性（只读，不改 hushang-jingwei）。"""
from PyPDF2 import PdfReader

PATH = r"D:\work Buddy\2026-08-23-23-12-38\hushang-jingwei\corpus\gazetteers\高层通志府州\[崇禎]松江府志九十四卷.pdf"

reader = PdfReader(PATH)
n = len(reader.pages)
print("总页数:", n)
print("是否加密:", reader.is_encrypted)

sample_idx = sorted(set(list(range(0, min(8, n))) + [n // 2, n // 2 + 1, n - 1]))
total_chars = 0
for i in sample_idx:
    try:
        t = reader.pages[i].extract_text() or ""
        total_chars += len(t)
        preview = t.replace("\n", " ")[:60]
        print(f"第{i+1}页 文本长度={len(t)} 预览={preview!r}")
    except Exception as e:
        print(f"第{i+1}页 提取失败: {type(e).__name__}: {e}")

print("抽样页累计字符:", total_chars)
print("结论:", "有文本层(可提取)" if total_chars > 200 else "疑似扫描版(无文本层，需OCR)")

# 检查书签/目录结构（卷次）
def walk_outline(items, depth=0):
    cnt = 0
    for it in items:
        if isinstance(it, list):
            cnt += walk_outline(it, depth + 1)
        else:
            cnt += 1
            if cnt <= 40:
                try:
                    print("  " * depth + f"[{it.title}] -> 页{reader.get_destination_page_number(it)+1 if it.get('/Page') else '?'}")
                except Exception:
                    print("  " * depth + f"[{it.title}]")
    return cnt

try:
    o = reader.outline
    if o:
        total = walk_outline(o)
        print("书签总数:", total)
    else:
        print("书签: 无（无目录结构）")
except Exception as e:
    print("书签读取失败:", e)
