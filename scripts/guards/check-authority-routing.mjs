// Owner ruling 2026-11-05: approved MHKA guides all new engineering immediately.
// Static check only; never attests Gate or production readiness.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const read=(p)=>fs.readFileSync(p,'utf8');
const names=[
 'MHKA-00_Governance_Charter.md',
 'MHKA-01_Value_and_Strategy.md',
 'MHKA-02_Humanistic_Product_and_Experience.md',
 'MHKA-03_Knowledge_World_and_Data_Architecture.md',
 'MHKA-04_Agent_and_Professional_Capabilities.md',
 'MHKA-05_Software_Engineering_and_Operations.md',
];
const router=read('AGENTS.md'),map=read('OWNERSHIP_MAP.md'),
 plan=read('tasks/implementation/MAB/PLAN.md'),
 handoff=read('tasks/implementation/MAB/CODEX_HANDOFF_CURRENT.md');
const errors=[];
for(const filename of names){
 const p='governance/mhka/'+filename;
 if(!fs.existsSync(p))errors.push('MISSING_MHKA:'+p);
 if(!router.includes('`'+p+'`'))errors.push('UNROUTED_MHKA:'+p);
}
if(!router.includes('本轮所有 ChatGPT、Codex、CodeBuddy 工程设计'))errors.push('NO_CROSS_TOOL_AUTHORITY');
if(!router.includes('M8 仍负责生产启用'))errors.push('NO_M8_RUNTIME_BOUNDARY');
if(/\|\s*C[0-4]宪法\s*\|/u.test(router)||router.includes('冲突依C0/C1'))errors.push('OLD_C_AUTHORITY_IN_ROUTER');
if(map.includes('只放 C0–C4 与治理域长期 Authority'))errors.push('OLD_C_AUTHORITY_IN_MAP');
if(!map.includes('MHKA-00—05 是本轮工程设计的唯一上位权威'))errors.push('MAP_MHKA_ROUTING_MISSING');
if(plan.includes('不得在尚未准出时改变`AGENTS.md`旧权威路由'))errors.push('PLAN_DEFERS_ENGINEERING_AUTHORITY');
if(!plan.includes('M8 所等待的是正式生产激活'))errors.push('PLAN_RUNTIME_SCOPE_MISSING');
if(handoff.includes('AGENTS.md现在仍指向旧C0—C4现行路由'))errors.push('HANDOFF_OLD_C_AUTHORITY');
if(!handoff.includes('新工程权威入口（2026-11-05 Owner 纠偏）'))errors.push('HANDOFF_NO_MHKA_DECISION');
// Owner 2026-11-05: move superseded C0—C4 final versions to archive,
// preserving exact Git blobs. This is NOT an M8 runtime/production switch.
const archiveFinals=[
  {
    "name": "C0_MoHen_Project_Constitution_and_Dual_Line_Collaboration_V1.1.md",
    "sha": "718c1e484b11a1e5dcdcb7ddc850c246f047c2f5"
  },
  {
    "name": "C1_MoHen_Product_Architecture_Evolution_Constitution_V1.1.md",
    "sha": "05badc0171b956f1ec6b45254e79889426219ee9"
  },
  {
    "name": "C2_MoHen_Humanistic_Data_OS_and_Dual_Skill_Architecture_V1.3.md",
    "sha": "47f5419204fffb1868ce64bb025bd2f2c4fce6c0"
  },
  {
    "name": "C3_MoHen_Humanistic_Data_OS_Database_Architecture_V1.4.md",
    "sha": "aae8258ed96793f494c6f9a62054dfd3e163ebd3"
  },
  {
    "name": "C4_MoHen_Agent-native_Human_Experience_UI_Architecture_V2.2.md",
    "sha": "c3ca84eb42128e3c167c0b4bbe6f1c5f30d39a3d"
  }
];
for(const item of archiveFinals){
 const oldPath='governance/'+item.name;
 const archivePath='governance/archive/'+item.name;
 if(fs.existsSync(oldPath))errors.push('OLD_C_IN_ACTIVE_GOVERNANCE_ROOT:'+oldPath);
 if(!fs.existsSync(archivePath)){errors.push('MISSING_ARCHIVED_C:'+archivePath);continue;}
 const bytes=fs.readFileSync(archivePath);
 const header=Buffer.from('blob '+bytes.length+'\\0'.replace('\\0','\u0000'));
 const actual=createHash('sha1').update(header).update(bytes).digest('hex');
 if(actual!==item.sha)errors.push('ARCHIVED_C_BLOB_CHANGED:'+archivePath);
}
if(!fs.existsSync('governance/archive/C0_C4_TO_MHKA_ARCHIVAL_20261105.md'))errors.push('MISSING_C_ARCHIVE_MANIFEST');
if(errors.length){for(const e of errors)console.error('AUTHORITY_ROUTE_ERROR '+e);process.exitCode=1;}
else console.log('MHKA_AUTHORITY_ROUTE_PASS design=MHKA-00..05 runtime=M8_PENDING legacy_C=HISTORY_ONLY');
