import React from "react";
import { Box, Typography, IconButton, Dialog, DialogContent } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SchoolSummaryView from "../components/SchoolSummaryView";
import TeacherStatsView from "../components/TeacherStatsView";

export default function MobileStatsSummaryDialogBGH({
  viewMode,
  setViewMode,
  isMobile,
  academicYear,
  loadingSchoolSummary,
  schoolSummaryGrouped,
  filteredSubjectNames,
  fetchSchoolSummary,
  getShortSubjectName,
  handleSelectTeacherFromSummary,
  setSelectedFile,
  isFullScreen,
  setIsFullScreen,
  selectedUsername,
  statsData,
  teacherAllowedSubjects,
  teacherAllowedClasses,
  loadingStats,
}) {
  return (
    <Dialog
      open={isMobile && (viewMode === "summary" || viewMode === "personal")}
      onClose={() => setViewMode("single")}
      // 🌟 Nếu trên mobile thì fullScreen, trên PC thì tắt fullScreen để có thể căn giữa
      fullScreen={isMobile}
      maxWidth="md" // 🌟 Đặt giới hạn kích thước PC vừa phải (có thể đổi thành "lg" nếu muốn to hơn)
      fullWidth
      PaperProps={{
        sx: {
          width: isMobile ? "95%" : "90%",
          maxWidth: isMobile ? "95%" : "900px", // Giới hạn chiều rộng tối đa trên PC
          height: isMobile ? "100%" : "85vh", // Chiều cao cố định trên PC
          maxHeight: isMobile ? "85vh" : "85vh",
          // 🌟 Căn giữa tuyệt đối trên màn hình PC bằng margin: "auto"
          margin: isMobile ? 0 : "auto", 
          borderRadius: isMobile ? 3 : "16px",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#ffffff",
        },
      }}
    >
      <Box sx={{ py: 2, px: 2, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #eee", backgroundColor: "#fff" }}>
        <Typography variant="subtitle1" fontWeight="bold" color="primary">
          {viewMode === "summary" 
            ? `📊 TỔNG HỢP TOÀN TRƯỜNG` 
            : `📊 THỐNG KÊ CÁ NHÂN`}
        </Typography>
        <IconButton size="small" onClick={() => setViewMode("single")}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
      <DialogContent 
        sx={{ 
          p: isMobile ? 1 : 2, 
          overflowY: "auto",
          backgroundColor: isMobile ? "#f8f9fa" : "background.default",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          // 🌟 Căn giữa nội dung bên trong theo chiều ngang và dọc (nếu nội dung ngắn)
          alignItems: "center",
        }}
      >
        <Box sx={{ width: "100%", maxWidth: "850px", display: "flex", flexDirection: "column", flex: 1 }}>
          {viewMode === "summary" ? (
            <SchoolSummaryView
              academicYear={academicYear}
              loadingSchoolSummary={loadingSchoolSummary}
              schoolSummaryGrouped={schoolSummaryGrouped}
              filteredSubjectNames={filteredSubjectNames}
              fetchSchoolSummary={fetchSchoolSummary}
              setViewMode={setViewMode}
              getShortSubjectName={getShortSubjectName}
              setSelectedUsername={handleSelectTeacherFromSummary}
              setSelectedFile={setSelectedFile}
              isFullScreen={isFullScreen}
              setIsFullScreen={setIsFullScreen}
            />
          ) : (
            <TeacherStatsView
              selectedUsername={selectedUsername}
              statsData={statsData}
              teacherAllowedSubjects={teacherAllowedSubjects}
              teacherAllowedClasses={teacherAllowedClasses}
              loadingStats={loadingStats}
              academicYear={academicYear}
              getShortSubjectName={getShortSubjectName}
            />
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}