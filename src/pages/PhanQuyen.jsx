import React, { useState, useEffect } from "react";
import ExcelJS from "exceljs";

import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Button,
  Alert,
  Paper,
  Chip,
  Snackbar,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  ListItemText,
  TextField,
} from "@mui/material";

/*import {
  collection,
  getDocs,
  doc,
  getDoc,
  writeBatch,
} from "firebase/firestore";*/

import { db } from "../firebase";
import { useNavigate, useLocation } from "react-router-dom";
import IconButton from "@mui/material/IconButton";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

import { handleExcelImportService } from "../utils/excelImportService";
import { saveTeacherAssignmentService } from "../utils/teacherAssignmentService";

//import TeacherAssignmentForm from "../components/TeacherAssignmentForm";
import ExcelImportCard from "../components/ExcelImportCard";
import BangPhanCongVaMonHoc from "../components/BangPhanCongVaMonHoc";

import { fetchInitialData } from "../utils/fetchDataUtils";
import { luuDanhSachMonHocTheoLop } from "../utils/quanLyMonHoc";
import FormCapNhatPhanCong from "../components/FormCapNhatPhanCong";

const getTextCellValue = (cell) => {
  if (!cell || cell.value == null) return "";
  if (typeof cell.value === "object") {
    if (cell.value.text !== undefined) return String(cell.value.text).trim();
    if (cell.value.result !== undefined) return String(cell.value.result).trim();
    if (cell.value.richText !== undefined) {
      return cell.value.richText.map((item) => item.text).join("").trim();
    }
    return "";
  }
  return String(cell.value).trim();
};

const taoMaGiaoVien = (hoTen) =>
  String(hoTen || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "D")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");

export default function PhanQuyen({ user, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleClose = () => {
    if (location.state?.from === "/admin") {
      navigate("/admin", { replace: true });
    } else {
      navigate(-1);
    }
  };

  const [selectedGrade, setSelectedGrade] = useState("");
  const [academicYear, setAcademicYear] = useState("2026-2027");
  const [teachers, setTeachers] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [assignmentsMap, setAssignmentsMap] = useState({});

  const [assignedRole, setAssignedRole] = useState("GVCN"); // "GVCN", "BM", "TA"
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [assignedClass, setAssignedClass] = useState("1.1");
  const [assignedSubjects, setAssignedSubjects] = useState([]);
  const [teachingClasses, setTeachingClasses] = useState(["1", "2", "3", "4", "5"]);

  // State quản lý Khối lớp và Môn học (Lưu vào LOP_MONHOC)
  const [classSubjectMap, setClassSubjectMap] = useState({});
  const [savingClassSubject, setSavingClassSubject] = useState(false);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState("");
  const [importProgress, setImportProgress] = useState(0);

  // State quản lý tab đang chọn (0: GVCN, 1: Tiếng Anh, 2: Bộ môn)
  const [currentTab, setCurrentTab] = useState(0);

  const determineTeacherRole = (teacherName, teachList, mapData) => {
    if (mapData[teacherName] && mapData[teacherName].role) {
      const r = mapData[teacherName].role;
      return r === "GVBM" ? "BM" : r;
    }
    const tObj = teachList.find((t) => t.username === teacherName);
    const subj = (tObj?.subject || "").toUpperCase();
    if (subj === "TA" || subj.includes("ANH") || subj.includes("TIẾNG ANH")) return "TA";
    if (subj === "BM" || subj.includes("TIN") || subj.includes("MĨ THUẬT") || subj.includes("ĐẠO ĐỨC") || subj.includes("THỂ CHẤT") || subj.includes("ÂM NHẠC")) return "BM";
    return "GVCN";
  };

  useEffect(() => {
  const initData = async () => {
    try {
      const data = await fetchInitialData(db, determineTeacherRole);
      
      setAcademicYear(data.academicYear);
      setTeachers(data.teacherList);
      setAllSubjects(data.monList);
      setClassSubjectMap(data.classSubjectMap);
      setAssignmentsMap(data.assignmentsMap);
      
      if (data.defaultSelectedTeacher) {
        setSelectedTeacher(data.defaultSelectedTeacher);
      }
    } catch (err) {
      // Đã xử lý log lỗi ở utils, có thể thêm state hiển thị lỗi nếu muốn
    }
  };

  initData();
}, []);

  const filteredTeachers = teachers.filter(
    (t) => determineTeacherRole(t.username, teachers, assignmentsMap) === assignedRole
  );

  const handleRoleChange = (e) => {
    const newRole = e.target.value;
    setAssignedRole(newRole);

    const newFiltered = teachers.filter(
      (t) => determineTeacherRole(t.username, teachers, assignmentsMap) === newRole
    );
    if (newFiltered.length > 0) {
      setSelectedTeacher(newFiltered[0].username);
    } else {
      setSelectedTeacher("");
    }

    if (newRole === "TA") {
      setAssignedSubjects(["Tiếng Anh"]);
      setTeachingClasses(["1", "2", "3", "4", "5"]);
    } else if (newRole === "BM") {
      setAssignedSubjects([]);
      setTeachingClasses(["1", "2", "3", "4", "5"]);
    }
  };

  useEffect(() => {
    if (!selectedTeacher) return;

    const currentTeacherObj = teachers.find((t) => t.username === selectedTeacher);
    const defaultSubj = (currentTeacherObj?.subject || "").trim();

    const existing = assignmentsMap[selectedTeacher];
    if (existing) {
      const savedClass = existing.assignedClass || "";
      const useClass = savedClass ? savedClass : (defaultSubj.includes(".") ? defaultSubj : "1.1");

      setAssignedClass(useClass);
      setSelectedGrade(
        String(useClass || "").replace(/^lớp\s*/i, "").split(".")[0] || ""
      );

      if (Array.isArray(existing.assignedSubjects)) {
        setAssignedSubjects(existing.assignedSubjects);
      } else if (existing.assignedSubject && existing.assignedSubject !== "Tất cả môn GVCN") {
        setAssignedSubjects(existing.assignedSubject.split(",").map((s) => s.trim()).filter(Boolean));
      } else {
        setAssignedSubjects(assignedRole === "TA" ? ["Tiếng Anh"] : []);
      }
      setTeachingClasses(existing.teachingClasses?.length > 0 ? existing.teachingClasses : ["1", "2", "3", "4", "5"]);
    } else {
      const classCode = defaultSubj.includes(".") ? defaultSubj : "1.1";
      setAssignedClass(classCode);
      setSelectedGrade(
        String(classCode || "").replace(/^lớp\s*/i, "").split(".")[0] || ""
      );
      setTeachingClasses(["1", "2", "3", "4", "5"]);
      setAssignedSubjects(assignedRole === "TA" ? ["Tiếng Anh"] : []);
    }
  }, [selectedTeacher, teachers, assignmentsMap, assignedRole]);

  const getFilteredSubjects = () => {
    if (assignedRole === "TA") {
      return [{ name: "Tiếng Anh", grades: ["1", "2", "3", "4", "5"] }];
    }
    return allSubjects.filter((s) => {
      if (s.name.toLowerCase().includes("tiếng anh")) return false;
      if (!s.grades || s.grades.length === 0) return true;
      return s.grades.some((g) => teachingClasses.includes(String(g)));
    });
  };

  const currentAvailableSubjects = getFilteredSubjects();

  const handleClassCheck = (clsStr) => {
    if (teachingClasses.includes(clsStr)) {
      setTeachingClasses(teachingClasses.filter((c) => c !== clsStr));
    } else {
      setTeachingClasses([...teachingClasses, clsStr].sort());
    }
  };

  const handleSubjectChange = (event) => {
    const {
      target: { value },
    } = event;
    setAssignedSubjects(typeof value === "string" ? value.split(",") : value);
  };

  const handleToggleSubjectGrade = (subjectName, grade) => {
    setClassSubjectMap((prev) => {
      const currentGrades = prev[subjectName] || ["1", "2", "3", "4", "5"];
      let updatedGrades;
      if (currentGrades.includes(grade)) {
        updatedGrades = currentGrades.filter((g) => g !== grade);
      } else {
        updatedGrades = [...currentGrades, grade].sort();
      }
      return {
        ...prev,
        [subjectName]: updatedGrades,
      };
    });
  };

  const handleSaveClassSubjectMap = async () => {
    setSavingClassSubject(true);
    setMessage(null);
    try {
      await luuDanhSachMonHocTheoLop(db, classSubjectMap);
      
      setMessage({
        type: "success",
        text: "Lưu cấu hình Môn học theo lớp thành công!",
      });
    } catch (err) {
      console.error("Lỗi khi lưu LOP_MONHOC:", err);
      setMessage({
        type: "error",
        text: "Không thể lưu cấu hình. Vui lòng thử lại.",
      });
    } finally {
      setSavingClassSubject(false);
    }
  };

  const handleSave = async () => {
    if (!selectedTeacher) return;

    setSaving(true);
    setMessage(null);

    try {
      const res = await saveTeacherAssignmentService({
        selectedTeacher,
        teachers,
        assignedRole,
        assignedClass,
        assignedSubjects,
        teachingClasses,
        academicYear,
        taoMaGiaoVien,
      });

      setAssignmentsMap((prev) => ({
        ...prev,
        [res.selectedTeacher]: res.payload,
      }));

      setMessage({
        type: "success",
        text: res.message,
      });
    } catch (err) {
      console.error("Lỗi khi lưu phân quyền:", err);

      setMessage({
        type: "error",
        text: err.message || "Không thể lưu dữ liệu. Vui lòng thử lại.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleExcelImport = async (event) => {
    await handleExcelImportService(event, {
      db,
      academicYear,
      getTextCellValue,
      setFileName,
      setMessage,
      setImportProgress,
      setImporting,
      setAssignmentsMap,
      setTeachers,
    });
  };

  const assignmentsList = Object.values(assignmentsMap);

  const gvcnList = assignmentsList
    .filter((item) => item.role === "GVCN")
    .sort((a, b) => String(a.assignedClass || "").localeCompare(String(b.assignedClass || ""), "vi", { numeric: true }));

  const taList = assignmentsList
    .filter((item) => item.role === "TA")
    .sort((a, b) => {
      const getLastName = (name) => {
        const parts = name.trim().split(/\s+/);
        return parts[parts.length - 1] || "";
      };
      const cmp = getLastName(a.username).localeCompare(getLastName(b.username), "vi");
      if (cmp !== 0) return cmp;
      return a.username.localeCompare(b.username, "vi");
    });

  const bmList = assignmentsList
    .filter((item) => item.role === "BM" || item.role === "GVBM")
    .sort((a, b) => String(a.assignedSubject || "").localeCompare(String(b.assignedSubject || ""), "vi"));

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "800px",
        minHeight: "100vh",
        boxSizing: "border-box",
        bgcolor: "#f4f7fb",
        px: { xs: 1.5, sm: 2.5 },
        py: { xs: 2, sm: 3 },
        mx: "auto",
      }}
    >
      <Card
        elevation={0}
        sx={{
          width: "100%",
          minWidth: 0,
          borderRadius: { xs: 2.5, sm: 3 },
          bgcolor: "#ffffff",
          border: "1px solid #e3eaf4",
          boxShadow: "0 8px 30px rgba(15, 23, 42, 0.06)",
          overflow: "hidden",
        }}
      >
        <CardContent
          sx={{
            p: { xs: 1.5, sm: 2.5, md: 3 },
            "&:last-child": {
              pb: { xs: 1.5, sm: 2.5, md: 3 },
            },
          }}
        >
          <Stack
            spacing={2.5}
            sx={{
              width: "100%",
              minWidth: 0,
            }}
          >
            {/* TIÊU ĐỀ TRANG */}
            <Box
              sx={{
                position: "relative",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 2,
                pb: 2.5,
                borderBottom: "1px solid #e8edf5",
              }}
            >
              <Box
                sx={{
                  minWidth: 0,
                  flex: 1,
                  textAlign: "center",
                }}
              >
                <Typography
                  sx={{
                    fontSize: { xs: 19, sm: 23 },
                    fontWeight: 800,
                    color: "#172b4d",
                    letterSpacing: "-0.4px",
                    lineHeight: 1.35,
                    textAlign: "center",
                  }}
                >
                  PHÂN QUYỀN GIẢNG DẠY
                </Typography>

                <Box
                  sx={{
                    mt: 1,
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <Chip
                    label={`Năm học ${academicYear}`}
                    sx={{
                      height: 30,
                      borderRadius: 2,
                      bgcolor: "#edf4ff",
                      color: "#2457c5",
                      fontWeight: 700,
                      border: "1px solid #d8e6ff",
                      "& .MuiChip-label": { px: 1.5 },
                    }}
                  />
                </Box>
              </Box>

              <IconButton
                onClick={handleClose}
                sx={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  bgcolor: "#f1f5f9",
                  color: "#64748b",
                  border: "1px solid #e2e8f0",
                  "&:hover": {
                    bgcolor: "#fee2e2",
                    color: "#ef4444",
                    borderColor: "#fca5a5",
                  },
                  zIndex: 10,
                }}
                title="Đóng trang phân quyền"
                aria-label="Đóng trang phân quyền"
              >
                <CloseRoundedIcon fontSize="small" />
              </IconButton>
            </Box>

            {/* IMPORT EXCEL */}
            <ExcelImportCard
              importing={importing}
              handleExcelImport={handleExcelImport}
              fileName={fileName}
              importProgress={importProgress}
            />

            {/* PHÂN CÔNG CHI TIẾT */}
              <Box>
                <FormCapNhatPhanCong
                  assignedRole={assignedRole}
                  handleRoleChange={handleRoleChange}
                  selectedTeacher={selectedTeacher}
                  setSelectedTeacher={setSelectedTeacher}
                  filteredTeachers={filteredTeachers}
                  teachers={teachers}
                  assignmentsMap={assignmentsMap}
                  gvcnList={gvcnList}
                  assignedClass={assignedClass}
                  setAssignedClass={setAssignedClass}
                  selectedGrade={selectedGrade}
                  setSelectedGrade={setSelectedGrade}
                  assignedSubjects={assignedSubjects}
                  handleSubjectChange={handleSubjectChange}
                  currentAvailableSubjects={currentAvailableSubjects}
                  teachingClasses={teachingClasses}
                  handleClassCheck={handleClassCheck}
                  handleSave={handleSave}
                  saving={saving}
                />
              </Box>

            {/* DANH SÁCH PHÂN CÔNG ĐÃ LƯU (TABS & TABLE) */}
       
              <Box>
                {/* Các nội dung khác nếu có */}

                <BangPhanCongVaMonHoc
                  academicYear={academicYear}
                  currentTab={currentTab}
                  setCurrentTab={setCurrentTab}
                  gvcnList={gvcnList}
                  taList={taList}
                  bmList={bmList}
                  allSubjects={allSubjects}
                  classSubjectMap={classSubjectMap}
                  handleToggleSubjectGrade={handleToggleSubjectGrade}
                  handleSaveClassSubjectMap={handleSaveClassSubjectMap}
                  savingClassSubject={savingClassSubject}
                />
              </Box>
          </Stack>
        </CardContent>
      </Card>

      <Snackbar
        open={Boolean(message)}
        autoHideDuration={4000}
        onClose={() => setMessage(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setMessage(null)}
          severity={message?.type || "success"}
          variant="filled"
          sx={{ width: "100%", borderRadius: 2, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}
        >
          {message?.text}
        </Alert>
      </Snackbar>
    </Box>
  );
}