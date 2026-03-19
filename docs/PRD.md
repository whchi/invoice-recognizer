# PRD: AI 智能發票解析中樞 (MVP Phase)

## 1. 產品概述 (Product Overview)
本產品為一款結合 OCR 與 LLM 技術的發票解析 SaaS 服務。旨在協助財務人員與開發者快速萃取發票資訊，並透過自訂 Template 輸出符合其系統需求的 JSON 或 CSV 格式。MVP 階段的商業模式採用 Credit-based (固定點數包) 買斷制。

## 2. 核心原則與範圍 (Core Principles & Out of Scope)
* **API First**：所有前端 UI 的操作，底層皆需有對應的 API 支撐，確保開發者體驗 (Developer Experience, DX)。
* **防禦性法務設計**：系統層面**不開發** PII (個人可識別資訊) 遮罩或資料加密隔離機制。作為替代，MVP 必須強迫使用者同意免責聲明，並在技術上保證發票處理完畢後立即銷毀暫存檔 (Zero Data Retention)。
* **Out of Scope (MVP 不做)**：自動儲值 (Auto-top-up)、複雜的多人協作 (RBAC 權限管理)、地端部署版本 (On-premise)。

---

## 3. 功能規格與優先級 (Feature Prioritization)
採用 **MoSCoW 方法** 將功能分為 P0 (Must-have)、P1 (Should-have) 與 P2 (Nice-to-have)。

### P0：MVP 核心必備 (上線的最低標準)
* **F-01: 使用者身份與額度系統 (Auth & Quota Engine)**
    * **訪客模式**：透過 IP 或 Session 追蹤，提供免登入 3 張/day 試用額度。
    * **註冊登入**：提供 Email/Password 與 Google OAuth 登入。
    * **註冊會員額度**：登入後自動重置為每日免費 20 張/day。
    * **點數錢包 (Credit Wallet)**：支援匯入「固定點數包」的額度，並在每次 API 成功回傳後扣除 1 點。
* **F-02: 核心解析管線 (Core Parsing Pipeline)**
    * **上傳模組**：支援拖曳上傳單張影像 (JPG/PNG) 或 PDF。
    * **合規免責 Checkbox**：上傳前必須勾選「同意影像傳送至第三方 AI，且本平台不負資料外洩責任」之聲明，未勾選無法調用 API。
    * **AI 處理引擎**：串接 OCR 前處理與 LLM 進行資訊萃取。
    * **Zero Data Retention 機制**：任務完成或失敗後，系統需自動刪除伺服器上的影像檔案。
* **F-03: 模板管理系統 (Template Management)**
    * **預設模板**：系統內建 1-2 款符合常見會計法規的標準 JSON Schema。
    * **自訂模板 (Custom Template)**：允許使用者輸入「模板名稱」與「期望的 JSON 格式/欄位」。
    * **我的最愛 (Favorites)**：可將特定模板標記為預設或最愛，以便下次快速套用。
* **F-04: 開發者中心 (Developer Center)**
    * **API Key 管理**：生成、停用與重新產生 API Key。
    * **API 文件與 SDK Snippet**：提供清晰的 API Endpoint 說明，以及至少兩種語言 (如 Python, Node.js) 的複製貼上範例程式碼。

### P1：重要次級功能 (優化體驗與變現)
* **F-05: 匯出與下載 (Export Module)**
    * 提供單筆或多筆解析結果的 JSON 與 CSV 格式一鍵下載功能。
* **F-06: 用量儀表板 (Usage Dashboard)**
    * 視覺化顯示當前剩餘的 Credit 點數，以及近 30 天的 API 呼叫次數折線圖。
* **F-07: 基礎金流串接 (Payment Gateway Integration)**
    * 串接 Stripe 或 TapPay，允許使用者在線上直接刷卡購買「10 萬次點數包」，付款成功後自動入帳至 Credit Wallet。

### P2：未來擴充 (MVP 後的迭代目標)
* **F-08: 批次處理與對照 UI (Batch & Human-in-the-loop)**
    * 支援一次上傳 50 張發票，並提供左右對照的 UI 介面，讓財務人員可以在下載前手動修正 LLM 的幻覺或 OCR 辨識錯誤。
* **F-09: 低餘額警示 (Low-Balance Alerts)**
    * 點數低於 10% 時，自動發送 Email 提醒購買。

---

## 4. 系統架構要求 (Architecture Requirements)
* **異步處理 (Asynchronous Processing)**：由於 LLM 回應時間不穩定（可能耗時 5-15 秒），API 設計不可採用單純的同步 (Synchronous) 回應。建議實作 Webhook 機制，或給予使用者一個 `Task ID` 進行 polling (輪詢)，以避免 Timeout。
* **嚴格的 Schema Validation**：在 LLM 將結果回傳給使用者之前，後端必須實作校驗層，確保回傳的 JSON 結構 100% 符合使用者定義的 Template，避免因 LLM 幻覺導致客戶端系統崩潰。
