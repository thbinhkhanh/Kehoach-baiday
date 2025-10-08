import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  Card,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import { useProfile } from "../contexts/ProfileContext";

export default function ChangePassword({ user: propUser }) {
  const { currentUser, setCurrentUser, setAllProfiles } = useProfile();
  const user = propUser || currentUser; // Dùng prop nếu có, ngược lại dùng context

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("");
  const [countdown, setCountdown] = useState(null);
  const navigate = useNavigate();

  // Hàm thay đổi mật khẩu
  const handleChangePassword = async () => {
    const newPw = newPassword.trim();
    const conf = confirmPassword.trim();

    if (!newPw) {
      setStatus("⚠️ Vui lòng nhập mật khẩu mới!");
      return;
    }
    if (newPw !== conf) {
      setStatus("❌ Mật khẩu xác nhận không khớp!");
      return;
    }
    if (!user || !user.email) {
      setStatus("❌ Không tìm thấy tài khoản hiện tại.");
      return;
    }

    try {
      setStatus("⏳ Đang cập nhật...");

      // 🔹 Cập nhật mật khẩu trong Supabase
      const { error } = await supabase
        .from("profiles")
        .update({ custom_password: newPw })
        .eq("email", user.email);

      if (error) throw error;

      setStatus("✅ Đổi mật khẩu thành công.");
      setNewPassword("");
      setConfirmPassword("");

      // 🔹 Fetch lại profile vừa đổi mật khẩu
      try {
        const { data: updatedProfiles, error: fetchError } = await supabase
          .from("profiles")
          .select("id, email, username, custom_password, subject")
          .eq("email", user.email);

        if (fetchError) throw fetchError;
        if (!updatedProfiles || updatedProfiles.length === 0) {
          throw new Error("Không tìm thấy profile vừa đổi mật khẩu");
        }

        const updatedProfile = updatedProfiles[0];

        // 🔹 Cập nhật context
        if (setCurrentUser) setCurrentUser(updatedProfile);
        if (setAllProfiles) {
          setAllProfiles((prev) =>
            prev.map((p) =>
              p.email === updatedProfile.email ? updatedProfile : p
            )
          );
        }
      } catch (err) {
        console.error("❌ Lỗi fetch profile sau khi đổi mật khẩu:", err);
      }

      // 🔹 Bắt đầu đếm ngược quay lại
      setCountdown(3);
    } catch (err) {
      console.error("❌ Lỗi đổi mật khẩu:", err);
      setStatus("❌ Đổi mật khẩu thất bại. Vui lòng thử lại.");
    }
  };

  const handleCancel = () => {
    setNewPassword("");
    setConfirmPassword("");
    setStatus("");
    navigate(-1);
  };

  // Xử lý đếm ngược
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      navigate(-1);
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, navigate]);

  return (
    <Box
      sx={{
        width: "100vw",
        minHeight: "100vh",
        backgroundColor: "#e3f2fd",
        display: "flex",
        flexDirection: "column",
        mt: -2,
      }}
    >
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          mt: 7,
        }}
      >
        <Card
          elevation={10}
          sx={{
            p: 3,
            borderRadius: 4,
            width: { xs: "90%", sm: 350 },
            backgroundColor: "white",
          }}
        >
          <Stack spacing={3} alignItems="center">
            <div style={{ fontSize: 50 }}>🔄</div>

            <Typography variant="h5" fontWeight="bold" color="primary">
              ĐỔI MẬT KHẨU
            </Typography>

            <Typography variant="body1" sx={{ fontWeight: "bold" }}>
              🧑 Tài khoản: {user?.username || user?.email || "Unknown"}
            </Typography>

            <TextField
              label="🆕 Mật khẩu mới"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              fullWidth
              size="small"
            />

            <TextField
              label="✅ Xác nhận mật khẩu"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              fullWidth
              size="small"
              onKeyDown={(e) => e.key === "Enter" && handleChangePassword()}
            />

            <Stack direction="row" spacing={2} width="100%">
              <Button
                variant="contained"
                color="primary"
                onClick={handleChangePassword}
                fullWidth
              >
                🔁 CẬP NHẬT
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                onClick={handleCancel}
                fullWidth
              >
                🔙 HỦY
              </Button>
            </Stack>

            {status && (
              <>
                <Typography
                  variant="body2"
                  sx={{
                    color: status.startsWith("✅") ? "green" : "red",
                    textAlign: "center",
                    fontSize: "0.95rem",
                  }}
                >
                  {status}
                </Typography>

                {countdown !== null && (
                  <Typography
                    variant="body2"
                    sx={{
                      color: "red",
                      textAlign: "center",
                      fontSize: "0.95rem",
                      mt: 0.5,
                    }}
                  >
                    ⏳ Trang sẽ quay lại sau {countdown} giây...
                  </Typography>
                )}
              </>
            )}
          </Stack>
        </Card>
      </Box>
    </Box>
  );
}
