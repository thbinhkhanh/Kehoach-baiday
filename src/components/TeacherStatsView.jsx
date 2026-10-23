import React from "react";
import { Box, Card, Typography, CircularProgress } from "@mui/material";

export default function TeacherStatsView({
  selectedUsername,
  statsData = [],
  teacherAllowedSubjects = [],
  teacherAllowedClasses = [],
  loadingStats,
  academicYear,
}) {
  // 🌟 Tự động quét và loại bỏ các key lỗi (như chứa chữ "username" hoặc không hợp lệ)
  const columnKeysSet = new Set();
  statsData.forEach((row) => {
    Object.keys(row).forEach((key) => {
      const lowerKey = String(key).toLowerCase();
      if (
        key !== "subject" &&
        key !== "total" &&
        key !== "id" &&
        !lowerKey.includes("username") &&
        !lowerKey.includes("giao_vien")
      ) {
        columnKeysSet.add(key);
      }
    });
  });

  // Nếu statsData chưa có key, fallback về teacherAllowedClasses hoặc mặc định 1-5
  if (columnKeysSet.size === 0) {
    teacherAllowedClasses.forEach((c) => {
      if (c && !String(c).toLowerCase().includes("username")) {
        columnKeysSet.add(c);
      }
    });
  }
  if (columnKeysSet.size === 0) {
    ["1", "2", "3", "4", "5"].forEach((c) => columnKeysSet.add(c));
  }

  // Sắp xếp thứ tự các cột hiển thị
  const dynamicColumns = Array.from(columnKeysSet).sort((a, b) =>
    String(a).localeCompare(String(b), "vi", { numeric: true })
  );

  // Tính tổng số bài nộp của một hàng
  const getRowTotal = (row) => {
    return dynamicColumns.reduce((sum, col) => {
      const val = row[col] || 0;
      return sum + (typeof val === "number" ? val : Number(val) || 0);
    }, 0);
  };

  // Tổng toàn bộ bài nộp
  const grandTotal = statsData.reduce((acc, row) => acc + getRowTotal(row), 0);

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
            👤 Thống kê cá nhân: <Box component="span" sx={{ color: "#38bdf8" }}>{selectedUsername || "Chưa chọn giáo viên"}</Box>
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
                {teacherAllowedClasses.filter(c => !String(c).toLowerCase().includes("username")).join(", ") || dynamicColumns.join(", ") || "Không có"}
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
            📊 Chi tiết bài nộp theo môn và khối/lớp
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
                    <Box component="th" sx={{ p: 1.8, textAlign: "left", color: "#475569", fontWeight: 700, fontSize: "0.95rem" }}>
                      Môn học
                    </Box>
                    {dynamicColumns.map((col) => (
                      <Box component="th" key={col} sx={{ p: 1.8, color: "#475569", fontWeight: 700, fontSize: "0.95rem", minWidth: "120px" }}>
                        {dynamicColumns.length === 1 ? "Số bài nộp" : (String(col).toLowerCase().includes("khối") ? col : `Lớp ${col}`)}
                      </Box>
                    ))}
                    <Box component="th" sx={{ p: 1.8, color: "#dc2626", fontWeight: 700, fontSize: "0.95rem", width: "14%" }}>
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
                            p: 1.8, 
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

                        {/* Các cột Lớp động */}
                        {dynamicColumns.map((col) => {
                          const count = row[col] || 0;
                          return (
                            <Box 
                              component="td" 
                              key={col} 
                              sx={{ 
                                p: 1.8, 
                                color: count > 0 ? "#15803d" : "#94a3b8", 
                                fontWeight: count > 0 ? "800" : "500",
                                fontSize: "1rem"
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
                            p: 1.8, 
                            fontWeight: "800", 
                            color: "#dc2626", 
                            bgcolor: "#eff6ff", 
                            fontSize: "1rem" 
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