import {build} from 'esbuild';
import {spawnSync} from 'node:child_process';
import {writeFile,appendFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const bundle=await build({write:false,absWorkingDir:root,entryPoints:['src/ui/tween-demo.tsx'],outfile:'public/tween-ui.js',bundle:true,minify:true,format:'iife',target:['es2022'],jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},legalComments:'eof'});
await writeFile(root+'public/tween-ui.js',bundle.outputFiles.find(file=>file.path.endsWith('.js')).contents);
const runtimeCss=bundle.outputFiles.find(file=>file.path.endsWith('.css'))?.text||'';
const result=spawnSync(process.execPath,['node_modules/@tailwindcss/cli/dist/index.mjs','-i','src/ui/tween.css','-o','public/tween-ui.css','--minify'],{cwd:root,stdio:'inherit'});
if(result.status!==0)process.exit(result.status||1);

if(runtimeCss)await appendFile(root+'public/tween-ui.css','\n'+runtimeCss);

await build({absWorkingDir:root,entryPoints:['src/ui/home-products.tsx'],outfile:'public/home-products.js',bundle:true,minify:true,format:'iife',target:['es2022'],jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},legalComments:'eof'});
