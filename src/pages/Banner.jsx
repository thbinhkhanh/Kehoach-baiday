// src/pages/Banner.jsx
import React from "react";
import { Box, Typography } from "@mui/material";
import { useLocation } from "react-router-dom";

export default function Banner({ title, subtitle }) {
  const location = useLocation();
  const path = location.pathname;

  // 👇 Tiêu đề tự động theo đường dẫn
  const pageTitles = {
    "/admin": "TRANG ADMIN",
    "/bgh": "TRANG BGH (CHUYÊN MÔN)",
    "/upload": "KẾ HOẠCH BÀI DẠY TRỰC TUYẾN",
    "/change-password": "ĐỔI MẬT KHẨU",
    // thêm các đường dẫn khác nếu cần
  };

  const computedTitle = title || pageTitles[path] || "KẾ HOẠCH BÀI DẠY TRỰC TUYẾN";
  const computedSubtitle = subtitle || "";

  return (
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
      mt: { xs: 0, sm: 0, md: -2 }, // 👈 thêm margin-top responsive
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
    <Box sx={{ position: "relative", zIndex: 2, textAlign: "center", px: 1 }}>
      <Typography
        variant="h5"
        color="white"
        fontWeight="bold"
        sx={{ fontSize: { xs: "1.5rem", sm: "2rem", md: "2.5rem" } }}
      >
        {computedTitle}
      </Typography>
      {computedSubtitle && (
        <Typography
          variant="subtitle2"
          color="white"
          sx={{ fontSize: { xs: "0.7rem", sm: "0.9rem" } }}
        >
          {computedSubtitle}
        </Typography>
      )}
    </Box>
  </Box>
);

}
