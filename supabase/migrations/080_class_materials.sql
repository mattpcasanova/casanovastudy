-- Class materials (2026-10-29): a teacher puts slides/notes on a class once, and
-- students in that class build study guides from them without downloading each
-- deck from Google Classroom. The teacher's browser prepares the file
-- (lib/uploads/prepare.ts): text is stored here, scanned pages go to the
-- teacher's uploads folder. Students read them only through API routes after a
-- class check. Service role writes; the teacher can read their own rows.
create table if not exists public.teacher_materials (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind text not null default 'other' check (kind in ('slides', 'document', 'pdf', 'other')),
  content text not null default '',
  images jsonb not null default '[]'::jsonb,
  char_count integer not null default 0,
  image_count integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists teacher_materials_teacher_idx on public.teacher_materials(teacher_id, created_at desc);
alter table public.teacher_materials enable row level security;
drop policy if exists "teacher reads own materials" on public.teacher_materials;
create policy "teacher reads own materials" on public.teacher_materials for select using (auth.uid() = teacher_id);

create table if not exists public.class_material_links (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  material_id uuid not null references public.teacher_materials(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  unique (class_id, material_id)
);
create index if not exists class_material_links_class_idx on public.class_material_links(class_id, created_at desc);
create index if not exists class_material_links_material_idx on public.class_material_links(material_id);
alter table public.class_material_links enable row level security;
drop policy if exists "teacher reads own material links" on public.class_material_links;
create policy "teacher reads own material links" on public.class_material_links for select using (auth.uid() = teacher_id);

-- Which class materials a guide was built from (the teacher sees "used in N guides").
alter table public.study_guides add column if not exists source_material_ids uuid[];
create index if not exists study_guides_source_materials_idx on public.study_guides using gin (source_material_ids);
