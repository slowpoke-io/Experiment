# Follow-Up Guide

## 常用頁面：

- `/follow-up`
- `/follow-up/settings`
- `/follow-up/results`

## 1. 入口

- 管理頁入口：`https://ai-workplace-assistant.nblab.im.ntu.edu.tw/follow-up`
- 登入密碼: `ntuim1114drH0ot`

## 2. 給受試者的 Study URL

要放到 Prolific，URL使用：

```text
https://ai-workplace-assistant.nblab.im.ntu.edu.tw/?prolific_id={{%PROLIFIC_PID%}}
```

## 3. Settings 頁面

登入後會先進入 `Settings`。

需要設定的欄位：

- `Pipeline code`
  - 這一批實驗資料的 id，可用來區分不同批次的實驗。
- `Complete code`
  - 受試者成功完成後回傳 Prolific 的 code。
- `Fail code`
  - 受試者失敗時回傳 Prolific 的 code。
- `No-consent code`
  - 受試者不同意 consent 時回傳 Prolific 的 code。
- `Study open`
  - 開啟：新受試者可以進入 study。
  - 關閉：新受試者不能開始 study。

設定好後按 `Save settings`。

右側的 `Redirect Preview` 會顯示：

- 實際 study URL
- 目前 pipeline code
- Complete / Fail / No Consent 對應的 Prolific redirect URL

## 4. Results 頁面

按右上角 `Results` 可進入結果頁。

這頁可以：

- 看目前 `In Progress / Failed / Completed` 人數
- 看四格 condition 分布
- 搜尋 `prolific_id`
- 依 `status / iv1 / iv2 / pipeline` 篩選
- 依欄位排序

表格中：

- `Feedback`
  - 顯示 `Yes / No`
  - 如果是 `Yes`，可點開看 feedback content 與 reason
- `Answers`
  - 可點開看所有作答項目
- `Failed`
  - 可點開看失敗原因

## 5. Download CSV

Results 頁右上角有 `Download`。

可選：

- `All participants`
  - 下載全部資料
- `Completed only`
  - 只下載成功完成者

下載內容會跟目前畫面選到的 `pipeline` 篩選一致。

### CSV coding note

CSV 匯出時，`A / B` 會轉成 `0 / 1`：

- `iv1`
  - `A = 0 = forewarning-only`
  - `B = 1 = refutational preemption`
- `iv2`
  - `A = 0 = emotional appeal`
  - `B = 1 = rational appeal`

## 6. Pipeline 使用方式

如果之後有不同批次或不同 follow-up wave：

1. 先到 `Settings`
2. 修改 `Pipeline code`
3. 存檔

之後新資料就會收進新的 pipeline。

在 `Results` 頁也可以直接切換或多選 pipeline 來查看舊資料，不需要回到設定頁反覆修改。

## 7. 建議操作方式

- 開始收資料前：
  - 確認 `Study open` 已開啟
  - 確認 `Pipeline code` 正確
  - 確認 `Complete / Fail / No-consent code` 正確
- 收資料中：
  - 主要看 `Results`
- 收完後：
  - 可將 `Study open` 關閉，避免新受試者再進入
  - 下載 CSV (依照勾選的 pipeline code )
