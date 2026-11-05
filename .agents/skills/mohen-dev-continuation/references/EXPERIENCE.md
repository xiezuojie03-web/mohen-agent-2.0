# DS-03｜离线脱敏回执与隔离候选（实现接口 v1）

上位规则只引用 MHKA-04 §3.6、MHKA-05 §10、MAB PLAN §6B.4；进度只写原 MAB。
本接口是现有开发 Skill 的共享脚本，不建立注册表，不产生执行授权。

输入是最多1000条、文件最多1MiB的JSON数组。每条只接受以下字段，未知字段拒绝：
`id,task,signature,host,baseline_sha,result_sha,outcome,reuse_target,checks,evidence_refs,redacted,context,production,paid,restricted_data`。
id/task/signature只允许短ASCII标识；host为codex/codebuddy/unknown；SHA必须40位Git SHA；
outcome为PASS/FAIL/DEFERRED_ENV；reuse_target为existing_method/shared_tool/independent_method。
checks仅允许static/typecheck/unit/boundary/build/http/permission-negative/profile-negative标识；
evidence_refs仅允许现有MAB进度/成果目录中的安全文件名或本仓库Actions运行URL。
必须显式声明redacted=true、context=CTX-ENG、production/paid/restricted_data=false。
不采集原始命令、日志、正文、凭据或宿主内部轨迹。声明不等于机器已证明脱敏或测试真实性，
输入者仍须核对证据与授权；分析器不会访问引用文件、GitHub或模型。

机制：按完整signature精确分组（不是自然语言相似度识别）；相同id相同数据去重，冲突拒绝。
一条PASS即可生成待评价建议；失败和环境延期不增加成功计数。成功回执的复用方向一致时，
分别建议UPGRADE_EXISTING / SHARED_SCRIPT / NEW_SKILL_CANDIDATE；无成功或方向冲突为LESSON_ONLY。
reuse_target由施工回执显式提供，四路建议是确定性规则，不冒称自主语义价值判断。

输出保留来源回执、SHA、宿主、真实证据引用、样本/成功/失败数、检查标识和回退说明。
候选始终DRAFT_PENDING_EVALUATION或OBSERVED、auto_activate=false、NO_EXECUTION_AUTHORITY。
隔离评价须补可复用输入/输出、正反行为、效率、授权环境、版本和回退，再人工审查原MAB证据；
只有原权限批准后才能按版本提交到唯一canonical或共享脚本。评价失败可REJECTED/ARCHIVED，
已准入方法的DEGRADED/撤销/替代仍走受控Git变更与原合同，不由该分析器自动切换。
完整生命周期执行器、跨宿主遥测采集、模糊发现、自动评价与准入均未在此实现。

运行：`node scripts/dev-skills/experience.mjs --input <本地脱敏回执.json>`，JSON仅输出stdout，
调用者显式保存到原成果目录。拒绝时退出64，只输出固定错误，不回显输入或路径。
单测：`node --test tests/dev-skills/experience.test.mjs`。分析失败只登记，不影响主M5。
