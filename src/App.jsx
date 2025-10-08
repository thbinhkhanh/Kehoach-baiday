// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AppBar, Toolbar, Typography, Box, Menu, MenuItem, IconButton } from "@mui/material";
import AccountCircle from "@mui/icons-material/AccountCircle";
import { supabase } from "./supabase";
import Login from "./pages/Login";
import Users from "./pages/Users";
import Admin from "./pages/Admin";
import BGH from "./pages/BGH";
import { ProfileProvider, useProfile } from "./contexts/ProfileContext";
import ChangePassword from "./pages/ChangePassword"; // tạo component mới
import MenuIcon from "@mui/icons-material/Menu";

function PrivateRoute({ user, children }) {
  return user ? children : <Navigate to="/" replace />;
}

function AppContent() {
  const { currentUser, setCurrentUser } = useProfile(); // lấy user từ context
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);
  const handleMenu = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  // Nếu chưa có user → render Login
  if (!currentUser) return <Login onLogin={setCurrentUser} />;

  const displayName = currentUser.username || currentUser.email;

  return (
    <>
      <AppBar position="fixed" sx={{ background: "#1976d2" }}>
        <Toolbar
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            minHeight: "44px !important",
            px: 0, // bỏ padding trái phải
          }}
        >
          {/* Logo + Tiêu đề */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: -2 }}>
            <img
              src="/Logo.png"
              alt="Logo"
              style={{ height: "40px", flexShrink: 0 }}
            />
            <Typography variant="h6" sx={{ color: "white" }}>
              KẾ HOẠCH BÀI DẠY TRỰC TUYẾN
            </Typography>
          </Box>

          {/* Phần user/account */}
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <AccountCircle sx={{ mr: 1, color: "white" }} />
            <Typography sx={{ color: "white", mr: 1 }}> {displayName}</Typography>

            <IconButton size="large" color="inherit" onClick={handleMenu}>
              <MenuIcon />
            </IconButton>

            <Menu
              anchorEl={anchorEl}
              open={open}
              onClose={handleClose}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
            >
              <MenuItem
                onClick={() => {
                  handleClose();
                  navigate("/change-password");
                }}
              >
                Đổi mật khẩu
              </MenuItem>
              <MenuItem
                onClick={async () => {
                  handleClose();
                  try {
                    await supabase.auth.signOut();
                    setCurrentUser(null);
                    navigate("/", { replace: true });
                  } catch (err) {
                    console.error("❌ Lỗi đăng xuất:", err);
                  }
                }}
              >
                Đăng xuất
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Box sx={{ paddingTop: "60px" }}>
        <Routes>
          {/* 🔹 Trang Admin */}
          <Route
            path="/admin"
            element={
              <PrivateRoute user={currentUser}>
                {currentUser.email === "thbinhkhanh@gmail.com" ? (
                  <Admin user={currentUser} />
                ) : (
                  <Navigate to="/" replace />
                )}
              </PrivateRoute>
            }
          />

          {/* 🔹 Trang BGH (Chuyên môn) */}
          <Route
            path="/bgh"
            element={
              <PrivateRoute user={currentUser}>
                {currentUser.email === "chuyenmon@gmail.com" ? (
                  <BGH user={currentUser} />
                ) : (
                  <Navigate to="/" replace />
                )}
              </PrivateRoute>
            }
          />

          {/* 🔹 Trang người dùng bình thường */}
          <Route
            path="/upload"
            element={
              <PrivateRoute user={currentUser}>
                <Users user={currentUser} />
              </PrivateRoute>
            }
          />

          {/* 🔹 Trang đổi mật khẩu */}
          <Route
            path="/change-password"
            element={
              <PrivateRoute user={currentUser}>
                <ChangePassword user={currentUser} />
              </PrivateRoute>
            }
          />

          {/* 🔹 Điều hướng mặc định */}
          <Route
            path="*"
            element={
              <Navigate
                to={
                  currentUser.email === "thbinhkhanh@gmail.com"
                    ? "/admin"
                    : currentUser.email === "chuyenmon@gmail.com"
                    ? "/bgh"
                    : "/upload"
                }
                replace
              />
            }
          />
        </Routes>

      </Box>
    </>
  );
}

export default function App() {
  return (
    <ProfileProvider>
      <Router>
        <AppContent />
      </Router>
    </ProfileProvider>
  );
}
