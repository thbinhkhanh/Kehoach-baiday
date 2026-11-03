import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
} from "@mui/material";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import CloseIcon from "@mui/icons-material/Close";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import { handleExportExcel } from "../utils/exportSchoolSummary";

export default function SchoolSummaryView({
  academicYear,
  loadingSchoolSummary,
  schoolSummaryGrouped,
  filteredSubjectNames,
  fetchSchoolSummary,
  setViewMode,
  getShortSubjectName,
  setSelectedUsername,
  setSelectedFile,
  isFullScreen,
  setIsFullScreen,
  setSnackbar,
}) {
  const [summaryTab, setSummaryTab] = useState("gvcn");

  // 1. Lọc nhóm giáo viên theo Tab (Chỉ lấy các khối 1-5 cho GVCN, và Tiếng Anh, Bộ môn cho Chuyên biệt)
  const getFilteredGroups = () => {
    if (!schoolSummaryGrouped) return {};
    const filtered = {};

    const groupTitles = {
      khoi1: "Khối 1",
      khoi2: "Khối 2",
      khoi3: "Khối 3",
      khoi4: "Khối 4",
      khoi5: "Khối 5",
      tiengAnh: "Tiếng Anh",
      boMon: "Bộ Môn",
    };

    Object.entries(schoolSummaryGrouped).forEach(([groupKey, teachersList]) => {
      if (!Array.isArray(teachersList)) return;
      const isKhoiGroup = groupKey.startsWith("khoi");

      if (summaryTab === "gvcn") {
        if (isKhoiGroup) {
          filtered[groupKey] = {
            title: groupTitles[groupKey] || groupKey,
            teachers: teachersList,
          };
        }
      } else {
        if (!isKhoiGroup && groupKey !== "toBoMon") {
          filtered[groupKey] = {
            title: groupKey === "tiengAnh" ? "Tiếng Anh" : "Bộ Môn",
            teachers: teachersList,
          };
        }
      }
    });

    return filtered;
  };

  const activeGroupedData = getFilteredGroups();

  // 2. Tự động lọc các cột môn học động có dữ liệu
  const activeSubjectNames = filteredSubjectNames.filter((sub) => {
    return Object.values(activeGroupedData).some((groupData) => {
      return groupData.teachers?.some((teacher) => {
        const hasSubjectInMap = (teacher.subjects?.[sub] || 0) > 0;
        return hasSubjectInMap;
      });
    });
  });

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* THANH TIÊU ĐỀ */}
      <Box 
        sx={{ 
          display: "flex", 
          flexDirection: { xs: "column", sm: "row" }, 
          py: 1.2, 
          px: 2, 
          bgcolor: "#ffffff", 
          justifyContent: "space-between", 
          alignItems: { xs: "stretch", sm: "center" }, 
          gap: { xs: 1, sm: 2 },
          flexShrink: 0, 
          borderBottom: "1px solid #e2e8f0" 
        }}
      >
        <Typography 
          variant="subtitle1" 
          fontWeight="bold" 
          sx={{ 
            color: "#1e293b", 
            fontSize: { xs: "0.9rem", sm: "1rem" },
            display: { xs: "none", sm: "block" }
          }}
        >
          📊 BẢNG TỔNG HỢP TOÀN TRƯỜNG ({academicYear})
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
          <Tabs
            value={summaryTab}
            onChange={(e, val) => setSummaryTab(val)}
            textColor="primary"
            indicatorColor="primary"
            variant="scrollable"
            scrollButtons="auto"
            sx={{ minHeight: 36, flex: { xs: 1, sm: "unset" } }}
          >
            <Tab label="🏫 GV CHỦ NHIỆM" value="gvcn" sx={{ minHeight: 36, fontSize: { xs: "0.75rem", sm: "0.85rem" }, fontWeight: "bold", px: { xs: 1, sm: 2 } }} />
            <Tab label="🎨 BỘ MÔN - TA" value="chuyenbiet" sx={{ minHeight: 36, fontSize: { xs: "0.75rem", sm: "0.85rem" }, fontWeight: "bold", px: { xs: 1, sm: 2 } }} />
          </Tabs>

          {/* NÚT PHÓNG TO / THU NHỎ */}
          <Tooltip title={isFullScreen ? "Thu nhỏ màn hình" : "Phóng to toàn màn hình"}>
            <IconButton 
              color="primary" 
              onClick={() => setIsFullScreen && setIsFullScreen(!isFullScreen)} 
              sx={{ 
                display: { xs: "none", sm: "flex" },
                bgcolor: "#f8fafc", 
                border: "1px solid #cbd5e1",
                "&:hover": { bgcolor: "#f1f5f9", borderColor: "#94a3b8" },
                height: 32,
                width: 32,
                p: 0.5 
              }}
            >
              {isFullScreen ? (
                <FullscreenExitIcon sx={{ color: "#475569", fontSize: "1.2rem" }} />
              ) : (
                <FullscreenIcon sx={{ color: "#475569", fontSize: "1.2rem" }} />
              )}
            </IconButton>
          </Tooltip>

          {/* NÚT XUẤT EXCEL */}
          <Tooltip title="Xuất Báo Cáo Excel Toàn Trường">
            <IconButton 
              color="primary" 
              onClick={() => handleExportExcel({
                schoolSummaryGrouped,
                academicYear,
                filteredSubjectNames,
                setSnackbar: setSnackbar || (() => {})
              })}
              sx={{ 
                bgcolor: "#eff6ff", 
                border: "1px solid #bae6fd",
                "&:hover": { bgcolor: "#dbeafe" },
                height: 32,
                width: 32,
                p: 0.5 
              }}
            >
              <FileDownloadIcon sx={{ color: "#2563eb", fontSize: "1.1rem" }} />
            </IconButton>
          </Tooltip>

          {/* NÚT ĐÓNG */}
          {/* ❌ NÚT ĐÓNG BẢNG THỐNG KÊ */}
          <Tooltip title="Đóng bảng thống kê">
            <IconButton 
              size="small" 
              onClick={() => {
                if (typeof setIsFullScreen === "function") {
                  setIsFullScreen(false); // 👈 Tắt chế độ toàn màn hình
                }
                if (typeof setViewMode === "function") {
                  setViewMode("single");   // 👈 Trở về giao diện ban đầu
                }
              }}
              sx={{ 
                display: { xs: "none", sm: "flex" }, 
                color: "#64748b", 
                border: "1px solid #cbd5e1", 
                borderRadius: "8px",
                bgcolor: "#f8fafc",
                "&:hover": { bgcolor: "#fee2e2", color: "#dc2626", borderColor: "#fca5a5" },
                height: 32,
                width: 32
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* NỘI DUNG BẢNG */}
      <Box sx={{ flex: 1, p: { xs: 1, sm: 2 }, overflow: "auto", bgcolor: "#fafafa" }}>
        {loadingSchoolSummary ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "200px" }}>
            <CircularProgress />
          </Box>
        ) : Object.keys(activeGroupedData).length === 0 ? (
          <Typography color="text.secondary" align="center" sx={{ mt: 4 }}>
            Không có dữ liệu tổng hợp cho nhóm này.
          </Typography>
        ) : (() => {
          const grandSchoolTotals = {};
          let grandSchoolTotalCount = 0;

          activeSubjectNames.forEach((sub) => {
            grandSchoolTotals[sub] = 0;
          });

          Object.values(activeGroupedData).forEach((groupData) => {
            if (groupData.teachers && groupData.teachers.length > 0) {
              groupData.teachers.forEach((teacher) => {
                activeSubjectNames.forEach((sub) => {
                  grandSchoolTotals[sub] += teacher.subjects?.[sub] || 0;
                });
                grandSchoolTotalCount += teacher.totalFiles || 0;
              });
            }
          });

          return (
            <TableContainer component={Paper} sx={{ maxHeight: isFullScreen ? "calc(100vh - 130px)" : "calc(100vh - 180px)", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", borderRadius: 2.5, border: "1px solid #e2e8f0" }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "#e1effe" }}>
                    <TableCell align="center" sx={{ fontWeight: "bold", bgcolor: "#e1effe", color: "#1e293b", minWidth: 45, fontSize: "0.85rem", borderBottom: "1px solid #cbd5e1" }}>STT</TableCell>
                    <TableCell align="center" sx={{ fontWeight: "bold", bgcolor: "#e1effe", color: "#1e293b", minWidth: 200, fontSize: "0.85rem", borderBottom: "1px solid #cbd5e1" }}>Họ và tên</TableCell>

                    {activeSubjectNames.map((sub) => (
                      <TableCell 
                        key={sub} 
                        align="center" 
                        sx={{ 
                          fontWeight: "bold", 
                          bgcolor: "#e1effe", 
                          color: "#1e293b", 
                          minWidth: 60, 
                          fontSize: "0.85rem",
                          borderLeft: "1px solid #cbd5e1",
                          borderRight: "1px solid #cbd5e1",
                          borderBottom: "1px solid #cbd5e1"
                        }}
                      >
                        {getShortSubjectName(sub)}
                      </TableCell>
                    ))}

                    {/* Tăng minWidth của cột Tổng số lên 100 để rộng rãi hơn */}
                    <TableCell align="center" sx={{ fontWeight: "bold", bgcolor: "#dbeafe", color: "#1976d2", minWidth: 100, fontSize: "0.85rem", borderLeft: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1" }}>
                      Tổng số
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(activeGroupedData).map(([groupKey, groupData]) => {
                    if (!groupData.teachers || groupData.teachers.length === 0) return null;

                    const groupTotals = {};
                    let groupGrandTotal = 0;
                    activeSubjectNames.forEach((sub) => {
                      groupTotals[sub] = groupData.teachers.reduce(
                        (sum, teacher) => sum + (teacher.subjects?.[sub] || 0),
                        0
                      );
                    });
                    groupGrandTotal = groupData.teachers.reduce(
                      (sum, teacher) => sum + (teacher.totalFiles || 0),
                      0
                    );

                    return (
                      <React.Fragment key={groupKey}>
                        <TableRow>
                          <TableCell
                            colSpan={activeSubjectNames.length + 3}
                            sx={{
                              bgcolor: "#f1f5f9",
                              color: "#1e293b",
                              fontWeight: "bold",
                              fontSize: "0.9rem",
                              py: 1.2,
                              borderTop: "2px solid #e2e8f0",
                              borderBottom: "1px solid #e2e8f0",
                            }}
                          >
                            {groupData.title} ({groupData.teachers.length} giáo viên)
                          </TableCell>
                        </TableRow>

                        {groupData.teachers.map((teacher, index) => {
                          const teacherName = teacher.teacherName || teacher.teacherId;
                          const teacherClass = teacher.class || "Chưa gán";
                          const teacherGroup = teacher.group || "";

                          return (
                            <TableRow 
                              key={teacherName} 
                              hover 
                              onClick={() => {
                                setSelectedUsername(teacherName);
                                if (setIsFullScreen) setIsFullScreen(false);
                                setViewMode("single");
                                if (typeof setSelectedFile === "function") setSelectedFile(null);
                              }}
                              sx={{ cursor: "pointer", "&:hover": { bgcolor: "#eff6ff" } }}
                            >
                              <TableCell align="center" sx={{ color: "#64748b", fontSize: "0.85rem" }}>{index + 1}</TableCell>
                              <TableCell sx={{ py: 1.2 }}>
                                <Typography variant="subtitle2" fontWeight="700" sx={{ color: "#2563eb", fontSize: "0.9rem", textDecoration: "underline" }}>
                                  {teacherName}
                                </Typography>
                                <Typography variant="caption" sx={{ color: "#64748b", display: "block" }}>
                                  Lớp: {teacherClass} | Nhóm: {teacherGroup}
                                </Typography>
                              </TableCell>
                              
                              {activeSubjectNames.map((sub) => {
                                const count = teacher.subjects?.[sub] || 0;
                                const hasData = count > 0;
                                return (
                                  <TableCell 
                                    key={sub} 
                                    align="center"
                                    sx={{
                                      borderLeft: "1px solid #e2e8f0",
                                      borderRight: "1px solid #e2e8f0"
                                    }}
                                  >
                                    <Box
                                      sx={{
                                        display: "inline-block",
                                        px: 1.2,
                                        py: 0.4,
                                        borderRadius: 1.5,
                                        fontWeight: "800",
                                        fontSize: "0.85rem",
                                        bgcolor: hasData ? "#f0f9ff" : "transparent",
                                        color: hasData ? "#0284c7" : "#cbd5e1",
                                        border: hasData ? "1px solid #bae6fd" : "none",
                                      }}
                                    >
                                      {hasData ? count : "—"}
                                    </Box>
                                  </TableCell>
                                );
                              })}
                              {/* Cột Tổng số của từng giáo viên (tăng minWidth tương ứng) */}
                              <TableCell align="center" sx={{ minWidth: 100, borderLeft: "1px solid #e2e8f0" }}>
                                <Typography variant="subtitle2" fontWeight="800" sx={{ color: (teacher.totalFiles || 0) > 0 ? "#dc2626" : "#94a3b8", fontSize: "0.9rem" }}>
                                  {teacher.totalFiles || 0}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          );
                        })}

                        {/* Dòng tổng nhóm */}
                        <TableRow sx={{ bgcolor: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
                          <TableCell align="center" colSpan={2} sx={{ fontWeight: "700", color: "#334155", fontSize: "0.85rem" }}>
                            Tổng {groupData.title}:
                          </TableCell>
                          
                          {activeSubjectNames.map((sub) => (
                            <TableCell 
                              key={sub} 
                              align="center" 
                              sx={{ 
                                fontWeight: "800", 
                                color: groupTotals[sub] > 0 ? "#dc2626" : "#cbd5e1", 
                                fontSize: "0.9rem",
                                borderLeft: "1px solid #e2e8f0",
                                borderRight: "1px solid #e2e8f0"
                              }}
                            >
                              {groupTotals[sub] > 0 ? groupTotals[sub] : "—"}
                            </TableCell>
                          ))}
                          <TableCell align="center" sx={{ minWidth: 100, fontWeight: "800", color: "#1d4ed8", fontSize: "0.95rem", bgcolor: "#eff6ff", borderLeft: "1px solid #e2e8f0" }}>
                            {groupGrandTotal}
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    );
                  })}

                  {/* DÒNG TỔNG TOÀN TRƯỜNG */}
                  <TableRow sx={{ bgcolor: "#0f172a", borderTop: "3px double #3b82f6" }}>
                    <TableCell align="center" colSpan={2} sx={{ fontWeight: "bold", color: "#38bdf8", fontSize: "0.95rem", py: 1.5 }}>
                      🏆 TỔNG TOÀN TRƯỜNG
                    </TableCell>
                    {activeSubjectNames.map((sub) => (
                      <TableCell 
                        key={sub} 
                        align="center" 
                        sx={{ 
                          fontWeight: "bold", 
                          color: grandSchoolTotals[sub] > 0 ? "#38bdf8" : "#64748b", 
                          fontSize: "0.95rem",
                          borderLeft: "1px solid #1e293b",
                          borderRight: "1px solid #1e293b"
                        }}
                      >
                        {grandSchoolTotals[sub] > 0 ? grandSchoolTotals[sub] : "—"}
                      </TableCell>
                    ))}
                    <TableCell align="center" sx={{ minWidth: 100, fontWeight: "bold", color: "#ffffff", fontSize: "1.05rem", bgcolor: "#1e3a8a", borderLeft: "1px solid #1e293b" }}>
                      {grandSchoolTotalCount}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          );
        })()}
      </Box>
    </Box>
  );
}