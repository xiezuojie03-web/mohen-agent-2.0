import {registerHooks} from 'node:module';
import {pathToFileURL} from 'node:url';
import path from 'node:path';

const directory=process.env.MOHEN_CLOUD_RUNNER_DEPENDENCY_DIR;
if(directory){
 const bundles=new Map([
  ['ajv/dist/2020.js','ajv-2020.cjs'],
  ['pg','pg.cjs'],
 ]);
 // The Runner loads the single Studio dispatcher implementation as a .ts module
 // (Node type stripping), and that module imports the workspace package by name.
 // A deployed function has no workspace symlink, so resolve the package to the
 // one source implementation instead of importing a second copy of the logic.
 const workspace=new Map([
  ['@mohen/data-access','../../../packages/data-access/src/index.mjs'],
 ]);
 registerHooks({resolve(specifier,context,nextResolve){
  const source=workspace.get(specifier);
  if(source)return nextResolve(new URL(source,import.meta.url).href,context);
  const bundle=bundles.get(specifier);
  if(!bundle)return nextResolve(specifier,context);
  return nextResolve(pathToFileURL(path.join(directory,bundle)).href,context);
 }});
}
