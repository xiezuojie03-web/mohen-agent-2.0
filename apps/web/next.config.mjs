import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {build} from 'esbuild';
import nft from 'next/dist/compiled/@vercel/nft/index.js';
const {nodeFileTrace}=nft;
// ADR-003：体验页运行期开始消费 @mohen/agent-runtime（理解/选择）与 @mohen/data-access（只读检索）
const nextConfig = {
  outputFileTracingRoot: fileURLToPath(new URL("../../",import.meta.url)),
  outputFileTracingIncludes: {
    "/api/studio/research-tasks/*/production": ["../../AGENTS.md","../../specs/data-production/production-registry.json","../../specs/data-production/schemas/production-registry.schema.json"],
    "/api/internal/production-execute": ["../../AGENTS.md","../../pipelines/data-production/**/*","../../packages/data-access/**/*","../../specs/data-production/**/*","../../tools/lib/method-plan-input.mjs","../../apps/web/lib/studio/provider-dispatcher.ts"],
  },
  transpilePackages: ["@mohen/experience-engine", "@mohen/agent-runtime", "@mohen/data-access"],
  // K4：PDF 文本抽取走 Node 原生模块，不参与前端打包。
  serverExternalPackages: ["pdf-parse", "nodemailer"],
};
export default async function configure(phase){
  // The existing Runner executes as raw Node rather than as a webpack chunk.
  // Trace its bare dependencies explicitly; bundled Ajv is not available to it.
  const root=fileURLToPath(new URL("../../",import.meta.url));
  if(phase==='phase-production-build'){
    const outdir=path.join(root,'apps/web/cloud-runner-dependencies');
    for(const [name,entry,resolveDir] of [
      ['ajv-2020','ajv/dist/2020.js',root],
      ['pg','pg',path.join(root,'packages/data-access')],
    ]){
      await build({stdin:{contents:`module.exports=require(${JSON.stringify(entry)});`,resolveDir},
        outfile:path.join(outdir,name+'.cjs'),bundle:true,platform:'node',format:'cjs',
        target:'node22',external:['pg-native','cloudflare:sockets']});
    }
    nextConfig.outputFileTracingIncludes["/api/internal/production-execute"].push("cloud-runner-dependencies/*.cjs");
  }
  const {fileList}=await nodeFileTrace([root+"pipelines/data-production/run.mjs",root+"apps/web/lib/studio/provider-dispatcher.ts"],{base:root,processCwd:root});
  nextConfig.outputFileTracingIncludes["/api/internal/production-execute"].push(...Array.from(fileList,f=>"../../"+f));
  return nextConfig;
}
