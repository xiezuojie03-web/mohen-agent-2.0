"use client";

import { useCallback, useEffect, useState } from "react";

type Row = { id: string; name: string; access: string; status: string; ms: number | null; ok: boolean };

export default function AdminSourcesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [checkedAt, setCheckedAt] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");

  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/sources");
      const json = (await res.json()) as { ok: boolean; checked_at?: string; sources?: Row[]; reason?: string };
      if (!res.ok || !json.ok) {
        setError(json.reason ?? `HTTP ${res.status}`);
        setRows([]);
      } else {
        setRows(json.sources ?? []);
        setCheckedAt(json.checked_at ?? "");
      }
    } catch {
      setError("network_error");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "28px 20px 60px", color: "#17201d" }}>
      <a href="/admin" style={{ color: "#3d6b8f", fontSize: 13 }}>
        ← 回运营 Admin
      </a>
      <h1 style={{ fontSize: 24, margin: "10px 0 6px" }}>来源健康</h1>
      <p style={{ color: "#5c6662", fontSize: 13, marginBottom: 14 }}>
        实时探测 V1 的开放来源。manual 来源（识典/国图/用户上传）需人工导入，不参与探测。
      </p>
      <button
        onClick={() => void load()}
        disabled={busy}
        style={{ padding: "6px 12px", borderRadius: 4, border: "1px solid #1f3a2d", background: "#1f3a2d", color: "#fff", fontSize: 12 }}
      >
        {busy ? "探测中…" : "重新探测"}
      </button>
      {checkedAt && <span style={{ marginLeft: 10, fontSize: 12, color: "#6b746f" }}>checked_at {checkedAt}</span>}
      {error && <p style={{ color: "#8a3b3b", fontSize: 13 }}>失败：{error}</p>}

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16, fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #cfc8ba" }}>
            <th style={{ padding: 8 }}>来源</th>
            <th style={{ padding: 8 }}>接入</th>
            <th style={{ padding: 8 }}>状态</th>
            <th style={{ padding: 8 }}>延迟</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} style={{ borderBottom: "1px solid #e2ddd1" }}>
              <td style={{ padding: 8 }}>{r.name}</td>
              <td style={{ padding: 8 }}>{r.access}</td>
              <td style={{ padding: 8, color: r.ok ? "#1f7a4d" : "#8a3b3b" }}>
                {r.status} {r.ok ? "OK" : "DOWN"}
              </td>
              <td style={{ padding: 8 }}>{r.ms === null ? "—" : `${r.ms}ms`}</td>
            </tr>
          ))}
          {!rows.length && !busy && (
            <tr>
              <td colSpan={4} style={{ padding: 12, color: "#6b746f" }}>
                暂无数据（需 operator 登录）
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
