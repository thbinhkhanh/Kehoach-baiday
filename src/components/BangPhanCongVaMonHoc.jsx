import React, { useState } from "react";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Button,
  Grid,
  Checkbox,
  Divider,
} from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";

export default function BangPhanCongVaMonHoc({
  academicYear,
  currentTab,
  setCurrentTab,
  gvcnList,
  taList,
  bmList,
  allSubjects,
  classSubjectMap,
  handleToggleSubjectGrade,
  handleSaveClassSubjectMap,
  savingClassSubject,
}) {
  const [activeGradeTab, setActiveGradeTab] = useState("1");

  const invalidRules = {
    "Công nghệ": ["1", "2"],
    "Khoa học": ["1", "2", "3"],
    "LS-ĐL": ["1", "2", "3"],
    "THXN": ["4", "5"],
    "GDTC": [],
    "HĐTN": [],
  };

  const customOrder = [
    "Toán",
    "Tiếng Việt",
    "Khoa học",
    "Lịch sử và Địa lí",
    "Tự nhiên và Xã hội",
    "Đạo đức",
    "Hoạt động trải nghiệm",
    "Công nghệ",
    "Âm nhạc",
    "Mĩ thuật",
    "Giáo dục thể chất",
    "Tiếng Anh",
    "Tin học",
  ];

  return (
    <Box sx={{ mt: 4 }}>
      {/* ================= PHẦN 2: CẤU HÌNH MÔN HỌC THEO KHỐI LỚP ================= */}
      <Box sx={{ mt: 2 }}>
        <Typography
          sx={{
            fontSize: 18,
            fontWeight: 750,
            color: "#172b4d",
            mb: 1.5,
          }}
        >
          Cấu hình Môn học theo Khối lớp ({academicYear})
        </Typography>

        <Paper
          elevation={0}
          sx={{
            border: "1px solid #e2e8f0",
            borderRadius: 2.5,
            p: 3,
            bgcolor: "#ffffff",
          }}
        >
          <Tabs
            value={activeGradeTab}
            onChange={(e, val) => setActiveGradeTab(val)}
            variant="fullWidth"
            sx={{
              mb: 3,
              borderBottom: "1px solid #e8edf5",
              "& .MuiTab-root": {
                fontWeight: 700,
                fontSize: "0.95rem",
                textTransform: "none",
                borderRadius: "8px 8px 0 0",
              },
              "& .Mui-selected": {
                color: "#2457c5 !important",
                bgcolor: "#f0f4ff",
              },
              "& .MuiTabs-indicator": {
                backgroundColor: "#2457c5",
                height: 3,
              },
            }}
          >
            {["1", "2", "3", "4", "5"].map((cls) => (
              <Tab key={cls} label={`Khối Lớp ${cls}`} value={cls} />
            ))}
          </Tabs>

          <Box sx={{ minHeight: 220 }}>
            {(() => {
              const validSubjects = allSubjects.filter((sub) => {
                const restrictedGrades = invalidRules[sub.name] || [];
                if (restrictedGrades.includes(activeGradeTab)) return false;

                if (sub.grades && sub.grades.length > 0 && !sub.grades.map(String).includes(activeGradeTab)) {
                  return false;
                }
                return true;
              });

              validSubjects.sort((a, b) => {
                const indexA = customOrder.indexOf(a.name);
                const indexB = customOrder.indexOf(b.name);
                if (indexA === -1) return 1;
                if (indexB === -1) return -1;
                return indexA - indexB;
              });

              if (validSubjects.length === 0) {
                return (
                  <Typography align="center" sx={{ py: 4, color: "#64748b" }}>
                    Không có môn học nào cho khối này.
                  </Typography>
                );
              }

              const midpoint = Math.ceil(validSubjects.length / 2);
              const leftColumnSubjects = validSubjects.slice(0, midpoint);
              const rightColumnSubjects = validSubjects.slice(midpoint);

              const renderSubjectCard = (sub) => {
                const activeGrades = classSubjectMap[sub.name] || ["1", "2", "3", "4", "5"];
                const isChecked = activeGrades.includes(activeGradeTab);

                return (
                  <Box
                    key={sub.name}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      py: 1,
                      px: 2,
                      mb: 1.5,
                      borderRadius: 1.5,
                      border: "1px solid",
                      borderColor: isChecked ? "#cbd5e1" : "#e2e8f0",
                      bgcolor: isChecked ? "#f8fafc" : "#ffffff",
                      boxShadow: isChecked ? "0 1px 2px rgba(36,87,197,0.03)" : "none",
                      transition: "all 0.2s",
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, minWidth: 0, flex: 1 }}>
                      <CheckCircleRoundedIcon
                        sx={{ fontSize: 18, color: isChecked ? "#2457c5" : "#cbd5e1", flexShrink: 0 }}
                      />
                      <Typography
                        noWrap
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.9rem",
                          color: "#1e293b",
                        }}
                      >
                        {sub.name}
                      </Typography>
                    </Box>

                    <Checkbox
                      checked={isChecked}
                      onChange={() => handleToggleSubjectGrade(sub.name, activeGradeTab)}
                      color="primary"
                      size="small"
                      sx={{ flexShrink: 0 }}
                    />
                  </Box>
                );
              };

              return (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    width: "100%",
                  }}
                >
                  <Grid
                    container
                    spacing={2.5}
                    sx={{ maxWidth: "780px", width: "100%" }}
                    justifyContent="center"
                  >
                    <Grid item xs={12} sm={6}>
                      {leftColumnSubjects.map((sub) => renderSubjectCard(sub))}
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      {rightColumnSubjects.map((sub) => renderSubjectCard(sub))}
                    </Grid>
                  </Grid>
                </Box>
              );
            })()}
          </Box>

          <Divider sx={{ my: 1.5 }} />

          <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 2, mb: -1 }}>
            <Typography variant="body2" sx={{ color: "#64748b", display: { xs: "none", sm: "block" } }}>
              Nhấn lưu để cập nhật toàn bộ thay đổi cấu hình môn học.
            </Typography>
            <Button
              variant="contained"
              onClick={handleSaveClassSubjectMap}
              disabled={savingClassSubject}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 700,
                bgcolor: "#2457c5",
                px: 3,
                py: 0.6,
                minHeight: "unset",
                "&:hover": { bgcolor: "#1d459e" },
              }}
            >
              {savingClassSubject ? "Đang lưu..." : "Lưu Môn học - Lớp"}
            </Button>
          </Box>
        </Paper>
      </Box>
      
      {/* ================= PHẦN 1: DANH SÁCH PHÂN CÔNG GIẢNG DẠY ================= */}
      <Typography
        sx={{
          fontSize: 18,
          fontWeight: 750,
          color: "#172b4d",
          mb: 2,
        }}
      >
        Danh sách phân công giảng dạy ({academicYear})
      </Typography>

      <Tabs
        value={currentTab}
        onChange={(e, val) => setCurrentTab(val)}
        sx={{
          borderBottom: "1px solid #e8edf5",
          mb: 2.5,
          "& .MuiTab-root": {
            fontWeight: 700,
            textTransform: "none",
            fontSize: "0.95rem",
          },
        }}
      >
        <Tab label={`GV Chủ nhiệm (${gvcnList.length})`} />
        <Tab label={`Giáo viên Tiếng Anh (${taList.length})`} />
        <Tab label={`Giáo viên Bộ môn (${bmList.length})`} />
      </Tabs>

      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          border: "1px solid #e2e8f0",
          borderRadius: 2.5,
          maxHeight: 400,
          mb: 4,
        }}
      >
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, bgcolor: "#f8fafc", width: "70px" }}>STT</TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: "#f8fafc", width: "320px" }}>Họ và tên</TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: "#f8fafc" }}>
                {currentTab === 0 ? "Lớp chủ nhiệm" : currentTab === 1 ? "Môn học" : "Môn / Khối phụ trách"}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {currentTab === 0 &&
              (gvcnList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} align="center" sx={{ py: 3, color: "#64748b" }}>
                    Chưa có giáo viên chủ nhiệm nào.
                  </TableCell>
                </TableRow>
              ) : (
                gvcnList.map((item, idx) => (
                  <TableRow key={item.username} hover>
                    <TableCell>{idx + 1}</TableCell>
                    {/* Thêm noWrap để tên không bị rớt dòng */}
                    <TableCell sx={{ fontWeight: 600 }} noWrap>
                      {item.username}
                    </TableCell>
                    <TableCell>{(item.assignedClass || "Chưa gán").replace(/^lớp\s*/i, "")}</TableCell>
                  </TableRow>
                ))
              ))}

            {currentTab === 1 &&
              (taList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} align="center" sx={{ py: 3, color: "#64748b" }}>
                    Chưa có giáo viên Tiếng Anh nào.
                  </TableCell>
                </TableRow>
              ) : (
                taList.map((item, idx) => (
                  <TableRow key={item.username} hover>
                    <TableCell>{idx + 1}</TableCell>
                    {/* Thêm noWrap để tên không bị rớt dòng */}
                    <TableCell sx={{ fontWeight: 600 }} noWrap>
                      {item.username}
                    </TableCell>
                    <TableCell>{item.assignedSubject || "Tiếng Anh"}</TableCell>
                  </TableRow>
                ))
              ))}

            {currentTab === 2 &&
              (bmList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} align="center" sx={{ py: 3, color: "#64748b" }}>
                    Chưa có giáo viên bộ môn nào.
                  </TableCell>
                </TableRow>
              ) : (
                bmList.map((item, idx) => (
                  <TableRow key={item.username} hover>
                    <TableCell>{idx + 1}</TableCell>
                    {/* Thêm noWrap để tên không bị rớt dòng */}
                    <TableCell sx={{ fontWeight: 600 }} noWrap>
                      {item.username}
                    </TableCell>
                    <TableCell>{item.assignedSubject || "Chưa gán"}</TableCell>
                  </TableRow>
                ))
              ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}