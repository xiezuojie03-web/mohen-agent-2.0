# -*- coding: utf-8 -*-
"""M3 独立 Gate 状态查询：角色/表/函数/策略/资格现状（用 to_regclass 避免缺表报错）。"""
import subprocess, sys
PSQL = "D:/MoHen/tools/PostgreSQL/18/bin/psql.exe"
line = [l for l in open(".env.local", encoding="utf-8") if l.startswith("DATABASE_URL=")][0]
url = line.split("=", 1)[1].strip()

sql = """
select 'ROLE_'||rolname||'_canlogin='||rolcanlogin::text||'_super='||rolsuper::text||'_bypass='||rolbypassrls::text as x
 from pg_roles where rolname in ('mohen_gate_signer','mohen_gate_reader','mohen_gate_authority','mohen_producer','mohen_app_runtime')
union all
select 'TBL_'||t||'='||(to_regclass('control.'||t) is not null)::text from unnest(array['gate_policy_versions','gate_reviewer_bindings','gate_candidates','gate_audits','qualification_current','gate_service_credentials']) t
union all
select 'FN_sign_gate_candidate='||count(*)::text from pg_proc where proname='sign_gate_candidate'
union all
select 'FN_revoke_gate_qualification='||count(*)::text from pg_proc where proname='revoke_gate_qualification'
union all
select 'FN_qualification_allows='||count(*)::text from pg_proc where proname='qualification_allows'
union all
select 'FN_authenticate_gate_service='||count(*)::text from pg_proc where proname='authenticate_gate_service'
union all
select 'POLICY_'||gate_code||'_enabled='||count(*)::text from control.gate_policy_versions where enabled=true group by gate_code
union all
select 'BIND_'||gate_code||'_active='||count(*)::text from control.gate_reviewer_bindings where active=true group by gate_code
union all
select 'AUDIT_'||gate_code||'_PASS='||count(*)::text from control.gate_audits where decision_origin='independent_gate' and result='PASS' group by gate_code
order by 1;
"""
r = subprocess.run([PSQL, url, "-v", "ON_ERROR_STOP=1", "-t", "-A", "-c", sql],
                   capture_output=True, text=True, encoding="utf-8", errors="replace")
print(r.stdout)
if r.returncode != 0:
    print("STDERR:", (r.stderr or "")[-1000:])
    sys.exit(1)
