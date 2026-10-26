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
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={isMobile} 
      maxWidth={false} // 👈 Tắt giới hạn chuẩn (md, sm...) của Material-UI
      fullWidth
      PaperProps={{
        sx: {
          width: "100%",       // 👈 Ép chiều rộng ngang lấp đầy 100%
          maxWidth: "100%",    // 👈 Xóa bỏ hoàn toàn giới hạn chiều rộng tối đa
          height: isMobile ? "100%" : "85vh",
          margin: isMobile ? 0 : "16px",
          borderRadius: isMobile ? 0 : "16px",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#ffffff",
        },
      }}
    >
      <Box
        sx={{
          p: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #eee",
          backgroundColor: "#fff",
        }}
      >
        <Typography variant="h6" fontWeight="bold" color="primary">
          📊 Thống kê KHBD
        </Typography>
        <IconButton onClick={onClose}>
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
        <TeacherStatsView
          selectedUsername={teacherName}
          statsData={statsData}
          teacherAllowedSubjects={teacherAssignedSubjects}
          teacherAllowedClasses={assignedClassesList}
          loadingStats={loadingStats}
          academicYear={academicYear}
        />
      </DialogContent>
    </Dialog>
  );
}