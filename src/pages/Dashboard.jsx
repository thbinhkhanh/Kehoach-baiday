import React from "react";
import { Box, Typography } from "@mui/material";
import {
  Translate,
  AssignmentTurnedIn,
  AdminPanelSettings,
  Layers,
  School,
} from "@mui/icons-material";

// 🌟 DASHBOARD CARD COMPONENT (GIỮ NGUYÊN KÍCH THƯỚC THEO YÊU CẦU)
function DashboardCard({ item, onClick }) {
  return (
    <Box
      onClick={onClick}
      className="dashboard-card"
      sx={{
        position: "relative",
        overflow: "hidden",
        bgcolor: "#fff",
        borderRadius: "18px",
        p: { xs: 1.5, sm: 2 },
        minHeight: { xs: 150, sm: 165 }, // Giữ nguyên kích thước ban đầu
        cursor: "pointer",
        border: "1px solid #e5e7eb",
        transition: "all .25s ease",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",

        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
          borderColor: item.color,
        },

        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: 4,
          background: item.color,
        },
      }}
    >
      {/* ICON */}
      <Box
        sx={{
          width: { xs: 38, sm: 44 },
          height: { xs: 38, sm: 44 },
          flexShrink: 0,
          borderRadius: "12px",
          bgcolor: `${item.color}15`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",

          "& svg": {
            fontSize: { xs: 20, sm: 24 },
          },
        }}
      >
        {item.icon}
      </Box>

      {/* TITLE & DESCRIPTION */}
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography
          sx={{
            mt: 1.2,
            fontWeight: 700,
            fontSize: { xs: 13, sm: 14.5 },
            color: "#0f172a",
            lineHeight: 1.3,
            display: "-webkit-box",
            WebkitLineClamp: 1,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {item.label}
        </Typography>

        <Typography
          sx={{
            mt: 0.5,
            fontSize: { xs: 11.5, sm: 12.5 },
            color: "#64748b",
            lineHeight: 1.4,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {item.description}
        </Typography>
      </Box>

      {/* ARROW */}
      <Box
        sx={{
          mt: 1,
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <Box
          className="dashboard-arrow"
          sx={{
            width: 28,
            height: 28,
            borderRadius: "8px",
            bgcolor: "#f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#64748b",
            fontSize: "0.85rem",
            transition: ".2s",

            ".dashboard-card:hover &": {
              bgcolor: item.color,
              color: "#fff",
            },
          }}
        >
          →
        </Box>
      </Box>
    </Box>
  );
}

// 🌟 MAIN DASHBOARD
export default function Dashboard({ onSelectModule }) {
  const cards = [
    {
      id: "khoi-1",
      label: "Khối Lớp 1",
      description: "Quản lý và tải lên KHBD Lớp 1",
      icon: <School sx={{ color: "#2563eb" }} />,
      color: "#2563eb",
      path: "/login?group=khoi-1",
    },
    {
      id: "khoi-2",
      label: "Khối Lớp 2",
      description: "Quản lý và tải lên KHBD Lớp 2",
      icon: <School sx={{ color: "#0284c7" }} />,
      color: "#0284c7",
      path: "/login?group=khoi-2",
    },
    {
      id: "khoi-3",
      label: "Khối Lớp 3",
      description: "Quản lý và tải lên KHBD Lớp 3",
      icon: <School sx={{ color: "#ea580c" }} />,
      color: "#ea580c",
      path: "/login?group=khoi-3",
    },
    {
      id: "khoi-4",
      label: "Khối Lớp 4",
      description: "Quản lý và tải lên KHBD Lớp 4",
      icon: <School sx={{ color: "#16a34a" }} />,
      color: "#16a34a",
      path: "/login?group=khoi-4",
    },
    {
      id: "khoi-5",
      label: "Khối Lớp 5",
      description: "Quản lý và tải lên KHBD Lớp 5",
      icon: <School sx={{ color: "#ca8a04" }} />,
      color: "#ca8a04",
      path: "/login?group=khoi-5",
    },
    {
      id: "to-bo-mon",
      label: "Tổ Bộ Môn",
      description: "Quản lý và tải lên KHBD Tổ Bộ môn",
      icon: <Layers sx={{ color: "#9333ea" }} />,
      color: "#9333ea",
      path: "/login?group=to-bo-mon",
    },
    {
      id: "tieng-anh",
      label: "Tổ Tiếng Anh",
      description: "Quản lý và tải lên KHBD Tổ Tiếng Anh",
      icon: <Translate sx={{ color: "#e11d48" }} />,
      color: "#e11d48",
      path: "/login?group=tieng-anh",
    },
    {
      id: "duyet-ke-hoach",
      label: "Duyệt Kế Hoạch (BGH)",
      description: "Ban Giám hiệu kiểm tra, duyệt và thống kê KHBD",
      icon: <AssignmentTurnedIn sx={{ color: "#d97706" }} />,
      color: "#d97706",
      path: "/login?group=bgh",
    },
    {
      id: "quan-tri",
      label: "Quản Trị Hệ Thống",
      description: "Quản lý danh sách giáo viên, phân quyền dạy học và cấu hình",
      icon: <AdminPanelSettings sx={{ color: "#475569" }} />,
      color: "#475569",
      path: "/login?group=admin",
    },
  ];

  return (
    <Box
      sx={{
        // 🌟 Trừ đi 56px đến 60px chiều cao của thanh Header xanh ở trên
        // giúp toàn bộ giao diện vừa khít 1 màn hình máy tính mà không gây ra cuộn trang
        height: "calc(100vh - 40px)",
        overflow: "hidden", // Khóa cuộn dọc trên máy tính
        bgcolor: "#f4f6f8",
        p: { xs: 1.5, md: 2 },
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxSizing: "border-box",
        fontFamily:
          '"Segoe UI", "Arial", "Helvetica", "Noto Sans", sans-serif',
      }}
    >
      <Box
        sx={{
          maxWidth: 1200,
          mx: "auto",
          width: "100%",
        }}
      >
        {/* TITLE */}
        <Typography
          variant="h6"
          fontWeight={700}
          sx={{
            color: "#1e3a8a",
            mb: { xs: 1, sm: 1.5 },
            fontSize: { xs: "1.05rem", sm: "1.2rem" },
            fontFamily:
              '"Segoe UI", "Arial", "Helvetica", "Noto Sans", sans-serif',
          }}
        >
          TÁC VỤ CHUYÊN MÔN
        </Typography>

        {/* GRID */}
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: {
              xs: "repeat(2, minmax(0, 1fr))",
              sm: "repeat(2, minmax(0, 1fr))",
              md: "repeat(3, minmax(0, 1fr))",
              lg: "repeat(5, minmax(0, 1fr))",
            },
          }}
        >
          {cards.map((item) => (
            <Box key={item.id} sx={{ minWidth: 0 }}>
              <DashboardCard
                item={item}
                onClick={() => onSelectModule(item)}
              />
            </Box>
          ))}
        </Box>
      </Box>

      {/* COPYRIGHT & VERSION FOOTER */}
      <Box
        sx={{
          maxWidth: 1200,
          mx: "auto",
          width: "100%",
          pt: 1.5,
          borderTop: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Typography
          sx={{
            fontSize: { xs: "11px", sm: "12.5px" },
            color: "#64748b",
          }}
        >
          © Bản quyền thuộc về: <strong>thbinhkhanh@gmail.com</strong>
        </Typography>
        <Typography
          sx={{
            fontSize: { xs: "11px", sm: "12.5px" },
            color: "#94a3b8",
          }}
        >
          Phiên bản: v1.0.0
        </Typography>
      </Box>
    </Box>
  );
}