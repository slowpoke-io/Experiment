create extension if not exists pgcrypto;

create table if not exists public.participants (
  prolific_id text primary key,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.progress (
  pipeline_code text not null,
  prolific_id text not null references public.participants (prolific_id) on delete cascade,
  iv1 text not null,
  iv2 text not null,
  current_stage_index integer not null default 0 check (current_stage_index >= 0),
  completed boolean not null default false,
  failed boolean not null default false,
  failed_stage_id text,
  failed_reason jsonb,
  stage_variants jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  total_seconds integer check (total_seconds is null or total_seconds >= 0),
  primary key (pipeline_code, prolific_id)
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  pipeline_code text not null,
  stage_id text not null,
  variant_id text not null,
  prolific_id text not null references public.participants (prolific_id) on delete cascade,
  answers jsonb not null,
  passed boolean not null,
  verdict jsonb not null,
  stage_seconds integer check (stage_seconds is null or stage_seconds >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  constraint submissions_pipeline_stage_participant_unique
    unique (pipeline_code, stage_id, prolific_id)
);

create index if not exists progress_pipeline_failed_idx
  on public.progress (pipeline_code, failed);

create index if not exists progress_pipeline_updated_at_idx
  on public.progress (pipeline_code, updated_at);

create index if not exists submissions_pipeline_prolific_idx
  on public.submissions (pipeline_code, prolific_id);

create index if not exists submissions_pipeline_stage_prolific_idx
  on public.submissions (pipeline_code, stage_id, prolific_id);

alter table public.participants enable row level security;
alter table public.progress enable row level security;
alter table public.submissions enable row level security;

create or replace view public.admin_summary as
select
  p.pipeline_code,
  p.prolific_id,
  p.iv1,
  p.iv2,
  p.started_at,
  p.updated_at,
  p.completed,
  p.failed,
  p.failed_stage_id,
  p.failed_reason,
  p.current_stage_index,
  p.total_seconds,
  coalesce(count(s.id), 0)::integer as submission_count,
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'stage_id', s.stage_id,
        'variant_id', s.variant_id,
        'passed', s.passed,
        'created_at', s.created_at
      )
      order by s.created_at
    ) filter (where s.id is not null),
    '[]'::jsonb
  ) as submissions
from public.progress p
left join public.submissions s
  on s.pipeline_code = p.pipeline_code
 and s.prolific_id = p.prolific_id
group by
  p.pipeline_code,
  p.prolific_id,
  p.iv1,
  p.iv2,
  p.started_at,
  p.updated_at,
  p.completed,
  p.failed,
  p.failed_stage_id,
  p.failed_reason,
  p.current_stage_index,
  p.total_seconds;
