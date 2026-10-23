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
} from "@mui/material";

export default function FileListCardBGH({
  fileList,
  selectedFile,
  setSelectedFile,
  loadingFiles,
  setViewMode,
  formatVNDate,
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
            const displayName = file.fileName || file.name || file.tieuDe;

            return (
              <ListItem
                key={file.id || index}
                onClick={() => {
                  // Tự động tắt chế độ thống kê toàn trường để mở khung xem bài
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
                  border: "1px solid #ddd",
                  borderRadius: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  bgcolor: isSelected ? "rgba(25,118,210,0.1)" : "background.paper",
                  "&:hover": {
                    bgcolor: isSelected ? "rgba(25,118,210,0.15)" : "action.hover",
                  },
                }}
              >
                <ListItemText
                  primary={displayName}
                  secondary={`Tải lên: ${formatVNDate(file.createdAt)}`}
                />
              </ListItem>
            );
          })
        )}
      </List>
    </Card>
  );
}