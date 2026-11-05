import {assertQualificationContext, type QualificationReadOptions} from '@mohen/data-access';

/** Public Agent retrieval must not inherit an internal Studio context. The
 * operator selects this narrow public-purpose mapping; G5 still grants access. */
export function publicAgentContext(): QualificationReadOptions | undefined {
  try {
    const value=JSON.parse(process.env.MOHEN_PUBLIC_AGENT_QUALIFICATION_CONTEXT || '');
    if(value?.consumer!=='agent'||value?.scope?.requested_action!=='read')return undefined;
    return assertQualificationContext(value);
  } catch { return undefined; }
}
