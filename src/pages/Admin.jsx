import React, { useState, useEffect } from "react";
import ExcelJS from "exceljs";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  writeBatch,
  collection,
  getDocs,
} from "firebase/firestore";

import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  LinearProgress,
  Stack,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";

import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import LockResetOutlinedIcon from "@mui/icons-material/LockResetOutlined";
import AssignmentIndOutlinedIcon from "@mui/icons-material/AssignmentIndOutlined";
import SystemAccountsView from "../components/SystemAccountsView";
import ConfirmResetAllDialog from "../dialogs/ConfirmResetAllDialog";
import ConfirmResetDialog from "../dialogs/ConfirmResetDialog";
import { handleSubjectFileSelectService } from "../utils/subjectImportService";
import { handleFileSelectService } from "../utils/teacherImportService";

const getTextCellValue = (cell) => {
  if (!cell || cell.value == null) return "";

  if (typeof cell.value === "object") {
    if (cell.value.text !== undefined) {
      return String(cell.value.text).trim();
    }

    if (cell.value.result !== undefined) {
      return String(cell.value.result).trim();
    }

    if (cell.value.richText !== undefined) {
      return cell.value.richText
        .map((item) => item.text)
        .join("")
        .trim();
    }

    return "";
  }

  return String(cell.value).trim();
};

const normalizeTeacherId = (name) =>
  String(name || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toUpperCase() || "GIAO_VIEN";

const normalizeSubjectId = (name) =>
  String(name || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toUpperCase() || "MON_HOC";

const formatDate = (date) => {
  if (!date) return "Chưa cập nhật";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export default function Admin({ user }) {
  const navigate = useNavigate();

  const [academicYear, setAcademicYear] = useState("2026-2027");

  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState(null);
  const [progress, setProgress] = useState(0);

  const [importingSubject, setImportingSubject] = useState(false);
  const [subjectFileName, setSubjectFileName] = useState("");
  const [subjectMessage, setSubjectMessage] = useState(null);
  const [subjectProgress, setSubjectProgress] = useState(0);

  const [teachersList, setTeachersList] = useState([]);
  const [accountsList, setAccountsList] = useState([]);
  const [teacherNameToReset, setTeacherNameToReset] = useState("");
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [confirmResetAllOpen, setConfirmResetAllOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const fetchTeachersAndAccountsData = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "DANHSACH_GV"));
      const dropdownList = [];
      const tableList = [];

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const role = (data.role || data.quyen || data.chucVu || "").toLowerCase();
        const docId = docSnap.id.toUpperCase();
        const username = (data.username || "").toLowerCase();

        const isAdminOrBgh =
          role.includes("admin") ||
          role.includes("bgh") ||
          role.includes("ban giám hiệu") ||
          role.includes("ban giam hieu") ||
          docId.includes("ADMIN") ||
          docId.includes("BGH") ||
          username.includes("admin") ||
          username.includes("bgh");

        if (data.username) {
          if (!isAdminOrBgh) {
            dropdownList.push(data.username);
          }
          tableList.push({
            id: docSnap.id,
            username: data.username,
            pass: data.pass || "123",
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : null),
          });
        }
      });

      dropdownList.sort();
      tableList.sort((a, b) => a.username.localeCompare(b.username));

      setTeachersList(dropdownList);
      setAccountsList(tableList);
    } catch (err) {
      console.error("Lỗi tải danh sách tài khoản:", err);
    }
  };

  useEffect(() => {
    const fetchConfigYear = async () => {
      try {
        const configRef = doc(db, "CONFIG", "config");
        const configSnap = await getDoc(configRef);
        if (configSnap.exists() && configSnap.data().namHoc) {
          setAcademicYear(configSnap.data().namHoc);
        }
      } catch (err) {
        console.error("Lỗi tải năm học từ CONFIG:", err);
      }
    };
    fetchConfigYear();
    fetchTeachersAndAccountsData();
  }, []);

  const handleYearChange = async (newYear) => {
    setAcademicYear(newYear);
    try {
      const configRef = doc(db, "CONFIG", "config");
      await setDoc(
        configRef,
        {
          namHoc: newYear,
          updatedAt: new Date(),
        },
        { merge: true }
      );
    } catch (err) {
      console.error("Lỗi lưu năm học lên CONFIG:", err);
    }
  };

  const handleResetPassword = async () => {
    const teacherName = teacherNameToReset.trim();

    if (!teacherName) {
      setMessage({
        type: "error",
        text: "Vui lòng chọn họ tên giáo viên cần reset mật khẩu.",
      });
      setConfirmResetOpen(false);
      return;
    }

    setResetting(true);
    setMessage(null);

    try {
      const teacherId = normalizeTeacherId(teacherName);
      const teacherRef = doc(db, "DANHSACH_GV", teacherId);
      const teacherSnapshot = await getDoc(teacherRef);

      if (!teacherSnapshot.exists()) {
        throw new Error(
          `Không tìm thấy giáo viên "${teacherName}" trong DANHSACH_GV. Vui lòng kiểm tra lại họ tên.`
        );
      }

      await updateDoc(teacherRef, {
        pass: "123",
        academicYear: academicYear,
        updatedAt: new Date(),
      });

      setMessage({
        type: "success",
        text: `Đã reset mật khẩu của ${teacherSnapshot.data().username || teacherName} về 123 (Năm học: ${academicYear}).`,
      });
      setTeacherNameToReset("");
      await fetchTeachersAndAccountsData();
    } catch (error) {
      console.error("Lỗi reset mật khẩu giáo viên:", error);
      setMessage({
        type: "error",
        text: error.message || "Không thể reset mật khẩu. Vui lòng thử lại.",
      });
    } finally {
      setResetting(false);
      setConfirmResetOpen(false);
    }
  };

  const handleResetAllTeachersPassword = async () => {
    setResetting(true);
    setMessage(null);

    try {
      const querySnapshot = await getDocs(collection(db, "DANHSACH_GV"));
      let updatedCount = 0;
      let skippedCount = 0;

      const batch = writeBatch(db);

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const role = (data.role || data.quyen || data.chucVu || "").toLowerCase();
        const docId = docSnap.id.toUpperCase();
        const username = (data.username || "").toLowerCase();

        const isAdminOrBgh =
          role.includes("admin") ||
          role.includes("bgh") ||
          role.includes("ban giám hiệu") ||
          role.includes("ban giam hieu") ||
          docId.includes("ADMIN") ||
          docId.includes("BGH") ||
          username.includes("admin") ||
          username.includes("bgh");

        if (isAdminOrBgh) {
          skippedCount++;
        } else {
          batch.update(docSnap.ref, {
            pass: "123",
            academicYear: academicYear,
            updatedAt: new Date(),
          });
          updatedCount++;
        }
      });

      if (updatedCount > 0) {
        await batch.commit();
      }

      setMessage({
        type: "success",
        text: `Đã reset mật khẩu về 123 cho ${updatedCount} giáo viên (Đã tự động bỏ qua ${skippedCount} tài khoản Admin/BGH).`,
      });
      await fetchTeachersAndAccountsData();
    } catch (error) {
      console.error("Lỗi reset toàn bộ mật khẩu:", error);
      setMessage({
        type: "error",
        text: error.message || "Không thể reset hàng loạt mật khẩu. Vui lòng thử lại.",
      });
    } finally {
      setResetting(false);
      setConfirmResetAllOpen(false);
    }
  };

  const handleFileSelect = async (event) => {
    await handleFileSelectService(event, {
      db,
      academicYear,
      getTextCellValue,
      normalizeTeacherId,
      fetchTeachersAndAccountsData,
      setFileName,
      setMessage,
      setProgress,
      setImporting,
    });
  };

  const handleSubjectFileSelect = async (event) => {
    await handleSubjectFileSelectService(event, {
      db,
      academicYear,
      getTextCellValue,
      normalizeSubjectId,
      setSubjectFileName,
      setSubjectMessage,
      setSubjectProgress,
      setImportingSubject,
    });
  };

  
return (
  <Box
    sx={{
      width: "100%",
      minHeight: "calc(100vh - 60px)",
      backgroundColor: "#f1f5f9",
      px: { xs: 2, sm: 3, md: 4 },
      py: { xs: 2, md: 3 },
      boxSizing: "border-box",
    }}
  >
    {/* CARD NỀN TRẮNG BAO BỌC TOÀN BỘ CHỨC NĂNG */}
    <Card
      elevation={0}
      sx={{
        width: "100%",
        borderRadius: 3,
        backgroundColor: "#ffffff",
        border: "1px solid #e2e8f0",
        boxShadow: "0 8px 24px rgba(15,23,42,0.05)",
        overflow: "hidden",
      }}
    >
      {/* Dải màu trang trí */}
      <Box
        sx={{
          height: 4,
          background: "linear-gradient(90deg, #2563eb, #38bdf8)",
        }}
      />

      <CardContent sx={{ p: { xs: 2.5, sm: 3, md: 3.5 } }}>
        {/* 1. HEADER CHÍNH */}
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          sx={{
            pb: 2.5,
            mb: 3,
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Box
              sx={{
                width: 48,
                height: 48,
                flexShrink: 0,
                borderRadius: 2.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                background:
                  "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                boxShadow: "0 6px 15px rgba(37,99,235,0.2)",
              }}
            >
              <AdminPanelSettingsOutlinedIcon sx={{ fontSize: 26 }} />
            </Box>

            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 800,
                  color: "#0f172a",
                  fontSize: { xs: "1.1rem", sm: "1.4rem" },
                }}
              >
                Quản trị hệ thống
              </Typography>

              <Typography
                variant="body2"
                sx={{ color: "#64748b", fontSize: "0.9rem" }}
              >
                Trường Tiểu học Bình Khánh • Điều hành & Cấu hình dữ liệu
              </Typography>
            </Box>
          </Stack>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            alignItems="center"
            sx={{ width: { xs: "100%", md: "auto" } }}
          >
            <FormControl
              size="small"
              sx={{
                width: { xs: "100%", sm: 220 },
                minWidth: 0,
                backgroundColor: "#f8fafc",
                borderRadius: 2,
              }}
            >
              <InputLabel
                id="academic-year-label"
                sx={{ fontSize: "0.9rem" }}
              >
                📅 Năm học
              </InputLabel>

              <Select
                labelId="academic-year-label"
                value={academicYear}
                label="📅 Năm học"
                onChange={(e) => handleYearChange(e.target.value)}
                sx={{
                  borderRadius: 2,
                  fontWeight: 600,
                  fontSize: "0.9rem",
                }}
              >
                <MenuItem value="2024-2025" sx={{ fontSize: "0.9rem" }}>
                  Năm học 2024 - 2025
                </MenuItem>
                <MenuItem value="2025-2026" sx={{ fontSize: "0.9rem" }}>
                  Năm học 2025 - 2026
                </MenuItem>
                <MenuItem value="2026-2027" sx={{ fontSize: "0.9rem" }}>
                  Năm học 2026 - 2027
                </MenuItem>
                <MenuItem value="2027-2028" sx={{ fontSize: "0.9rem" }}>
                  Năm học 2027 - 2028
                </MenuItem>
                <MenuItem value="2028-2029" sx={{ fontSize: "0.9rem" }}>
                  Năm học 2028 - 2029
                </MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Stack>

        {/* 2. BA CỘT CỐ ĐỊNH THEO TỶ LỆ 1 : 1 : 2 */}
        <Box
          sx={{
            display: "grid",

            // Màn hình nhỏ: xếp dọc.
            // Màn hình md trở lên: cột 1 : cột 2 : cột 3 = 1 : 1 : 2.
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              md: "minmax(0, 1fr) minmax(0, 1fr) minmax(0, 2fr)",
            },

            gap: 3,
            alignItems: "stretch",
            width: "100%",
            minWidth: 0,
            boxSizing: "border-box",
          }}
        >
          {/* ================================================== */}
          {/* CỘT 1: QUẢN LÝ GIÁO VIÊN VÀ MÔN HỌC */}
          {/* ================================================== */}
          <Box sx={{ minWidth: 0, width: "100%" }}>
            <Stack spacing={2.5} sx={{ width: "100%", minWidth: 0 }}>
              {/* NHÓM 1: QUẢN LÝ GIÁO VIÊN */}
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  minWidth: 0,
                  boxSizing: "border-box",
                }}
              >
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 800,
                    color: "#1e293b",
                    mb: 0.5,
                    fontSize: "0.95rem",
                  }}
                >
                  🧑‍🏫 Quản lý Giáo viên
                </Typography>

                <Typography
                  variant="body2"
                  sx={{
                    color: "#64748b",
                    mb: 1.5,
                    fontSize: "0.85rem",
                  }}
                >
                  Import Excel ({academicYear}).
                </Typography>

                <Box
                  sx={{
                    border: "2px dashed #cbd5e1",
                    borderRadius: 2,
                    backgroundColor: "#ffffff",
                    p: 1.5,
                    textAlign: "center",
                    mb: 1,
                    minWidth: 0,
                    boxSizing: "border-box",
                  }}
                >
                  <Typography
                    sx={{
                      fontWeight: 700,
                      color: "#1e293b",
                      fontSize: "0.85rem",
                      mb: 0.5,
                    }}
                  >
                    File giáo viên
                  </Typography>

                  <Typography
                    variant="caption"
                    sx={{
                      color: "#64748b",
                      display: "block",
                      mb: 1,
                      fontSize: "0.8rem",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {fileName ? `Đã chọn: ${fileName}` : ".xlsx, .xls"}
                  </Typography>

                  <Button
                    component="label"
                    variant="contained"
                    size="small"
                    disabled={importing}
                    startIcon={<CloudUploadOutlinedIcon />}
                    sx={{
                      maxWidth: "100%",
                      borderRadius: 1.5,
                      textTransform: "none",
                      fontWeight: 700,
                      fontSize: "0.8rem",
                      backgroundColor: "#2563eb",
                      boxShadow: "none",
                      "&:hover": { backgroundColor: "#1d4ed8" },
                    }}
                  >
                    {importing ? "Đang xử lý..." : "Chọn file"}

                    <input
                      type="file"
                      hidden
                      accept=".xlsx,.xls"
                      disabled={importing}
                      onChange={handleFileSelect}
                    />
                  </Button>
                </Box>

                {importing && (
                  <Box sx={{ mb: 1, minWidth: 0 }}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      spacing={1}
                      sx={{ mb: 0.5 }}
                    >
                      <Typography
                        variant="caption"
                        sx={{ color: "text.secondary", fontSize: "0.8rem" }}
                      >
                        Đang lưu...
                      </Typography>

                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 700,
                          color: "#2563eb",
                          fontSize: "0.8rem",
                        }}
                      >
                        {progress}%
                      </Typography>
                    </Stack>

                    <LinearProgress
                      variant="determinate"
                      value={progress}
                      sx={{ height: 5, borderRadius: 2 }}
                    />
                  </Box>
                )}

                {message && (
                  <Alert
                    severity={message.type}
                    sx={{
                      borderRadius: 1.5,
                      py: 0,
                      alignItems: "center",
                      minWidth: 0,
                      "& .MuiAlert-message": {
                        fontSize: "0.8rem",
                        overflowWrap: "anywhere",
                      },
                    }}
                  >
                    {message.text}
                  </Alert>
                )}
              </Box>

              {/* NHÓM 2: QUẢN LÝ MÔN HỌC */}
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  minWidth: 0,
                  boxSizing: "border-box",
                }}
              >
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 800,
                    color: "#1e293b",
                    mb: 0.5,
                    fontSize: "0.95rem",
                  }}
                >
                  📚 Quản lý Môn học
                </Typography>

                <Typography
                  variant="body2"
                  sx={{
                    color: "#64748b",
                    mb: 1.5,
                    fontSize: "0.85rem",
                  }}
                >
                  Import Excel ({academicYear}).
                </Typography>

                <Box
                  sx={{
                    border: "2px dashed #cbd5e1",
                    borderRadius: 2,
                    backgroundColor: "#ffffff",
                    p: 1.5,
                    textAlign: "center",
                    mb: 1,
                    minWidth: 0,
                    boxSizing: "border-box",
                  }}
                >
                  <Typography
                    sx={{
                      fontWeight: 700,
                      color: "#1e293b",
                      fontSize: "0.85rem",
                      mb: 0.5,
                    }}
                  >
                    File môn học
                  </Typography>

                  <Typography
                    variant="caption"
                    sx={{
                      color: "#64748b",
                      display: "block",
                      mb: 1,
                      fontSize: "0.8rem",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {subjectFileName
                      ? `Đã chọn: ${subjectFileName}`
                      : "Cột 1: Môn | Cột 2: Lớp"}
                  </Typography>

                  <Button
                    component="label"
                    variant="contained"
                    size="small"
                    disabled={importingSubject}
                    startIcon={<CloudUploadOutlinedIcon />}
                    sx={{
                      maxWidth: "100%",
                      borderRadius: 1.5,
                      textTransform: "none",
                      fontWeight: 700,
                      fontSize: "0.8rem",
                      backgroundColor: "#0284c7",
                      boxShadow: "none",
                      "&:hover": { backgroundColor: "#0369a1" },
                    }}
                  >
                    {importingSubject ? "Đang xử lý..." : "Chọn file"}

                    <input
                      type="file"
                      hidden
                      accept=".xlsx,.xls"
                      disabled={importingSubject}
                      onChange={handleSubjectFileSelect}
                    />
                  </Button>
                </Box>

                {importingSubject && (
                  <Box sx={{ mb: 1, minWidth: 0 }}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      spacing={1}
                      sx={{ mb: 0.5 }}
                    >
                      <Typography
                        variant="caption"
                        sx={{ color: "text.secondary", fontSize: "0.8rem" }}
                      >
                        Đang lưu...
                      </Typography>

                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 700,
                          color: "#0284c7",
                          fontSize: "0.8rem",
                        }}
                      >
                        {subjectProgress}%
                      </Typography>
                    </Stack>

                    <LinearProgress
                      variant="determinate"
                      value={subjectProgress}
                      sx={{ height: 5, borderRadius: 2 }}
                    />
                  </Box>
                )}

                {subjectMessage && (
                  <Alert
                    severity={subjectMessage.type}
                    sx={{
                      borderRadius: 1.5,
                      py: 0,
                      alignItems: "center",
                      minWidth: 0,
                      "& .MuiAlert-message": {
                        fontSize: "0.8rem",
                        overflowWrap: "anywhere",
                      },
                    }}
                  >
                    {subjectMessage.text}
                  </Alert>
                )}
              </Box>
            </Stack>
          </Box>

          {/* ================================================== */}
          {/* CỘT 2: PHÂN QUYỀN VÀ RESET MẬT KHẨU */}
          {/* ================================================== */}
          <Box sx={{ minWidth: 0, width: "100%" }}>
            <Stack
              spacing={2.5}
              sx={{ height: "100%", width: "100%", minWidth: 0 }}
            >
              {/* NHÓM PHÂN QUYỀN */}
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  minWidth: 0,
                  boxSizing: "border-box",
                }}
              >
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 800,
                    color: "#1e293b",
                    mb: 0.5,
                    fontSize: "0.95rem",
                  }}
                >
                  🛡️ Phân quyền
                </Typography>

                <Typography
                  variant="body2"
                  sx={{
                    color: "#64748b",
                    mb: 1.5,
                    fontSize: "0.85rem",
                  }}
                >
                  Phân quyền truy cập hệ thống.
                </Typography>

                <Button
                  variant="contained"
                  size="small"
                  fullWidth
                  startIcon={<AssignmentIndOutlinedIcon />}
                  onClick={() =>
                    navigate("/phan-quyen", {
                      state: { from: "/admin" },
                    })
                  }
                  sx={{
                    borderRadius: 1.5,
                    textTransform: "none",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    backgroundColor: "#7c3aed",
                    boxShadow: "none",
                    py: 1,
                    "&:hover": { backgroundColor: "#6d28d9" },
                  }}
                >
                  Mở Phân quyền
                </Button>
              </Box>
              
              {/* NHÓM RESET MẬT KHẨU */}
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  flexGrow: 1,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-start", // Đưa các ô lên sát phía trên
                  gap: 1.5,
                  minWidth: 0,
                  boxSizing: "border-box",
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 800,
                      color: "#1e293b",
                      mb: 0.5,
                      fontSize: "0.95rem",
                    }}
                  >
                    🔑 Reset Mật khẩu
                  </Typography>

                  <Typography
                    variant="body2"
                    sx={{
                      color: "#64748b",
                      mb: 0,
                      fontSize: "0.85rem",
                    }}
                  >
                    Khôi phục mật khẩu về 123.
                  </Typography>
                </Box>

                <Stack spacing={1.5} sx={{ minWidth: 0 }}>
                  {/* RESET MỘT GIÁO VIÊN */}
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 1.5,
                      backgroundColor: "#ffffff",
                      border: "1px solid #cbd5e1",
                      minWidth: 0,
                      boxSizing: "border-box",
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        color: "#334155",
                        display: "block",
                        mb: 1,
                        fontSize: "0.8rem",
                      }}
                    >
                      Cá nhân:
                    </Typography>

                    <Stack spacing={1} sx={{ minWidth: 0 }}>
                      <FormControl
                        size="small"
                        sx={{
                          width: "100%",
                          minWidth: 0,
                          backgroundColor: "#ffffff",
                          borderRadius: 1.5,
                        }}
                      >
                        <InputLabel
                          id="select-teacher-label"
                          sx={{ fontSize: "0.85rem" }}
                        >
                          Chọn GV
                        </InputLabel>

                        <Select
                          labelId="select-teacher-label"
                          value={teacherNameToReset}
                          label="Chọn GV"
                          onChange={(e) => setTeacherNameToReset(e.target.value)}
                          disabled={resetting || importing || importingSubject}
                          sx={{
                            width: "100%",
                            minWidth: 0,
                            borderRadius: 1.5,
                            backgroundColor: "#ffffff",
                            fontSize: "0.85rem",
                          }}
                        >
                          <MenuItem value="" sx={{ fontSize: "0.85rem" }}>
                            <em>-- Chọn GV --</em>
                          </MenuItem>

                          {teachersList.map((name) => (
                            <MenuItem
                              key={name}
                              value={name}
                              sx={{ fontSize: "0.85rem" }}
                            >
                              {name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <Button
                        variant="contained"
                        color="warning"
                        size="small"
                        fullWidth
                        disabled={resetting || !teacherNameToReset.trim()}
                        onClick={() => setConfirmResetOpen(true)}
                        startIcon={<LockResetOutlinedIcon />}
                        sx={{
                          borderRadius: 1.5,
                          textTransform: "none",
                          fontWeight: 700,
                          fontSize: "0.8rem",
                          boxShadow: "none",
                        }}
                      >
                        Reset GV
                      </Button>
                    </Stack>
                  </Box>

                  {/* RESET TOÀN BỘ GIÁO VIÊN */}
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 1.5,
                      backgroundColor: "#fff7ed",
                      border: "1px solid #ffedd5",
                      minWidth: 0,
                      boxSizing: "border-box",
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        color: "#c2410c",
                        display: "block",
                        mb: 1,
                        fontSize: "0.8rem",
                      }}
                    >
                      Hàng loạt:
                    </Typography>

                    <Button
                      variant="contained"
                      color="error"
                      size="small"
                      fullWidth
                      disabled={resetting || importing || importingSubject}
                      onClick={() => setConfirmResetAllOpen(true)}
                      startIcon={<LockResetOutlinedIcon />}
                      sx={{
                        borderRadius: 1.5,
                        textTransform: "none",
                        fontWeight: 700,
                        fontSize: "0.8rem",
                        boxShadow: "none",
                      }}
                    >
                      {resetting ? "Đang xử lý..." : "Reset TOÀN BỘ"}
                    </Button>
                  </Box>
                </Stack>
              </Box>
            </Stack>
          </Box>

          {/* ================================================== */}
          {/* CỘT 3: DANH SÁCH TÀI KHOẢN */}
          {/* ================================================== */}
          <SystemAccountsView
            accountsList={accountsList}
            formatDate={formatDate}
          />
        </Box>
      </CardContent>
    </Card>

    {/* HỘP THOẠI XÁC NHẬN RESET MỘT GIÁO VIÊN */}
    <ConfirmResetDialog
      open={confirmResetOpen}
      onClose={() => setConfirmResetOpen(false)}
      resetting={resetting}
      teacherNameToReset={teacherNameToReset}
      onConfirm={handleResetPassword}
    />

    {/* HỘP THOẠI XÁC NHẬN RESET TOÀN BỘ GIÁO VIÊN */}
    <ConfirmResetAllDialog
      open={confirmResetAllOpen}
      onClose={() => setConfirmResetAllOpen(false)}
      resetting={resetting}
      onConfirm={handleResetAllTeachersPassword}
    />
  </Box>
);

}