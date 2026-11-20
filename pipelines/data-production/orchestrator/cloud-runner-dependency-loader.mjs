import {registerHooks} from 'node:module';
import {pathToFileURL} from 'node:url';
import path from 'node:path';

const directory=process.env.MOHEN_CLOUD_RUNNER_DEPENDENCY_DIR;
if(directory){
 const bundles=new Map([
  ['ajv/dist/2020.js','ajv-2020.cjs'],
  ['pg','pg.cjs'],
 ]);
 registerHooks({resolve(specifier,context,nextResolve){
  const bundle=bundles.get(specifier);
  if(!bundle)return nextResolve(specifier,context);
  return nextResolve(pathToFileURL(path.join(directory,bundle)).href,context);
 }});
}
