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
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import EditNoteRoundedIcon from "@mui/icons-material/EditNoteRounded";

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
      {/* HEADER */}
      <Box
        sx={{
          pt: 4,
          pb: 3,
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
            width: 56,
            height: 56,
            borderRadius: "50%",
            bgcolor: "#1976d2",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mx: "auto",
            mb: 2,
            boxShadow: "0 8px 16px rgba(25, 118, 210, 0.25)",
          }}
        >
          <EditNoteRoundedIcon sx={{ fontSize: 28 }} />
        </Box>

        <Typography sx={{ fontSize: 20, fontWeight: 700, color: "#1e293b", mb: 0.5 }}>
          Quản lý yêu cầu điều chỉnh
        </Typography>
        <Typography sx={{ fontSize: 13.5, color: "#64748b" }}>
          Gửi hoặc cập nhật yêu cầu điều chỉnh bài dạy cho giáo viên.
        </Typography>
      </Box>

      {/* CONTENT */}
      <DialogContent sx={{ px: 3, py: 3.5, bgcolor: "#ffffff" }}>
        <Stack spacing={2.5}>
          {/* Thông tin giáo viên / môn / lớp */}
          <Typography
            variant="body2"
            sx={{
              fontWeight: 500,
              fontSize: "13.5px",
              color: "#334155",
              textAlign: "center",
              bgcolor: "#f1f5f9",
              py: 1.5,
              px: 2,
              borderRadius: "10px",
              lineHeight: 1.6,
            }}
          >
            🧑‍🏫 Giáo viên: <b>{selectedUsername || "---"}</b><br />
            📚 Môn: <b>{subject || "---"}</b> | 🏫 Lớp: <b>{className || "---"}</b>
          </Typography>

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
      <Box sx={{ px: 3, pb: 4, pt: 1, display: "flex", justifyContent: "space-between", alignItems: "center", bgcolor: "#ffffff" }}>
        {/* Nút Xóa yêu cầu: Chỉ hiện nếu đã có yêu cầu */}
        {hasExistingRequest ? (
          <Button
            variant="outlined"
            color="error"
            onClick={handleDeleteBghRequest}
            disabled={saving}
            sx={{
              height: 46,
              borderRadius: "12px",
              textTransform: "none",
              fontWeight: 600,
              fontSize: "14px",
              px: 2.5,
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
              height: 46,
              borderRadius: "12px",
              textTransform: "none",
              fontWeight: 600,
              fontSize: "14.5px",
              borderColor: "#cbd5e1",
              color: "#475569",
              px: 2.5,
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
              height: 46,
              borderRadius: "12px",
              textTransform: "none",
              fontWeight: 700,
              fontSize: "14.5px",
              bgcolor: "#1976d2",
              boxShadow: "0 10px 20px rgba(25, 118, 210, 0.3)",
              px: 3,
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