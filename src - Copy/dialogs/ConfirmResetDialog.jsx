import React from "react";
import {
  Dialog,
  DialogContent,
  Typography,
  Box,
  Stack,
  Button,
  IconButton,
  Fade,
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import VpnKeyRoundedIcon from "@mui/icons-material/VpnKeyRounded";
import LockResetOutlinedIcon from "@mui/icons-material/LockResetOutlined";

export default function ConfirmResetDialog({
  open,
  onClose,
  resetting,
  teacherNameToReset,
  onConfirm,
}) {
  return (
    <Dialog
      open={open}
      TransitionComponent={Fade}
      onClose={(event, reason) => {
        if (resetting) return;
        if (reason === "backdropClick" || reason === "escapeKeyDown") return;
        onClose();
      }}
      disableEscapeKeyDown
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          width: "100%",
          maxWidth: "380px",
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
          background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
          textAlign: "center",
          position: "relative",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <IconButton
          onClick={onClose}
          disabled={resetting}
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
            bgcolor: "#d97706",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mx: "auto",
            mb: 2,
            boxShadow: "0 8px 16px rgba(217, 119, 6, 0.25)",
          }}
        >
          <VpnKeyRoundedIcon sx={{ fontSize: 28 }} />
        </Box>

        <Typography sx={{ fontSize: 20, fontWeight: 700, color: "#b45309", mb: 0.5 }}>
          Reset mật khẩu
        </Typography>
        <Typography sx={{ fontSize: 13.5, color: "#92400e" }}>
          Đặt lại thông tin đăng nhập cho giáo viên.
        </Typography>
      </Box>

      {/* CONTENT */}
      <DialogContent sx={{ px: 3, py: 3.5, bgcolor: "#ffffff" }}>
        <Stack spacing={2}>
          <Typography
            variant="body2"
            sx={{
              fontSize: "14px",
              color: "#334155",
              lineHeight: 1.6,
              textAlign: "center",
            }}
          >
            Bạn có chắc chắn muốn đặt lại mật khẩu của giáo viên:
          </Typography>

          <Box
            sx={{
              bgcolor: "#f8fafc",
              p: 1.75,
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              textAlign: "center",
            }}
          >
            <Typography
              sx={{
                fontSize: "15px",
                fontWeight: 700,
                color: "#0f172a",
              }}
            >
              {teacherNameToReset?.trim() || "Giáo viên"}
            </Typography>
          </Box>

          <Typography
            sx={{
              fontSize: "13px",
              color: "#64748b",
              textAlign: "center",
            }}
          >
            Mật khẩu mới sau khi đặt lại sẽ là <strong style={{ color: "#2563eb" }}>123</strong>.
          </Typography>
        </Stack>
      </DialogContent>

      {/* ACTIONS */}
      <Box sx={{ px: 3, pb: 4, pt: 1, display: "flex", justifyContent: "center", bgcolor: "#ffffff" }}>
        <Stack
          direction="row"
          spacing={2}
          justifyContent="center"
          alignItems="center"
          sx={{ width: "100%", maxWidth: 320 }}
        >
          <Button
            variant="outlined"
            onClick={onClose}
            disabled={resetting}
            sx={{
              flex: 1,
              height: 46,
              borderRadius: "12px",
              textTransform: "none",
              fontWeight: 600,
              fontSize: "14.5px",
              borderColor: "#cbd5e1",
              color: "#475569",
              "&:hover": { borderColor: "#94a3b8", bgcolor: "#f1f5f9" },
            }}
          >
            Hủy
          </Button>

          <Button
            variant="contained"
            onClick={onConfirm}
            disabled={resetting}
            startIcon={<LockResetOutlinedIcon />}
            sx={{
              flex: 1,
              height: 46,
              borderRadius: "12px",
              textTransform: "none",
              fontWeight: 700,
              fontSize: "13.5px",
              bgcolor: "#d97706",
              boxShadow: "0 8px 20px rgba(217, 119, 6, 0.3)",
              "&:hover": { bgcolor: "#b45309" },
            }}
          >
            {resetting ? "Đang reset..." : "Xác nhận"}
          </Button>
        </Stack>
      </Box>
    </Dialog>
  );
}