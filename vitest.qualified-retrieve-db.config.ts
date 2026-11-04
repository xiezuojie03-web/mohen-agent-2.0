import {defineConfig} from 'vitest/config';
import path from 'node:path';
export default defineConfig({
 resolve:{alias:{'@mohen/data-access':path.resolve(__dirname,'packages/data-access/src/index.mjs')}},
 test:{include:['tests/integration/qualified-retrieve.integration.ts'],fileParallelism:false},
});
