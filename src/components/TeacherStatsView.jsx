import React from "react";
import {
  Box,
  Typography,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Avatar,
  Paper,
} from "@mui/material";
// Import đầy đủ các biểu tượng MUI
import CalculateIcon from '@mui/icons-material/Calculate'; // Toán
import PublicIcon from '@mui/icons-material/Public'; // Lịch sử và Địa lí
import DevicesIcon from '@mui/icons-material/Devices'; // Công nghệ
import BiotechIcon from '@mui/icons-material/Biotech'; // Khoa học
import EmojiPeopleIcon from '@mui/icons-material/EmojiPeople'; // Hoạt động trải nghiệm
import MenuBookIcon from '@mui/icons-material/MenuBook'; // Tiếng Việt
import LanguageIcon from '@mui/icons-material/Language'; // Tiếng Anh
import FavoriteIcon from '@mui/icons-material/Favorite'; // Đạo đức
import NatureIcon from '@mui/icons-material/Nature'; // Tự nhiên và Xã hội
import MusicNoteIcon from '@mui/icons-material/MusicNote'; // Âm nhạc
import PaletteIcon from '@mui/icons-material/Palette'; // Mỹ thuật / Mĩ thuật
import BrushIcon from '@mui/icons-material/Brush'; // Cọ vẽ Mĩ thuật
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'; // Giáo dục thể chất
import ComputerIcon from '@mui/icons-material/Computer'; // Tin học
import SchoolIcon from '@mui/icons-material/School'; // Mặc định chung
import DescriptionIcon from '@mui/icons-material/Description'; // Biên bản / Văn bản hành chính
import AssignmentIcon from '@mui/icons-material/Assignment'; // Đề kiểm tra / Bài tập
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import BookmarksOutlinedIcon from '@mui/icons-material/BookmarksOutlined';
import ClassOutlinedIcon from '@mui/icons-material/ClassOutlined';
import DashboardCustomizeIcon from '@mui/icons-material/DashboardCustomize';

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
  teacherRole,
  currentUserGroup
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Hàm hiển thị tên môn học
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

  // Hàm ánh xạ biểu tượng kèm nền màu riêng (đã tối ưu từ khóa mĩ thuật / mỹ thuật)
  const getSubjectIconAndColor = (subjectName) => {
    const lower = (subjectName || "").toLowerCase();

    if (lower.includes("biên bản") || lower.includes("sinh hoạt chuyên môn")) {
      return { icon: <DescriptionIcon sx={{ fontSize: 26, color: '#0284c7' }} />, color: '#e0f2fe', border: '#bae6fd' };
    }
    if (lower.includes("đề") || lower.includes("kiểm tra") || lower.includes("ktđk")) {
      return { icon: <AssignmentIcon sx={{ fontSize: 26, color: '#d97706' }} />, color: '#fef3c7', border: '#fde68a' };
    }
    if (lower.includes("toán")) {
      return { icon: <CalculateIcon sx={{ fontSize: 26, color: '#2563eb' }} />, color: '#eff6ff', border: '#bfdbfe' };
    }
    if (lower.includes("tiếng việt")) {
      return { icon: <MenuBookIcon sx={{ fontSize: 26, color: '#0284c7' }} />, color: '#e0f2fe', border: '#bae6fd' };
    }
    if (lower.includes("tiếng anh")) {
      return { icon: <LanguageIcon sx={{ fontSize: 26, color: '#0f766e' }} />, color: '#ccfbf1', border: '#99f6e4' };
    }
    if (lower.includes("đạo đức")) {
      return { icon: <FavoriteIcon sx={{ fontSize: 26, color: '#e11d48' }} />, color: '#ffe4e6', border: '#fecdd3' };
    }
    if (lower.includes("tự nhiên và xã hội") || lower.includes("tự nhiên xã hội")) {
      return { icon: <NatureIcon sx={{ fontSize: 26, color: '#16a34a' }} />, color: '#dcfce7', border: '#bbf7d0' };
    }
    if (lower.includes("khoa học")) {
      return { icon: <BiotechIcon sx={{ fontSize: 26, color: '#9333ea' }} />, color: '#f3e8ff', border: '#e9d5ff' };
    }
    if (lower.includes("lịch sử") || lower.includes("địa lí") || lower.includes("địa lý") || lower.includes("lịch sử và địa lí")) {
      return { icon: <PublicIcon sx={{ fontSize: 26, color: '#15803d' }} />, color: '#f0fdf4', border: '#dcfce7' };
    }
    if (lower.includes("tin học")) {
      return { icon: <ComputerIcon sx={{ fontSize: 26, color: '#4f46e5' }} />, color: '#eef2ff', border: '#c7d2fe' };
    }
    if (lower.includes("công nghệ")) {
      return { icon: <DevicesIcon sx={{ fontSize: 26, color: '#ea580c' }} />, color: '#ffedd5', border: '#fed7aa' };
    }
    if (lower.includes("giáo dục thể chất") || lower.includes("thể chất")) {
      return { icon: <FitnessCenterIcon sx={{ fontSize: 26, color: '#0d9488' }} />, color: '#f0fdfa', border: '#ccfbf1' };
    }
    if (lower.includes("âm nhạc")) {
      return { icon: <MusicNoteIcon sx={{ fontSize: 26, color: '#db2777' }} />, color: '#fce7f3', border: '#fbcfe8' };
    }
    // Hỗ trợ cả 2 cách viết "mĩ thuật" và "mỹ thuật"
    if (lower.includes("mĩ thuật") || lower.includes("mỹ thuật")) {
      return { icon: <BrushIcon sx={{ fontSize: 26, color: '#ca8a04' }} />, color: '#fef9c3', border: '#fef08a' };
    }
    if (lower.includes("hoạt động trải nghiệm") || lower.includes("hđtn")) {
      return { icon: <EmojiPeopleIcon sx={{ fontSize: 26, color: '#e11d48' }} />, color: '#ffe4e6', border: '#fecdd3' };
    }

    return { icon: <SchoolIcon sx={{ fontSize: 26, color: '#475569' }} />, color: '#f1f5f9', border: '#e2e8f0' };
  };

  // Lọc danh sách lớp phân công hợp lệ
  const allowedClassesFiltered = (teacherAllowedClasses || []).filter(
    (c) => !String(c).toLowerCase().includes("username")
  );

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
        if (count > 0) {
          activeColumnsSet.add(String(key).trim());
        }
      }
    });
  });

  let dynamicColumns = [];
  if (allowedClassesFiltered.length > 0 && allowedClassesFiltered.some(c => String(c).includes("."))) {
    dynamicColumns = allowedClassesFiltered;
  } else if (activeColumnsSet.size > 0) {
    dynamicColumns = Array.from(activeColumnsSet).sort((a, b) => {
      const numA = parseFloat(a);
      const numB = parseFloat(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return String(a).localeCompare(String(b), 'vi', { numeric: true });
    });
  } else if (allowedClassesFiltered.length > 0) {
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
        const count = Number(row[col] ?? row[gradePrefix] ?? 0);
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

  // 🌟 Xác định nhãn hiển thị đúng theo Tab (Tên GV nếu ở Tab 0, hoặc Khối/Tổ nếu ở Tab 1, 2)
  const getStatsTitleLabel = () => {
    if (activeTab === 0) {
      return selectedUsername ? `Tổng hợp: ${selectedUsername}` : "Thống kê cá nhân";
    }
    // Xử lý cho Tab 1 & Tab 2 (Đề KTĐK, Biên bản theo Khối/Tổ)
    const currentSelection = String(selectedGrade || "").trim().toUpperCase();
    if (currentSelection.includes("TIẾNG ANH") || currentSelection === "TIENG_ANH" || currentSelection === "TA") {
      return "Tổng hợp: TỔ TIẾNG ANH";
    }
    if (currentSelection.includes("BỘ MÔN") || currentSelection === "BO_MON" || currentSelection === "BM") {
      return "Tổng hợp: BỘ MÔN";
    }
    return `Tổng hợp: KHỐI ${currentSelection.replace(/[^0-9]/g, "") || "1"}`;
  };

  return (
    <Box 
      sx={{ 
        p: { xs: 1.5, sm: 2.5 }, 
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
      <Box sx={{ width: "100%", maxWidth: "920px", display: "flex", flexDirection: "column", gap: 2.5 }}>
        
        {/* Banner Tiêu đề & Thẻ chỉ số tổng quan */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 2.5 },
            background: "linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.03)",
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Avatar sx={{ bgcolor: "#eff6ff", color: "#2563eb", width: 42, height: 42, border: "1px solid #bfdbfe" }}>
                <PersonOutlineIcon />
              </Avatar>
              <Box>
                {/*<Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Báo cáo thống kê
                </Typography>*/}
                <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: "0.95rem", sm: "1.15rem" }, color: "#0f172a" }}>
  <Box component="span" sx={{ color: "#2563eb" }}>
    {(() => {
      // 1. Nếu có truyền prop title và title có chứa dấu hai chấm, ta chỉ lấy phần tên phía sau
      if (title) {
        const parts = title.split(":");
        if (parts.length >= 2) {
          return parts.slice(1).join(":").trim().toUpperCase();
        }
        return title.toUpperCase();
      }

      // 2. Nếu ở Tab 1 hoặc Tab 2 (BGH tổng hợp theo Khối / Tổ)
      if (activeTab === 1 || activeTab === 2) {
        const groupVal = String(currentUserGroup || teacherRole || "").trim().toUpperCase();
        const currentSelection = String(className || "").trim().toUpperCase();
        
        if (groupVal.includes("TA") || groupVal.includes("TIENG_ANH") || groupVal.includes("TIẾNG ANH")) {
          return "TỔ TIẾNG ANH";
        } 
        if (groupVal.includes("BM") || groupVal.includes("BO_MON") || groupVal.includes("BỘ MÔN") || currentSelection.includes("BỘ MÔN") || currentSelection.includes("BO_MON") || currentSelection === "BM") {
          return "TỔ BỘ MÔN";
        }
        if (currentSelection.includes("TIẾNG ANH") || currentSelection === "TIENG_ANH") {
          return "TỔ TIẾNG ANH";
        }
        const gradeNumber = currentSelection.split(".")[0].replace(/[^0-9]/g, "") || "1";
        return `KHỐI ${gradeNumber}`;
      }

      // 3. Nếu ở Tab 0 (Cá nhân)
      const currentTeacher = (activeTeacher || selectedUsername || "").trim();
      if (currentTeacher) {
        return currentTeacher.toUpperCase();
      }

      return "KHỐI 4";
    })()}
  </Box>
</Typography>
              </Box>
            </Box>

            {/* Cụm 3 thẻ KPI */}
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", width: { xs: "100%", sm: "auto" } }}>
              {/* Thẻ 1: Tổng số */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: { xs: 1, sm: 1.5 }, py: 0.8, borderRadius: "12px", bgcolor: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.02)", flex: { xs: "1 1 calc(33.333% - 8px)", sm: "0 0 auto" }, minWidth: { xs: "auto", sm: "100px" } }}>
                <Inventory2OutlinedIcon sx={{ fontSize: { xs: 18, sm: 20 }, color: "#2563eb", flexShrink: 0 }} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="caption" sx={{ color: "#64748b", display: "block", fontSize: { xs: "0.65rem", sm: "0.7rem" }, lineHeight: 1 }}>Tổng số</Typography>
                  <Typography variant="body2" fontWeight="800" sx={{ color: "#0f172a", fontSize: { xs: "0.85rem", sm: "0.95rem" }, whiteSpace: "nowrap" }}>{grandTotal}</Typography>
                </Box>
              </Box>

              {/* Thẻ 2: Số môn */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: { xs: 1, sm: 1.5 }, py: 0.8, borderRadius: "12px", bgcolor: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.02)", flex: { xs: "1 1 calc(33.333% - 8px)", sm: "0 0 auto" }, minWidth: { xs: "auto", sm: "90px" } }}>
                <BookmarksOutlinedIcon sx={{ fontSize: { xs: 18, sm: 20 }, color: "#7c3aed", flexShrink: 0 }} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="caption" sx={{ color: "#64748b", display: "block", fontSize: { xs: "0.65rem", sm: "0.7rem" }, lineHeight: 1 }}>Số môn</Typography>
                  <Typography variant="body2" fontWeight="800" sx={{ color: "#0f172a", fontSize: { xs: "0.85rem", sm: "0.95rem" }, whiteSpace: "nowrap" }}>{filteredStatsData.length}</Typography>
                </Box>
              </Box>

              {/* Thẻ 3: Lớp phụ trách - Chỉ hiển thị khi ở Tab 0 */}
              {activeTab === 0 && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: { xs: 1, sm: 1.5 }, py: 0.8, borderRadius: "12px", bgcolor: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.02)", flex: { xs: "1 1 calc(33.333% - 8px)", sm: "0 0 auto" }, minWidth: { xs: "auto", sm: "auto" }, maxWidth: { sm: "220px" } }}>
                  <ClassOutlinedIcon sx={{ fontSize: { xs: 18, sm: 20 }, color: "#16a34a", flexShrink: 0 }} />
                  <Box sx={{ overflow: "hidden", minWidth: 0, flex: 1 }}>
                    <Typography variant="caption" sx={{ color: "#64748b", display: "block", fontSize: { xs: "0.65rem", sm: "0.7rem" }, lineHeight: 1 }}>
                      <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>Lớp</Box>
                      <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>Lớp phụ trách</Box>
                    </Typography>
                    
                    {/* 🌟 Hiển thị thông minh: Trên điện thoại (xs) chỉ lấy 2 lớp đầu + "...", trên máy tính (sm) hiện đầy đủ */}
                    <Typography 
                      variant="body2" 
                      fontWeight="800" 
                      sx={{ color: "#0f172a", fontSize: { xs: "0.85rem", sm: "0.95rem" }, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} 
                      title={dynamicColumns.join(", ")}
                    >
                      {/* Bản cho Điện thoại (xs) */}
                      <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>
                        {dynamicColumns.length > 2 
                          ? `${dynamicColumns.slice(0, 2).join(", ")}, ...` 
                          : (dynamicColumns.join(", ") || "Chưa chọn")}
                      </Box>

                      {/* Bản cho Máy tính (sm trở lên) */}
                      <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
                        {dynamicColumns.join(", ") || "Chưa chọn"}
                      </Box>
                    </Typography>
                  </Box>
                </Box>
              )}  
            </Box>
          </Box>
        </Paper>

        {/* Lưới Thẻ Tương Tác (Modern Grid Cards) */}
        {loadingStats ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress size={36} thickness={4} />
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 0.5 }}>
              <DashboardCustomizeIcon sx={{ color: "#2563eb", fontSize: 20 }} />
              <Typography variant="subtitle1" fontWeight="700" sx={{ color: "#0f172a", fontSize: "0.95rem" }}>
                Thống kê chi tiết ({filteredStatsData.length} môn)
              </Typography>
            </Box>

            {filteredStatsData.length === 0 ? (
              <Paper elevation={0} sx={{ p: 4, textAlign: "center", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
                <Typography color="text.secondary" variant="body2">
                  Chưa có dữ liệu bài nộp nào được ghi nhận trong năm học {academicYear}.
                </Typography>
              </Paper>
            ) : (
              <Box 
                sx={{ 
                  display: "grid", 
                  gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, 
                  gap: 2 
                }}
              >
                {filteredStatsData.map((row, idx) => {
                  const rowTotal = getRowTotal(row);
                  const { icon, color, border } = getSubjectIconAndColor(row.subject);

                  return (
                    <Paper
                      key={idx}
                      elevation={0}
                      sx={{
                        p: 2.5,
                        borderRadius: "16px",
                        bgcolor: "#ffffff",
                        border: `1px solid ${border}`,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        position: "relative",
                        overflow: "hidden",
                        transition: "all 0.3s ease",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.02)",
                        "&:hover": {
                          borderColor: "#2563eb",
                          boxShadow: "0 10px 25px -5px rgba(37, 99, 235, 0.1), 0 8px 10px -6px rgba(37, 99, 235, 0.1)",
                          transform: "translateY(-3px)",
                        }
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2}}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                          <Box
                            sx={{
                              width: 50,
                              height: 50,
                              borderRadius: "14px",
                              bgcolor: color,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                              boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)"
                            }}
                          >
                            {icon}
                          </Box>
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#0f172a", fontSize: "1rem", lineHeight: 1.3 }}>
                              {getDisplaySubjectName(row.subject)}
                            </Typography>
                            {/*<Typography variant="caption" sx={{ color: "#64748b", fontWeight: 500 }}>
                              Môn học chính thức
                            </Typography>*/}
                          </Box>
                        </Box>

                        <Box 
                          sx={{ 
                            display: "flex", 
                            flexDirection: "column", 
                            alignItems: "center",
                            justifyContent: "center",
                            bgcolor: "#eff6ff",
                            px: 2,
                            py: 1,
                            borderRadius: "12px",
                            border: "1px solid #bfdbfe",
                            minWidth: "60px"
                          }}
                        >
                          <Typography variant="caption" sx={{ color: "#1e40af", fontWeight: 700, fontSize: "0.65rem", textTransform: "uppercase", lineHeight: 1 }}>
                            TỔNG
                          </Typography>
                          <Typography variant="h6" sx={{ fontWeight: 900, color: "#2563eb", lineHeight: 1.2, mt: 0.2 }}>
                            {rowTotal}
                          </Typography>
                        </Box>
                      </Box>

                      {dynamicColumns.length > 1 && (
                        <Box sx={{ mt: 'auto', pt: 1.5, borderTop: "1px dashed #e2e8f0" }}>
                          <Typography variant="caption" sx={{ color: "#64748b", display: "block", mb: 1, fontWeight: 600 }}>
                            Chi tiết theo lớp:
                          </Typography>
                          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                            {dynamicColumns.map((col) => {
                              const gradePrefix = String(col).split(".")[0];
                              const count = Number(row[col] ?? row[gradePrefix] ?? 0);
                              return (
                                <Box 
                                  key={col} 
                                  sx={{ 
                                    display: "flex", 
                                    alignItems: "center", 
                                    gap: 0.8,
                                    bgcolor: count > 0 ? "#f0fdf4" : "#f8fafc",
                                    border: `1px solid ${count > 0 ? "#bbf7d0" : "#e2e8f0"}`,
                                    px: 1.2,
                                    py: 0.4,
                                    borderRadius: "8px"
                                  }}
                                >
                                  <Typography variant="caption" sx={{ color: "#475569", fontWeight: 600 }}>
                                    {String(col).toLowerCase().includes("khối") || String(col).length === 1 ? `K${col}` : `Lớp ${col}`}:
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: count > 0 ? "#16a34a" : "#94a3b8", fontWeight: 800 }}>
                                    {count > 0 ? count : "—"}
                                  </Typography>
                                </Box>
                              );
                            })}
                          </Box>
                        </Box>
                      )}
                    </Paper>
                  );
                })}
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}