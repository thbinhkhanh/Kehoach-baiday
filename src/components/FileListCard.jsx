import React, { useState, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AssignmentLateIcon from "@mui/icons-material/AssignmentLate"; // 👈 Icon thông báo yêu cầu từ BGH

export default function FileListCard({
  fileList,
  selectedFile,
  setSelectedFile,
  setFileList,
  formatVNDate,
  onEditFile,
  onOpenBghRequest, // 👈 Hàm callback mở dialog xem nội dung yêu cầu của BGH (nếu có)
  onOpenAdjustment, // 👈 Hàm callback mở dialog xem nội dung điều chỉnh
}) {
  const listRef = useRef(null);
  const [hasScrollbar, setHasScrollbar] = useState(false);

  // Tự động kiểm tra sự tồn tại của thanh cuộn dọc
  useEffect(() => {
    const checkScrollbar = () => {
      if (listRef.current) {
        const { scrollHeight, clientHeight } = listRef.current;
        setHasScrollbar(scrollHeight > clientHeight);
      }
    };

    checkScrollbar();
    window.addEventListener("resize", checkScrollbar);
    return () => window.removeEventListener("resize", checkScrollbar);
  }, [fileList]);

  return (
    <Card sx={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <CardContent sx={{ p: 1, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <Typography variant="h6">📂 Danh sách file</Typography>
        {fileList.length > 0 && (
          <Box sx={{ display: "flex", alignItems: "center", mr: hasScrollbar ? 3 : 1 }}>
            <Typography variant="body2" sx={{ mr: 1 }}>Chọn tất cả</Typography>
            <input
              type="checkbox"
              checked={fileList.every((file) => file.selected === true)}
              onChange={(e) => {
                const checked = e.target.checked;
                setFileList((prev) => prev.map((file) => ({ ...file, selected: checked })));
                if (selectedFile) {
                  setSelectedFile(null);
                }
              }}
              style={{ width: "18px", height: "18px", cursor: "pointer" }}
            />
          </Box>
        )}
      </CardContent>

      {/* Gắn ref vào List để đo kích thước */}
      <List ref={listRef} sx={{ flex: 1, overflowY: "auto", p: 0 }}>
        {fileList.length === 0 ? (
          <ListItem>
            <ListItemText primary="Chưa có file nào." />
          </ListItem>
        ) : (
          fileList.map((file, index) => {
            const isSelected = selectedFile?.fileId === file.fileId;
            const rawName = file.fileName || file.name || file.tieuDe || "";
            const displayName = rawName.replace(/\.[^/.]+$/, "");

            // Kiểm tra xem file đã từng lưu điều chỉnh chưa
            const hasAdjustmentsData = Boolean(
              file.activities !== undefined ||
              file.outcomes !== undefined ||
              file.equipment !== undefined ||
              file.adjustments !== undefined ||
              file.hasAdjustments === true
            );

            // 🔥 Kiểm tra xem BGH có gửi yêu cầu chỉnh sửa hay không
            const hasBghRequest = Boolean(file.bghRequest);

            return (
              <ListItem
                key={file.id || index}
                sx={{
                  mb: 1,
                  border: hasAdjustmentsData ? "1.5px solid #1976d2" : "1px solid #ddd",
                  borderRadius: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  p: 0,
                  bgcolor: isSelected ? "rgba(25,118,210,0.1)" : "background.paper",
                }}
              >
                {/* 1. Vùng Tên tệp (Xem trước) */}
                <Box
                  onClick={() => {
                    if (window.innerWidth < 600) {
                      window.open(file.fileUrl, "_blank");
                    } else {
                      setSelectedFile(file);
                    }
                  }}
                  sx={{
                    flex: 1,
                    cursor: "pointer",
                    py: 1,
                    pl: 1.5,
                    "&:hover": {
                      bgcolor: isSelected ? "rgba(25,118,210,0.15)" : "action.hover",
                    },
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                        <span>{displayName}</span>
                        
                        {/* Chip Đã điều chỉnh */}
                        {hasAdjustmentsData && (
                          <Tooltip title="Bấm để xem nội dung điều chỉnh">
                            <Box
                              component="span"
                              onClick={(e) => {
                                e.stopPropagation(); // Ngăn không cho click lan ra ngoài (không mở xem trước file)
                                if (onOpenAdjustment) {
                                  onOpenAdjustment(file);
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
                                "&:hover": { bgcolor: "#bbdefb" }
                              }}
                            >
                              <CheckCircleIcon sx={{ fontSize: 13 }} /> Đã điều chỉnh
                            </Box>
                          </Tooltip>
                        )}

                        {/* 🚀 Chip BGH yêu cầu sửa / Đã hiểu */}
                        {hasBghRequest && (
                          <Tooltip title={file.bghRequestRead ? "BGH đã yêu cầu (Bạn đã xác nhận đã hiểu)" : "Bấm để xem nội dung yêu cầu điều chỉnh từ BGH"}>
                            <Box
                              component="span"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onOpenBghRequest) {
                                  onOpenBghRequest(file);
                                }
                              }}
                              sx={{
                                fontSize: "11px",
                                bgcolor: file.bghRequestRead ? "#f1f5f9" : "#fff3e0",
                                color: file.bghRequestRead ? "#475569" : "#e65100",
                                px: 1,
                                py: 0.2,
                                borderRadius: "4px",
                                fontWeight: 600,
                                border: file.bghRequestRead ? "1px solid #cbd5e1" : "1px solid #ffe0b2",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 0.5,
                                cursor: "pointer",
                                "&:hover": { bgcolor: file.bghRequestRead ? "#e2e8f0" : "#ffe0b2" }
                              }}
                            >
                              {file.bghRequestRead ? (
                                <>
                                  <CheckCircleIcon sx={{ fontSize: 13, color: "#16a34a" }} /> BGH yêu cầu sửa (đã xem)
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

                {/* 2. Vùng Icon Chỉnh sửa */}
                <Box
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onEditFile) {
                      onEditFile(file);
                    }
                  }}
                  sx={{ px: 1, display: "flex", alignItems: "center" }}
                >
                  <Tooltip title={hasAdjustmentsData ? "Đã có điều chỉnh - Bấm để sửa" : "Mở form điều chỉnh"}>
                    <IconButton
                      size="small"
                      color={hasAdjustmentsData ? "primary" : "default"}
                      sx={{
                        bgcolor: hasAdjustmentsData ? "rgba(25,118,210,0.1)" : "transparent",
                        "&:hover": { bgcolor: "rgba(25,118,210,0.2)" },
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>

                {/* 3. Vùng Checkbox */}
                <Box
                  component="div"
                  onClick={(e) => e.stopPropagation()}
                  sx={{ px: 2, display: "flex", alignItems: "center" }}
                >
                  <input
                    type="checkbox"
                    checked={!!file.selected}
                    onChange={(e) => {
                      e.stopPropagation();
                      const checked = e.target.checked;
                      setFileList((prev) =>
                        prev.map((f, i) => (i === index ? { ...f, selected: checked } : f))
                      );
                      if (selectedFile) {
                        setSelectedFile(null);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    style={{ cursor: "pointer", width: "18px", height: "18px" }}
                  />
                </Box>
              </ListItem>
            );
          })
        )}
      </List>
    </Card>
  );
}