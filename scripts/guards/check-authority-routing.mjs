// Owner ruling 2026-11-05: approved MHKA guides all new engineering immediately.
// Static check only; never attests Gate or production readiness.
import fs from 'node:fs';
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
if(errors.length){for(const e of errors)console.error('AUTHORITY_ROUTE_ERROR '+e);process.exitCode=1;}
else console.log('MHKA_AUTHORITY_ROUTE_PASS design=MHKA-00..05 runtime=M8_PENDING legacy_C=HISTORY_ONLY');
