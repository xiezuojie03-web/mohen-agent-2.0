# -*- coding: utf-8 -*-
"""查询 G5 现有 policy/binding/audit 详情，作为 G0-G4 provision 模板。"""
import subprocess, sys
PSQL = "D:/MoHen/tools/PostgreSQL/18/bin/psql.exe"
line = [l for l in open(".env.local", encoding="utf-8") if l.startswith("DATABASE_URL=")][0]
url = line.split("=", 1)[1].strip()

sql = """
select 'POLICY', gate_code, rule_version, required_checks::text, max_validity::text, source_ref, enabled::text
 from control.gate_policy_versions order by gate_code;
select 'BIND', gate_code, reviewer_user_id::text, db_identity, purpose_namespace, purpose_code, purpose_version, consumer, allowed_scope::text, active::text
 from control.gate_reviewer_bindings order by gate_code;
select 'AUDIT', gate_code, object_type, object_id::text, artifact_revision, purpose_namespace, purpose_code, purpose_version, consumer, valid_until::text
 from control.gate_audits where decision_origin='independent_gate' order by gate_code;
"""
r = subprocess.run([PSQL, url, "-v", "ON_ERROR_STOP=1", "-A", "-c", sql],
                   capture_output=True, text=True, encoding="utf-8", errors="replace")
print(r.stdout)
if r.returncode != 0:
    print("STDERR:", (r.stderr or "")[-1000:])
    sys.exit(1)
