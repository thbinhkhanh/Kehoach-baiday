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
import AssignmentLateIcon from "@mui/icons-material/AssignmentLate";
import DownloadRounded from "@mui/icons-material/DownloadRounded";

export default function FileListCardBGH({
  fileList,
  selectedFile,
  setSelectedFile,
  loadingFiles,
  setViewMode,
  formatVNDate,
  onRequestAdjustment,
  onViewAdjusted,
  activeTab = 0,
}) {
  // 🌟 1. ĐẶT HÀM TẢI NGẦM Ở ĐÂY (TRƯỚC LỆNH RETURN)
  const handleDownloadSilent = async (e, file) => {
    e.stopPropagation(); // Không cho lan sự kiện click dòng
    const downloadLink = file.fileId 
      ? `https://docs.google.com/uc?export=download&id=${file.fileId}` 
      : (file.downloadUrl || file.fileUrl);

    try {
      const response = await fetch(downloadLink);
      const blob = await response.blob();
      
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = file.fileName || file.name || "De_KTDV.docx";
      
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Lỗi tải ngầm, đang chuyển sang chế độ dự phòng:", error);
      window.open(downloadLink, "_self");
    }
  };

  return (
    <Card sx={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <CardContent sx={{ p: 1, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <Typography variant="subtitle1" fontWeight="bold">📂 Danh sách file ({fileList.length})</Typography>
      </CardContent>

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

            const hasAdjustmentsData = Boolean(file.hasAdjustments || file.activities);
            const hasBghRequest = Boolean(file.bghRequest);
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
                  // 🌟 Đã đặt lại viền chuẩn chung cho tất cả các thẻ (bỏ viền xanh cũ)
                  border: "1px solid #ddd",
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
                        {hasAdjustmentsData && (
                          <Tooltip title="Bài đã có nội dung điều chỉnh - Bấm để xem">
                            <Box
                              component="span"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (typeof onViewAdjusted === "function") {
                                  onViewAdjusted(file);
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
                                cursor: "pointer",
                                "&:hover": { bgcolor: "#bbdefb" },
                              }}
                            >
                              <CheckCircleIcon sx={{ fontSize: 13 }} /> Đã điều chỉnh
                            </Box>
                          </Tooltip>
                        )}

                        {hasBghRequest && (
                          <Tooltip title={isReadByTeacher ? "Giáo viên đã xác nhận đọc và hiểu yêu cầu" : "Giáo viên chưa xem yêu cầu"}>
                            <Box
                              component="span"
                              sx={{
                                fontSize: "11px",
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

                <Box
                  component="div"
                  onClick={(e) => e.stopPropagation()}
                  sx={{ px: 2, display: "flex", alignItems: "center" }}
                >
                  {activeTab === 1 ? (
                    // 🌟 2. GỌI HÀM TẢI NGẦM TRONG SỰ KIỆN CLICK CỦA TAB 1
                    <Tooltip title="Tải xuống đề kiểm tra">
                      <IconButton
                        size="small"
                        onClick={(e) => handleDownloadSilent(e, file)}
                        sx={{
                          color: "#2563eb",
                          bgcolor: "#eff6ff",
                          border: "1px solid #bae6fd",
                          "&:hover": { bgcolor: "#dbeafe" },
                          height: 32,
                          width: 32,
                        }}
                      >
                        <DownloadRounded fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : (
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
                  )}
                </Box>
              </ListItem>
            );
          })
        )}
      </List>
    </Card>
  );
}