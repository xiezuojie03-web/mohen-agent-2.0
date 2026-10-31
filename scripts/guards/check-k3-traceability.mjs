import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export function parseCsv(text) {
  const records = []; let row = [], field = "", quoted = false, closed = false;
  text = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { quoted = false; closed = true; }
      else field += c;
    } else if (c === '"' && field === "" && !closed) quoted = true;
    else if (c === ",") { row.push(field); field = ""; closed = false; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); records.push(row); row = []; field = ""; closed = false;
    } else {
      if (closed || c === '"') throw new Error("CSV_INVALID_QUOTE");
      field += c;
    }
  }
  if (quoted) throw new Error("CSV_UNTERMINATED_QUOTE");
  if (field || row.length) { row.push(field); records.push(row); }
  const headers = records.shift();
  if (!headers?.length || new Set(headers).size !== headers.length) throw new Error("CSV_INVALID_HEADERS");
  return records.filter(r => r.some(Boolean)).map(r => {
    if (r.length !== headers.length) throw new Error("CSV_COLUMN_COUNT");
    return Object.fromEntries(headers.map((h, i) => [h, r[i]]));
  });
}

export function validateTraceability({ apiText, actionText, projectRoot }) {
  const apis = parseCsv(apiText), actions = parseCsv(actionText);
  function safePath(p, mustExist = false) {
    if (!p || path.isAbsolute(p) || p.includes("\\") || p.split("/").includes("..")) throw new Error(`UNSAFE_PATH:${p}`);
    const full = path.resolve(projectRoot, p);
    if (mustExist && !fs.existsSync(full)) throw new Error(`SOURCE_MISSING:${p}`);
    if (fs.existsSync(full) && !fs.realpathSync(full).startsWith(fs.realpathSync(projectRoot) + path.sep)) throw new Error(`UNSAFE_PATH:${p}`);
  }
  const apiIds = new Set();
  for (const row of apis) {
    if (!/^API-(?:0[0-7][0-9]|08[01]|X0[1-4])$/.test(row.api_id) || row.api_id === "API-000") throw new Error("API_ID");
    if (apiIds.has(row.api_id)) throw new Error(`DUPLICATE_API:${row.api_id}`);
    apiIds.add(row.api_id);
    safePath(row.target_route_file);
    for (const k of ["input_contract", "response_and_errors", "required_actor_and_scope", "positive_negative_security_tests", "K3_wire_compatibility_authority"]) {
      if (!row[k]?.trim()) throw new Error(`API_CONTRACT_MISSING:${row.api_id}:${k}`);
    }
  }
  const actionIds = new Set(), modules = new Set(), screens = new Set();
  for (const row of actions) {
    if (!/^FA-(?:\d{3}-\d{2}|X-\d{3})$/.test(row.action_id)) throw new Error("ACTION_ID");
    if (actionIds.has(row.action_id)) throw new Error(`DUPLICATE_ACTION:${row.action_id}`);
    actionIds.add(row.action_id); modules.add(row.module_id); screens.add(row.screen);
    safePath(row.target_component_path, true);
    if (/^(IMPLEMENTED|RUNTIME_VERIFIED|PASS)$/.test(row.actual_source_status) && /TARGET_HANDLER_NAME/.test(row.target_event_handler_name)) {
      throw new Error(`HANDLER_CLAIM_UNPROVEN:${row.action_id}`);
    }
    for (const k of ["target_state", "effect_and_authorization", "positive_negative_auth_tests", "runtime_status"]) {
      if (!row[k]?.trim()) throw new Error(`ACTION_CONTRACT_MISSING:${row.action_id}:${k}`);
    }
    for (const id of row.dispatch_api_or_event.match(/API-(?:\d{3}|X\d{2})/g) ?? []) {
      if (!apiIds.has(id)) throw new Error(`ACTION_API_UNKNOWN:${id}`);
    }
  }
  if (apis.length !== 85 || actions.length !== 152 || modules.size !== 62 || screens.size !== 5) throw new Error("K3_COVERAGE_COUNT");
  return { apis: apis.length, actions: actions.length, modules: modules.size, screens: screens.size };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const projectRoot = process.cwd();
  const apiText = fs.readFileSync(path.join(projectRoot, "specs/requirements/api-route-contracts.csv"), "utf8");
  const actionText = fs.readFileSync(path.join(projectRoot, "specs/requirements/u07-action-contracts.csv"), "utf8");
  console.log("K3_TRACEABILITY_OK", JSON.stringify(validateTraceability({ apiText, actionText, projectRoot })));
}
