import type {StaffEnv} from './staff-session.ts';
// Auth artifacts only. Do not delete staff identity, bootstrap lock or audit history.
export async function cleanStaffAuth(env:StaffEnv,now=Date.now()){
 await env.DB.batch([
  env.DB.prepare('DELETE FROM staff_auth_flows WHERE state_hash IN(SELECT state_hash FROM staff_auth_flows WHERE expires_at<? LIMIT 100)').bind(now),
  env.DB.prepare('DELETE FROM staff_sessions WHERE token_hash IN(SELECT token_hash FROM staff_sessions WHERE expires_at<? OR last_seen_at<? OR revoked_at IS NOT NULL LIMIT 100)').bind(now,now-1800000),
  env.DB.prepare('DELETE FROM staff_auth_rates WHERE key_hash IN(SELECT key_hash FROM staff_auth_rates WHERE expires_at<? LIMIT 100)').bind(now),
  env.DB.prepare('DELETE FROM staff_password_resets WHERE id IN(SELECT id FROM staff_password_resets WHERE expires_at<? LIMIT 100)').bind(now),
 ]);
}
