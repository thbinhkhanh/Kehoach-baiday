import React from "react";
import { Box, Typography, IconButton, Dialog, DialogContent } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SchoolSummaryView from "../components/SchoolSummaryView";
import TeacherStatsView from "../components/TeacherStatsView";

export default function MobileStatsSummaryDialog({
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
      fullScreen={isMobile}
      maxWidth={false} // 👈 Tắt giới hạn mặc định để mở rộng hết cỡ chiều ngang
      fullWidth
      PaperProps={{
        sx: {
          width: "100%",
          maxWidth: "100%",
          height: isMobile ? "100%" : "85vh",
          maxHeight: isMobile ? "100vh" : "85vh",
          margin: isMobile ? 0 : "16px",
          borderRadius: isMobile ? 0 : "16px",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#ffffff",
        },
      }}
    >
      <Box sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #eee", backgroundColor: "#fff" }}>
        <Typography variant="h6" fontWeight="bold" color="primary">
          {viewMode === "summary" 
            ? `📊 Bảng tổng hợp toàn trường` 
            : `📊 Thống kê KHBD`}
        </Typography>
        <IconButton onClick={() => setViewMode("single")}>
          <CloseIcon />
        </IconButton>
      </Box>
      <DialogContent 
        sx={{ 
          p: isMobile ? 1 : 2, 
          overflowY: "auto",
          backgroundColor: isMobile ? "#f8f9fa" : "background.default",
          flex: 1,
        }}
      >
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
            getShortSubjectName={getShortSubjectName} // 👈 Truyền hàm viết tắt môn học vào đây
          />
        )}
      </DialogContent>
    </Dialog>
  );
}