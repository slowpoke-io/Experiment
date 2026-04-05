# Experiment Web App

單一 Next.js Pages Router 專案，前端與後端都在同一個 repo。受試者先進 informed consent page，同意後才會進入 `/study/[stageId]`。前端固定從 URL query `prolific_id` 取得受試者 ID，後端用 `src/pages/api/*` 實作 participant flow，所有資料透過 server-side Supabase service role 寫入。

## Setup Commands

```bash
npm install
cp .env.local.example .env.local
```

把 `.env.local` 補成你自己的值：

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PROLIFIC_COMPLETE_URL=https://app.prolific.com/submissions/complete?cc=COMPLETECODE
PROLIFIC_FAIL_URL=https://app.prolific.com/submissions/complete?cc=FAILCODE
PROLIFIC_NOCONSENT_URL=https://app.prolific.com/submissions/complete?cc=NOCONSENT
ADMIN_PASSWORD=changeme
```

## Supabase SQL

把 [supabase/schema.sql](/Users/slowpoke/Documents/碩論/experiment/experiment/supabase/schema.sql) 的內容整段貼到 Supabase SQL Editor 執行。完整 SQL 如下：

```sql
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
```

## Run Locally

```bash
npm run dev
```

這個 script 目前固定使用 webpack，不走 Turbopack。

目前 pipeline 內建的 stage 流程：

1. `stage_1`: SCS Scale
2. `stage_2`: 情境說明 + AI Workplace Assistant 文字介紹
3. `stage_3`: 初始量表（trust / competence / attitude）
4. `stage_4`: AI 可能出錯的預先說明，只對 `iv1 in ["A", "B"]` 顯示
5. `stage_5`: 影片播放頁面，影片播完才可繼續
6. `stage_6`: 互動系統 placeholder，5 秒後彈出依 `iv2` 變化的 modal
7. `stage_7`: 後測量表（trust / competence / attitude / continued use）

測試網址：

```text
http://localhost:3000/?prolific_id=test_user_001
```

同意 consent 後，系統會導到第一個 stage route，例如：

```text
http://localhost:3000/study/stage_1?prolific_id=test_user_001
```

影片頁使用 [`react-player`](https://www.npmjs.com/package/react-player)。

## API Routes

- `POST /api/init`
- `GET /api/current-stage?prolificId=...`
- `POST /api/submit`
- `GET /api/decline-url`

## File Structure

```text
.
├── .env.local.example
├── README.md
├── supabase/
│   └── schema.sql
├── src/
│   ├── components/
│   │   ├── ConsentPanel.tsx
│   │   ├── ContentStage.tsx
│   │   ├── InteractivePlaceholderStage.tsx
│   │   ├── LikertSurveyStage.tsx
│   │   ├── RedirectModal.tsx
│   │   ├── StageCard.tsx
│   │   └── StageRenderer.tsx
│   │   └── VideoStage.tsx
│   ├── lib/
│   │   ├── assignment.ts
│   │   ├── participant-routing.ts
│   │   ├── pipeline.ts
│   │   ├── supabase-admin.ts
│   │   ├── types.ts
│   │   └── validators.ts
│   ├── pages/
│   │   ├── api/
│   │   │   ├── current-stage.ts
│   │   │   ├── decline-url.ts
│   │   │   ├── init.ts
│   │   │   └── submit.ts
│   │   ├── study/
│   │   │   └── [stageId].tsx
│   │   ├── _app.tsx
│   │   ├── _document.tsx
│   │   └── index.tsx
│   └── styles/
│       └── globals.css
```

## Verification

```bash
npm run lint
npm run build
```
