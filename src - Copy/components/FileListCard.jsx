import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";

export default function FileListCard({
  fileList,
  selectedFile,
  setSelectedFile,
  setFileList,
  formatVNDate,
}) {
  return (
    <Card sx={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <CardContent sx={{ p: 1, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <Typography variant="h6">📂 Danh sách file</Typography>
        {fileList.length > 0 && (
          <Box sx={{ display: "flex", alignItems: "center", mr: 1.25 }}>
            <Typography variant="body2" sx={{ mr: 1 }}>Chọn tất cả</Typography>
            <input
              type="checkbox"
              checked={fileList.every((file) => file.selected === true)}
              onChange={(e) => {
                const checked = e.target.checked;
                setFileList((prev) => prev.map((file) => ({ ...file, selected: checked })));
              }}
            />
          </Box>
        )}
      </CardContent>

      <List sx={{ flex: 1, overflowY: "auto", p: 0 }}>
        {fileList.length === 0 ? (
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
                <input
                  type="checkbox"
                  checked={!!file.selected}
                  onChange={(e) => {
                    e.stopPropagation();
                    const checked = e.target.checked;
                    setFileList((prev) =>
                      prev.map((f, i) => (i === index ? { ...f, selected: checked } : f))
                    );
                  }}
                />
              </ListItem>
            );
          })
        )}
      </List>
    </Card>
  );
}