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
} from "@mui/material";

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
}) {
  const [summaryTab, setSummaryTab] = useState("gvcn");

  // 1. Lọc nhóm giáo viên theo Tab
  const getFilteredGroups = () => {
    if (!schoolSummaryGrouped) return {};
    const filtered = {};

    Object.entries(schoolSummaryGrouped).forEach(([groupKey, groupData]) => {
      const titleLower = (groupData.title || "").toLowerCase();
      const isKhoiGroup =
        titleLower.includes("khối") ||
        groupKey.startsWith("khoi");

      if (summaryTab === "gvcn") {
        if (isKhoiGroup) {
          filtered[groupKey] = groupData;
        }
      } else {
        if (!isKhoiGroup || titleLower.includes("tiếng anh") || titleLower.includes("bộ môn")) {
          filtered[groupKey] = groupData;
        }
      }
    });

    return filtered;
  };

  const activeGroupedData = getFilteredGroups();

  // 2. TỰ ĐỘNG LỌC CỘT MÔN HỌC ĐỘNG:
  const activeSubjectNames = filteredSubjectNames.filter((sub) => {
    return Object.values(activeGroupedData).some((groupData) => {
      return groupData.rows?.some((row) => {
        const isAssigned = row.assignedSubjects?.some(
          (as) => as.toLowerCase().trim() === sub.toLowerCase().trim()
        );
        const hasCount = (row.subjectCounts[sub] || 0) > 0;
        return isAssigned || hasCount;
      });
    });
  });

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* THANH TIÊU ĐỀ - HIỂN THỊ TRÊN CẢ MOBILE VÀ DESKTOP */}
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
        <Typography variant="subtitle1" fontWeight="bold" sx={{ color: "#1e293b", fontSize: { xs: "0.9rem", sm: "1rem" } }}>
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

          <Button 
            size="small" 
            variant="outlined" 
            onClick={() => setIsFullScreen && setIsFullScreen(!isFullScreen)} 
            sx={{ borderColor: "#cbd5e1", color: "#475569", fontWeight: "bold", fontSize: { xs: "0.75rem", sm: "0.8125rem" }, height: 32 }}
          >
            {isFullScreen ? "🗗 Thu nhỏ" : "⛶ Phóng to"}
          </Button>
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
            if (groupData.rows && groupData.rows.length > 0) {
              groupData.rows.forEach((row) => {
                activeSubjectNames.forEach((sub) => {
                  grandSchoolTotals[sub] += row.subjectCounts[sub] || 0;
                });
                grandSchoolTotalCount += row.totalCount || 0;
              });
            }
          });

          return (
            <TableContainer component={Paper} sx={{ maxHeight: isFullScreen ? "calc(100vh - 130px)" : "calc(100vh - 180px)", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", borderRadius: 2.5, border: "1px solid #e2e8f0" }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "#1e293b" }}>
                    <TableCell align="center" sx={{ fontWeight: "bold", bgcolor: "#1e293b", color: "white", minWidth: 45, fontSize: "0.85rem" }}>STT</TableCell>
                    <TableCell align="center" sx={{ fontWeight: "bold", bgcolor: "#1e293b", color: "white", minWidth: 200, fontSize: "0.85rem" }}>Họ và tên</TableCell>

                    {activeSubjectNames.map((sub) => (
                      <TableCell 
                        key={sub} 
                        align="center" 
                        sx={{ 
                          fontWeight: "bold", 
                          bgcolor: "#1e293b", 
                          color: "white", 
                          minWidth: 60, 
                          fontSize: "0.85rem",
                          borderLeft: "1px solid #334155",
                          borderRight: "1px solid #334155"
                        }}
                      >
                        {getShortSubjectName(sub)}
                      </TableCell>
                    ))}

                    <TableCell align="center" sx={{ fontWeight: "bold", bgcolor: "#0f172a", color: "#38bdf8", minWidth: 70, fontSize: "0.85rem", borderLeft: "1px solid #334155" }}>
                      Tổng số
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(activeGroupedData).map(([groupKey, groupData]) => {
                    if (!groupData.rows || groupData.rows.length === 0) return null;

                    const groupTotals = {};
                    let groupGrandTotal = 0;
                    activeSubjectNames.forEach((sub) => {
                      groupTotals[sub] = groupData.rows.reduce(
                        (sum, row) => sum + (row.subjectCounts[sub] || 0),
                        0
                      );
                    });
                    groupGrandTotal = groupData.rows.reduce(
                      (sum, row) => sum + row.totalCount,
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
                            {groupData.title} ({groupData.rows.length} giáo viên)
                          </TableCell>
                        </TableRow>

                        {groupData.rows.map((row, index) => {
                          const subjects = (row.assignedSubjects || []).map((sub) =>
                            sub === "Giáo dục thể chất" ? "GDTC" : sub
                          );
                          const displaySubjects = subjects.length > 2
                            ? `${subjects[0]}...`
                            : (subjects.join(", ") || row.role);

                          return (
                            <TableRow 
                              key={row.username} 
                              hover 
                              onClick={() => {
                                setSelectedUsername(row.username);
                                if (setIsFullScreen) setIsFullScreen(false);
                                setViewMode("single");
                                if (typeof setSelectedFile === "function") setSelectedFile(null);
                              }}
                              sx={{ cursor: "pointer", "&:hover": { bgcolor: "#eff6ff" } }}
                            >
                              <TableCell align="center" sx={{ color: "#64748b", fontSize: "0.85rem" }}>{index + 1}</TableCell>
                              <TableCell sx={{ py: 1.2 }}>
                                <Typography variant="subtitle2" fontWeight="700" sx={{ color: "#2563eb", fontSize: "0.9rem", textDecoration: "underline" }}>
                                  {row.username}
                                </Typography>
                                <Typography variant="caption" sx={{ color: "#64748b", display: "block" }}>
                                  Lớp: {row.teachingClasses.join(", ") || "Chưa gán"} | Môn: {displaySubjects}
                                </Typography>
                              </TableCell>
                              
                              {activeSubjectNames.map((sub) => {
                                const count = row.subjectCounts[sub] || 0;
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
                              <TableCell align="center" sx={{ borderLeft: "1px solid #e2e8f0" }}>
                                <Typography variant="subtitle2" fontWeight="800" sx={{ color: row.totalCount > 0 ? "#dc2626" : "#94a3b8", fontSize: "0.9rem" }}>
                                  {row.totalCount}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          );
                        })}

                        {/* Dòng tổng nhóm */}
                        <TableRow sx={{ bgcolor: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
                          <TableCell align="center" colSpan={2} sx={{ fontWeight: "700", color: "#334155", fontSize: "0.85rem" }}>
                            Tổng {groupData.title.replace("📌 ", "")}:
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
                          <TableCell align="center" sx={{ fontWeight: "800", color: "#1d4ed8", fontSize: "0.95rem", bgcolor: "#eff6ff", borderLeft: "1px solid #e2e8f0" }}>
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
                    <TableCell align="center" sx={{ fontWeight: "bold", color: "#ffffff", fontSize: "1.05rem", bgcolor: "#1e3a8a", borderLeft: "1px solid #1e293b" }}>
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