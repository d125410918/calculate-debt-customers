# calculate-debt-customers

多人網址分隔版還款試算與客戶資料系統。

## 功能

- `/original`：原始試算頁，只試算，不建立客戶資料。
- `/u/[slug]`：使用者獨立試算頁，可試算後輸入姓名並建立客戶資料。
- `/u/[slug]/customers`：該 slug 的客戶列表。
- `/u/[slug]/customers/[customerId]`：客戶資料與案件列表。
- `/u/[slug]/loans/[loanId]`：借款案件、原始分期表與實際還款紀錄。

## 試算規則

- 每 10,000 元，30 天利息 750。
- 一期預設 15 天。
- 一般前扣 2 期。
- 可手動改前扣期數。
- 汽機車類型會套用設定費 2,000。
- 黃金類型預設固定放款 50,000。
- 可新增多筆其他扣款。
- 所有金額先採四捨五入。
- 分幾期還完採逐期模擬：每期先抵利息，超過利息的部分扣本金，最後一期自動微調到本金歸零。

## 部署

1. 在 Neon 建立 PostgreSQL database。
2. 在 Vercel 專案新增環境變數 `DATABASE_URL`。
3. 安裝套件：

```bash
npm install
```

4. 推送資料表：

```bash
npm run db:push
```

5. 建立預設 demo 使用者：

```bash
npm run db:seed
```

6. 本機開發：

```bash
npm run dev
```

## 新增使用者頁面

目前先不做登入。要新增一個使用者網址，可以在 Neon 的 `Owner` 表新增一筆資料，例如：

- `slug`: `store-a`
- `displayName`: `A 店`
- `isActive`: `true`

並在 `CalculatorSetting` 表新增對應 `ownerId` 的設定，或先不新增，系統會使用預設試算規則。

新增後網址就是：

```text
/u/store-a
```

所有透過 `/u/store-a` 建立的客戶、案件、還款紀錄都會綁定該 owner，不會和其他 slug 混在一起。
