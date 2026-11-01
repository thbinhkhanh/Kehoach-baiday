import React from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";

/**
 * 🌟 Hàm hỗ trợ tính toán tổng hợp dữ liệu theo từng Nhóm (Khối hoặc Tổ)
 */
export function getGroupTotals(groupData, activeSubjectNames = []) {
  if (!groupData || !groupData.rows || groupData.rows.length === 0) {
    return {
      subjectTotals: {},
      groupGrandTotal: 0,
      teacherCount: 0,
      processedRows: [],
    };
  }

  const subjectTotals = {};
  activeSubjectNames.forEach((sub) => {
    subjectTotals[sub] = 0;
  });

  let groupGrandTotal = 0;

  const processedRows = groupData.rows.map((row, index) => {
    const assignedSubjects = (row.assignedSubjects || []).map((sub) =>
      sub === "Giáo dục thể chất" ? "GDTC" : sub
    );

    let teacherRowTotal = 0;
    const teacherSubjectCounts = {};

    activeSubjectNames.forEach((sub) => {
      const count = Number(row.subjectCounts?.[sub] || 0);
      teacherSubjectCounts[sub] = count;
      subjectTotals[sub] += count;
      teacherRowTotal += count;
    });

    groupGrandTotal += teacherRowTotal;

    const displaySubjects =
      assignedSubjects.length > 2
        ? `${assignedSubjects[0]}...`
        : assignedSubjects.join(", ") || row.role;

    return {
      ...row,
      index: index + 1,
      displaySubjects,
      teacherSubjectCounts,
      teacherRowTotal,
    };
  });

  return {
    subjectTotals,
    groupGrandTotal,
    teacherCount: groupData.rows.length,
    processedRows,
  };
}

export default function TeamSummaryView({
  loadingSchoolSummary,
  schoolSummaryGrouped,
  filteredSubjectNames,
  setViewMode,
  getShortSubjectName,
  setSelectedUsername,
  setSelectedFile,
  isFullScreen,
  setIsFullScreen,
}) {
  const activeGroupedData = schoolSummaryGrouped || {};

  // 2. TỰ ĐỘNG LỌC CỘT MÔN HỌC ĐỘNG
  // 🌟 Bảng thứ tự ưu tiên hiển thị các cột môn học từ trái sang phải
  const subjectPriority = {
    TA: 1,
    TH: 2,
    CN: 3,
    GDTC: 4,
    AN: 5,
    MT: 6,
    Toán: 7,
    TV: 8,
    ĐĐ: 9,
    TNXH: 10,
    KH: 11,
    "LSĐL": 12,
    HĐTN: 13,
  };

  // 🌟 Lấy danh sách cột môn học đầy đủ, gộp chung các nguồn và sắp xếp theo đúng thứ tự ưu tiên
  const activeSubjectNames = React.useMemo(() => {
    let subSet = new Set(filteredSubjectNames || []);

    Object.values(activeGroupedData).forEach((groupData) => {
      groupData.rows?.forEach((row) => {
        row.assignedSubjects?.forEach((s) => {
          if (s && !s.toLowerCase().includes("tất cả")) subSet.add(s);
        });
        if (row.subjectCounts) {
          Object.keys(row.subjectCounts).forEach((s) => {
            if (s) subSet.add(s);
          });
        }
      });
    });

    let uniqueSubjects = Array.from(subSet).filter(
      (subName) => subName && !subName.toLowerCase().includes("tất cả")
    );

    // Sắp xếp các cột môn học theo đúng bảng thứ tự ưu tiên
    uniqueSubjects.sort((a, b) => {
      const shortA = getShortSubjectName ? getShortSubjectName(a) : a;
      const shortB = getShortSubjectName ? getShortSubjectName(b) : b;
      const prioA = subjectPriority[shortA] || 99;
      const prioB = subjectPriority[shortB] || 99;
      return prioA - prioB;
    });

    return uniqueSubjects;
  }, [filteredSubjectNames, activeGroupedData, getShortSubjectName]);

  return (
    <Box
      sx={{
        flex: 1,
        p: { xs: 1, sm: 2 },
        overflow: "auto",
        bgcolor: "#fafafa",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {loadingSchoolSummary ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "200px",
          }}
        >
          <CircularProgress />
        </Box>
      ) : Object.keys(activeGroupedData).length === 0 ? (
        <Typography color="text.secondary" align="center" sx={{ mt: 4 }}>
          Không có dữ liệu tổng hợp cho nhóm này.
        </Typography>
      ) : (
        (() => {
          const grandSchoolTotals = {};
          let grandSchoolTotalCount = 0;

          activeSubjectNames.forEach((sub) => {
            grandSchoolTotals[sub] = 0;
          });

          Object.values(activeGroupedData).forEach((groupData) => {
            const { subjectTotals, groupGrandTotal } = getGroupTotals(
              groupData,
              activeSubjectNames
            );
            activeSubjectNames.forEach((sub) => {
              grandSchoolTotals[sub] += subjectTotals[sub] || 0;
            });
            grandSchoolTotalCount += groupGrandTotal;
          });

          return (
            <TableContainer
              component={Paper}
              sx={{
                maxHeight: isFullScreen
                  ? "calc(100vh - 80px)"
                  : "calc(100vh - 120px)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                borderRadius: 2.5,
                border: "1px solid #e2e8f0",
              }}
            >
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "#1e293b" }}>
                    <TableCell
                      align="center"
                      sx={{
                        fontWeight: "bold",
                        bgcolor: "#1e293b",
                        color: "white",
                        minWidth: 45,
                        fontSize: "0.85rem",
                      }}
                    >
                      STT
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{
                        fontWeight: "bold",
                        bgcolor: "#1e293b",
                        color: "white",
                        minWidth: 200,
                        fontSize: "0.85rem",
                      }}
                    >
                      Họ và tên
                    </TableCell>

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
                          borderRight: "1px solid #334155",
                        }}
                      >
                        {getShortSubjectName ? getShortSubjectName(sub) : sub}
                      </TableCell>
                    ))}

                    <TableCell
                      align="center"
                      sx={{
                        fontWeight: "bold",
                        bgcolor: "#0f172a",
                        color: "#38bdf8",
                        minWidth: 70,
                        fontSize: "0.85rem",
                        borderLeft: "1px solid #334155",
                      }}
                    >
                      Tổng số
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(activeGroupedData).map(
                    ([groupKey, groupData]) => {
                      if (
                        !groupData.rows ||
                        groupData.rows.length === 0
                      )
                        return null;

                      const {
                        subjectTotals,
                        groupGrandTotal,
                        processedRows,
                      } = getGroupTotals(groupData, activeSubjectNames);

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
                              {groupData.title} ({processedRows.length} giáo viên)
                            </TableCell>
                          </TableRow>

                          {processedRows.map((row) => (
                            <TableRow
                              key={row.username}
                              hover
                              onClick={() => {
                                setSelectedUsername(row.username);
                                if (setIsFullScreen)
                                  setIsFullScreen(false);
                                if (setViewMode) setViewMode("single");
                                if (
                                  typeof setSelectedFile === "function"
                                )
                                  setSelectedFile(null);
                              }}
                              sx={{
                                cursor: "pointer",
                                "&:hover": { bgcolor: "#eff6ff" },
                              }}
                            >
                              <TableCell
                                align="center"
                                sx={{
                                  color: "#64748b",
                                  fontSize: "0.85rem",
                                }}
                              >
                                {row.index}
                              </TableCell>
                              <TableCell sx={{ py: 1.2 }}>
                                <Typography
                                  variant="subtitle2"
                                  fontWeight="700"
                                  sx={{
                                    color: "#2563eb",
                                    fontSize: "0.9rem",
                                    textDecoration: "underline",
                                  }}
                                >
                                  {row.username}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: "#64748b",
                                    display: "block",
                                  }}
                                >
                                  Lớp:{" "}
                                  {row.teachingClasses?.join(", ") ||
                                    "Chưa gán"}{" "}
                                  | Môn: {row.displaySubjects}
                                </Typography>
                              </TableCell>

                              {activeSubjectNames.map((sub) => {
                                const count =
                                  row.teacherSubjectCounts[sub] || 0;
                                const hasData = count > 0;
                                return (
                                  <TableCell
                                    key={sub}
                                    align="center"
                                    sx={{
                                      borderLeft:
                                        "1px solid #e2e8f0",
                                      borderRight:
                                        "1px solid #e2e8f0",
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
                                        bgcolor: hasData
                                          ? "#f0f9ff"
                                          : "transparent",
                                        color: hasData
                                          ? "#0284c7"
                                          : "#cbd5e1",
                                        border: hasData
                                          ? "1px solid #bae6fd"
                                          : "none",
                                      }}
                                    >
                                      {hasData ? count : "—"}
                                    </Box>
                                  </TableCell>
                                );
                              })}
                              <TableCell
                                align="center"
                                sx={{
                                  borderLeft: "1px solid #e2e8f0",
                                }}
                              >
                                <Typography
                                  variant="subtitle2"
                                  fontWeight="800"
                                  sx={{
                                    color:
                                      row.teacherRowTotal > 0
                                        ? "#dc2626"
                                        : "#94a3b8",
                                    fontSize: "0.9rem",
                                  }}
                                >
                                  {row.teacherRowTotal}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}

                          {/* Dòng tổng nhóm */}
                          <TableRow
                            sx={{
                              bgcolor: "#f8fafc",
                              borderTop: "1px solid #e2e8f0",
                            }}
                          >
                            <TableCell
                              align="center"
                              colSpan={2}
                              sx={{
                                fontWeight: "700",
                                color: "#334155",
                                fontSize: "0.85rem",
                              }}
                            >
                              Tổng {groupData.title.replace("📌 ", "")}:
                            </TableCell>

                            {activeSubjectNames.map((sub) => (
                              <TableCell
                                key={sub}
                                align="center"
                                sx={{
                                  fontWeight: "800",
                                  color:
                                    subjectTotals[sub] > 0
                                      ? "#dc2626"
                                      : "#cbd5e1",
                                  fontSize: "0.9rem",
                                  borderLeft: "1px solid #e2e8f0",
                                  borderRight: "1px solid #e2e8f0",
                                }}
                              >
                                {subjectTotals[sub] > 0
                                  ? subjectTotals[sub]
                                  : "—"}
                              </TableCell>
                            ))}
                            <TableCell
                              align="center"
                              sx={{
                                fontWeight: "800",
                                color: "#1d4ed8",
                                fontSize: "0.95rem",
                                bgcolor: "#eff6ff",
                                borderLeft: "1px solid #e2e8f0",
                              }}
                            >
                              {groupGrandTotal}
                            </TableCell>
                          </TableRow>
                        </React.Fragment>
                      );
                    }
                  )}

                  {/* DÒNG TỔNG TOÀN TRƯỜNG */}
                  <TableRow
                    sx={{
                      bgcolor: "#0f172a",
                      borderTop: "3px double #3b82f6",
                    }}
                  >
                    <TableCell
                      align="center"
                      colSpan={2}
                      sx={{
                        fontWeight: "bold",
                        color: "#38bdf8",
                        fontSize: "0.95rem",
                        py: 1.5,
                      }}
                    >
                      🏆 TỔNG TỔ / KHỐI
                    </TableCell>
                    {activeSubjectNames.map((sub) => (
                      <TableCell
                        key={sub}
                        align="center"
                        sx={{
                          fontWeight: "bold",
                          color:
                            grandSchoolTotals[sub] > 0
                              ? "#38bdf8"
                              : "#64748b",
                          fontSize: "0.95rem",
                          borderLeft: "1px solid #1e293b",
                          borderRight: "1px solid #1e293b",
                        }}
                      >
                        {grandSchoolTotals[sub] > 0
                          ? grandSchoolTotals[sub]
                          : "—"}
                      </TableCell>
                    ))}
                    <TableCell
                      align="center"
                      sx={{
                        fontWeight: "bold",
                        color: "#ffffff",
                        fontSize: "1.05rem",
                        bgcolor: "#1e3a8a",
                        borderLeft: "1px solid #1e293b",
                      }}
                    >
                      {grandSchoolTotalCount}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          );
        })()
      )}
    </Box>
  );
}