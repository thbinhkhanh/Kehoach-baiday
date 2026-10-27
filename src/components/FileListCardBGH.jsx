import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Tooltip,
  IconButton,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AssignmentLateIcon from "@mui/icons-material/AssignmentLate"; // 👈 Icon yêu cầu điều chỉnh từ BGH

export default function FileListCardBGH({
  fileList,
  selectedFile,
  setSelectedFile,
  loadingFiles,
  setViewMode,
  formatVNDate,
  onRequestAdjustment, // 👈 Hàm callback mở form nhập yêu cầu khi BGH bấm vào icon
  onViewAdjusted,
}) {
  return (
    <Card sx={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <CardContent sx={{ p: 1, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <Typography variant="subtitle1" fontWeight="bold">📂 Danh sách file ({fileList.length})</Typography>
      </CardContent>

      {/* Danh sách file ở Cột Trái */}
      <List sx={{ flex: 1, overflowY: "auto", p: 0.5 }}>
        {loadingFiles ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
            <CircularProgress size={28} />
          </Box>
        ) : fileList.length === 0 ? (
          <ListItem>
            <ListItemText primary="Chưa có file nào." />
          </ListItem>
        ) : (
          fileList.map((file, index) => {
            const isSelected = selectedFile?.fileId === file.fileId;
            const rawName = file.fileName || file.name || file.tieuDe || "";
            const displayName = rawName.replace(/\.[^/.]+$/, "");

            // Kiểm tra trạng thái điều chỉnh và yêu cầu của BGH
            const hasAdjustmentsData = Boolean(file.hasAdjustments || file.activities);
            const hasBghRequest = Boolean(file.bghRequest);
            // Kiểm tra giáo viên đã bấm "Đã hiểu" hay chưa
            const isReadByTeacher = Boolean(file.bghRequestRead);

            return (
              <ListItem
                key={file.id || index}
                onClick={() => {
                  if (typeof setViewMode === "function") {
                    setViewMode("single");
                  }

                  if (window.innerWidth < 600) {
                    window.open(file.fileUrl, "_blank");
                  } else {
                    setSelectedFile(file);
                  }
                }}
                sx={{
                  mb: 1,
                  border: hasAdjustmentsData ? "1.5px solid #1976d2" : "1px solid #ddd",
                  borderRadius: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  p: 0,
                  cursor: "pointer",
                  bgcolor: isSelected ? "rgba(25,118,210,0.1)" : "background.paper",
                  "&:hover": {
                    bgcolor: isSelected ? "rgba(25,118,210,0.15)" : "action.hover",
                  },
                }}
              >
                {/* 1. Vùng Tên tệp và các Chip trạng thái */}
                <Box
                  sx={{
                    flex: 1,
                    py: 1,
                    pl: 1.5,
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                        <span>{displayName}</span>
                        {/* Chip Đã điều chỉnh */}
                        {hasAdjustmentsData && (
                          <Tooltip title="Bài đã có nội dung điều chỉnh - Bấm để xem">
                            <Box
                              component="span"
                              onClick={(e) => {
                                e.stopPropagation(); // Không cho ăn sự kiện click của cả dòng ListItem
                                if (typeof onViewAdjusted === "function") {
                                  onViewAdjusted(file); // 👈 Gọi callback mở chế độ xem
                                }
                              }}
                              sx={{
                                fontSize: "11px",
                                bgcolor: "#e3f2fd",
                                color: "#1565c0",
                                px: 1,
                                py: 0.2,
                                borderRadius: "4px",
                                fontWeight: 600,
                                border: "1px solid #90caf9",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 0.5,
                                cursor: "pointer", // Thêm trỏ tay khi rê chuột vào chip
                                "&:hover": { bgcolor: "#bbdefb" }, // Hiệu ứng khi rê chuột
                              }}
                            >
                              <CheckCircleIcon sx={{ fontSize: 13 }} /> Đã điều chỉnh
                            </Box>
                          </Tooltip>
                        )}

                        {/* 🚀 Chip BGH yêu cầu sửa / Giáo viên đã hiểu */}
                        {hasBghRequest && (
                          <Tooltip title={isReadByTeacher ? "Giáo viên đã xác nhận đọc và hiểu yêu cầu" : "Giáo viên chưa xem yêu cầu"}>
                            <Box
                              component="span"
                              sx={{
                                fontSize: "11px",
                                // Nếu GV đã hiểu -> màu xám nhạt/xanh nhẹ; chưa đọc -> màu cam cảnh báo nổi bật
                                bgcolor: isReadByTeacher ? "#f1f5f9" : "#fff3e0",
                                color: isReadByTeacher ? "#475569" : "#e65100",
                                px: 1,
                                py: 0.2,
                                borderRadius: "4px",
                                fontWeight: 600,
                                border: isReadByTeacher ? "1px solid #cbd5e1" : "1px solid #ffe0b2",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 0.5,
                              }}
                            >
                              {isReadByTeacher ? (
                                <>
                                  <CheckCircleIcon sx={{ fontSize: 13, color: "#16a34a" }} /> GV đã xem yêu cầu
                                </>
                              ) : (
                                <>
                                  <AssignmentLateIcon sx={{ fontSize: 13 }} /> BGH yêu cầu sửa
                                </>
                              )}
                            </Box>
                          </Tooltip>
                        )}
                      </Box>
                    }
                    secondary={`Tải lên: ${formatVNDate(file.createdAt)}`}
                    primaryTypographyProps={{ sx: { fontWeight: "normal" } }}
                    secondaryTypographyProps={{ sx: { fontWeight: "normal" } }}
                    sx={{ my: 0 }}
                  />
                </Box>

                {/* 2. Vùng Icon Gửi/Sửa yêu cầu chỉnh sửa của BGH */}
                <Box
                  component="div"
                  onClick={(e) => e.stopPropagation()}
                  sx={{ px: 2, display: "flex", alignItems: "center" }}
                >
                  <Tooltip title={hasBghRequest ? "Xem/Sửa nội dung yêu cầu điều chỉnh" : "Gửi yêu cầu điều chỉnh cho GV"}>
                    <IconButton
                      size="small"
                      color={hasBghRequest ? "warning" : "default"}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onRequestAdjustment) {
                          onRequestAdjustment(file);
                        }
                      }}
                      sx={{
                        bgcolor: hasBghRequest ? "rgba(237, 108, 2, 0.1)" : "transparent",
                        "&:hover": { bgcolor: "rgba(237, 108, 2, 0.2)" },
                      }}
                    >
                      <AssignmentLateIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </ListItem>
            );
          })
        )}
      </List>
    </Card>
  );
}