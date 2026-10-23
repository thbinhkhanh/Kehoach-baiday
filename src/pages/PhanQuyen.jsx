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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Tabs,
  Tab,
  Snackbar,
  Checkbox,
  FormControlLabel,
} from "@mui/material";

import { db } from "../firebase";
import { collection, getDocs, doc, getDoc, setDoc, writeBatch } from "firebase/firestore";
import { useNavigate, useLocation } from "react-router-dom";
import IconButton from "@mui/material/IconButton";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { handleExcelImportService } from "../utils/excelImportService";
import TeacherAssignmentForm from "../components/TeacherAssignmentForm";
import ExcelImportCard from "../components/ExcelImportCard";

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

  const [academicYear, setAcademicYear] = useState("2026-2027");
  const [teachers, setTeachers] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [assignmentsMap, setAssignmentsMap] = useState({});

  const [assignedRole, setAssignedRole] = useState("GVCN"); // "GVCN", "BM", "TA"
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [assignedClass, setAssignedClass] = useState("1");
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
      return mapData[teacherName].role;
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
        let currentYear = "2026-2027";
        const configRef = doc(db, "CONFIG", "config");
        const configSnap = await getDoc(configRef);
        if (configSnap.exists() && configSnap.data().namHoc) {
          currentYear = configSnap.data().namHoc;
          setAcademicYear(currentYear);
        }

        const gvSnap = await getDocs(collection(db, "DANHSACH_GV"));
        const teacherList = [];
        gvSnap.forEach((d) => {
          const data = d.data();
          const name = data.username || d.id;
          const lower = name.toLowerCase();
          if (lower !== "admin" && lower !== "bgh" && !lower.includes("ban giám hiệu")) {
            teacherList.push({
              id: d.id,
              username: name.toUpperCase(),
              subject: data.subject || "",
            });
          }
        });
        teacherList.sort((a, b) =>
          a.username.split(" ").slice(-1)[0].localeCompare(b.username.split(" ").slice(-1)[0], "vi")
        );
        setTeachers(teacherList);

        const monSnap = await getDocs(collection(db, "MONHOC"));
        const monList = [];
        monSnap.forEach((d) => {
          const data = d.data();
          const subName = data.name || d.id;
          if (subName) {
            monList.push({
              name: subName,
              grades: data.grades || [],
            });
          }
        });
        monList.sort((a, b) => a.name.localeCompare(b.name, "vi"));
        setAllSubjects(monList);

        // Tải dữ liệu từ collection LOP_MONHOC (mỗi doc ID là tên lớp: "1", "2", "3", "4", "5")
        const lopMonHocSnap = await getDocs(collection(db, "LOP_MONHOC"));
        if (!lopMonHocSnap.empty) {
          const savedGradeMap = {};
          lopMonHocSnap.forEach((d) => {
            savedGradeMap[d.id] = d.data().subjects || [];
          });

          // Chuyển đổi về cấu trúc bảng checkbox
          const subMap = {};
          monList.forEach((s) => {
            const applicableGrades = [];
            ["1", "2", "3", "4", "5"].forEach((cls) => {
              if (savedGradeMap[cls] && savedGradeMap[cls].includes(s.name)) {
                applicableGrades.push(cls);
              }
            });
            subMap[s.name] = applicableGrades;
          });
          setClassSubjectMap(subMap);
        } else {
          // Mặc định dựa trên MONHOC hoặc tick tất cả
          const defaultMap = {};
          monList.forEach((s) => {
            const defaultGrades = !s.grades || s.grades.length === 0 ? ["1", "2", "3", "4", "5"] : s.grades.map(String);
            defaultMap[s.name] = defaultGrades;
          });
          setClassSubjectMap(defaultMap);
        }

        const phanQuyenColName = `PHANQUYEN_${currentYear}`;
        const pqSnap = await getDocs(collection(db, phanQuyenColName));
        const map = {};
        pqSnap.forEach((d) => {
          map[d.id] = d.data();
        });
        setAssignmentsMap(map);

        const defaultTeachers = teacherList.filter(
          (t) => determineTeacherRole(t.username, teacherList, map) === "GVCN"
        );
        if (defaultTeachers.length > 0) {
          setSelectedTeacher(defaultTeachers[0].username);
        }
      } catch (err) {
        console.error("Lỗi tải dữ liệu phân quyền:", err);
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
    }
  };

  useEffect(() => {
    if (!selectedTeacher) return;

    const existing = assignmentsMap[selectedTeacher];
    if (existing) {
      setAssignedClass(existing.assignedClass || "1");
      if (Array.isArray(existing.assignedSubjects)) {
        setAssignedSubjects(existing.assignedSubjects);
      } else if (existing.assignedSubject && existing.assignedSubject !== "Tất cả môn GVCN") {
        setAssignedSubjects(existing.assignedSubject.split(",").map((s) => s.trim()).filter(Boolean));
      } else {
        setAssignedSubjects([]);
      }
      setTeachingClasses(existing.teachingClasses || ["1", "2", "3", "4", "5"]);
    } else {
      const currentTeacherObj = teachers.find((t) => t.username === selectedTeacher);
      const subj = (currentTeacherObj?.subject || "").toUpperCase();

      if (assignedRole === "TA") {
        setAssignedSubjects(["Tiếng Anh"]);
        setTeachingClasses(["1", "2", "3", "4", "5"]);
      } else if (assignedRole === "BM") {
        setAssignedSubjects(allSubjects[0]?.name ? [allSubjects[0].name] : []);
        setTeachingClasses(["1", "2", "3", "4", "5"]);
      } else {
        setAssignedClass(subj.replace(/\D/g, "") || "1");
        setTeachingClasses([subj.replace(/\D/g, "") || "1"]);
        setAssignedSubjects([]);
      }
    }
  }, [selectedTeacher]);

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

  // Handler tick chọn môn học theo khối lớp
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

  // Lưu cấu hình Khối lớp và Môn học vào LOP_MONHOC
  const handleSaveClassSubjectMap = async () => {
  setSavingClassSubject(true);
  setMessage(null);
  try {
    // Khởi tạo mảng môn học cho từng lớp từ 1 đến 5
    const gradesMap = { "1": [], "2": [], "3": [], "4": [], "5": [] };

    // Quy định các lớp KHÔNG ĐƯỢC PHÉP có môn đó (để chặn triệt để lỗi lệch state)
    const invalidRules = {
      "Công nghệ": ["1", "2"],
      "Khoa học": ["1", "2", "3"],
      "Lịch sử và Địa lí": ["1", "2", "3"],
      "Tự nhiên và Xã hội": ["4", "5"]
    };

    // Gom nhóm từ Môn học -> Lớp, đồng thời lọc bỏ các trường hợp không hợp lệ
    Object.entries(classSubjectMap).forEach(([subName, grades]) => {
      grades.forEach((g) => {
        const restrictedGrades = invalidRules[subName] || [];
        // Chỉ thêm vào nếu lớp này hợp lệ và tồn tại trong gradesMap
        if (gradesMap[g] && !restrictedGrades.includes(g)) {
          gradesMap[g].push(subName);
        }
      });
    });

    // Lưu mỗi lớp thành một Document riêng biệt trong collection LOP_MONHOC
    // Do dùng batch.set (không có merge: true), Firestore sẽ GHI ĐÈ HOÀN TOÀN,
    // nghĩa là môn nào bị bỏ tích (không có trong mảng subjects) sẽ tự động bị XOÁ khỏi DB.
    const batch = writeBatch(db);
    Object.entries(gradesMap).forEach(([cls, subjects]) => {
      const docRef = doc(db, "LOP_MONHOC", cls);
      batch.set(docRef, {
        subjects: subjects, // Chỉ chứa đúng danh sách các môn đang được check trên giao diện
        updatedAt: new Date(),
      });
    });

    await batch.commit();

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
      const subjectString =
        assignedRole === "GVCN"
          ? "Tất cả môn GVCN"
          : assignedRole === "TA"
          ? "Tiếng Anh"
          : assignedSubjects.join(", ");

      const payload = {
        username: selectedTeacher,
        role: assignedRole,
        assignedClass: assignedRole === "GVCN" ? assignedClass : "",
        assignedSubject: subjectString,
        assignedSubjects: assignedRole === "GVCN" ? ["Tất cả môn GVCN"] : assignedSubjects,
        teachingClasses: assignedRole === "GVCN" ? [assignedClass] : teachingClasses,
        academicYear: academicYear,
        updatedAt: new Date(),
      };

      const phanQuyenColName = `PHANQUYEN_${academicYear}`;
      await setDoc(doc(db, phanQuyenColName, selectedTeacher), payload, { merge: true });

      setAssignmentsMap((prev) => ({
        ...prev,
        [selectedTeacher]: payload,
      }));

      setMessage({
        type: "success",
        text: `Cập nhật thành công`,
      });
    } catch (err) {
      console.error("Lỗi khi lưu phân quyền:", err);
      setMessage({
        type: "error",
        text: "Không thể lưu dữ liệu phân quyền. Vui lòng thử lại.",
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
    .filter((item) => item.role === "BM")
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
            <TeacherAssignmentForm
              assignedRole={assignedRole}
              handleRoleChange={handleRoleChange}
              selectedTeacher={selectedTeacher}
              setSelectedTeacher={setSelectedTeacher}
              filteredTeachers={filteredTeachers}
              assignedSubjects={assignedSubjects}
              handleSubjectChange={handleSubjectChange}
              currentAvailableSubjects={currentAvailableSubjects}
              assignedClass={assignedClass}
              setAssignedClass={setAssignedClass}
              teachingClasses={teachingClasses}
              handleClassCheck={handleClassCheck}
              saving={saving}
              handleSave={handleSave}
            />

            {/* DANH SÁCH PHÂN CÔNG ĐÃ LƯU (TABS & TABLE) */}
            <Box sx={{ mt: 4 }}>
              <Typography
                sx={{
                  fontSize: 18,
                  fontWeight: 750,
                  color: "#172b4d",
                  mb: 2,
                }}
              >
                Danh sách phân công giảng dạy ({academicYear})
              </Typography>

              <Tabs
                value={currentTab}
                onChange={(e, val) => setCurrentTab(val)}
                sx={{
                  borderBottom: "1px solid #e8edf5",
                  mb: 2.5,
                  "& .MuiTab-root": {
                    fontWeight: 700,
                    textTransform: "none",
                    fontSize: "0.95rem",
                  },
                }}
              >
                <Tab label={`GV Chủ nhiệm (${gvcnList.length})`} />
                <Tab label={`Giáo viên Tiếng Anh (${taList.length})`} />
                <Tab label={`Giáo viên Bộ môn (${bmList.length})`} />
              </Tabs>

              <TableContainer
                component={Paper}
                elevation={0}
                sx={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 2.5,
                  maxHeight: 400,
                }}
              >
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, bgcolor: "#f8fafc" }}>STT</TableCell>
                      <TableCell sx={{ fontWeight: 700, bgcolor: "#f8fafc" }}>Họ và tên</TableCell>
                      <TableCell sx={{ fontWeight: 700, bgcolor: "#f8fafc" }}>
                        {currentTab === 0 ? "Lớp chủ nhiệm" : currentTab === 1 ? "Môn học" : "Môn / Lớp phụ trách"}
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {currentTab === 0 &&
                      (gvcnList.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} align="center" sx={{ py: 3, color: "#64748b" }}>
                            Chưa có giáo viên chủ nhiệm nào.
                          </TableCell>
                        </TableRow>
                      ) : (
                        gvcnList.map((item, idx) => (
                          <TableRow key={item.username} hover>
                            <TableCell>{idx + 1}</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>{item.username}</TableCell>
                            <TableCell>Lớp {item.assignedClass || "Chưa gán"}</TableCell>
                          </TableRow>
                        ))
                      ))}

                    {currentTab === 1 &&
                      (taList.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} align="center" sx={{ py: 3, color: "#64748b" }}>
                            Chưa có giáo viên Tiếng Anh nào.
                          </TableCell>
                        </TableRow>
                      ) : (
                        taList.map((item, idx) => (
                          <TableRow key={item.username} hover>
                            <TableCell>{idx + 1}</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>{item.username}</TableCell>
                            <TableCell>{item.assignedSubject || "Tiếng Anh"}</TableCell>
                          </TableRow>
                        ))
                      ))}

                    {currentTab === 2 &&
                      (bmList.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} align="center" sx={{ py: 3, color: "#64748b" }}>
                            Chưa có giáo viên bộ môn nào.
                          </TableCell>
                        </TableRow>
                      ) : (
                        bmList.map((item, idx) => (
                          <TableRow key={item.username} hover>
                            <TableCell>{idx + 1}</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>{item.username}</TableCell>
                            <TableCell>{item.assignedSubject || "Chưa gán"}</TableCell>
                          </TableRow>
                        ))
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* NHÓM MỚI: KHỐI LỚP VÀ MÔN HỌC */}
            <Box sx={{ mt: 1 }}>
              <Typography
                sx={{
                  fontSize: 18,
                  fontWeight: 750,
                  color: "#172b4d",
                  mb: 1.5,
                }}
              >
                Khối lớp và Môn học ({academicYear})
              </Typography>

              <TableContainer
                component={Paper}
                elevation={0}
                sx={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 2.5,
                  mb: 2,
                }}
              >
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, bgcolor: "#f8fafc", width: 60 }}>STT</TableCell>
                      <TableCell sx={{ fontWeight: 700, bgcolor: "#f8fafc" }}>Môn học</TableCell>
                      {["1", "2", "3", "4", "5"].map((cls) => (
                        <TableCell key={cls} align="center" sx={{ fontWeight: 700, bgcolor: "#f8fafc", width: 80 }}>
                          Lớp {cls}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {allSubjects.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 3, color: "#64748b" }}>
                          Chưa có dữ liệu môn học.
                        </TableCell>
                      </TableRow>
                    ) : (
                      allSubjects.map((sub, idx) => {
                        const activeGrades = classSubjectMap[sub.name] || ["1", "2", "3", "4", "5"];
                        return (
                          <TableRow key={sub.name} hover>
                            <TableCell>{idx + 1}</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>{sub.name}</TableCell>
                            {["1", "2", "3", "4", "5"].map((cls) => {
                              // Kiểm tra xem môn học có áp dụng cho khối lớp này theo MONHOC không
                              const isGradeApplicable = !sub.grades || sub.grades.length === 0 || sub.grades.map(String).includes(cls);
                              return (
                                <TableCell key={cls} align="center">
                                  {isGradeApplicable ? (
                                    <Checkbox
                                      checked={activeGrades.includes(cls)}
                                      onChange={() => handleToggleSubjectGrade(sub.name, cls)}
                                      size="small"
                                      color="primary"
                                    />
                                  ) : null}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Button
                  variant="contained"
                  onClick={handleSaveClassSubjectMap}
                  disabled={savingClassSubject}
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 700,
                    bgcolor: "#2457c5",
                    "&:hover": { bgcolor: "#1d459e" },
                  }}
                >
                  {savingClassSubject ? "Đang lưu..." : "Lưu cấu hình Môn học - Lớp"}
                </Button>
              </Box>
            </Box>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* SNACKBAR THÔNG BÁO Ở GÓC DƯỚI PHẢI */}
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