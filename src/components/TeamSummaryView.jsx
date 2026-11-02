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

// ======================================================
// HÀM HỖ TRỢ
// ======================================================

const getTeachers = (groupData) => {
  if (Array.isArray(groupData)) return groupData;
  if (Array.isArray(groupData?.rows)) {
    return groupData.rows;
  }
  return [];
};

const getTeacherName = (teacher) =>
  teacher?.teacherName ||
  teacher?.username ||
  teacher?.name ||
  teacher?.teacherId ||
  "Chưa có tên";

const getSubjectTotal = (teacher, subject) => {
  const subjectValue = Number(teacher?.subjects?.[subject]);
  if (
    teacher?.subjects &&
    Object.prototype.hasOwnProperty.call(teacher.subjects, subject) &&
    Number.isFinite(subjectValue)
  ) {
    return subjectValue;
  }

  const oldValue = Number(teacher?.subjectCounts?.[subject]);
  if (
    teacher?.subjectCounts &&
    Object.prototype.hasOwnProperty.call(teacher.subjectCounts, subject) &&
    Number.isFinite(oldValue)
  ) {
    return oldValue;
  }

  const gradeData = teacher?.classBreakdown?.[subject] || {};
  if (
    gradeData &&
    typeof gradeData === "object" &&
    !Array.isArray(gradeData)
  ) {
    return Object.values(gradeData).reduce(
      (sum, count) => sum + (Number(count) || 0),
      0
    );
  }

  return 0;
};

const getTeacherTotal = (teacher, subjects) => {
  if (teacher?.subjects && typeof teacher.subjects === "object") {
    return subjects.reduce(
      (sum, subject) => sum + getSubjectTotal(teacher, subject),
      0
    );
  }

  if (teacher?.subjectCounts && typeof teacher.subjectCounts === "object") {
    return subjects.reduce(
      (sum, subject) => sum + getSubjectTotal(teacher, subject),
      0
    );
  }

  return Number(teacher?.totalFiles) || 0;
};

const getGroupTitle = (groupKey, groupData) => {
  if (groupData?.title) return groupData.title;

  const titles = {
    khoi1: "KHỐI 1",
    khoi2: "KHỐI 2",
    khoi3: "KHỐI 3",
    khoi4: "KHỐI 4",
    khoi5: "KHỐI 5",
    tiengAnh: "TỔ TIẾNG ANH",
    boMon: "TỔ BỘ MÔN",
  };

  return titles[groupKey] || groupKey;
};

export function getGroupTotals(groupData, activeSubjectNames = []) {
  const teachers = getTeachers(groupData);
  const subjectTotals = {};

  activeSubjectNames.forEach((subject) => {
    subjectTotals[subject] = 0;
  });

  let groupGrandTotal = 0;

  const processedRows = teachers.map((teacher, index) => {
    const teacherSubjectCounts = {};

    activeSubjectNames.forEach((subject) => {
      const count = getSubjectTotal(teacher, subject);
      teacherSubjectCounts[subject] = count;
      subjectTotals[subject] += count;
    });

    const teacherRowTotal = getTeacherTotal(teacher, activeSubjectNames);
    groupGrandTotal += teacherRowTotal;

    const assignedSubjects = (teacher.assignedSubjects || []).map((subject) =>
      subject === "Giáo dục thể chất" ? "GDTC" : subject
    );

    const displaySubjects =
      assignedSubjects.length > 0
        ? assignedSubjects.length > 3
          ? `${assignedSubjects.slice(0, 3).join(", ")}...`
          : assignedSubjects.join(", ")
        : activeSubjectNames
            .filter((subject) => getSubjectTotal(teacher, subject) > 0)
            .join(", ");

    return {
      ...teacher,
      index: index + 1,
      username: getTeacherName(teacher),
      displaySubjects,
      teacherSubjectCounts,
      teacherRowTotal,
    };
  });

  return {
    subjectTotals,
    groupGrandTotal,
    teacherCount: teachers.length,
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
  onTitleDetected,
}) {
  const activeGroupedData = schoolSummaryGrouped || {};

  const groupEntries = Object.entries(activeGroupedData).filter(
    ([groupKey, groupData]) =>
      groupKey !== "toBoMon" &&
      (Array.isArray(groupData) || Array.isArray(groupData?.rows))
  );

  // 🌟 Lấy chính xác tên nhóm đang hiển thị trong bảng (ví dụ: KHỐI 2) để truyền ra ngoài
  // 🌟 Chỉ lấy tên của các nhóm thực sự có giáo viên/dữ liệu để hiển thị lên tiêu đề
  React.useEffect(() => {
    if (onTitleDetected && groupEntries.length > 0) {
      const activeTitles = groupEntries
        .map(([groupKey, groupData]) => {
          const teachers = getTeachers(groupData);
          if (teachers.length > 0) {
            const rawTitle = getGroupTitle(groupKey, groupData);
            return rawTitle.replace("📌 ", "").trim();
          }
          return null;
        })
        .filter(Boolean);

      if (activeTitles.length > 0) {
        onTitleDetected(activeTitles.join(" - "));
      }
    }
  }, [schoolSummaryGrouped]);

  const allTeachers = groupEntries.flatMap(([, groupData]) =>
    getTeachers(groupData)
  );

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
    LSĐL: 12,
    HĐTN: 13,
  };

  const activeSubjectNames = React.useMemo(() => {
    const subjectSet = new Set();

    (filteredSubjectNames || []).forEach((subject) => {
      if (subject) subjectSet.add(subject);
    });

    allTeachers.forEach((teacher) => {
      Object.keys(teacher.subjects || {}).forEach((subject) => {
        if (subject) subjectSet.add(subject);
      });
      Object.keys(teacher.classBreakdown || {}).forEach((subject) => {
        if (subject) subjectSet.add(subject);
      });
      (teacher.assignedSubjects || []).forEach((subject) => {
        if (subject) subjectSet.add(subject);
      });
      Object.keys(teacher.subjectCounts || {}).forEach((subject) => {
        if (subject) subjectSet.add(subject);
      });
    });

    return Array.from(subjectSet)
      .filter((subject) => subject && !subject.toLowerCase().includes("tất cả"))
      .sort((a, b) => {
        const shortA = getShortSubjectName ? getShortSubjectName(a) : a;
        const shortB = getShortSubjectName ? getShortSubjectName(b) : b;
        const priorityA = subjectPriority[shortA] || 99;
        const priorityB = subjectPriority[shortB] || 99;
        return priorityA - priorityB;
      });
  }, [filteredSubjectNames, allTeachers, getShortSubjectName]);

  const totalColumns = activeSubjectNames.length + 3;

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
      ) : allTeachers.length === 0 ? (
        <Typography color="text.secondary" align="center" sx={{ mt: 4 }}>
          Không có dữ liệu tổng hợp cho nhóm này.
        </Typography>
      ) : (
        <TableContainer
          component={Paper}
          sx={{
            maxHeight: isFullScreen
              ? "calc(100vh - 80px)"
              : "calc(100vh - 120px)",
            overflow: "auto",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            borderRadius: 2.5,
            border: "1px solid #e2e8f0",
          }}
        >
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell
                  align="center"
                  sx={{
                    bgcolor: "#1e293b",
                    color: "white",
                    fontWeight: "bold",
                    minWidth: 45,
                    fontSize: "0.85rem",
                  }}
                >
                  STT
                </TableCell>
                <TableCell
                  align="center"
                  sx={{
                    bgcolor: "#1e293b",
                    color: "white",
                    fontWeight: "bold",
                    minWidth: 220,
                    fontSize: "0.85rem",
                  }}
                >
                  Họ và tên
                </TableCell>
                {activeSubjectNames.map((subject) => (
                  <TableCell
                    key={subject}
                    align="center"
                    sx={{
                      bgcolor: "#1e293b",
                      color: "white",
                      fontWeight: "bold",
                      minWidth: 65,
                      fontSize: "0.85rem",
                      borderLeft: "1px solid #334155",
                    }}
                  >
                    {getShortSubjectName ? getShortSubjectName(subject) : subject}
                  </TableCell>
                ))}
                <TableCell
                  align="center"
                  sx={{
                    bgcolor: "#0f172a",
                    color: "#38bdf8",
                    fontWeight: "bold",
                    minWidth: 80,
                    fontSize: "0.85rem",
                    borderLeft: "1px solid #334155",
                  }}
                >
                  Tổng số
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {groupEntries.map(([groupKey, groupData]) => {
                const {
                  subjectTotals,
                  groupGrandTotal,
                  processedRows,
                } = getGroupTotals(groupData, activeSubjectNames);

                if (processedRows.length === 0) return null;

                const groupTitle = getGroupTitle(groupKey, groupData);

                return (
                  <React.Fragment key={groupKey}>
                    <TableRow>
                      <TableCell
                        colSpan={totalColumns}
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
                        {groupTitle} ({processedRows.length} giáo viên)
                      </TableCell>
                    </TableRow>

                    {processedRows.map((row) => {
                      const teacherName = getTeacherName(row);

                      return (
                        <TableRow
                          key={row.teacherId || row.username || teacherName}
                          hover
                          onClick={() => {
                            if (setSelectedUsername) {
                              setSelectedUsername(row.teacherId || teacherName);
                            }
                            if (setViewMode) {
                              setViewMode("single");
                            }
                            if (typeof setSelectedFile === "function") {
                              setSelectedFile(null);
                            }
                          }}
                          sx={{
                            cursor: "pointer",
                            "&:hover": { bgcolor: "#eff6ff" },
                          }}
                        >
                          <TableCell
                            align="center"
                            sx={{ color: "#64748b", fontSize: "0.85rem" }}
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
                              {teacherName}
                            </Typography>
                          </TableCell>

                          {activeSubjectNames.map((subject) => {
                            const count =
                              row.teacherSubjectCounts[subject] || 0;
                            const hasData = count > 0;

                            return (
                              <TableCell
                                key={subject}
                                align="center"
                                sx={{ borderLeft: "1px solid #e2e8f0" }}
                              >
                                <Box
                                  sx={{
                                    display: "inline-block",
                                    px: 1.2,
                                    py: 0.4,
                                    borderRadius: 1.5,
                                    fontWeight: 800,
                                    fontSize: "0.85rem",
                                    bgcolor: hasData
                                      ? "#f0f9ff"
                                      : "transparent",
                                    color: hasData ? "#0284c7" : "#cbd5e1",
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
                              bgcolor: "#f8fafc",
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
                      );
                    })}

                    <TableRow
                      sx={{ bgcolor: "#f8fafc", borderTop: "1px solid #e2e8f0" }}
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
                        Tổng {groupTitle.replace("📌 ", "")}:
                      </TableCell>

                      {activeSubjectNames.map((subject) => (
                        <TableCell
                          key={subject}
                          align="center"
                          sx={{
                            fontWeight: "800",
                            color:
                              subjectTotals[subject] > 0
                                ? "#dc2626"
                                : "#cbd5e1",
                            fontSize: "0.9rem",
                            borderLeft: "1px solid #e2e8f0",
                          }}
                        >
                          {subjectTotals[subject] > 0
                            ? subjectTotals[subject]
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
              })}

              {(() => {
                const grandSubjectTotals = {};
                activeSubjectNames.forEach((subject) => {
                  grandSubjectTotals[subject] = allTeachers.reduce(
                    (sum, teacher) =>
                      sum + getSubjectTotal(teacher, subject),
                    0
                  );
                });

                const grandTotal = allTeachers.reduce(
                  (sum, teacher) =>
                    sum + getTeacherTotal(teacher, activeSubjectNames),
                  0
                );

                return (
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

                    {activeSubjectNames.map((subject) => (
                      <TableCell
                        key={subject}
                        align="center"
                        sx={{
                          fontWeight: "bold",
                          color:
                            grandSubjectTotals[subject] > 0
                              ? "#38bdf8"
                              : "#64748b",
                          fontSize: "0.95rem",
                          borderLeft: "1px solid #1e293b",
                        }}
                      >
                        {grandSubjectTotals[subject] > 0
                          ? grandSubjectTotals[subject]
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
                      {grandTotal}
                    </TableCell>
                  </TableRow>
                );
              })()}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}