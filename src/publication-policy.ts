// Seed fixtures remain available to staff, but never become company publications.
export const companyPublication = "id NOT GLOB 'demo-*' AND title NOT LIKE '[개발 예시]%' AND id <> '33e66a5e-5c00-4e11-971a-0fd72d5e400d'";
export const publicNotice = `publication_status='published' AND deleted_at IS NULL AND (${companyPublication})`;
