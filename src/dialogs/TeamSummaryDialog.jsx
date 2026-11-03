import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  IconButton,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import TeamSummaryView from "../components/TeamSummaryView";
import { handleExportExcel } from "../utils/exportSchoolSummary";

export default function TeamSummaryDialog({
  open,
  onClose,
  academicYear,
  schoolSummaryGrouped,
  filteredSubjectNames,
  getShortSubjectName,
  setSelectedUsername,
  setSelectedFile,
  setSnackbar,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [groupTitle, setGroupTitle] = useState("TỔ / KHỐI"); // 🌟 Lưu tên nhóm nhận về

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={isMobile || isFullScreen}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          width: isMobile ? "95%" : "90%",
          maxWidth: isMobile ? "95%" : "900px", // Giới hạn chiều rộng tối đa trên PC
          height: isMobile || isFullScreen ? "85%" : "85vh",
          borderRadius: isMobile || isFullScreen ? 3 : "16px",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      {/* 🌟 THANH TIÊU ĐỀ HIỂN THỊ ĐÚNG TÊN KHỐI/TỔ THEO YÊU CẦU */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          px: 2,
          py: 2,
          bgcolor: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          flexShrink: 0,
        }}
      >
        <Typography variant="subtitle1" fontWeight="bold" sx={{ color: "#1e293b", fontSize: "0.95rem" }}>
          📊 BẢNG TỔNG HỢP {groupTitle}
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {!isMobile && (
            <Tooltip title={isFullScreen ? "Thu nhỏ màn hình" : "Phóng to toàn màn hình"}>
              <IconButton
                color="primary"
                onClick={() => setIsFullScreen(!isFullScreen)}
                sx={{
                  bgcolor: "#f8fafc",
                  border: "1px solid #cbd5e1",
                  "&:hover": { bgcolor: "#f1f5f9", borderColor: "#94a3b8" },
                  height: 32,
                  width: 32,
                  p: 0.5,
                }}
              >
                {isFullScreen ? (
                  <FullscreenExitIcon sx={{ color: "#475569", fontSize: "1.2rem" }} />
                ) : (
                  <FullscreenIcon sx={{ color: "#475569", fontSize: "1.2rem" }} />
                )}
              </IconButton>
            </Tooltip>
          )}

          <Tooltip title="Xuất Báo Cáo Excel">
            <IconButton
              color="primary"
              onClick={() =>
                handleExportExcel({
                  schoolSummaryGrouped,
                  academicYear,
                  filteredSubjectNames,
                  setSnackbar: setSnackbar || (() => {}),
                })
              }
              sx={{
                bgcolor: "#eff6ff",
                border: "1px solid #bae6fd",
                "&:hover": { bgcolor: "#dbeafe" },
                height: 32,
                width: 32,
                p: 0.5,
              }}
            >
              <FileDownloadIcon sx={{ color: "#2563eb", fontSize: "1.1rem" }} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Đóng">
            <IconButton
              size="small"
              onClick={onClose}
              sx={{
                color: "#64748b",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                bgcolor: "#f8fafc",
                "&:hover": { bgcolor: "#fee2e2", color: "#dc2626", borderColor: "#fca5a5" },
                height: 32,
                width: 32,
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Nội dung bảng tổng hợp tổ */}
      <DialogContent sx={{ p: 0, overflowY: "auto", flex: 1, bgcolor: "#fafafa" }}>
        <TeamSummaryView
          academicYear={academicYear}
          schoolSummaryGrouped={schoolSummaryGrouped}
          filteredSubjectNames={filteredSubjectNames}
          getShortSubjectName={getShortSubjectName}
          setViewMode={onClose}
          setSelectedUsername={(username) => {
            if (setSelectedUsername) setSelectedUsername(username);
            onClose();
          }}
          setSelectedFile={setSelectedFile}
          isFullScreen={isFullScreen}
          setIsFullScreen={setIsFullScreen}
          setSnackbar={setSnackbar}
          onTitleDetected={(title) => setGroupTitle(title)} // 👈 Nhận tên khối/tổ đẩy lên tiêu đề dialog
        />
      </DialogContent>
    </Dialog>
  );
}