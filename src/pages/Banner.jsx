import React from "react";
import { Box, Typography } from "@mui/material";

export default function Banner() {
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
        mt: { xs: 0, sm: 0, md: -2 }, // 👈 giữ nguyên margin-top responsive
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
      {/* 🔹 Tiêu đề nằm trên banner */}
      <Box sx={{ position: "relative", zIndex: 2, textAlign: "center", px: 2 }}>
        <Typography
          variant="h5"
          color="white"
          fontWeight="bold"
          sx={{ fontSize: { xs: "1rem", sm: "1.5rem", md: "2rem" } }}
        >
          KẾ HOẠCH BÀI DẠY TRỰC TUYẾN
        </Typography>
      </Box>
    </Box>
  );
}
