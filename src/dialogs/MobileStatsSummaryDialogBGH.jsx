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
  // 🌟 Bổ sung đầy đủ các props ngữ cảnh (activeTab, activeTeacher, className, teacherRole) để truyền sang TeacherStatsView
  activeTab,
  activeTeacher,
  className,
  teacherRole,
}) {
  return (
    <Dialog
      open={isMobile && (viewMode === "summary" || viewMode === "personal")}
      onClose={() => setViewMode("single")}
      // Trên mobile bật fullScreen, trên PC hiển thị dạng Popup căn giữa
      fullScreen={isMobile}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          width: isMobile ? "95%" : "90%",
          maxWidth: isMobile ? "95%" : "900px", // Giới hạn chiều rộng tối đa trên PC
          height: isMobile ? "100%" : "85vh", // Chiều cao cố định trên PC
          maxHeight: isMobile ? "85vh" : "85vh",
          margin: isMobile ? 0 : "auto", 
          borderRadius: isMobile ? 3 : "16px",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#ffffff",
        },
      }}
    >
      <Box sx={{ py: 2, px: 2.5, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", backgroundColor: "#fff" }}>
        <Typography variant="subtitle1" fontWeight="800" color="primary" sx={{ fontSize: "1rem" }}>
          {viewMode === "summary" 
            ? (
                activeTab === 0 
                  ? "📊 Tổng hợp Kế hoạch bài dạy" 
                  : activeTab === 1 
                    ? "📊 Tổng hợp Đề KTĐK" 
                    : "📊 Tổng hợp Biên bản"
              )
            : (
                activeTab === 0 
                  ? "📊 Kế hoạch bài dạy" 
                  : activeTab === 1 
                    ? "📊 Đề KTĐK" 
                    : "📊 Biên bản"
              )}
        </Typography>
        <IconButton size="small" onClick={() => setViewMode("single")} sx={{ color: "#64748b", bgcolor: "#f1f5f9" }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
      <DialogContent 
        sx={{ 
          p: isMobile ? 1.5 : 2.5, 
          overflowY: "auto",
          backgroundColor: "#f8fafc",
          flex: 1,
          display: "flex",
          flexDirection: "column",
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
              // 🌟 Truyền đầy đủ props trạng thái tab và giáo viên để đồng bộ chính xác trên mobile
              activeTab={activeTab}
              activeTeacher={activeTeacher}
              className={className}
              teacherRole={teacherRole}
            />
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}