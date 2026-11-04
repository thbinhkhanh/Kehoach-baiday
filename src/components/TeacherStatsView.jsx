import React from "react";
import {
  Box,
  Card,
  Typography,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from "@mui/material";
// Import đầy đủ các biểu tượng MUI
import CalculateIcon from '@mui/icons-material/Calculate'; // Toán
import PublicIcon from '@mui/icons-material/Public'; // Lịch sử và Địa lí
import DevicesIcon from '@mui/icons-material/Devices'; // Công nghệ
import ScienceIcon from '@mui/icons-material/Science'; // Khoa học
import EmojiPeopleIcon from '@mui/icons-material/EmojiPeople'; // Hoạt động trải nghiệm
import MenuBookIcon from '@mui/icons-material/MenuBook'; // Tiếng Việt
import LanguageIcon from '@mui/icons-material/Language'; // Tiếng Anh
import FavoriteIcon from '@mui/icons-material/Favorite'; // Đạo đức
import NatureIcon from '@mui/icons-material/Nature'; // Tự nhiên và Xã hội
import MusicNoteIcon from '@mui/icons-material/MusicNote'; // Âm nhạc
import PaletteIcon from '@mui/icons-material/Palette'; // Mỹ thuật
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'; // Giáo dục thể chất
import ComputerIcon from '@mui/icons-material/Computer'; // Tin học
import SchoolIcon from '@mui/icons-material/School'; // Mặc định chung
import DescriptionIcon from '@mui/icons-material/Description'; // Biên bản / Tài liệu văn bản
import AssignmentIcon from '@mui/icons-material/Assignment'; // Đề kiểm tra / Bài tập

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
      return "TN-XH";
    }
    if (lower.includes("giáo dục thể chất")) {
      return "GDTC";
    }
    if (lower.includes("lịch sử") || lower.includes("địa lí") || lower.includes("địa lý")) {
      return "LS-ĐL";
    }
    return trimmed;
  };

  // Hàm ánh xạ biểu tượng kèm nền màu riêng (Hỗ trợ môn học, biên bản và đề kiểm tra)
  const getSubjectIconAndColor = (subjectName) => {
    const lower = (subjectName || "").toLowerCase();

    // 🌟 Nhóm Biên bản / Văn bản hành chính
    if (lower.includes("biên bản") || lower.includes("sinh hoạt chuyên môn")) {
      return { icon: <DescriptionIcon sx={{ fontSize: 24, color: '#0284c7' }} />, color: '#e0f2fe' };
    }

    // 🌟 Nhóm Đề kiểm tra / Khảo sát
    if (lower.includes("đề") || lower.includes("kiểm tra") || lower.includes("ktđk")) {
      return { icon: <AssignmentIcon sx={{ fontSize: 24, color: '#d97706' }} />, color: '#fef3c7' };
    }

    // Các môn học tiểu học thông thường
    if (lower.includes("toán")) {
      return { icon: <CalculateIcon sx={{ fontSize: 24, color: '#1976d2' }} />, color: '#e3f2fd' };
    }
    if (lower.includes("tiếng việt")) {
      return { icon: <MenuBookIcon sx={{ fontSize: 24, color: '#0288d1' }} />, color: '#e0f7fa' };
    }
    if (lower.includes("tiếng anh")) {
      return { icon: <LanguageIcon sx={{ fontSize: 24, color: '#0284c7' }} />, color: '#e0f2fe' };
    }
    if (lower.includes("đạo đức")) {
      return { icon: <FavoriteIcon sx={{ fontSize: 24, color: '#e11d48' }} />, color: '#ffe4e6' };
    }
    if (lower.includes("tự nhiên và xã hội") || lower.includes("tự nhiên xã hội")) {
      return { icon: <NatureIcon sx={{ fontSize: 24, color: '#16a34a' }} />, color: '#dcfce7' };
    }
    if (lower.includes("khoa học")) {
      return { icon: <ScienceIcon sx={{ fontSize: 24, color: '#9333ea' }} />, color: '#f3e8ff' };
    }
    if (lower.includes("lịch sử") || lower.includes("địa lí") || lower.includes("địa lý") || lower.includes("lịch sử và địa lí")) {
      return { icon: <PublicIcon sx={{ fontSize: 24, color: '#15803d' }} />, color: '#f0fdf4' };
    }
    if (lower.includes("tin học")) {
      return { icon: <ComputerIcon sx={{ fontSize: 24, color: '#4f46e5' }} />, color: '#eef2ff' };
    }
    if (lower.includes("công nghệ")) {
      return { icon: <DevicesIcon sx={{ fontSize: 24, color: '#ea580c' }} />, color: '#ffedd5' };
    }
    if (lower.includes("giáo dục thể chất") || lower.includes("thể chất")) {
      return { icon: <FitnessCenterIcon sx={{ fontSize: 24, color: '#0d9488' }} />, color: '#ccfbf1' };
    }
    if (lower.includes("âm nhạc")) {
      return { icon: <MusicNoteIcon sx={{ fontSize: 24, color: '#db2777' }} />, color: '#fce7f3' };
    }
    if (lower.includes("mỹ thuật")) {
      return { icon: <PaletteIcon sx={{ fontSize: 24, color: '#ca8a04' }} />, color: '#fef9c3' };
    }
    if (lower.includes("hoạt động trải nghiệm") || lower.includes("hđtn")) {
      return { icon: <EmojiPeopleIcon sx={{ fontSize: 24, color: '#dc2626' }} />, color: '#fee2e2' };
    }

    return { icon: <SchoolIcon sx={{ fontSize: 24, color: '#475569' }} />, color: '#f1f5f9' };
  };

  // Thu thập tất cả các cột có dữ liệu thực tế từ statsData
  const activeColumnsSet = new Set();
  statsData.forEach((row) => {
    Object.keys(row).forEach((key) => {
      const lowerKey = String(key).toLowerCase();
      if (
        lowerKey !== "subject" &&
        lowerKey !== "total" &&
        lowerKey !== "id" &&
        lowerKey !== "username" &&
        lowerKey !== "key"
      ) {
        const count = Number(row[key] || 0);
        if (count > 0 || row[key] !== undefined) {
          activeColumnsSet.add(String(key).trim());
        }
      }
    });
  });

  let dynamicColumns = Array.from(activeColumnsSet).sort((a, b) => {
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return String(a).localeCompare(String(b));
  });

  const allowedClassesFiltered = (teacherAllowedClasses || []).filter(
    (c) => !String(c).toLowerCase().includes("username")
  );
  if (allowedClassesFiltered.length > 0 && activeTab === 0 && dynamicColumns.length === 0) {
    dynamicColumns = allowedClassesFiltered;
  }

  // Hàm tính tổng số bài theo dòng
  const getRowTotal = (row) => {
    if (row.total !== undefined && row.total !== null && !isNaN(row.total)) {
      return Number(row.total);
    }

    let total = 0;
    if (dynamicColumns.length > 0) {
      dynamicColumns.forEach((col) => {
        const gradePrefix = String(col).split(".")[0];
        const count = Number((row[col] ?? row[gradePrefix] ?? 0));
        total += count;
      });
    }

    if (total === 0) {
      Object.keys(row).forEach((key) => {
        const lowerKey = String(key).toLowerCase();
        if (
          lowerKey !== "subject" &&
          lowerKey !== "total" &&
          lowerKey !== "id" &&
          lowerKey !== "username" &&
          lowerKey !== "key"
        ) {
          total += Number(row[key] || 0);
        }
      });
    }

    return total;
  };

  const filteredStatsData = statsData
    .filter((row) => getRowTotal(row) > 0)
    .sort((a, b) => {
      const nameA = (a.subject || "").trim();
      const nameB = (b.subject || "").trim();
      return nameA.localeCompare(nameB, 'vi', { sensitivity: 'base' });
    });

  const grandTotal = filteredStatsData.reduce((sum, row) => sum + getRowTotal(row), 0);

  return (
    <Box 
      sx={{ 
        p: { xs: 1, sm: 1.5 }, 
        overflowY: "auto", 
        flex: 1, 
        bgcolor: "#f8fafc", 
        display: "flex", 
        flexDirection: "column", 
        alignItems: "center", 
        width: "100%",
        boxSizing: "border-box"
      }}
    >
      <Box sx={{ width: "100%", maxWidth: "900px", display: "flex", flexDirection: "column", gap: 1.5 }}>
        
        {/* Banner Tiêu đề & Thẻ chỉ số thu gọn */}
        <Card
          sx={{
            p: 1.5,
            background: "linear-gradient(135deg, #f0f7ff 0%, #e1effe 100%)",
            color: "#1e293b",
            borderRadius: 2,
            border: "1px solid #cbd5e1",
            boxShadow: "none",
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
            <Typography 
              variant="h6" 
              sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1, fontSize: "15px", color: "#1e293b", m: 0 }}
            >
              <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
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

            {/* Cụm 3 thẻ thống kê trên cùng một dòng */}
            <Box sx={{ display: "flex", gap: 1, flexWrap: "nowrap", width: { xs: "100%", sm: "auto" }, alignItems: "center" }}>
              
              {/* Thẻ Tổng */}
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5, px: 1, py: 0.4, borderRadius: 1.5, bgcolor: "rgba(255, 255, 255, 0.9)", border: "1px solid #cbd5e1", flex: "0 0 auto", minWidth: 0 }}>
                <span>📦</span>
                <Typography variant="body2" sx={{ color: "#475569", fontSize: { xs: "0.75rem", sm: "0.85rem" }, whiteSpace: "nowrap" }}>Tổng:</Typography>
                <Typography variant="body1" fontWeight="bold" sx={{ color: "#1976d2", fontSize: { xs: "0.85rem", sm: "0.95rem" }, whiteSpace: "nowrap" }}>
                  {grandTotal}
                </Typography>
              </Box>

              {/* Thẻ Môn */}
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5, px: 1, py: 0.4, borderRadius: 1.5, bgcolor: "rgba(255, 255, 255, 0.9)", border: "1px solid #cbd5e1", flex: "0 0 auto", minWidth: 0 }}>
                <span>📚</span>
                <Typography variant="body2" sx={{ color: "#475569", fontSize: { xs: "0.75rem", sm: "0.85rem" }, whiteSpace: "nowrap" }}>Môn:</Typography>
                <Typography variant="body1" fontWeight="bold" sx={{ color: "#4f46e5", fontSize: { xs: "0.85rem", sm: "0.95rem" }, whiteSpace: "nowrap" }}>
                  {filteredStatsData.length}
                </Typography>
              </Box>

              {/* Thẻ Lớp/Khối */}
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5, px: 1.2, py: 0.4, borderRadius: 1.5, bgcolor: "rgba(255, 255, 255, 0.9)", border: "1px solid #cbd5e1", flex: 1, minWidth: 0, overflow: "hidden" }}>
                <span>🏫</span>
                <Typography variant="body2" sx={{ color: "#475569", fontSize: { xs: "0.75rem", sm: "0.85rem" }, whiteSpace: "nowrap" }}>Lớp:</Typography>
                <Typography 
                  variant="body1" 
                  fontWeight="bold" 
                  sx={{ 
                    color: "#16a34a", 
                    fontSize: { xs: "0.85rem", sm: "0.95rem" }, 
                    overflow: "hidden", 
                    textOverflow: "ellipsis", 
                    whiteSpace: "nowrap" 
                  }}
                  title={dynamicColumns.join(", ")}
                >
                  {dynamicColumns.join(", ") || "Không có"}
                </Typography>
              </Box>

            </Box>
          </Box>
        </Card>

        {loadingStats ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Card sx={{ p: 1.5, borderRadius: 2, boxShadow: "none", border: "1px solid #e2e8f0", bgcolor: "white" }}>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1.5, color: "#1e293b", fontSize: "0.95rem" }}>
              📊 Chi tiết bài nộp
            </Typography>
            
            {filteredStatsData.length === 0 ? (
              <Box sx={{ p: 3, textAlign: "center" }}>
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
                          p: { xs: 0.8, sm: 1.2 }, 
                          textAlign: "left", 
                          color: "#475569", 
                          fontWeight: 700, 
                          fontSize: "0.9rem",
                          whiteSpace: "nowrap"
                        }}
                      >
                        Môn học
                      </Box>

                      {/* Ẩn cột chi tiết lớp/khối nếu chỉ có đúng 1 cột */}
                      {dynamicColumns.length > 1 && dynamicColumns.map((col) => (
                        <Box 
                          component="th" 
                          key={col} 
                          sx={{ 
                            p: { xs: 0.4, sm: 1.2 }, 
                            color: "#475569", 
                            fontWeight: 700, 
                            fontSize: "0.9rem", 
                            width: { xs: "35px", sm: "45px" }, 
                            minWidth: { xs: "35px", sm: "45px" }, 
                            whiteSpace: "nowrap" 
                          }}
                        >
                          {String(col).toLowerCase().includes("khối") || String(col).length === 1 ? `Khối ${col}` : `Lớp ${col}`}
                        </Box>
                      ))}

                      <Box component="th" sx={{ p: { xs: 0.8, sm: 1.2 }, color: "#dc2626", fontWeight: 700, fontSize: "0.9rem", width: "14%", whiteSpace: "nowrap" }}>
                        Tổng
                      </Box>
                    </Box>
                  </thead>
                  <tbody>
                    {filteredStatsData.map((row, idx) => {
                      const rowTotal = getRowTotal(row);
                      const { icon, color } = getSubjectIconAndColor(row.subject);

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
                              p: { xs: 0.8, sm: 1.2 }, 
                              textAlign: "left", 
                              fontWeight: "700", 
                              color: "#1e293b", 
                              fontSize: "0.9rem",
                              whiteSpace: "nowrap"
                            }}
                          >
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                              <Box
                                sx={{
                                  p: 1,
                                  borderRadius: 1.5,
                                  bgcolor: color,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                }}
                              >
                                {icon}
                              </Box>
                              <span>{getDisplaySubjectName(row.subject)}</span>
                            </Box>
                          </Box>

                          {/* Dữ liệu cột lớp/khối tương ứng */}
                          {dynamicColumns.length > 1 && dynamicColumns.map((col) => {
                            const count = Number(row[col] ?? row[String(col).split(".")[0]] ?? 0);
                            return (
                              <Box 
                                component="td" 
                                key={col} 
                                sx={{ 
                                  p: { xs: 0.4, sm: 1.2 }, 
                                  color: count > 0 ? "#15803d" : "#94a3b8", 
                                  fontWeight: count > 0 ? "800" : "500",
                                  fontSize: "0.95rem",
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
                              p: { xs: 0.8, sm: 1.2 }, 
                              fontWeight: "800", 
                              color: "#dc2626", 
                              bgcolor: "#eff6ff", 
                              fontSize: "0.95rem",
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