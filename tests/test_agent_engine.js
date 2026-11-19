load("data/namviet_data_bundle.js");
load("src/spreadsheet_io.js");
load("src/agent_engine.js");

var passed = 0;
var failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed++;
    print("[PASS] " + msg);
  } else {
    failed++;
    print("[FAIL] " + msg);
  }
}

function assertEqual(actual, expected, msg) {
  if (actual === expected) {
    passed++;
    print("[PASS] " + msg + " (" + actual + ")");
  } else {
    failed++;
    print("[FAIL] " + msg + " — expected: " + expected + ", actual: " + actual);
  }
}

// 1. Test CSV parser with Vietnamese, BOM, semicolons, and quoted multiline
var csvSample = "\uFEFFTên công ty;Nguồn;Khu vực;Ngành nghề;Nhu cầu;Ngân sách\r\n" +
  "\"Công ty TNHH Hoa Sen\";Website;TP.HCM;Thương mại;\"Cần phần mềm kế toán,\nhóa đơn điện tử\";\"60 triệu\"\r\n" +
  "\"Cty CP Sao Việt\";Hội thảo;Hà Nội;Dịch vụ B2B;\"CRM bán hàng\";\"1.2 tỷ\"\r\n";

var parsedCsv = SpreadsheetIO.parseCSV(csvSample);
assertEqual(parsedCsv.records.length, 2, "CSV parses 2 records with semicolon delimiter & multiline quote");
var autoMap = SpreadsheetIO.detectColumnMapping(parsedCsv.headers);
assertEqual(autoMap.company_name, "Tên công ty", "Auto column mapping detects Vietnamese company header");
assertEqual(autoMap.need_description, "Nhu cầu", "Auto column mapping detects Vietnamese need header");
var mappedLeads = SpreadsheetIO.mapRecordsToLeads(parsedCsv.records, autoMap);
assertEqual(mappedLeads[0].budget_vnd, 60000000, "Parses '60 triệu' -> 60000000");
assertEqual(mappedLeads[1].budget_vnd, 1200000000, "Parses '1.2 tỷ' -> 1200000000");

// 2. Test XLSX Writer -> Reader Round-trip
var xlsxBytes = SpreadsheetIO.buildXlsxUint8Array([
  {
    name: "Danh sách Leads",
    headers: ["Mã", "Tên công ty", "Khu vực", "Ngân sách", "Nhu cầu"],
    rows: [
      ["T-01", "Công ty TNHH Bách Khoa", "Hà Nội", 85000000, "Phần mềm kế toán & CRM"],
      ["T-02", "Cty Nam Phương", "Đà Nẵng", 42000000, "Quản lý kho đa chi nhánh"]
    ]
  },
  {
    name: "Tổng hợp",
    headers: ["Chỉ số", "Giá trị"],
    rows: [["Tổng lead", 2]]
  }
]);
var xlsxParsed = SpreadsheetIO.parseXlsxArrayBuffer(xlsxBytes.buffer);
assertEqual(xlsxParsed.sheetNames.length, 2, "XLSX round-trip preserves 2 sheets");
assertEqual(xlsxParsed.sheets["Danh sách Leads"].records.length, 2, "XLSX round-trip parses 2 rows");
assertEqual(xlsxParsed.sheets["Danh sách Leads"].records[0]["Tên công ty"], "Công ty TNHH Bách Khoa", "XLSX preserves UTF-8 Vietnamese accents");
assertEqual(xlsxParsed.sheets["Danh sách Leads"].records[1]["Ngân sách"], "42000000", "XLSX preserves numeric cell values");

// 3. Test Google Sheets URL Parser (Standard + Publish-to-Web)
var gsInfo = SpreadsheetIO.parseGoogleSheetUrl("https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz12345/edit?gid=987654#gid=987654");
assertEqual(gsInfo.spreadsheetId, "1AbCdEfGhIjKlMnOpQrStUvWxYz12345", "Extracts Google Sheet ID");
assertEqual(gsInfo.gid, "987654", "Extracts Google Sheet GID");

var gsPubInfo = SpreadsheetIO.parseGoogleSheetUrl("https://docs.google.com/spreadsheets/d/e/2PACX-1vTestPubId123/pubhtml?gid=1122&single=true");
assertEqual(gsPubInfo.isPublishedUrl, true, "Detects Google Sheet Publish-to-Web URL");
assertEqual(gsPubInfo.spreadsheetId, "2PACX-1vTestPubId123", "Extracts Publish-to-Web ID");
assertEqual(gsPubInfo.gvizCsvUrl, "https://docs.google.com/spreadsheets/d/e/2PACX-1vTestPubId123/pub?output=csv&gid=1122", "Builds Publish-to-Web CSV URL");

// 4. Test Full Nam Việt AI Agent Pipeline on 18 Sample Leads
var result = NamVietAgent.runAgentPipeline(NAMVIET_DATA.sampleLeads, NAMVIET_DATA);
var clusters = result.clusters;
var summary = result.insights.summary;

assertEqual(summary.raw_leads_count, 18, "Pipeline receives 18 raw leads");
assertEqual(summary.unified_companies_count, 15, "Pipeline merges 18 raw leads into 15 unified companies (Thịnh Vượng 3->1, An Khang 2->1)");
assertEqual(summary.duplicates_merged_count, 3, "3 duplicate raw records merged automatically");

function findCluster(substr) {
  var s = NamVietAgent.stripAccents(substr);
  return clusters.filter(function (c) {
    return NamVietAgent.stripAccents(c.company_name).indexOf(s) !== -1;
  })[0];
}

// Thịnh Vượng (3 leads merged)
var thinhVuong = findCluster("Thịnh Vượng");
assert(!!thinhVuong, "Found merged cluster Thịnh Vượng");
assertEqual(thinhVuong.raw_record_count, 3, "Thịnh Vượng merges Website + Hội thảo + Campaign (TV Trading)");
assertEqual(thinhVuong.analysis.primary_product_code, "NV-SUITE", "Thịnh Vượng upgraded to NV-SUITE across HRM + ACC + INV + CRM");
assertEqual(thinhVuong.scoring.tier, "A", "Thịnh Vượng scored Tier A");
assertEqual(thinhVuong.routing.proposed_rep.id, "NVKD-04", "Thịnh Vượng routed to NVKD-04 (Phạm Thảo Vy - TP.HCM Thương mại)");

// An Khang (2 leads merged)
var anKhang = findCluster("An Khang");
assert(!!anKhang, "Found merged cluster An Khang");
assertEqual(anKhang.raw_record_count, 2, "An Khang merges An Khang + An Khang Medical");
assertEqual(anKhang.analysis.primary_product_code, "NV-SUITE", "An Khang upgraded to NV-SUITE (ACC + CRM)");
assertEqual(anKhang.routing.proposed_rep.id, "NVKD-03", "An Khang routed to NVKD-03 (Lê Quang Khải - Hà Nội Dịch vụ B2B)");

// Big-budget wrong-product trap check
var dongPhuong = findCluster("Đông Phương");
var truongSon = findCluster("Trường Sơn");
assert(!!dongPhuong && !!truongSon, "Found Big-Budget Out-of-Scope leads");
assertEqual(dongPhuong.scoring.tier, "D", "1.8 tỷ HIS Hospital blocked at Tier D");
assertEqual(truongSon.scoring.tier, "D", "950 triệu MES/CNC factory blocked at Tier D");
assert(dongPhuong.scoring.total_score <= 22, "HIS score capped <= 22");
assert(dongPhuong.scoring.big_budget_traps_count !== false && dongPhuong.scoring.big_budget_trap_prevented === true, "Flagged big budget trap prevented");

// Incomplete-but-promising lead check (Thời trang Mây Trắng)
var mayTrang = findCluster("Mây Trắng");
assert(!!mayTrang, "Found Thời trang Mây Trắng");
assertEqual(mayTrang.workflow_stage, "DRAFT_FOR_ENRICHMENT", "Incomplete fitting SME lead goes to DRAFT_FOR_ENRICHMENT (NOT discarded!)");
assert(mayTrang.draft.questions.length >= 3, "Generated targeted follow-up questions for Mây Trắng");
assertEqual(mayTrang.routing.proposed_rep.id, "NVKD-02", "Mây Trắng routed to NVKD-02 (Trần Ngọc Mai - Hà Nội Bán lẻ & F&B)");

// Neglected lead & Routing dispute escalation check
var dongA = findCluster("Đông Á");
assert(!!dongA, "Found Đông Á Logistics");
assertEqual(dongA.workflow_stage, "PENDING_MANAGER_APPROVAL", "Neglected lead Đông Á escalated to Sales Manager");
assert(dongA.routing.escalation_triggers.some(function (t) { return t.code === "NEGLECTED_LEAD_ALERT"; }), "Triggered NEGLECTED_LEAD_ALERT");

var minhTam = findCluster("Minh Tâm");
assert(!!minhTam, "Found Minh Tâm Tech");
assertEqual(minhTam.workflow_stage, "PENDING_MANAGER_APPROVAL", "Disputed lead Minh Tâm escalated to Sales Manager");
assert(minhTam.routing.escalation_triggers.some(function (t) { return t.code === "ROUTING_DISPUTE"; }), "Triggered ROUTING_DISPUTE");

// An Phát history continuity check
var anPhat = findCluster("An Phát");
assert(!!anPhat && !!anPhat.matched_history, "An Phát Co. matched HIST-001 in contact history");
assertEqual(anPhat.routing.proposed_rep.id, "NVKD-04", "An Phát retains NVKD-04 Phạm Thảo Vy to prevent double-calling");

// Priority label check (Bước 3: Cao / Trung bình / Thấp)
assertEqual(thinhVuong.scoring.priority_label, "Cao (Hot)", "Tier A carries priority_label Cao (Hot)");
assertEqual(mayTrang.scoring.priority_label, "Trung bình (Warm)", "Tier B carries priority_label Trung bình (Warm)");

// Bước 2: Missing contact_role detected as Người ra quyết định / Chức vụ
var noRoleResult = NamVietAgent.runAgentPipeline([{
  lead_id: "ROLE-1",
  created_at: "2026-11-11",
  source: "Website",
  company_name: "Công ty TNHH Kiểm Thử Quyền Quyết Định",
  tax_id: "0319900112",
  contact_name: "Nguyễn Văn X",
  contact_role: "",
  email: "x@testrole.vn",
  phone: "0903334455",
  region: "TP.HCM",
  industry: "Thương mại",
  company_size: 40,
  need_description: "Cần phần mềm kế toán SME",
  budget_vnd: 65000000,
  timeline: "Tháng 12"
}], NAMVIET_DATA);
assert(
  noRoleResult.clusters[0].analysis.missing_fields.indexOf("Người ra quyết định / Chức vụ") !== -1,
  "Bước 2 detects missing Người ra quyết định / Chức vụ when contact_role is empty"
);

// Bước 1 Decision -> No -> DNC_LIST check (via HIST-005 Dược Tâm An)
var dncResult = NamVietAgent.runAgentPipeline([{
  lead_id: "DNC-1",
  created_at: "2026-11-11",
  source: "Website",
  company_name: "Cty CP Dược Tâm An",
  tax_id: "0318899001",
  contact_name: "Lê Minh",
  contact_role: "Trưởng phòng IT",
  email: "minh@tamanpharma.vn",
  phone: "0901223344",
  region: "TP.HCM",
  industry: "Y tế",
  company_size: 90,
  need_description: "Hỏi thông tin phần mềm kế toán",
  budget_vnd: 80000000,
  timeline: "Tháng 12"
}], NAMVIET_DATA);
var dncCluster = dncResult.clusters[0];
assertEqual(dncCluster.workflow_stage, "DNC_LIST", "Bước 1 CRM history check (No) routes Dược Tâm An to DNC_LIST");
assertEqual(dncCluster.scoring.priority_level, "DNC", "DNC cluster marked priority_level DNC");
assertEqual(dncCluster.routing.proposed_rep, null, "DNC cluster is not assigned to any Sales rep");
assertEqual(dncResult.insights.summary.dnc_count, 1, "Summary counts dnc_count = 1");

// Bước 4 -> Không khớp Sales branch check (AeroSpace Asia Pacific Ltd in Singapore)
var unmatchedResult = NamVietAgent.runAgentPipeline([{
  lead_id: "UNM-1",
  created_at: "2026-11-11",
  source: "Website",
  company_name: "AeroSpace Asia Pacific Ltd",
  tax_id: "",
  contact_name: "Mr. Ken",
  contact_role: "Director",
  email: "ken@aerospace-ap.sg",
  phone: "",
  region: "Singapore",
  industry: "Hàng không vũ trụ",
  company_size: 120,
  need_description: "Cần phần mềm CRM quản lý đối tác B2B",
  budget_vnd: 120000000,
  timeline: "Quý 1"
}], NAMVIET_DATA);
var unmatchedCluster = unmatchedResult.clusters[0];
assertEqual(unmatchedCluster.workflow_stage, "UNMATCHED_SALES", "Bước 4 routes uncovered foreign region/industry to UNMATCHED_SALES");
assertEqual(unmatchedCluster.routing.unmatched_sales, true, "Flags routing.unmatched_sales = true");
assertEqual(unmatchedCluster.routing.proposed_rep, null, "Unmatched lead has proposed_rep = null until manager assigns");

// Test Manager Approval Decision ([HITL 1]) + Rep Review ([HITL 2]) + 5 Flowchart Outputs
assertEqual(thinhVuong.hitl2.required, true, "Bước 5 creates [HITL 2] pending review for assigned rep");
assertEqual(thinhVuong.hitl2.status, "PENDING_REP_REVIEW", "Initial [HITL 2] status is PENDING_REP_REVIEW");
assert(!!thinhVuong.draft.zalo_message && thinhVuong.draft.zalo_message.length > 20, "Bước 5 composes Zalo OA draft message alongside Email");

NamVietAgent.applyManagerDecision(minhTam, "APPROVE", "NVKD-06", "Thống nhất giao trụ sở chính TP.HCM", NAMVIET_DATA.salesTeam);
assertEqual(minhTam.workflow_stage, "ASSIGNED_TO_REP", "Manager approval [HITL 1] transitions Minh Tâm to ASSIGNED_TO_REP");
assertEqual(minhTam.routing.proposed_rep.id, "NVKD-06", "Manager approval confirms NVKD-06");
assertEqual(minhTam.hitl2.blocked_by_hitl1, false, "Manager approval [HITL 1] unlocks [HITL 2] for Sales review");

NamVietAgent.applyRepReviewDecision(thinhVuong, "Zalo", "Bản nháp Zalo đã chỉnh tay", "Đã kiểm duyệt thông số gói Suite");
assertEqual(thinhVuong.hitl2.status, "APPROVED_AND_SENT", "[HITL 2] Rep review transitions status to APPROVED_AND_SENT");
assertEqual(thinhVuong.hitl2.channel, "Zalo", "[HITL 2] records chosen outreach channel (Zalo)");

assert(result.outputs && Array.isArray(result.outputs.sales_task_lists), "Output includes sales_task_lists for 8 Sales reps");
assertEqual(result.outputs.sales_task_lists.length, 8, "Output generates task lists for all 8 Sales reps");
assert(result.outputs && result.outputs.exceptions && Array.isArray(result.outputs.exceptions.hitl1_pending), "Output includes exceptions buckets");
assert(result.outputs && Array.isArray(result.outputs.audit_trail) && result.outputs.audit_trail.length > 15, "Output includes Audit Log trail");

// Test app.js parses and registers cleanly
var domEvents = [];
var document = {
  addEventListener: function (ev, fn) {
    domEvents.push({ ev: ev, fn: fn });
  }
};
load("app.js");
assertEqual(domEvents.length, 1, "app.js loads without syntax errors and registers DOMContentLoaded");

// Stress test: 700 leads/week volume
var largeBatch = [];
for (var lb = 0; lb < 700; lb++) {
  var baseItem = NAMVIET_DATA.sampleLeads[lb % NAMVIET_DATA.sampleLeads.length];
  largeBatch.push({
    lead_id: "B700-" + (lb + 1),
    created_at: "2026-11-11",
    source: baseItem.source,
    company_name: "Công ty TNHH Doanh Nghiệp Số " + Math.floor(lb / 2) + " " + (lb % 2 === 0 ? "Việt" : "Nam"),
    tax_id: lb % 3 === 0 ? ("031000" + String(Math.floor(lb / 2)).padStart(4, "0")) : "",
    contact_name: "Liên hệ " + lb,
    contact_role: "Quản lý",
    email: "user" + lb + "@comp" + Math.floor(lb / 2) + ".vn",
    phone: "090" + String(1000000 + Math.floor(lb / 2)),
    region: baseItem.region,
    industry: baseItem.industry,
    company_size: baseItem.company_size,
    need_description: baseItem.need_description,
    budget_vnd: baseItem.budget_vnd,
    timeline: baseItem.timeline
  });
}
var tStart = Date.now();
var largeRes = NamVietAgent.runAgentPipeline(largeBatch, NAMVIET_DATA);
var largeMs = Date.now() - tStart;
assertEqual(largeRes.insights.summary.raw_leads_count, 700, "Stress test processes all 700 weekly leads");
assert(largeMs < 5000, "700-lead batch finishes quickly (" + largeMs + " ms < 5000 ms)");

print("\n=== SUMMARY: " + passed + " PASSED, " + failed + " FAILED ===");
if (failed > 0) {
  throw new Error("Unit tests failed: " + failed);
}
