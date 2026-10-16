import test from 'node:test';
import assert from 'node:assert/strict';
import {redact} from '../scripts/local-runtime-log.mjs';
test('runtime logs redact credentials and query tokens while retaining failure evidence',()=>{
 const s=redact('Authorization=BearerKey GET /verify?token=top-secret https://localhost/x#private exit SIGTERM configured-key',['configured-key']);
 assert.ok(!s.includes('BearerKey'));assert.ok(!s.includes('top-secret'));assert.ok(!s.includes('#private'));assert.ok(!s.includes('configured-key'));assert.ok(s.includes('SIGTERM'));
});
