// Read-only live checks except rejected, locked intake. Run with the local certificate as NODE_EXTRA_CA_CERTS.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const checks=[];
for(const [origin,path,expected] of [['http://127.0.0.1:8787','/',200],['http://127.0.0.1:8787','/admin/login',503],['https://localhost:8788','/admin/login',200],['https://localhost:8788','/admin/password',200],['https://localhost:8788','/api/health',200],['https://localhost:8788','/admin/staff',401],['https://localhost:8788','/inquiries',200]]){
 const response=await fetch(origin+path);assert.equal(response.status,expected,path);checks.push({origin,path,status:response.status});
}
const intake=await fetch('https://localhost:8788/api/inquiries',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://localhost:8788'},body:'{}'});assert.equal(intake.status,503);checks.push({path:'/api/inquiries',method:'POST',status:intake.status});
const state=await fetch('https://localhost:8788/cdn-cgi/local/explorer/api/d1/database/00000000-0000-0000-0000-000000000001/raw',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sql:"SELECT (SELECT COUNT(*) FROM staff WHERE status='invited') AS invited,(SELECT COUNT(*) FROM staff_passwords) AS passwordCount,(SELECT COUNT(*) FROM inquiries) AS inquiries,(SELECT COUNT(*) FROM files) AS files"})});const data=await state.json();const rows=data.result[0].results;checks.push({liveDatabase:rows});
await writeFile(new URL('../../outputs/검증/20261011-mvp-c-local/runtime-results.json',import.meta.url),JSON.stringify({certificate:'Verified against project-local certificate; OS trust store unchanged',checks},null,2));console.log(JSON.stringify({passed:checks.length,liveDatabase:rows}));
