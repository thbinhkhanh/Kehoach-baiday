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
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";

export default function ConfirmDeleteAdjustmentDialog({
  open,
  onClose,
  deleting,
  lessonTitle = "",
  onConfirm,
}) {
  return (
    <Dialog
      open={open}
      TransitionComponent={Fade}
      onClose={(event, reason) => {
        if (deleting) return;
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
          background: "linear-gradient(135deg, #fff5f5 0%, #fee2e2 100%)",
          textAlign: "center",
          position: "relative",
          borderBottom: "1px solid #fee2e2",
        }}
      >
        <IconButton
          onClick={onClose}
          disabled={deleting}
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
            bgcolor: "#dc2626",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mx: "auto",
            mb: 2,
            boxShadow: "0 8px 16px rgba(220, 38, 38, 0.25)",
          }}
        >
          <DeleteOutlineRoundedIcon sx={{ fontSize: 28 }} />
        </Box>

        <Typography sx={{ fontSize: 20, fontWeight: 700, color: "#991b1b", mb: 0.5 }}>
          Xóa nội dung điều chỉnh
        </Typography>
        <Typography sx={{ fontSize: 13.5, color: "#b91c1c" }}>
          Hành động này không thể hoàn tác.
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
            Bạn có chắc chắn muốn xóa toàn bộ nội dung điều chỉnh của bài dạy:
          </Typography>

          {/* KHUNG HIỂN THỊ TÊN BÀI DẠY */}
          <Box
            sx={{
              bgcolor: "#f8fafc",
              p: 1.75,
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              maxHeight: "140px",
              overflowY: "auto",
              textAlign: "center",
            }}
          >
            <Typography
              sx={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#0f172a",
                wordBreak: "break-all",
              }}
            >
              {lessonTitle || "Bài dạy"}
            </Typography>
          </Box>

          <Typography
            sx={{
              fontSize: "13px",
              color: "#64748b",
              textAlign: "center",
            }}
          >
            Phần điều chỉnh của KHBD này sẽ bị xóa khỏi hệ thống.
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
            disabled={deleting}
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
            disabled={deleting}
            sx={{
              flex: 1,
              height: 46,
              borderRadius: "12px",
              textTransform: "none",
              fontWeight: 700,
              fontSize: "13.5px",
              bgcolor: "#dc2626",
              boxShadow: "0 8px 20px rgba(220, 38, 38, 0.3)",
              "&:hover": { bgcolor: "#b91c1c" },
            }}
          >
            {deleting ? "Đang xóa..." : "Xóa"}
          </Button>
        </Stack>
      </Box>
    </Dialog>
  );
}