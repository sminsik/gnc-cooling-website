interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  FILES: R2Bucket;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/health' && request.method === 'GET') {
      await env.DB.prepare('SELECT 1').first();
      await env.FILES.list({ limit: 1 });
      return Response.json({ ok: true, database: 'connected', files: 'connected' });
    }
    // Customer records and private files have no public API until authentication is implemented.
    if (url.pathname.startsWith('/api/')) {
      return Response.json({ error: '아직 제공하지 않는 기능입니다.' }, { status: 404 });
    }
    return env.ASSETS.fetch(request);
  }
} satisfies ExportedHandler<Env>;
