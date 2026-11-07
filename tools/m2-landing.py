# -*- coding: utf-8 -*-
"""第1步施工落地：项目 + 私有原件(两步PENDING→STORED_VERIFIED) + L0/L1/L2 + 13类资产核心。"""
import hashlib, json, os, subprocess, shutil, fitz
from PIL import Image

PSQL = "D:/MoHen/tools/PostgreSQL/18/bin/psql.exe"
line = [l for l in open(".env.local", encoding="utf-8") if l.startswith("DATABASE_URL=")][0]
url = line.split("=", 1)[1].strip()

OWNER = "270bcecf-9bfb-4865-9432-a0ac9db8df75"
PID = "b0a11000-0000-4000-8000-000000000001"
PDF = os.path.join(os.environ["TEMP"], "naj", "NAJDA-292-0017_松江府志7.pdf")
ORIG_DIR = os.path.join("D:/MoHen/data/private_originals", PID)

ids = {
    "o35": "b0a11000-0000-4000-8000-000000000002", "o37": "b0a11000-0000-4000-8000-000000000003",
    "src": "b0a11000-0000-4000-8000-000000000004", "sv": "b0a11000-0000-4000-8000-000000000005",
    "run": "b0a11000-0000-4000-8000-000000000006", "u35": "b0a11000-0000-4000-8000-000000000007",
    "u37": "b0a11000-0000-4000-8000-000000000008", "e35": "b0a11000-0000-4000-8000-000000000009",
    "e37": "b0a11000-0000-4000-8000-00000000000a", "sa35": "b0a11000-0000-4000-8000-00000000000b",
    "sa37": "b0a11000-0000-4000-8000-00000000000c", "rb": "b0a11000-0000-4000-8000-00000000000d",
    "rn": "b0a11000-0000-4000-8000-00000000000e", "en": "b0a11000-0000-4000-8000-00000000000f",
    "rev_sa35": "b0a11000-0000-4000-8000-000000000010", "rev_sa37": "b0a11000-0000-4000-8000-000000000011",
    "rev_rb": "b0a11000-0000-4000-8000-000000000012", "rev_rn": "b0a11000-0000-4000-8000-000000000013",
    "rev_en": "b0a11000-0000-4000-8000-000000000014",
    "raw35": "b0a11000-0000-4000-8000-000000000015", "raw37": "b0a11000-0000-4000-8000-000000000016",
    "eu35": "b0a11000-0000-4000-8000-000000000017", "eu37": "b0a11000-0000-4000-8000-000000000018",
}

def render_jpeg(page_no, out):
    doc = fitz.open(PDF)
    page = doc[page_no - 1]
    pix = page.get_pixmap(dpi=150)
    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples).convert("L")
    img.save(out, "JPEG", quality=70)
    doc.close()
    data = open(out, "rb").read()
    return len(data), hashlib.sha256(data).hexdigest()

os.makedirs(ORIG_DIR, exist_ok=True)
originals = {}
for key, page in [("o35", 35), ("o37", 37)]:
    tmp = os.path.join(os.environ["TEMP"], f"naj_{page}_g.jpg")
    size, sha = render_jpeg(page, tmp)
    if size >= 10 * 1024 * 1024:
        print(f"页{page} JPEG 超限 {size}"); raise SystemExit(1)
    dst = os.path.join(ORIG_DIR, ids[key] + ".bin")
    shutil.copyfile(tmp, dst); os.remove(tmp)
    originals[key] = {"page": page, "size": size, "sha": sha}
    print(f"页{page}: {size} bytes sha={sha[:16]}")

def esc(s): return s.replace("'", "''")
def js(o): return json.dumps(o, ensure_ascii=False)

# source_anchor 资产：payload_storage_ref 指向私有原件字节
def sa_asset(rev, asset, oid, page, size, sha, storage_key):
    prov = js({'private_original_id': oid, 'storage_ref': 'mohen-private-originals/' + storage_key,
               'file_name': f'songjiang-tianfu-p{page}.jpg',
               'byte_size': size, 'rights_status': 'declared_unverified'})
    ref = 'mohen-private-originals/' + storage_key
    return (
        f"insert into studio.asset_heads(asset_id,project_id,asset_kind) values('{asset}','{PID}','source_anchor') on conflict do nothing;"
        f"insert into studio.asset_revisions(revision_id,asset_id,revision_no,actor_id,workspace_id,origin_kind,epistemic_class,payload_storage_ref,payload_format,content_hash,source_refs,provenance,idempotency_key,correlation_id,content_state,access_state,freshness_state) "
        f"values('{rev}','{asset}',1,'{OWNER}','studio','human','original_material','{ref}','image/jpeg','{sha}','[]'::jsonb,'{esc(prov)}'::jsonb,'{rev}','{rev}','SNAPSHOTTED','RESTRICTED','CURRENT');"
        f"update studio.asset_heads set current_revision_id='{rev}' where asset_id='{asset}';"
    )

# 普通 JSON 资产
def json_asset(rev, asset, kind, epi, payload_obj, hashv):
    payload = js(payload_obj)
    return (
        f"insert into studio.asset_heads(asset_id,project_id,asset_kind) values('{asset}','{PID}','{kind}') on conflict do nothing;"
        f"insert into studio.asset_revisions(revision_id,asset_id,revision_no,actor_id,workspace_id,origin_kind,epistemic_class,payload,payload_format,content_hash,source_refs,idempotency_key,correlation_id,content_state,access_state,freshness_state) "
        f"values('{rev}','{asset}',1,'{OWNER}','studio','human','{epi}','{esc(payload)}'::jsonb,'application/json','{hashv}','[]'::jsonb,'{rev}','{rev}','SNAPSHOTTED','RESTRICTED','CURRENT');"
        f"update studio.asset_heads set current_revision_id='{rev}' where asset_id='{asset}';"
    )

sql_parts = ["begin;"]
sql_parts.append(
    f"insert into studio.projects(project_id,owner_user_id,project_title,research_scope,lifecycle_status) "
    f"values('{PID}','{OWNER}','松江府田赋','{esc(js({'topic': '明代松江府田赋科则'}))}'::jsonb,'ACTIVE') on conflict do nothing;"
)

# 私有原件：先 PENDING
sql_parts.append(
    f"insert into studio.private_originals(original_id,project_id,asset_id,owner_user_id,idempotency_key,storage_key,sha256,byte_size,file_name,content_type,rights_declared,state) values "
    f"('{ids['o35']}','{PID}','{ids['sa35']}','{OWNER}','orig-page-35','{PID}/{ids['o35']}.bin','{originals['o35']['sha']}',{originals['o35']['size']},'songjiang-tianfu-p35.jpg','image/jpeg',true,'PENDING'),"
    f"('{ids['o37']}','{PID}','{ids['sa37']}','{OWNER}','orig-page-37','{PID}/{ids['o37']}.bin','{originals['o37']['sha']}',{originals['o37']['size']},'songjiang-tianfu-p37.jpg','image/jpeg',true,'PENDING')"
    f" on conflict do nothing;"
)
# source_anchor 资产
sql_parts.append(sa_asset(ids['rev_sa35'], ids['sa35'], ids['o35'], 35, originals['o35']['size'], originals['o35']['sha'], f"{PID}/{ids['o35']}.bin"))
sql_parts.append(sa_asset(ids['rev_sa37'], ids['sa37'], ids['o37'], 37, originals['o37']['size'], originals['o37']['sha'], f"{PID}/{ids['o37']}.bin"))
# 私有原件：finalize → STORED_VERIFIED
sql_parts.append(
    f"update studio.private_originals set state='STORED_VERIFIED',asset_revision_id='{ids['rev_sa35']}',verified_at=now() where original_id='{ids['o35']}' and state='PENDING';"
    f"update studio.private_originals set state='STORED_VERIFIED',asset_revision_id='{ids['rev_sa37']}',verified_at=now() where original_id='{ids['o37']}' and state='PENDING';"
)

# L0
sql_parts.append(
    f"insert into source.sources(source_id,provider,title,source_type,carrier_type,rights,provenance_status,content_availability,original_locator,scope) "
    f"values('{ids['src']}','国立公文书馆(NAJ)','松江府志7','gazetteer','scanned_page','{esc(js({'status':'public_domain_secondary_use','basis':'NAJ_secondary_use_policy'}))}'::jsonb,'verified','image_scan','{esc(js({'catalog_no':'NAJDA-292-0017','item':4252790}))}'::jsonb,'{esc(js({'volume':7,'item':4252790}))}'::jsonb) on conflict do nothing;"
    f"insert into source.source_versions(source_version_id,source_id,version_label,retrieved_at,checksum_sha256,metadata) "
    f"values('{ids['sv']}','{ids['src']}','NAJDA-292-0017',now(),'{originals['o35']['sha']}','{esc(js({'pages': 73, 'source': 'Wikimedia_Commons'}))}'::jsonb) on conflict do nothing;"
    f"insert into source.raw_items(raw_item_id,source_version_id,storage_ref,media_type,byte_size,checksum_sha256) values "
    f"('{ids['raw35']}','{ids['sv']}','mohen-private-originals/{PID}/{ids['o35']}.bin','image/jpeg',{originals['o35']['size']},'{originals['o35']['sha']}'),"
    f"('{ids['raw37']}','{ids['sv']}','mohen-private-originals/{PID}/{ids['o37']}.bin','image/jpeg',{originals['o37']['size']},'{originals['o37']['sha']}')"
    f" on conflict do nothing;"
)
# L1
sql_parts.append(
    f"insert into source.read_runs(read_run_id,input_sha256,status) values('{ids['run']}','{originals['o35']['sha']}','completed') on conflict do nothing;"
    f"insert into source.read_units(read_unit_id,read_run_id,method_code,kind,locator_schema,locator,ordinal,payload_ref) values "
    f"('{ids['u35']}','{ids['run']}','C02','page_image','page','{esc(js({'page':35,'source':'NAJDA-292-0017'}))}'::jsonb,1,'mohen-private-originals/{PID}/{ids['o35']}.bin'),"
    f"('{ids['u37']}','{ids['run']}','C02','page_image','page','{esc(js({'page':37,'source':'NAJDA-292-0017'}))}'::jsonb,2,'mohen-private-originals/{PID}/{ids['o37']}.bin')"
    f" on conflict (read_unit_id) do nothing;"
)
# L2
sql_parts.append(
    f"insert into evidence.reading_units(reading_unit_id,source_version_id,raw_item_id,unit_kind) values "
    f"('{ids['eu35']}','{ids['sv']}','{ids['raw35']}','image'),"
    f"('{ids['eu37']}','{ids['sv']}','{ids['raw37']}','image')"
    f" on conflict do nothing;"
    f"insert into evidence.material_evidence(evidence_id,source_id,source_version_id,raw_item_id,locator,modality,source_voice,uncertainty,extraction_method,maturity,literal_reading,reading_unit_id,assertion_kind) values "
    f"('{ids['e35']}','{ids['src']}','{ids['sv']}','{ids['raw35']}','{esc(js({'page':35,'source':'NAJDA-292-0017'}))}'::jsonb,'text','official_gazetteer','{esc(js({'level':'low'}))}'::jsonb,'{esc(js({'method':'ocr-deepseek-flash'}))}'::jsonb,'candidate','青浦縣屬上鄉','{ids['eu35']}','observation'),"
    f"('{ids['e37']}','{ids['src']}','{ids['sv']}','{ids['raw37']}','{esc(js({'page':37,'source':'NAJDA-292-0017'}))}'::jsonb,'text','official_gazetteer','{esc(js({'level':'low'}))}'::jsonb,'{esc(js({'method':'ocr-deepseek-flash'}))}'::jsonb,'candidate','均科正耗平米三斗六升五合以下低田等准熟起科同','{ids['eu37']}','observation')"
    f" on conflict do nothing;"
)
# 13类资产核心
sql_parts.append(json_asset(ids['rev_rb'], ids['rb'], 'research_brief', 'editorial',
                            {'title': '松江府田赋', 'question': '明代松江府如何丈量土地、折算平米、征收赋税？', 'scope': 'NAJ 松江府志7 卷十一田赋六'},
                            hashlib.sha256('songjiang-tianfu-brief'.encode()).hexdigest()))
sql_parts.append(json_asset(ids['rev_rn'], ids['rn'], 'reading_note', 'observation',
                            {'note': '卷十一田赋六：均科正耗平米三斗六升五合，以下低田等准熟起科同；青浦縣屬上鄉'},
                            hashlib.sha256('reading-note'.encode()).hexdigest()))
sql_parts.append(json_asset(ids['rev_en'], ids['en'], 'evidence_note', 'observation',
                            {'evidence': '草蕩一頃七畝九分八釐；熟田六十七畝八分一釐七毫；九十六图四百八十六丁'},
                            hashlib.sha256('evidence-note'.encode()).hexdigest()))

sql_parts.append("commit;")
sql = "\n".join(sql_parts)
sql_file = os.path.join(os.environ["TEMP"], "naj", "m2-landing.sql")
open(sql_file, "w", encoding="utf-8").write(sql)
r = subprocess.run([PSQL, url, "-v", "ON_ERROR_STOP=1", "-f", sql_file], capture_output=True, text=True, encoding="utf-8", errors="replace")
print("=== SQL 执行 EXIT", r.returncode)
if r.returncode != 0:
    print("STDERR:", (r.stderr or "")[-1200:])
else:
    print("落地成功")
