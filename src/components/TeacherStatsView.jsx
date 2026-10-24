import React from "react";
import {
  Box,
  Card,
  Typography,
  CircularProgress,
} from "@mui/material";

export default function TeacherStatsView({
  selectedUsername,
  statsData = [],
  teacherAllowedSubjects = [],
  teacherAllowedClasses = [],
  loadingStats,
  academicYear,
}) {
  // Lọc chỉ lấy các lớp hợp lệ (loại bỏ chữ "username" nếu có)
  const allowedClassesFiltered = (teacherAllowedClasses || []).filter(
    (c) => !String(c).toLowerCase().includes("username")
  );

  // Xác định các cột lớp hiển thị (dynamicColumns):
  // Ưu tiên lấy các lớp từ allowedClassesFiltered của giáo viên. 
  // Nếu statsData có các cột khác mà giáo viên đó có nộp bài, ta có thể gộp thêm hoặc chỉ bám sát vào danh sách lớp được phân công.
  // Ở đây chúng ta lọc trực tiếp từ allowedClassesFiltered để chỉ hiện đúng lớp giáo viên dạy.
  let dynamicColumns = allowedClassesFiltered;

  // Phòng hờ nếu allowedClassesFiltered trống nhưng statsData có sẵn các keys lớp học
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

  // Tính tổng toàn bộ bài nộp của giáo viên
  const grandTotal = statsData.reduce((sum, row) => sum + getRowTotal(row), 0);

  return (
    <Box sx={{ p: 2.5, overflowY: "auto", flex: 1, bgcolor: "#fafafa" }}>
      {/* Banner Tiêu đề & Thẻ chỉ số thu gọn */}
      <Card
        sx={{
          p: 1.5,
          mb: 2,
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
          color: "white",
          borderRadius: 2,
          boxShadow: "0 4px 12px rgba(15, 23, 42, 0.15)",
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1.5 }}>
          {/* Tên giáo viên */}
          <Typography 
            variant="subtitle1" 
            fontWeight="bold" 
            sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: "1rem", m: 0 }}
          >
            <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
              👤 Tổng hợp cá nhân:
            </Box>
            <Box component="span" sx={{ color: "#38bdf8" }}>{selectedUsername || "Chưa chọn giáo viên"}</Box>
          </Typography>

          {/* Các chỉ số nằm gọn bên phải */}
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, px: 1.5, py: 0.5, borderRadius: 1.5, bgcolor: "rgba(255, 255, 255, 0.06)", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
              <span>📦</span>
              <Typography variant="body2" sx={{ color: "#94a3b8" }}>Tổng:</Typography>
              <Typography variant="body1" fontWeight="bold" sx={{ color: "#38bdf8" }}>
                {grandTotal}
              </Typography>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, px: 1.5, py: 0.5, borderRadius: 1.5, bgcolor: "rgba(255, 255, 255, 0.06)", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
              <span>📚</span>
              <Typography variant="body2" sx={{ color: "#94a3b8" }}>Môn:</Typography>
              <Typography variant="body1" fontWeight="bold" sx={{ color: "#818cf8" }}>
                {statsData.length > 0 ? statsData.length : teacherAllowedSubjects.length}
              </Typography>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, px: 1.5, py: 0.5, borderRadius: 1.5, bgcolor: "rgba(255, 255, 255, 0.06)", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
              <span>🏫</span>
              <Typography variant="body2" sx={{ color: "#94a3b8" }}>Lớp:</Typography>
              <Typography variant="body1" fontWeight="bold" sx={{ color: "#4ade80" }}>
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
          
          {statsData.length === 0 ? (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <Typography color="text.secondary">Chưa có dữ liệu thống kê kế hoạch bài dạy cho giáo viên này trong năm học {academicYear}.</Typography>
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
                        minWidth: { xs: "140px", sm: "180px" },
                        whiteSpace: "nowrap"
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
                  {statsData.map((row, idx) => {
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
                        {/* Cột Tên môn học */}
                        <Box 
                          component="td" 
                          sx={{ 
                            p: { xs: 1, sm: 1.8 }, 
                            textAlign: "left", 
                            fontWeight: "700", 
                            color: "#1e293b", 
                            fontSize: "0.95rem",
                            maxWidth: "280px",
                            whiteSpace: "normal",
                            wordBreak: "break-word"
                          }}
                        >
                          📖 {row.subject}
                        </Box>

                        {/* Các cột Lớp động (chỉ hiện đúng các lớp được phân công) */}
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