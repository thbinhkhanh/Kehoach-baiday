import React from "react";
import {
  Dialog,
  DialogContent,
  Typography,
  Box,
  Button,
  IconButton,
  Fade,
  Chip,
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import ClassRoundedIcon from "@mui/icons-material/ClassRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";

export default function BghRequestDialog({ open, onClose, content, fileInfo }) {
  return (
    <Dialog
      open={open}
      TransitionComponent={Fade}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          width: "100%",
          maxWidth: "480px",
          borderRadius: "20px",
          overflow: "hidden",
          background: "#ffffff",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          p: 0,
        },
      }}
    >
      {/* HEADER - Đã thu gọn kích thước gọn gàng hơn */}
      <Box
        sx={{
          pt: 2.5,
          pb: 2,
          px: 3,
          background: "linear-gradient(135deg, #f0f7ff 0%, #e1effe 100%)",
          textAlign: "center",
          position: "relative",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <IconButton
          onClick={onClose}
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
            width: 44,
            height: 44,
            borderRadius: "50%",
            bgcolor: "#1976d2",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mx: "auto",
            mb: 1.5,
            boxShadow: "0 6px 12px rgba(25, 118, 210, 0.2)",
          }}
        >
          <InfoRoundedIcon sx={{ fontSize: 24 }} />
        </Box>

        <Typography sx={{ fontSize: 18, fontWeight: 700, color: "#1e293b", mb: 0.3 }}>
          ⚠️ Yêu cầu điều chỉnh từ Ban Giám Hiệu
        </Typography>
        <Typography sx={{ fontSize: 12.5, color: "#64748b" }}>
          Nội dung chi tiết yêu cầu điều chỉnh bài dạy dành cho bạn.
        </Typography>
      </Box>

      {/* CONTENT */}
      <DialogContent sx={{ px: 3, py: 2.5, bgcolor: "#ffffff" }}>
        
        {/* 🌟 KHUNG HIỂN THỊ THÔNG TIN MÔN, LỚP, TÊN BÀI */}
        <Box
          sx={{
            mb: 2,
            p: 2,
            bgcolor: "#f8fafc",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            textAlign: "left",
          }}
        >
          <Typography 
            variant="body2" 
            sx={{ fontWeight: 700, color: "#1e293b", mb: 1.5, display: "flex", alignItems: "center", gap: 1 }}
          >
            <DescriptionRoundedIcon fontSize="small" sx={{ color: "#1976d2" }} />
            {fileInfo?.tenBai || "Kế hoạch bài dạy"}
          </Typography>
          
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Chip 
              icon={<MenuBookRoundedIcon sx={{ fontSize: "15px !important" }} />}
              label={`Môn: ${fileInfo?.subject || "Chưa xác định"}`} 
              size="small" 
              sx={{ bgcolor: "#e0f2fe", color: "#0369a1", fontWeight: 600, border: "none" }}
            />
            <Chip 
              icon={<ClassRoundedIcon sx={{ fontSize: "15px !important" }} />}
              label={`Lớp: ${fileInfo?.khoi || "Chưa xác định"}`} 
              size="small" 
              sx={{ bgcolor: "#dcfce7", color: "#15803d", fontWeight: 600, border: "none" }}
            />
          </Box>
        </Box>

        {/* NỘI DUNG YÊU CẦU TỪ BGH */}
        <Box
          sx={{
            p: 2,
            bgcolor: "#f8fafc",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            color: "#334155",
            fontSize: "14px",
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
            maxHeight: "220px", // Đã sửa lỗi chính tả maxHieght thành maxHeight
            overflowY: "auto",
          }}
        >
          {content || "Không có nội dung yêu cầu."}
        </Box>
      </DialogContent>

      {/* ACTIONS */}
      <Box sx={{ px: 3, pb: 3, pt: 1, display: "flex", justifyContent: "center", bgcolor: "#ffffff" }}>
        <Button
          variant="contained"
          onClick={onClose}
          sx={{
            width: "100%",
            maxWidth: 280,
            height: 42,
            borderRadius: "10px",
            textTransform: "none",
            fontWeight: 700,
            fontSize: "14px",
            bgcolor: "#1976d2",
            boxShadow: "0 4px 12px rgba(25, 118, 210, 0.25)",
            "&:hover": { bgcolor: "#115293" },
          }}
        >
          Đã hiểu
        </Button>
      </Box>
    </Dialog>
  );
}