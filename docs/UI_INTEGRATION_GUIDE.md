# Hướng dẫn Tích hợp Lõi AI Agent cho Giao diện Mới (Công ty Nam Việt)

Tài liệu này cung cấp hợp đồng dữ liệu (Data Contract) và code mẫu để bạn xây dựng lại hoàn toàn giao diện mới (HTML/Tailwind, React, Vue, Next.js...) trên nền 3 module lõi không phụ thuộc UI:

1. `data/namviet_data_bundle.js` &rarr; `window.NAMVIET_DATA`
2. `src/spreadsheet_io.js` &rarr; `window.SpreadsheetIO`
3. `src/agent_engine.js` &rarr; `window.NamVietAgent`

---

## 1. Nhúng vào Giao diện mới (HTML hoặc React/Vite)

Nếu dùng HTML thuần hoặc CDN React/Tailwind, chỉ cần nhúng theo đúng thứ tự trước script UI của bạn:

```html
<script src="data/namviet_data_bundle.js"></script>
<script src="src/spreadsheet_io.js"></script>
<script src="src/agent_engine.js"></script>
<script src="your-new-ui.js"></script>
```

> Máy chủ local hiện tại (`http://localhost:8080`) phục vụ trực tiếp thư mục `/Users/uyen/AI301_Agent` với UTF-8 chuẩn. Nếu bạn tạo giao diện mới tại `v2.html` hoặc thay thế `index.html`, chỉ cần mở lại `http://localhost:8080` để test ngay.

---

## 2. Luồng gọi API chuẩn từ UI mới

### Bước A: Đọc dữ liệu từ CSV / XLSX / Google Sheet

```javascript
// 1. Từ file .csv hoặc text dán từ Excel/Sheets
const table = SpreadsheetIO.parseCSV(csvText);

// 2. Từ file .xlsx (ArrayBuffer từ input[type="file"])
const wb = SpreadsheetIO.parseXlsxArrayBuffer(arrayBuffer);
const firstSheetName = wb.sheetNames[0];
const tableFromXlsx = wb.sheets[firstSheetName]; // { headers, records }

// 3. Từ Link Google Sheet (cả link /edit và link /pubhtml)
const gsRes = await SpreadsheetIO.fetchGoogleSheetTable(googleSheetUrl);
const tableFromSheet = gsRes.table; // { headers, records }

// 4. Tự động ánh xạ cột & chuẩn hóa sang Lead[]
const mapping = SpreadsheetIO.detectColumnMapping(table.headers);
const leads = SpreadsheetIO.mapRecordsToLeads(table.records, mapping);
```

### Bước B: Chạy AI Agent & (Tùy chọn) Bổ sung Live LLM

```javascript
// Chạy lõi Hybrid AI + Rule Engine (đồng bộ, < 50ms)
let result = NamVietAgent.runAgentPipeline(leads, NAMVIET_DATA);

// Tùy chọn: Nếu người dùng nhập Gemini hoặc OpenAI API Key
if (apiKey) {
  result = await NamVietAgent.enrichWithLiveLLM(result, {
    provider: "gemini", // hoặc "openai"
    model: "gemini-2.5-flash",
    apiKey: apiKey
  });
}
```

### Bước C: Trưởng phòng Kinh doanh Duyệt / Điều chuyển trên UI

```javascript
// Khi bấm nút "Duyệt & Giao việc" hoặc "Tạm giữ" trong chi tiết hồ sơ
NamVietAgent.applyManagerDecision(
  selectedCluster,       // object phần tử trong result.clusters
  "APPROVE",             // "APPROVE" | "REJECT_HOLD"
  selectedSalesRepId,    // VD: "NVKD-06" (hoặc null để giữ người đề xuất)
  managerNoteText,       // Ghi chú xử lý
  NAMVIET_DATA.salesTeam
);
```

### Bước D: Xuất Báo cáo Excel (.xlsx) / CSV

```javascript
// Xuất file Excel nhiều sheet trực tiếp trên trình duyệt
const xlsxBytes = SpreadsheetIO.buildXlsxUint8Array([
  { name: "Phan_Cong_Tiep_Can", headers: mainHeaders, rows: mainRows },
  { name: "Tong_Hop_Kinh_Doanh", headers: sumHeaders, rows: sumRows }
]);
const blob = new Blob([xlsxBytes], {
  type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
});
```

---

## 3. Mẫu JSON Output thực tế trả về cho UI (`result`)

```json
{
  "processed_at": "2026-11-12T06:30:00.000Z",
  "mode": "HYBRID_AGENT_RULE_ENGINE",
  "insights": {
    "summary": {
      "raw_leads_count": 18,
      "unified_companies_count": 15,
      "duplicates_merged_count": 3,
      "duplicate_clusters_count": 6,
      "hot_warm_count": 12,
      "enrichment_draft_count": 1,
      "disqualified_count": 3,
      "big_budget_traps_count": 2,
      "manager_approval_count": 3,
      "neglected_alerts_count": 2,
      "estimated_qualified_pipeline_vnd": 810000000
    },
    "source_stats": [
      { "source": "Website", "total": 8, "qualified": 6, "oos": 2, "incomplete": 0 }
    ],
    "product_demand": [
      { "code": "NV-SUITE", "name": "NamViet All-in-One SME Suite...", "count": 9, "total_budget": 670000000 }
    ],
    "rep_workloads": [
      { "id": "NVKD-04", "name": "Phạm Thảo Vy", "region": "Miền Nam", "existing_leads": 71, "new_assigned": 3, "capacity": 95 }
    ],
    "recommendations": [
      {
        "category": "Loại bẫy ngân sách lớn sai sản phẩm",
        "priority": "Rất cao",
        "insight": "Phát hiện 2 hồ sơ có ngân sách lớn (tổng 2.75 tỷ đ)...",
        "action": "Loại khỏi hàng đợi ưu tiên của 8 NVKD ngay lập tức..."
      }
    ]
  },
  "clusters": [
    {
      "cluster_id": "CL-001",
      "company_name": "Công ty TNHH Giải pháp Thương mại Thịnh Vượng",
      "aliases": ["Công ty TNHH Giải pháp Thương mại Thịnh Vượng", "Cty Thịnh Vượng", "TV Trading (Thinh Vuong)"],
      "is_duplicate_cluster": true,
      "raw_record_count": 3,
      "dedup_reasons": ["Trùng tên chuẩn hóa / alias (\"thinh vuong\")", "Trùng domain email doanh nghiệp (@thinhvuongtrading.vn)"],
      "sources": ["Website", "Hội thảo", "Campaign"],
      "regions": ["TP.HCM"],
      "primary_industry": "Thương mại",
      "company_size": 85,
      "budget_vnd": 140000000,
      "workflow_stage": "ASSIGNED_TO_REP",
      "workflow_stage_label": "Giao việc cho NVKD (Tiếp cận ngay)",
      "analysis": {
        "is_out_of_scope": false,
        "primary_product_code": "NV-SUITE",
        "primary_product_name": "NamViet All-in-One SME Suite...",
        "missing_fields": [],
        "completeness_pct": 100,
        "needs_enrichment_draft": false,
        "icp_status": "FIT_COMPLETE"
      },
      "scoring": {
        "total_score": 100,
        "tier": "A",
        "sla_hours": 2,
        "big_budget_trap_prevented": false,
        "breakdown": {
          "product_fit": 40,
          "icp_size_industry": 20,
          "need_clarity_urgency": 20,
          "completeness_trust": 10,
          "budget_alignment": 10
        }
      },
      "routing": {
        "proposed_rep": { "id": "NVKD-04", "name": "Phạm Thảo Vy", "region": "Miền Nam" },
        "routing_reason": "Phụ trách khu vực Miền Nam • Đúng nhóm ngành (Thương mại) • Thế mạnh NV-SUITE",
        "escalation_triggers": [],
        "requires_manager_approval": false,
        "manager_approval_status": "NOT_REQUIRED"
      },
      "draft": {
        "type": "DIRECT_APPROACH",
        "subject": "[Nam Việt] Đề xuất giải pháp NV-SUITE cho Công ty TNHH Giải pháp Thương mại Thịnh Vượng",
        "questions": [],
        "message": "Kính chào Anh/Chị Nguyễn Thị Lan..."
      },
      "audit_logs": [
        { "step": "1. Chuẩn hóa & Lọc trùng", "detail": "Gom nhóm 3 bản ghi..." }
      ]
    }
  ]
}
```

---

## 4. Checklist các giá trị Enum cần xử lý trên Giao diện mới

- **`workflow_stage`**:
  - `ASSIGNED_TO_REP` (Xanh lá — Giao ngay cho NVKD)
  - `DRAFT_FOR_ENRICHMENT` (Vàng hổ phách — Thiếu thông tin nhưng phù hợp, cần gửi Draft câu hỏi)
  - `PENDING_MANAGER_APPROVAL` (Tím — Vượt thẩm quyền / Tranh chấp / Bỏ quên SLA, hiện nút Duyệt cho Trưởng phòng)
  - `DISQUALIFIED_OUT_OF_SCOPE` (Xám/Đỏ — Sai sản phẩm / Chặn bẫy ngân sách lớn)
  - `MANAGER_ON_HOLD` (Đỏ — Trưởng phòng tạm giữ)
- **`scoring.tier`**: `"A"` (Hot, SLA 2h) | `"B"` (Warm, SLA 4h) | `"C"` (Khai thác thêm, SLA 24h) | `"D"` (Không phù hợp)
- **`routing.escalation_triggers[].code`**: `"ROUTING_DISPUTE"` | `"NEGLECTED_LEAD_ALERT"` | `"MULTI_BRANCH_CONFLICT"` | `"VIP_BUDGET_ESCALATION"`

