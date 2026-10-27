import React from "react";
import {
  Dialog,
  DialogContent,
  Typography,
  Box,
  Stack,
  Button,
  IconButton,
  TextField,
  Fade,
  Chip,
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import EditNoteRoundedIcon from "@mui/icons-material/EditNoteRounded";
import PersonIcon from "@mui/icons-material/Person";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import ClassRoundedIcon from "@mui/icons-material/ClassRounded";

export default function BghRequestManageDialog({
  open,
  onClose,
  selectedUsername,
  subject,
  className,
  bghRequestText,
  setBghRequestText,
  hasExistingRequest,
  handleDeleteBghRequest,
  handleSaveBghRequest,
  saving = false,
}) {
  return (
    <Dialog
      open={open}
      TransitionComponent={Fade}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          width: "100%",
          maxWidth: "480px",
          borderRadius: "20px",
          overflow: "hidden",
          background: "#ffffff",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          p: 0,
        },
      }}
    >
      {/* HEADER - Đã thu hẹp chiều cao gọn gàng hơn */}
      <Box
        sx={{
          pt: 2.5,
          pb: 2,
          px: 3,
          background: "linear-gradient(135deg, #f0f7ff 0%, #e1effe 100%)",
          textAlign: "center",
          position: "relative",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <IconButton
          onClick={onClose}
          disabled={saving}
          sx={{
            position: "absolute",
            right: 12,
            top: 12,
            color: "#64748b",
            bgcolor: "rgba(255, 255, 255, 0.7)",
            "&:hover": { bgcolor: "#fee2e2", color: "#ef4444" },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>

        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            bgcolor: "#1976d2",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mx: "auto",
            mb: 1.5,
            boxShadow: "0 6px 12px rgba(25, 118, 210, 0.2)",
          }}
        >
          <EditNoteRoundedIcon sx={{ fontSize: 24 }} />
        </Box>

        <Typography sx={{ fontSize: 18, fontWeight: 700, color: "#1e293b", mb: 0.3 }}>
          Quản lý yêu cầu điều chỉnh
        </Typography>
        <Typography sx={{ fontSize: 12.5, color: "#64748b" }}>
          Gửi hoặc cập nhật yêu cầu điều chỉnh bài dạy cho giáo viên.
        </Typography>
      </Box>

      {/* CONTENT */}
      <DialogContent sx={{ px: 3, py: 3, bgcolor: "#ffffff" }}>
        <Stack spacing={2}>
          {/* Thông tin giáo viên / môn / lớp - Đã định dạng lại theo yêu cầu */}
          <Box
            sx={{
              p: 2,
              bgcolor: "#f8fafc",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              display: "flex",
              flexDirection: "column",
              gap: 1.2,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <PersonIcon sx={{ fontSize: 18, color: "#1976d2" }} />
              <Typography variant="body2" sx={{ fontWeight: 700, color: "#1e293b", fontSize: "14px" }}>
                🧑‍🏫 Giáo viên: <Box component="span" sx={{ color: "#1976d2" }}>{selectedUsername || "---"}</Box>
              </Typography>
            </Box>

            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
              <Chip 
                icon={<MenuBookRoundedIcon sx={{ fontSize: "15px !important" }} />}
                label={`Môn: ${subject || "---"}`} 
                size="small" 
                sx={{ bgcolor: "#e0f2fe", color: "#0369a1", fontWeight: 600, border: "none" }}
              />
              <Chip 
                icon={<ClassRoundedIcon sx={{ fontSize: "15px !important" }} />}
                label={`Lớp: ${className || "---"}`} 
                size="small" 
                sx={{ bgcolor: "#dcfce7", color: "#15803d", fontWeight: 600, border: "none" }}
              />
            </Box>
          </Box>

          {/* Ô nhập nội dung */}
          <TextField
            multiline
            rows={5}
            fullWidth
            value={bghRequestText}
            onChange={(e) => setBghRequestText(e.target.value)}
            placeholder="Nhập nội dung yêu cầu giáo viên điều chỉnh..."
            disabled={saving}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "12px",
                bgcolor: "#f8fafc",
                fontSize: "14.5px",
                padding: "12px",
                "&:hover fieldset": { borderColor: "#94a3b8" },
                "&.Mui-focused fieldset": { borderColor: "#1976d2", borderWidth: "2px" },
              },
            }}
          />
        </Stack>
      </DialogContent>

      {/* ACTIONS */}
      <Box sx={{ px: 3, pb: 3, pt: 1, display: "flex", justifyContent: "space-between", alignItems: "center", bgcolor: "#ffffff" }}>
        {/* Nút Xóa yêu cầu: Chỉ hiện nếu đã có yêu cầu */}
        {hasExistingRequest ? (
          <Button
            variant="outlined"
            color="error"
            onClick={handleDeleteBghRequest}
            disabled={saving}
            sx={{
              height: 42,
              borderRadius: "10px",
              textTransform: "none",
              fontWeight: 600,
              fontSize: "13.5px",
              px: 2,
              borderColor: "#fecaca",
              color: "#dc2626",
              "&:hover": { bgcolor: "#fee2e2", borderColor: "#fca5a5" },
            }}
          >
            Xóa yêu cầu
          </Button>
        ) : (
          <Box />
        )}

        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            onClick={onClose}
            disabled={saving}
            sx={{
              height: 42,
              borderRadius: "10px",
              textTransform: "none",
              fontWeight: 600,
              fontSize: "13.5px",
              borderColor: "#cbd5e1",
              color: "#475569",
              px: 2,
              "&:hover": { borderColor: "#94a3b8", bgcolor: "#f1f5f9" },
            }}
          >
            Hủy
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveBghRequest}
            disabled={saving}
            sx={{
              height: 42,
              borderRadius: "10px",
              textTransform: "none",
              fontWeight: 700,
              fontSize: "13.5px",
              bgcolor: "#1976d2",
              boxShadow: "0 4px 12px rgba(25, 118, 210, 0.25)",
              px: 2.5,
              "&:hover": { bgcolor: "#115293" },
            }}
          >
            {saving ? "Đang gửi..." : "Gửi yêu cầu"}
          </Button>
        </Stack>
      </Box>
    </Dialog>
  );
}