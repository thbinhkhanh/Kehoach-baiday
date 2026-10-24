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

    if (teacherRole === "TA") {
      const taSub = allMonHoc.find(s => s.name.toLowerCase().includes("tiếng anh"));
      if (taSub) {
        if (!taSub.grades || taSub.grades.length === 0 || taSub.grades.includes(String(className))) {
          return [taSub.name];
        }
      }
      return ["Tiếng Anh"];
    }

    if (teacherRole === "BM") {
      const filtered = allMonHoc.filter(sub => {
        const matchesAssigned = teacherAssignedSubjects.some(
          as => as.toLowerCase().trim() === sub.name.toLowerCase().trim()
        );
        if (!matchesAssigned) return false;
        if (!sub.grades || sub.grades.length === 0) return true;
        return sub.grades.includes(String(className));
      }).map(sub => sub.name);

      return filtered.length > 0 ? filtered : teacherAssignedSubjects;
    }

    if (teacherRole === "GVCN") {
      const subjectsForClass = lopMonHocMap[String(className)];
      
      if (Array.isArray(subjectsForClass) && subjectsForClass.length > 0) {
        const hasSpecificAssigned = teacherAssignedSubjects.length > 0 && 
          !teacherAssignedSubjects.some(sub => sub.toLowerCase().includes("tất cả"));

        if (hasSpecificAssigned) {
          return subjectsForClass.filter(subName => 
            teacherAssignedSubjects.some(as => as.toLowerCase() === subName.toLowerCase())
          );
        }
        return subjectsForClass;
      }

      const hasSpecificAssigned = teacherAssignedSubjects.length > 0 && 
        !teacherAssignedSubjects.some(sub => sub.toLowerCase().includes("tất cả"));

      return allMonHoc.filter(sub => {
        const subLower = sub.name.toLowerCase();

        if (hasSpecificAssigned) {
          const matchesAssigned = teacherAssignedSubjects.some(as => as.toLowerCase() === subLower);
          if (!matchesAssigned) return false;
        } else {
          const strictSpecialistKeywords = ["tiếng anh", "tin học"]; 
          const isStrictSpecialist = strictSpecialistKeywords.some(kw => subLower.includes(kw));
          if (isStrictSpecialist) return false;
        }

        if (!sub.grades || sub.grades.length === 0) return true;
        return sub.grades.includes(String(className));
      }).map(sub => sub.name);
    }

    return allMonHoc.map(sub => sub.name);
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
    if (!teacherName || !className || !subject) {
      setFileList([]);
      return;
    }

    try {
      const yearCol = `KEHOACH_DAYHOC_${academicYear}`;
      const filesRef = collection(db, yearCol, teacherName, subject);
      const q = query(filesRef, where("khoi", "==", `Khối ${className}`));

      const querySnapshot = await getDocs(q);
      const files = [];
      querySnapshot.forEach((docSnap) => {
        files.push({ id: docSnap.id, ...docSnap.data() });
      });

      files.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });

      setFileList(files);
    } catch (err) {
      console.error("❌ Lỗi khi tải danh sách file:", err);
    }
  };

  // ✅ Thống kê cá nhân của giáo viên
  const fetchTeacherStats = async () => {
    if (!teacherName) return;
    setLoadingStats(true);
    try {
      const yearCol = `KEHOACH_DAYHOC_${academicYear}`;
      const stats = [];

      let subjectsToQuery = teacherAssignedSubjects;
      if (!subjectsToQuery || subjectsToQuery.length === 0 || teacherRole === "GVCN") {
        subjectsToQuery = allMonHoc.length > 0 
          ? allMonHoc.map(m => m.name) 
          : ["Toán", "Tiếng Việt", "Khoa học", "Lịch sử và Địa lí", "Đạo đức", "Công nghệ", "Hoạt động trải nghiệm", "Mĩ thuật", "Âm nhạc", "Tin học", "Giáo dục thể chất", "Tiếng Anh"];
      }

      for (const sub of subjectsToQuery) {
        try {
          const subColRef = collection(db, yearCol, teacherName, sub);
          const subSnap = await getDocs(subColRef);

          if (!subSnap.empty) {
            let entry = {
              subject: sub,
            };

            subSnap.forEach((docSnap) => {
              const data = docSnap.data();
              let khoiKey = data.khoi || data.className || "Chung";
              
              if (String(khoiKey).toLowerCase().includes("khối")) {
                khoiKey = String(khoiKey).replace(/khối/gi, "").trim();
              }

              entry[khoiKey] = (entry[khoiKey] || 0) + 1;
            });

            stats.push(entry);
          }
        } catch (e) {
          // Bỏ qua nếu subcollection không tồn tại
        }
      }

      setStatsData(stats);
    } catch (err) {
      console.error("❌ Lỗi khi thống kê cá nhân:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (teacherName && academicYear) {
      fetchTeacherStats();
    }
  }, [teacherName, academicYear]);

  // ✅ Xử lý tải file lên
  const handleUpload = async (e) => {
    const rawFiles = Array.from(e.target.files);
    e.target.value = null;
    if (rawFiles.length === 0) return;

    const files = rawFiles.map((file) => {
      let cleaned = file.name.replace(/^\d+_[_-]?/, "");
      const lastDotIndex = cleaned.lastIndexOf(".");
      let nameWithoutExt = lastDotIndex !== -1 ? cleaned.substring(0, lastDotIndex) : cleaned;
      let ext = lastDotIndex !== -1 ? cleaned.substring(lastDotIndex) : "";

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
                      Lớp {clsNum}
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
              <Box sx={{ width: "80%", mx: "auto", mt: 2 }}>
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
            📊 Thống kê kế hoạch bài dạy
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