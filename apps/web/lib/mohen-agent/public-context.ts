import {assertQualificationContext, canonicalRightsAction, CONSUMER_ACTIONS,
  type QualificationReadOptions} from '@mohen/data-access';

/** Public Agent retrieval must not inherit an internal Studio context. The
 * operator selects this narrow public-purpose mapping; G5 still grants access.
 *
 * CP2-D：消费方动作以唯一权利词典为准。历史写法 `read` 是 `access_view` 的同义词，
 * 必须归一后再比对——否则环境里写 `read`、G5 审计里签的是 `access_view`，两边字面
 * 不等就会被判成"未授权"，公开 Agent 检索永久返回空材料（这是产品能力缺口，不是配置
 * 失误可掩盖的）。无法识别的动作一律不认，保持失败关闭。 */
export function publicAgentContext(): QualificationReadOptions | undefined {
  try {
    const value=JSON.parse(process.env.MOHEN_PUBLIC_AGENT_QUALIFICATION_CONTEXT || '');
    if(value?.consumer!=='agent')return undefined;
    const action=canonicalRightsAction(value?.scope?.requested_action);
    if(action!==CONSUMER_ACTIONS.agent)return undefined;
    // 交给 G5 判定的是归一后的动作名，必须与审计里签的 scope.requested_action 字面一致。
    return assertQualificationContext({...value, scope:{...value.scope, requested_action:action}});
  } catch { return undefined; }
}
