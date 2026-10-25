import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  deleteDoc, 
  doc,
  getDoc 
} from "firebase/firestore";
import { uploadBatchKeHoachDayHoc } from "../utils/uploadService";
import { deleteGoogleDriveFile } from "../utils/uploadService";
import TeacherStatsView from "../components/TeacherStatsView";
import FileListCard from "../components/FileListCard";
import ConfirmDeleteDialog from "../dialogs/ConfirmDeleteDialog";

import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Snackbar,
  Alert,
  Dialog,
  DialogContent,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

export default function Users({ user }) {
  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  
  const [teacherName, setTeacherName] = useState("");
  const [academicYear, setAcademicYear] = useState("2026-2027");
  
  const [teacherRole, setTeacherRole] = useState("GVCN");
  const [teacherAssignedSubjects, setTeacherAssignedSubjects] = useState([]);
  const [allMonHoc, setAllMonHoc] = useState([]);
  const [assignedClassesList, setAssignedClassesList] = useState([]);

  const [subject, setSubject] = useState("");
  const [className, setClassName] = useState("");

  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMode, setUploadMode] = useState("upload");
  const [currentFileMsg, setCurrentFileMsg] = useState("");

  const [statsData, setStatsData] = useState([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [lopMonHocMap, setLopMonHocMap] = useState({}); 
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [filesToDelete, setFilesToDelete] = useState([]);

  // 📱 State quản lý bật/tắt bảng thống kê trên điện thoại
  const [mobileStatsOpen, setMobileStatsOpen] = useState(false);

  // State quản lý Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success", 
  });

  const showMessage = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  // ✅ Bước 1: Lấy năm học, danh sách MONHOC và phân quyền của giáo viên
  useEffect(() => {
    const fetchTeacherAssignmentAndSubjects = async () => {
      if (!user || user.role === "admin" || user.role === "bgh") return;

      try {
        let currentYear = "2026-2027";
        const configRef = doc(db, "CONFIG", "config");
        const configSnap = await getDoc(configRef);
        if (configSnap.exists() && configSnap.data().namHoc) {
          currentYear = configSnap.data().namHoc;
          setAcademicYear(currentYear);
        }

        const monSnap = await getDocs(collection(db, "MONHOC"));
        const monList = [];
        monSnap.forEach((d) => {
          const data = d.data();
          if (data.name) {
            monList.push({
              name: data.name,
              grades: data.grades || [],
            });
          }
        });
        setAllMonHoc(monList);

        const lopMonHocSnap = await getDocs(collection(db, "LOP_MONHOC"));
        const lopMap = {};
        lopMonHocSnap.forEach((d) => {
          lopMap[d.id] = d.data().subjects || [];
        });
        setLopMonHocMap(lopMap);

        const rawName = user.username || "";
        const foundName = rawName.trim().toUpperCase();
        setTeacherName(foundName);

        const phanQuyenColName = `PHANQUYEN_${currentYear}`;
        const pqDocRef = doc(db, phanQuyenColName, foundName);
        let pqSnap = await getDoc(pqDocRef);

        if (!pqSnap.exists()) {
          const allPqSnap = await getDocs(collection(db, phanQuyenColName));
          let matchedData = null;
          allPqSnap.forEach((d) => {
            const data = d.data();
            const docIdUpper = d.id.toUpperCase();
            if (
              docIdUpper === foundName || 
              docIdUpper.includes(foundName) ||
              foundName.includes(docIdUpper) ||
              (data.username && data.username.toUpperCase() === foundName)
            ) {
              matchedData = data;
              setTeacherName(data.username.toUpperCase());
            }
          });

          if (matchedData) {
            pqSnap = { exists: () => true, data: () => matchedData };
          }
        }

        if (pqSnap.exists()) {
          const pqData = pqSnap.data();
          if (pqData.username) {
            setTeacherName(pqData.username.toUpperCase());
          }

          const role = pqData.role || "GVCN";
          setTeacherRole(role);

          let subs = [];
          if (Array.isArray(pqData.assignedSubjects) && pqData.assignedSubjects.length > 0) {
            subs = pqData.assignedSubjects;
          } else if (pqData.assignedSubject) {
            subs = pqData.assignedSubject.split(",").map(s => s.trim()).filter(Boolean);
          }
          setTeacherAssignedSubjects(subs);

          let cls = [];
          if (role === "GVCN") {
            if (pqData.assignedClass) {
              cls = [pqData.assignedClass];
            } else if (Array.isArray(pqData.teachingClasses) && pqData.teachingClasses.length > 0) {
              cls = pqData.teachingClasses;
            } else {
              cls = ["1"];
            }
          } else {
            if (Array.isArray(pqData.teachingClasses) && pqData.teachingClasses.length > 0) {
              cls = pqData.teachingClasses;
            } else {
              cls = ["1", "2", "3", "4", "5"];
            }
          }
          setAssignedClassesList(cls);
          if (cls.length > 0) setClassName(cls[0]);

        } else {
          setTeacherRole("GVCN");
          setTeacherAssignedSubjects([]);
          setAssignedClassesList(["1", "2", "3", "4", "5"]);
          setClassName("1");
        }
      } catch (err) {
        console.error("❌ Lỗi khi tải dữ liệu:", err);
      }
    };

    fetchTeacherAssignmentAndSubjects();
  }, [user]);

  // ✅ Bước 2: Lọc danh sách môn học hiển thị
  const getAvailableSubjects = () => {
    if (!className || allMonHoc.length === 0) return [];

    // Lớp 5.4 -> khối 5; lớp 4 -> khối 4
    const selectedGrade = String(className).split(".")[0];

    const gradeMatches = (grades) => {
      if (!Array.isArray(grades) || grades.length === 0) return true;

      return grades.some(
        (grade) => String(grade).trim().split(".")[0] === selectedGrade
      );
    };

    const isAssignedSubject = (name) =>
      teacherAssignedSubjects.some(
        (assigned) =>
          String(assigned).trim().toLowerCase() ===
          String(name).trim().toLowerCase()
      );

    const hasAllSubjectsPermission =
      teacherAssignedSubjects.length === 0 ||
      teacherAssignedSubjects.some((s) =>
        String(s).toLowerCase().includes("tất cả")
      );

    // Giáo viên Tiếng Anh
    if (teacherRole === "TA") {
      const taSubject = allMonHoc.find((s) =>
        s.name.toLowerCase().includes("tiếng anh")
      );

      return taSubject && gradeMatches(taSubject.grades)
        ? [taSubject.name]
        : [];
    }

    // Giáo viên bộ môn: chỉ hiện môn đã được phân quyền
    if (teacherRole === "BM") {
      return allMonHoc
        .filter(
          (sub) =>
            isAssignedSubject(sub.name) && gradeMatches(sub.grades)
        )
        .map((sub) => sub.name);
    }

    // Giáo viên chủ nhiệm
    if (teacherRole === "GVCN") {
      // Ưu tiên danh sách môn trong LOP_MONHOC theo mã lớp,
      // nếu không có thì thử theo khối.
      const subjectsForClass =
        lopMonHocMap[String(className)] ||
        lopMonHocMap[selectedGrade] ||
        [];

      let subjects = [];

      if (subjectsForClass.length > 0) {
        subjects = allMonHoc
          .filter((sub) =>
            subjectsForClass.some(
              (name) =>
                String(name).trim().toLowerCase() ===
                String(sub.name).trim().toLowerCase()
            )
          )
          .map((sub) => sub.name);
      } else {
        const specialistKeywords = [
          "tiếng anh",
          "tin học",
          "mĩ thuật",
          "mỹ thuật",
          "âm nhạc",
          "thể dục",
          "giáo dục thể chất",
        ];

        subjects = allMonHoc
          .filter((sub) => {
            if (!gradeMatches(sub.grades)) return false;

            if (!hasAllSubjectsPermission) {
              return isAssignedSubject(sub.name);
            }

            return !specialistKeywords.some((keyword) =>
              sub.name.toLowerCase().includes(keyword)
            );
          })
          .map((sub) => sub.name);
      }

      // Nếu có danh sách môn cụ thể trong phân quyền, tiếp tục giới hạn.
      if (!hasAllSubjectsPermission) {
        subjects = subjects.filter(isAssignedSubject);
      }

      return [...new Set(subjects)];
    }

    return allMonHoc
      .filter((sub) => gradeMatches(sub.grades))
      .map((sub) => sub.name);
  };

  const assignedSubjectsList = getAvailableSubjects();

  useEffect(() => {
    if (assignedSubjectsList.length > 0 && !assignedSubjectsList.includes(subject)) {
      setSubject(assignedSubjectsList[0]);
    } else if (assignedSubjectsList.length === 0) {
      setSubject("");
    }
  }, [className, teacherRole, lopMonHocMap, allMonHoc]);

  // ✅ Lấy danh sách file từ Firestore theo cấu trúc subcollection môn học
  
  const fetchFileList = async () => {
    if (!teacherName || !className || !subject || !academicYear) {
      setFileList([]);
      return;
    }

    try {
      const yearCol = `KEHOACH_DAYHOC_${academicYear}`;

      const filesRef = collection(
        db,
        yearCol,
        teacherName,
        subject
      );

      const querySnapshot = await getDocs(filesRef);

      const selectedClass = String(className).trim();
      const selectedGrade = selectedClass.split(".")[0];
      const files = [];

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const docId = docSnap.id;

        // Trường hợp mới: Khoi_5.8_...
        const exactClassPattern = new RegExp(
          `^Khoi_${selectedClass.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}_`,
          "i"
        );

        const idMatchesExactClass = exactClassPattern.test(docId);

        // Trường hợp cũ: Khoi_5_...
        const oldGradePattern = /^Khoi_(\d+)_/i;
        const oldIdMatch = docId.match(oldGradePattern);

        const idMatchesOldGrade =
          oldIdMatch !== null &&
          oldIdMatch[1] === selectedGrade;

        // Dự phòng nếu thông tin lớp được lưu trong dữ liệu.
        const classValues = [
          data.lop,
          data.lopHoc,
          data.maLop,
          data.className,
          data.class,
          data.khoi,
          data.grade,
        ]
          .filter((value) => value !== undefined && value !== null)
          .map((value) =>
            String(value)
              .trim()
              .replace(/^(khối|khoi|lớp|lop)\s*/i, "")
              .replace(/^Khoi_/i, "")
          );

        const dataMatchesExactClass = classValues.some(
          (value) => value === selectedClass
        );

        const dataMatchesGrade = classValues.some(
          (value) => value === selectedGrade
        );

        // Nhận tài liệu theo lớp chính xác hoặc theo cấu trúc dữ liệu cũ.
        const matchesClass =
          idMatchesExactClass ||
          idMatchesOldGrade ||
          dataMatchesExactClass ||
          dataMatchesGrade;

        if (matchesClass) {
          files.push({
            id: docSnap.id,
            ...data,
          });
        }
      });

      // Tài liệu mới nhất hiển thị trước.
      const getTime = (value) => {
        if (!value) return 0;

        if (typeof value.toMillis === "function") {
          return value.toMillis();
        }

        const time = new Date(value).getTime();
        return Number.isNaN(time) ? 0 : time;
      };

      files.sort(
        (a, b) => getTime(b.createdAt) - getTime(a.createdAt)
      );

      setFileList(files);

      console.log("Danh sách tài liệu đã lọc:", {
        teacherName,
        subject,
        selectedClass,
        selectedGrade,
        totalDocuments: querySnapshot.size,
        matchedDocuments: files.length,
        documentIds: files.map((file) => file.id),
      });
    } catch (err) {
      console.error("Lỗi khi tải danh sách file:", err);
      setFileList([]);
    }
  };


  // ✅ Thống kê cá nhân của giáo viên
  const fetchTeacherStats = async () => {
    if (!teacherName || !academicYear) return;

    setLoadingStats(true);

    try {
      const yearCol = `KEHOACH_DAYHOC_${academicYear}`;
      const stats = [];

      const isGVCN = teacherRole === "GVCN";

      const classCode = String(
        className ||
        assignedClassesList[0] ||
        "1"
      );

      const selectedGrade = classCode.split(".")[0];

      let subjectsToQuery = [];

      if (isGVCN) {
        // Thống kê theo danh sách môn được phép hiển thị của GVCN.
        // Nếu danh sách chưa có, lấy các môn thuộc khối chủ nhiệm.
        subjectsToQuery = assignedSubjectsList.length > 0
          ? assignedSubjectsList
          : allMonHoc
              .filter((sub) => {
                const grades = (sub.grades || []).map((g) =>
                  String(g).split(".")[0]
                );

                return (
                  grades.length === 0 ||
                  grades.includes(selectedGrade)
                );
              })
              .map((sub) => sub.name);
      } else if (teacherRole === "TA") {
        subjectsToQuery = assignedSubjectsList;
      } else if (teacherRole === "BM") {
        // Giữ đúng các môn được phân quyền, không lấy tất cả môn.
        subjectsToQuery = teacherAssignedSubjects.filter(
          (s) => !String(s).toLowerCase().includes("tất cả")
        );

        if (subjectsToQuery.length === 0) {
          subjectsToQuery = assignedSubjectsList;
        }
      } else {
        subjectsToQuery = assignedSubjectsList;
      }

      subjectsToQuery = [...new Set(subjectsToQuery.filter(Boolean))];

      for (const subjectName of subjectsToQuery) {
        try {
          const subjectRef = collection(
            db,
            yearCol,
            teacherName,
            subjectName
          );

          const subjectSnap = await getDocs(subjectRef);

          const entry = {
            subject: subjectName,
            username: teacherName,
          };

          subjectSnap.forEach((docSnap) => {
            const data = docSnap.data();
            const docId = docSnap.id;

            // Ví dụ ID: Khoi_4_DKgac1qsvC7YxRLA2BXz
            const idMatch = docId.match(/^Khoi_(\d+)_/i);

            let grade = idMatch?.[1];

            // Dự phòng với tài liệu không có ID dạng Khoi_<khối>_<mã>.
            if (!grade) {
              const khoiValue = String(
                data.khoi || data.className || ""
              ).trim();

              const valueMatch = khoiValue.match(
                /^(?:khối|khoi|lớp|lop)\s*(\d+)/i
              );

              grade = valueMatch?.[1];
            }

            const hasFile =
              /^Khoi_\d+_/i.test(docId) ||
              Boolean(
                data.fileURL ||
                data.fileUrl ||
                data.url ||
                data.fileName ||
                data.tenFile
              );

            if (!hasFile) return;

            if (isGVCN) {
              // GVCN: đưa số lượng vào cột mã lớp chủ nhiệm.
              entry[classCode] = (entry[classCode] || 0) + 1;
            } else if (grade) {
              // Giáo viên bộ môn: cộng riêng theo khối 1–5.
              entry[grade] = (entry[grade] || 0) + 1;
            }
          });

          // Giữ cả môn chưa có file để danh sách môn theo phân quyền
          // không bị mất chỉ vì chưa có tài liệu được tải lên.
          stats.push(entry);
        } catch (error) {
          console.error(
            `Lỗi thống kê môn "${subjectName}":`,
            error
          );
        }
      }

      setStatsData(stats);
    } catch (error) {
      console.error("Lỗi khi thống kê cá nhân:", error);
      setStatsData([]);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (
      teacherName &&
      academicYear &&
      teacherRole &&
      assignedClassesList.length > 0
    ) {
      fetchTeacherStats();
    }
  }, [
    teacherName,
    academicYear,
    teacherRole,
    teacherAssignedSubjects,
    assignedClassesList,
    allMonHoc,
    lopMonHocMap,
    //className,
  ]);

  // ✅ Xử lý tải file lên
  const handleUpload = async (e) => {
    const rawFiles = Array.from(e.target.files);
    e.target.value = null;
    if (rawFiles.length === 0) return;

    /*const files = rawFiles.map((file) => {
      let cleaned = file.name.replace(/^\d+_[_-]?/, ""); // ✂️ Cắt bỏ dãy số ở đây nè!
      const lastDotIndex = cleaned.lastIndexOf(".");
      let nameWithoutExt = lastDotIndex !== -1 ? cleaned.substring(0, lastDotIndex) : cleaned;
      let ext = lastDotIndex !== -1 ? cleaned.substring(lastDotIndex) : "";

      nameWithoutExt = nameWithoutExt.toUpperCase().replace(/_/g, " ");
      const finalName = nameWithoutExt + ext.toLowerCase();

      return new File([file], finalName, { type: file.type });
    });*/

    const files = rawFiles.map((file) => {
      // Bỏ dòng cắt dãy số, sử dụng trực tiếp tên gốc của file
      const lastDotIndex = file.name.lastIndexOf(".");
      let nameWithoutExt = lastDotIndex !== -1 ? file.name.substring(0, lastDotIndex) : file.name;
      let ext = lastDotIndex !== -1 ? file.name.substring(lastDotIndex) : "";

      nameWithoutExt = nameWithoutExt.toUpperCase().replace(/_/g, " ");
      const finalName = nameWithoutExt + ext.toLowerCase();

      return new File([file], finalName, { type: file.type });
    });

    for (const file of files) {
      if (
        ![
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ].includes(file.type)
      ) {
        showMessage(`⚠️ File "${file.name}" không hợp lệ. Chỉ hỗ trợ .doc hoặc .docx`, "warning");
        return;
      }
    }

    if (!subject || !className || !teacherName) {
      showMessage("⚠️ Thiếu thông tin Môn học, Lớp hoặc Tên giáo viên!", "warning");
      return;
    }

    try {
      setUploadMode("upload");
      setUploading(true);
      setUploadProgress(0);
      setCurrentFileMsg(` ${files.length} file...`);

      let groupFolder = `Khối ${className}`;
      if (teacherRole === "TA") {
        groupFolder = "Tiếng Anh";
      } else if (teacherRole === "BM") {
        groupFolder = "Bộ môn";
      }

      const metadata = {
        giaoVien: teacherName,
        khoi: `Khối ${className}`,
        monHoc: subject,
        academicYear: academicYear,
        nhomPhanLoai: groupFolder,
      };

      let currentProgress = 0;
      let elapsed = 0;
      const progressInterval = setInterval(() => {
        elapsed++;
        const increment = Math.min(4, 0.3 + elapsed * 0.12);
        currentProgress = Math.min(90, currentProgress + increment);
        setUploadProgress(Math.round(currentProgress));
      }, 200);

      const res = await uploadBatchKeHoachDayHoc(files, metadata);
      clearInterval(progressInterval);

      if (!res.success) throw new Error(res.error);

      setUploadProgress(100);
      await fetchFileList();

      setStatsData((prevStats) => {
        const newStats = prevStats.map((item) => ({ ...item }));
        let entry = newStats.find((item) => item.subject === subject);
        const khoiKey = className;

        if (entry) {
          entry[khoiKey] = (entry[khoiKey] || 0) + files.length;
        } else {
          newStats.push({
            subject: subject,
            [khoiKey]: files.length,
          });
        }
        return newStats;
      });

      showMessage(`🎉 Đã tải thành công ${files.length} file lên hệ thống!`, "success");

    } catch (err) {
      console.error("❌ Lỗi khi upload:", err);
      showMessage("❌ Không thể tải file lên: " + err.message, "error");
    } finally {
      setTimeout(() => {
        setUploadProgress(0);
        setCurrentFileMsg("");
        setUploading(false);
      }, 1000);
    }
  };
  
  // ✅ Xóa file
  const handleDeleteFiles = (files) => {
    if (!files || files.length === 0) return;
    setFilesToDelete(files);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (filesToDelete.length === 0) return;

    setDeleteDialogOpen(false);

    const fileIdsToDelete = new Set(filesToDelete.map((f) => f.id));
    setFileList((prevList) => prevList.filter((f) => !fileIdsToDelete.has(f.id)));
    showMessage("🗑️ Đã xóa file thành công!", "success");

    setStatsData((prevStats) => {
      const newStats = prevStats.map((item) => ({ ...item }));
      let entry = newStats.find((item) => item.subject === subject);
      const khoiKey = className;

      if (entry) {
        entry[khoiKey] = Math.max(0, (entry[khoiKey] || 0) - filesToDelete.length);
      }
      return newStats;
    });

    (async () => {
      const yearCol = `KEHOACH_DAYHOC_${academicYear}`;
      for (const file of filesToDelete) {
        try {
          if (file.fileId) {
            await deleteGoogleDriveFile(file.fileId);
          }
          await deleteDoc(doc(db, yearCol, teacherName, subject, file.id));
        } catch (err) {
          console.error(`❌ Lỗi khi xóa ngầm file ${file.fileName}:`, err);
        }
      }
    })();
  };

  useEffect(() => {
    fetchFileList();
  }, [teacherName, subject, className]);

  const formatVNDate = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    const optionsDate = { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" };
    const optionsTime = { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "Asia/Ho_Chi_Minh" };
    return `${date.toLocaleDateString("vi-VN", optionsDate)}, ${date.toLocaleTimeString("vi-VN", optionsTime)}`;
  };

  return (
    <Box
      sx={{
        height: "calc(100vh - 70px)",
        width: "100vw",
        display: "flex",
        gap: 2,
        alignItems: "stretch",
        flexDirection: { xs: "column", sm: "row" },
        boxSizing: "border-box",
      }}
    >
      {/* Cột trái: Upload + Danh sách file */}
      <Box
        sx={{
          width: { xs: "100%", sm: "32%" },
          minWidth: 280,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          height: "100%",
        }}
      >
        <Card sx={{ width: "100%", flexShrink: 0 }}>
          <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography variant="h5" gutterBottom color="primary">
              📚 Kế hoạch bài dạy
            </Typography>

            <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>Môn học</InputLabel>
                <Select value={subject} label="Môn học" onChange={(e) => setSubject(e.target.value)}>
                  {assignedSubjectsList.length > 0 ? (
                    assignedSubjectsList.map((subName) => (
                      <MenuItem key={subName} value={subName}>
                        {subName}
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem disabled value="">Không có môn phù hợp</MenuItem>
                  )}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>Lớp</InputLabel>
                <Select value={className} label="Lớp" onChange={(e) => setClassName(e.target.value)}>
                  {assignedClassesList.map((clsNum) => (
                    <MenuItem key={clsNum} value={clsNum}>
                      {clsNum}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "nowrap", overflowX: "auto" }}>
              {/* Nút Tải file */}
              <Button
                variant="contained"
                component="label"
                disabled={uploading}
                sx={{
                  flex: 1,
                  height: 46,
                  borderRadius: "12px",
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "13.5px",
                  bgcolor: "#1976d2",
                  boxShadow: "0 8px 20px rgba(25, 118, 210, 0.3)",
                  whiteSpace: "nowrap",
                  "&:hover": { bgcolor: "#115293" },
                }}
              >
                📤 {uploading ? "Đang tải..." : "Tải file"}
                <input type="file" accept=".doc,.docx" multiple hidden onChange={handleUpload} />
              </Button>

              {/* Nút Xóa file */}
              <Button
                variant="outlined"
                color="error"
                disabled={!fileList.some((file) => file.selected)}
                onClick={() => {
                  const selectedFiles = fileList.filter((file) => file.selected);
                  handleDeleteFiles(selectedFiles);
                }}
                sx={{
                  flex: 1,
                  height: 46,
                  borderRadius: "12px",
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "14.5px",
                  borderColor: "#fca5a5",
                  color: "#dc2626",
                  whiteSpace: "nowrap",
                  "&:hover": { 
                    borderColor: "#dc2626", 
                    bgcolor: "#fef2f2" 
                  },
                }}
              >
                🗑️ Xóa file
              </Button>

              {/* Nút Thống kê - Chỉ hiển thị trên điện thoại (xs) và mở Dialog thống kê */}
              <Button
                variant="outlined"
                onClick={() => setMobileStatsOpen(true)}
                sx={{
                  flex: 1,
                  height: 46,
                  borderRadius: "12px",
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "13.5px",
                  borderColor: "#bae6fd",
                  color: "#0284c7",
                  whiteSpace: "nowrap",
                  display: { xs: "flex", sm: "none" },
                  "&:hover": { 
                    borderColor: "#0284c7", 
                    bgcolor: "#f0f9ff" 
                  },
                }}
              >
                📊 Thống kê
              </Button>
            </Box>

            {uploading && (
              <Box sx={{ width: "70%", mx: "auto", mt: 2 }}>
                <LinearProgress variant="determinate" value={uploadProgress} sx={{ height: 6, borderRadius: 3 }} />
                <Typography variant="body2" align="center" sx={{ mt: 1, color: "text.secondary", fontWeight: 500 }}>
                  {uploadMode === "delete" 
                    ? `Đang xóa file: ${uploadProgress}%` 
                    : `Đang tải lên ${currentFileMsg} (${uploadProgress}%)`}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Danh sách file */}
        <FileListCard
          fileList={fileList}
          selectedFile={selectedFile}
          setSelectedFile={setSelectedFile}
          setFileList={setFileList}
          formatVNDate={formatVNDate}
        />
      </Box>

      {/* Khung xem file / Thống kê bên phải (Chỉ hiển thị trên máy tính - sm trở lên) */}
      <Card
        sx={{
          flex: 1,
          height: "100%",
          display: { xs: "none", sm: "flex" },
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <CardContent sx={{ height: "100%", p: 0, boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
          {selectedFile?.fileId ? (
            <>
              <Box sx={{ py: 0.5, px: 1.5, bgcolor: "#f8f9fa", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, borderBottom: "1px solid #ddd" }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  👁️ Xem trước: {selectedFile.fileName || selectedFile.name}
                </Typography>
                <Button size="small" variant="outlined" onClick={() => setSelectedFile(null)}>
                  Đóng xem trước (Hiện Thống kê)
                </Button>
              </Box>
              <Box sx={{ flex: 1, p: 1 }}>
                <iframe
                  src={`https://drive.google.com/file/d/${selectedFile.fileId}/preview`}
                  style={{ width: "100%", height: "100%", border: "none" }}
                  title="File Preview"
                />
              </Box>
            </>
          ) : (
            <TeacherStatsView
              selectedUsername={teacherName}
              statsData={statsData}
              teacherAllowedSubjects={teacherAssignedSubjects}
              teacherAllowedClasses={assignedClassesList}
              loadingStats={loadingStats}
              academicYear={academicYear}
            />
          )}
        </CardContent>
      </Card>

      {/* 📱 DIALOG HIỂN THỊ BẢNG THỐNG KÊ TRÊN ĐIỆN THOẠI KHI BẤM NÚT THỐNG KÊ */}
      <Dialog
        open={mobileStatsOpen}
        onClose={() => setMobileStatsOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "16px",
            maxHeight: "85vh",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <Box sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #eee" }}>
          <Typography variant="h6" fontWeight="bold" color="primary">
            📊 Thống kê KHBD
          </Typography>
          <IconButton onClick={() => setMobileStatsOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>
        <DialogContent sx={{ p: 1, overflowY: "auto" }}>
          <TeacherStatsView
            selectedUsername={teacherName}
            statsData={statsData}
            teacherAllowedSubjects={teacherAssignedSubjects}
            teacherAllowedClasses={assignedClassesList}
            loadingStats={loadingStats}
            academicYear={academicYear}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        filesToDelete={filesToDelete}
        onConfirm={handleConfirmDelete}
      />

      {/* THÔNG BÁO SNACKBAR */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={4000} 
        onClose={handleCloseSnackbar} 
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          variant="filled" 
          sx={{ width: "100%", fontWeight: 600 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}