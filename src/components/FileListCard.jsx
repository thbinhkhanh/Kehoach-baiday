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
import CheckCircleIcon from "@mui/icons-material/CheckCircle"; // Icon phụ đánh dấu đã điều chỉnh

export default function FileListCard({
  fileList,
  selectedFile,
  setSelectedFile,
  setFileList,
  formatVNDate,
  onEditFile,
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

            // 🔥 Kiểm tra xem file này đã có dữ liệu điều chỉnh hay chưa
            const hasAdjustmentsData = Boolean(
              file.adjustments ||
              (file.outcomes && (file.outcomes.kienThuc || file.outcomes.nangLuc || file.outcomes.phamChat)) ||
              (file.equipment && (file.equipment.giaoVien || file.equipment.hocSinh)) ||
              (Array.isArray(file.activities) && file.activities.length > 0)
            );

            return (
              <ListItem
                key={file.id || index}
                sx={{
                  mb: 1,
                  // Nếu đã chỉnh sửa, viền item sẽ có màu xanh nổi bật thay vì xám nhạt #ddd
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
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <span>{displayName}</span>
                        {/* Hiển thị huy hiệu nhỏ hoặc dấu hiệu nhận biết ngay cạnh tên file */}
                        {hasAdjustmentsData && (
                          <Tooltip title="Bài đã có nội dung điều chỉnh">
                            <Box
                              component="span"
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
                              }}
                            >
                              <CheckCircleIcon sx={{ fontSize: 13 }} /> Đã điều chỉnh
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
                        // Nếu đã chỉnh sửa, nút bút chì sẽ có nền xanh nhẹ để dễ nhận diện
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