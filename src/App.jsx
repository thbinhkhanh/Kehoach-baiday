import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { AppBar, Toolbar, Typography, Box, Menu, MenuItem, IconButton, Button, Stack } from "@mui/material";
import AccountCircle from "@mui/icons-material/AccountCircle";
import Users from "./pages/Users";
import Admin from "./pages/Admin";
import BGH from "./pages/BGH";
import Dashboard from "./pages/Dashboard"; 
import { ProfileProvider, useProfile } from "./contexts/ProfileContext";
import { LessonPlanProvider } from "./contexts/LessonPlanContext";
import { BGHStatsProvider } from "./contexts/BGHStatsContext";

import ChangePasswordDialog from "./dialogs/ChangePasswordDialog"; 
import MenuIcon from "@mui/icons-material/Menu";
import PhanQuyen from "./pages/PhanQuyen";
import LockResetIcon from "@mui/icons-material/LockReset";
import LogoutIcon from "@mui/icons-material/Logout";
import Login from "./pages/Login";

// 🌟 Bổ sung các icon phóng to / thu nhỏ còn thiếu
import ZoomInRoundedIcon from "@mui/icons-material/ZoomInRounded";
import ZoomOutRoundedIcon from "@mui/icons-material/ZoomOutRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";

function AppContent() {
  const { currentUser, setCurrentUser } = useProfile();
  const navigate = useNavigate();
  const location = useLocation(); // 🌟 Lấy thông tin đường dẫn hiện tại
  const [anchorEl, setAnchorEl] = useState(null);
  const [openChangePassword, setOpenChangePassword] = useState(false); 
  const [zoomLogo, setZoomLogo] = useState(false);
  const [logoScale, setLogoScale] = useState(1);

  const open = Boolean(anchorEl);
  const handleMenu = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  // Kiểm tra xem có đang ở trang Dashboard (trang chủ "/") hay không
  const isDashboard = location.pathname === "/";
  const isLoginPage = location.pathname === "/login";

  // Tên hiển thị đầy đủ và tên rút gọn (lấy chữ cuối cho mobile)
  const displayName = currentUser?.username || "Chưa đăng nhập";
  const shortName = currentUser?.username ? currentUser.username.trim().split(/\s+/).pop() : "Chưa đăng nhập";

  const lowerName = currentUser?.username?.toLowerCase() || "";
  const isAdmin = lowerName === "admin" || currentUser?.role === "admin";
  const isBGH = lowerName === "bgh" || lowerName.includes("chuyên môn") || currentUser?.role === "bgh";

  // Hàm xử lý Đăng xuất
  const handleLogout = () => {
    handleClose();
    if (setCurrentUser) setCurrentUser(null);
    navigate("/");
  };

  return (
    <>
      {/* 🔵 Thanh tiêu đề đồng bộ kích thước chuẩn phẳng với Login */}
      {!isLoginPage && (
      <AppBar 
        position="fixed" 
        elevation={0}
        sx={{ 
          background: "#1976d2",
          boxShadow: "none", // Loại bỏ hoàn toàn bóng đổ
        }}
      >
        <Toolbar
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            minHeight: "38px !important", // Giảm chiều cao tối thiểu xuống 38px
            py: 0.5, // Padding dọc nhỏ gọn
            px: { xs: 2.5 },
          }}
        >
          {/* Logo + Tiêu đề */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              ml: -2,
              whiteSpace: "nowrap",
              overflowX: "auto",
            }}
          >
            {/* Sử dụng Logo2.png hiển thị trên thanh màu xanh */}
            <img
              src="/Logo2.png"
              alt="Logo TH Bình Khánh"
              onClick={(e) => {
                e.stopPropagation();
                setZoomLogo(!zoomLogo);
              }}
              style={{ height: "30px", width: "30px", objectFit: "contain", flexShrink: 0, cursor: "pointer" }}
              title="Bấm để phóng to logo"
            />
            <Typography
              variant="subtitle1"
              sx={{
                color: "white",
                fontWeight: 600,
                fontSize: "0.95rem",
              }}
            >
              TH BÌNH KHÁNH - KHBD
            </Typography>
          </Box>

          {/* Phần user/account (Chỉ hiển thị khi KHÔNG ở trang Dashboard) */}
          {!isDashboard && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                whiteSpace: "nowrap",
                overflowX: "auto",
                gap: 1,
              }}
            >
              <AccountCircle sx={{ color: "white", fontSize: 20 }} />
              
              {/* Trên điện thoại (xs): Chỉ hiển thị chữ cuối */}
              <Typography 
                sx={{ 
                  color: "white", 
                  fontWeight: 500, 
                  fontSize: "0.9rem",
                  display: { xs: "inline", sm: "none" } 
                }}
              >
                {shortName}
              </Typography>

              {/* Trên máy tính/màn hình lớn (từ sm trở lên): Hiển thị đầy đủ tên */}
              <Typography 
                sx={{ 
                  color: "white", 
                  fontWeight: 500, 
                  fontSize: "0.9rem",
                  display: { xs: "none", sm: "inline" } 
                }}
              >
                {displayName}
              </Typography>

              <IconButton size="small" color="inherit" onClick={handleMenu}>
                <MenuIcon fontSize="small" />
              </IconButton>

              <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                PaperProps={{
                  sx: {
                    width: 180,
                    overflow: "hidden",
                    boxShadow: "0 12px 35px rgba(0,0,0,0.18)",
                    p: 0,
                  },
                }}
              >
                {/* Header Menu */}
                <Box
                  sx={{
                    px: 2,
                    py: 1.5,
                    bgcolor: "#fff",
                    fontWeight: 600,
                    fontSize: 14,
                    borderBottom: "1px solid #eee",
                    color: "#d32f2f",
                  }}
                >
                  {currentUser?.username ? "TÀI KHOẢN" : "HỆ THỐNG"}
                </Box>

                {/* Mục Đổi mật khẩu */}
                <MenuItem
                  onClick={() => {
                    handleClose();
                    setOpenChangePassword(true);
                  }}
                  sx={{
                    px: 2,
                    py: 1.5,
                    bgcolor: "#f5f7fa",
                    transition: "0.2s",
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    "&:hover": { bgcolor: "#e9eef5" },
                  }}
                >
                  <LockResetIcon sx={{ fontSize: 18, color: "#1976d2" }} />
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Đổi mật khẩu
                  </Typography>
                </MenuItem>

                {/* Đường phân cách */}
                <Box sx={{ height: "1px", bgcolor: "#e5e7eb", mx: 1 }} />

                {/* Mục Đăng xuất */}
                {currentUser && (
                  <MenuItem
                    onClick={handleLogout}
                    sx={{
                      px: 2,
                      py: 1.5,
                      bgcolor: "#fff0f0",
                      transition: "0.2s",
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      "&:hover": { bgcolor: "#ffe0e0" },
                    }}
                  >
                    <LogoutIcon sx={{ fontSize: 18, color: "#d32f2f" }} />
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "#d32f2f" }}>
                      Đăng xuất
                    </Typography>
                  </MenuItem>
                )}
              </Menu>
            </Box>
          )}
        </Toolbar>
      </AppBar>
      )}

      {/* Hiệu ứng phóng to Logo2 giữa màn hình khi bấm vào ảnh trên AppBar */}
      {zoomLogo && (
        <Box
          onClick={() => { setZoomLogo(false); setLogoScale(1); }}
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            bgcolor: "rgba(0, 0, 0, 0.75)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            cursor: "zoom-out",
          }}
        >
          <Box
            onClick={(e) => e.stopPropagation()}
            sx={{
              bgcolor: "#fff",
              p: 4,
              borderRadius: "24px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              cursor: "default",
              maxWidth: "90vw",
            }}
          >
            <Box
              component="img"
              src="/Logo2.png"
              alt="Logo Zoom"
              sx={{
                transform: `scale(${logoScale})`,
                transition: "transform 0.2s ease",
                maxWidth: { xs: "240px", sm: "320px" },
                maxHeight: "240px",
                objectFit: "contain",
                my: 2,
              }}
            />
            <Stack direction="row" spacing={1.5} justifyContent="center">
              <Button
                variant="outlined"
                size="medium"
                startIcon={<ZoomOutRoundedIcon />}
                onClick={() => setLogoScale((prev) => Math.max(0.6, prev - 0.25))}
                sx={{ 
                  textTransform: "none", 
                  borderRadius: "10px", 
                  borderColor: "#94a3b8",
                  color: "#334155",
                  px: 2,
                  "&:hover": { borderColor: "#64748b", bgcolor: "#f1f5f9" }
                }}
              >
                Thu nhỏ
              </Button>
              <Button
                variant="outlined"
                size="medium"
                startIcon={<RestartAltRoundedIcon />}
                onClick={() => setLogoScale(1)}
                sx={{ 
                  textTransform: "none", 
                  borderRadius: "10px", 
                  borderColor: "#94a3b8",
                  color: "#334155",
                  px: 2,
                  "&:hover": { borderColor: "#64748b", bgcolor: "#f1f5f9" }
                }}
              >
                Mặc định
              </Button>
              <Button
                variant="contained"
                size="medium"
                startIcon={<ZoomInRoundedIcon />}
                onClick={() => setLogoScale((prev) => Math.min(2.5, prev + 0.25))}
                sx={{ 
                  textTransform: "none", 
                  borderRadius: "10px", 
                  bgcolor: "#1976d2",
                  px: 2,
                  boxShadow: "0 4px 12px rgba(25, 118, 210, 0.3)",
                  "&:hover": { bgcolor: "#115293" }
                }}
              >
                Phóng lớn
              </Button>
            </Stack>
          </Box>
        </Box>
      )}

      <Box
        sx={{
          pt: isLoginPage ? 0 : "38px",
          width: "100%",
          maxWidth: "none",
          minWidth: 0,
          minHeight: "100vh",
          margin: 0,
          paddingBottom: 0,
          boxSizing: "border-box",
          display: "block",
          bgcolor: isLoginPage ? "#ffffff" : "#f4f6f8",
        }}
      >
        <Routes>
          {/* Trang Dashboard chính (Mở đầu tiên khi vào ứng dụng) */}
          <Route
            path="/"
            element={
              <Dashboard
                onSelectModule={(item) => {
                  navigate(item.path);
                }}
              />
            }
          />

          <Route
            path="/login"
            element={
              <Login
                onLogin={(userData) => {
                  if (setCurrentUser) {
                    setCurrentUser(userData);
                  }
                }}
              />
            }
          />
          
          {/* Trang Admin */}
          <Route
            path="/admin"
            element={<Admin user={currentUser} />}
          />

          {/* Trang BGH (Chuyên môn) */}
          <Route
            path="/bgh"
            element={<BGH user={currentUser} />}
          />
          <Route path="/phan-quyen" element={<PhanQuyen user={currentUser} />} />

          {/* Trang người dùng / nộp bài theo nhóm */}
          <Route
            path="/upload"
            element={<Users user={currentUser} />}
          />

          {/* Điều hướng mặc định khi nhập sai đường dẫn */}
          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />
        </Routes>
      </Box>

      {/* 🧩 Cửa sổ Dialog đổi mật khẩu được kích hoạt từ menu */}
      <ChangePasswordDialog
        open={openChangePassword}
        onClose={() => setOpenChangePassword(false)}
      />
    </>
  );
}

export default function App() {
  return (
    <ProfileProvider>
      <LessonPlanProvider>
        <BGHStatsProvider>
          <Router>
            <AppContent />
          </Router>
        </BGHStatsProvider>
      </LessonPlanProvider>
    </ProfileProvider>
  );
}
