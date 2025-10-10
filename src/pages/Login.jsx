import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  Card,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  AppBar,
  Toolbar,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import { useProfile } from "../contexts/ProfileContext";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [usernames, setUsernames] = useState([]);
  const [usernameMap, setUsernameMap] = useState({});
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const { allProfiles, setAllProfiles } = useProfile();

/// Khi component mount
useEffect(() => {
  setPassword("");
}, []);

// Reset ô mật khẩu khi username thay đổi
useEffect(() => {
  setPassword("");
}, [username]);

  // 🔹 Lấy danh sách tài khoản
  useEffect(() => {
    const fetchUsernames = async () => {
      if (allProfiles && allProfiles.length > 0) {
        setUsernames(allProfiles.map((u) => u.username));
        const map = {};
        allProfiles.forEach((u) => (map[u.username] = u));
        setUsernameMap(map);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("username, email, custom_password");
        if (error) throw error;

        setUsernames(data.map((u) => u.username));
        const map = {};
        data.forEach((u) => (map[u.username] = u));
        setUsernameMap(map);
        setAllProfiles(data);
      } catch (err) {
        console.error("❌ Lỗi khi lấy danh sách username:", err);
      }
    };
    fetchUsernames();
  }, []);

  // 🔹 Xử lý đăng nhập

  const handleLogin = async (e) => {
  e.preventDefault();
  setError("");

  if (!username || !password) {
    setError("⚠️ Vui lòng chọn tên và nhập mật khẩu!");
    return;
  }

  const profile = usernameMap[username];
  if (!profile) {
    setError("Username không tồn tại!");
    return;
  }

  if (!profile.custom_password || profile.custom_password !== password) {
    setError("Sai mật khẩu!");
    return;
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password: "123", // dùng mật khẩu mặc định cho Supabase
    });

    if (error) throw error;

    const user = data.user;

    // ✅ Xác định vai trò và trang điều hướng
    let role = "user";
    let targetPath = "/upload";

    if (profile.email === "thbinhkhanh@gmail.com") {
      role = "admin";
      targetPath = "/admin";
    } else if (profile.email === "chuyenmon@gmail.com") {
      role = "bgh";
      targetPath = "/bgh";
    }

    // ✅ Lưu thông tin user đang đăng nhập
    onLogin({
      uid: user.id,
      email: user.email,
      username: profile.username,
      role,
    });

    navigate(targetPath);
  } catch (err) {
    console.error("❌ Lỗi đăng nhập:", err.message || err);
    setError("Mật khẩu không chính xác!");
  }
};

  const handleLogin1 = async (e) => {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError("⚠️ Vui lòng chọn tên và nhập mật khẩu!");
      return;
    }

    const profile = usernameMap[username];
    if (!profile) {
      setError("Username không tồn tại!");
      return;
    }

    if (!profile.custom_password || profile.custom_password !== password) {
      setError("Sai mật khẩu!");
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: "123",
      });

      if (error) throw error;

      const user = data.user;
      const role = profile.email === "thbinhkhanh@gmail.com" ? "admin" : "user";

      onLogin({
        uid: user.id,
        email: user.email,
        username: profile.username,
        role,
      });

      if (role === "admin") navigate("/admin");
      else navigate("/upload");
    } catch (err) {
      console.error("❌ Lỗi đăng nhập:", err.message || err);
      setError("Mật khẩu không chính xác!");
    }
  };

  return (
    <Box
      sx={{
        width: "100vw",
        minHeight: "100vh",
        backgroundColor: "#e3f2fd",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* 🔵 Thanh tiêu đề cố định */}
      <AppBar position="fixed" sx={{ background: "#1976d2" }}>
        <Toolbar
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            minHeight: "46px !important",
            px: { xs: 2.5 },
            gap: 1,
            ml: -3,
          }}
        >
          <img
            src="/Logo.png"
            alt="Logo"
            style={{ height: "40px", flexShrink: 0, marginLeft: 8 }}
          />
          <Typography variant="h6" sx={{ color: "white" }}>
            TỔ BỘ MÔN
          </Typography>
        </Toolbar>
      </AppBar>

      {/* 🔹 Banner nằm ngay dưới AppBar */}
      <Box sx={{ mt: { xs: 5, sm: 5, md: 5 } }}>
        <Box
          sx={{
            position: "relative",
            width: "100%",
            height: { xs: 100, sm: 140, md: 180 },
            backgroundImage: "url('/banner.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mb: 2,
            "&::before": {
              content: '""',
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.4)",
              zIndex: 1,
            },
          }}
        >
          <Box
            sx={{ position: "relative", zIndex: 2, textAlign: "center", px: 1 }}
          >
            <Typography
              variant="h5"
              color="white"
              //fontWeight="bold"
              sx={{ fontSize: { xs: "1.2rem", sm: "1.8rem", md: "2.2rem" } }}
            >
              KẾ HOẠCH BÀI DẠY TRỰC TUYẾN
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* 🧩 Form đăng nhập */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          mt: 2,
          px: 2, // tránh dính lề
        }}
      >
        <Card
          elevation={10}
          sx={{
            p: { xs: 3, sm: 4 },
            borderRadius: 4,
            width: { xs: "90%", sm: 350, md: 350 }, // 👈 Mobile: 90%, Desktop: giữ nguyên
            maxWidth: 350,                     // 👈 Giới hạn tối đa
            mx: "auto",
            backgroundColor: "white",
          }}
        >
          <Stack spacing={3} alignItems="center">
            <div style={{ fontSize: 50 }}>🔐</div>

            <Typography variant="h5" fontWeight="bold" color="primary">
              ĐĂNG NHẬP
            </Typography>

            <FormControl fullWidth size="small">
              <InputLabel>👤 Tài khoản</InputLabel>
              <Select
                value={username}
                label="Tài khoản"
                onChange={(e) => setUsername(e.target.value)}
              >
                {usernames
                  .sort((a, b) => {
                    const normalize = (s) => s?.toLowerCase().trim() || "";
                    const aName = normalize(a);
                    const bName = normalize(b);

                    const isAdminA =
                      aName.includes("admin") || aName.includes("thbinhkhanh");
                    const isAdminB =
                      bName.includes("admin") || bName.includes("thbinhkhanh");

                    const isBGHA =
                      aName === "bgh" ||
                      aName.includes("ban giám hiệu") ||
                      aName.includes("chuyenmon");
                    const isBGHB =
                      bName === "bgh" ||
                      bName.includes("ban giám hiệu") ||
                      bName.includes("chuyenmon");

                    if (isAdminA && !isAdminB) return 1;
                    if (!isAdminA && isAdminB) return -1;
                    if (isBGHA && !isBGHB) return 1;
                    if (!isBGHA && isBGHB) return -1;

                    const getLastName = (fullName) =>
                      fullName?.trim().split(" ").slice(-1)[0]?.toLowerCase() || "";
                    return getLastName(a).localeCompare(getLastName(b), "vi");
                  })
                  .map((name) => (
                    <MenuItem key={name} value={name}>
                      {name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              size="small"
              type="password"
              label="🔑 Mật khẩu"
              placeholder="Nhập mật khẩu"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin(e)}
            />

            {error && (
              <Typography color="error" fontSize="0.9rem" textAlign="center">
                {error}
              </Typography>
            )}

            <Button
              variant="contained"
              color="primary"
              onClick={handleLogin}
              fullWidth
              sx={{
                fontWeight: "bold",
                textTransform: "none",
                fontSize: "1rem",
              }}
            >
              🔐 Đăng nhập
            </Button>
          </Stack>
        </Card>
      </Box>
    </Box>
  );


}
