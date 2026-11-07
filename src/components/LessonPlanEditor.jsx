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
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Collapse,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ListSubheader,
} from "@mui/material";

import { doc, getDoc, setDoc, updateDoc, deleteField } from "firebase/firestore";
import { db } from "../firebase";

import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import EditNoteIcon from "@mui/icons-material/EditNote";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";

// Import hàm lấy mẫu nhận xét từ file PostLessonAdjustments.js
//import { getAdjustments } from "../utils/PostLessonAdjustments";
import { getAdjustments, getEnglishAdjustmentGroups } from "../utils/PostLessonAdjustments";

// Import Dialog xác nhận xóa điều chỉnh tùy chỉnh
import ConfirmDeleteAdjustmentDialog from "../dialogs/ConfirmDeleteAdjustmentDialog";

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

const cleanLessonName = (name) => {
  if (!name) return "";
  return name.replace(/\.docx$/i, "").trim();
};

const getCleanGrade = (grade) => {
  if (!grade) return "";
  return grade.toString().split(".")[0].trim();
};

const LessonPlanEditor = forwardRef(({ initialData, onClose, onSaveToFirestore, teacherName }, ref) => {
  const [activeTab, setActiveTab] = useState(0);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [emptyWarningOpen, setEmptyWarningOpen] = useState(false);

  const rawTenBai = initialData?.metadata?.tenBai || initialData?.fileName || initialData?.name || "";
  const [metadata, setMetadata] = useState({
    monHoc: initialData?.metadata?.monHoc || "Toán",
    khoiLop: getCleanGrade(initialData?.metadata?.khoiLop || initialData?.khoi || "5"),
    tenBai: cleanLessonName(rawTenBai),
  });

  const [outcomes, setOutcomes] = useState({
    kienThuc: initialData?.outcomes?.kienThuc || "",
    nangLuc: initialData?.outcomes?.nangLuc || "",
    phamChat: initialData?.outcomes?.phamChat || "",
  });

  const [equipment, setEquipment] = useState({
    giaoVien: initialData?.equipment?.giaoVien || "",
    hocSinh: initialData?.equipment?.hocSinh || "",
  });

  const [activities, setActivities] = useState(
    initialData?.activities || SUBJECT_TEMPLATES[initialData?.metadata?.monHoc] || SUBJECT_TEMPLATES["Toán"]
  );

  const [adjustments, setAdjustments] = useState(initialData?.adjustments || "");
  const [selectedAdjComment, setSelectedAdjComment] = useState("");

  useEffect(() => {
    async function loadSavedDataFromFirestore() {
      if (!initialData) return;

      const docId = initialData?.id || initialData?.fileId;
      const tName = teacherName || initialData?.teacherName;
      const sName = initialData?.metadata?.monHoc || metadata.monHoc || "Toán";
      const rawName = initialData?.metadata?.tenBai || initialData?.fileName || initialData?.name || "";
      const lop = initialData?.metadata?.khoiLop || initialData?.khoi || "5";

      const cleanGrade = getCleanGrade(lop);
      setMetadata({
        monHoc: sName,
        khoiLop: cleanGrade,
        tenBai: cleanLessonName(rawName),
      });

      if (docId && tName && sName) {
        try {
          const docRef = doc(db, "KEHOACH_DAYHOC_2026-2027", tName, sName, docId);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const savedData = docSnap.data();

            if (savedData.outcomes) {
              setOutcomes({
                kienThuc: savedData.outcomes.kienThuc || "",
                nangLuc: savedData.outcomes.nangLuc || "",
                phamChat: savedData.outcomes.phamChat || "",
              });
            }

            if (savedData.equipment) {
              setEquipment({
                giaoVien: savedData.equipment.giaoVien || "",
                hocSinh: savedData.equipment.hocSinh || "",
              });
            }

            if (Array.isArray(savedData.activities) && savedData.activities.length > 0) {
              setActivities(savedData.activities);
            } else {
              setActivities(SUBJECT_TEMPLATES[sName] || SUBJECT_TEMPLATES["Toán"]);
            }

            setAdjustments(savedData.adjustments || "");
            return;
          }
        } catch (error) {
          console.error("Lỗi khi tự động tải dữ liệu Firestore:", error);
        }
      }

      if (initialData.outcomes) setOutcomes(initialData.outcomes);
      if (initialData.equipment) setEquipment(initialData.equipment);
      if (Array.isArray(initialData.activities) && initialData.activities.length > 0) {
        setActivities(initialData.activities);
      } else {
        setActivities(SUBJECT_TEMPLATES[sName] || SUBJECT_TEMPLATES["Toán"]);
      }
      setAdjustments(initialData.adjustments || "");
    }

    loadSavedDataFromFirestore();
  }, [initialData, teacherName]);

  // Chèn câu nhận xét được chọn vào ô TextField adjustments
  const handleInsertAdjustment = (commentText) => {
    if (!commentText) return;
    setAdjustments((prev) => {
      if (!prev || prev.trim() === "") return commentText;
      return `${prev.trim()}\n${commentText}`;
    });
  };

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

  const handleRemoveActivity = (id) => {
    if (activities.length === 1) {
      alert("Cần giữ ít nhất 1 hoạt động dạy học!");
      return;
    }
    setActivities(activities.filter((act) => act.id !== id));
  };

  const handleUpdateActivity = (id, field, value) => {
    setActivities(
      activities.map((act) => (act.id === id ? { ...act, [field]: value } : act))
    );
  };

  const handleMoveActivity = (index, direction) => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= activities.length) return;

    const updated = [...activities];
    const [movedItem] = updated.splice(index, 1);
    updated.splice(newIndex, 0, movedItem);
    setActivities(updated);
  };

  const isFormEmpty = () => {
    const hasOutcomes = outcomes.kienThuc.trim() || outcomes.nangLuc.trim() || outcomes.phamChat.trim();
    const hasEquipment = equipment.giaoVien.trim() || equipment.hocSinh.trim();
    const hasAdjustments = adjustments.trim();

    const defaultActivities = SUBJECT_TEMPLATES[metadata.monHoc] || SUBJECT_TEMPLATES["Toán"];
    const hasActivitiesContent =
      activities.some((act, idx) => {
        const defaultAct = defaultActivities[idx];
        return act.noiDung.trim() !== "" || (defaultAct && act.tieuDe !== defaultAct.tieuDe);
      }) || activities.length !== defaultActivities.length;

    return !hasOutcomes && !hasEquipment && !hasAdjustments && !hasActivitiesContent;
  };

  const handleSave = async () => {
    if (isFormEmpty()) {
      setEmptyWarningOpen(true);
      return;
    }

    try {
      const payload = {
        metadata,
        outcomes,
        equipment,
        activities,
        adjustments,
        statsChanged: true,
        updatedAt: new Date().toISOString(),
      };

      const docId = initialData?.id || initialData?.fileId;
      const tName = teacherName || initialData?.teacherName;
      const sName = metadata.monHoc;

      if (docId && tName && sName) {
        const docRef = doc(db, "KEHOACH_DAYHOC_2026-2027", tName, sName, docId);
        await setDoc(docRef, payload, { merge: true });
      }

      if (onSaveToFirestore) {
        onSaveToFirestore(payload);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Lỗi khi lưu vào Firestore:", error);
      alert("Có lỗi khi lưu dữ liệu vào hệ thống!");
    }
  };

  const handleDeleteAdjustments = async () => {
    try {
      const docId = initialData?.id || initialData?.fileId;
      const tName = teacherName || initialData?.teacherName;
      const sName = metadata.monHoc;

      if (docId && tName && sName) {
        const docRef = doc(db, "KEHOACH_DAYHOC_2026-2027", tName, sName, docId);
        await updateDoc(docRef, {
          outcomes: deleteField(),
          equipment: deleteField(),
          activities: deleteField(),
          adjustments: deleteField(),
          statsChanged: deleteField(),
          updatedAt: deleteField(),
        });
      }

      setOutcomes({ kienThuc: "", nangLuc: "", phamChat: "" });
      setEquipment({ giaoVien: "", hocSinh: "" });
      setActivities(SUBJECT_TEMPLATES[sName] || SUBJECT_TEMPLATES["Toán"]);
      setAdjustments("");

      setDeleteSuccess(true);

      if (onSaveToFirestore) {
        onSaveToFirestore(null);
      }
    } catch (error) {
      console.error("Lỗi khi xóa phần điều chỉnh:", error);
      alert("Có lỗi xảy ra khi xóa dữ liệu!");
    }
  };

  useImperativeHandle(ref, () => ({
    triggerSave: handleSave,
  }));

  const [expandedSections, setExpandedSections] = useState({
    part1: false,
    part2: false,
    part3: false,
    part4: true,
  });

  const toggleSection = (sectionKey) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  // Tự động lấy danh sách 10 mẫu nhận xét dựa theo Môn học và Khối lớp hiện tại của bài dạy
  const currentAdjComments = getAdjustments(metadata.khoiLop, metadata.monHoc);

  return (
    <Box sx={{ width: { xs: "100%", sm: "70%" }, maxWidth: { xs: "100%", sm: "70%" }, mx: "auto", p: { xs: 1, sm: 2 } }}>
      <Card elevation={1} sx={{ borderRadius: 3, bgcolor: "#ffffff" }}>
        <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
          {saveSuccess && (
            <Alert severity="success" sx={{ mb: 2, mt: 1, borderRadius: 2 }}>
              🎉 Đã lưu Kế hoạch bài dạy thành công vào hệ thống!
            </Alert>
          )}

          {deleteSuccess && (
            <Alert severity="info" sx={{ mb: 2, mt: 1, borderRadius: 2 }}>
              🗑️ Đã xóa toàn bộ nội dung điều chỉnh của bài dạy!
            </Alert>
          )}

          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: 1, borderColor: "divider", my: 2, flexWrap: "wrap", gap: 1, mt: -3 }}>
            <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)}>
              <Tab icon={<EditNoteIcon />} iconPosition="start" label="1. Soạn thảo Form" />
              <Tab icon={<VisibilityIcon />} iconPosition="start" label="2. Xem trước" />
            </Tabs>

            {!isFormEmpty() && (
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<DeleteForeverIcon />}
                onClick={() => setDeleteDialogOpen(true)}
                sx={{ textTransform: "none", fontWeight: 600, borderRadius: "8px" }}
              >
                Xóa điều chỉnh
              </Button>
            )}
          </Box>

          {/* TAB 1: SOẠN THẢO FORM */}
          {activeTab === 0 && (
            <Stack spacing={3}>
              {/* KHUNG TIÊU ĐỀ */}
              <Paper
                elevation={0}
                sx={{
                  p: 3,
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
                  Môn: {metadata.monHoc} – Lớp {metadata.khoiLop}
                </Typography>
                <Typography
                  variant="subtitle1"
                  sx={{ fontSize: "1.1rem", color: "primary.main", fontWeight: 600 }}
                >
                  Bài: {metadata.tenBai || "..................................................."}
                </Typography>
              </Paper>

              {/* PHẦN I: YÊU CẦU CẦN ĐẠT */}
              <Card variant="outlined" sx={{ borderRadius: 2.5 }}>
                {/* 🌟 Giảm padding của CardContent từ 2.5 xuống 1.5 để thẻ gọn lại */}
                <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      cursor: "pointer",
                    }}
                    onClick={() => toggleSection("part1")}
                  >
                    {/* 🌟 Giảm cỡ chữ tiêu đề từ h6 xuống subtitle1, chỉnh lại kích thước chữ và độ đậm */}
                    <Typography variant="subtitle1" fontWeight={700} color="primary" sx={{ fontSize: "0.95rem" }}>
                      I. YÊU CẦU CẦN ĐẠT:
                    </Typography>
                    <IconButton size="small" color="primary">
                      {expandedSections.part1 ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                    </IconButton>
                  </Box>

                  <Collapse in={expandedSections.part1}>
                    <Divider sx={{ my: 1.5 }} />
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
                  </Collapse>
                </CardContent>
              </Card>

              {/* PHẦN II: ĐỒ DÙNG DẠY HỌC & HỌC LIỆU */}
              <Card variant="outlined" sx={{ borderRadius: 2.5 }}>
                <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      cursor: "pointer",
                    }}
                    onClick={() => toggleSection("part2")}
                  >
                    <Typography variant="subtitle1" fontWeight={700} color="primary" sx={{ fontSize: "0.95rem" }}>
                      II. ĐỒ DÙNG DẠY HỌC & HỌC LIỆU
                    </Typography>
                    <IconButton size="small" color="primary">
                      {expandedSections.part2 ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                    </IconButton>
                  </Box>

                  <Collapse in={expandedSections.part2}>
                    <Divider sx={{ my: 1.5 }} />
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
                  </Collapse>
                </CardContent>
              </Card>

              {/* PHẦN III: CÁC HOẠT ĐỘNG DẠY HỌC CHỦ YẾU */}
              <Card variant="outlined" sx={{ borderRadius: 2.5, borderColor: "primary.light" }}>
                <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      cursor: "pointer",
                    }}
                    onClick={() => toggleSection("part3")}
                  >
                    <Typography variant="subtitle1" fontWeight={700} color="primary" sx={{ fontSize: "0.95rem" }}>
                      III. CÁC HOẠT ĐỘNG DẠY HỌC CHỦ YẾU:
                    </Typography>
                    <IconButton size="small" color="primary">
                      {expandedSections.part3 ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                    </IconButton>
                  </Box>

                  <Collapse in={expandedSections.part3}>
                    <Divider sx={{ my: 1.5 }} />

                    <Stack spacing={2}>
                      {activities.map((act, index) => (
                        <Paper
                          key={act.id}
                          elevation={0}
                          sx={{
                            p: 1.5,
                            bgcolor: "#f8fafc",
                            border: "1px solid #cbd5e1",
                            borderRadius: 2,
                            position: "relative",
                          }}
                        >
                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1, gap: 1 }}>
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
                        mt: 2,
                        py: 1,
                        border: "2px dashed #94a3b8",
                        borderRadius: 2,
                        color: "#475569",
                        fontWeight: 600,
                        textTransform: "none",
                        "&:hover": { bgcolor: "#f1f5f9", borderColor: "#64748b" },
                      }}
                    >
                      ➕ Thêm Hoạt Động Mới Tùy Ý
                    </Button>
                  </Collapse>
                </CardContent>
              </Card>

              {/* PHẦN IV: ĐIỀU CHỈNH SAU BÀI DẠY (TỰ ĐỘNG THEO MÔN & LỚP) */}
              <Card variant="outlined" sx={{ borderRadius: 2.5 }}>
                <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      cursor: "pointer",
                    }}
                    onClick={() => toggleSection("part4")}
                  >
                    <Typography variant="subtitle1" fontWeight={700} color="primary" sx={{ fontSize: "0.95rem" }}>
                      IV. ĐIỀU CHỈNH SAU BÀI DẠY
                    </Typography>
                    <IconButton size="small" color="primary">
                      {expandedSections.part4 ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                    </IconButton>
                  </Box>

                  <Collapse in={expandedSections.part4}>
                    <Divider sx={{ my: 1.5 }} />

                    {/* Khung công cụ chọn mẫu nhận xét */}
                    <Box
                      sx={{
                        p: 1.5,
                        mb: 1.5,
                        bgcolor: "#f8fafc",
                        borderRadius: 2,
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <Typography variant="subtitle2" fontWeight={600} mb={1} color="text.secondary" sx={{ fontSize: "0.85rem" }}>
                        💡 <Box component="span" sx={{ color: "#dc2626", fontWeight: 700 }}>Gợi ý nhận xét mẫu theo chương trình GDPT 2018</Box> (Môn: {metadata.monHoc} - Lớp {metadata.khoiLop}):
                      </Typography>

                      {/* Dropdown danh sách 10 mẫu nhận xét theo đúng môn/lớp hiện tại */}
                      <FormControl fullWidth size="small">
                        <InputLabel id="adj-comment-select-label">Chọn nhận xét mẫu...</InputLabel>                      
                        <Select
                          labelId="adj-comment-select-label"
                          value={selectedAdjComment}
                          label="Chọn nhận xét mẫu..."
                          onChange={(e) => {
                            const val = e.target.value;
                            if (!val) return;
                            
                            setAdjustments((prev) => {
                              const currentLines = prev ? prev.split("\n").filter(line => line.trim() !== "") : [];
                              const nextIndex = currentLines.length + 1;
                              const formattedLine = `Tiết ${nextIndex}: ${val}`;
                              
                              if (!prev || prev.trim() === "") return formattedLine;
                              return `${prev.trim()}\n${formattedLine}`;
                            });
                            setSelectedAdjComment("");
                          }}
                        >
                          {metadata.monHoc === "Tiếng Anh" ? (
                            // Dùng hàm lấy nhóm chuyên biệt cho Tiếng Anh để hiển thị phân mục chuẩn xác
                            getEnglishAdjustmentGroups().map((group, gIdx) => [
                              <ListSubheader 
                                key={`group-${gIdx}`} 
                                sx={{ fontWeight: "bold", bgcolor: "#f1f5f9", color: "primary.main", lineHeight: "36px" }}
                              >
                                {group.groupName}
                              </ListSubheader>,
                              ...group.items.map((text, iIdx) => (
                                <MenuItem key={`item-${gIdx}-${iIdx}`} value={text} sx={{ pl: 3 }}>
                                  <Typography variant="body2" noWrap>
                                    {text}
                                  </Typography>
                                </MenuItem>
                              ))
                            ])
                          ) : (
                            currentAdjComments.map((text, idx) => (
                              <MenuItem key={idx} value={text}>
                                <Typography variant="body2" noWrap>
                                  {text}
                                </Typography>
                              </MenuItem>
                            ))
                          )}
                        </Select>
                      </FormControl>
                    </Box>

                    {/* Ô nhập liệu văn bản chính */}
                    <TextField
                      fullWidth
                      multiline
                      rows={8}
                      placeholder="Ghi chú rút kinh nghiệm về thời gian, phương pháp, học sinh..."
                      value={adjustments}
                      onChange={(e) => setAdjustments(e.target.value)}
                      slotProps={{
                        input: {
                          sx: {
                            lineHeight: 1.8, // Giãn dòng cân đối hoàn toàn với Tab Xem trước
                          },
                        },
                      }}
                    />
                  </Collapse>
                </CardContent>
              </Card>
            </Stack>
          )}

          {/* TAB 2: XEM TRƯỚC BẢN IN */}
          {activeTab === 1 && (
            <Paper elevation={2} sx={{ p: { xs: 2, sm: 4 }, bgcolor: "#ffffff", minHeight: "60vh", fontFamily: "Times New Roman, serif" }}>
              <Box sx={{ textAlign: "center", mb: 3 }}>
                <Typography variant="h5" fontWeight="bold" sx={{ textTransform: "uppercase", mt: -0.9, mb: 1 }}>
                  KẾ HOẠCH BÀI DẠY
                </Typography>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 0.5 }}>
                  Môn: {metadata.monHoc} – Lớp {metadata.khoiLop}
                </Typography>
                <Typography variant="subtitle1" sx={{ fontSize: "1.1rem", color: "primary.main", fontWeight: 600 }}>
                  Bài: {metadata.tenBai || "..................................................."}
                </Typography>
              </Box>

              {/* I. YÊU CẦU CẦN ĐẠT */}
              {(outcomes.kienThuc?.trim() || outcomes.nangLuc?.trim() || outcomes.phamChat?.trim()) && (
                <>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 2 }}>
                    I. YÊU CẦU CẦN ĐẠT:
                  </Typography>
                  <Box sx={{ pl: 2, display: "flex", flexDirection: "column", gap: 0.5 }}>
                    {outcomes.kienThuc?.trim() && (
                      <Typography variant="body1"><b>1. Kiến thức:</b> {outcomes.kienThuc}</Typography>
                    )}
                    {outcomes.nangLuc?.trim() && (
                      <Typography variant="body1"><b>2. Năng lực:</b> {outcomes.nangLuc}</Typography>
                    )}
                    {outcomes.phamChat?.trim() && (
                      <Typography variant="body1"><b>3. Phẩm chất:</b> {outcomes.phamChat}</Typography>
                    )}
                  </Box>
                </>
              )}

              {/* II. ĐỒ DÙNG DẠY HỌC */}
              {(equipment.giaoVien?.trim() || equipment.hocSinh?.trim()) && (
                <>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 2 }}>
                    II. ĐỒ DÙNG DẠY HỌC:
                  </Typography>
                  <Box sx={{ pl: 2, display: "flex", flexDirection: "column", gap: 0.5 }}>
                    {equipment.giaoVien?.trim() && (
                      <Typography variant="body1"><b>Giáo viên:</b> {equipment.giaoVien}</Typography>
                    )}
                    {equipment.hocSinh?.trim() && (
                      <Typography variant="body1"><b>Học sinh:</b> {equipment.hocSinh}</Typography>
                    )}
                  </Box>
                </>
              )}

              {/* III. CÁC HOẠT ĐỘNG DẠY HỌC CHỦ YẾU */}
              {activities.some((act) => act.noiDung?.trim()) && (
                <>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 2, mb: 1 }}>
                    III. CÁC HOẠT ĐỘNG DẠY HỌC CHỦ YẾU:
                  </Typography>
                  <Stack spacing={2} sx={{ pl: 2 }}>
                    {activities.map((act) => {
                      if (!act.noiDung?.trim()) return null;

                      return (
                        <Box key={act.id}>
                          <Typography variant="body1" fontWeight="bold">
                            {act.tieuDe}
                          </Typography>
                          <Typography variant="body1" sx={{ whitespace: "pre-line", pl: 2 }}>
                            {act.noiDung}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Stack>
                </>
              )}

              {/* IV. ĐIỀU CHỈNH SAU BÀI DẠY */}
              {adjustments?.trim() && (
                <>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 3 }}>
                    IV. ĐIỀU CHỈNH SAU BÀI DẠY:
                  </Typography>
                  <Box sx={{ pl: 2, display: "flex", flexDirection: "column", gap: 1 }}>
                    {adjustments
                      .split(/(?=Tiết \d+:)/)
                      .map((item) => item.trim())
                      .filter(Boolean)
                      .map((tietText, idx) => (
                        <Typography key={idx} variant="body1">
                          {tietText}
                        </Typography>
                      ))}
                  </Box>
                </>
              )}
            </Paper>
          )}
        </CardContent>
      </Card>

      <ConfirmDeleteAdjustmentDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        deleting={isDeleting}
        lessonTitle={metadata.tenBai}
        onConfirm={async () => {
          setIsDeleting(true);
          await handleDeleteAdjustments();
          setIsDeleting(false);
          setDeleteDialogOpen(false);
        }}
      />

      <Snackbar
        open={deleteSuccess}
        autoHideDuration={3000}
        onClose={() => setDeleteSuccess(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setDeleteSuccess(false)}
          severity="success"
          variant="filled"
          sx={{ width: "100%", borderRadius: "10px", fontWeight: 600 }}
        >
          🗑️ Đã xóa nội dung điều chỉnh của KHBD thành công!
        </Alert>
      </Snackbar>

      {/* Dialog cảnh báo khi chưa nhập nội dung */}
      <Dialog
        open={emptyWarningOpen}
        onClose={() => setEmptyWarningOpen(false)}
        PaperProps={{ sx: { borderRadius: 3, p: 1, maxWidth: 400 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: "warning.main" }}>
          ⚠️ Chưa có nội dung
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Vui lòng nhập nội dung điều chỉnh trước khi bấm lưu!
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setEmptyWarningOpen(false)}
            variant="contained"
            color="primary"
            sx={{ borderRadius: "8px", textTransform: "none", fontWeight: 600, px: 3 }}
          >
            Đã hiểu
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
});

export default LessonPlanEditor;