import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  Typography,
  Box,
  Stack,
  Button,
  IconButton,
  TextField,
  InputAdornment,
  Fade,
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import LockResetRoundedIcon from "@mui/icons-material/LockResetRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";

// 🌟 Import Firebase Firestore đúng với cấu trúc của trang Login
import { db } from "../firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useProfile } from "../contexts/ProfileContext";

// 🌟 Hàm chuẩn hóa ID đồng nhất tuyệt đối với hệ thống mới (VD: "Đặng Thị Thùy Giang" -> "DANG_THI_THUY_GIANG")
const normalizeTeacherId = (name) =>
  String(name || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toUpperCase() || "GIAO_VIEN";

export default function ChangePasswordDialog({ open, onClose }) {
  const { currentUser, setCurrentUser } = useProfile();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("success");
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const resetState = () => {
    setNewPassword("");
    setConfirmPassword("");
    setShowPw(false);
    setShowConfirmPw(false);
    setStatus("");
    setSuccess(false);
    setSaving(false);
  };

  const handleClose = () => {
    if (saving) return;
    resetState();
    onClose();
  };

  const handleChangePassword = async () => {
    const newPw = newPassword.trim();
    const conf = confirmPassword.trim();

    if (!newPw || !conf) {
      setStatus("Vui lòng nhập đầy đủ thông tin mật khẩu.");
      setSeverity("warning");
      return;
    }
    if (newPw !== conf) {
      setStatus("Mật khẩu xác nhận không khớp.");
      setSeverity("error");
      return;
    }
    if (!currentUser || (!currentUser.username && !currentUser.uid)) {
      setStatus("Không tìm thấy thông tin tài khoản hiện tại.");
      setSeverity("error");
      return;
    }

    try {
      setSaving(true);
      setStatus("Đang cập nhật...");
      setSeverity("info");

      // 🌟 Lấy tên tài khoản hiện tại và chuyển thành chuẩn Document ID (VD: DANG_THI_THUY_GIANG)
      const rawName = currentUser.username || currentUser.uid || "";
      const docId = normalizeTeacherId(rawName);

      // 🌟 Cập nhật mật khẩu vào trường 'pass' trong Firestore tại collection DANHSACH_GV với Document ID chuẩn
      const docRef = doc(db, "DANHSACH_GV", docId);
      await updateDoc(docRef, { 
        pass: newPw,
        updatedAt: new Date().toISOString()
      });

      setSuccess(true);
      setStatus("Đổi mật khẩu thành công!");
      setSeverity("success");

      // 🌟 Đồng bộ lại thông tin currentUser trong Context
      if (setCurrentUser) {
        setCurrentUser((prev) => ({
          ...prev,
          pass: newPw,
        }));
      }

      // Tự động đóng Dialog sau 1.5 giây khi thành công
      setTimeout(() => {
        handleClose();
      }, 1500);

    } catch (err) {
      console.error("❌ Lỗi đổi mật khẩu:", err);
      setStatus("Đổi mật khẩu thất bại. Vui lòng thử lại.");
      setSeverity("error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      TransitionComponent={Fade}
      onClose={(event, reason) => {
        if (saving) return;
        if (reason === "backdropClick" || reason === "escapeKeyDown") return;
        handleClose();
      }}
      disableEscapeKeyDown
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          width: "100%",
          maxWidth: "380px", // 🌟 Đồng bộ độ rộng bằng trang Login
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
          onClick={handleClose}
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
          {success ? (
            <CheckCircleRoundedIcon sx={{ fontSize: 28 }} />
          ) : (
            <LockResetRoundedIcon sx={{ fontSize: 28 }} />
          )}
        </Box>

        <Typography sx={{ fontSize: 20, fontWeight: 700, color: "#1e293b", mb: 0.5 }}>
          {success ? "Hoàn tất!" : "Đổi mật khẩu"}
        </Typography>
        <Typography sx={{ fontSize: 13.5, color: "#64748b" }}>
          {success ? "Mật khẩu hệ thống đã được thay đổi an toàn." : "Vui lòng nhập mật khẩu mới cho tài khoản của bạn."}
        </Typography>
      </Box>

      {/* CONTENT */}
      <DialogContent sx={{ px: 3, py: 3.5, bgcolor: "#ffffff" }}>
        <Stack spacing={2.5}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              fontSize: "13.5px",
              color: "#334155",
              textAlign: "center",
              bgcolor: "#f1f5f9",
              py: 1,
              px: 2,
              borderRadius: "10px",
            }}
          >
            🧑 Tài khoản: {(currentUser?.username || currentUser?.uid || "Unknown").toUpperCase()}
          </Typography>

          {!success ? (
            <>
              <TextField
                label="Mật khẩu mới"
                type={showPw ? "text" : "password"}
                fullWidth
                size="medium"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "12px",
                    bgcolor: "#f8fafc",
                    fontSize: "14.5px",
                    "&:hover fieldset": { borderColor: "#94a3b8" },
                    "&.Mui-focused fieldset": { borderColor: "#1976d2", borderWidth: "2px" },
                  },
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton edge="end" onClick={() => setShowPw(!showPw)}>
                        {showPw ? <VisibilityOffRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                label="Xác nhận mật khẩu"
                type={showConfirmPw ? "text" : "password"}
                fullWidth
                size="medium"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                onKeyDown={(e) => e.key === "Enter" && handleChangePassword()}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "12px",
                    bgcolor: "#f8fafc",
                    fontSize: "14.5px",
                    "&:hover fieldset": { borderColor: "#94a3b8" },
                    "&.Mui-focused fieldset": { borderColor: "#1976d2", borderWidth: "2px" },
                  },
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton edge="end" onClick={() => setShowConfirmPw(!showConfirmPw)}>
                        {showConfirmPw ? <VisibilityOffRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              {status && (
                <Typography
                  sx={{
                    color: severity === "error" ? "#ef4444" : severity === "warning" ? "#d97706" : "#3b82f6",
                    fontSize: 13,
                    fontWeight: 500,
                    textAlign: "center",
                    bgcolor: severity === "error" ? "#fef2f2" : "#f8fafc",
                    py: 1,
                    px: 2,
                    borderRadius: "8px",
                  }}
                >
                  {status}
                </Typography>
              )}
            </>
          ) : (
            <Box sx={{ textAlign: "center", py: 2 }}>
              <Typography sx={{ color: "#059669", fontSize: 15, fontWeight: 600 }}>
                Đổi mật khẩu thành công!
              </Typography>
            </Box>
          )}
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
            onClick={handleClose}
            disabled={saving}
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
            {success ? "Đóng" : "Hủy"}
          </Button>

          {!success && (
            <Button
              variant="contained"
              onClick={handleChangePassword}
              disabled={saving}
              sx={{
                flex: 1,
                height: 46,
                borderRadius: "12px",
                textTransform: "none",
                fontWeight: 700,
                fontSize: "14.5px",
                bgcolor: "#1976d2",
                boxShadow: "0 8px 20px rgba(25, 118, 210, 0.3)",
                "&:hover": { bgcolor: "#115293" },
              }}
            >
              {saving ? "Đang lưu..." : "Xác nhận"}
            </Button>
          )}
        </Stack>
      </Box>
    </Dialog>
  );
}