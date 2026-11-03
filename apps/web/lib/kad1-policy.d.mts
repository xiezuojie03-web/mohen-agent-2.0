export interface ConsumptionContext {purpose:{namespace:string;code:string;version:string};scope:Record<string,unknown>}
export interface QualifiedReference {qualification_ref:string;artifact_ref:{type:string;id:string;revision:string};consumer:string;purpose:ConsumptionContext['purpose'];scope:Record<string,unknown>}
export function consumerContext(consumer:string,raw?:string):ConsumptionContext|null;
export function qualificationRefs(content:Record<string,unknown>,context:ConsumptionContext,consumer:string):QualifiedReference[]|null;
export function mediaPermitted(content:Record<string,unknown>,refs:QualifiedReference[],now?:number):boolean;
export function savedPanel(content:Record<string,unknown>,panel:string):unknown|null;
export function revisionNumber(v:unknown):number|null;
export function validPlayhead(v:unknown):boolean;
export function qualifiedContentSql(alias:string,consumer:string):string;
export function contextParams(c:ConsumptionContext):Record<string,string>;
