-- Contact form fields.
--
-- The contact form asks for an email address and a subject, neither of which
-- existed on enquiries. Both are optional: this is a WhatsApp-first market and
-- plenty of visitors will leave email blank.
--
-- Limits live in their own CHECK constraints rather than being folded into
-- enquiries_field_limits, so this migration does not have to drop and rebuild
-- the constraint the previous one created.

ALTER TABLE public.enquiries
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS subject text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'enquiries_email_limit') THEN
    ALTER TABLE public.enquiries ADD CONSTRAINT enquiries_email_limit CHECK (
      email IS NULL OR (length(email) <= 120 AND position('@' in email) > 1)
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'enquiries_subject_limit') THEN
    ALTER TABLE public.enquiries ADD CONSTRAINT enquiries_subject_limit CHECK (
      subject IS NULL OR length(subject) <= 80
    );
  END IF;
END $$;
