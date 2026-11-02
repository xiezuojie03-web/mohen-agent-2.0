# 未应用UI施工参考快照

此目录及相邻`20261103_UI_RECOVERY_UNAPPLIED.patch`保存平台切换前的本地施工，不是当前线上界面、不是第二套设计权威。

- patch原基线：main@c032ec640500e508c6345120d5e18dc804a6dc0f，包含原stash的13个文件（含未跟踪的UI_RECOVERY.md及ui-recovery.spec.ts）。
- 后来其他工具提交8b3b9e1等UI修复，当前main已保留其成果。本patch因此**没有直接套用**，避免覆盖新源码、权限接线或施工账。
- PNG是本会话对公开未登录页面的观察截图；`test-output.txt`是该旧隔离UI恢复批的历史输出摘录，不是当前main的全量UI准出。
- 后续如需恢复未合并的局部改进，逐文件三方比较后移植并重新测试；尤其不可用patch中的旧CURRENT/progress覆盖现账，也不可恢复旧playwright配置从而丢掉原件测试。
- 不含真实密钥、数据库导出、登录cookie或用户私有资料。
