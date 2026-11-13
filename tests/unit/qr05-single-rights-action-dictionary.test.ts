// 唯一权利动作词典（QR-05 / QR-04）漂移守卫。
//
// 曾经的毛病是三套词表各说各话：KAD 合同六个动作、Gate 合同另要 machine_read/retain、
// Studio 资产消费裁决自带第三份白名单。结果想按词典请求 machine_read/retain 永远拿到
// INVALID_ACTION。这里钉住三件事，防止词表再次裂开：
//   1. 词典本体就是九个动作，不增不减；
//   2. 数据库消费裁决的白名单与词典逐项一致，且旧写法 read 仍在读取时归一；
//   3. 仓储与两份合同不再自带第二份动作清单。
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { RIGHTS_ACTIONS } from "../../packages/data-access/src/rights-actions.mjs";

const read = (relative: string) => readFileSync(new URL(relative, import.meta.url), "utf8");

const DICTIONARY = [
  "access_view",
  "adapt",
  "display",
  "download",
  "external_processing",
  "machine_read",
  "quote",
  "redistribute",
  "retain",
];

describe("唯一权利动作词典", () => {
  it("词典本体就是九动作，不增不减", () => {
    expect([...RIGHTS_ACTIONS].sort()).toEqual(DICTIONARY);
  });

  it("数据库消费裁决的白名单与词典逐项一致", () => {
    const sql = read("../../supabase/migrations/20261113100000_mab_qr05_single_rights_action_dictionary.sql");
    const whitelist = /v_action not in \(([^)]*)\)/.exec(sql);
    expect(whitelist, "SQL 里找不到动作白名单").not.toBeNull();
    const actions = (whitelist as RegExpExecArray)[1]
      .split(",")
      .map((item) => item.trim().replace(/^'|'$/g, ""))
      .filter(Boolean)
      .sort();
    expect(actions).toEqual(DICTIONARY);
  });

  it("旧写法 read 在读取时归一为 access_view，历史快照不改写", () => {
    const sql = read("../../supabase/migrations/20261113100000_mab_qr05_single_rights_action_dictionary.sql");
    expect(sql).toMatch(/when 'read' then 'access_view'/);
    expect(sql).toMatch(/when v_action='access_view' then r\.rights_by_action->>'read'/);
  });

  it("资产仓储不再自带第二份动作清单", () => {
    const source = read("../../packages/data-access/src/studio-asset-repository.mjs");
    expect(source).toMatch(/from '\.\/rights-actions\.mjs'/);
    expect(source).not.toMatch(/const actions = Object\.freeze\(\[/);
    expect(source).not.toMatch(/'read','quote','display'/);
  });

  it("KAD 与 Gate 合同都指向唯一词典，而不是各写一套", () => {
    for (const file of [
      "../../specs/KNOWLEDGE_ASSET_LIFECYCLE_CONTRACT.md",
      "../../specs/data-production/gates/G0-G5_MACHINE_GATE_CONTRACT_V3.0.md",
    ]) {
      const text = read(file);
      expect(text, file).toContain("packages/data-access/src/rights-actions.mjs");
      expect(text, file).toContain("mohen.rights-actions.v1");
    }
  });
});
