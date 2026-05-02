# Experiment Web App

這是一個用 `Next.js Pages Router` 實作的實驗網站。受試者從 Prolific 進站後，會先閱讀 informed consent，再依照固定的 7 個 stage 完成前測、情境閱讀、影片、互動、後測。前後端都在同一個 repo，資料由 server-side Supabase service role 寫入。

目前的 pipeline code 是 `study_v1`，核心操弄是 `iv1` 與 `iv2` 兩個二元變項，兩者都用 balanced assignment 指派：

- `iv1`: 控制 `stage_4` 的 `System Notice` 文案。
- `iv2`: 控制 `stage_6` 的 feedback popup framing。

## Experiment Flow

### Entry and Consent

1. 受試者由 Prolific 以 `/?prolific_id=...` 進站。
2. 首頁會檢查 `prolific_id`，若存在就自動導向 `/consent`，並保留其他 query string。
3. 若受試者不同意 consent，前端會呼叫 `GET /api/decline-url`，再導向 `PROLIFIC_NOCONSENT_URL`。
4. 若受試者同意 consent，前端會呼叫 `POST /api/init` 建立或讀取 participant progress。

### Initialization

`POST /api/init` 會做幾件事：

- `upsert` 受試者到 `participants`
- 建立 `progress` 紀錄
- 平衡分派 `iv1` / `iv2`
- 為每個 stage 決定 variant 並寫入 `progress.stage_variants`
- 檢查是否已有完成或失敗狀態
- 清理逾時放棄的受試者

如果受試者是第一次進站，`current_stage_index` 會從 `0` 開始，也就是 `stage_1`。

### Stage-by-Stage Flow

#### Stage 1: Questionnaire 1

- 內容：self-construal scale
- 題項來源：`scsIndependentQuestions` + `scsInterdependentQuestions`
- 呈現方式：先用固定 seed shuffle，再切成每頁 1 個 group
- 驗證：`attention_checks`
- 目前有 1 題 attention check

#### Stage 2: Scenario Introduction

- 內容：工作情境與 `AI Workplace Assistant` 介紹
- 目的：讓受試者進入 `Morgan Ellis` 的角色
- 驗證：`placeholder_validator`
- 限制：有 continue delay

#### Stage 3: Questionnaire 2

- 內容：前測 AI evaluation
- section：`pre_ai_evaluation`
- 驗證：`attention_checks`
- 目前有 1 題 attention check

#### Stage 4: System Notice

- 內容：觀看影片前的系統說明
- 操弄來源：`iv1`
- `iv1 = A`: 說明 AI 初期可能出錯
- `iv1 = B`: 除了上述說明外，額外強調 early-use issues 不應被解讀為 AI 整體能力不足
- 驗證：`placeholder_validator`
- 限制：有 continue delay

#### Stage 5: Video Task

- 內容：觀看 AI Workplace Assistant 的示範影片
- 驗證：`placeholder_validator`
- 重要限制：
  - 影片只能播放一次
  - 影片播完才可以繼續
  - 之後會看到 transition modal，再進入互動階段

#### Stage 6: AI Workplace Assistant

- 內容：延續影片結尾的對話情境，顯示互動 placeholder 與既定聊天內容
- 操弄來源：`iv2`
- `iv2 = A`: 以情緒 / 責任導向語氣請求 feedback
- `iv2 = B`: 以統計 / 效能導向語氣請求 feedback
- 驗證：`placeholder_validator`
- 互動流程：
  - 載入既定對話
  - 經過 popup delay 後跳出 feedback prompt
  - 受試者可填或不填文字回饋
  - submit button 有 delay

#### Stage 7: Questionnaire 3

- 內容：後測與 manipulation checks
- 驗證：`attention_checks`
- 目前包含以下 sections：
  - `pop_up_message`
  - `system_notice`
  - `post_ai_evaluation`
  - `post_experience_outcomes`
  - `post_failure_reactions`
  - `control_variables`
- 目前有 3 題 attention check，分別放在：
  - `post_ai_evaluation`
  - `post_experience_outcomes`
  - `post_failure_reactions`

### Completion, Failure, Timeout

每一個 stage submit 都會呼叫 `POST /api/submit`。

- 若 stage validator 通過：
  - 寫入 `submissions`
  - 推進 `progress.current_stage_index`
  - 若已到最後一關，標記 `completed = true`
  - 完成後導向 `PROLIFIC_COMPLETE_URL`

- 若 stage validator 未通過：
  - 寫入 `submissions`
  - 標記 `progress.failed = true`
  - 紀錄 `failed_stage_id` 與 `failed_reason`
  - 鎖定後續流程
  - 導向 `PROLIFIC_FAIL_URL`

- 若受試者超時：
  - 系統以 `30` 分鐘作為 abandon timeout
  - `init` 時會先執行 `cleanupAbandoned()`
  - `submit` 時也會檢查總耗時是否超過 `30 * 60` 秒
  - 超時會被視為 fail，並導向 `PROLIFIC_FAIL_URL`

## Validation Rules

目前專案只有兩種 validator，定義在 [src/lib/validators.ts](/Users/slowpoke/Documents/碩論/experiment/experiment/src/lib/validators.ts:1)：

- `placeholder_validator`: 一律通過
- `attention_checks`: 檢查指定題目的作答是否完全正確

目前使用情況：

- `stage_1`: `attention_checks`
- `stage_2`: `placeholder_validator`
- `stage_3`: `attention_checks`
- `stage_4`: `placeholder_validator`
- `stage_5`: `placeholder_validator`
- `stage_6`: `placeholder_validator`
- `stage_7`: `attention_checks`

## Data Model

Supabase schema 在 [supabase/schema.sql](/Users/slowpoke/Documents/碩論/experiment/experiment/supabase/schema.sql:1)。

### Tables

- `participants`: 受試者基本識別
- `progress`: 每位受試者在目前 pipeline 的狀態
- `submissions`: 每一個 stage 的提交結果

### Important `progress` fields

- `pipeline_code`
- `prolific_id`
- `iv1`
- `iv2`
- `current_stage_index`
- `completed`
- `failed`
- `failed_stage_id`
- `failed_reason`
- `stage_variants`
- `started_at`
- `updated_at`
- `total_seconds`

### Important views

- `admin_summary`
- `participant_questionnaire_responses`
- `admin_participant_overview`
- `admin_participant_detail`

## Participant-Facing Routes

- `/`
  - 需要 `prolific_id`
  - 有值時自動導向 `/consent`
- `/consent`
  - informed consent 頁面
- `/study`
  - study shell
- `/study/[stageId]`
  - 實際 stage route

## API Routes

### Participant Flow

- `POST /api/init`
  - 建立或恢復 participant session
- `GET /api/current-stage?prolificId=...`
  - 取得目前 stage
- `POST /api/submit`
  - 提交當前 stage 作答
- `GET /api/decline-url`
  - 取得不同意 consent 時的 Prolific redirect URL

### Admin

- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET /api/admin/dashboard`
- `GET /api/admin/participant`

### Testing

- `POST /api/testing/jump-stage`
  - 只在非 production 可用
  - 可把指定受試者重置到某一個 stage，方便開發測試

## Admin Dashboard

管理頁是 `/admin`。

- 以 `ADMIN_PASSWORD` 做簡單密碼驗證
- 驗證成功後會設置 `HttpOnly` cookie
- dashboard 會讀取 `admin_participant_overview`
- participant detail 會讀取 `admin_participant_detail`

這個 dashboard 主要用來看：

- 目前進行中 / 已失敗 / 已完成的人數
- `iv1 x iv2` 的 cell breakdown
- 每位受試者最後一次提交到哪個 stage
- 該受試者的作答與失敗原因

## Local Setup

### 1. Install

```bash
npm install
cp .env.local.example .env.local
```

### 2. Configure Environment Variables

把 `.env.local` 補成你自己的值：

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PROLIFIC_COMPLETE_URL=https://app.prolific.com/submissions/complete?cc=COMPLETECODE
PROLIFIC_FAIL_URL=https://app.prolific.com/submissions/complete?cc=FAILCODE
PROLIFIC_NOCONSENT_URL=https://app.prolific.com/submissions/complete?cc=NOCONSENT
ADMIN_PASSWORD=changeme
```

### 3. Initialize Supabase

把 [supabase/schema.sql](/Users/slowpoke/Documents/碩論/experiment/experiment/supabase/schema.sql:1) 整段貼到 Supabase SQL Editor 執行。

### 4. Run Locally

```bash
npm run dev
```

這個專案目前固定使用 webpack：

```bash
next dev --webpack
```

## Local Test URLs

受試者測試：

```text
http://localhost:3000/?prolific_id=test_user_001
```

Admin：

```text
http://localhost:3000/admin
```

同意 consent 後，系統會進入：

```text
http://localhost:3000/study/stage_1?prolific_id=test_user_001
```

## Key Files

```text
src/pages/index.tsx
src/pages/consent.tsx
src/pages/study/[stageId].tsx
src/pages/api/init.ts
src/pages/api/current-stage.ts
src/pages/api/submit.ts
src/pages/api/decline-url.ts
src/pages/api/testing/jump-stage.ts
src/lib/pipeline.ts
src/lib/pipeline-items.ts
src/lib/assignment.ts
src/lib/validators.ts
src/lib/participant-routing.ts
src/lib/admin-dashboard.ts
src/lib/admin-auth.ts
supabase/schema.sql
```

## Verification

```bash
npm run lint
npm run build
```

補充：`npm run lint` 目前只會跑 ESLint，不等於完整 TypeScript typecheck。
