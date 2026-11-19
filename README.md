# Nam Việt AI Lead Agent (AI301 — Đề dự án 02)

Hệ thống AI Agent **Sàng lọc và Điều phối Khách hàng Tiềm năng** cho **Công ty Phần mềm Nam Việt** (cung cấp phần mềm quản lý doanh nghiệp vừa và nhỏ SME).

## Tính năng chính
1. **Đầu vào đa dạng trực tiếp trên giao diện**:
   - Tải lên file **CSV** (hỗ trợ UTF-8 tiếng Việt, dấu `,` / `;` / `\t`).
   - Tải lên file **Excel (.xlsx)** (hỗ trợ nhiều sheet, đọc & xuất `.xlsx` trực tiếp không cần cài thư viện ngoài).
   - Nhập **Link Google Sheet** công khai hoặc dán nhanh bảng dữ liệu từ Google Sheets / Excel.
   - Nạp sẵn **18 hồ sơ mẫu chuẩn nghiệp vụ** hoặc mô phỏng **Batch 120 leads** kiểm thử tải ~700 leads/tuần.
   - **Smart Column Mapping**: Tự động ánh xạ cột tiếng Việt/Anh.
2. **Xử lý trọn vẹn theo Workflow Công ty Nam Việt**:
   - **Chuẩn hóa & Lọc trùng / Gom nhóm viết tắt, alias** (phát hiện trùng qua MST, Domain doanh nghiệp, SĐT, tên chuẩn hóa & viết tắt).
   - **Kiểm tra Chân dung mục tiêu (ICP) & Độ đầy đủ**:
     - Chặn triệt để bẫy **ngân sách lớn nhưng không đúng sản phẩm** (VD: 1.8 tỷ HIS bệnh viện, 950 triệu MES/PLC).
     - Không bỏ sót khách phù hợp nhưng thiếu thông tin — tự động rẽ nhánh **Tạo câu hỏi / Thông điệp tiếp cận (Draft)**.
   - **Chấm điểm ưu tiên (0–100) & Đề xuất 8 NVKD** theo Nhóm ngành + Khu vực + Sản phẩm thế mạnh + Cân bằng tải + Lịch sử liên hệ.
   - **Phát hiện Tranh chấp phân công & Cơ hội bỏ quên quá SLA (> 7 ngày)**: Chuyển qua luồng **Trưởng phòng Kinh doanh duyệt** trực tiếp trên giao diện và ghi Audit Log.
3. **Output trực tiếp trên giao diện & Xuất báo cáo**:
   - Sơ đồ Workflow tương tác kèm số lượng hồ sơ ở từng nhánh.
   - Bảng phân tích hiệu quả nguồn, nhu cầu sản phẩm, tải 8 NVKD và **Đề xuất Kinh doanh chiến lược**.
   - Xuất báo cáo đa sheet **Excel (.xlsx)**, **CSV**, và **JSON**.
   - Hỗ trợ chạy **Offline 100% (Hybrid AI + Rule Engine)** hoặc kết nối **Live Gemini / OpenAI API Key**.

## Hướng dẫn sử dụng nhanh
1. Mở trực tiếp file [index.html](file:///Users/uyen/AI301_Agent/index.html) bằng trình duyệt (Chrome, Safari, Edge).
2. Tại tab **1. Nhập dữ liệu**: kéo thả file `.csv` / `.xlsx` (có thể tải file mẫu ở nút **Tải XLSX mẫu / CSV mẫu** hoặc dùng file [samples/NamViet_Sample_Leads.csv](file:///Users/uyen/AI301_Agent/samples/NamViet_Sample_Leads.csv)), dán link Google Sheet, hoặc dùng dữ liệu mẫu sẵn có.
3. Bấm **Chạy AI Agent Sàng lọc & Điều phối** để xem kết quả phân tích, duyệt phân công và xuất báo cáo tại tab **2. Kết quả Phân tích & Đề xuất Kinh doanh**.

## Cấu trúc thư mục
- [index.html](file:///Users/uyen/AI301_Agent/index.html), [styles.css](file:///Users/uyen/AI301_Agent/styles.css), [app.js](file:///Users/uyen/AI301_Agent/app.js): Giao diện Web Dashboard đầy đủ.
- [run_agent.js](file:///Users/uyen/AI301_Agent/run_agent.js): Script chạy AI Agent trực tiếp trên dữ liệu JSON/CSV qua dòng lệnh (`jsc run_agent.js`).
- [src/spreadsheet_io.js](file:///Users/uyen/AI301_Agent/src/spreadsheet_io.js): Bộ đọc/ghi CSV, XLSX (pure-JS ZIP + DEFLATE + OOXML), Google Sheets URL fetcher & Smart Column Mapper.
- [src/agent_engine.js](file:///Users/uyen/AI301_Agent/src/agent_engine.js): Lõi AI Agent Pipeline (Lọc trùng, ICP & Completeness, Chấm điểm, Điều phối 8 NVKD, SLA/Tranh chấp, Tạo Draft & Đề xuất Kinh doanh, Live LLM connector).
- [data/](file:///Users/uyen/AI301_Agent/data): 5 bộ dữ liệu tham chiếu (Nhóm sản phẩm, 8 NVKD, Lịch sử liên hệ, Quy tắc sàng lọc, Hồ sơ mẫu).
- [tests/test_agent_engine.js](file:///Users/uyen/AI301_Agent/tests/test_agent_engine.js): Bộ kiểm thử tự động toàn bộ logic.
- [docs/ARCHITECTURE.md](file:///Users/uyen/AI301_Agent/docs/ARCHITECTURE.md): Tài liệu thiết kế kiến trúc hệ thống.

