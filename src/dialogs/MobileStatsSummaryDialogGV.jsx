import React from "react";
import { Box, Typography, IconButton, Dialog, DialogContent } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import TeacherStatsView from "../components/TeacherStatsView";

export default function TeacherStatsDialog({
  open,
  onClose,
  teacherName,
  statsData,
  teacherAssignedSubjects,
  assignedClassesList,
  loadingStats,
  academicYear,
  isMobile,
  activeTeacher,
  activeTab,
  className,
  teacherRole,
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={isMobile} 
      maxWidth="md" // 👉 Cho phép giới hạn kích thước dialog trên desktop thay vì trải rộng 100%
      fullWidth
      PaperProps={{
        sx: {
          // 👉 CĂN GIỮA TUYỆT ĐỐI THEO NGANG VÀ DỌC TRÊN MÁY TÍNH
          m: "auto", 
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "stretch",
          
          width: isMobile ? "100%" : "95vw",
          maxWidth: "1000px", // 👉 Giới hạn độ rộng tối đa để dialog gọn gàng ở giữa màn hình
          height: isMobile ? "100%" : "85vh",
          borderRadius: isMobile ? 0 : "12px",
          backgroundColor: "#ffffff",
          overflow: "hidden",
        },
      }}
    >
      {/* Thanh tiêu đề với đường gạch ngăn cách */}
      <Box
        sx={{
          p: 1,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "2px solid #e2e8f0",
          backgroundColor: "#ffffff",
          flexShrink: 0,
        }}
      >
        <Typography variant="h6" fontWeight="bold" color="primary">
          📊 Thống kê KHBD
        </Typography>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Vùng chứa nội dung */}
      <DialogContent 
        sx={{ 
          p: 0, 
          overflowY: "auto",
          backgroundColor: "#ffffff", 
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Bọc TeacherStatsView trong Box nền trắng để khử hẳn nền xám bên trong */}
        <Box sx={{ p: 2, backgroundColor: "#ffffff", flex: 1, height: "100%" }}>
          <TeacherStatsView
            selectedUsername={teacherName}
            statsData={statsData}
            teacherAllowedSubjects={teacherAssignedSubjects}
            teacherAllowedClasses={assignedClassesList}
            loadingStats={loadingStats}
            academicYear={academicYear}
            activeTeacher={activeTeacher}
            activeTab={activeTab}
            className={className}
            teacherRole={teacherRole}
          />
        </Box>
      </DialogContent>
    </Dialog>
  );
}