import React from "react";
import {
  Box,
  Card,
  Typography,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from "@mui/material";

export default function TeacherStatsView({
  selectedUsername,
  statsData = [],
  teacherAllowedSubjects = [],
  teacherAllowedClasses = [],
  loadingStats,
  academicYear,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Hàm hiển thị tên môn học: Chỉ rút gọn trên điện thoại, máy tính giữ nguyên
  const getDisplaySubjectName = (name) => {
    if (!name) return "";
    const trimmed = name.trim();
    
    // Nếu không phải mobile (tức là máy tính/tablet lớn), giữ nguyên tên gốc
    if (!isMobile) return trimmed;

    const lower = trimmed.toLowerCase();
    if (lower.includes("hoạt động trải nghiệm") || lower.includes("hoạt dộng trải nghiệm")) {
      return "HĐTN";
    }
    if (lower.includes("tự nhiên và xã hội")) {
      return "TN-XN";
    }
    if (lower.includes("giáo dục thể chất")) {
      return "GDTC";
    }
    if (lower.includes("lịch sử") || lower.includes("địa lí") || lower.includes("địa lý")) {
      return "LS-ĐL";
    }
    return trimmed;
  };

  // Lọc chỉ lấy các lớp hợp lệ (loại bỏ chữ "username" nếu có)
  const allowedClassesFiltered = (teacherAllowedClasses || []).filter(
    (c) => !String(c).toLowerCase().includes("username")
  );

  let dynamicColumns = allowedClassesFiltered;

  if (dynamicColumns.length === 0 && statsData.length > 0) {
    const keysSet = new Set();
    statsData.forEach((row) => {
      Object.keys(row).forEach((key) => {
        if (key !== "subject" && key !== "total" && key !== "id") {
          keysSet.add(key);
        }
      });
    });
    dynamicColumns = Array.from(keysSet);
  }

  // Hàm tính tổng số bài theo dòng môn học
  const getRowTotal = (row) => {
    let total = 0;
    dynamicColumns.forEach((col) => {
      total += Number(row[col] || 0);
    });
    return total;
  };

  // Lọc bỏ các môn học có tổng số bài nộp bằng 0
  const filteredStatsData = statsData.filter((row) => getRowTotal(row) > 0);

  // Tính tổng toàn bộ bài nộp của giáo viên (từ danh sách đã lọc)
  const grandTotal = filteredStatsData.reduce((sum, row) => sum + getRowTotal(row), 0);

  return (
    <Box sx={{ p: 2.5, overflowY: "auto", flex: 1, bgcolor: "#fafafa" }}>
      {/* Banner Tiêu đề & Thẻ chỉ số thu gọn */}
      <Card
        sx={{
          p: 2,
          mb: 2,
          background: "linear-gradient(135deg, #f0f7ff 0%, #e1effe 100%)",
          color: "#1e293b",
          borderRadius: 2.5,
          border: "1px solid #cbd5e1",
          boxShadow: "0 4px 12px rgba(15, 23, 42, 0.05)",
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1.5 }}>
          <Typography 
            variant="subtitle1" 
            fontWeight="bold" 
            sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: "1rem", m: 0, color: "#1e293b" }}
          >
            <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
              👤 Tổng hợp cá nhân:
            </Box>
            <Box component="span" sx={{ color: "#1976d2", fontWeight: 700 }}>{selectedUsername || "Chưa chọn giáo viên"}</Box>
          </Typography>

          {/* Cụm 3 thẻ thống kê trên cùng một dòng trên điện thoại */}
          <Box sx={{ display: "flex", gap: 0.8, flexWrap: "nowrap", width: { xs: "100%", sm: "auto" } }}>
            {/* Thẻ Tổng */}
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5, px: 1, py: 0.6, borderRadius: 2, bgcolor: "rgba(255, 255, 255, 0.8)", border: "1px solid #cbd5e1", flex: 1, minWidth: 0 }}>
              <span>📦</span>
              <Typography variant="body2" sx={{ color: "#475569", fontSize: { xs: "0.75rem", sm: "0.875rem" }, whiteSpace: "nowrap" }}>Tổng:</Typography>
              <Typography variant="body1" fontWeight="bold" sx={{ color: "#1976d2", fontSize: { xs: "0.85rem", sm: "1rem" }, whiteSpace: "nowrap" }}>
                {grandTotal}
              </Typography>
            </Box>

            {/* Thẻ Môn */}
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5, px: 1, py: 0.6, borderRadius: 2, bgcolor: "rgba(255, 255, 255, 0.8)", border: "1px solid #cbd5e1", flex: 1, minWidth: 0 }}>
              <span>📚</span>
              <Typography variant="body2" sx={{ color: "#475569", fontSize: { xs: "0.75rem", sm: "0.875rem" }, whiteSpace: "nowrap" }}>Môn:</Typography>
              <Typography variant="body1" fontWeight="bold" sx={{ color: "#4f46e5", fontSize: { xs: "0.85rem", sm: "1rem" }, whiteSpace: "nowrap" }}>
                {filteredStatsData.length}
              </Typography>
            </Box>

            {/* Thẻ Lớp */}
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5, px: 1, py: 0.6, borderRadius: 2, bgcolor: "rgba(255, 255, 255, 0.8)", border: "1px solid #cbd5e1", flex: 1, minWidth: 0, overflow: "hidden" }}>
              <span>🏫</span>
              <Typography variant="body2" sx={{ color: "#475569", fontSize: { xs: "0.75rem", sm: "0.875rem" }, whiteSpace: "nowrap" }}>Lớp:</Typography>
              <Typography variant="body1" fontWeight="bold" sx={{ color: "#16a34a", fontSize: { xs: "0.85rem", sm: "1rem" }, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {dynamicColumns.join(", ") || "Không có"}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Card>

      {loadingStats ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Card sx={{ p: 2.5, borderRadius: 2.5, boxShadow: 1, bgcolor: "white" }}>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2, color: "#1e293b", fontSize: "1rem" }}>
            📊 Chi tiết bài nộp
          </Typography>
          
          {filteredStatsData.length === 0 ? (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <Typography color="text.secondary">Chưa có dữ liệu bài nộp nào được ghi nhận cho giáo viên này trong năm học {academicYear}.</Typography>
            </Box>
          ) : (
            <Box sx={{ overflowX: "auto" }}>
              <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", textAlign: "center" }}>
                <thead>
                  <Box component="tr" sx={{ bgcolor: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                    <Box 
                      component="th" 
                      sx={{ 
                        p: { xs: 1, sm: 1.8 }, 
                        textAlign: "left", 
                        color: "#475569", 
                        fontWeight: 700, 
                        fontSize: "0.95rem",
                        whiteSpace: "nowrap" // Co lại vừa khít nội dung chữ
                      }}
                    >
                      Môn học
                    </Box>
                    {dynamicColumns.map((col) => (
                      <Box 
                        component="th" 
                        key={col} 
                        sx={{ 
                          p: { xs: 0.5, sm: 1.8 }, 
                          color: "#475569", 
                          fontWeight: 700, 
                          fontSize: "0.95rem", 
                          width: { xs: "38px", sm: "50px" }, 
                          minWidth: { xs: "38px", sm: "50px" }, 
                          whiteSpace: "nowrap" 
                        }}
                      >
                        {dynamicColumns.length === 1 ? "Số bài nộp" : (String(col).toLowerCase().includes("khối") ? col : `Lớp ${col}`)}
                      </Box>
                    ))}
                    <Box component="th" sx={{ p: { xs: 1, sm: 1.8 }, color: "#dc2626", fontWeight: 700, fontSize: "0.95rem", width: "14%", whiteSpace: "nowrap" }}>
                      Tổng
                    </Box>
                  </Box>
                </thead>
                <tbody>
                  {filteredStatsData.map((row, idx) => {
                    const rowTotal = getRowTotal(row);
                    return (
                      <Box 
                        component="tr" 
                        key={idx} 
                        sx={{ 
                          borderBottom: "1px solid #f1f5f9", 
                          transition: "0.15s ease",
                          "&:hover": { bgcolor: "#f8fafc" } 
                        }}
                      >
                        {/* Cột Tên môn học: Tự động co giãn theo nội dung ngắn gọn */}
                        <Box 
                          component="td" 
                          sx={{ 
                            p: { xs: 1, sm: 1.8 }, 
                            textAlign: "left", 
                            fontWeight: "700", 
                            color: "#1e293b", 
                            fontSize: "0.95rem",
                            whiteSpace: "nowrap" // Tránh ngắt dòng để cột tự động ôm sát chữ
                          }}
                        >
                          📖 {getDisplaySubjectName(row.subject)}
                        </Box>

                        {/* Các cột Lớp động */}
                        {dynamicColumns.map((col) => {
                          const count = row[col] || 0;
                          return (
                            <Box 
                              component="td" 
                              key={col} 
                              sx={{ 
                                p: { xs: 0.5, sm: 1.8 }, 
                                color: count > 0 ? "#15803d" : "#94a3b8", 
                                fontWeight: count > 0 ? "800" : "500",
                                fontSize: "1rem",
                                textAlign: "center"
                              }}
                            >
                              {count > 0 ? count : "—"}
                            </Box>
                          );
                        })}

                        {/* Cột Tổng số bài */}
                        <Box 
                          component="td" 
                          sx={{ 
                            p: { xs: 1, sm: 1.8 }, 
                            fontWeight: "800", 
                            color: "#dc2626", 
                            bgcolor: "#eff6ff", 
                            fontSize: "1rem",
                            textAlign: "center"
                          }}
                        >
                          {rowTotal}
                        </Box>
                      </Box>
                    );
                  })}
                </tbody>
              </Box>
            </Box>
          )}
        </Card>
      )}
    </Box>
  );
}