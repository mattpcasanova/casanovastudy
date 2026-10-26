-- Language a study guide is written in (lib/study-options.ts GUIDE_LANGUAGES).
-- 'en-es' = English with Spanish support for English language learners.
-- Explain, hints and adaptive refills answer in the guide's language.
ALTER TABLE study_guides
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en'
  CHECK (language IN ('en', 'es', 'en-es', 'ht', 'pt', 'fr'));
