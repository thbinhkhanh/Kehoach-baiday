import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from "@mui/material";
import EditNoteIcon from "@mui/icons-material/EditNote";

export default function TeacherAdjustmentDialog({
  open,
  onClose,
  fileData,
  teacherName,
  subject,
  className,
}) {
  if (!fileData) return null;

  // Lấy thông tin tiêu đề, môn, lớp, bài từ fileData hoặc metadata
  const rawName =
    fileData.metadata?.tenBai ||
    fileData.fileName ||
    fileData.name ||
    fileData.tieuDe ||
    "Kế hoạch bài dạy";
  const displayName = rawName.replace(/\.[^/.]+$/, "");
  
  const monHoc =
    subject ||
    fileData.metadata?.monHoc ||
    fileData.monHoc ||
    "Tin học";

  // Xử lý lấy khối lớp gọn gàng (vd: "Khối 5" -> "5")
  const rawKhoi =
    className ||
    fileData.metadata?.khoiLop ||
    fileData.khoi ||
    "4";
  const khoiLop = String(rawKhoi).replace(/[^0-9]/g, "") || rawKhoi;

  // Trích xuất các object dữ liệu chính từ Firestore
  const outcomes = fileData.outcomes || fileData.yeuCauCanDat || {};
  const equipment = fileData.equipment || fileData.doDungDayHoc || {};
  const activities = fileData.activities || fileData.hoatDong || [];
  
  // 🌟 Lọc chỉ giữ lại các hoạt động có nội dung điều chỉnh (noiDung khác rỗng)
  const filteredActivities = activities.filter((act) => {
    const content = act.noiDung || act.noiDungDieuChinh || act.content || act.adjustment || "";
    return content && String(content).trim() !== "";
  });

  // Trích xuất điều chỉnh sau bài dạy
  const adjustmentsAfter =
    fileData.adjustments ||
    fileData.dieuChinh ||
    fileData.dieuChinhSauBaiDay ||
    "";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      {/* Thanh tiêu đề màu xám thiết kế nhỏ gọn (py: 1) */}
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          bgcolor: "#f8fafc",
          borderBottom: "1px solid #e2e8f0",
          py: 1,
          px: 2.5,
        }}
      >
        <EditNoteIcon color="primary" sx={{ fontSize: "1.2rem" }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: "0.9rem", color: "#1e293b" }}>
          Nội dung điều chỉnh của GV: <Box component="span" sx={{ color: "#2563eb", fontWeight: 700 }}>{teacherName}</Box>
        </Typography>
      </DialogTitle>

      {/* Phần nội dung với khoảng cách mt: 2 để KẾ HOẠCH BÀI DẠY không bị sát thanh xám */}
      <DialogContent sx={{ p: 3, pt: 2, bgcolor: "#fff" }}>
        <Box sx={{ maxWidth: 800, mx: "auto", display: "flex", flexDirection: "column", gap: 3, mt: 2 }}>
          
          {/* TIÊU ĐỀ BẢN IN */}
          <Box sx={{ textAlign: "center", mb: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: "bold", textTransform: "uppercase", mb: 1 }}>
              KẾ HOẠCH BÀI DẠY
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 500, color: "#334155" }}>
              Môn: {monHoc} – Lớp {khoiLop}
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: "bold", color: "#1976d2" }}>
              Bài: {displayName}
            </Typography>
          </Box>

          {/* I. YÊU CẦU CẦN ĐẠT */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: "bold", color: "#0f172a", mb: 1 }}>
              I. YÊU CẦU CẦN ĐẠT:
            </Typography>
            <Box sx={{ pl: 2, display: "flex", flexDirection: "column", gap: 0.5 }}>
              <Typography variant="body2">
                1. <strong>Về Kiến thức:</strong>{" "}
                <Box component="span" sx={{ color: "#dc2626" }}>
                  {outcomes.kienThuc || outcomes.knowledge || ""}
                </Box>
              </Typography>
              <Typography variant="body2">
                2. <strong>Về Năng lực (Chung & Đặc thù):</strong>{" "}
                <Box component="span" sx={{ color: "#dc2626" }}>
                  {outcomes.nangLuc || outcomes.competence || ""}
                </Box>
              </Typography>
              <Typography variant="body2">
                3. <strong>Về Phẩm chất:</strong>{" "}
                <Box component="span" sx={{ color: "#dc2626" }}>
                  {outcomes.phamChat || outcomes.qualities || ""}
                </Box>
              </Typography>
            </Box>
          </Box>

          {/* II. ĐỒ DÙNG DẠY HỌC & HỌC LIỆU */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: "bold", color: "#0f172a", mb: 1 }}>
              II. ĐỒ DÙNG DẠY HỌC & HỌC LIỆU:
            </Typography>
            <Box sx={{ pl: 2, display: "flex", flexDirection: "column", gap: 0.5 }}>
              <Typography variant="body2">
                <strong>Giáo viên chuẩn bị:</strong>{" "}
                <Box component="span" sx={{ color: "#dc2626" }}>
                  {equipment.giaoVien || equipment.teacher || ""}
                </Box>
              </Typography>
              <Typography variant="body2">
                <strong>Học sinh chuẩn bị:</strong>{" "}
                <Box component="span" sx={{ color: "#dc2626" }}>
                  {equipment.hocSinh || equipment.student || ""}
                </Box>
              </Typography>
            </Box>
          </Box>

          {/* III. CÁC HOẠT ĐỘNG DẠY HỌC CHỦ YẾU */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: "bold", color: "#0f172a", mb: 1 }}>
              III. CÁC HOẠT ĐỘNG DẠY HỌC CHỦ YẾU:
            </Typography>
            <Box sx={{ pl: 2, display: "flex", flexDirection: "column", gap: 2 }}>
              {filteredActivities.length > 0 ? (
                filteredActivities.map((act, idx) => {
                  const title = act.tieuDe || act.tenHoatDong || act.name || `Hoạt động ${idx + 1}`;
                  const content = act.noiDung || act.noiDungDieuChinh || act.content || act.adjustment || "";

                  return (
                    <Box key={act.id || idx} sx={{ pl: 1, display: "flex", flexDirection: "column", gap: 0.5 }}>
                      {/* Tiêu đề hoạt động giữ nguyên màu bình thường */}
                      <Typography variant="body2" sx={{ fontWeight: "bold", color: "#334155" }}>
                        {title}
                      </Typography>
                      {/* Chỉ phần nội dung điều chỉnh mang màu đỏ */}
                      <Typography variant="body2" sx={{ pl: 2, color: "#dc2626", whiteSpace: "pre-wrap" }}>
                        {content}
                      </Typography>
                    </Box>
                  );
                })
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic", pl: 1 }}>
                  (Không có hoạt động nào có nội dung điều chỉnh)
                </Typography>
              )}
            </Box>
          </Box>

          {/* IV. ĐIỀU CHỈNH SAU BÀI DẠY */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: "bold", color: "#0f172a", mb: 1 }}>
              IV. ĐIỀU CHỈNH SAU BÀI DẠY:
            </Typography>
            <Box sx={{ pl: 2 }}>
              <Typography variant="body2" sx={{ color: "#dc2626", whiteSpace: "pre-wrap" }}>
                {adjustmentsAfter && String(adjustmentsAfter).trim() !== ""
                  ? (typeof adjustmentsAfter === "string" ? adjustmentsAfter : JSON.stringify(adjustmentsAfter, null, 2))
                  : ""}
              </Typography>
            </Box>
          </Box>

        </Box>
      </DialogContent>

      {/* Chân Dialog */}
      <DialogActions sx={{ p: 2, bgcolor: "#f1f5f9", borderTop: "1px solid #e2e8f0" }}>
        <Button
          onClick={onClose}
          variant="contained"
          color="primary"
          sx={{ borderRadius: "8px", textTransform: "none", fontWeight: 600, px: 3 }}
        >
          Đóng
        </Button>
      </DialogActions>
    </Dialog>
  );
}