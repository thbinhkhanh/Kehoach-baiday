import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  IconButton,
  Tabs,
  Tab,
  Divider,
  Paper,
  Stack,
  Tooltip,
  Alert,
} from "@mui/material";

import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import EditNoteIcon from "@mui/icons-material/EditNote";
import VisibilityIcon from "@mui/icons-material/Visibility";

// Các mẫu khung gợi ý theo từng môn học
const SUBJECT_TEMPLATES = {
  Toán: [
    { id: "act_1", tieuDe: "Hoạt động 1: Khởi động (Tạo hứng thú)", noiDung: "" },
    { id: "act_2", tieuDe: "Hoạt động 2: Khám phá kiến thức mới", noiDung: "" },
    { id: "act_3", tieuDe: "Hoạt động 3: Luyện tập, thực hành", noiDung: "" },
    { id: "act_4", tieuDe: "Hoạt động 4: Vận dụng, trải nghiệm", noiDung: "" },
  ],
  "Tiếng Việt": [
    { id: "act_1", tieuDe: "Hoạt động 1: Khởi động & Mở đầu", noiDung: "" },
    { id: "act_2", tieuDe: "Hoạt động 2: Đọc mẫu & Khám phá bài đọc", noiDung: "" },
    { id: "act_3", tieuDe: "Hoạt động 3: Luyện đọc lại & Tìm hiểu bài", noiDung: "" },
    { id: "act_4", tieuDe: "Hoạt động 4: Luyện tập từ & câu", noiDung: "" },
    { id: "act_5", tieuDe: "Hoạt động 5: Vận dụng mở rộng", noiDung: "" },
  ],
  "Mĩ thuật": [
    { id: "act_1", tieuDe: "Hoạt động 1: Trải nghiệm & Khám phá chủ đề", noiDung: "" },
    { id: "act_2", tieuDe: "Hoạt động 2: Kiến tạo kiến thức / Kĩ năng sáng tạo", noiDung: "" },
    { id: "act_3", tieuDe: "Hoạt động 3: Thực hành sản phẩm cá nhân/nhóm", noiDung: "" },
    { id: "act_4", tieuDe: "Hoạt động 4: Trưng bày, phân tích & Đánh giá sản phẩm", noiDung: "" },
  ],
  "Giáo dục thể chất": [
    { id: "act_1", tieuDe: "Phần mở đầu: Tập hợp, phổ biến nội dung & Khởi động chung", noiDung: "" },
    { id: "act_2", tieuDe: "Phần cơ bản: Học động tác mới / Trò chơi vận động", noiDung: "" },
    { id: "act_3", tieuDe: "Phần kết thúc: Hồi tĩnh, thả lỏng & Nhận xét buổi học", noiDung: "" },
  ],
  "Công nghệ": [
    { id: "act_1", tieuDe: "Hoạt động 1: Khởi động", noiDung: "" },
    { id: "act_2", tieuDe: "Hoạt động 2: Khám phá", noiDung: "" },
    { id: "act_3", tieuDe: "Hoạt động 3: Thực hành", noiDung: "" },
    { id: "act_4", tieuDe: "Hoạt động 4: Vận dụng", noiDung: "" },
  ],
};

// Hàm hỗ trợ loại bỏ định dạng .docx khỏi tên bài
const cleanLessonName = (name) => {
  if (!name) return "";
  return name.replace(/\.docx$/i, "").trim();
};

// Hàm lấy số khối lớp chính (ví dụ: "4.3" -> "4", nếu chỉ có "4" thì giữ nguyên "4")
const getCleanGrade = (grade) => {
  if (!grade) return "";
  return grade.toString().split('.')[0].trim();
};

const LessonPlanEditor = forwardRef(({ initialData, onClose, onSaveToFirestore }, ref) => {
  const [activeTab, setActiveTab] = useState(0);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 1. Thông tin chung (Lấy dữ liệu truyền vào từ initialData)
  const rawTenBai = initialData?.metadata?.tenBai || initialData?.fileName || initialData?.name || "";
  const [metadata, setMetadata] = useState({
    monHoc: initialData?.metadata?.monHoc || "Toán",
    khoiLop: initialData?.metadata?.khoiLop || "5",
    tenBai: cleanLessonName(rawTenBai),
  });

  // 2. Yêu cầu cần đạt
  const [outcomes, setOutcomes] = useState({
    kienThuc: initialData?.outcomes?.kienThuc || "",
    nangLuc: initialData?.outcomes?.nangLuc || "",
    phamChat: initialData?.outcomes?.phamChat || "",
  });

  // 3. Đồ dùng dạy học
  const [equipment, setEquipment] = useState({
    giaoVien: initialData?.equipment?.giaoVien || "",
    hocSinh: initialData?.equipment?.hocSinh || "",
  });

  // 4. Danh sách Hoạt động dạy học
  const [activities, setActivities] = useState(
    initialData?.activities || SUBJECT_TEMPLATES[initialData?.metadata?.monHoc] || SUBJECT_TEMPLATES["Toán"]
  );

  // 5. Điều chỉnh sau bài dạy
  const [adjustments, setAdjustments] = useState(initialData?.adjustments || "");

  // Đồng bộ lại khi initialData thay đổi
  useEffect(() => {
    if (initialData) {
      const rawName = initialData?.metadata?.tenBai || initialData?.fileName || initialData?.name || "";
      const mon = initialData?.metadata?.monHoc || "Toán";
      const lop = initialData?.metadata?.khoiLop || "5";
      
      setMetadata({
        monHoc: mon,
        khoiLop: lop,
        tenBai: cleanLessonName(rawName),
      });
      setOutcomes(initialData?.outcomes || { kienThuc: "", nangLuc: "", phamChat: "" });
      setEquipment(initialData?.equipment || { giaoVien: "", hocSinh: "" });
      setActivities(initialData?.activities || SUBJECT_TEMPLATES[mon] || SUBJECT_TEMPLATES["Toán"]);
      setAdjustments(initialData?.adjustments || "");
    }
  }, [initialData]);

  // Thêm hoạt động mới
  const handleAddActivity = () => {
    const newId = `act_${Date.now()}`;
    setActivities([
      ...activities,
      {
        id: newId,
        tieuDe: `Hoạt động ${activities.length + 1}: `,
        noiDung: "",
      },
    ]);
  };

  // Xóa hoạt động
  const handleRemoveActivity = (id) => {
    if (activities.length === 1) {
      alert("Cần giữ ít nhất 1 hoạt động dạy học!");
      return;
    }
    setActivities(activities.filter((act) => act.id !== id));
  };

  // Cập nhật tiêu đề hoặc nội dung hoạt động
  const handleUpdateActivity = (id, field, value) => {
    setActivities(
      activities.map((act) => (act.id === id ? { ...act, [field]: value } : act))
    );
  };

  // Di chuyển thứ tự hoạt động (Lên / Xuống)
  const handleMoveActivity = (index, direction) => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= activities.length) return;

    const updated = [...activities];
    const [movedItem] = updated.splice(index, 1);
    updated.splice(newIndex, 0, movedItem);
    setActivities(updated);
  };

  // Lưu dữ liệu
  const handleSave = () => {
    const payload = {
      metadata,
      outcomes,
      equipment,
      activities,
      adjustments,
      updatedAt: new Date().toISOString(),
    };

    if (onSaveToFirestore) {
      onSaveToFirestore(payload);
    } else {
      console.log("🔥 Payload Firestore sẵn sàng:", payload);
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Cho phép gọi hàm handleSave từ bên ngoài Dialog thông qua ref
  useImperativeHandle(ref, () => ({
    triggerSave: handleSave,
  }));

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto", p: { xs: 1, sm: 0 } }}>
      {/* Thẻ Card nền trắng bao bọc toàn bộ bên ngoài */}
      <Card elevation={1} sx={{ borderRadius: 3, bgcolor: "#ffffff" }}>
        <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
          
          {/* Khối hiển thị thông tin dạng văn bản chuẩn */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              //mb: 3,
              bgcolor: "#f8fafc",
              borderRadius: 3,
              border: "1px solid #e2e8f0",
              textAlign: "center",
            }}
          >
            <Typography
              variant="h5"
              fontWeight="bold"
              sx={{ textTransform: "uppercase", mb: 1, color: "text.primary" }}
            >
              KẾ HOẠCH BÀI DẠY
            </Typography>
            <Typography
              variant="subtitle1"
              fontWeight="bold"
              sx={{ textTransform: "none", mb: 0.5, color: "text.primary" }}
            >
              Môn: {metadata.monHoc} – Lớp {getCleanGrade(metadata.khoiLop)}
            </Typography>
            <Typography
              variant="subtitle1"
              sx={{ fontSize: "1.1rem", color: "primary.main", fontWeight: 600 }}
            >
              Bài: {metadata.tenBai || "..................................................."}
            </Typography>
          </Paper>

          {saveSuccess && (
            <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
              🎉 Đã lưu Kế hoạch bài dạy thành công vào hệ thống!
            </Alert>
          )}

          {/* Thanh Tabs chuyển đổi giao diện */}
          <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
            <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)}>
              <Tab icon={<EditNoteIcon />} iconPosition="start" label="1. Soạn thảo Form" />
              <Tab icon={<VisibilityIcon />} iconPosition="start" label="2. Xem trước bản in" />
            </Tabs>
          </Box>

          {/* TAB 1: SOẠN THẢO FORM */}
          {activeTab === 0 && (
            <Stack spacing={3}>
              {/* Card 1: Yêu cầu cần đạt */}
              <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="h6" fontWeight={700} color="primary" gutterBottom>
                    I. YÊU CẦU CẦN ĐẠT:
                  </Typography>
                  <Stack spacing={2}>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      label="1. Về Kiến thức"
                      placeholder="- Nhận biết/nắm vững được nội dung..."
                      value={outcomes.kienThuc}
                      onChange={(e) => setOutcomes({ ...outcomes, kienThuc: e.target.value })}
                    />
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      label="2. Về Năng lực (Chung & Đặc thù)"
                      placeholder="- Năng lực tự chủ, giao tiếp, hợp tác..."
                      value={outcomes.nangLuc}
                      onChange={(e) => setOutcomes({ ...outcomes, nangLuc: e.target.value })}
                    />
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      label="3. Về Phẩm chất"
                      placeholder="- Yêu nước, chăm chỉ, trung thực, trách nhiệm..."
                      value={outcomes.phamChat}
                      onChange={(e) => setOutcomes({ ...outcomes, phamChat: e.target.value })}
                    />
                  </Stack>
                </CardContent>
              </Card>

              {/* Card 2: Đồ dùng dạy học */}
              <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="h6" fontWeight={700} color="primary" gutterBottom>
                    II. ĐỒ DÙNG DẠY HỌC & HỌC LIỆU
                  </Typography>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      label="Giáo viên chuẩn bị"
                      placeholder="Máy chiếu, kế hoạch bài dạy, phiếu bài tập..."
                      value={equipment.giaoVien}
                      onChange={(e) => setEquipment({ ...equipment, giaoVien: e.target.value })}
                    />
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      label="Học sinh chuẩn bị"
                      placeholder="Sách giáo khoa, vở ghi, dụng cụ học tập..."
                      value={equipment.hocSinh}
                      onChange={(e) => setEquipment({ ...equipment, hocSinh: e.target.value })}
                    />
                  </Stack>
                </CardContent>
              </Card>

              {/* Card 3: Tiến trình dạy học */}
              <Card variant="outlined" sx={{ borderRadius: 3, borderColor: "primary.light" }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h6" fontWeight={700} color="primary">
                      III. CÁC HOẠT ĐỘNG DẠY HỌC CHỦ YẾU:
                    </Typography>
                  </Box>

                  <Divider sx={{ mb: 2.5 }} />

                  <Stack spacing={2.5}>
                    {activities.map((act, index) => (
                      <Paper
                        key={act.id}
                        elevation={0}
                        sx={{
                          p: 2,
                          bgcolor: "#f8fafc",
                          border: "1px solid #cbd5e1",
                          borderRadius: 2.5,
                          position: "relative",
                        }}
                      >
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5, gap: 1 }}>
                          <TextField
                            fullWidth
                            variant="outlined"
                            size="small"
                            label={`Tên hoạt động ${index + 1}`}
                            value={act.tieuDe}
                            onChange={(e) => handleUpdateActivity(act.id, "tieuDe", e.target.value)}
                            sx={{ bgcolor: "#ffffff", fontWeight: 600 }}
                          />

                          <Stack direction="row" spacing={0.5}>
                            <Tooltip title="Chuyển lên">
                              <span>
                                <IconButton
                                  size="small"
                                  disabled={index === 0}
                                  onClick={() => handleMoveActivity(index, "up")}
                                >
                                  <ArrowUpwardIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title="Chuyển xuống">
                              <span>
                                <IconButton
                                  size="small"
                                  disabled={index === activities.length - 1}
                                  onClick={() => handleMoveActivity(index, "down")}
                                >
                                  <ArrowDownwardIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title="Xóa hoạt động">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleRemoveActivity(act.id)}
                              >
                                <DeleteOutlineIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </Box>

                        <TextField
                          fullWidth
                          multiline
                          rows={4}
                          placeholder="Nhập tiến trình: Mục tiêu, Nội dung, Sản phẩm, Tổ chức thực hiện..."
                          value={act.noiDung}
                          onChange={(e) => handleUpdateActivity(act.id, "noiDung", e.target.value)}
                          sx={{ bgcolor: "#ffffff" }}
                        />
                      </Paper>
                    ))}
                  </Stack>

                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<AddCircleOutlineIcon />}
                    onClick={handleAddActivity}
                    sx={{
                      mt: 2.5,
                      py: 1.5,
                      border: "2px dashed #94a3b8",
                      borderRadius: 2.5,
                      color: "#475569",
                      fontWeight: 600,
                      "&:hover": { bgcolor: "#f1f5f9", borderColor: "#64748b" },
                    }}
                  >
                    ➕ Thêm Hoạt Động Mới Tùy Ý
                  </Button>
                </CardContent>
              </Card>

              {/* Card 4: Điều chỉnh sau bài dạy */}
              <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="h6" fontWeight={700} color="primary" gutterBottom>
                    IV. ĐIỀU CHỈNH SAU BÀI DẠY 
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    placeholder="Ghi chú rút kinh nghiệm về thời gian, phương pháp, học sinh..."
                    value={adjustments}
                    onChange={(e) => setAdjustments(e.target.value)}
                  />
                </CardContent>
              </Card>
            </Stack>
          )}

          {/* TAB 2: XEM TRƯỚC BẢN IN */}
          {activeTab === 1 && (
            <Paper elevation={2} sx={{ p: { xs: 2, sm: 4 }, bgcolor: "#ffffff", minHeight: "60vh", fontFamily: "Times New Roman, serif" }}>
              <Box sx={{ textAlign: "center", mb: 3 }}>
                <Typography variant="h5" fontWeight="bold" sx={{ textTransform: "uppercase", mb: 1 }}>
                  KẾ HOẠCH BÀI DẠY
                </Typography>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 0.5 }}>
                  Môn: {metadata.monHoc} – Lớp {getCleanGrade(metadata.khoiLop)}
                </Typography>
                <Typography variant="subtitle1" sx={{ fontSize: "1.1rem", color: "primary.main", fontWeight: 600 }}>
                  Bài: {metadata.tenBai || "..................................................."}
                </Typography>
              </Box>

              <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 2 }}>
                I. YÊU CẦU CẦN ĐẠT:
              </Typography>
              <Box sx={{ pl: 2 }}>
                <Typography variant="body1"><b>1. Kiến thức:</b> {outcomes.kienThuc || "Chưa nhập"}</Typography>
                <Typography variant="body1"><b>2. Năng lực:</b> {outcomes.nangLuc || "Chưa nhập"}</Typography>
                <Typography variant="body1"><b>3. Phẩm chất:</b> {outcomes.phamChat || "Chưa nhập"}</Typography>
              </Box>

              <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 2 }}>
                II. ĐỒ DÙNG DẠY HỌC:
              </Typography>
              <Box sx={{ pl: 2 }}>
                <Typography variant="body1"><b>Giáo viên:</b> {equipment.giaoVien || "Chưa nhập"}</Typography>
                <Typography variant="body1"><b>Học sinh:</b> {equipment.hocSinh || "Chưa nhập"}</Typography>
              </Box>

              <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 2, mb: 1 }}>
                III. CÁC HOẠT ĐỘNG DẠY HỌC CHỦ YẾU:
              </Typography>
              <Stack spacing={2} sx={{ pl: 2 }}>
                {activities.map((act) => (
                  <Box key={act.id}>
                    <Typography variant="body1" fontWeight="bold">
                      {act.tieuDe}
                    </Typography>
                    <Typography variant="body1" sx={{ whitespace: "pre-line", pl: 2 }}>
                      {act.noiDung || "(Chưa có nội dung)"}
                    </Typography>
                  </Box>
                ))}
              </Stack>

              {adjustments && (
                <>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 3 }}>
                    IV. ĐIỀU CHỈNH SAU BÀI DẠY:
                  </Typography>
                  <Typography variant="body1" sx={{ pl: 2, whitespace: "pre-line" }}>
                    {adjustments}
                  </Typography>
                </>
              )}
            </Paper>
          )}

        </CardContent>
      </Card>
    </Box>
  );
});

export default LessonPlanEditor;