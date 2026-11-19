load("src/spreadsheet_io.js");
load("src/agent_engine.js");

function loadJson(path) {
  return JSON.parse(readFile(path));
}

var datasets = {
  catalog: loadJson("data/product_catalog.json"),
  salesTeam: loadJson("data/sales_team.json"),
  contactHistory: loadJson("data/contact_history.json"),
  rules: loadJson("data/scoring_and_routing_rules.json")
};

var inputPath = (typeof arguments !== "undefined" && arguments[0]) ? arguments[0] : "data/sample_leads.json";
var rawLeads;

if (/\.csv$/i.test(inputPath)) {
  var csvText = readFile(inputPath);
  var table = SpreadsheetIO.parseCSV(csvText);
  var mapping = SpreadsheetIO.detectColumnMapping(table.headers);
  rawLeads = SpreadsheetIO.mapRecordsToLeads(table.records, mapping);
} else {
  rawLeads = loadJson(inputPath);
}

var t0 = Date.now();
var result = NamVietAgent.runAgentPipeline(rawLeads, datasets);
var elapsedMs = Date.now() - t0;

var s = result.insights.summary;

print("================================================================================");
print("NAM VIỆT AI LEAD AGENT — KẾT QUẢ PHÂN TÍCH & ĐIỀU PHỐI (" + elapsedMs + " ms)");
print("Nguồn đầu vào: " + inputPath);
print("================================================================================");
print("• Tổng hồ sơ thô đầu vào       : " + s.raw_leads_count);
print("• Doanh nghiệp duy nhất (gộp)  : " + s.unified_companies_count + " (gộp " + s.duplicates_merged_count + " bản ghi trùng)");
print("• Đạt chuẩn tiếp cận (Hạng A/B): " + s.hot_warm_count + " (Pipeline: " + NamVietAgent.formatVnd(s.estimated_qualified_pipeline_vnd) + ")");
print("• Cần hỏi bổ sung (Draft)      : " + s.enrichment_draft_count);
print("• Bẫy ngân sách sai SP (Loại)  : " + s.big_budget_traps_count + " / " + s.disqualified_count);
print("• Chờ Trưởng phòng KD duyệt    : " + s.manager_approval_count + " (Bỏ quên SLA: " + s.neglected_alerts_count + ")");
print("");
print("--- CHI TIẾT HỒ SƠ DOANH NGHIỆP & PHÂN CÔNG ---");

for (var i = 0; i < result.clusters.length; i++) {
  var c = result.clusters[i];
  var repStr = c.routing.proposed_rep
    ? c.routing.proposed_rep.id + " (" + c.routing.proposed_rep.name + " - " + c.routing.proposed_rep.region + ")"
    : "Không phân công";
  var flags = [];
  if (c.raw_record_count > 1) flags.push("Gộp " + c.raw_record_count + " bản ghi: " + c.aliases.join(" / "));
  if (c.matched_history) flags.push("Khớp lịch sử " + c.matched_history.history_id);
  if (c.scoring.big_budget_trap_prevented) flags.push("CHẶN BẪY NGÂN SÁCH " + NamVietAgent.formatVnd(c.budget_vnd));
  c.routing.escalation_triggers.forEach(function (t) { flags.push(t.code + ": " + t.message); });

  print(
    (i + 1) + ". [" + c.cluster_id + "] " + c.company_name +
    " | Hạng " + c.scoring.tier + " (" + c.scoring.total_score + "đ)" +
    " | SP: " + c.analysis.primary_product_code +
    " | Trạng thái: " + c.workflow_stage_label
  );
  print("   -> Phân công: " + repStr);
  if (flags.length > 0) {
    print("   -> Lưu ý    : " + flags.join(" ; "));
  }
  if (c.workflow_stage === "DRAFT_FOR_ENRICHMENT") {
    print("   -> Câu hỏi Draft: " + c.draft.questions.join(" | "));
  }
}

print("");
print("--- ĐỀ XUẤT KINH DOANH CHIẾN LƯỢC ---");
for (var r = 0; r < result.insights.recommendations.length; r++) {
  var rec = result.insights.recommendations[r];
  print("• [" + rec.priority + "] " + rec.category + ": " + rec.insight);
  print("  => Hành động: " + rec.action);
}
print("================================================================================");

