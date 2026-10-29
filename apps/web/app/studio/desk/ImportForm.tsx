"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ImportForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [license, setLicense] = useState("");
  const [rights, setRights] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function submit() {
    setBusy(true);
    setMsg("");
    try {
      let res: Response;
      if (file) {
        const fd = new FormData();
        fd.set("file", file);
        fd.set("title", title || file.name);
        fd.set("source_url", sourceUrl);
        fd.set("license", license);
        fd.set("rights_declared", rights ? "true" : "false");
        res = await fetch("/api/studio/materials/import", { method: "POST", body: fd });
      } else {
        res = await fetch("/api/studio/materials/import", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            title,
            text,
            source_url: sourceUrl,
            license,
            rights_declared: rights,
          }),
        });
      }
      const json = (await res.json()) as { ok: boolean; reason?: string; chars?: number; kind?: string };
      if (!res.ok || !json.ok) {
        setMsg(`失败：${json.reason ?? res.status}`);
      } else {
        setMsg(`已导入（${json.kind ?? "text"}，${json.chars ?? 0} 字）`);
        setTitle("");
        setText("");
        setFile(null);
        setSourceUrl("");
        setLicense("");
        setRights(false);
        router.refresh();
      }
    } catch {
      setMsg("失败：网络错误");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={{ border: "1px solid #e2ddd1", borderRadius: 8, padding: 14, marginBottom: 18 }}>
      <h2 style={{ fontSize: 15, margin: "0 0 8px" }}>导入一份资料（地方志/文史/口述摘录）</h2>
      <p style={{ fontSize: 12, color: "#6b746f", margin: "0 0 10px" }}>
        V1 支持文本粘贴、.txt/.md、PDF 文本抽取，以及图片/扫描件的本机 Windows 中文 OCR（仅 Windows 本地可用）。导入后默认仅自己可见。
      </p>
      <div style={{ display: "grid", gap: 8 }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="标题（如：金泽小志·桥记）"
          style={{ padding: 8, border: "1px solid #cfc8ba", borderRadius: 4, fontSize: 13 }}
        />
        <input
          type="file"
          accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.webp,text/plain,application/pdf,image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          style={{ fontSize: 12 }}
        />
        {file && <span style={{ fontSize: 12, color: "#3d6b8f" }}>已选：{file.name}（将优先按文件导入）</span>}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="或直接粘贴正文（≥20 字）"
          rows={6}
          style={{ padding: 8, border: "1px solid #cfc8ba", borderRadius: 4, fontSize: 13 }}
        />
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="来源链接（可选）"
            style={{ flex: 1, padding: 8, border: "1px solid #cfc8ba", borderRadius: 4, fontSize: 13 }}
          />
          <input
            value={license}
            onChange={(e) => setLicense(e.target.value)}
            placeholder="许可（如 CC BY-SA / 已授权）"
            style={{ flex: 1, padding: 8, border: "1px solid #cfc8ba", borderRadius: 4, fontSize: 13 }}
          />
        </div>
        <label style={{ fontSize: 12, color: "#5c6662" }}>
          <input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} /> 我确认有权使用这份材料
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => void submit()}
            disabled={busy || !rights}
            style={{ padding: "6px 14px", borderRadius: 4, border: "1px solid #1f3a2d", background: "#1f3a2d", color: "#fff", fontSize: 12 }}
          >
            {busy ? "导入中…" : "导入"}
          </button>
          {msg && <span style={{ fontSize: 12, color: msg.startsWith("失败") ? "#8a3b3b" : "#1f7a4d" }}>{msg}</span>}
        </div>
      </div>
    </section>
  );
}
