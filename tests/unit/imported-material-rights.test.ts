import {expect,it} from 'vitest';
import {importedResearchMaterial} from '../../apps/web/lib/imported-materials';
it('keeps declared imports usable privately without granting verified publication rights',()=>{
 const material=importedResearchMaterial({title:'用户材料',text_content:'实际保存的文本片段',source_url:'https://example.invalid/source',license:'用户填写的CC0',rights_declared:true});
 expect(material.fragments).toEqual(['实际保存的文本片段']);expect(material.content_availability).toBe('full_content');
 expect(material.rights_clear).toBe('unknown');expect(material.provenance_status).toBe('declared');expect(material.snapshot_path).toBe(null);
});
it('does not render a user supplied executable URL as a source link',()=>{
 expect(importedResearchMaterial({title:'用户材料',text_content:'text',source_url:'javascript:alert(1)',license:null}).url).toBe('');
});
