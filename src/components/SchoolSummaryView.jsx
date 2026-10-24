import React from "react";
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
}) {
  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box sx={{ display: { xs: "none", sm: "flex" }, py: 1.2, px: 2, bgcolor: "#ffffff", justifyContent: "space-between", alignItems: "center", flexShrink: 0, borderBottom: "1px solid #e2e8f0" }}>
        <Typography variant="subtitle1" fontWeight="bold" sx={{ color: "#1e293b", fontSize: "1rem" }}>
          📊 BẢNG TỔNG HỢP TOÀN TRƯỜNG  ({academicYear})
        </Typography>
        <Box sx={{ display: { xs: "none", sm: "flex" }, gap: 1 }}>
          <Button size="small" variant="outlined" onClick={() => fetchSchoolSummary()} disabled={loadingSchoolSummary} sx={{ borderColor: "#cbd5e1", color: "#475569" }}>
            🔄 Làm mới
          </Button>
          <Button size="small" variant="contained" onClick={() => setViewMode("single")} sx={{ bgcolor: "#2563eb", "&:hover": { bgcolor: "#1d4ed8" } }}>
            Xem cá nhân
          </Button>
        </Box>
      </Box>

      <Box sx={{ flex: 1, p: 2, overflow: "auto", bgcolor: "#fafafa" }}>
        {loadingSchoolSummary ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "200px" }}>
            <CircularProgress />
          </Box>
        ) : Object.keys(schoolSummaryGrouped).length === 0 ? (
          <Typography color="text.secondary" align="center" sx={{ mt: 4 }}>
            Chưa có dữ liệu tổng hợp.
          </Typography>
        ) : (
          <TableContainer component={Paper} sx={{ maxHeight: "calc(100vh - 180px)", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", borderRadius: 2.5, border: "1px solid #e2e8f0" }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "#1e293b" }}>
                  <TableCell 
                    align="center" 
                    sx={{ fontWeight: "bold", bgcolor: "#1e293b", color: "white", minWidth: 50, fontSize: "0.85rem" }}
                  >
                    STT
                  </TableCell>
                  
                  <TableCell 
                    align="center" 
                    sx={{ fontWeight: "bold", bgcolor: "#1e293b", color: "white", minWidth: 200, fontSize: "0.85rem" }}
                  >
                    Họ và tên
                  </TableCell>

                  {filteredSubjectNames.map((sub) => (
                    <TableCell 
                      key={sub} 
                      align="center" 
                      sx={{ fontWeight: "bold", bgcolor: "#1e293b", color: "white", minWidth: 60, fontSize: "0.85rem" }}
                    >
                      {getShortSubjectName(sub)}
                    </TableCell>
                  ))}

                  <TableCell 
                    align="center" 
                    sx={{ fontWeight: "bold", bgcolor: "#0f172a", color: "#38bdf8", minWidth: 80, fontSize: "0.85rem" }}
                  >
                    Tổng số
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(schoolSummaryGrouped).map(([groupKey, groupData]) => {
                  if (!groupData.rows || groupData.rows.length === 0) return null;

                  const groupTotals = {};
                  let groupGrandTotal = 0;
                  filteredSubjectNames.forEach((sub) => {
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
                          colSpan={filteredSubjectNames.length + 3}
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

                      {groupData.rows.map((row, index) => (
                        <TableRow 
                          key={row.username} 
                          hover 
                          onClick={() => {
                            setSelectedUsername(row.username);
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
                              Lớp: {row.teachingClasses.join(", ") || "Chưa gán"} | Môn: {row.assignedSubjects.join(", ") || row.role}
                            </Typography>
                          </TableCell>
                          {filteredSubjectNames.map((sub) => {
                            const count = row.subjectCounts[sub] || 0;
                            const hasData = count > 0;
                            return (
                              <TableCell key={sub} align="center">
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
                          <TableCell align="center">
                            <Typography variant="subtitle2" fontWeight="800" sx={{ color: row.totalCount > 0 ? "#dc2626" : "#94a3b8", fontSize: "0.9rem" }}>
                              {row.totalCount}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}

                      <TableRow sx={{ bgcolor: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
                        <TableCell align="center" colSpan={2} sx={{ fontWeight: "700", color: "#334155", fontSize: "0.85rem" }}>
                          Tổng {groupData.title.replace("📌 ", "")}:
                        </TableCell>
                        {filteredSubjectNames.map((sub) => (
                          <TableCell key={sub} align="center" sx={{ fontWeight: "800", color: groupTotals[sub] > 0 ? "#dc2626" : "#cbd5e1", fontSize: "0.9rem" }}>
                            {groupTotals[sub] > 0 ? groupTotals[sub] : "—"}
                          </TableCell>
                        ))}
                        <TableCell align="center" sx={{ fontWeight: "800", color: "#1d4ed8", fontSize: "0.95rem", bgcolor: "#eff6ff" }}>
                          {groupGrandTotal}
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Box>
  );
}