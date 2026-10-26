-- Regrade a report (2026-10-26): the pages a paper was graded from, so a
-- teacher can have one paper graded again with a note ("the circle on Q8 is
-- C") without finding the photos. The batch grader saves them on insert;
-- sets graded before this have none (scripts/backfill-batch-pages.ts can
-- attach them). Cloudinary URLs only (lib/uploads/server-images.ts checks).
alter table public.grading_results
  add column if not exists page_urls jsonb;
