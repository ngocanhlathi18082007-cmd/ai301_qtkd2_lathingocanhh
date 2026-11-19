(function (root) {
  root.NAMVIET_DATA = {
    catalog: {
      company: "Công ty Phần mềm Nam Việt",
      target_segment: "Doanh nghiệp vừa và nhỏ (SME: 10 - 500 nhân sự tại Việt Nam)",
      products: [
        {
          code: "NV-ACC",
          name: "NamViet FinAcc (Kế toán & Hóa đơn điện tử SME)",
          description: "Phần mềm kế toán tổng hợp, kê khai thuế, hóa đơn điện tử, công nợ và báo cáo tài chính dành cho SME.",
          ideal_industries: ["Thương mại", "Bán lẻ & F&B", "Dịch vụ B2B", "Xây dựng & Kỹ thuật", "Sản xuất nhẹ"],
          ideal_size_min: 5,
          ideal_size_max: 350,
          typical_budget_min_vnd: 15000000,
          typical_budget_max_vnd: 90000000,
          keywords: [
            "kế toán", "hóa đơn điện tử", "hóa đơn", "thuế", "báo cáo tài chính",
            "công nợ", "sổ sách", "chi phí", "tài chính", "finacc", "misa", "fast"
          ]
        },
        {
          code: "NV-CRM",
          name: "NamViet SalesCRM (Quản lý Bán hàng & CSKH)",
          description: "Phần mềm quản lý pipeline bán hàng, lịch sử tương tác khách hàng, báo giá, KPI nhân viên kinh doanh và chăm sóc sau bán.",
          ideal_industries: ["Dịch vụ B2B", "Thương mại", "Công nghệ", "Giáo dục & Tư vấn", "Bất động sản SME"],
          ideal_size_min: 10,
          ideal_size_max: 300,
          typical_budget_min_vnd: 18000000,
          typical_budget_max_vnd: 110000000,
          keywords: [
            "crm", "quản lý khách hàng", "chăm sóc khách hàng", "bán hàng", "pipeline",
            "kinh doanh", "báo giá", "telesale", "lead", "khách hàng tiềm năng", "sales", "đấu thầu", "học viên"
          ]
        },
        {
          code: "NV-HRM",
          name: "NamViet People (Nhân sự, Chấm công & Tính lương)",
          description: "Phần mềm quản lý hồ sơ nhân sự, chấm công GPS/FaceID, tính lương tự động, BHXH và đánh giá KPI nội bộ.",
          ideal_industries: ["Bán lẻ & F&B", "Dịch vụ B2B", "Sản xuất nhẹ", "Công nghệ", "Y tế tư nhân", "Giáo dục & Tư vấn"],
          ideal_size_min: 20,
          ideal_size_max: 500,
          typical_budget_min_vnd: 20000000,
          typical_budget_max_vnd: 130000000,
          keywords: [
            "nhân sự", "hrm", "chấm công", "tính lương", "bảng lương", "tuyển dụng",
            "hợp đồng lao động", "bhxh", "kpi nhân viên", "ca làm việc", "ca kíp"
          ]
        },
        {
          code: "NV-INV",
          name: "NamViet StockOPS (Quản lý Kho, Mua hàng & Chuỗi bán lẻ)",
          description: "Phần mềm xuất nhập tồn, quản lý lô/hạn sử dụng, mua hàng nhà cung cấp, đồng bộ POS đa chi nhánh.",
          ideal_industries: ["Thương mại", "Bán lẻ & F&B", "Kho vận & Logistics", "Sản xuất nhẹ", "Nông sản & Phân phối"],
          ideal_size_min: 10,
          ideal_size_max: 350,
          typical_budget_min_vnd: 22000000,
          typical_budget_max_vnd: 140000000,
          keywords: [
            "quản lý kho", "tồn kho", "xuất nhập tồn", "kho vận", "pos", "bán lẻ",
            "chi nhánh", "cửa hàng", "mua hàng", "đơn hàng", "mã vạch", "chuỗi", "kho", "hạn sử dụng"
          ]
        },
        {
          code: "NV-SUITE",
          name: "NamViet All-in-One SME Suite (Hợp nhất Tài chính - CRM - Kho - Nhân sự)",
          description: "Bộ giải pháp quản trị tổng thể chuẩn hóa cho doanh nghiệp SME muốn đồng bộ dữ liệu liên phòng ban trên một nền tảng.",
          ideal_industries: ["Thương mại", "Sản xuất nhẹ", "Dịch vụ B2B", "Bán lẻ & F&B", "Kho vận & Logistics", "Xây dựng & Kỹ thuật", "Nông sản & Phân phối"],
          ideal_size_min: 25,
          ideal_size_max: 500,
          typical_budget_min_vnd: 60000000,
          typical_budget_max_vnd: 300000000,
          keywords: [
            "quản trị tổng thể", "đồng bộ phòng ban", "erp sme", "all-in-one",
            "kế toán và kho", "bán hàng và kho", "hợp nhất", "chuyển đổi số toàn diện"
          ]
        }
      ],
      out_of_scope_patterns: [
        {
          pattern_id: "OOS-HIS",
          label: "Phần mềm Bệnh viện / Y tế chuyên sâu (HIS/RIS/PACS)",
          keywords: ["his", "bệnh án điện tử", "quản lý bệnh viện", "phần mềm bệnh viện", "dicom", "hl7", "xét nghiệm", "giường bệnh", "ris/pacs"],
          reason: "Nam Việt chỉ cung cấp phần mềm quản trị SME (Kế toán/CRM/HRM/Kho), không có phân hệ HIS chuyên ngành bệnh viện."
        },
        {
          pattern_id: "OOS-MES",
          label: "Hệ thống MES / Tự động hóa dây chuyền nhà máy lớn (PLC/SCADA)",
          keywords: ["mes", "plc", "scada", "dây chuyền cnc", "máy cnc", "sap s/4hana", "erp sản xuất nặng", "iot nhà máy", "điều khiển máy"],
          reason: "Nam Việt không cung cấp phần mềm MES điều khiển thiết bị/dây chuyền công nghiệp nặng hoặc SAP Enterprise."
        },
        {
          pattern_id: "OOS-CORE-FIN",
          label: "Core Banking / Chứng khoán / Ví điện tử",
          keywords: ["core banking", "chứng khoán", "ví điện tử", "thanh toán liên ngân hàng", "cổng thanh toán"],
          reason: "Ngoài phạm vi giải pháp quản trị doanh nghiệp SME của Nam Việt."
        },
        {
          pattern_id: "OOS-OUTSOURCE",
          label: "Gia công App Mobile / Phần mềm miễn phí hoàn toàn",
          keywords: ["gia công app", "viết app riêng", "outsource", "làm game", "miễn phí hoàn toàn", "thi công cáp mạng", "mua server vật lý"],
          reason: "Nam Việt cung cấp phần mềm SaaS B2B trả phí theo gói chuẩn hóa, không nhận gia công app riêng hoặc gói miễn phí."
        }
      ]
    },
    salesTeam: {
      sales_manager: {
        id: "MGR-01",
        name: "Hoàng Đức Thắng",
        role: "Trưởng phòng Kinh doanh",
        email: "thang.hd@namvietsoft.vn"
      },
      sales_reps: [
        {
          id: "NVKD-01",
          name: "Nguyễn Minh Quân",
          region: "Miền Bắc",
          region_aliases: ["hà nội", "bắc ninh", "hải phòng", "hải dương", "vĩnh phúc", "thái nguyên", "hưng yên", "quảng ninh", "miền bắc"],
          industries: ["Sản xuất nhẹ", "Kho vận & Logistics", "Xây dựng & Kỹ thuật"],
          product_focus: ["NV-INV", "NV-SUITE", "NV-ACC"],
          weekly_capacity: 95,
          current_active_leads: 58,
          avg_response_hours: 2.1,
          email: "quan.nm@namvietsoft.vn"
        },
        {
          id: "NVKD-02",
          name: "Trần Ngọc Mai",
          region: "Miền Bắc",
          region_aliases: ["hà nội", "bắc ninh", "hải phòng", "hà nam", "nam định", "miền bắc"],
          industries: ["Thương mại", "Bán lẻ & F&B", "Nông sản & Phân phối"],
          product_focus: ["NV-ACC", "NV-INV", "NV-CRM"],
          weekly_capacity: 95,
          current_active_leads: 64,
          avg_response_hours: 1.8,
          email: "mai.tn@namvietsoft.vn"
        },
        {
          id: "NVKD-03",
          name: "Lê Quang Khải",
          region: "Miền Bắc",
          region_aliases: ["hà nội", "hải phòng", "quảng ninh", "miền bắc"],
          industries: ["Dịch vụ B2B", "Công nghệ", "Giáo dục & Tư vấn", "Y tế tư nhân"],
          product_focus: ["NV-CRM", "NV-HRM", "NV-SUITE"],
          weekly_capacity: 90,
          current_active_leads: 52,
          avg_response_hours: 2.4,
          email: "khai.lq@namvietsoft.vn"
        },
        {
          id: "NVKD-04",
          name: "Phạm Thảo Vy",
          region: "Miền Nam",
          region_aliases: ["tp.hcm", "hồ chí minh", "hcm", "sài gòn", "bình dương", "đồng nai", "long an", "bà rịa vũng tàu", "đông nam bộ", "miền nam"],
          industries: ["Thương mại", "Bán lẻ & F&B"],
          product_focus: ["NV-INV", "NV-CRM", "NV-ACC"],
          weekly_capacity: 95,
          current_active_leads: 71,
          avg_response_hours: 1.9,
          email: "vy.pt@namvietsoft.vn"
        },
        {
          id: "NVKD-05",
          name: "Võ Hoàng Nam",
          region: "Miền Nam",
          region_aliases: ["tp.hcm", "hồ chí minh", "hcm", "bình dương", "đồng nai", "tây ninh", "đông nam bộ", "miền nam"],
          industries: ["Sản xuất nhẹ", "Kho vận & Logistics", "Xây dựng & Kỹ thuật"],
          product_focus: ["NV-ACC", "NV-SUITE", "NV-INV"],
          weekly_capacity: 95,
          current_active_leads: 60,
          avg_response_hours: 2.5,
          email: "nam.vh@namvietsoft.vn"
        },
        {
          id: "NVKD-06",
          name: "Đặng Thu Hiền",
          region: "Miền Nam",
          region_aliases: ["tp.hcm", "hồ chí minh", "hcm", "bình dương", "đồng nai", "miền nam"],
          industries: ["Dịch vụ B2B", "Công nghệ", "Giáo dục & Tư vấn", "Y tế tư nhân", "Bất động sản SME"],
          product_focus: ["NV-CRM", "NV-HRM", "NV-SUITE"],
          weekly_capacity: 90,
          current_active_leads: 63,
          avg_response_hours: 2.0,
          email: "hien.dt@namvietsoft.vn"
        },
        {
          id: "NVKD-07",
          name: "Bùi Quốc Bảo",
          region: "Miền Trung",
          region_aliases: ["đà nẵng", "huế", "quảng nam", "khánh hòa", "nha trang", "đắk lắk", "bình định", "nghệ an", "thanh hóa", "miền trung", "tây nguyên"],
          industries: ["Thương mại", "Bán lẻ & F&B", "Dịch vụ B2B", "Sản xuất nhẹ", "Kho vận & Logistics", "Giáo dục & Tư vấn"],
          product_focus: ["NV-ACC", "NV-CRM", "NV-INV", "NV-HRM"],
          weekly_capacity: 85,
          current_active_leads: 44,
          avg_response_hours: 2.2,
          email: "bao.bq@namvietsoft.vn"
        },
        {
          id: "NVKD-08",
          name: "Huỳnh Kim Ngân",
          region: "Miền Tây & Đa chi nhánh",
          region_aliases: ["cần thơ", "long an", "tiền giang", "an giang", "đồng tháp", "kiên giang", "vĩnh long", "miền tây", "đbscl", "toàn quốc", "đa chi nhánh"],
          industries: ["Nông sản & Phân phối", "Thương mại", "Bán lẻ & F&B", "Kho vận & Logistics", "Dịch vụ B2B"],
          product_focus: ["NV-SUITE", "NV-ACC", "NV-INV", "NV-HRM"],
          weekly_capacity: 85,
          current_active_leads: 48,
          avg_response_hours: 2.0,
          email: "ngan.hk@namvietsoft.vn"
        }
      ]
    },
    contactHistory: {
      reference_date: "2026-11-11",
      sla_neglected_days: 7,
      records: [
        {
          history_id: "HIST-001",
          company_name: "Công ty TNHH Thương mại An Phát",
          aliases: ["An Phát Co.", "An Phát Trading", "Cty An Phát"],
          tax_id: "0314567890",
          domain: "anphat.vn",
          phone: "0903112233",
          region: "TP.HCM",
          industry: "Thương mại",
          assigned_rep_id: "NVKD-04",
          assigned_rep_name: "Phạm Thảo Vy",
          last_contact_date: "2026-11-08",
          days_since_last_contact: 3,
          stage: "Đang tư vấn - Đã hẹn Demo NV-INV",
          dispute_flag: false,
          notes: "Đã trao đổi với Trưởng phòng Thu mua (chị Hạnh), dự kiến demo tuần này."
        },
        {
          history_id: "HIST-002",
          company_name: "Công ty Cổ phần Dịch vụ Logistics Đông Á",
          aliases: ["Đông Á Logistics", "DAL Corp", "Cty Đông Á"],
          tax_id: "0108877665",
          domain: "donga-logistics.vn",
          phone: "0912445566",
          region: "Hà Nội",
          industry: "Kho vận & Logistics",
          assigned_rep_id: "NVKD-01",
          assigned_rep_name: "Nguyễn Minh Quân",
          last_contact_date: "2026-10-27",
          days_since_last_contact: 15,
          stage: "Mới tiếp nhận - Chưa phản hồi lại sau báo giá sơ bộ",
          dispute_flag: false,
          notes: "CẢNH BÁO: Quá hạn chăm sóc 15 ngày chưa có log gọi lại."
        },
        {
          history_id: "HIST-003",
          company_name: "Công ty TNHH Công nghệ Minh Tâm",
          aliases: ["Minh Tâm Tech", "MT Solutions", "Minh Tam Co"],
          tax_id: "0319988776",
          domain: "minhtamtech.vn",
          phone: "0988776655",
          region: "TP.HCM",
          industry: "Công nghệ",
          assigned_rep_id: "NVKD-06",
          assigned_rep_name: "Đặng Thu Hiền",
          secondary_claim_rep_id: "NVKD-03",
          secondary_claim_rep_name: "Lê Quang Khải",
          last_contact_date: "2026-11-05",
          days_since_last_contact: 6,
          stage: "Tranh chấp quyền chăm sóc (Văn phòng HN & Trụ sở HCM)",
          dispute_flag: true,
          notes: "NVKD-03 đã gửi mail tiếp cận đầu tháng qua chi nhánh Hà Nội; NVKD-06 đang chăm sóc trụ sở chính TP.HCM."
        },
        {
          history_id: "HIST-004",
          company_name: "Công ty TNHH Thực phẩm Xanh Việt Food",
          aliases: ["Việt Food", "VietFood Co", "Thuc Pham Viet Food"],
          tax_id: "0312233445",
          domain: "vietfood.vn",
          phone: "0909887744",
          region: "Bình Dương",
          industry: "Bán lẻ & F&B",
          assigned_rep_id: "NVKD-04",
          assigned_rep_name: "Phạm Thảo Vy",
          last_contact_date: "2026-10-20",
          days_since_last_contact: 22,
          stage: "Bị bỏ quên sau hội thảo tháng 10",
          dispute_flag: false,
          notes: "CẢNH BÁO: Khách từng quan tâm NamViet StockOPS nhưng chưa được gọi chốt lịch."
        },
        {
          history_id: "HIST-005",
          company_name: "Công ty Cổ phần Dược phẩm Tâm An",
          aliases: ["Dược Tâm An", "Tam An Pharma", "TamAn Co"],
          tax_id: "0318899001",
          domain: "tamanpharma.vn",
          phone: "0901223344",
          region: "TP.HCM",
          industry: "Y tế tư nhân",
          assigned_rep_id: "NVKD-06",
          assigned_rep_name: "Đặng Thu Hiền",
          last_contact_date: "2026-10-15",
          days_since_last_contact: 27,
          stage: "DNC - Khách hàng từ chối tiếp nhận / Đã chốt đối tác khác",
          dnc_flag: true,
          dispute_flag: false,
          notes: "DNC: Khách đã gửi email đề nghị không liên hệ lại (Do Not Contact)."
        }
      ]
    },
    rules: {
      version: "NV-RULES-2026.11",
      deduplication: {
        legal_prefixes: [
          "công ty tnhh một thành viên", "công ty tnhh mtv", "công ty tnhh", "cty tnhh",
          "công ty cổ phần", "cty cp", "công ty cp", "công ty", "cty", "tập đoàn", "doanh nghiệp tư nhân", "dntn",
          "tnhh", "mtv", "cp", "jsc", "corp", "co.", "ltd", "limited", "company", "group"
        ],
        business_descriptors: [
          "thương mại dịch vụ", "thương mại và dịch vụ", "tm dv", "tm-dv", "tmdv",
          "thương mại", "dịch vụ", "sản xuất", "xây dựng", "công nghệ", "giải pháp",
          "kỹ thuật", "đầu tư", "phát triển", "quốc tế", "việt nam", "vietnam", "trading", "solutions", "medical",
          "thiết bị y tế", "y tế", "thiết bị", "logistics", "thời trang", "nông sản sạch", "nông sản",
          "kiến trúc", "giáo dục", "anh ngữ", "phần mềm", "tư vấn", "du lịch", "khách sạn",
          "cơ khí chính xác", "cơ khí", "nhà máy", "thực phẩm xanh", "thực phẩm", "tiệm bánh ngọt", "bánh ngọt"
        ],
        free_email_domains: [
          "gmail.com", "yahoo.com", "yahoo.com.vn", "hotmail.com", "outlook.com", "icloud.com", "live.com"
        ],
        similarity_threshold: 0.72,
        allow_acronym_match: true
      },
      scoring_weights: {
        product_fit_max: 40,
        icp_size_industry_max: 20,
        need_clarity_urgency_max: 20,
        completeness_contact_max: 10,
        budget_alignment_max: 10,
        out_of_scope_cap_score: 22
      },
      routing_and_escalation: {
        neglected_threshold_days: 7,
        vip_budget_threshold_vnd: 250000000,
        workload_warning_pct: 80
      }
    },
    sampleLeads: [
      {
        lead_id: "LD-001",
        created_at: "2026-11-10 09:15",
        source: "Website",
        company_name: "Công ty TNHH Giải pháp Thương mại Thịnh Vượng",
        tax_id: "0317788990",
        contact_name: "Nguyễn Thị Lan",
        contact_role: "Trưởng phòng Hành chính Nhân sự",
        email: "lan.nt@thinhvuongtrading.vn",
        phone: "0908123456",
        region: "TP.HCM",
        industry: "Thương mại",
        company_size: 85,
        need_description: "Cần phần mềm chấm công GPS, tính lương và quản lý hồ sơ nhân sự cho 85 nhân viên.",
        budget_vnd: "",
        timeline: "Tháng 12/2026"
      },
      {
        lead_id: "LD-002",
        created_at: "2026-11-10 14:30",
        source: "Hội thảo",
        company_name: "Cty Thịnh Vượng",
        tax_id: "",
        contact_name: "Trần Quốc Hùng",
        contact_role: "Giám đốc",
        email: "hung.tq@thinhvuongtrading.vn",
        phone: "0903998877",
        region: "TP.HCM",
        industry: "Thương mại",
        company_size: 85,
        need_description: "Đăng ký tại booth Hội thảo Chuyển đổi số SME: cần đồng bộ phần mềm kế toán, hóa đơn điện tử và quản lý tồn kho 3 chi nhánh.",
        budget_vnd: 140000000,
        timeline: "Triển khai ngay trong tháng 11"
      },
      {
        lead_id: "LD-003",
        created_at: "2026-11-11 08:40",
        source: "Campaign",
        company_name: "TV Trading (Thinh Vuong)",
        tax_id: "",
        contact_name: "Lê Minh Thảo",
        contact_role: "Trưởng nhóm Kinh doanh",
        email: "thao.le@gmail.com",
        phone: "0903 998 877",
        region: "Hồ Chí Minh",
        industry: "Thương mại",
        company_size: "",
        need_description: "Quan tâm phần mềm CRM quản lý đội sale 15 người và theo dõi báo giá khách hàng.",
        budget_vnd: "",
        timeline: "Quý 4/2026"
      },
      {
        lead_id: "LD-004",
        created_at: "2026-11-10 10:05",
        source: "Website",
        company_name: "Tập đoàn Y tế Quốc tế Đông Phương",
        tax_id: "0105544332",
        contact_name: "BS. Hoàng Văn Minh",
        contact_role: "Giám đốc Công nghệ Y tế",
        email: "minh.hv@dongphuongmed.vn",
        phone: "0913556677",
        region: "Hà Nội",
        industry: "Y tế chuyên sâu",
        company_size: 950,
        need_description: "Tìm kiếm hệ thống HIS quản lý bệnh án điện tử bệnh viện 600 giường, tích hợp PACS/DICOM và máy xét nghiệm HL7.",
        budget_vnd: 1800000000,
        timeline: "Quý 1/2027"
      },
      {
        lead_id: "LD-005",
        created_at: "2026-11-10 11:20",
        source: "Campaign",
        company_name: "Nhà máy Cơ khí Chính xác Trường Sơn",
        tax_id: "3702211009",
        contact_name: "Phạm Văn Cường",
        contact_role: "Giám đốc Nhà máy",
        email: "cuong.pv@truongsoncnc.vn",
        phone: "0982112200",
        region: "Bình Dương",
        industry: "Sản xuất công nghiệp nặng",
        company_size: 1200,
        need_description: "Cần hệ thống MES kết nối PLC/SCADA điều khiển trực tiếp 120 máy CNC trên dây chuyền sản xuất và tích hợp SAP S/4HANA.",
        budget_vnd: 950000000,
        timeline: "Quý 1/2027"
      },
      {
        lead_id: "LD-006",
        created_at: "2026-11-10 15:45",
        source: "Campaign",
        company_name: "Cty TNHH Thời trang Mây Trắng",
        tax_id: "",
        contact_name: "Vũ Ngọc Diệp",
        contact_role: "Chủ doanh nghiệp",
        email: "maytrang.fashion@gmail.com",
        phone: "0977334455",
        region: "Hà Nội",
        industry: "Bán lẻ & F&B",
        company_size: "",
        need_description: "Shop có 3 chi nhánh muốn tìm phần mềm quản lý, tư vấn giúp.",
        budget_vnd: "",
        timeline: ""
      },
      {
        lead_id: "LD-007",
        created_at: "2026-11-11 09:10",
        source: "Hội thảo",
        company_name: "Cty CP DV Logistics Đông Á (DAL)",
        tax_id: "0108877665",
        contact_name: "Đỗ Mạnh Hải",
        contact_role: "Phó Giám đốc Vận hành",
        email: "hai.dm@donga-logistics.vn",
        phone: "0912445566",
        region: "Hà Nội",
        industry: "Kho vận & Logistics",
        company_size: 110,
        need_description: "Đã từng nhận báo giá sơ bộ tháng trước nhưng chưa thấy bạn nào liên hệ lại; tuần này cần chốt gấp phần mềm quản lý kho và công nợ vận tải.",
        budget_vnd: 95000000,
        timeline: "Triển khai gấp trong 2 tuần"
      },
      {
        lead_id: "LD-008",
        created_at: "2026-11-11 10:00",
        source: "Website",
        company_name: "Minh Tâm Tech (MT Solutions)",
        tax_id: "0319988776",
        contact_name: "Trịnh Bảo Long",
        contact_role: "Trưởng phòng Vận hành",
        email: "long.tb@minhtamtech.vn",
        phone: "0988776655",
        region: "Hà Nội",
        industry: "Công nghệ",
        company_size: 70,
        need_description: "Chi nhánh Hà Nội muốn demo phần mềm CRM và chấm công tính lương đồng bộ với trụ sở TP.HCM.",
        budget_vnd: 85000000,
        timeline: "Trong tháng 11/2026"
      },
      {
        lead_id: "LD-009",
        created_at: "2026-11-10 16:20",
        source: "Hội thảo",
        company_name: "An Phát Co.",
        tax_id: "",
        contact_name: "Nguyễn Văn Tùng",
        contact_role: "Phó Giám đốc",
        email: "tung.nv@anphat.vn",
        phone: "0903667788",
        region: "TP.HCM",
        industry: "Thương mại",
        company_size: 65,
        need_description: "Muốn xem thêm tính năng quản lý xuất nhập tồn theo lô và hóa đơn điện tử.",
        budget_vnd: 75000000,
        timeline: "Tháng 11/2026"
      },
      {
        lead_id: "LD-010",
        created_at: "2026-11-11 08:05",
        source: "Campaign",
        company_name: "Việt Food",
        tax_id: "",
        contact_name: "Chị Linh",
        contact_role: "",
        email: "linh.kt@vietfood.vn",
        phone: "0909887744",
        region: "",
        industry: "",
        company_size: "",
        need_description: "Gửi lại cho mình thông tin phần mềm kho nhé.",
        budget_vnd: "",
        timeline: ""
      },
      {
        lead_id: "LD-011",
        created_at: "2026-11-10 13:10",
        source: "Website",
        company_name: "Công ty CP Du lịch & Khách sạn Biển Xanh",
        tax_id: "0401122334",
        contact_name: "Phan Thị Thu Thủy",
        contact_role: "Kế toán trưởng",
        email: "thuy.ptt@bienxanhhotel.vn",
        phone: "0905112299",
        region: "Đà Nẵng",
        industry: "Bán lẻ & F&B",
        company_size: 95,
        need_description: "Cần thay thế phần mềm kế toán cũ, đồng bộ hóa đơn điện tử và chấm công tính lương ca kíp cho 95 nhân viên.",
        budget_vnd: 90000000,
        timeline: "01/12/2026"
      },
      {
        lead_id: "LD-012",
        created_at: "2026-11-10 17:00",
        source: "Hội thảo",
        company_name: "Công ty TNHH Nông sản Sạch Mekong",
        tax_id: "1801234567",
        contact_name: "Lâm Hữu Phước",
        contact_role: "Giám đốc Điều hành",
        email: "phuoc.lh@mekongagro.vn",
        phone: "0918223344",
        region: "Cần Thơ",
        industry: "Nông sản & Phân phối",
        company_size: 140,
        need_description: "Cần phần mềm quản lý tồn kho hạn sử dụng tại 4 kho miền Tây, quản lý đơn hàng đại lý và kế toán công nợ.",
        budget_vnd: 135000000,
        timeline: "Trong tháng 11/2026"
      },
      {
        lead_id: "LD-013",
        created_at: "2026-11-11 09:50",
        source: "Website",
        company_name: "Công ty TNHH Kiến trúc & Xây dựng Thành Công",
        tax_id: "0109988112",
        contact_name: "Nguyễn Đức Anh",
        contact_role: "Trưởng phòng Tài chính",
        email: "anh.nd@thanhcongcons.vn",
        phone: "0983445566",
        region: "Hà Nội",
        industry: "Xây dựng & Kỹ thuật",
        company_size: 45,
        need_description: "Tìm phần mềm kế toán theo dõi chi phí công trình, hóa đơn điện tử và công nợ nhà thầu phụ.",
        budget_vnd: "",
        timeline: "Quý 4/2026"
      },
      {
        lead_id: "LD-014",
        created_at: "2026-11-11 10:30",
        source: "Website",
        company_name: "Tiệm bánh ngọt Sunny",
        tax_id: "",
        contact_name: "Ngọc Hân",
        contact_role: "Chủ tiệm",
        email: "sunnybakery99@gmail.com",
        phone: "0934111222",
        region: "TP.HCM",
        industry: "Bán lẻ & F&B",
        company_size: 4,
        need_description: "Tiệm nhỏ 4 người bán online, hỏi xem bên mình có phần mềm miễn phí hoàn toàn hoặc gia công app đặt bánh riêng giá 5 triệu không.",
        budget_vnd: 5000000,
        timeline: "Chưa xác định"
      },
      {
        lead_id: "LD-015",
        created_at: "2026-11-11 11:15",
        source: "Hội thảo",
        company_name: "Công ty TNHH Giáo dục Anh ngữ Sao Mai",
        tax_id: "0316655443",
        contact_name: "Trần Mỹ Linh",
        contact_role: "Giám đốc Kinh doanh",
        email: "linh.tm@saomaiedu.vn",
        phone: "0907778899",
        region: "TP.HCM",
        industry: "Giáo dục & Tư vấn",
        company_size: 65,
        need_description: "Cần phần mềm CRM quản lý học viên tiềm năng, lịch tư vấn tuyển sinh và tính lương/KPI cho giáo viên & tư vấn viên.",
        budget_vnd: 85000000,
        timeline: "Triển khai trong 3 tuần tới"
      },
      {
        lead_id: "LD-016",
        created_at: "2026-11-10 14:10",
        source: "Website",
        company_name: "Công ty CP Thiết bị Y tế An Khang",
        tax_id: "0107766554",
        contact_name: "Lê Thu Trang",
        contact_role: "Kế toán trưởng",
        email: "trang.lt@ankhangmed.vn",
        phone: "0914556688",
        region: "Hà Nội",
        industry: "Dịch vụ B2B",
        company_size: 55,
        need_description: "Tìm phần mềm kế toán tổng hợp, hóa đơn điện tử và công nợ hợp đồng bệnh viện.",
        budget_vnd: 55000000,
        timeline: "Cuối tháng 11/2026"
      },
      {
        lead_id: "LD-017",
        created_at: "2026-11-11 11:45",
        source: "Hội thảo",
        company_name: "An Khang Medical",
        tax_id: "",
        contact_name: "Đặng Quang Vinh",
        contact_role: "Giám đốc Kinh doanh",
        email: "vinh.dq@ankhangmed.vn",
        phone: "0914 556 699",
        region: "Hà Nội",
        industry: "Dịch vụ B2B",
        company_size: 55,
        need_description: "Cần CRM theo dõi pipeline đấu thầu thiết bị y tế và lịch chăm sóc khách hàng B2B.",
        budget_vnd: 60000000,
        timeline: "Cuối tháng 11/2026"
      },
      {
        lead_id: "LD-018",
        created_at: "2026-11-11 13:05",
        source: "Campaign",
        company_name: "Công ty TNHH Giải pháp Phần mềm & Tư vấn Hướng Dương",
        tax_id: "",
        contact_name: "Hoàng Minh Tú",
        contact_role: "CEO",
        email: "tu.hm@huongduongconsult.vn",
        phone: "0938554433",
        region: "TP.HCM",
        industry: "Dịch vụ B2B",
        company_size: 32,
        need_description: "Công ty tư vấn 32 người muốn dùng thử CRM quản lý lead và báo giá, ngân sách khoảng 45 triệu/năm.",
        budget_vnd: 45000000,
        timeline: "Tuần sau demo"
      }
    ],
    sampleSalesReport50: (function () {
      var prods = [
        "Áo thun", "Sơ mi", "Quần tây", "Váy đầm", "Áo khoác",
        "Kế toán & Hóa đơn", "CRM Bán hàng", "Chấm công GPS", "Quản lý Kho", "ERP Tổng thể"
      ];
      var channels = ["Website", "Website", "Hội thảo", "Campaign", "Zalo OA"];
      var regions = ["Miền Bắc", "Miền Trung", "Miền Nam", "Hà Nội", "TP.HCM", "Đà Nẵng"];
      var list = [];
      for (var i = 1; i <= 50; i++) {
        var id = "DS-" + String(i).padStart(3, "0");
        var m = "2026-" + String(7 + (i % 5)).padStart(2, "0");
        var ch = channels[i % channels.length];
        var rg = regions[i % regions.length];
        var pr = prods[i % prods.length];
        var orders = 40 + (i * 7) % 110;
        var rev = (orders * (250000 + (i * 35000) % 300000));
        var cost = Math.round(rev * (0.45 + ((i % 10) * 0.02)));
        list.push({
          "MÃ DÒNG": id,
          "THÁNG": m,
          "KÊNH BÁN": ch,
          "KHU VỰC": rg,
          "SẢN PHẨM": pr,
          "SỐ ĐƠN": String(orders),
          "DOANH THU (VND)": String(rev),
          "CHI PHÍ GIÁ VỐN (VND)": String(cost)
        });
      }
      return list;
    })()
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
