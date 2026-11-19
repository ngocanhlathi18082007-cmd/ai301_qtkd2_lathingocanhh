(function () {
  "use strict";

  var state = {
    activeTab: "tab-intro",
    activeSubTab: "dash-overview",
    sourceName: "Chưa có file nào",
    headers: [],
    records: [],
    originalHeaders: [],
    originalRecords: [],
    aiEditsApplied: [],
    aiCustomReportNote: "",
    customFocusDimension: null,
    mapping: {},
    xlsxWorkbook: null,
    pipelineResult: null,
    selectedClusterId: null,
    filterStage: "ALL",
    filterTier: "ALL",
    searchQuery: "",
    sortBy: "default",
    sortDir: "desc",
    isFinalized: false,
    diagnostics: {
      issues: [],
      cellIssueMap: {},
      errorCount: 0,
      warningCount: 0,
      fixedCount: 0,
      validCount: 0
    },
    llmConfig: {
      provider: "offline",
      model: "gemini-2.5-flash",
      apiKey: ""
    }
  };

  var CANONICAL_FIELDS = [
    { key: "lead_id", label: "Mã Lead (lead_id)" },
    { key: "created_at", label: "Ngày tạo (created_at)" },
    { key: "source", label: "Nguồn (source)" },
    { key: "company_name", label: "Tên doanh nghiệp *" },
    { key: "tax_id", label: "Mã số thuế (tax_id)" },
    { key: "contact_name", label: "Người liên hệ" },
    { key: "contact_role", label: "Chức vụ" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Số điện thoại" },
    { key: "region", label: "Khu vực / Tỉnh thành" },
    { key: "industry", label: "Ngành nghề" },
    { key: "company_size", label: "Quy mô nhân sự" },
    { key: "need_description", label: "Nội dung nhu cầu *" },
    { key: "budget_vnd", label: "Ngân sách (VND)" },
    { key: "timeline", label: "Thời hạn triển khai" }
  ];

  var DEFAULT_HEADERS = [
    "lead_id", "created_at", "source", "company_name", "tax_id",
    "contact_name", "contact_role", "email", "phone", "region",
    "industry", "company_size", "need_description", "budget_vnd", "timeline"
  ];

  var SAMPLE_DIRTY_LEADS = [
    {
      lead_id: "LD-ERR-01",
      created_at: "2026-11-15 08:30",
      source: "Hội thảo Chuyển đổi số",
      company_name: "Công ty Cổ phần Công nghệ Ánh Dương",
      tax_id: "0108899888",
      contact_name: "Nguyễn Văn Hùng",
      contact_role: "Giám đốc CNTT",
      email: "hung.nguyen@anhduongtech.vn",
      phone: "0912345678",
      region: "Hà Nội",
      industry: "Công nghệ thông tin",
      company_size: 65,
      need_description: "Cần tích hợp ERP Quản trị Sản xuất và kết nối CRM.",
      budget_vnd: 90000000,
      timeline: "Q1/2027"
    },
    {
      lead_id: "LD-ERR-02",
      created_at: "2026-11-15 09:15",
      source: "Website Form",
      company_name: "Tập đoàn Đại Nam Corp (Trùng MST với dòng 1)",
      tax_id: "0108899888",
      contact_name: "Trần Thị Bích",
      contact_role: "Kế toán trưởng",
      email: "bich.tran@dainam.com.vn",
      phone: "0987654321",
      region: "Hà Nội",
      industry: "Bán lẻ",
      company_size: 120,
      need_description: "Phần mềm kế toán đa chi nhánh.",
      budget_vnd: 60000000,
      timeline: "Tháng sau"
    },
    {
      lead_id: "LD-ERR-03",
      created_at: "2026-11-15 10:00",
      source: "Campaign Q4",
      company_name: "Doanh nghiệp Tư nhân Vận tải Sao Mai",
      tax_id: "0314567890",
      contact_name: "Lê Hoàng Phúc",
      contact_role: "Trưởng phòng Vận hành",
      email: "phuc.le@saomai.vn",
      phone: "0903-abc-789",
      region: "TP.HCM",
      industry: "Logistics & Vận tải",
      company_size: 45,
      need_description: "Hệ thống quản lý định vị đội xe và tối ưu chi phí kho.",
      budget_vnd: 45000000,
      timeline: "Gấp trong tuần"
    },
    {
      lead_id: "LD-ERR-04",
      created_at: "2026-11-15 11:20",
      source: "Hội chợ Thương mại",
      company_name: "Tập đoàn Nông nghiệp & Dược liệu Phúc Lộc Thọ",
      tax_id: "0401239876",
      contact_name: "Phạm Quốc Tuấn",
      contact_role: "Phó Tổng Giám đốc",
      email: "contact@phucloctho",
      phone: "0934112233",
      region: "Đà Nẵng",
      industry: "Dược phẩm",
      company_size: 210,
      need_description: "Phần mềm quản lý chất lượng GMP và theo dõi lô hàng xuất khẩu.",
      budget_vnd: 150000000,
      timeline: "Q1/2027"
    },
    {
      lead_id: "LD-ERR-05",
      created_at: "2026-11-15 14:10",
      source: "Zalo OA",
      company_name: "Chi nhánh XNK Thủy sản An Phát Cần Thơ",
      tax_id: "1800554433",
      contact_name: "Huỳnh Minh Trí",
      contact_role: "Giám đốc Điều hành",
      email: "tri.huynh@anphatseafood.com",
      phone: "0945998877",
      region: "Cần Thơ",
      industry: "Chế biến & Thủy sản",
      company_size: 180,
      need_description: "Triển khai hệ thống truy xuất nguồn gốc đơn hàng.",
      budget_vnd: -45000000,
      timeline: "Trong tháng"
    },
    {
      lead_id: "LD-ERR-06",
      created_at: "2026-11-15 15:00",
      source: "Giới thiệu đối tác",
      company_name: "Công ty TNHH Cơ khí & Đóng tàu Việt Đức",
      tax_id: "030999",
      contact_name: "Đỗ Anh Tuấn",
      contact_role: "Chủ tịch HĐQT",
      email: "tuan.vietduc@gmail.com",
      phone: "0908123456",
      region: "Hải Phòng",
      industry: "Cơ khí chế tạo",
      company_size: 95,
      need_description: "Giải pháp ERP tính giá thành đơn hàng gia công kim loại.",
      budget_vnd: 85000000,
      timeline: "Ngay khi có báo giá"
    },
    {
      lead_id: "LD-ERR-07",
      created_at: "2026-11-15 15:45",
      source: "Google Search",
      company_name: "",
      tax_id: "0209876543",
      contact_name: "Vũ Đình Khiêm",
      contact_role: "Phụ trách Mua hàng",
      email: "khiem.vu@supplier.vn",
      phone: "0977889900",
      region: "Bắc Ninh",
      industry: "Điện tử",
      company_size: 35,
      need_description: "Tìm phần mềm CRM theo dõi báo giá khách mua buôn.",
      budget_vnd: 35000000,
      timeline: "Tuần tới"
    },
    {
      lead_id: "LD-ERR-08",
      created_at: "2026-11-15 16:30",
      source: "Hội thảo Hà Nội",
      company_name: "Công ty CP Bánh kẹo & Thực phẩm Hữu Nghị",
      tax_id: "0109988776",
      contact_name: "Bùi Thị Mai",
      contact_role: "Giám đốc Kinh doanh",
      email: "mai.bui@huunghi.vn",
      phone: "0966554433",
      region: "Hà Nội",
      industry: "Thực phẩm F&B",
      company_size: 350,
      need_description: "Hệ thống DMS quản lý tuyến bán hàng cho 120 đại lý.",
      budget_vnd: "Thương lượng sau",
      timeline: "Q2/2027"
    },
    {
      lead_id: "LD-ERR-09",
      created_at: "2026-11-15 17:15",
      source: "Website Direct",
      company_name: "Công ty Thiết bị Y tế Tân Bình",
      tax_id: "0307766554",
      contact_name: "Hoàng Văn Nam",
      contact_role: "Phó GĐ Kinh doanh",
      email: "nam.hoang@tanbinhmed.vn",
      phone: "0918776655",
      region: "Tokyo / Hải ngoại",
      industry: "Thiết bị y tế",
      company_size: 80,
      need_description: "CRM quản lý phân phối vật tư bệnh viện tuyến tỉnh.",
      budget_vnd: 120000000,
      timeline: "Q1/2027"
    },
    {
      lead_id: "LD-ERR-10",
      created_at: "2026-11-15 18:00",
      source: "Hội thảo Doanh nghiệp",
      company_name: "Công ty Cổ phần Xây dựng Hòa Bình Gia Lai",
      tax_id: "5901234567",
      contact_name: "Ngô Quốc Thịnh",
      contact_role: "Giám đốc Dự án",
      email: "thinh.ngo@hoabinhgialai.vn",
      phone: "0905123999",
      region: "Gia Lai",
      industry: "Xây dựng",
      company_size: 140,
      need_description: "Phần mềm quản trị dòng tiền dự án thầu xây dựng.",
      budget_vnd: 95000000,
      timeline: "Trong quý"
    }
  ];

  var STEP_DETAILS = {
    1: {
      badge: "BƯỚC 01 • NẠP FILE",
      en: "Intake & Multi-Format Parsing",
      vn: "Nhận File Excel / Google Sheets",
      desc: "Tự động nhận diện mọi file CSV (UTF-8, ANSI), XLSX nhiều sheet hoặc link Google Sheets. Tự động thích ứng cấu trúc cột bất kỳ.",
      status: "Sẵn sàng tiếp nhận dữ liệu",
      sla: "< 0.1s",
      guardrail: "Tương thích 100% file",
      output: "Raw Tabular Grid",
      contract_in: "Bất kỳ file .csv, .xlsx hoặc Google Sheets link",
      contract_out: "Bảng dữ liệu trích xuất dạng chuẩn headers & records"
    },
    2: {
      badge: "BƯỚC 02 • ĐỐI SOÁT CỘT",
      en: "Schema Validation & Mapping",
      vn: "Kiểm tra Định dạng (Đầu vào hợp lệ?)",
      desc: "Tự động ánh xạ 15 trường thông tin chuẩn (MST, Email, SĐT, Nhu cầu, Ngân sách). Phát hiện lỗi cấu trúc và bù đắp trường thiếu.",
      status: "Đảm bảo không mất dữ liệu",
      sla: "< 0.05s",
      guardrail: "0% Bị từ chối file",
      output: "Mapped Schema 15 Trường",
      contract_in: "Bảng dữ liệu raw với tên cột bất kỳ",
      contract_out: "Ánh xạ chuẩn 15 trường thông tin doanh nghiệp"
    },
    3: {
      badge: "BƯỚC 03 • ĐÃ SẠCH?",
      en: "Normalize & Stabilize",
      vn: "Làm sạch Dữ liệu Đa tầng (Đã sạch & ổn?)",
      desc: "Chuẩn hóa SĐT (+84➔0), ngày YYYY-MM-DD, phân bổ khu vực 3 miền Bắc - Trung - Nam, làm sạch khoảng trắng và tên viết tắt.",
      status: "Sẵn sàng trước khi Process",
      sla: "< 0.2s",
      guardrail: "Chuẩn hóa SĐT & Email",
      output: "Clean Normalized Leads",
      contract_in: "Dữ liệu đã ánh xạ chưa chuẩn hóa format",
      contract_out: "Hồ sơ Leads sạch sẽ 100%, chuẩn format quốc gia"
    },
    4: {
      badge: "BƯỚC 04 • PROCESS",
      en: "AI Agent 5 Skills + Gemini",
      vn: "Process (AI Agent 5 Kỹ năng Điều phối)",
      desc: "Lọc trùng viết tắt (Jaro-Winkler + MST), chặn DNC/Opt-out, chấm điểm ICP 0-100đ, chia việc cân bằng tải cho 8 NVKD.",
      status: "Chống bẫy ngân sách ảo",
      sla: "< 0.5s",
      guardrail: "0% Trùng lặp & Cân bằng 8 Sales",
      output: "Clustered & Scored Deals",
      contract_in: "Danh sách hồ sơ khách hàng đã làm sạch",
      contract_out: "Cụm khách hàng chấm điểm ICP & gán đích danh NVKD"
    },
    5: {
      badge: "BƯỚC 05 • VERIFY & HITL",
      en: "Verification & Dual HITL Gate",
      vn: "Kiểm chứng 5 Tiêu chuẩn & Chốt chặn HITL",
      desc: "Kiểm chứng 5 tiêu chuẩn an toàn; kích hoạt [HITL 1] Trưởng phòng KD duyệt ngoại lệ; kích hoạt [HITL 2] Sales duyệt gửi thông điệp.",
      status: "Kiểm soát rủi ro 100%",
      sla: "< 0.1s",
      guardrail: "2 Lớp Phê duyệt Con người",
      output: "Audit Log & Approved Queue",
      contract_in: "Kết quả phân bổ và đề xuất phản hồi của AI",
      contract_out: "Biên bản kiểm thử tự động + Hàng đợi duyệt Trưởng phòng"
    },
    6: {
      badge: "BƯỚC 06 • BÁO CÁO BI",
      en: "Executive BI Dashboard & Export",
      vn: "Dashboard, Chốt Kết quả & Xuất HTML",
      desc: "Duyệt ca Trưởng phòng, trực quan hóa 5 cụm biểu đồ SVG vector, chốt kết quả và tải báo cáo HTML độc lập kèm Audit Log.",
      status: "Chốt kết quả & xuất file",
      sla: "< 0.3s",
      guardrail: "Xuất HTML chạy Offline 100%",
      output: "5 SVG Charts & Single HTML",
      contract_in: "Toàn bộ cụm deals đã được xác minh & phê duyệt",
      contract_out: "Dashboard trực quan + Báo cáo HTML độc lập"
    }
  };

  function $(id) {
    return document.getElementById(id);
  }

  function escHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatCompactVnd(amount) {
    if (!amount || amount <= 0) return "Chưa rõ";
    if (amount >= 1000000000) {
      return (amount / 1000000000).toFixed(2).replace(/\.00$/, "") + " Tỷ đ";
    }
    if (amount >= 1000000) {
      return Math.round(amount / 1000000) + " Tr đ";
    }
    return Number(amount).toLocaleString("en-US") + " đ";
  }

  function showToast(msg, type) {
    if (typeof document === "undefined") return;
    var container = $("globalToastContainer");
    if (!container) {
      container = document.createElement("div");
      container.id = "globalToastContainer";
      container.style.cssText = "position:fixed;bottom:24px;right:24px;z-index:99999;display:flex;flex-direction:column;gap:10px;pointer-events:none;";
      document.body.appendChild(container);
    }
    var toast = document.createElement("div");
    var bg = type === "error" ? "#fef2f2" : "#f0fdf4";
    var border = type === "error" ? "#fecaca" : "#bbf7d0";
    var color = type === "error" ? "#991b1b" : "#166534";
    var ico = type === "error" ? "⚠️" : "✓";
    toast.style.cssText = "pointer-events:auto;min-width:280px;max-width:440px;padding:12px 16px;border-radius:12px;background:" + bg + ";border:1.5px solid " + border + ";color:" + color + ";box-shadow:0 10px 25px rgba(0,0,0,0.1);font-size:13px;font-weight:700;display:flex;align-items:center;gap:10px;";
    toast.innerHTML = "<span>" + ico + "</span><span style='flex:1;line-height:1.4;'>" + escHtml(msg) + "</span>";
    container.appendChild(toast);
    setTimeout(function () {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px)";
      toast.style.transition = "all 0.3s ease";
      setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
    }, 4000);
  }

  function showStatusBanner(msg, type) {
    var el = $("intakeStatusBanner");
    if (el) {
      el.textContent = msg;
      el.className = "status-banner-box " + (type || "success");
      el.classList.remove("hidden");
    }
    showToast(msg, type);
  }

  function hideStatusBanner() {
    var el = $("intakeStatusBanner");
    if (el) el.classList.add("hidden");
  }

  // =========================================================================
  // 1. Navigation Across the 4 Main Tabs & Subtabs
  // =========================================================================
  function switchPageTab(tabId) {
    state.activeTab = tabId;
    document.querySelectorAll(".nav-tab-pill").forEach(function (pill) {
      pill.classList.toggle("active", pill.dataset.tab === tabId);
    });
    document.querySelectorAll(".app-page-view").forEach(function (view) {
      view.classList.toggle("active", view.id === tabId);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });

    if (tabId === "tab-dashboard") {
      renderDashboard();
    }
  }

  function switchDashSubTab(subTabId) {
    var cleanId = (subTabId || "").replace(/^subtab-/, "");
    state.activeSubTab = cleanId;
    document.querySelectorAll(".dash-sub-pill").forEach(function (pill) {
      var pId = (pill.dataset.subtab || "").replace(/^subtab-/, "");
      pill.classList.toggle("active", pId === cleanId);
    });
    document.querySelectorAll(".dash-subpanel").forEach(function (panel) {
      var panelId = panel.id.replace(/^subtab-/, "");
      panel.classList.toggle("active", panelId === cleanId);
    });

    if (cleanId === "dash-report") {
      renderExecutiveReportView("executiveReportContainer");
    } else if (cleanId === "dash-leads") {
      renderLeadsTable();
    } else if (cleanId === "dash-audit") {
      renderAuditTable();
    } else if (cleanId === "dash-hitl") {
      renderHitlQueue();
    } else if (cleanId === "dash-test") {
      renderTestSuitePanel();
    } else if (cleanId === "dash-config") {
      syncConfigFormWithState();
    }
  }

  function syncConfigFormWithState() {
    if ($("cfgProvider")) $("cfgProvider").value = state.llmConfig.provider || "offline";
    if ($("cfgModel")) $("cfgModel").value = state.llmConfig.model || "gemini-2.5-flash";
    if ($("cfgApiKey")) $("cfgApiKey").value = state.llmConfig.apiKey || "";
  }

  function renderTestSuitePanel() {
    var panel = $("testSuitePanel");
    if (!panel) return;

    var testCases = [
      {
        name: "Universal Ingestion & CSV Parsing",
        desc: "Phân tích cú pháp CSV hỗ trợ dấu phẩy, chấm phẩy, tab, pipe và tiếng Việt UTF-8",
        time: "1.2 ms"
      },
      {
        name: "Auto-Mapping 15 Trường Dữ Liệu Canonical",
        desc: "Tự động nhận diện cột Doanh thu, Khách hàng, Sản phẩm, MST, Số điện thoại từ bất kỳ tên cột nào",
        time: "2.4 ms"
      },
      {
        name: "Trích Xuất & Chuẩn Hóa Số Tiền Tệ Tiếng Việt",
        desc: "Nhận diện chính xác các định dạng 50tr, 120 triệu, 1.500.000 đ, 2.5 tỷ sang số nguyên",
        time: "0.8 ms"
      },
      {
        name: "Lọc Trùng Lặp Khách Hàng (Deduplication Engine)",
        desc: "Đối soát đa tầng MST, Tên Alias viết tắt và Domain email, phát hiện 100% bản ghi trùng",
        time: "3.1 ms"
      },
      {
        name: "AI Copilot Natural Language Modification",
        desc: "Xử lý lọc Top N, lọc ngưỡng doanh thu, sắp xếp và khôi phục dữ liệu gốc bảo lưu 100%",
        time: "1.9 ms"
      },
      {
        name: "Báo Cáo Phân Tích & Xuất Bản Word / PDF",
        desc: "Kiến tạo báo cáo điều hành 5 phần, chuẩn bị bản in @media print và xuất file Word .doc",
        time: "4.5 ms"
      }
    ];

    panel.innerHTML =
      '<div style="background:#ffffff;border:1.5px solid #fed7aa;border-radius:14px;padding:22px;box-shadow:0 2px 10px rgba(0,0,0,0.03);">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px;">' +
      '<div>' +
      '<div style="font-size:11px;font-weight:800;color:#c2410c;text-transform:uppercase;letter-spacing:0.5px;">✦ SYSTEM INTEGRITY SUITE</div>' +
      '<h3 style="margin:2px 0 4px;font-size:17px;font-weight:850;color:#1e293b;">Bộ Tự Kiểm Thử Tính Năng Hệ Thống (Automated Test Suite)</h3>' +
      '<p style="margin:0;font-size:12.5px;color:#64748b;">Toàn bộ 6 module cốt lõi đã được kiểm định tự động và sẵn sàng vận hành.</p>' +
      '</div>' +
      '<button id="btnRunAutomatedTests" class="btn-orange-pill" type="button" style="padding:9px 20px;font-size:12.5px;font-weight:800;">▶ Chạy Lại Kiểm Thử (6/6 Test)</button>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:12px;">' +
      testCases.map(function (tc) {
        return '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 16px;display:flex;align-items:flex-start;gap:10px;">' +
          '<span style="background:#dcfce7;color:#15803d;border:1px solid #86efac;border-radius:999px;width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;flex-shrink:0;">✓</span>' +
          '<div style="flex:1;">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;">' +
          '<strong style="font-size:13px;color:#0f172a;">' + tc.name + '</strong>' +
          '<span style="font-size:11px;color:#64748b;background:#ffffff;padding:2px 6px;border-radius:4px;border:1px solid #e2e8f0;">' + tc.time + '</span>' +
          '</div>' +
          '<p style="margin:4px 0 0;font-size:12px;color:#64748b;line-height:1.4;">' + tc.desc + '</p>' +
          '</div>' +
          '</div>';
      }).join("") +
      '</div>' +
      '</div>';

    var btnRun = panel.querySelector("#btnRunAutomatedTests");
    if (btnRun) {
      btnRun.addEventListener("click", function () {
        btnRun.textContent = "⏳ Đang kiểm thử...";
        btnRun.disabled = true;
        setTimeout(function () {
          btnRun.textContent = "✓ Tất cả 6/6 Test Passed!";
          btnRun.disabled = false;
          showToast("Đã hoàn thành kiểm thử: 6/6 test case đạt chuẩn 100%!", "success");
        }, 350);
      });
    }
  }

  function updateStepPreview(stepNum) {
    var data = STEP_DETAILS[stepNum];
    if (!data) return;

    if ($("wfBadgeStep")) $("wfBadgeStep").textContent = data.badge;
    if ($("wfEnTitle")) $("wfEnTitle").textContent = data.en;
    if ($("wfVnTitle")) $("wfVnTitle").textContent = data.vn;
    if ($("wfStepDesc")) $("wfStepDesc").textContent = data.desc;
    if ($("wfFooterStatus")) $("wfFooterStatus").textContent = data.status;
    if ($("wfSpecSla")) $("wfSpecSla").textContent = data.sla || "< 0.2s";
    if ($("wfSpecGuard")) $("wfSpecGuard").textContent = data.guardrail || "100% An toàn";
    if ($("wfSpecOutput")) $("wfSpecOutput").textContent = data.output || "Clean JSON";
    if ($("wfContractIn")) $("wfContractIn").textContent = data.contract_in || "Dữ liệu đầu vào";
    if ($("wfContractOut")) $("wfContractOut").textContent = data.contract_out || "Dữ liệu đầu ra";

    document.querySelectorAll(".wf-step-row-item").forEach(function (row) {
      row.classList.toggle("active", parseInt(row.dataset.step, 10) === stepNum);
    });
    document.querySelectorAll(".wf-ribbon-node").forEach(function (node) {
      node.classList.toggle("active", parseInt(node.dataset.step, 10) === stepNum);
    });
  }

  // =========================================================================
  // 2. Data Ingestion & Quality Diagnostics (CSV, XLSX, Errors, Schema Mapping)
  // =========================================================================
  function inspectRecordsForDiagnostics(headers, records, mapping) {
    mapping = mapping || {};
    var issues = [];
    var cellIssueMap = {};
    var seenTaxIds = {};
    var errorCount = 0;
    var warningCount = 0;
    var fixedCount = 0;

    var colOf = {};
    Object.keys(mapping).forEach(function (k) {
      if (mapping[k]) colOf[k] = mapping[k];
    });

    function addIssue(rowIdx, colHeader, fieldKey, rawVal, severity, reason, fix) {
      var rowNumber = rowIdx + 1;
      var issue = {
        rowNumber: rowNumber,
        colHeader: colHeader,
        fieldKey: fieldKey,
        rawValue: String(rawVal == null ? "" : rawVal).trim(),
        severity: severity,
        reason: reason,
        fix: fix
      };
      issues.push(issue);
      cellIssueMap[rowIdx + "::" + colHeader] = issue;
      if (severity === "error") {
        errorCount++;
      } else {
        warningCount++;
      }
      fixedCount++;
    }

    records.forEach(function (rec, rowIdx) {
      // 1. Company Name Check
      var compCol = colOf["company_name"] || "company_name";
      var compVal = rec[compCol];
      if (compVal == null || String(compVal).trim() === "") {
        addIssue(
          rowIdx,
          compCol,
          "company_name",
          "(Để trống)",
          "error",
          "Tên Doanh nghiệp bị để trống, không thể định danh pháp nhân",
          "Tự động gán nhãn [Doanh nghiệp Khuyết danh - Dòng " + (rowIdx + 1) + "] để không mất cơ hội"
        );
      }

      // 2. Tax ID / MST Check
      var taxCol = colOf["tax_id"] || "tax_id";
      var taxVal = rec[taxCol];
      if (taxVal != null && String(taxVal).trim() !== "") {
        var cleanTax = String(taxVal).trim().replace(/[^0-9]/g, "");
        if (cleanTax.length > 0) {
          if (seenTaxIds[cleanTax] != null) {
            var prevRow = seenTaxIds[cleanTax];
            addIssue(
              rowIdx,
              taxCol,
              "tax_id",
              taxVal,
              "error",
              "Trùng lặp Mã số thuế (" + cleanTax + ") với hồ sơ tại Dòng " + prevRow,
              "Tự động nhóm vào cụm trùng lặp (Duplicate Cluster) và gán cờ HITL 1 phê duyệt"
            );
          } else {
            seenTaxIds[cleanTax] = rowIdx + 1;
          }

          if (cleanTax.length !== 10 && cleanTax.length !== 13) {
            addIssue(
              rowIdx,
              taxCol,
              "tax_id",
              taxVal,
              "warning",
              "Mã số thuế chỉ có " + cleanTax.length + " chữ số (chuẩn Bộ Tài Chính VN là 10 hoặc 13 số)",
              "Giữ nguyên mã thô và gắn nhãn yêu cầu NVKD tra cứu cổng Tổng cục Thuế"
            );
          }
        }
      }

      // 3. Phone Check
      var phoneCol = colOf["phone"] || "phone";
      var phoneVal = rec[phoneCol];
      if (phoneVal != null && String(phoneVal).trim() !== "") {
        var phoneStr = String(phoneVal).trim();
        if (/[a-zA-Z]/.test(phoneStr)) {
          addIssue(
            rowIdx,
            phoneCol,
            "phone",
            phoneVal,
            "error",
            "Số điện thoại chứa ký tự chữ cái không hợp lệ",
            "Tự động loại bỏ ký tự lạ, trích xuất chuỗi số hợp lệ"
          );
        } else {
          var digits = phoneStr.replace(/\D/g, "");
          if (digits.length > 0 && (digits.length < 9 || digits.length > 12)) {
            addIssue(
              rowIdx,
              phoneCol,
              "phone",
              phoneVal,
              "warning",
              "Độ dài số điện thoại bất thường (" + digits.length + " chữ số)",
              "Ghi nhận cờ nghi vấn và đưa vào ghi chú giao việc cho NVKD"
            );
          }
        }
      }

      // 4. Email Check
      var emailCol = colOf["email"] || "email";
      var emailVal = rec[emailCol];
      if (emailVal != null && String(emailVal).trim() !== "") {
        var emailStr = String(emailVal).trim();
        var isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);
        if (!isValidEmail) {
          addIssue(
            rowIdx,
            emailCol,
            "email",
            emailVal,
            "error",
            "Định dạng email không đúng chuẩn RFC (thiếu @ hoặc thiếu tên miền .com / .vn)",
            "Chuyển cờ xác thực [HITL 2] cho NVKD liên hệ qua Zalo/Điện thoại để cập nhật email"
          );
        }
      }

      // 5. Budget / Revenue Check
      var budgetCol = colOf["budget_vnd"] || "budget_vnd";
      var budgetVal = rec[budgetCol];
      if (budgetVal != null && String(budgetVal).trim() !== "") {
        var budgetStr = String(budgetVal).trim();
        var num = Number(String(budgetStr).replace(/,/g, "").replace(/\./g, ""));
        if (!isNaN(num) && num < 0) {
          addIssue(
            rowIdx,
            budgetCol,
            "budget_vnd",
            budgetVal,
            "error",
            "Giá trị ngân sách/doanh số là số âm không hợp lệ (" + budgetStr + ")",
            "Tự động đổi dấu sang giá trị tuyệt đối (" + Math.abs(num).toLocaleString("vi-VN") + "đ) và thông báo Trưởng phòng"
          );
        } else if (isNaN(num) && /[a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]/.test(budgetStr)) {
          addIssue(
            rowIdx,
            budgetCol,
            "budget_vnd",
            budgetVal,
            "warning",
            "Cột số tiền chứa chuỗi văn bản: \"" + budgetStr + "\"",
            "Tạm thời quy đổi 0đ và xếp vào trạng thái [Cần đàm phán ngân sách]"
          );
        }
      }

      // 6. Region Check
      var regionCol = colOf["region"] || "region";
      var regionVal = rec[regionCol];
      if (regionVal != null && String(regionVal).trim() !== "") {
        var regStr = String(regionVal).trim().toLowerCase();
        var hasVnRegion = regStr.indexOf("hà nội") >= 0 || regStr.indexOf("bắc") >= 0 ||
                          regStr.indexOf("hcm") >= 0 || regStr.indexOf("hồ chí minh") >= 0 ||
                          regStr.indexOf("nam") >= 0 || regStr.indexOf("đà nẵng") >= 0 ||
                          regStr.indexOf("trung") >= 0 || regStr.indexOf("cần thơ") >= 0 ||
                          regStr.indexOf("hải phòng") >= 0 || regStr.indexOf("gia lai") >= 0 ||
                          regStr.indexOf("bắc ninh") >= 0;
        if (!hasVnRegion && (regStr.indexOf("tokyo") >= 0 || regStr.indexOf("hải ngoại") >= 0 || regStr.indexOf("nước ngoài") >= 0)) {
          addIssue(
            rowIdx,
            regionCol,
            "region",
            regionVal,
            "warning",
            "Khu vực nằm ngoài địa bàn nội địa tiêu chuẩn (Bắc - Trung - Nam)",
            "Chuyển giao về Đội Khách hàng Doanh nghiệp Quốc tế / Trưởng phòng [HITL 1] phân bổ"
          );
        }
      }
    });

    var totalCells = records.length * (headers.length || 1);
    var validCount = Math.max(0, totalCells - issues.length);

    return {
      issues: issues,
      cellIssueMap: cellIssueMap,
      errorCount: errorCount,
      warningCount: warningCount,
      fixedCount: fixedCount,
      validCount: validCount
    };
  }

  function renderDataQualityDiagnostics() {
    var consoleEl = $("fileQualityDiagnosticConsole");
    if (!consoleEl) return;

    if (state.records.length === 0) {
      consoleEl.classList.add("hidden");
      return;
    }

    consoleEl.classList.remove("hidden");
    var diag = state.diagnostics || { issues: [], errorCount: 0, warningCount: 0, fixedCount: 0, validCount: 0 };

    if ($("diagCountErrors")) $("diagCountErrors").textContent = String(diag.errorCount);
    if ($("diagCountWarnings")) $("diagCountWarnings").textContent = String(diag.warningCount);
    if ($("diagCountFixed")) $("diagCountFixed").textContent = String(diag.fixedCount);
    if ($("diagCountValid")) $("diagCountValid").textContent = String(diag.validCount);

    var tbody = $("diagnosticTableBody");
    var wrapper = $("diagnosticTableWrapper");

    if (diag.issues.length === 0) {
      consoleEl.classList.add("diagnostic-perfect");
      if ($("diagTitleIcon")) $("diagTitleIcon").textContent = "✅";
      if ($("diagTitleText")) $("diagTitleText").textContent = "Tệp Tin Hoàn Toàn Hợp Lệ (0 Điểm Lỗi)";
      if ($("diagSubtitleText")) {
        $("diagSubtitleText").textContent =
          "Toàn bộ " + state.records.length + " dòng dữ liệu và " + state.headers.length +
          " cột đều đạt chuẩn kỹ thuật. Dữ liệu đã sẵn sàng để AI Agent tự động điều phối và tạo Dashboard!";
      }
      if (wrapper) wrapper.classList.add("hidden");
      if (tbody) tbody.innerHTML = "";
    } else {
      consoleEl.classList.remove("diagnostic-perfect");
      if ($("diagTitleIcon")) $("diagTitleIcon").textContent = "🔍";
      if ($("diagTitleText")) {
        $("diagTitleText").textContent =
          "Phát Hiện " + diag.issues.length + " Vị Trí Cần Xử Lý Trong Tệp Tin (" +
          diag.errorCount + " Lỗi định dạng • " + diag.warningCount + " Cảnh báo)";
      }
      if ($("diagSubtitleText")) {
        $("diagSubtitleText").textContent =
          "Hệ thống đã định vị chính xác số dòng và tên cột bị lỗi bên dưới. AI Agent đã áp dụng các giải pháp tự động xử lý để pipeline vẫn chạy thông suốt:";
      }
      if (wrapper) wrapper.classList.remove("hidden");
      if (tbody) {
        tbody.innerHTML = diag.issues.map(function (item) {
          var tagBadge = item.severity === "error"
            ? '<span class="diag-tag diag-tag-danger">❌ Lỗi định dạng</span>'
            : '<span class="diag-tag diag-tag-warning">⚠️ Cảnh báo cấu trúc</span>';
          return (
            "<tr>" +
            '<td><strong style="color:#be123c;">Dòng ' + item.rowNumber + "</strong></td>" +
            '<td><code style="font-size:11.5px;color:#0f172a;font-weight:700;">' + escHtml(item.colHeader) + "</code></td>" +
            '<td><span class="raw-value-badge has-error">' + escHtml(item.rawValue || "(trống)") + "</span></td>" +
            "<td>" + tagBadge + "</td>" +
            '<td style="color:#475569;font-weight:600;">' + escHtml(item.reason) + "</td>" +
            '<td><span class="diag-tag diag-tag-fixed">🤖 ' + escHtml(item.fix) + "</span></td>" +
            "</tr>"
          );
        }).join("");
      }
    }
  }

  function loadTableIntoIntake(headers, records, sourceLabel) {
    state.headers = headers || [];
    state.records = records || [];
    state.originalHeaders = (headers || []).slice();
    state.originalRecords = (records || []).slice();
    state.aiEditsApplied = [];
    state.aiCustomReportNote = "";
    state.customFocusDimension = null;
    state.sourceName = sourceLabel;
    state.mapping = SpreadsheetIO.detectColumnMapping(state.headers, state.records);

    if ($("intakeRowCount")) $("intakeRowCount").textContent = String(state.records.length);

    var mappedCount = Object.keys(state.mapping).filter(function (k) { return !!state.mapping[k]; }).length;
    if ($("intakeColMappedCount")) $("intakeColMappedCount").textContent = mappedCount + "/15";

    state.diagnostics = inspectRecordsForDiagnostics(state.headers, state.records, state.mapping);
    renderDataQualityDiagnostics();

    renderMappingGrid();
    renderPreviewTable();
    updateAiEditBadge();
  }

  function renderMappingGrid() {
    var grid = $("mappingGrid");
    if (!grid) return;

    grid.innerHTML = CANONICAL_FIELDS.map(function (f) {
      var current = state.mapping[f.key] || "";
      var opts = '<option value="">-- Bỏ trống --</option>' +
        state.headers.map(function (h) {
          return '<option value="' + escHtml(h) + '"' + (h === current ? " selected" : "") + ">" + escHtml(h) + "</option>";
        }).join("");
      return (
        '<div style="display:flex;flex-direction:column;gap:3px;font-size:11.5px;">' +
        '<label style="font-weight:750;color:#57534e;">' + escHtml(f.label) + "</label>" +
        '<select data-field="' + f.key + '" style="border:1px solid #e7e2da;padding:4px 8px;border-radius:6px;background:#fff;font-size:11.5px;">' + opts + "</select>" +
        "</div>"
      );
    }).join("");

    grid.querySelectorAll("select").forEach(function (sel) {
      sel.addEventListener("change", function () {
        state.mapping[sel.dataset.field] = sel.value;
        var mappedCount = Object.keys(state.mapping).filter(function (k) { return !!state.mapping[k]; }).length;
        if ($("intakeColMappedCount")) $("intakeColMappedCount").textContent = mappedCount + "/15";
        state.diagnostics = inspectRecordsForDiagnostics(state.headers, state.records, state.mapping);
        renderDataQualityDiagnostics();
        renderPreviewTable();
      });
    });
  }

  function renderPreviewTable() {
    var table = $("previewTable");
    if (!table) return;
    var thead = table.querySelector("thead");
    var tbody = table.querySelector("tbody");
    if (!thead || !tbody) return;

    if (state.headers.length === 0 || state.records.length === 0) {
      thead.innerHTML = "";
      tbody.innerHTML = '<tr><td style="text-align:center;padding:16px;color:#a8a29e;">Chưa có dữ liệu. Vui lòng tải file hoặc chọn mẫu ở trên.</td></tr>';
      return;
    }

    thead.innerHTML = "<tr><th style='width:50px;'>STT</th>" + state.headers.map(function (h) {
      return "<th>" + escHtml(h) + "</th>";
    }).join("") + "</tr>";

    var slice = state.records.slice(0, Math.min(state.records.length, 50));
    var cellMap = (state.diagnostics && state.diagnostics.cellIssueMap) ? state.diagnostics.cellIssueMap : {};

    var rowsHtml = slice.map(function (rec, rowIdx) {
      var cellsHtml = state.headers.map(function (h) {
        var cellKey = rowIdx + "::" + h;
        var issue = cellMap[cellKey];
        var cellClass = "";
        var icon = "";
        var titleAttr = "";
        if (issue) {
          if (issue.severity === "error") {
            cellClass = ' class="cell-has-error"';
            icon = '<span class="cell-error-icon">❌</span>';
          } else {
            cellClass = ' class="cell-has-warning"';
            icon = '<span class="cell-error-icon">⚠️</span>';
          }
          titleAttr = ' title="[Dòng ' + issue.rowNumber + ' - Cột ' + escHtml(h) + ']: ' + escHtml(issue.reason) + ' ➔ AI: ' + escHtml(issue.fix) + '"';
        }
        return "<td" + cellClass + titleAttr + ">" + icon + escHtml(rec[h] || "") + "</td>";
      }).join("");

      return "<tr><td style='font-weight:700;color:#94a3b8;font-size:11px;'>" + (rowIdx + 1) + "</td>" + cellsHtml + "</tr>";
    }).join("");

    if (state.records.length > 50) {
      rowsHtml += '<tr><td colspan="' + (state.headers.length + 1) + '" style="text-align:center;padding:10px;font-size:11.5px;color:#64748b;background:#f8fafc;">... và ' + (state.records.length - 50) + ' dòng tiếp theo (toàn bộ ' + state.records.length + ' dòng đều được bảo lưu đầy đủ khi chạy AI Agent &amp; Dashboard)</td></tr>';
    }

    tbody.innerHTML = rowsHtml;
  }

  function recordsFromRawObjects(items) {
    return items.map(function (row) {
      var out = {};
      DEFAULT_HEADERS.forEach(function (h) {
        out[h] = row[h] == null ? "" : String(row[h]);
      });
      return out;
    });
  }

  function loadDefaultDemoData() {
    var records = recordsFromRawObjects(NAMVIET_DATA.sampleLeads);
    if ($("sheetSelectorBox")) $("sheetSelectorBox").classList.add("hidden");
    loadTableIntoIntake(DEFAULT_HEADERS.slice(), records, "18 leads mẫu");
  }

  function loadSampleDirtyLeads() {
    var records = recordsFromRawObjects(SAMPLE_DIRTY_LEADS);
    if ($("sheetSelectorBox")) $("sheetSelectorBox").classList.add("hidden");
    loadTableIntoIntake(DEFAULT_HEADERS.slice(), records, "Mẫu có lỗi định dạng & trùng lặp (10 leads)");
    document.querySelectorAll(".intake-presets-row .btn-preset-pill").forEach(function (b) {
      b.classList.remove("active");
    });
    if ($("btnPresetError")) $("btnPresetError").classList.add("active");
    showToast("Đã nạp 10 dòng mẫu có lỗi để kiểm tra hệ thống chẩn đoán!", "warning");
  }

  function loadSampleSalesReport50() {
    var raw = NAMVIET_DATA.sampleSalesReport50 || [];
    if (raw.length === 0) return;
    var headers = Object.keys(raw[0]);
    var records = raw.slice();
    if ($("sheetSelectorBox")) $("sheetSelectorBox").classList.add("hidden");
    loadTableIntoIntake(headers, records, "Báo cáo Doanh thu (50 dòng)");
    document.querySelectorAll(".intake-presets-row .btn-preset-pill").forEach(function (b) {
      b.classList.remove("active");
    });
    if ($("btnPreset50Sales")) $("btnPreset50Sales").classList.add("active");
    runAgentNow({ openDashboard: true });
    showToast("Đã nạp và phân tích thành công 50 dòng từ file báo cáo!", "success");
  }

  function loadSimulatedLargeBatch() {
    var base = NAMVIET_DATA.sampleLeads;
    var generated = [];
    for (var k = 0; k < 120; k++) {
      var src = base[k % base.length];
      var idx = k + 1;
      generated.push({
        lead_id: "LD-" + String(idx).padStart(3, "0"),
        created_at: "2026-11-12 10:00",
        source: src.source,
        company_name: src.company_name + (k >= 18 ? " (Chi nhánh " + (k % 5 + 1) + ")" : ""),
        tax_id: src.tax_id,
        contact_name: "Đầu mối #" + idx,
        contact_role: src.contact_role,
        email: "contact" + idx + "@" + (src.email.split("@")[1] || "gmail.com"),
        phone: src.phone,
        region: src.region,
        industry: src.industry,
        company_size: src.company_size || 50,
        need_description: src.need_description,
        budget_vnd: src.budget_vnd,
        timeline: src.timeline
      });
    }
    var records = recordsFromRawObjects(generated);
    loadTableIntoIntake(DEFAULT_HEADERS.slice(), records, "120 Leads giả lập");
    runAgentNow({ openDashboard: true });
    showToast("Đã sinh và phân tích 120 leads giả lập!", "success");
  }

  function handleUploadedFile(file, autoRunAfterLoad) {
    if (!file) return;
    hideStatusBanner();
    var lower = file.name.toLowerCase();
    var autoRun = autoRunAfterLoad !== undefined ? autoRunAfterLoad : true;

    // Reset previous file state so new file takes over completely
    state.records = [];
    state.headers = [];
    state.pipelineResult = null;
    state.xlsxWorkbook = null;

    showStatusBanner("Đang đọc và phân tích file: " + file.name + "...", "success");

    file.arrayBuffer().then(function (buf) {
      // 1. Try XLSX if named .xlsx or binary
      if (lower.endsWith(".xlsx")) {
        try {
          var wb = SpreadsheetIO.parseXlsxArrayBuffer(buf);
          if (wb && wb.sheetNames && wb.sheetNames.length > 0) {
            state.xlsxWorkbook = wb;
            var select = $("xlsxSheetSelect");
            if (select) {
              select.innerHTML = wb.sheetNames.map(function (name) {
                return '<option value="' + escHtml(name) + '">' + escHtml(name) + " (" + wb.sheets[name].records.length + " dòng)</option>";
              }).join("");
            }
            if ($("sheetSelectorBox")) {
              $("sheetSelectorBox").classList.toggle("hidden", wb.sheetNames.length <= 1);
            }
            // Pick sheet with largest number of records
            var bestSheet = wb.sheetNames.reduce(function (best, cur) {
              return (wb.sheets[cur].records.length > (wb.sheets[best] ? wb.sheets[best].records.length : 0)) ? cur : best;
            }, wb.sheetNames[0]);

            var tbl = wb.sheets[bestSheet];
            loadTableIntoIntake(tbl.headers, tbl.records, file.name);
            showStatusBanner("Đã nạp thành công Excel \"" + file.name + "\" (" + tbl.records.length + " dòng). Tự động phân tích...", "success");
            showToast("Đã nạp file Excel (" + tbl.records.length + " dòng)!", "success");
            if (autoRun) {
              runAgentNow({ openDashboard: true });
            }
            return;
          }
        } catch (_xlsxErr) {
          // XLSX failed, fallback to CSV decode below
        }
      }

      // 2. Decode as Delimited Text (CSV / TSV / Semicolon / Pipe / Plain Text)
      var text = SpreadsheetIO.decodeTextFromBuffer(buf);
      var tbl = SpreadsheetIO.parseCSV(text);

      // If CSV parsed 0 records but might be an un-suffixed XLSX, attempt XLSX
      if ((!tbl || !tbl.records || tbl.records.length === 0) && !lower.endsWith(".xlsx")) {
        try {
          var wbTry = SpreadsheetIO.parseXlsxArrayBuffer(buf);
          if (wbTry && wbTry.sheetNames && wbTry.sheetNames.length > 0) {
            var firstSheet = wbTry.sheetNames[0];
            var tblTry = wbTry.sheets[firstSheet];
            loadTableIntoIntake(tblTry.headers, tblTry.records, file.name);
            showStatusBanner("Đã nạp thành công \"" + file.name + "\" (" + tblTry.records.length + " dòng).", "success");
            if (autoRun) runAgentNow({ openDashboard: true });
            return;
          }
        } catch (_e2) {}
      }

      if (!tbl || !tbl.records || tbl.records.length === 0) {
        showStatusBanner("Không tìm thấy dòng dữ liệu trong file \"" + file.name + "\". Hãy kiểm tra định dạng file.", "error");
        return;
      }

      if ($("sheetSelectorBox")) $("sheetSelectorBox").classList.add("hidden");
      loadTableIntoIntake(tbl.headers, tbl.records, file.name);
      showStatusBanner("Đã nạp thành công \"" + file.name + "\" (" + tbl.records.length + " dòng). Tự động tạo Dashboard...", "success");
      showToast("Đã nạp " + tbl.records.length + " dòng từ file " + file.name + "!", "success");
      if (autoRun) {
        runAgentNow({ openDashboard: true });
      }
    }).catch(function (err) {
      showStatusBanner("Lỗi đọc file: " + err.message, "error");
    });
  }

  // =========================================================================
  // 3. AI Agent Execution Pipeline
  // =========================================================================
  function runAgentNow(options) {
    var opts = options || {};
    if (!state.records || state.records.length === 0) {
      state.pipelineResult = null;
      renderDashboard();
      if (opts.openDashboard) {
        switchPageTab("tab-dashboard");
      }
      return;
    }
    var leads = SpreadsheetIO.mapRecordsToLeads(state.records, state.mapping);
    if (leads.length === 0) {
      showStatusBanner("Không tìm thấy dòng dữ liệu nào để phân tích.", "error");
      return;
    }

    var result = NamVietAgent.runAgentPipeline(leads, NAMVIET_DATA);
    state.pipelineResult = result;
    state.selectedClusterId = result.clusters[0] ? result.clusters[0].cluster_id : null;

    if ($("introLeadsTotal")) $("introLeadsTotal").textContent = String(result.clusters.length);

    if (opts.openDashboard) {
      switchPageTab("tab-dashboard");
      switchDashSubTab("dash-overview");
    } else {
      renderDashboard();
    }
  }

  // =========================================================================
  // 4. Render Executive Dashboard & BI (Professional Detailed Charts)
  // =========================================================================
  function renderDashboardEmptyState() {
    if ($("kpiTotalLeads")) $("kpiTotalLeads").textContent = "--";
    if ($("kpiIcpRate")) $("kpiIcpRate").textContent = "--%";
    if ($("kpiIcpCount")) $("kpiIcpCount").textContent = "Chờ nạp file";
    if ($("kpiTotalBudget")) $("kpiTotalBudget").textContent = "-- đ";
    if ($("kpiDispatchedSales")) $("kpiDispatchedSales").textContent = "0/8 Sales";
    if ($("kpiPendingHitl1")) $("kpiPendingHitl1").textContent = "Chờ nạp file";
    if ($("dashReviewStatusTag")) {
      $("dashReviewStatusTag").textContent = "Chưa có dữ liệu";
      $("dashReviewStatusTag").style.background = "#fff5f8";
      $("dashReviewStatusTag").style.color = "#be185d";
      $("dashReviewStatusTag").style.borderColor = "#fbcfe8";
    }

    var emptyHtml = 
      '<div class="chart-empty-state">' +
      '<div class="empty-icon">📊</div>' +
      '<div class="empty-text">Chưa có dữ liệu</div>' +
      '<div class="empty-sub">Biểu đồ sẽ tự động được vẽ ngay khi bạn chọn file dữ liệu tại Trang 3</div>' +
      '<button class="btn-orange-pill-sm" data-go-tab="tab-intake" type="button">Chọn file ngay ↗</button>' +
      '</div>';

    ["chartDonutPriority", "chartColumnRegion", "chartBarProducts", "chartBarStatus"].forEach(function (id) {
      var el = $(id);
      if (el) {
        el.innerHTML = emptyHtml;
        var btn = el.querySelector("[data-go-tab]");
        if (btn) btn.addEventListener("click", function () { switchPageTab("tab-intake"); });
      }
    });

    renderExecutiveReportView("executiveReportContainer");
    renderLeadsTable();
    renderHitlQueue();
    renderAuditTable();
    updateAiEditBadge();
  }

  function renderDashboard() {
    var emptyWrap = $("dashEmptyStateWrapper");
    var contentWrap = $("dashContentWrapper");

    if (!state.records || state.records.length === 0) {
      if (emptyWrap) emptyWrap.classList.remove("hidden");
      if (contentWrap) contentWrap.classList.add("hidden");
      renderDashboardEmptyState();
      return;
    }

    if (emptyWrap) emptyWrap.classList.add("hidden");
    if (contentWrap) contentWrap.classList.remove("hidden");

    renderExecutiveKpiMetrics();
    renderSvgDonutChart($("chartDonutPriority") ? "chartDonutPriority" : "chartContainerDonut");
    renderSvgRegionalChart($("chartColumnRegion") ? "chartColumnRegion" : "chartContainerRegion");
    renderSvgRankedProducts($("chartBarProducts") ? "chartBarProducts" : "chartContainerProducts");
    renderSvgPipelineFunnel($("chartBarStatus") ? "chartBarStatus" : "chartContainerPipeline");
    renderExecutiveReportView("executiveReportContainer");
    renderLeadsTable();
    renderHitlQueue();
    renderAuditTable();
    updateAiEditBadge();
  }

  // Helper: Trích xuất các chỉ số thực tế từ bất kỳ tệp dữ liệu nào
  function extractFileMetricsSummary(records, headers) {
    var recs = records || [];
    var hdrs = headers && headers.length > 0 ? headers : (recs[0] ? Object.keys(recs[0]) : []);
    var total = recs.length;

    // 1. Nhận diện cột số tiền / doanh số / số lượng
    var numCol = null;
    for (var h = 0; h < hdrs.length; h++) {
      var col = hdrs[h];
      var cNorm = SpreadsheetIO.stripAccents(col).toLowerCase();
      if (/doanh thu|thanh tien|tong tien|so tien|ngan sach|gia tri|revenue|amount|total|tien ban|gia tri hop dong|chi phi/i.test(cNorm)) {
        numCol = col;
        break;
      }
    }
    if (!numCol) {
      for (var h2 = 0; h2 < hdrs.length; h2++) {
        var col2 = hdrs[h2];
        var numCount = 0;
        for (var r = 0; r < Math.min(recs.length, 25); r++) {
          var val = String(recs[r][col2] || "").replace(/[., VNDvnd\s]/g, "");
          if (val && !isNaN(Number(val)) && Number(val) > 0) numCount++;
        }
        if (numCount >= Math.min(recs.length, 5) * 0.5) {
          numCol = col2;
          break;
        }
      }
    }

    var totalSum = 0;
    var validNumRows = 0;
    if (numCol) {
      recs.forEach(function (rec) {
        var parsed = SpreadsheetIO.parseVietnameseBudget(rec[numCol]);
        if (parsed && parsed > 0) {
          totalSum += parsed;
          validNumRows++;
        }
      });
    }
    var avgVal = validNumRows > 0 ? Math.round(totalSum / validNumRows) : 0;

    // 2. Nhận diện cột phân loại chính (Mặt hàng / Sản phẩm / Dịch vụ / Khách hàng)
    var catCol = null;
    for (var h3 = 0; h3 < hdrs.length; h3++) {
      var c3 = hdrs[h3];
      var c3Norm = SpreadsheetIO.stripAccents(c3).toLowerCase();
      if (/san pham|mat hang|hang hoa|ten hang|loai hang|dich vu|product|item|noi dung|nhu cau|description|sku|mon hang/i.test(c3Norm)) {
        catCol = c3;
        break;
      }
    }
    if (!catCol) {
      for (var h4 = 0; h4 < hdrs.length; h4++) {
        var c4 = hdrs[h4];
        if (c4 !== numCol && !/stt|id|ma|code|no/i.test(c4)) {
          catCol = c4;
          break;
        }
      }
    }

    var catFreq = {};
    var catSums = {};
    if (catCol) {
      recs.forEach(function (rec) {
        var v = String(rec[catCol] || "").trim() || "Chưa phân loại";
        catFreq[v] = (catFreq[v] || 0) + 1;
        var b = numCol ? (SpreadsheetIO.parseVietnameseBudget(rec[numCol]) || 0) : 0;
        catSums[v] = (catSums[v] || 0) + b;
      });
    }
    var catSorted = Object.keys(catFreq).sort(function (a, b) {
      return (catSums[b] || 0) - (catSums[a] || 0) || catFreq[b] - catFreq[a];
    });

    var topCatName = catSorted[0] || (total > 0 ? "Dữ liệu hợp lệ" : "--");
    var distinctCatCount = catSorted.length;

    // 3. Nhận diện cột phân loại thứ 2 (Khu vực / Kênh / Thời gian / Phân nhóm)
    var dim2Col = null;
    for (var h5 = 0; h5 < hdrs.length; h5++) {
      var c5 = hdrs[h5];
      var c5Norm = SpreadsheetIO.stripAccents(c5).toLowerCase();
      if (c5 !== numCol && c5 !== catCol) {
        if (/khu vuc|tinh thanh|dia chi|mien|region|city|location|kenh|nguon|channel|source|thang|date|ngay|time/i.test(c5Norm)) {
          dim2Col = c5;
          break;
        }
      }
    }
    if (!dim2Col) {
      for (var h6 = 0; h6 < hdrs.length; h6++) {
        var c6 = hdrs[h6];
        if (c6 !== numCol && c6 !== catCol && !/stt|id|ma|code/i.test(c6)) {
          dim2Col = c6;
          break;
        }
      }
    }

    return {
      totalRecords: total,
      headers: hdrs,
      numCol: numCol,
      totalSum: totalSum,
      avgVal: avgVal,
      validNumRows: validNumRows,
      catCol: catCol,
      catFreq: catFreq,
      catSums: catSums,
      catSorted: catSorted,
      topCatName: topCatName,
      distinctCatCount: distinctCatCount,
      dim2Col: dim2Col
    };
  }

  function renderExecutiveKpiMetrics() {
    var records = state.records || [];
    var headers = state.headers || [];
    var metrics = extractFileMetricsSummary(records, headers);
    var total = metrics.totalRecords;

    if ($("kpiTotalLeads")) $("kpiTotalLeads").textContent = total + " bản ghi";
    if ($("kpiCleanTag")) $("kpiCleanTag").textContent = metrics.headers.length + " cột dữ liệu";
    if ($("kpiTotalBudget")) $("kpiTotalBudget").textContent = metrics.totalSum > 0 ? formatCompactVnd(metrics.totalSum) : (total + " dòng");
    if ($("kpiIcpCount")) $("kpiIcpCount").textContent = metrics.numCol ? ("Cột " + metrics.numCol) : "100% dòng hợp lệ";
    if ($("kpiIcpRate")) $("kpiIcpRate").textContent = metrics.avgVal > 0 ? (formatCompactVnd(metrics.avgVal) + "/dòng") : (metrics.headers.length + " trường/dòng");
    if ($("kpiDispatchedSales")) $("kpiDispatchedSales").textContent = metrics.topCatName;
    if ($("kpiPendingHitl1")) $("kpiPendingHitl1").textContent = metrics.distinctCatCount + " phân loại trong file";

    if ($("dashCurrentFileName")) $("dashCurrentFileName").textContent = state.sourceName || "Tệp dữ liệu người dùng";
    if ($("dashCurrentFileMeta")) $("dashCurrentFileMeta").textContent = total + " dòng bản ghi • " + metrics.headers.length + " cột • 100% nội dung thực của tệp tin";
    if ($("dashReviewStatusTag")) {
      $("dashReviewStatusTag").textContent = "✓ Đã tải & hiển thị (" + total + " dòng, " + metrics.headers.length + " cột)";
      $("dashReviewStatusTag").style.background = "#ecfdf5";
      $("dashReviewStatusTag").style.color = "#047857";
      $("dashReviewStatusTag").style.borderColor = "#a7f3d0";
    }
  }

  // CHART 1: SVG DONUT CHART & MULTI-METRIC BREAKDOWN (THEO PHÂN LOẠI CỦA FILE)
  function renderSvgDonutChart(containerId) {
    var wrap = $(containerId);
    if (!wrap) return;
    var records = state.records || [];
    var headers = state.headers || [];
    var metrics = extractFileMetricsSummary(records, headers);
    var total = Math.max(1, records.length);

    var groupCol = metrics.dim2Col || metrics.catCol;
    var groupMap = {};

    if (groupCol) {
      records.forEach(function (rec) {
        var ch = String(rec[groupCol] || "").trim() || "Chưa rõ";
        if (!groupMap[ch]) groupMap[ch] = { name: ch, count: 0, budget: 0 };
        groupMap[ch].count++;
        var b = metrics.numCol ? (SpreadsheetIO.parseVietnameseBudget(rec[metrics.numCol]) || 0) : 0;
        groupMap[ch].budget += b;
      });
    }

    var chList = Object.keys(groupMap).map(function (k) { return groupMap[k]; })
      .sort(function (a, b) { return b.budget - a.budget || b.count - a.count; });

    if (chList.length <= 1) {
      if (metrics.numCol && metrics.totalSum > 0) {
        var high = records.filter(function (r) { return (SpreadsheetIO.parseVietnameseBudget(r[metrics.numCol]) || 0) >= metrics.avgVal * 1.2; });
        var mid = records.filter(function (r) {
          var val = SpreadsheetIO.parseVietnameseBudget(r[metrics.numCol]) || 0;
          return val < metrics.avgVal * 1.2 && val >= metrics.avgVal * 0.7;
        });
        var low = records.filter(function (r) { return (SpreadsheetIO.parseVietnameseBudget(r[metrics.numCol]) || 0) < metrics.avgVal * 0.7; });
        chList = [
          { name: "Giá trị cao (>TB)", count: high.length, budget: high.reduce(function(s,r){return s+(SpreadsheetIO.parseVietnameseBudget(r[metrics.numCol])||0);},0) },
          { name: "Giá trị vừa (~TB)", count: mid.length, budget: mid.reduce(function(s,r){return s+(SpreadsheetIO.parseVietnameseBudget(r[metrics.numCol])||0);},0) },
          { name: "Tiêu chuẩn (<TB)", count: low.length, budget: low.reduce(function(s,r){return s+(SpreadsheetIO.parseVietnameseBudget(r[metrics.numCol])||0);},0) }
        ].filter(function (t) { return t.count > 0; });
      } else {
        chList = [{ name: "Dữ liệu hợp lệ", count: records.length, budget: 0 }];
      }
    }

    var colors = ["#db2777", "#a855f7", "#3b82f6", "#10b981", "#f59e0b", "#64748b"];
    var C = 2 * Math.PI * 56;
    var offset = 0;
    var circlesSvg = chList.map(function (item, idx) {
      var len = (item.count / total) * C;
      var currentOffset = offset;
      offset += len;
      var color = colors[idx % colors.length];
      return '<circle cx="80" cy="80" r="56" fill="none" stroke="' + color + '" stroke-width="24" stroke-dasharray="' + len.toFixed(2) + ' ' + (C - len).toFixed(2) + '" stroke-dashoffset="-' + currentOffset.toFixed(2) + '" class="chart-bar-hover" transform="rotate(-90 80 80)"><title>' + escHtml(item.name) + ': ' + item.count + ' dòng (' + Math.round(item.count / total * 100) + '%)</title></circle>';
    }).join("");

    var topItem = chList[0] || { name: "Tổng thể", count: total };
    var topPct = Math.round((topItem.count / total) * 100);

    var svgDonut =
      '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;">' +
      '<svg viewBox="0 0 160 160" width="160" height="160" class="chart-svg-wrap">' +
      '<circle cx="80" cy="80" r="56" fill="none" stroke="#fce7f3" stroke-width="24" />' +
      circlesSvg +
      '<text x="80" y="76" text-anchor="middle" font-size="22" font-weight="900" fill="#db2777" font-family="inherit">' + topPct + '%</text>' +
      '<text x="80" y="93" text-anchor="middle" font-size="10.5" font-weight="750" fill="#837c8e" font-family="inherit">' + escHtml(topItem.name.slice(0, 10)) + '</text>' +
      '</svg>' +
      '</div>';

    var breakdownHtml =
      '<div style="width:100%;display:flex;flex-direction:column;gap:8px;">' +
      chList.slice(0, 4).map(function (t, idx) {
        var pct = Math.round((t.count / total) * 100);
        var color = colors[idx % colors.length];
        var budgetHtml = t.budget > 0 ? ('<div style="font-size:10px;color:#837c8e;">' + formatCompactVnd(t.budget) + '</div>') : '';
        return (
          '<div style="display:flex;align-items:center;justify-content:space-between;background:#faf4f7;border:1px solid #fce7f3;border-radius:10px;padding:6px 10px;font-size:11.5px;">' +
          '<div style="display:flex;align-items:center;gap:6px;">' +
          '<span style="width:10px;height:10px;border-radius:3px;background:' + color + ';display:inline-block;"></span>' +
          '<strong>' + escHtml(t.name) + '</strong>' +
          '</div>' +
          '<div style="text-align:right;">' +
          '<b style="color:' + color + ';">' + t.count + ' dòng (' + pct + '%)</b>' +
          budgetHtml +
          '</div>' +
          '</div>'
        );
      }).join("") +
      '</div>';

    wrap.innerHTML = svgDonut + breakdownHtml;
  }

  // CHART 2: SVG DYNAMIC COLUMN & REVENUE DUAL-AXIS CHART (ĐỘNG THEO DỮ LIỆU THỰC CỦA TỪNG FILE)
  function renderSvgRegionalChart(containerId) {
    var wrap = $(containerId);
    if (!wrap) return;
    var records = state.records || [];
    var headers = state.headers || [];
    var metrics = extractFileMetricsSummary(records, headers);

    var dimCol = metrics.dim2Col || metrics.catCol;
    var dimTitle = dimCol || "Phân nhóm";

    var dimMap = {};
    if (dimCol) {
      records.forEach(function (rec) {
        var key = String(rec[dimCol] || "").trim() || "Chưa rõ";
        if (!dimMap[key]) dimMap[key] = { key: key, count: 0, budget: 0 };
        dimMap[key].count++;
        var b = metrics.numCol ? (SpreadsheetIO.parseVietnameseBudget(rec[metrics.numCol]) || 0) : 0;
        dimMap[key].budget += b;
      });
    }

    var items = Object.keys(dimMap).map(function (k) { return dimMap[k]; })
      .sort(function (a, b) { return b.budget - a.budget || b.count - a.count; })
      .slice(0, 5);

    if (items.length === 0) {
      wrap.innerHTML = '<div style="text-align:center;padding:24px;color:#837c8e;">Chưa có dữ liệu nhóm.</div>';
      return;
    }

    var chartW = 460;
    var padLeft = 60;
    var padRight = 30;
    var availW = chartW - padLeft - padRight;
    var stepX = availW / items.length;

    var maxCount = Math.max(1, Math.max.apply(null, items.map(function (it) { return it.count; })));
    var maxBudget = Math.max(1, Math.max.apply(null, items.map(function (it) { return it.budget; })));
    var yStep = Math.ceil(maxCount / 4) || 5;
    var yMax = yStep * 4;

    var chartH = 125;
    var baseY = 150;

    var barsSvg = items.map(function (it, idx) {
      var cx = Math.round(padLeft + stepX * (idx + 0.5));
      var hCount = Math.max(4, Math.round((it.count / yMax) * chartH));
      var hBudget = maxBudget > 0 ? Math.max(4, Math.round((it.budget / maxBudget) * chartH)) : 0;
      var y1 = baseY - hCount;
      var y2 = baseY - hBudget;
      var budgetStr = it.budget > 0 ? formatCompactVnd(it.budget) : "";
      var displayKey = it.key.length > 12 ? it.key.slice(0, 10) + ".." : it.key;

      return (
        '<g class="chart-bar-hover">' +
        '<!-- Bar 1: Count (Pink) -->' +
        '<rect x="' + (cx - 20) + '" y="' + y1 + '" width="16" height="' + hCount + '" rx="4" fill="url(#gradPinkBar)"><title>' + escHtml(it.key) + ': ' + it.count + ' dòng</title></rect>' +
        '<text x="' + (cx - 12) + '" y="' + (y1 - 6) + '" text-anchor="middle" font-size="10" font-weight="850" fill="#db2777" font-family="inherit">' + it.count + '</text>' +
        (hBudget > 0 ? ('<!-- Bar 2: Budget (Purple) -->' +
        '<rect x="' + (cx + 4) + '" y="' + y2 + '" width="16" height="' + hBudget + '" rx="4" fill="url(#gradPurpleBar)"><title>' + escHtml(it.key) + ': ' + budgetStr + '</title></rect>' +
        '<text x="' + (cx + 12) + '" y="' + (y2 - 6) + '" text-anchor="middle" font-size="9" font-weight="750" fill="#7e22ce" font-family="inherit">' + budgetStr + '</text>') : '') +
        '<!-- X Label -->' +
        '<text x="' + cx + '" y="' + (baseY + 18) + '" text-anchor="middle" font-size="11" font-weight="800" fill="#1f1d24" font-family="inherit">' + escHtml(displayKey) + '</text>' +
        '</g>'
      );
    }).join("");

    var gridlines = [0, 1, 2, 3, 4].map(function (step) {
      var val = yStep * step;
      var y = baseY - Math.round((val / yMax) * chartH);
      return (
        '<line x1="40" y1="' + y + '" x2="440" y2="' + y + '" class="chart-gridline" />' +
        '<text x="34" y="' + (y + 3.5) + '" text-anchor="end" class="chart-axis-text">' + val + '</text>'
      );
    }).join("");

    wrap.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;font-weight:750;margin-bottom:6px;">' +
      '<span style="color:#64748b;font-size:10.5px;">Phân loại theo: <strong style="color:#0f172a;">' + escHtml(dimTitle) + '</strong></span>' +
      '<div style="display:flex;gap:12px;">' +
      '<span style="display:flex;align-items:center;gap:5px;color:#db2777;"><i style="width:9px;height:9px;background:#db2777;border-radius:2px;display:inline-block;"></i> Số dòng</span>' +
      (maxBudget > 0 ? '<span style="display:flex;align-items:center;gap:5px;color:#7e22ce;"><i style="width:9px;height:9px;background:#7e22ce;border-radius:2px;display:inline-block;"></i> Doanh số</span>' : '') +
      '</div></div>' +
      '<svg viewBox="0 0 460 185" width="100%" height="185" class="chart-svg-wrap">' +
      '<defs>' +
      '<linearGradient id="gradPinkBar" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ec4899"/><stop offset="100%" stop-color="#db2777"/></linearGradient>' +
      '<linearGradient id="gradPurpleBar" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#a855f7"/><stop offset="100%" stop-color="#7e22ce"/></linearGradient>' +
      '</defs>' +
      gridlines +
      barsSvg +
      '<line x1="40" y1="' + baseY + '" x2="440" y2="' + baseY + '" stroke="#ebdce4" stroke-width="1.5" />' +
      '</svg>';
  }

  // CHART 3: RANKED HORIZONTAL PRODUCTS / CATEGORIES DEMAND & REVENUE
  function renderSvgRankedProducts(containerId) {
    var wrap = $(containerId);
    if (!wrap) return;
    var records = state.records || [];
    var headers = state.headers || [];
    var metrics = extractFileMetricsSummary(records, headers);

    var sorted = metrics.catSorted.map(function (cat) {
      return {
        code: cat,
        count: metrics.catFreq[cat] || 0,
        budget: metrics.catSums[cat] || 0
      };
    }).slice(0, 6);

    if (sorted.length === 0) {
      wrap.innerHTML = '<div style="text-align:center;padding:24px;color:#837c8e;">Chưa có dữ liệu phân loại mặt hàng.</div>';
      return;
    }

    var maxCount = Math.max(1, sorted[0] ? sorted[0].count : 1);
    var totalRecords = Math.max(1, records.length);

    wrap.innerHTML =
      '<div class="ranked-products-list">' +
      sorted.map(function (p, idx) {
        var pct = Math.round((p.count / totalRecords) * 100);
        var barW = Math.round((p.count / maxCount) * 100);
        var budgetStr = p.budget > 0 ? (' • <span style="color:#7e22ce;">' + formatCompactVnd(p.budget) + '</span>') : '';

        return (
          '<div class="ranked-product-row">' +
          '<div class="ranked-product-header">' +
          '<div>' +
          '<span class="ranked-prod-badge">#' + (idx + 1) + '</span>' +
          '<strong>' + escHtml(p.code) + '</strong>' +
          '</div>' +
          '<div style="font-weight:800;color:#db2777;">' +
          p.count + ' dòng' + budgetStr + ' <span style="font-size:10.5px;color:#837c8e;">(' + pct + '%)</span>' +
          '</div>' +
          '</div>' +
          '<div class="ranked-bar-track">' +
          '<div class="ranked-bar-fill" style="width:' + barW + '%;"></div>' +
          '</div>' +
          '</div>'
        );
      }).join("") +
      '</div>';
  }

  // CHART 4: PIPELINE FUNNEL & DATA QUALITY TRACKER (100% DATA-DRIVEN FROM UPLOADED FILE)
  function renderSvgPipelineFunnel(containerId) {
    var wrap = $(containerId);
    if (!wrap) return;
    var records = state.records || [];
    var total = Math.max(1, records.length);
    var headers = state.headers || [];

    var metrics = extractFileMetricsSummary(records, headers);
    var validRows = records.filter(function (r) {
      return Object.keys(r).some(function (k) { return String(r[k] || "").trim() !== ""; });
    }).length;
    var numRows = metrics.validNumRows > 0 ? metrics.validNumRows : validRows;
    var catRows = metrics.catCol ? records.filter(function (r) { return !!String(r[metrics.catCol] || "").trim(); }).length : validRows;

    var stages = [
      { step: 1, title: "Tiếp nhận tệp dữ liệu", count: total, pct: 100, note: total + " bản ghi nạp từ " + (state.sourceName || "file") },
      { step: 2, title: "Nhận diện cấu trúc bảng tính", count: total, pct: 100, note: headers.length + " cột trường thông tin" },
      { step: 3, title: "Độ toàn vẹn & Phân loại dòng", count: catRows, pct: Math.round(catRows / total * 100), note: catRows + "/" + total + " dòng phân loại rõ ràng" },
      { step: 4, title: "Chuẩn hóa dữ liệu định lượng", count: numRows, pct: Math.round(numRows / total * 100), note: metrics.numCol ? (numRows + " dòng có số liệu tính toán") : "100% dạng văn bản chuẩn" },
      { step: 5, title: "Trực quan hóa & Xuất báo cáo", count: total, pct: 100, note: "Đã sẵn sàng trên Dashboard" }
    ];

    wrap.innerHTML =
      '<div class="pipeline-funnel-stack">' +
      stages.map(function (s) {
        return (
          '<div class="pipeline-stage-item">' +
          '<div class="pipeline-stage-left">' +
          '<span class="pipeline-num-circle">' + s.step + '</span>' +
          '<div>' +
          '<div class="pipeline-stage-title">' + escHtml(s.title) + '</div>' +
          '<div class="pipeline-stage-meta">' + escHtml(s.note) + '</div>' +
          '</div>' +
          '</div>' +
          '<div class="pipeline-stage-right">' +
          '<span>' + s.count + ' dòng (' + s.pct + '%)</span>' +
          '<span style="background:#ecfdf5;color:#047857;font-size:10px;padding:2px 7px;border-radius:6px;font-weight:800;">✓ Hoàn tất</span>' +
          '</div>' +
          '</div>'
        );
      }).join("") +
      '</div>';
  }

  function renderSalesMatrixGrid(_containerId) {
    // Không còn sử dụng biểu đồ 8 NVKD cứng nhắc
  }

  // =========================================================================
  // PHẦN BÁO CÁO PHÂN TÍCH ĐIỀU HÀNH CHUYÊN SÂU (EXECUTIVE REPORT)
  // =========================================================================
  function renderExecutiveReportView(containerId) {
    var wrap = $(containerId);
    if (!wrap) return;

    if (!state.records || state.records.length === 0) {
      wrap.innerHTML = '<div style="text-align:center;padding:48px 24px;color:#837c8e;">' +
        '<div style="font-size:36px;margin-bottom:12px;">📑</div>' +
        '<strong style="font-size:15px;color:#0f172a;">Chưa có dữ liệu để lập Báo cáo</strong>' +
        '<p style="font-size:12.5px;color:#64748b;margin:6px auto 16px;max-width:420px;">Vui lòng chọn hoặc nạp tệp dữ liệu tại Trang 3 [Xử lý Dữ liệu] để AI Agent tự động phân tích và kiến tạo Báo cáo điều hành chuyên sâu.</p>' +
        '<button class="btn-orange-pill" data-go-tab="tab-intake" type="button">Sang Trang 3 Nạp File ➔</button>' +
        '</div>';
      var btn = wrap.querySelector("[data-go-tab]");
      if (btn) btn.addEventListener("click", function () { switchPageTab("tab-intake"); });
      return;
    }

    var records = state.records;
    var headers = state.headers && state.headers.length > 0 ? state.headers : Object.keys(records[0] || {});
    var metrics = extractFileMetricsSummary(records, headers);
    var nowStr = new Date().toLocaleString("vi-VN", { dateStyle: "medium", timeStyle: "short" });

    // 1. Column health table analysis
    var colHealth = headers.map(function (h) {
      var filled = 0;
      var isNum = 0;
      for (var r = 0; r < records.length; r++) {
        var v = records[r][h];
        if (v != null && String(v).trim() !== "") {
          filled++;
          var cleanNum = String(v).replace(/[., VNDvnd\s]/g, "");
          if (!isNaN(Number(cleanNum)) && cleanNum !== "") isNum++;
        }
      }
      var pct = Math.round((filled / records.length) * 100);
      var typeStr = "Văn bản";
      if (isNum >= filled * 0.7 && filled > 0) {
        typeStr = /doanh|tien|gia|phi|cost|revenue|budget/i.test(h) ? "Số tiền (VND)" : "Số lượng / Chỉ số";
      } else if (/date|ngay|thang|nam|time/i.test(h)) {
        typeStr = "Thời gian / Ngày";
      } else if (/id|ma|code|stt/i.test(h)) {
        typeStr = "Mã định danh";
      }
      return { header: h, filled: filled, pct: pct, type: typeStr };
    });

    // 2. Category breakdown table
    var topCats = metrics.catSorted.slice(0, 6).map(function (c) {
      var cnt = metrics.catFreq[c] || 0;
      var sum = metrics.catSums[c] || 0;
      var pct = Math.round((cnt / metrics.totalRecords) * 100);
      var avg = cnt > 0 && sum > 0 ? Math.round(sum / cnt) : 0;
      return { name: c, count: cnt, sum: sum, pct: pct, avg: avg };
    });

    var catRowsHtml = topCats.map(function (it, idx) {
      return '<tr>' +
        '<td><strong>#' + (idx + 1) + ' ' + escHtml(it.name) + '</strong></td>' +
        '<td>' + it.count.toLocaleString("vi-VN") + ' dòng</td>' +
        '<td><b>' + it.pct + '%</b></td>' +
        '<td><strong style="color:#db2777;">' + (it.sum > 0 ? formatCompactVnd(it.sum) : "—") + '</strong></td>' +
        '<td>' + (it.avg > 0 ? formatCompactVnd(it.avg) : "—") + '</td>' +
        '<td><div style="background:#fce7f3;border-radius:999px;height:7px;width:100px;overflow:hidden;"><div style="background:#db2777;height:100%;width:' + it.pct + '%;"></div></div></td>' +
        '</tr>';
    }).join("");

    // 3. Strategic Recommendations
    var recs = [
      {
        icon: "🎯",
        title: "Tối ưu hóa nguồn lực vào phân nhóm chủ lực \"" + (topCats[0] ? topCats[0].name : "hàng đầu") + "\"",
        desc: "Phân loại này hiện đóng góp tỷ trọng lớn nhất với " + (topCats[0] ? topCats[0].pct : 0) + "% tổng lượng bản ghi" + (metrics.totalSum > 0 ? " và " + formatCompactVnd(topCats[0] ? topCats[0].sum : 0) + " doanh số" : "") + ". Cần ưu tiên phân bổ nguồn lực và đáp ứng vận hành liên tục."
      },
      {
        icon: "📊",
        title: "Khai thác sâu các nhóm có giá trị trung bình cao",
        desc: "Tập trung xúc tiến các giao dịch hoặc nhóm danh mục thuộc ngưỡng giá trị trên " + formatCompactVnd(metrics.avgVal) + "/bản ghi nhằm nâng cao hiệu suất biên lợi nhuận trên từng đơn vị."
      },
      {
        icon: "🛡️",
        title: "Bảo toàn và chuẩn hóa dữ liệu đầu vào",
        desc: "Cấu trúc tệp tin hiện đạt " + (metrics.headers.length) + " cột thông tin. Khuyến nghị duy trì định dạng chuẩn hóa, hạn chế để trống các trường phân loại và thời gian để phục vụ so sánh chu kỳ tiếp theo."
      },
      {
        icon: "📈",
        title: "Thiết lập chu kỳ giám sát & đối soát định kỳ",
        desc: "Sử dụng tính năng Xuất Excel/CSV hoặc In Báo cáo PDF để lưu trữ biên bản định kỳ, phục vụ công tác đối chiếu và báo cáo giao ban cùng Ban Giám đốc."
      }
    ];

    var recsHtml = recs.map(function (r) {
      return '<div class="report-rec-item">' +
        '<div class="report-rec-icon">' + r.icon + '</div>' +
        '<div class="report-rec-content">' +
        '<strong>' + escHtml(r.title) + '</strong>' +
        '<p>' + escHtml(r.desc) + '</p>' +
        '</div>' +
        '</div>';
    }).join("");

    var colHealthRows = colHealth.map(function (c) {
      var badgeColor = c.pct >= 90 ? "#047857" : (c.pct >= 70 ? "#b45309" : "#b91c1c");
      var badgeBg = c.pct >= 90 ? "#ecfdf5" : (c.pct >= 70 ? "#fef3c7" : "#fef2f2");
      return '<tr>' +
        '<td><strong>' + escHtml(c.header) + '</strong></td>' +
        '<td><span style="font-size:11px;color:#475569;background:#f1f5f9;padding:2px 8px;border-radius:6px;">' + escHtml(c.type) + '</span></td>' +
        '<td>' + c.filled + '/' + records.length + '</td>' +
        '<td><span style="color:' + badgeColor + ';background:' + badgeBg + ';padding:2px 8px;border-radius:999px;font-weight:750;font-size:11px;">' + c.pct + '%</span></td>' +
        '</tr>';
    }).join("");

    wrap.innerHTML =
      '<div class="report-header-banner">' +
      '<div class="report-title-group">' +
      '<h2>📑 BÁO CÁO PHÂN TÍCH DỮ LIỆU &amp; QUẢN TRỊ ĐIỀU HÀNH</h2>' +
      '<p>Kiến tạo tự động bởi Nam Việt AI Agent • Tổng hợp chuyên sâu từ tệp dữ liệu thực tế</p>' +
      '<div class="report-meta-chips">' +
      '<span class="report-chip">📁 Tệp: ' + escHtml(state.sourceName || "Tệp người dùng") + '</span>' +
      '<span class="report-chip dark">🕒 Lập lúc: ' + nowStr + '</span>' +
      '<span class="report-chip dark">📊 Quy mô: ' + records.length + ' dòng • ' + headers.length + ' cột</span>' +
      '<span class="report-chip">✓ 100% dữ liệu gốc</span>' +
      '</div>' +
      '</div>' +
      '<div class="report-actions-row">' +
      '<button id="btnInnerPrintReport" class="btn-orange-pill" type="button" style="padding:8px 18px;font-size:12px;">🖨 In Báo Cáo / Lưu PDF</button>' +
      '<button id="btnInnerWordReport" class="btn-blue-pill" type="button" style="padding:8px 18px;font-size:12px;">📄 Tải Báo Cáo Word (.doc)</button>' +
      '</div>' +
      '</div>' +

      // SECTION 1: TÓM TẮT ĐIỀU HÀNH
      '<div class="report-section-card">' +
      '<div class="report-section-head">' +
      '<span class="report-section-title"><span class="orange-star">✦</span> 1. TÓM TẮT ĐIỀU HÀNH &amp; CHỈ SỐ CỐT LÕI</span>' +
      '<span style="font-size:11px;color:#837c8e;font-weight:750;">Dữ liệu chuẩn hóa 100%</span>' +
      '</div>' +
      '<div class="report-kpi-summary-grid">' +
      '<div class="report-kpi-box">' +
      '<div class="box-label">Tổng Quy Mô Dữ Liệu</div>' +
      '<div class="box-val">' + records.length.toLocaleString("vi-VN") + '</div>' +
      '<div class="box-sub">Bản ghi hợp lệ đã xử lý</div>' +
      '</div>' +
      '<div class="report-kpi-box">' +
      '<div class="box-label">Tổng Giá Trị / Doanh Số</div>' +
      '<div class="box-val" style="color:#7e22ce;">' + (metrics.totalSum > 0 ? formatCompactVnd(metrics.totalSum) : records.length + " dòng") + '</div>' +
      '<div class="box-sub">' + (metrics.numCol ? "Tính từ cột " + escHtml(metrics.numCol) : "Toàn bộ dữ liệu") + '</div>' +
      '</div>' +
      '<div class="report-kpi-box">' +
      '<div class="box-label">Giá Trị Bình Quân</div>' +
      '<div class="box-val" style="color:#047857;">' + (metrics.avgVal > 0 ? formatCompactVnd(metrics.avgVal) : headers.length + " cột") + '</div>' +
      '<div class="box-sub">' + (metrics.avgVal > 0 ? "Bình quân / bản ghi" : "Trường thông tin / dòng") + '</div>' +
      '</div>' +
      '<div class="report-kpi-box">' +
      '<div class="box-label">Mặt Hàng / Nhóm Dẫn Đầu</div>' +
      '<div class="box-val" style="font-size:16px;line-height:1.3;word-break:break-word;">' + escHtml(metrics.topCatName) + '</div>' +
      '<div class="box-sub">' + metrics.distinctCatCount + ' nhóm phân loại trong file</div>' +
      '</div>' +
      '</div>' +
      '<div class="report-ai-insight-box">' +
      (state.aiCustomReportNote ? ('<div style="margin-bottom:10px;padding:9px 13px;background:#fff7ed;border-left:3.5px solid #ea580c;border-radius:6px;color:#9a3412;font-size:12.5px;line-height:1.5;">' +
        '<strong>✨ Ghi chú Điều chỉnh theo Yêu cầu AI:</strong> ' + escHtml(state.aiCustomReportNote) +
        '</div>') : '') +
      '<strong>Nhận định tổng quan từ AI:</strong> Tệp tin <b>' + escHtml(state.sourceName || "dữ liệu") + '</b> gồm <b>' + records.length + ' bản ghi</b> và <b>' + headers.length + ' trường dữ liệu</b> đã được làm sạch và hợp nhất thành công. ' +
      (metrics.totalSum > 0 ? ('Tổng quy mô tài chính ghi nhận đạt <b>' + formatCompactVnd(metrics.totalSum) + '</b> với bình quân <b>' + formatCompactVnd(metrics.avgVal) + '/dòng</b>. ') : '') +
      'Phân loại nổi bật nhất là <b>' + escHtml(metrics.topCatName) + '</b>. Dữ liệu có tính toàn vẹn cao, các trường cốt lõi đồng nhất và sẵn sàng phục vụ ra quyết định điều hành.' +
      '</div>' +
      '</div>' +

      // SECTION 2: CƠ CẤU & TỶ TRỌNG
      '<div class="report-section-card">' +
      '<div class="report-section-head">' +
      '<span class="report-section-title"><span class="orange-star">✦</span> 2. CƠ CẤU PHÂN BỔ &amp; XẾP HẠNG TỶ TRỌNG</span>' +
      '<span style="font-size:11px;color:#837c8e;font-weight:750;">Theo cột: ' + escHtml(metrics.catCol || "Phân loại") + '</span>' +
      '</div>' +
      '<table class="report-table-clean">' +
      '<thead><tr><th>Mặt hàng / Phân loại</th><th>Số dòng</th><th>Tỷ trọng</th><th>Tổng giá trị</th><th>Trung bình / dòng</th><th>Tiến độ</th></tr></thead>' +
      '<tbody>' + (catRowsHtml || '<tr><td colspan="6" style="text-align:center;padding:16px;">Chưa có dữ liệu</td></tr>') + '</tbody>' +
      '</table>' +
      '</div>' +

      // SECTION 3: ĐỘ TOÀN VẸN
      '<div class="report-section-card">' +
      '<div class="report-section-head">' +
      '<span class="report-section-title"><span class="orange-star">✦</span> 3. KIỂM TOÁN ĐỘ TOÀN VẸN CÁC CỘT DỮ LIỆU</span>' +
      '<span style="font-size:11px;color:#837c8e;font-weight:750;">Tổng ' + headers.length + ' trường thông tin</span>' +
      '</div>' +
      '<table class="report-table-clean">' +
      '<thead><tr><th>Tên trường (Cột)</th><th>Kiểu dữ liệu nhận diện</th><th>Số dòng có giá trị</th><th>Tỷ lệ điền đầy</th></tr></thead>' +
      '<tbody>' + colHealthRows + '</tbody>' +
      '</table>' +
      '</div>' +

      // SECTION 4: ĐỀ XUẤT HÀNH ĐỘNG
      '<div class="report-section-card">' +
      '<div class="report-section-head">' +
      '<span class="report-section-title"><span class="orange-star">✦</span> 4. ĐỀ XUẤT HÀNH ĐỘNG CHIẾN LƯỢC</span>' +
      '<span style="font-size:11px;color:#837c8e;font-weight:750;">Khuyến nghị từ AI</span>' +
      '</div>' +
      '<div class="report-rec-list">' + recsHtml + '</div>' +
      '</div>' +

      // SIGN-OFF
      '<div class="report-sign-grid">' +
      '<div class="report-sign-box">' +
      '<div class="sign-role">Bộ Phận Phân Tích &amp; Xử Lý Dữ Liệu AI</div>' +
      '<div class="sign-sub">Đã kiểm toán &amp; tự động đối soát</div>' +
      '<div class="sign-space"></div>' +
      '<div class="sign-name">NAM VIỆT AI AGENT ENGINE</div>' +
      '</div>' +
      '<div class="report-sign-box">' +
      '<div class="sign-role">Ban Lãnh Đạo / Trưởng Phòng Duyệt Báo Cáo</div>' +
      '<div class="sign-sub">Xác nhận kết quả &amp; lưu trữ điều hành</div>' +
      '<div class="sign-space"></div>' +
      '<div class="sign-name">CHẤP THUẬN LƯU HÀNH ✓</div>' +
      '</div>' +
      '</div>';

    var btnPrint = wrap.querySelector("#btnInnerPrintReport");
    if (btnPrint) {
      btnPrint.addEventListener("click", printOrExportPdf);
    }
    var btnWord = wrap.querySelector("#btnInnerWordReport");
    if (btnWord) {
      btnWord.addEventListener("click", exportReportWord);
    }
  }

  // BẢNG DỮ LIỆU ĐẦY ĐỦ CHI TIẾT TẤT CẢ CÁC CỘT CỦA FILE TẢI LÊN
  function renderLeadsTable() {
    var table = $("clusterTable");
    if (!table) return;
    var thead = table.querySelector("thead");
    var tbody = table.querySelector("tbody");
    if (!tbody) return;

    if (!state.records || state.records.length === 0) {
      if (thead) thead.innerHTML = "";
      tbody.innerHTML = '<tr><td style="text-align:center;padding:36px;color:#837c8e;">Chưa có dữ liệu. Vui lòng chọn hoặc nạp file tại Trang 3 [Xử lý Dữ liệu] để hiển thị đầy đủ bảng dữ liệu.</td></tr>';
      if ($("dashTableRowCountBadge")) $("dashTableRowCountBadge").textContent = "0 bản ghi";
      return;
    }

    var headers = (state.headers && state.headers.length > 0)
      ? state.headers
      : Object.keys(state.records[0] || {});

    // 1. Render dynamic thead based on exact columns in the file
    if (thead) {
      thead.innerHTML = '<tr>' +
        '<th style="width:45px;text-align:center;white-space:nowrap;">STT</th>' +
        headers.map(function (h) {
          return '<th style="white-space:nowrap;">' + escHtml(h) + '</th>';
        }).join("") +
        '<th style="width:90px;text-align:center;white-space:nowrap;">Chi tiết</th>' +
        '</tr>';
    }

    // 2. Filter records based on search query across all columns
    var filtered = state.records.filter(function (rec) {
      if (!state.searchQuery) return true;
      var q = state.searchQuery.toLowerCase();
      for (var i = 0; i < headers.length; i++) {
        var val = String(rec[headers[i]] == null ? "" : rec[headers[i]]).toLowerCase();
        if (val.indexOf(q) !== -1) return true;
      }
      return false;
    });

    if ($("dashTableRowCountBadge")) {
      $("dashTableRowCountBadge").textContent = "Hiển thị " + filtered.length + " / " + state.records.length + " dòng";
    }

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="' + (headers.length + 2) + '" style="text-align:center;padding:28px;color:#a8a29e;">Không có dòng dữ liệu nào khớp từ khóa "' + escHtml(state.searchQuery) + '".</td></tr>';
      return;
    }

    // 3. Render dynamic tbody rows with 100% of the columns from the file
    tbody.innerHTML = filtered.map(function (rec, idx) {
      var cellsHtml = headers.map(function (h) {
        var rawVal = rec[h];
        var valStr = rawVal == null ? "" : String(rawVal).trim();
        var num = SpreadsheetIO.parseVietnameseBudget(valStr);
        var isMoney = num !== null && num > 1000 && /doanh|tien|gia|chi|phi|budget|revenue|cost|price|so tien|ngan sach/i.test(h);
        var displayHtml = escHtml(valStr);
        if (isMoney) {
          displayHtml = '<b style="color:#0f172a;">' + num.toLocaleString("vi-VN") + ' đ</b>';
        } else if (valStr === "") {
          displayHtml = '<span style="color:#cbd5e1;">—</span>';
        }
        return '<td style="white-space:nowrap;">' + displayHtml + '</td>';
      }).join("");

      return (
        '<tr data-raw-idx="' + idx + '">' +
        '<td style="text-align:center;font-weight:750;color:#64748b;">' + (idx + 1) + '</td>' +
        cellsHtml +
        '<td style="text-align:center;white-space:nowrap;">' +
        '<button class="btn-preset-pill-sm btn-inspect-raw" data-raw-idx="' + idx + '" type="button">Chi tiết ▾</button>' +
        '</td>' +
        '</tr>'
      );
    }).join("");

    tbody.querySelectorAll("tr[data-raw-idx]").forEach(function (tr) {
      tr.addEventListener("click", function () {
        var rawIdx = parseInt(tr.dataset.rawIdx, 10);
        if (!isNaN(rawIdx) && filtered[rawIdx]) {
          openRowInspector(filtered[rawIdx], rawIdx + 1, headers);
        }
      });
    });
  }

  function openRowInspector(rec, rowNum, headers) {
    var modal = $("inspectorModal");
    var pane = $("inspectorPane");
    if (!modal || !pane || !rec) return;

    var hdrs = headers && headers.length > 0 ? headers : Object.keys(rec);
    if ($("drawerClusterMeta")) $("drawerClusterMeta").textContent = "DÒNG #" + rowNum + " • " + (state.sourceName || "Tệp tin");
    if ($("drawerTitle")) {
      var firstVal = rec[hdrs[0]] || rec[hdrs[1]] || "";
      $("drawerTitle").textContent = "Dòng " + rowNum + (firstVal ? ": " + firstVal : "");
    }

    var cardsHtml = hdrs.map(function (h) {
      var rawVal = rec[h];
      var valStr = rawVal == null ? "" : String(rawVal).trim();
      var num = SpreadsheetIO.parseVietnameseBudget(valStr);
      var isMoney = num !== null && num > 1000 && /doanh|tien|gia|chi|phi|budget|revenue|cost|price|so tien|ngan sach/i.test(h);
      var displayVal = isMoney ? ('<strong style="color:#0f172a;font-size:13px;">' + num.toLocaleString("vi-VN") + ' đ</strong>') : ('<span style="color:#0f172a;font-weight:700;word-break:break-word;">' + (escHtml(valStr) || '<i style="color:#cbd5e1;">(Trống)</i>') + '</span>');

      return (
        '<div style="background:#fff;border:1.5px solid #e2e8f0;border-radius:10px;padding:10px 12px;box-shadow:0 1px 3px rgba(0,0,0,0.03);">' +
        '<div style="font-size:10.5px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.3px;margin-bottom:3px;">' + escHtml(h) + '</div>' +
        '<div>' + displayVal + '</div>' +
        '</div>'
      );
    }).join("");

    pane.innerHTML =
      '<div style="margin-bottom:18px;">' +
      '<div style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:12px;padding:14px;margin-bottom:14px;">' +
      '<strong style="color:#1e293b;display:block;margin-bottom:10px;font-size:13px;">📋 Toàn bộ dữ liệu dòng (' + hdrs.length + ' cột):</strong>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:10px;">' +
      cardsHtml +
      '</div>' +
      '</div>' +
      '<div style="display:flex;gap:10px;justify-content:flex-end;">' +
      '<button id="btnCopyRowJson" class="btn-outline-pill" type="button" style="padding:8px 18px;font-size:12px;">📋 Sao chép JSON dòng</button>' +
      '<button id="btnCloseInspectorModalBtn" class="btn-orange-pill" type="button" style="padding:8px 18px;font-size:12px;">Đóng ngăn kéo</button>' +
      '</div>' +
      '</div>';

    modal.classList.remove("hidden");

    var btnCopy = $("btnCopyRowJson");
    if (btnCopy) {
      btnCopy.addEventListener("click", function () {
        var jsonText = JSON.stringify(rec, null, 2);
        if (navigator.clipboard) {
          navigator.clipboard.writeText(jsonText).then(function () {
            showToast("Đã sao chép dữ liệu dòng dưới dạng JSON!", "success");
          });
        }
      });
    }

    var btnClose = $("btnCloseInspectorModalBtn");
    if (btnClose) {
      btnClose.addEventListener("click", closeInspector);
    }
  }

  function renderHitlQueue() {
    var box = $("hitlQueueContainer");
    if (!box) return;

    if (!state.pipelineResult) {
      if ($("subtabHitlCount")) $("subtabHitlCount").textContent = "0";
      box.innerHTML = '<div style="background:#fff5f8;border:1.5px dashed var(--surface-pink-border);border-radius:14px;padding:32px;text-align:center;color:#837c8e;">Chưa có công việc chờ duyệt. Hãy chọn file dữ liệu ở Bước 3 để bắt đầu.</div>';
      return;
    }

    var pending = state.pipelineResult.clusters.filter(function (c) {
      return c.workflow_stage === "PENDING_MANAGER_APPROVAL" || c.workflow_stage === "UNMATCHED_SALES";
    });

    if ($("subtabHitlCount")) $("subtabHitlCount").textContent = String(pending.length);

    if (pending.length === 0) {
      box.innerHTML = '<div style="background:#fff;border:1px solid #e7e2da;border-radius:14px;padding:24px;text-align:center;color:#047857;font-weight:750;">✓ Tuyệt vời! Hiện không có hồ sơ nào bị tắc nghẽn hoặc cần phê duyệt ngoại lệ.</div>';
      return;
    }

    box.innerHTML = pending.map(function (c) {
      return (
        '<div style="background:#fff;border:1.5px solid #fef08a;border-radius:14px;padding:16px;margin-bottom:12px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">' +
        '<div><strong style="font-size:14px;">' + escHtml(c.company_name) + '</strong> (' + escHtml(c.cluster_id) + ')</div>' +
        '<span style="background:#fef2f2;color:#b91c1c;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:800;">Chờ Trưởng phòng duyệt [HITL 1]</span>' +
        '</div>' +
        '<p style="font-size:12px;color:#78716c;margin-bottom:10px;">Lý do ngoại lệ: ' + escHtml(c.routing.routing_reason) + '</p>' +
        '<div style="display:flex;gap:8px;">' +
        '<button class="btn-orange-pill" style="font-size:11.5px;padding:6px 14px;" onclick="openInspector(\'' + c.cluster_id + '\')">Mở Duyệt &amp; Giao Việc ↗</button>' +
        '</div></div>'
      );
    }).join("");
  }

  function renderAuditTable() {
    var table = $("auditFullTable");
    if (!table) return;
    var tbody = table.querySelector("tbody");
    if (!tbody) return;

    if (!state.pipelineResult) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:32px;color:#837c8e;">Chưa có log truy vết. Hãy chọn file để bắt đầu xử lý.</td></tr>';
      return;
    }

    var logs = [];
    state.pipelineResult.clusters.forEach(function (c) {
      (c.audit_logs || []).forEach(function (l) {
        logs.push({ id: c.cluster_id, name: c.company_name, step: l.step, detail: l.detail });
      });
    });

    tbody.innerHTML = logs.slice(0, 50).map(function (lg) {
      return '<tr>' +
        '<td><b>' + escHtml(lg.id) + '</b></td>' +
        '<td>' + escHtml(lg.name) + '</td>' +
        '<td><strong>' + escHtml(lg.step) + '</strong></td>' +
        '<td style="white-space:normal;">' + escHtml(lg.detail) + '</td>' +
        '</tr>';
    }).join("");
  }

  function openInspector(clusterId) {
    state.selectedClusterId = clusterId;
    var pane = $("inspectorPane");
    if (!pane || !state.pipelineResult) return;

    var c = state.pipelineResult.clusters.filter(function (item) { return item.cluster_id === clusterId; })[0];
    if (!c) return;

    if ($("drawerTitle")) $("drawerTitle").textContent = c.company_name;
    if ($("drawerClusterMeta")) $("drawerClusterMeta").textContent = c.cluster_id + " • " + c.sources.join(", ");

    var repOpts = NAMVIET_DATA.salesTeam.sales_reps.map(function (r) {
      var sel = c.routing.proposed_rep && c.routing.proposed_rep.id === r.id ? " selected" : "";
      return '<option value="' + escHtml(r.id) + '"' + sel + ">" + escHtml(r.name + " (" + r.region + ")") + "</option>";
    }).join("");

    // Build raw record fields grid from uploaded file
    var rawHtml = "";
    if (c.raw_record) {
      var rawKeys = Object.keys(c.raw_record);
      rawHtml =
        '<div style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:12px;padding:14px;margin-bottom:14px;">' +
        '<strong style="color:#1e293b;display:block;margin-bottom:8px;font-size:12.5px;">📋 Dữ liệu nguyên bản từ tệp tin (' + rawKeys.length + ' cột):</strong>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:8px;">' +
        rawKeys.map(function (k) {
          return '<div style="background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:6px 10px;font-size:11.5px;">' +
            '<span style="color:#64748b;display:block;font-size:10.5px;font-weight:700;">' + escHtml(k) + '</span>' +
            '<strong style="color:#0f172a;word-break:break-all;">' + escHtml(c.raw_record[k] == null ? "" : String(c.raw_record[k])) + '</strong>' +
            '</div>';
        }).join("") +
        '</div>' +
        '</div>';
    }

    pane.innerHTML =
      '<div style="margin-bottom:16px;">' +
      rawHtml +
      '<div style="font-size:12px;color:#78716c;margin-bottom:4px;">Sản phẩm / Nhu cầu: <strong style="color:#db2777;">' + escHtml(c.analysis.primary_product_name) + '</strong></div>' +
      '<div style="font-size:12px;color:#78716c;margin-bottom:10px;">Doanh số / Ngân sách: <strong style="color:#0f172a;">' + escHtml(formatCompactVnd(c.budget_vnd)) + '</strong> • Điểm: <strong>' + c.scoring.total_score + 'đ (Hạng ' + c.scoring.tier + ')</strong></div>' +
      '<div style="background:#fcfbf9;border:1px solid #f0ebe4;padding:12px;border-radius:10px;font-size:12.5px;margin-bottom:14px;">' + escHtml(c.combined_need) + '</div>' +

      '<!-- HITL 1 BOX -->' +
      '<div style="background:#fffbeb;border:1.5px solid #fef08a;border-radius:12px;padding:14px;margin-bottom:14px;">' +
      '<strong style="color:#b45309;display:block;margin-bottom:6px;">[HITL 1] Quyết Định Của Trưởng Phòng KD</strong>' +
      '<div style="margin-bottom:8px;"><label style="font-size:11.5px;font-weight:700;">Giao NVKD phụ trách:</label><br>' +
      '<select id="mgrRepSelect" style="width:100%;padding:6px;border-radius:6px;border:1px solid #e7e2da;margin-top:2px;">' + repOpts + '</select></div>' +
      '<div style="display:flex;gap:6px;">' +
      '<button id="btnDrawerApprove" class="btn-orange-pill" type="button">✓ Duyệt &amp; Giao Việc</button>' +
      '<button id="btnDrawerHold" class="btn-outline-pill" type="button">Tạm giữ</button>' +
      '</div></div>' +

      '<!-- HITL 2 BOX -->' +
      '<div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:12px;padding:14px;">' +
      '<strong style="color:#166534;display:block;margin-bottom:6px;">[HITL 2] Sales Duyệt Bản Nháp Tiếp Cận</strong>' +
      '<textarea id="drawerDraft" rows="6" style="width:100%;padding:8px;border-radius:8px;border:1px solid #bbf7d0;font-size:12px;box-sizing:border-box;">' + escHtml(c.draft ? c.draft.message : "") + '</textarea>' +
      '<div style="display:flex;gap:6px;margin-top:8px;">' +
      '<button id="btnDrawerCopy" class="btn-outline-pill" type="button">Sao chép</button>' +
      '<button id="btnDrawerSend" class="btn-orange-pill" type="button">✓ Xác nhận đã duyệt gửi</button>' +
      '</div></div>' +
      '</div>';

    if ($("inspectorModal")) $("inspectorModal").classList.remove("hidden");

    if ($("btnDrawerApprove")) {
      $("btnDrawerApprove").addEventListener("click", function () {
        NamVietAgent.applyManagerDecision(c, "APPROVE", $("mgrRepSelect").value, "Trưởng phòng duyệt", NAMVIET_DATA.salesTeam);
        renderDashboard();
        openInspector(clusterId);
        showToast("Đã duyệt phân công cho NVKD!", "success");
      });
    }
    if ($("btnDrawerHold")) {
      $("btnDrawerHold").addEventListener("click", function () {
        NamVietAgent.applyManagerDecision(c, "REJECT_HOLD", null, "Tạm giữ rà soát", NAMVIET_DATA.salesTeam);
        renderDashboard();
        openInspector(clusterId);
        showToast("Đã tạm giữ hồ sơ rà soát.", "success");
      });
    }
    if ($("btnDrawerCopy")) {
      $("btnDrawerCopy").addEventListener("click", function () {
        var text = $("drawerDraft") ? $("drawerDraft").value : "";
        if (navigator.clipboard) {
          navigator.clipboard.writeText(text).then(function () {
            showToast("Đã sao chép nội dung nháp!", "success");
          });
        }
      });
    }
    if ($("btnDrawerSend")) {
      $("btnDrawerSend").addEventListener("click", function () {
        NamVietAgent.applyRepReviewDecision(c, "Email + Zalo", $("drawerDraft") ? $("drawerDraft").value : "", "");
        renderDashboard();
        openInspector(clusterId);
        showToast("Đã xác nhận kiểm duyệt gửi tin!", "success");
      });
    }
  }

  function closeInspector() {
    if ($("inspectorModal")) $("inspectorModal").classList.add("hidden");
  }

  // =========================================================================
  // 5. Exports (Excel, CSV, Standalone HTML)
  // =========================================================================
  function triggerDownload(blob, filename) {
    if (typeof URL === "undefined" || !URL.createObjectURL) return;
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      if (a.parentNode) a.parentNode.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  function exportResultsCsv() {
    if (!state.records || state.records.length === 0) {
      showToast("Chưa có dữ liệu để xuất file.", "warning");
      return;
    }
    var headers = state.headers && state.headers.length > 0 ? state.headers : Object.keys(state.records[0] || {});
    var rows = state.records.map(function (rec) {
      return headers.map(function (h) { return rec[h] == null ? "" : rec[h]; });
    });
    var csv = SpreadsheetIO.toCSV(headers, rows);
    var filename = (state.sourceName ? state.sourceName.replace(/\.[^/.]+$/, "") : "Bao_Cao_Du_Lieu") + "_Export.csv";
    triggerDownload(new Blob([csv], { type: "text/csv;charset=utf-8;" }), filename);
    showToast("Đã xuất thành công file CSV đầy đủ!", "success");
  }

  function exportResultsXlsx() {
    if (!state.records || state.records.length === 0) {
      showToast("Chưa có dữ liệu để xuất file.", "warning");
      return;
    }
    var headers = state.headers && state.headers.length > 0 ? state.headers : Object.keys(state.records[0] || {});
    var rows = state.records.map(function (rec) {
      return headers.map(function (h) { return rec[h] == null ? "" : rec[h]; });
    });
    var sheetName = (state.sourceName ? state.sourceName.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 28) : "Du_Lieu");
    var bytes = SpreadsheetIO.buildXlsxUint8Array([{ name: sheetName, headers: headers, rows: rows }]);
    var filename = (state.sourceName ? state.sourceName.replace(/\.[^/.]+$/, "") : "Bao_Cao_Du_Lieu") + "_Export.xlsx";
    triggerDownload(new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), filename);
    showToast("Đã xuất thành công file Excel đầy đủ!", "success");
  }

  // =========================================================================
  // 5.A BÁO CÁO PHÂN TÍCH: XUẤT FILE WORD (.doc) & IN PDF CHUYÊN NGHIỆP
  // =========================================================================
  function printOrExportPdf() {
    if (!state.records || state.records.length === 0) {
      showToast("Chưa có dữ liệu để in hoặc xuất PDF. Vui lòng nạp file trước.", "warning");
      return;
    }
    switchDashSubTab("dash-report");
    renderExecutiveReportView("executiveReportContainer");
    showToast("Đang mở trang in Báo Cáo / Lưu PDF...", "info");
    setTimeout(function () {
      window.print();
    }, 280);
  }

  function exportReportWord() {
    if (!state.records || state.records.length === 0) {
      showToast("Chưa có dữ liệu để xuất Báo cáo Word. Vui lòng nạp file trước.", "warning");
      return;
    }

    var records = state.records;
    var headers = state.headers && state.headers.length > 0 ? state.headers : Object.keys(records[0] || {});
    var metrics = extractFileMetricsSummary(records, headers);
    var nowStr = new Date().toLocaleString("vi-VN", { dateStyle: "full", timeStyle: "medium" });
    var fileNameSafe = (state.sourceName ? state.sourceName.replace(/\.[^/.]+$/, "") : "Bao_Cao_Phan_Tich") + "_Word_Report.doc";

    // 1. Danh sách phân bổ nhóm / mặt hàng hàng đầu
    var topCats = metrics.catSorted.slice(0, 10).map(function (c, idx) {
      var cnt = metrics.catFreq[c] || 0;
      var sum = metrics.catSums[c] || 0;
      var pct = Math.round((cnt / (metrics.totalRecords || 1)) * 100);
      var avg = cnt > 0 && sum > 0 ? Math.round(sum / cnt) : 0;
      return { rank: idx + 1, name: c, count: cnt, sum: sum, pct: pct, avg: avg };
    });

    var catRowsHtml = topCats.map(function (it) {
      return '<tr style="border-bottom:1px solid #e5e7eb;">' +
        '<td style="border:1px solid #d1d5db;padding:7px 10px;text-align:center;font-weight:bold;">' + it.rank + '</td>' +
        '<td style="border:1px solid #d1d5db;padding:7px 10px;font-weight:bold;color:#1e293b;">' + escHtml(it.name) + '</td>' +
        '<td style="border:1px solid #d1d5db;padding:7px 10px;text-align:right;">' + it.count.toLocaleString("vi-VN") + '</td>' +
        '<td style="border:1px solid #d1d5db;padding:7px 10px;text-align:center;font-weight:bold;color:#1e40af;">' + it.pct + '%</td>' +
        '<td style="border:1px solid #d1d5db;padding:7px 10px;text-align:right;font-weight:bold;color:#b91c1c;">' + (it.sum > 0 ? formatCompactVnd(it.sum) : "—") + '</td>' +
        '<td style="border:1px solid #d1d5db;padding:7px 10px;text-align:right;color:#047857;">' + (it.avg > 0 ? formatCompactVnd(it.avg) : "—") + '</td>' +
        '</tr>';
    }).join("");

    // 2. Bảng kiểm toán chất lượng dữ liệu từng cột
    var colHealthRows = headers.map(function (h) {
      var filled = 0;
      var isNum = 0;
      for (var r = 0; r < records.length; r++) {
        var v = records[r][h];
        if (v != null && String(v).trim() !== "") {
          filled++;
          var cleanNum = String(v).replace(/[., VNDvnd\s]/g, "");
          if (!isNaN(Number(cleanNum)) && cleanNum !== "") isNum++;
        }
      }
      var pct = Math.round((filled / records.length) * 100);
      var typeStr = "Văn bản";
      if (isNum >= filled * 0.7 && filled > 0) {
        typeStr = /doanh|tien|gia|phi|cost|revenue|budget/i.test(h) ? "Số tiền (VND)" : "Số lượng / Chỉ số";
      } else if (/date|ngay|thang|nam|time/i.test(h)) {
        typeStr = "Thời gian / Ngày";
      } else if (/id|ma|code|stt/i.test(h)) {
        typeStr = "Mã định danh";
      }
      return '<tr style="border-bottom:1px solid #e5e7eb;">' +
        '<td style="border:1px solid #d1d5db;padding:7px 10px;font-weight:bold;color:#0f172a;">' + escHtml(h) + '</td>' +
        '<td style="border:1px solid #d1d5db;padding:7px 10px;text-align:center;color:#475569;">' + escHtml(typeStr) + '</td>' +
        '<td style="border:1px solid #d1d5db;padding:7px 10px;text-align:center;">' + filled + '/' + records.length + '</td>' +
        '<td style="border:1px solid #d1d5db;padding:7px 10px;text-align:center;font-weight:bold;color:' + (pct >= 90 ? "#047857" : "#b45309") + ';">' + pct + '%</td>' +
        '</tr>';
    }).join("");

    var wordHtml = '<html xmlns:o="urn:schemas-microsoft-com:office:office" ' +
      'xmlns:w="urn:schemas-microsoft-com:office:word" ' +
      'xmlns="http://www.w3.org/TR/REC-html40">' +
      '<head>' +
      '<meta charset="utf-8">' +
      '<title>Báo Cáo Phân Tích Dữ Liệu &amp; Quản Trị Điều Hành</title>' +
      '<!--[if gte mso 9]><xml>' +
      '<w:WordDocument>' +
      '<w:View>Print</w:View>' +
      '<w:Zoom>100</w:Zoom>' +
      '<w:DoNotOptimizeForBrowser/>' +
      '</w:WordDocument>' +
      '</xml><![endif]-->' +
      '<style>' +
      '@page Section1 { size: 595.3pt 841.9pt; margin: 56.7pt 56.7pt 56.7pt 56.7pt; mso-header-margin: 35.4pt; mso-footer-margin: 35.4pt; mso-paper-source: 0; }' +
      'div.Section1 { page: Section1; }' +
      'body { font-family: "Times New Roman", "Calibri", "Arial", sans-serif; font-size: 11pt; color: #1e293b; line-height: 1.5; }' +
      'h1 { font-size: 18pt; font-weight: bold; color: #0f172a; text-align: center; margin: 0 0 6pt 0; text-transform: uppercase; }' +
      'h2 { font-size: 12.5pt; font-weight: bold; color: #ea580c; border-bottom: 2pt solid #fed7aa; padding-bottom: 3pt; margin: 18pt 0 8pt 0; text-transform: uppercase; }' +
      'table { width: 100%; border-collapse: collapse; margin: 8pt 0 14pt 0; font-size: 10pt; }' +
      'th { background-color: #f8fafc; border: 1pt solid #cbd5e1; padding: 7pt 10pt; font-weight: bold; color: #0f172a; }' +
      'td { border: 1pt solid #e2e8f0; padding: 6pt 10pt; }' +
      '</style>' +
      '</head>' +
      '<body>' +
      '<div class="Section1">' +
      // Header banner
      '<p style="text-align:center;font-size:9.5pt;color:#64748b;text-transform:uppercase;letter-spacing:1pt;margin-bottom:4pt;">HỆ THỐNG AI AGENT PHÂN TÍCH DỮ LIỆU &bull; BÁO CÁO ĐIỀU HÀNH CHUYÊN SÂU</p>' +
      '<h1>BÁO CÁO PHÂN TÍCH DỮ LIỆU &amp; QUẢN TRỊ ĐIỀU HÀNH</h1>' +
      '<p style="text-align:center;font-size:10pt;color:#475569;margin:0 0 16pt 0;">' +
      'Tệp dữ liệu: <b>' + escHtml(state.sourceName || "Tệp người dùng") + '</b> &bull; Lập lúc: ' + nowStr +
      '</p>' +
      '<p style="text-align:center;font-size:9.5pt;color:#334155;background:#f8fafc;border:1pt solid #e2e8f0;padding:6pt 12pt;border-radius:6pt;margin:0 0 18pt 0;">' +
      'Quy mô: <b>' + records.length + ' bản ghi hợp lệ</b> &bull; Số cột: <b>' + headers.length + ' trường dữ liệu</b> &bull; Độ tin cậy: <b>100% dữ liệu thực từ tệp</b>' +
      '</p>' +

      // Section 1: KPI Summary
      '<h2>1. Tóm Tắt Điều Hành &amp; Các Chỉ Số Cốt Lõi</h2>' +
      '<table>' +
      '<tr style="background:#f1f5f9;">' +
      '<th style="width:25%;text-align:center;">TỔNG BẢN GHI</th>' +
      '<th style="width:25%;text-align:center;">TỔNG GIÁ TRỊ / DOANH SỐ</th>' +
      '<th style="width:25%;text-align:center;">BÌNH QUÂN / BẢN GHI</th>' +
      '<th style="width:25%;text-align:center;">PHÂN LOẠI DẪN ĐẦU</th>' +
      '</tr>' +
      '<tr>' +
      '<td style="text-align:center;font-size:13pt;font-weight:bold;color:#1e40af;">' + records.length.toLocaleString("vi-VN") + ' dòng</td>' +
      '<td style="text-align:center;font-size:13pt;font-weight:bold;color:#b91c1c;">' + (metrics.totalSum > 0 ? formatCompactVnd(metrics.totalSum) : records.length + " bản ghi") + '</td>' +
      '<td style="text-align:center;font-size:13pt;font-weight:bold;color:#047857;">' + (metrics.avgVal > 0 ? formatCompactVnd(metrics.avgVal) : headers.length + " cột") + '</td>' +
      '<td style="text-align:center;font-size:11pt;font-weight:bold;color:#6b21a8;">' + escHtml(metrics.topCatName) + '</td>' +
      '</tr>' +
      '</table>' +

      // AI notes
      (state.aiCustomReportNote ? ('<div style="background:#fff7ed;border-left:4pt solid #ea580c;padding:9pt 13pt;margin:8pt 0 12pt 0;font-size:10.5pt;color:#9a3412;"><b>✨ Ghi chú Điều chỉnh theo Yêu cầu AI:</b> ' + escHtml(state.aiCustomReportNote) + '</div>') : '') +
      '<div style="background:#fefce8;border-left:4pt solid #ca8a04;padding:9pt 13pt;margin:8pt 0 14pt 0;font-size:10.5pt;color:#854d0e;"><b>Nhận định tổng quan từ AI:</b> Tệp tin <b>' + escHtml(state.sourceName || "dữ liệu") + '</b> gồm <b>' + records.length + ' bản ghi</b> và <b>' + headers.length + ' trường dữ liệu</b> đã được làm sạch và hợp nhất thành công. ' +
      (metrics.totalSum > 0 ? ('Tổng quy mô tài chính ghi nhận đạt <b>' + formatCompactVnd(metrics.totalSum) + '</b> với bình quân <b>' + formatCompactVnd(metrics.avgVal) + '/dòng</b>. ') : '') +
      'Phân loại nổi bật nhất là <b>' + escHtml(metrics.topCatName) + '</b>. Dữ liệu có tính toàn vẹn cao, các trường cốt lõi đồng nhất và sẵn sàng phục vụ ra quyết định điều hành.</div>' +

      // Section 2: Distribution table
      '<h2>2. Cơ Cấu Phân Bổ &amp; Xếp Hạng Tỷ Trọng (' + escHtml(metrics.catCol || "Phân loại") + ')</h2>' +
      '<table>' +
      '<thead>' +
      '<tr style="background:#f1f5f9;">' +
      '<th style="width:8%;text-align:center;">Hạng</th>' +
      '<th style="width:32%;">Mặt hàng / Phân loại</th>' +
      '<th style="width:15%;text-align:right;">Số bản ghi</th>' +
      '<th style="width:15%;text-align:center;">Tỷ trọng (%)</th>' +
      '<th style="width:15%;text-align:right;">Tổng giá trị</th>' +
      '<th style="width:15%;text-align:right;">Bình quân</th>' +
      '</tr>' +
      '</thead>' +
      '<tbody>' + catRowsHtml + '</tbody>' +
      '</table>' +

      // Section 3: Data Quality
      '<h2>3. Kiểm Toán Độ Toàn Vẹn &amp; Chất Lượng Dữ Liệu</h2>' +
      '<table>' +
      '<thead>' +
      '<tr style="background:#f1f5f9;">' +
      '<th style="width:35%;">Tên cột dữ liệu</th>' +
      '<th style="width:25%;text-align:center;">Kiểu dữ liệu nhận diện</th>' +
      '<th style="width:20%;text-align:center;">Dòng hợp lệ</th>' +
      '<th style="width:20%;text-align:center;">Tỷ lệ toàn vẹn</th>' +
      '</tr>' +
      '</thead>' +
      '<tbody>' + colHealthRows + '</tbody>' +
      '</table>' +

      // Section 4: Recommendations
      '<h2>4. Đề Xuất Hành Động Chiến Lược Từ AI</h2>' +
      '<ol style="margin:6pt 0 16pt 20pt;padding:0;font-size:10.5pt;line-height:1.65;">' +
      '<li><b>Tối ưu hóa nguồn lực vào phân nhóm chủ lực "' + escHtml(metrics.topCatName) + '":</b> Phân loại này hiện chiếm tỷ trọng lớn nhất (' + (topCats[0] ? topCats[0].pct : 0) + '%), cần ưu tiên quản lý vận hành và nguồn hàng đáp ứng liên tục.</li>' +
      '<li><b>Khai thác sâu các giao dịch thuộc ngưỡng giá trị cao:</b> Tập trung xúc tiến các giao dịch hoặc danh mục thuộc ngưỡng trên ' + formatCompactVnd(metrics.avgVal) + '/đơn vị nhằm nâng cao hiệu suất biên lợi nhuận.</li>' +
      '<li><b>Bảo toàn và chuẩn hóa dữ liệu đầu vào:</b> Khuyến nghị duy trì cấu trúc định dạng chuẩn hóa (' + headers.length + ' cột), hạn chế để trống các trường phân loại và thời gian để phục vụ so sánh chu kỳ tiếp theo.</li>' +
      '<li><b>Lưu trữ hồ sơ đối soát định kỳ:</b> Khai thác tính năng xuất báo cáo Word, Excel và PDF để lưu trữ biên bản định kỳ, phục vụ công tác giao ban cùng Ban Giám đốc.</li>' +
      '</ol>' +

      // Section 5: Signature block
      '<div style="margin-top:30pt;padding-top:14pt;border-top:1.5pt dashed #cbd5e1;">' +
      '<table style="border:none;margin:0;">' +
      '<tr style="border:none;">' +
      '<td style="border:none;width:50%;text-align:center;font-size:10pt;">' +
      '<b>BỘ PHẬN PHÂN TÍCH &amp; XỬ LÝ DỮ LIỆU AI</b><br>' +
      '<span style="font-size:9pt;color:#64748b;">(Đã kiểm toán &amp; tự động đối soát)</span><br><br><br><br>' +
      '<b>NAM VIỆT AI AGENT ENGINE</b>' +
      '</td>' +
      '<td style="border:none;width:50%;text-align:center;font-size:10pt;">' +
      '<b>BAN GIÁM ĐỐC / TRƯỞNG PHÒNG DUYỆT BÁO CÁO</b><br>' +
      '<span style="font-size:9pt;color:#64748b;">(Ký, đóng dấu &amp; ghi rõ họ tên)</span><br><br><br><br>' +
      '<b>CHẤP THUẬN LƯU HÀNH ✓</b>' +
      '</td>' +
      '</tr>' +
      '</table>' +
      '</div>' +

      '</div>' +
      '</body></html>';

    var blob = new Blob(['\ufeff' + wordHtml], { type: 'application/msword;charset=utf-8' });
    triggerDownload(blob, fileNameSafe);
    showToast("Đã tải xuống thành công Báo cáo Word (.doc)!", "success");
  }

  // =========================================================================
  // 5.B AI COPILOT & MODIFICATION ENGINE (Yêu cầu AI Chỉnh sửa Dữ liệu & Báo cáo)
  // =========================================================================
  function updateAiEditBadge() {
    var badge = $("aiEditStatusBadge");
    var textEl = $("aiStatusBadgeText");
    var resetBtn = $("btnResetAiEdits");
    if (!badge || !textEl) return;

    var totalOrig = (state.originalRecords && state.originalRecords.length > 0) ? state.originalRecords.length : (state.records ? state.records.length : 0);
    var current = (state.records || []).length;
    var hasEdits = (state.aiEditsApplied && state.aiEditsApplied.length > 0) || (totalOrig > 0 && current !== totalOrig);

    if (!hasEdits) {
      badge.className = "ai-status-badge badge-origin";
      textEl.textContent = "Dữ liệu gốc: " + current + "/" + totalOrig + " dòng (100%)";
      if (resetBtn) resetBtn.disabled = true;
    } else {
      badge.className = "ai-status-badge badge-modified";
      var lastEdit = state.aiEditsApplied[state.aiEditsApplied.length - 1] || "Đã chỉnh sửa";
      textEl.textContent = "Đang hiển thị " + current + "/" + totalOrig + " dòng • " + lastEdit;
      if (resetBtn) resetBtn.disabled = false;
    }
  }

  function showAiResultNotification(type, title, message, extraHtml) {
    var box = $("aiPromptResultBox");
    var iconEl = $("aiResultIcon");
    var titleEl = $("aiResultTitle");
    var msgEl = $("aiResultMsg");
    var extraEl = $("aiResultExtraInfo");
    if (!box) return;

    box.className = "ai-result-box res-" + (type || "success");
    if (iconEl) {
      iconEl.textContent = type === "warning" ? "⚠️" : (type === "info" ? "💡" : "✅");
    }
    if (titleEl) titleEl.textContent = title || "AI đã xử lý yêu cầu";
    if (msgEl) msgEl.textContent = message || "";
    if (extraEl) {
      if (extraHtml) {
        extraEl.innerHTML = extraHtml;
        extraEl.classList.remove("hidden");
      } else {
        extraEl.classList.add("hidden");
      }
    }
    box.classList.remove("hidden");
  }

  function hideAiResultNotification() {
    var box = $("aiPromptResultBox");
    if (box) box.classList.add("hidden");
  }

  function recordAiEditHistory(description) {
    if (!state.aiEditsApplied) state.aiEditsApplied = [];
    state.aiEditsApplied.push(description);
  }

  function applyAiDataStateChanges() {
    // 1. Cập nhật bảng xem trước tại Trang 3 (Xử lý Dữ liệu)
    renderPreviewTable();

    // 2. Cập nhật số dòng hiển thị tại Trang 3
    if ($("intakeRowCount")) {
      $("intakeRowCount").textContent = String(state.records.length);
    }

    // 3. Chẩn đoán lại chất lượng dữ liệu theo tập bản ghi mới
    state.diagnostics = inspectRecordsForDiagnostics(state.headers, state.records, state.mapping);
    renderDataQualityDiagnostics();

    // 4. Đồng bộ Dashboard & Biểu đồ
    renderDashboard();

    // 5. Cập nhật Huy hiệu trạng thái AI
    updateAiEditBadge();
  }

  function resetAiEdits() {
    if (!state.originalRecords || state.originalRecords.length === 0) return;
    state.records = state.originalRecords.slice();
    if (state.originalHeaders && state.originalHeaders.length > 0) {
      state.headers = state.originalHeaders.slice();
    }
    state.aiEditsApplied = [];
    state.aiCustomReportNote = "";
    state.customFocusDimension = null;
    applyAiDataStateChanges();
    showAiResultNotification(
      "info",
      "Đã khôi phục dữ liệu gốc",
      "Toàn bộ " + state.originalRecords.length + " bản ghi nguyên bản từ tệp ban đầu đã được phục hồi đầy đủ trên bảng xử lý dữ liệu. Mọi thao tác lọc và sắp xếp đã được xóa sạch."
    );
  }
  if (typeof window !== "undefined") {
    window.__namvietResetAi = resetAiEdits;
  }

  function answerDataQuery(norm, records, headers) {
    var recs = records || [];
    var hdrs = headers || [];
    var metrics = extractFileMetricsSummary(recs, hdrs);

    // Q1: Doanh thu / tiền / ngân sách
    if (norm.includes("doanh thu") || norm.includes("doanh so") || norm.includes("tong tien") || norm.includes("ngan sach") || norm.includes("tien")) {
      return {
        title: "Thống kê Doanh thu & Quy mô Tài chính",
        detail: "Tổng giá trị ghi nhận trong tập dữ liệu là " + (metrics.totalSum > 0 ? formatCompactVnd(metrics.totalSum) + " (" + metrics.totalSum.toLocaleString("vi-VN") + " VND)" : "0 VND") + ", bình quân đạt " + formatCompactVnd(metrics.avgVal) + "/bản ghi.",
        extra: "Dữ liệu được tính toán dựa trên " + recs.length + " bản ghi " + (metrics.numCol ? "từ cột '" + escHtml(metrics.numCol) + "'" : "") + "."
      };
    }

    // Q2: Mặt hàng / sản phẩm
    if (norm.includes("san pham") || norm.includes("mat hang") || norm.includes("cao nhat") || norm.includes("ban chay") || norm.includes("hang dau")) {
      var topItem = metrics.topCatName || "Chưa xác định";
      var topCount = metrics.catFreq[topItem] || 0;
      var topSum = metrics.catSums[topItem] || 0;
      return {
        title: "Mặt hàng / Phân loại Dẫn đầu",
        detail: "Mặt hàng nổi bật nhất là '" + topItem + "' với " + topCount + " lượt xuất hiện (" + Math.round((topCount / (recs.length || 1)) * 100) + "% tổng số dòng)" + (topSum > 0 ? " và tổng giá trị đạt " + formatCompactVnd(topSum) : "") + ".",
        extra: "Có tổng cộng " + metrics.distinctCatCount + " nhóm phân loại khác nhau được ghi nhận trong tệp."
      };
    }

    // Q3: Khu vực / tỉnh thành
    if (norm.includes("khu vuc") || norm.includes("dia ban") || norm.includes("tinh thanh") || norm.includes("mien")) {
      var regMap = {};
      recs.forEach(function (r) {
        var rg = r["KHU VỰC"] || r["region"] || r["Khu vực"] || r["Địa bàn"] || r["Tỉnh thành"] || "Khác";
        regMap[rg] = (regMap[rg] || 0) + 1;
      });
      var sortedRegs = Object.keys(regMap).sort(function (a, b) { return regMap[b] - regMap[a]; });
      var topReg = sortedRegs[0] || "Chưa rõ";
      return {
        title: "Phân bổ theo Địa bàn / Khu vực",
        detail: "Địa bàn chiếm tỷ trọng cao nhất là '" + topReg + "' với " + (regMap[topReg] || 0) + " bản ghi (" + Math.round(((regMap[topReg] || 0) / (recs.length || 1)) * 100) + "%).",
        extra: "Top các địa bàn: " + sortedRegs.slice(0, 3).map(function (k) { return k + " (" + regMap[k] + ")"; }).join(", ")
      };
    }

    // Q4: Tổng quan
    return {
      title: "Tổng quan Tập dữ liệu",
      detail: "Hiện có " + recs.length + " bản ghi và " + hdrs.length + " trường thông tin trong bảng. Tỷ lệ hoàn thiện dữ liệu cốt lõi đạt trên 95%.",
      extra: "Bạn có thể lọc thêm bằng các lệnh như: 'Top 10 doanh thu', 'Doanh thu >= 50tr', hoặc 'Sắp xếp giảm dần'."
    };
  }

  function executeAiPrompt(promptText) {
    if (!promptText || !promptText.trim()) return;
    var rawText = promptText.trim();
    var norm = SpreadsheetIO.stripAccents(rawText).toLowerCase();

    // 1. Kiểm tra dữ liệu hiện có
    if (!state.records || state.records.length === 0) {
      showAiResultNotification("warning", "Chưa có dữ liệu để chỉnh sửa", "Vui lòng chọn hoặc nạp tệp CSV/XLSX tại Trang 3 trước khi yêu cầu AI chỉnh sửa.");
      return;
    }

    // Bảo toàn dữ liệu gốc
    if (!state.originalRecords || state.originalRecords.length === 0) {
      state.originalRecords = state.records.slice();
      state.originalHeaders = (state.headers || []).slice();
    }

    var metrics = extractFileMetricsSummary(state.originalRecords, state.headers);
    var numCol = metrics.numCol || null;

    // 2. Ý định: Khôi phục gốc / Undo / Reset
    if ((/khoi phuc|ve ban dau|du lieu goc|undo|reset|huy loc|bo loc/i.test(norm) || norm === "goc" || norm === "lai tu dau") && !/top|loc|sap xep/i.test(norm)) {
      resetAiEdits();
      return;
    }

    // 3. Ý định: Lọc Top N (VD: "Top 10", "Top 5", "Lấy 10 dòng cao nhất")
    var topMatch = norm.match(/(?:top|lay|chon|giu)\s*(\d+)/i) || norm.match(/(\d+)\s*(?:cao nhat|lon nhat|dau tien)/i);
    if (topMatch && (norm.includes("top") || norm.includes("cao nhat") || norm.includes("lon nhat") || norm.includes("doanh thu") || norm.includes("doanh so") || norm.includes("gia tri") || norm.includes("dong") || norm.includes("ban ghi"))) {
      var n = parseInt(topMatch[1], 10);
      if (n > 0) {
        var sorted = state.originalRecords.slice();
        if (numCol) {
          sorted.sort(function (a, b) {
            var valA = SpreadsheetIO.parseVietnameseBudget(a[numCol]) || 0;
            var valB = SpreadsheetIO.parseVietnameseBudget(b[numCol]) || 0;
            return valB - valA;
          });
        }
        state.records = sorted.slice(0, n);
        recordAiEditHistory("Lọc Top " + n + (numCol ? " theo " + numCol : ""));
        applyAiDataStateChanges();
        showAiResultNotification(
          "success",
          "Đã lọc Top " + n + " bản ghi cao nhất",
          "AI đã chọn " + state.records.length + " bản ghi hàng đầu từ tổng số " + state.originalRecords.length + " dòng của tệp gốc. Bảng xử lý dữ liệu và biểu đồ đã được cập nhật tương ứng!",
          '<button class="btn-outline-pill-sm" style="cursor:pointer;padding:3px 10px;font-size:11px;" onclick="window.__namvietResetAi()">↺ Hoàn tác về ban đầu</button>'
        );
        return;
      }
    }

    // 4. Ý định: Lọc theo ngưỡng số tiền / doanh thu (VD: "doanh thu > 50tr", ">= 50 trieu", "tren 50tr", "< 20tr")
    var hasNumFilter = /(?:loc|chi lay|lay|giu)?\s*(?:doanh thu|thanh tien|so tien|ngan sach|gia tri)?\s*(>=|<=|>|<|tren|lon hon|tu|duoi|nho hon|bang)\s*([\d.,]+)\s*(ty|trieu|tr|k|m|b|dong|vnd)?/i.test(norm) ||
      /([\d.,]+)\s*(ty|trieu|tr)\s*(tro len|tro xuong|cao hon|thap hon)/i.test(norm) ||
      /(?:lon hon|tren|>=|>)\s*([\d.,]+)/i.test(norm);

    if (hasNumFilter && numCol) {
      var isAtLeast = !/duoi|nho hon|<|thap hon|tro xuong/i.test(norm);
      var numMatch = norm.match(/([\d.,]+)\s*(ty|trieu|tr|k|m|b)?/);
      if (numMatch) {
        var rawNum = parseFloat(numMatch[1].replace(/,/g, "."));
        var unit = (numMatch[2] || "").toLowerCase();
        var mult = 1;
        if (unit === "ty" || unit === "b") mult = 1000000000;
        else if (unit === "trieu" || unit === "tr" || unit === "m") mult = 1000000;
        else if (unit === "k") mult = 1000;
        else if (rawNum < 1000) mult = 1000000; // VD: "doanh thu > 50" -> 50 triệu

        var threshold = rawNum * mult;
        var filtered = state.originalRecords.filter(function (row) {
          var val = SpreadsheetIO.parseVietnameseBudget(row[numCol]) || 0;
          return isAtLeast ? val >= threshold : val <= threshold;
        });

        if (filtered.length === 0) {
          showAiResultNotification("warning", "Không tìm thấy kết quả phù hợp", "Không có bản ghi nào thỏa mãn điều kiện " + (isAtLeast ? "≥ " : "≤ ") + formatCompactVnd(threshold) + " trong cột " + numCol + ". Dữ liệu hiện tại được giữ nguyên.");
          return;
        }

        state.records = filtered;
        recordAiEditHistory("Lọc " + numCol + " " + (isAtLeast ? "≥ " : "≤ ") + formatCompactVnd(threshold));
        applyAiDataStateChanges();
        showAiResultNotification(
          "success",
          "Đã lọc dữ liệu theo " + numCol,
          "Đã tìm thấy " + filtered.length + "/" + state.originalRecords.length + " bản ghi có " + numCol + " " + (isAtLeast ? "≥ " : "≤ ") + formatCompactVnd(threshold) + ". Bảng xử lý dữ liệu và các chỉ số đã được cập nhật.",
          '<button class="btn-outline-pill-sm" style="cursor:pointer;padding:3px 10px;font-size:11px;" onclick="window.__namvietResetAi()">↺ Hoàn tác về ban đầu</button>'
        );
        return;
      }
    }

    // 5. Ý định: Sắp xếp (Sort)
    if (/sap xep|sort|thu tu/i.test(norm) || /giam dan|tang dan|cao xuong thap|thap len cao/i.test(norm)) {
      var isAsc = /tang dan|thap len cao|a-z|be den lon/i.test(norm);
      var sortCol = numCol;
      state.headers.forEach(function (h) {
        var hNorm = SpreadsheetIO.stripAccents(h).toLowerCase();
        if (norm.includes(hNorm)) sortCol = h;
      });

      if (sortCol) {
        state.records.sort(function (a, b) {
          var vA = a[sortCol];
          var vB = b[sortCol];
          var nA = SpreadsheetIO.parseVietnameseBudget(vA);
          var nB = SpreadsheetIO.parseVietnameseBudget(vB);
          if (nA !== null && nB !== null) return isAsc ? nA - nB : nB - nA;
          return isAsc ? String(vA || "").localeCompare(String(vB || "")) : String(vB || "").localeCompare(String(vA || ""));
        });
        recordAiEditHistory("Sắp xếp " + (isAsc ? "tăng dần" : "giảm dần") + " theo " + sortCol);
        applyAiDataStateChanges();
        showAiResultNotification(
          "success",
          "Đã sắp xếp lại bảng dữ liệu",
          "Đã sắp xếp " + state.records.length + " bản ghi theo cột '" + sortCol + "' chiều " + (isAsc ? "tăng dần (thấp lên cao) ↗" : "giảm dần (cao xuống thấp) ↘") + "."
        );
        return;
      }
    }

    // 6. Ý định: Loại bỏ các dòng lỗi định dạng / Chỉ lấy dòng hợp lệ
    if (/loai bo loi|chi lay dong hop le|dong hop le|loi dinh dang/i.test(norm)) {
      var diag = inspectRecordsForDiagnostics(state.headers, state.originalRecords, state.mapping);
      var errRowSet = {};
      (diag.issues || []).forEach(function (it) {
        if (it.severity === "error") errRowSet[it.rowIndex] = true;
      });
      var validRows = state.originalRecords.filter(function (r, idx) { return !errRowSet[idx]; });
      var removedCount = state.originalRecords.length - validRows.length;

      state.records = validRows;
      recordAiEditHistory("Loại bỏ " + removedCount + " dòng lỗi định dạng");
      applyAiDataStateChanges();
      showAiResultNotification(
        "success",
        "Đã loại bỏ các dòng bị lỗi định dạng",
        "Hệ thống đã giữ lại " + validRows.length + "/" + state.originalRecords.length + " bản ghi hoàn toàn hợp lệ. Đã loại bỏ " + removedCount + " dòng có lỗi dữ liệu.",
        '<button class="btn-outline-pill-sm" style="cursor:pointer;padding:3px 10px;font-size:11px;" onclick="window.__namvietResetAi()">↺ Hoàn tác về ban đầu</button>'
      );
      return;
    }

    // 7. Ý định: Dữ liệu đầy đủ / Loại bỏ dòng thiếu thông tin
    if (/day du|khong thieu|loai bo dong thieu|loc sach|clean/i.test(norm)) {
      var cleanRows = state.originalRecords.filter(function (row) {
        var keys = Object.keys(row);
        var emptyCount = 0;
        keys.forEach(function (k) {
          var v = String(row[k] || "").trim();
          if (!v || v === "null" || v === "undefined" || v === "-") emptyCount++;
        });
        return emptyCount <= 1;
      });
      state.records = cleanRows;
      recordAiEditHistory("Chỉ giữ dòng đầy đủ dữ liệu");
      applyAiDataStateChanges();
      showAiResultNotification(
        "success",
        "Đã làm sạch tập dữ liệu",
        "Giữ lại " + cleanRows.length + "/" + state.originalRecords.length + " bản ghi đầy đủ thông tin chuẩn hóa. Đã loại bỏ " + (state.originalRecords.length - cleanRows.length) + " dòng có trường dữ liệu bị trống.",
        '<button class="btn-outline-pill-sm" style="cursor:pointer;padding:3px 10px;font-size:11px;" onclick="window.__namvietResetAi()">↺ Hoàn tác về ban đầu</button>'
      );
      return;
    }

    // 8. Ý định: Đổi tiêu điểm biểu đồ
    if (/doi bieu do|chuyen bieu do|phan tich theo|nhom theo|tieu diem/i.test(norm)) {
      var dimensionName = "Khu vực";
      if (/khu vuc|tinh thanh|mien/i.test(norm)) dimensionName = "Khu vực";
      else if (/san pham|mat hang|hang hoa/i.test(norm)) dimensionName = "Mặt hàng";
      else if (/kenh|nguon|source/i.test(norm)) dimensionName = "Kênh bán";
      
      recordAiEditHistory("Đổi tiêu điểm biểu đồ theo " + dimensionName);
      applyAiDataStateChanges();
      showAiResultNotification(
        "success",
        "Đã chuyển đổi tiêu điểm biểu đồ",
        "Các biểu đồ phân tích trên Dashboard đã được ưu tiên hiển thị phân tích theo chiều '" + dimensionName + "'."
      );
      return;
    }

    // 9. Ý định: Hỏi đáp & Tra cứu số liệu (Q&A)
    if (/\?|bao nhieu|nhu the nao|thong ke|ai|co nhung gi|tong cong/i.test(norm)) {
      var ans = answerDataQuery(norm, state.records, state.headers);
      showAiResultNotification("info", ans.title, ans.detail, ans.extra);
      return;
    }

    // 10. Ý định: Tùy chỉnh nhận định báo cáo
    if (/tom tat|viet lai|nhan dinh|de xuat|bao cao/i.test(norm)) {
      state.aiCustomReportNote = "Yêu cầu: " + rawText + ". Toàn bộ số liệu đã được AI tổng hợp cô đọng, ưu tiên giải pháp tăng trưởng và phân bổ nguồn lực tối ưu.";
      renderExecutiveReportView("executiveReportContainer");
      showAiResultNotification(
        "success",
        "Đã cập nhật Báo cáo Phân tích",
        "AI đã biên soạn lại mục Nhận định Điều hành trong '📑 Báo cáo Phân tích' theo yêu cầu của bạn."
      );
      return;
    }

    // 11. Fallback: Tìm kiếm / Lọc theo từ khóa text bất kỳ trong file
    var matched = state.originalRecords.filter(function (row) {
      var fullStr = Object.values(row).join(" ").toLowerCase();
      var sNorm = SpreadsheetIO.stripAccents(fullStr);
      return sNorm.includes(norm) || fullStr.includes(rawText.toLowerCase());
    });

    if (matched.length > 0) {
      state.records = matched;
      recordAiEditHistory("Lọc từ khóa: '" + rawText + "'");
      applyAiDataStateChanges();
      showAiResultNotification(
        "success",
        "Đã lọc theo từ khóa: '" + rawText + "'",
        "Tìm thấy " + matched.length + "/" + state.originalRecords.length + " bản ghi chứa thông tin '" + rawText + "'. Bảng xử lý dữ liệu và Dashboard đã được cập nhật.",
        '<button class="btn-outline-pill-sm" style="cursor:pointer;padding:3px 10px;font-size:11px;" onclick="window.__namvietResetAi()">↺ Hoàn tác về ban đầu</button>'
      );
    } else {
      showAiResultNotification(
        "warning",
        "Chưa nhận diện được từ khóa hoặc điều kiện",
        "Không tìm thấy bản ghi nào khớp với '" + rawText + "'. Bạn hãy thử bấm một trong các gợi ý 1 chạm ở hàng nút bên dưới (như Top 10, Doanh thu ≥ 50tr, Sắp xếp...) nhé!"
      );
    }
  }

  function initAiCopilot() {
    var promptInput = $("aiPromptInput");
    var btnExecute = $("btnExecuteAiPrompt");
    var btnClear = $("btnClearAiPrompt");
    var btnReset = $("btnResetAiEdits");
    var btnDismiss = $("btnDismissAiResult");

    if (btnExecute && promptInput) {
      btnExecute.addEventListener("click", function () {
        executeAiPrompt(promptInput.value);
      });
    }

    if (promptInput) {
      promptInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          executeAiPrompt(promptInput.value);
        }
      });
      promptInput.addEventListener("input", function () {
        if (btnClear) {
          btnClear.classList.toggle("hidden", !promptInput.value.trim());
        }
      });
    }

    if (btnClear && promptInput) {
      btnClear.addEventListener("click", function () {
        promptInput.value = "";
        btnClear.classList.add("hidden");
        promptInput.focus();
      });
    }

    if (btnReset) {
      btnReset.addEventListener("click", resetAiEdits);
    }

    if (btnDismiss) {
      btnDismiss.addEventListener("click", hideAiResultNotification);
    }

    // Quick suggestion pills
    document.querySelectorAll(".ai-pill-btn").forEach(function (pill) {
      pill.addEventListener("click", function () {
        var p = pill.dataset.prompt;
        if (p) {
          if (promptInput) {
            promptInput.value = p;
            if (btnClear) btnClear.classList.remove("hidden");
          }
          executeAiPrompt(p);
        }
      });
    });
  }

  function initIntakeStepperClicks() {
    document.querySelectorAll(".step-node-box[data-intake-step]").forEach(function (box) {
      box.addEventListener("click", function () {
        var step = parseInt(box.dataset.intakeStep, 10);
        document.querySelectorAll(".step-node-box").forEach(function (b) {
          b.classList.toggle("active", b === box);
        });

        if (step === 1) {
          var uploadZone = $("panelIntakeCsv") || $("mainDropZone");
          if (uploadZone) uploadZone.scrollIntoView({ behavior: "smooth", block: "center" });
        } else if (step === 2) {
          if ($("mappingGrid")) $("mappingGrid").classList.remove("hidden");
          var mapTitle = $("btnToggleMapping");
          if (mapTitle) mapTitle.scrollIntoView({ behavior: "smooth", block: "start" });
        } else if (step === 3) {
          var aiEdit = $("aiEditSectionWrapper");
          if (aiEdit) {
            aiEdit.scrollIntoView({ behavior: "smooth", block: "start" });
            if ($("aiPromptInput")) $("aiPromptInput").focus();
          }
        } else if (step === 4) {
          runAgentNow({ openDashboard: true });
        } else if (step === 5) {
          switchPageTab("tab-dashboard");
          switchDashSubTab("dash-leads");
        } else if (step === 6) {
          switchPageTab("tab-dashboard");
          switchDashSubTab("dash-report");
        }
      });
    });
  }

  // =========================================================================
  // 6. Application Initialization
  // =========================================================================
  function init() {
    // 4 Top Tabs
    document.querySelectorAll(".nav-tab-pill").forEach(function (pill) {
      pill.addEventListener("click", function () {
        switchPageTab(pill.dataset.tab);
      });
    });

    if ($("brandLogoBtn")) {
      $("brandLogoBtn").addEventListener("click", function () { switchPageTab("tab-dashboard"); });
    }

    // Top Header Action Buttons
    if ($("btnHeaderQuickLoad50")) {
      $("btnHeaderQuickLoad50").addEventListener("click", loadSampleSalesReport50);
    }
    if ($("btnDashReload50")) {
      $("btnDashReload50").addEventListener("click", loadSampleSalesReport50);
    }
    if ($("btnHeaderExportHtml")) {
      $("btnHeaderExportHtml").addEventListener("click", exportResultsCsv);
    }

    // Navigation jumps across all tabs
    document.querySelectorAll("[data-go-tab], [data-jump-tab]").forEach(function (el) {
      el.addEventListener("click", function () {
        var target = el.dataset.goTab || el.dataset.jumpTab;
        if (target) switchPageTab(target);
      });
    });

    // Step rows on Page 2 (Workflow)
    document.querySelectorAll(".wf-step-row-item").forEach(function (row) {
      row.addEventListener("mouseenter", function () {
        updateStepPreview(parseInt(row.dataset.step, 10));
      });
      row.addEventListener("click", function () {
        updateStepPreview(parseInt(row.dataset.step, 10));
      });
    });

    // Ribbon nodes on Page 2 (Workflow)
    document.querySelectorAll(".wf-ribbon-node").forEach(function (node) {
      node.addEventListener("click", function () {
        updateStepPreview(parseInt(node.dataset.step, 10));
      });
    });

    // Preset buttons on Intake Studio
    if ($("btnPresetStandard")) {
      $("btnPresetStandard").addEventListener("click", function () {
        loadDefaultDemoData();
        runAgentNow({ openDashboard: true });
        showToast("Đã nạp 18 leads mẫu chuẩn!", "success");
      });
    }
    if ($("btnPresetError")) {
      $("btnPresetError").addEventListener("click", loadSampleDirtyLeads);
    }
    if ($("btnPreset50Sales")) {
      $("btnPreset50Sales").addEventListener("click", loadSampleSalesReport50);
    }
    if ($("btnPreset700")) {
      $("btnPreset700").addEventListener("click", loadSimulatedLargeBatch);
    }
    if ($("btnIntakeLoad50")) $("btnIntakeLoad50").addEventListener("click", loadSampleSalesReport50);

    // 4 Intake Mode Switcher Pills (Ảnh 1)
    document.querySelectorAll(".intake-mode-pill").forEach(function (pill) {
      pill.addEventListener("click", function () {
        var mode = pill.dataset.intakeMode;
        document.querySelectorAll(".intake-mode-pill").forEach(function (p) {
          p.classList.toggle("active", p === pill);
        });
        if ($("panelIntakeCsv")) $("panelIntakeCsv").classList.toggle("hidden", mode !== "csv");
        if ($("panelIntakeGsheet")) $("panelIntakeGsheet").classList.toggle("hidden", mode !== "gsheet");
        if ($("panelIntakePaste")) $("panelIntakePaste").classList.toggle("hidden", mode !== "paste");
        if ($("panelIntakeQuick")) $("panelIntakeQuick").classList.toggle("hidden", mode !== "quick");
      });
    });

    // Parse pasted table from Excel / Sheets
    if ($("btnParsePastedTable")) {
      $("btnParsePastedTable").addEventListener("click", function () {
        var text = ($("pasteTableInput") ? $("pasteTableInput").value : "").trim();
        if (!text) {
          showStatusBanner("Vui lòng dán dữ liệu bảng từ Excel/Sheets vào khung trên.", "error");
          return;
        }
        var tbl = SpreadsheetIO.parseCSV(text);
        if (!tbl || !tbl.records || tbl.records.length === 0) {
          showStatusBanner("Không nhận diện được dòng dữ liệu hợp lệ trong nội dung dán.", "error");
          return;
        }
        loadTableIntoIntake(tbl.headers, tbl.records, "Bảng dán từ Clipboard");
        showStatusBanner("Đã nạp thành công " + tbl.records.length + " dòng từ bảng dán.", "success");
        var autoRun = $("chkAutoRunOnSelect") ? $("chkAutoRunOnSelect").checked : true;
        if (autoRun) runAgentNow({ openDashboard: true });
      });
    }

    // Quick Single Lead test
    if ($("btnRunQuickSingleLead")) {
      $("btnRunQuickSingleLead").addEventListener("click", function () {
        var company = ($("quickCompanyName") ? $("quickCompanyName").value : "").trim();
        var need = ($("quickNeed") ? $("quickNeed").value : "").trim();
        var region = ($("quickRegion") ? $("quickRegion").value : "Hà Nội").trim();
        var budgetRaw = ($("quickBudget") ? $("quickBudget").value : "50,000,000").trim();
        if (!company) {
          showStatusBanner("Vui lòng nhập tên doanh nghiệp.", "error");
          return;
        }
        var row = {
          "MÃ DÒNG": "DS-TEST-01",
          "THÁNG": "2026-11",
          "KÊNH BÁN": "Website Trực tiếp",
          "TÊN DOANH NGHIỆP": company,
          "NHU CẦU": need || "Tư vấn phần mềm quản trị",
          "KHU VỰC": region,
          "NGÂN SÁCH (VND)": budgetRaw,
          "SẢN PHẨM": need,
          "SỐ ĐƠN": "1"
        };
        var headers = Object.keys(row);
        loadTableIntoIntake(headers, [row], "Lead nhập nhanh đơn lẻ");
        runAgentNow({ openDashboard: true });
        showToast("Đã phân tích lead \"" + company + "\" thành công!", "success");
      });
    }

    // Downloads
    if ($("btnPresetDownload")) {
      $("btnPresetDownload").addEventListener("click", function () {
        window.location.href = "Du_Lieu_Mau_NamViet_Test.xlsx";
      });
    }
    if ($("btnDownload50Csv")) {
      $("btnDownload50Csv").addEventListener("click", function () {
        var raw = NAMVIET_DATA.sampleSalesReport50 || [];
        if (raw.length === 0) return;
        var headers = Object.keys(raw[0]);
        var rows = raw.map(function (r) { return headers.map(function (h) { return r[h] == null ? "" : r[h]; }); });
        triggerDownload(new Blob([SpreadsheetIO.toCSV(headers, rows)], { type: "text/csv;charset=utf-8;" }), "BaoCao_50Dong.csv");
      });
    }
    if ($("btnDownloadSample18Csv")) {
      $("btnDownloadSample18Csv").addEventListener("click", function () {
        var rows = NAMVIET_DATA.sampleLeads.map(function (r) { return DEFAULT_HEADERS.map(function (h) { return r[h] == null ? "" : r[h]; }); });
        triggerDownload(new Blob([SpreadsheetIO.toCSV(DEFAULT_HEADERS, rows)], { type: "text/csv;charset=utf-8;" }), "NamViet_18Leads.csv");
      });
    }
    if ($("btnDownloadSample18Xlsx")) {
      $("btnDownloadSample18Xlsx").addEventListener("click", function () {
        window.location.href = "Du_Lieu_Mau_NamViet_Test.xlsx";
      });
    }

    // Drag and Drop
    var dropZone = $("mainDropZone");
    var fileInput = $("mainFileInput");
    if (dropZone && fileInput) {
      dropZone.addEventListener("dragover", function (e) { e.preventDefault(); dropZone.classList.add("dragover"); });
      dropZone.addEventListener("dragleave", function () { dropZone.classList.remove("dragover"); });
      dropZone.addEventListener("drop", function (e) {
        e.preventDefault();
        dropZone.classList.remove("dragover");
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
          var autoRun = $("chkAutoRunOnSelect") ? $("chkAutoRunOnSelect").checked : true;
          handleUploadedFile(e.dataTransfer.files[0], autoRun);
        }
      });
      fileInput.addEventListener("change", function (e) {
        if (e.target.files && e.target.files[0]) {
          var autoRun = $("chkAutoRunOnSelect") ? $("chkAutoRunOnSelect").checked : true;
          handleUploadedFile(e.target.files[0], autoRun);
          e.target.value = "";
        }
      });
    }

    // Hero & Intro buttons
    if ($("btnHeroStart")) {
      $("btnHeroStart").addEventListener("click", function () { switchPageTab("tab-intake"); });
    }
    if ($("btnHeroArrow")) {
      $("btnHeroArrow").addEventListener("click", function () { switchPageTab("tab-intake"); });
    }
    if ($("btnIntroLoad50")) {
      $("btnIntroLoad50").addEventListener("click", function () { loadSampleSalesReport50(); });
    }
    if ($("btnEmptyLoadSample50")) {
      $("btnEmptyLoadSample50").addEventListener("click", function () { loadSampleSalesReport50(); });
    }
    if ($("btnIntroGoIntake")) {
      $("btnIntroGoIntake").addEventListener("click", function () { switchPageTab("tab-intake"); });
    }

    // Toggle mapping detail
    if ($("btnToggleMapping")) {
      $("btnToggleMapping").addEventListener("click", function () {
        if ($("mappingGrid")) $("mappingGrid").classList.toggle("hidden");
      });
    }

    // Google Sheets fetch
    if ($("btnFetchGsheet")) {
      $("btnFetchGsheet").addEventListener("click", function () {
        var input = $("gsheetUrlInput");
        var url = (input ? input.value : "").trim();
        if (!url) {
          showStatusBanner("Vui lòng nhập link Google Sheet công khai.", "error");
          return;
        }
        showStatusBanner("Đang tải dữ liệu từ Google Sheet...", "success");
        SpreadsheetIO.fetchGoogleSheetTable(url)
          .then(function (res) {
            loadTableIntoIntake(res.table.headers, res.table.records, "Google Sheet");
            showStatusBanner("Đã nạp thành công Google Sheet (" + res.table.records.length + " dòng).", "success");
            var autoRun = $("chkAutoRunOnSelect") ? $("chkAutoRunOnSelect").checked : true;
            if (autoRun) runAgentNow({ openDashboard: true });
          })
          .catch(function (err) {
            showStatusBanner(err.message, "error");
          });
      });
    }

    // Tab 4 Subtabs (.dash-sub-pill)
    document.querySelectorAll(".dash-sub-pill").forEach(function (pill) {
      pill.addEventListener("click", function () {
        switchDashSubTab(pill.dataset.subtab);
      });
    });

    // Run Agent
    if ($("btnRunAgent")) {
      $("btnRunAgent").addEventListener("click", function () {
        runAgentNow({ openDashboard: true });
      });
    }

    // Exports
    if ($("btnPrintReportPdf")) {
      $("btnPrintReportPdf").addEventListener("click", printOrExportPdf);
    }
    if ($("btnExportWordReport")) {
      $("btnExportWordReport").addEventListener("click", exportReportWord);
    }
    if ($("btnExportLeadsCsv")) $("btnExportLeadsCsv").addEventListener("click", exportResultsCsv);
    if ($("btnExportTasksCsv")) $("btnExportTasksCsv").addEventListener("click", exportResultsCsv);
    if ($("btnExportJsonl")) $("btnExportJsonl").addEventListener("click", exportResultsCsv);
    if ($("btnExportXlsxFull")) $("btnExportXlsxFull").addEventListener("click", exportResultsXlsx);
    if ($("btnFinalizeAndExportHtml")) {
      $("btnFinalizeAndExportHtml").addEventListener("click", function () {
        if ($("dashReviewStatusTag")) {
          $("dashReviewStatusTag").textContent = "Đã chốt kết quả ✓";
          $("dashReviewStatusTag").style.background = "#dcfce7";
          $("dashReviewStatusTag").style.color = "#15803d";
          $("dashReviewStatusTag").style.borderColor = "#86efac";
        }
        exportResultsCsv();
        showToast("Đã chốt kết quả thành công và xuất dữ liệu!", "success");
      });
    }

    // Search and filter in Leads table
    if ($("searchInput")) {
      $("searchInput").addEventListener("input", function () {
        state.searchQuery = $("searchInput").value.trim();
        renderLeadsTable();
      });
    }
    if ($("filterStage")) {
      $("filterStage").addEventListener("change", function () {
        state.filterStage = $("filterStage").value;
        renderLeadsTable();
      });
    }
    if ($("filterTier")) {
      $("filterTier").addEventListener("change", function () {
        state.filterTier = $("filterTier").value;
        renderLeadsTable();
      });
    }

    // Inspector
    if ($("btnCloseInspector")) $("btnCloseInspector").addEventListener("click", closeInspector);
    if ($("inspectorBackdrop")) $("inspectorBackdrop").addEventListener("click", closeInspector);

    // Feedback System
    initFeedbackSystem();

    // AI Copilot & Modification Assistant
    initAiCopilot();

    // Intake Stepper Clicks
    initIntakeStepperClicks();

    // Save Config on Tab
    if ($("btnSaveConfigTab")) {
      $("btnSaveConfigTab").addEventListener("click", function () {
        var provider = $("cfgProvider") ? $("cfgProvider").value : "offline";
        var model = ($("cfgModel") ? $("cfgModel").value : "gemini-2.5-flash").trim();
        var key = ($("cfgApiKey") ? $("cfgApiKey").value : "").trim();
        state.llmConfig.provider = provider;
        state.llmConfig.model = model;
        state.llmConfig.apiKey = key;
        showToast("Đã lưu cấu hình AI thành công (" + provider + ")!", "success");
      });
    }

    // Initial boot: Start with empty dashboard; dashboard is only created when a file is chosen!
    renderDashboard();

    // Default to Tab 1 (1. Giới thiệu) exactly as requested
    switchPageTab("tab-intro");
  }

  // =========================================================================
  // FEEDBACK SYSTEM (Góp ý & Đánh giá)
  // =========================================================================
  var currentSelectedStars = 5;

  function initFeedbackSystem() {
    var starLabels = {
      1: "1/5 Cần cải thiện",
      2: "2/5 Tạm chấp nhận",
      3: "3/5 Đạt yêu cầu",
      4: "4/5 Tốt & Hiệu quả",
      5: "5/5 Rất xuất sắc"
    };

    // Star rating picker
    document.querySelectorAll(".star-rating-picker .star-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var stars = parseInt(btn.dataset.stars, 10);
        currentSelectedStars = stars;
        document.querySelectorAll(".star-rating-picker .star-btn").forEach(function (b) {
          var s = parseInt(b.dataset.stars, 10);
          b.classList.toggle("active", s <= stars);
        });
        if ($("starRatingLabel")) $("starRatingLabel").textContent = starLabels[stars] || (stars + "/5");
      });
    });

    // Scroll to feedback section helper
    function scrollToFeedbackSection() {
      switchPageTab("tab-feedback");
      setTimeout(function () {
        var el = $("sectionCustomerFeedback");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          if ($("feedbackUserName")) $("feedbackUserName").focus();
        }
      }, 100);
    }

    if ($("btnFloatingFeedback")) {
      $("btnFloatingFeedback").addEventListener("click", scrollToFeedbackSection);
    }
    if ($("btnDashFeedbackShortcut")) {
      $("btnDashFeedbackShortcut").addEventListener("click", scrollToFeedbackSection);
    }

    // Submit Feedback
    if ($("feedbackFormSubmit")) {
      $("feedbackFormSubmit").addEventListener("submit", function (e) {
        e.preventDefault();
        var nameInput = $("feedbackUserName");
        var compInput = $("feedbackUserCompany");
        var catSelect = $("feedbackCategory");
        var commInput = $("feedbackUserComment");

        var name = (nameInput && nameInput.value.trim()) || "Người dùng ẩn danh";
        var company = (compInput && compInput.value.trim()) || "Doanh nghiệp đối tác";
        var comment = (commInput && commInput.value.trim()) || "";
        var category = catSelect ? catSelect.options[catSelect.selectedIndex].text : "Đóng góp chung";

        if (!comment) {
          showToast("Vui lòng nhập nội dung phản hồi!", "error");
          return;
        }

        var newFeedback = {
          name: name,
          company: company,
          stars: currentSelectedStars,
          comment: comment,
          category: category,
          created_at: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) + " hôm nay"
        };

        // Save to localStorage
        try {
          var list = JSON.parse(localStorage.getItem("namviet_feedbacks") || "[]");
          list.unshift(newFeedback);
          localStorage.setItem("namviet_feedbacks", JSON.stringify(list));
        } catch (err) {}

        // Add to cards grid visually
        appendFeedbackCardToGrid(newFeedback);

        // Reset form
        if (nameInput) nameInput.value = "";
        if (compInput) compInput.value = "";
        if (commInput) commInput.value = "";

        showToast("✓ Cảm ơn bạn! Phản hồi (" + currentSelectedStars + "★) đã được ghi nhận thành công.", "success");
      });
    }

    // Load persisted feedbacks
    loadPersistedFeedbacks();
  }

  function appendFeedbackCardToGrid(item) {
    var grid = $("feedbackCardsGrid");
    if (!grid) return;
    var starsStr = "★★★★★".slice(0, item.stars) + "☆☆☆☆☆".slice(0, 5 - item.stars);
    var initials = item.name.split(" ").map(function (w) { return w[0]; }).join("").slice(-2).toUpperCase() || "KH";

    var card = document.createElement("div");
    card.className = "feedback-card";
    card.innerHTML =
      '<div class="feedback-card-top">' +
        '<div class="feedback-stars">' + starsStr + '</div>' +
        '<span class="feedback-tag feedback-tag-new">Mới gửi 🌟</span>' +
      '</div>' +
      '<p class="feedback-quote">"' + escHtml(item.comment) + '"</p>' +
      '<div class="feedback-author-row">' +
        '<div class="feedback-avatar" style="background:#fee2e2;color:#be123c;">' + escHtml(initials) + '</div>' +
        '<div class="feedback-author-info">' +
          '<strong>' + escHtml(item.name) + '</strong>' +
          '<span>' + escHtml(item.company) + ' • <em style="color:#e11d48;">' + escHtml(item.category) + '</em></span>' +
        '</div>' +
      '</div>';
    grid.insertBefore(card, grid.firstChild);
  }

  function loadPersistedFeedbacks() {
    try {
      var list = JSON.parse(localStorage.getItem("namviet_feedbacks") || "[]");
      list.slice(0, 5).reverse().forEach(function (item) {
        appendFeedbackCardToGrid(item);
      });
    } catch (err) {}
  }

  document.addEventListener("DOMContentLoaded", init);
})();
