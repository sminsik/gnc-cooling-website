export type StaffRole = 'content_manager' | 'inquiry_manager' | 'admin';
export type Permission = 'content' | 'inquiries' | 'staff' | 'delete_restore' | 'self';
export interface StaffAccess {
  // Supply only current server-verified account data, never request roles.
  status: 'active' | 'invited' | 'suspended';
  roles: readonly StaffRole[];
}

export function canAccess(staff: StaffAccess | null, permission: Permission): boolean {
  if (!staff || staff.status !== 'active') return false;
  if (permission === 'self') return true;
  if (staff.roles.includes('admin')) return true;
  if (permission === 'content') return staff.roles.includes('content_manager');
  if (permission === 'inquiries') return staff.roles.includes('inquiry_manager');
  return false;
}

const menuDefinitions = [
  { label: '관리 현황', path: '/admin/dashboard', permission: 'inquiries' },
  { label: '문의 관리', path: '/admin/inquiries', permission: 'inquiries' },
  { label: '제품 관리', path: '/admin/products', permission: 'content' },
  { label: '시공 사례 관리', path: '/admin/projects', permission: 'content' },
  { label: '자료 관리', path: '/admin/resources', permission: 'content' },
  { label: '공지사항 관리', path: '/admin/notices', permission: 'content' },
  { label: '직원 계정 관리', path: '/admin/staff', permission: 'staff' },
  { label: '내 계정', path: '/admin/account', permission: 'self' },
] as const;

export function staffMenu(staff: StaffAccess | null) {
  return menuDefinitions.filter(item => canAccess(staff, item.permission))
    .map(({ label, path }) => ({ label, path }));
}

export function defaultStaffPath(staff: StaffAccess | null): string {
  if (!canAccess(staff, 'self')) return '/admin/login';
  if (canAccess(staff, 'inquiries')) return '/admin/dashboard';
  if (canAccess(staff, 'content')) return '/admin/products';
  return '/admin/account';
}

// Only known screen routes can be used after reauthentication.
export function staffReturnPath(staff: StaffAccess | null, target?: string): string {
  if (target && /^\/admin\/[a-z0-9/-]+$/.test(target) && !target.includes('//')) {
    const match = menuDefinitions.find(item => target === item.path ||
      (['/admin/products', '/admin/projects', '/admin/resources', '/admin/notices',
        '/admin/inquiries', '/admin/staff'].includes(item.path) &&
        new RegExp(`^${item.path}/[a-zA-Z0-9_-]+$`).test(target)));
    if (match && canAccess(staff, match.permission)) return target;
  }
  return defaultStaffPath(staff);
}

export function isWithinPath(path: string, base: string): boolean {
  return path === base || path.startsWith(`${base}/`);
}

export function privateUnavailable(status: 401 | 404 | 503): Response {
  const messages = {
    401: ['AUTH_REQUIRED', '인증이 필요한 기능입니다.'],
    404: ['NOT_FOUND', '제공할 수 없는 대상입니다.'],
    503: ['AUTH_NOT_CONFIGURED', '직원 로그인 기능을 준비 중입니다.'],
  };
  const [code, error] = messages[status];
  return Response.json({ code, error }, { status, headers: {
    'Cache-Control': 'private, no-store',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
  } });
}
