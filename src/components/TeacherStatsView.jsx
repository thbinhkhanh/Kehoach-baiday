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
  title,
  selectedUsername,
  statsData = [],
  teacherAllowedSubjects = [],
  teacherAllowedClasses = [],
  loadingStats,
  academicYear,
  activeTeacher,
  activeTab,    
  className,
  teacherRole
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Hàm hiển thị tên môn học: Chỉ rút gọn trên điện thoại, máy tính giữ nguyên
  const getDisplaySubjectName = (name) => {
    if (!name) return "";
    const trimmed = name.trim();
    
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

  // 🌟 Lọc các lớp hợp lệ và tự động quy đổi lớp chi tiết (vd: "4.3" -> "4") để khớp với dữ liệu lưu theo khối
  const allowedClassesFiltered = (teacherAllowedClasses || []).filter(
    (c) => !String(c).toLowerCase().includes("username")
  );

  // Thu thập thêm các khóa cột thực tế đang tồn tại bên trong statsData từ Firestore
  const statsKeysSet = new Set();
  statsData.forEach((row) => {
    Object.keys(row).forEach((key) => {
      if (key !== "subject" && key !== "total" && key !== "id" && key !== "username") {
        statsKeysSet.add(String(key));
      }
    });
  });

  // Chuẩn hóa danh sách lớp phân công về dạng số Khối (vd: "4.3" -> "4")
  const normalizedAllowedGrades = allowedClassesFiltered.map((c) => {
    const trimmed = String(c).trim();
    return trimmed.split(".")[0].replace(/[^0-9]/g, "") || trimmed;
  });

  // Kết hợp cả hai nguồn, loại bỏ trùng lặp và SẮP XẾP theo thứ tự tăng dần (3, 4, 5...)
  // 🌟 CHỈ LẤY CÁC CỘT KHỐI/LỚP CÓ ÍT NHẤT 1 BÀI NỘP TRÊN TOÀN BỘ DỮ LIỆU
  const activeColumnsSet = new Set();
  statsData.forEach((row) => {
    Object.keys(row).forEach((key) => {
      if (key !== "subject" && key !== "total" && key !== "id" && key !== "username") {
        const count = Number(row[key] || 0);
        if (count > 0) {
          activeColumnsSet.add(String(key));
        }
      }
    });
  });

  // Chuyển thành mảng và sắp xếp thứ tự tăng dần (VD: 3, 4...)
  let dynamicColumns = Array.from(activeColumnsSet).sort((a, b) => {
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return String(a).localeCompare(String(b));
  });

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
    <Box 
      sx={{ 
        p: { xs: 1, sm: 3 }, 
        overflowY: "auto", 
        flex: 1, 
        bgcolor: "#f8fafc", // Đổi màu nền nhẹ một chút để khung trắng nổi bật hơn khi căn giữa
        display: "flex", 
        flexDirection: "column", 
        alignItems: "center", // 🌟 Căn giữa các thành phần con theo chiều ngang
        width: "100%",
        boxSizing: "border-box"
      }}
    >
      {/* 🌟 Thêm thẻ bọc ngoài (Container) giới hạn chiều rộng để nội dung tập trung ở giữa màn hình */}
      <Box sx={{ width: "100%", maxWidth: "900px", display: "flex", flexDirection: "column", gap: 2 }}>
        
        {/* Banner Tiêu đề & Thẻ chỉ số thu gọn */}
        <Card
          sx={{
            p: 2,
            background: "linear-gradient(135deg, #f0f7ff 0%, #e1effe 100%)",
            color: "#1e293b",
            borderRadius: 2.5,
            border: "1px solid #cbd5e1",
            boxShadow: "none",
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1.5 }}>
            {/* Tiêu đề linh hoạt: Tách phần tên/nhóm để tô màu xanh */}
            <Typography 
              variant="h6" 
              sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1, fontSize: "16px", color: "#1e293b", m: 0 }}
            >
              <Box 
                component="span" 
                sx={{ display: { xs: "none", sm: "inline" } }}
              >
                👤
              </Box>
              {(() => {
                if (title) {
                  const parts = title.split(":");
                  if (parts.length >= 2) {
                    const label = parts[0] + ":";
                    const value = parts.slice(1).join(":").trim().toUpperCase();
                    return (
                      <>
                        <span>{label}</span>
                        <Box component="span" sx={{ color: "#1976d2", fontWeight: 700, ml: 0.5 }}>
                          {value}
                        </Box>
                      </>
                    );
                  }
                  return title.toUpperCase();
                }

                const currentTeacher = (activeTeacher || selectedUsername || "").trim();
                if (currentTeacher) {
                  return (
                    <>
                      <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
                        Tổng hợp:
                      </Box>
                      <Box component="span" sx={{ color: "#1976d2", fontWeight: 700, ml: { xs: 0, sm: 0.5 } }}>
                        {currentTeacher.toUpperCase()}
                      </Box>
                    </>
                  );
                }

                return (
                  <>
                    <span>Tổng hợp:</span>
                    <Box component="span" sx={{ color: "#1976d2", fontWeight: 700, ml: 0.5 }}>
                      {(() => {
                        const targetCheck = String(className || teacherRole || "").toUpperCase();
                        if (targetCheck.includes("TIẾNG ANH") || targetCheck === "TA") return "TỔ TIẾNG ANH";
                        if (targetCheck.includes("BỘ MÔN") || targetCheck === "BM") return "TỔ BỘ MÔN";
                        
                        const gradeNum = targetCheck.split(".")[0].replace(/[^0-9]/g, "");
                        if (["1", "2", "3", "4", "5"].includes(gradeNum)) {
                          return `KHỐI ${gradeNum}`;
                        }

                        const roleUpper = (teacherRole || "").toUpperCase();
                        if (roleUpper === "TA") return "TỔ TIẾNG ANH";
                        if (roleUpper === "BM") return "TỔ BỘ MÔN";
                        
                        return `KHỐI ${gradeNum || "4"}`;
                      })()}
                    </Box>
                  </>
                );
              })()}
            </Typography>

            {/* Cụm 3 thẻ thống kê trên cùng một dòng trên điện thoại */}
            <Box sx={{ display: "flex", gap: 0.8, flexWrap: "nowrap", width: { xs: "100%", sm: "auto" } }}>
              {/* Thẻ Tổng */}
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5, px: 1, py: 0.6, borderRadius: 2, bgcolor: "rgba(255, 255, 255, 0.9)", border: "1px solid #cbd5e1", flex: 1, minWidth: 0 }}>
                <span>📦</span>
                <Typography variant="body2" sx={{ color: "#475569", fontSize: { xs: "0.75rem", sm: "0.875rem" }, whiteSpace: "nowrap" }}>Tổng:</Typography>
                <Typography variant="body1" fontWeight="bold" sx={{ color: "#1976d2", fontSize: { xs: "0.85rem", sm: "1rem" }, whiteSpace: "nowrap" }}>
                  {grandTotal}
                </Typography>
              </Box>

              {/* Thẻ Môn */}
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5, px: 1, py: 0.6, borderRadius: 2, bgcolor: "rgba(255, 255, 255, 0.9)", border: "1px solid #cbd5e1", flex: 1, minWidth: 0 }}>
                <span>📚</span>
                <Typography variant="body2" sx={{ color: "#475569", fontSize: { xs: "0.75rem", sm: "0.875rem" }, whiteSpace: "nowrap" }}>Môn:</Typography>
                <Typography variant="body1" fontWeight="bold" sx={{ color: "#4f46e5", fontSize: { xs: "0.85rem", sm: "1rem" }, whiteSpace: "nowrap" }}>
                  {filteredStatsData.length}
                </Typography>
              </Box>

              {/* Thẻ Lớp/Khối */}
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5, px: 1, py: 0.6, borderRadius: 2, bgcolor: "rgba(255, 255, 255, 0.9)", border: "1px solid #cbd5e1", flex: 1, minWidth: 0, overflow: "hidden" }}>
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
          <Card sx={{ p: 2, borderRadius: 2.5, boxShadow: "none", border: "1px solid #e2e8f0", bgcolor: "white" }}>
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
                          {dynamicColumns.length === 1 ? "Số bài nộp" : (String(col).toLowerCase().includes("khối") || String(col).length === 1 ? `Khối ${col}` : `Lớp ${col}`)}
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
                          <Box 
                            component="td" 
                            sx={{ 
                              p: { xs: 1, sm: 1.8 }, 
                              textAlign: "left", 
                              fontWeight: "700", 
                              color: "#1e293b", 
                              fontSize: "0.95rem",
                              whiteSpace: "nowrap"
                            }}
                          >
                            📖 {getDisplaySubjectName(row.subject)}
                          </Box>

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
    </Box>
  );
}