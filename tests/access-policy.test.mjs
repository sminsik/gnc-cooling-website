import test from 'node:test';
import assert from 'node:assert/strict';
import { canAccess, staffMenu, defaultStaffPath, staffReturnPath } from '../src/access-policy.ts';
import worker from '../src/index.ts';

const active = (...roles) => ({ status: 'active', roles });
const permissions = ['content', 'inquiries', 'staff', 'delete_restore', 'self'];
const cases = [
  [active('content_manager'), [true, false, false, false, true], '/admin/products'],
  [active('inquiry_manager'), [false, true, false, false, true], '/admin/dashboard'],
  [active('content_manager', 'inquiry_manager'), [true, true, false, false, true], '/admin/dashboard'],
  [active('admin'), [true, true, true, true, true], '/admin/dashboard'],
  [active(), [false, false, false, false, true], '/admin/account'],
  [{ status: 'invited', roles: ['admin'] }, [false, false, false, false, false], '/admin/login'],
  [{ status: 'suspended', roles: ['admin'] }, [false, false, false, false, false], '/admin/login'],
  [null, [false, false, false, false, false], '/admin/login'],
];
for (const [staff, expected, destination] of cases) {
  test(`role matrix and destination: ${JSON.stringify(staff)}`, () => {
    assert.deepEqual(permissions.map(p => canAccess(staff, p)), expected);
    assert.equal(defaultStaffPath(staff), destination);
  });
}
test('content menus contain no inquiry or staff entry; dual roles do not grant staff administration', () => {
  assert.deepEqual(staffMenu(active('content_manager')).map(m => m.path),
    ['/admin/products', '/admin/projects', '/admin/resources', '/admin/notices', '/admin/account']);
  assert.equal(staffMenu(active('content_manager', 'inquiry_manager')).some(m => m.path === '/admin/staff'), false);
  assert.deepEqual(staffMenu({ status: 'suspended', roles: ['admin'] }), []);
});
test('reauthentication rejects external, unknown, encoded, and now forbidden destinations', () => {
  const content = active('content_manager');
  for (const target of ['https://example.com', '//example.com', '/admin/inquiries/123',
    '/admin/staff', '/admin/unknown', '/admin/products/../inquiries',
    '/admin/products%2finquiries', '/admin/products?redirect=https://example.com', '/admin/products//123']) {
    assert.equal(staffReturnPath(content, target), '/admin/products');
  }
  assert.equal(staffReturnPath(content, '/admin/products/p-123'), '/admin/products/p-123');
  assert.equal(staffReturnPath(active('inquiry_manager'), '/admin/products/p-123'), '/admin/dashboard');
  assert.equal(staffReturnPath(active(), '/admin/account'), '/admin/account');
});
test('current account state is checked again after role withdrawal or suspension', () => {
  const staff = active('content_manager', 'inquiry_manager');
  assert.equal(canAccess(staff, 'inquiries'), true);
  staff.roles = ['content_manager'];
  assert.equal(canAccess(staff, 'inquiries'), false);
  assert.equal(canAccess(staff, 'content'), true);
  staff.status = 'suspended';
  assert.equal(canAccess(staff, 'content'), false);
});
test('server closes private paths before accessing assets or storage, for every method', async () => {
  const env = new Proxy({}, { get(_,key) { if(['DB','FILES','ASSETS'].includes(key))throw Error('private request reached storage/assets');return undefined; } });
  for (const method of ['GET', 'POST', 'PATCH', 'DELETE']) {
    for (const [path, status] of [
      ['/admin', 401], ['/admin/inquiries/123', 401], ['/api/admin/dashboard', 401],
      ['/api/admin/products', 401], ['/api/staff/me', 401], ['/my-inquiries', 401],
      ['/api/my-inquiries/123', 401], ['/api/files/private-file', 404], ['/api/uploads', 404],
      ['/admin/login', 503], ['/api/staff-auth/start', 503], ['/api/%61dmin/dashboard', 401],
    ]) {
      const response = await worker.fetch(new Request(`https://local.test${path}?role=admin`, {
        method, headers: { 'X-Staff-Role': 'admin', Cookie: 'staff=admin', Range: 'bytes=0-100' },
      }), env);
      assert.equal(response.status, status, `${method} ${path}`);
      assert.ok(response.headers.get('Cache-Control').includes('no-store'));
      if(response.headers.get('Content-Type').includes('application/json')) {
        const body = await response.json();
        assert.deepEqual(Object.keys(body).sort(), ['code', 'error']);
      } else {
        assert.ok((await response.text()).includes('로그인')||path.startsWith('/my-inquiries'));
      }
    }
  }
});
test('public assets and health still work; private errors reveal no record data', async () => {
  const env = {
    ASSETS: { fetch: async () => new Response('public page') },
    DB: { prepare: () => ({ first: async () => ({ result: 1 }) }) },
    FILES: { list: async () => ({ objects: [] }) },
  };
  assert.equal(await (await worker.fetch(new Request('https://local.test/style.css'), env)).text(), 'public page');
  const health = await worker.fetch(new Request('https://local.test/api/health'), env);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).ok, true);
  assert.equal((await worker.fetch(new Request('https://local.test/api/unimplemented'), env)).status, 404);
});
