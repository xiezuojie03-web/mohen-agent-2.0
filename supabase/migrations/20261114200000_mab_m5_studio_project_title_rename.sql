-- 研究底稿改名：只开放 project_title 一列的可写权限。
-- 行级仍由既有策略 studio_project_owner 限制为本人（owner_user_id=current_app_user_id()）；
-- lifecycle_status 的写入权仍在 mohen_execution_authority，运行账号不得改。
begin;
grant update(project_title) on studio.projects to mohen_app_runtime;
commit;
