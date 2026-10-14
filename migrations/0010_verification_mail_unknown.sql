-- Unknown delivery outcomes must never enter the automatic send queue.
ALTER TABLE inquiry_mail_outbox ADD COLUMN unknown_at INTEGER;
-- An expired lease may have reached the provider before the previous worker stopped.
UPDATE inquiry_mail_outbox SET unknown_at=available_at,lease_until=NULL
 WHERE sent_at IS NULL AND failed_at IS NULL AND lease_token IS NOT NULL;
