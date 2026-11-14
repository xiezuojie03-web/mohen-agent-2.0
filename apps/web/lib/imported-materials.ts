import type { ShlMaterial } from './mohen-agent/retrieve-shl';

type ImportedRow={title:string;text_content:string;source_url:string|null;license:string|null;rights_declared?:boolean};
/** User declarations permit private intake; they never establish publication rights. */
export function importedResearchMaterial(row: ImportedRow): ShlMaterial {
  let sourceUrl='';
  try { const url=new URL(row.source_url??''); if(url.protocol==='https:'||url.protocol==='http:')sourceUrl=url.toString(); } catch { /* no usable source link */ }
  return {
    provider:'user-upload',title:row.title,source_type:'document',carrier_type:'text',provenance_status:'declared',
    content_availability:'full_content',url:sourceUrl,publisher:'用户上传',license:row.license??'许可尚待核实',
    rights_clear:'unknown',snapshot_path:null,fragments:[row.text_content],
  };
}
