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


## v0.2.1 有界剩余任务调度（离线建议）

既有脚本增加`--worklist <JSON>`，不增加Registry/执行器。输入最多1000项：
`id,depends_on,completed,classification,signature,evidence_revision,attempts`，仅这些字段。
id/signature及依赖为短安全标识，evidence_revision为40位Git或环境证据SHA；
classification只接受READY/DATA_BLOCKED/GATE_BLOCKED/OWNER_BLOCKED；completed为boolean。
attempts按时间顺序只含`outcome:PASS|FAIL|DEFERRED_ENV,evidence_revision`；不收日志/命令/密钥。
依赖须存在且无环；重复ID、未知字段拒绝。READY依赖按拓扑排序；外部阻塞逐依赖继承，
同证据修订连续两次失败/环境失败STOP_REPEATED_FAILURE，其后依赖暂停，独立READY继续。
新证据修订才可重试。输出auto_execute=false/NO_EXECUTION_AUTHORITY，不会运行候选或修改文件。
输入者须先核实环境/数据/权限；declared READY不等于已实际具备条件。
所有完成状态均须引用原MAB真实测试/CI，本模块不自行签完成或正式Gate。

评价/演化：v0.2.0的显式回执与精确签名逻辑保持兼容，三种阻塞与恢复正反由Node测试验证；
本次版本升级为Owner已授权的工程方法完善，不代表自动候选准入机制已完成。错误时回退
同一canonical/loader/map/CLI/guard版本及脚本差异，保留原回执与待评价草案，不清除生产数据。
