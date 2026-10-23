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
} from "@mui/material";

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
  const [currentFileMsg, setCurrentFileMsg] = useState(""); // Hiển thị tên file đang tải

  const [statsData, setStatsData] = useState([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [lopMonHocMap, setLopMonHocMap] = useState({}); 
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [filesToDelete, setFilesToDelete] = useState([]);

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

        // Lấy dữ liệu môn học theo lớp từ collection LOP_MONHOC (doc ID là "1", "2", "3", "4", "5")
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
      // Lọc các môn mà giáo viên bộ môn được phân công
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
      // 🌟 Lấy danh sách môn học chuẩn của khối/lớp đó từ collection LOP_MONHOC thông qua lopMonHocMap
      const subjectsForClass = lopMonHocMap[String(className)];
      
      if (Array.isArray(subjectsForClass) && subjectsForClass.length > 0) {
        // Nếu GVCN có phân công riêng cụ thể (và không phải tất cả), ta có thể kết hợp lọc, 
        // nhưng thông thường GVCN dạy toàn bộ các môn được quy định trong LOP_MONHOC của lớp đó.
        const hasSpecificAssigned = teacherAssignedSubjects.length > 0 && 
          !teacherAssignedSubjects.some(sub => sub.toLowerCase().includes("tất cả"));

        if (hasSpecificAssigned) {
          return subjectsForClass.filter(subName => 
            teacherAssignedSubjects.some(as => as.toLowerCase() === subName.toLowerCase())
          );
        }
        return subjectsForClass;
      }

      // Fallback dự phòng nếu lopMonHocMap chưa tải kịp dữ liệu
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
  // ✅ Thống kê cá nhân của giáo viên (Hỗ trợ tối ưu cho cả GVCN và GV Bộ môn)
  const fetchTeacherStats = async () => {
    if (!teacherName) return;
    setLoadingStats(true);
    try {
      const yearCol = `KEHOACH_DAYHOC_${academicYear}`;
      const stats = [];

      // Xác định danh sách môn cần quét: 
      // Nếu là GVCN hoặc teacherAssignedSubjects trống, tự động lấy tất cả các môn trong allMonHoc hoặc danh sách môn tiểu học chuẩn
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
              // Lấy thông tin khối/lớp linh hoạt từ document (data.khoi hoặc data.className)
              let khoiKey = data.khoi || data.className || "Chung";
              
              // Chuẩn hóa tên khối/lớp gọn gàng (ví dụ: "Khối 4" -> "4" hoặc giữ nguyên tùy ý)
              if (String(khoiKey).toLowerCase().includes("khối")) {
                khoiKey = String(khoiKey).replace(/khối/gi, "").trim();
              }

              entry[khoiKey] = (entry[khoiKey] || 0) + 1;
            });

            stats.push(entry);
          }
        } catch (e) {
          // Bỏ qua nếu subcollection môn đó không tồn tại
        }
      }

      setStatsData(stats);
    } catch (err) {
      console.error("❌ Lỗi khi thống kê cá nhân:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  // 🌟 SỬA: Bỏ fileList ra khỏi mảng dependencies để khi thay đổi môn/lớp không bị gọi lại thống kê
  // 🌟 Chỉ gọi tải thống kê từ Firestore khi đăng nhập hoặc đổi năm học
  useEffect(() => {
    if (teacherName && academicYear) {
      fetchTeacherStats();
    }
  }, [teacherName, academicYear]);

  // ✅ Thanh tiến trình: Giai đoạn đầu chạy chậm, sau đó tăng tốc dần lên theo thời gian thực chờ Google Drive
  // ✅ Thanh tiến trình: Giai đoạn đầu chạy chậm, sau đó tăng tốc dần lên theo thời gian thực chờ Google Drive
  const handleUpload = async (e) => {
    const rawFiles = Array.from(e.target.files);
    e.target.value = null;
    if (rawFiles.length === 0) return;

    // 🌟 Chuẩn hóa tên file: Xóa timestamp ở đầu, viết hoa và thay dấu gạch dưới thành khoảng trắng
    const files = rawFiles.map((file) => {
      // 1. Xóa chuỗi số timestamp ở đầu (ví dụ: 1790847575224_)
      let cleaned = file.name.replace(/^\d+_[_-]?/, "");

      // 2. Tách riêng phần tên và phần mở rộng (ví dụ: .docx, .doc)
      const lastDotIndex = cleaned.lastIndexOf(".");
      let nameWithoutExt = lastDotIndex !== -1 ? cleaned.substring(0, lastDotIndex) : cleaned;
      let ext = lastDotIndex !== -1 ? cleaned.substring(lastDotIndex) : "";

      // 3. Viết hoa toàn bộ tên và thay thế tất cả dấu gạch dưới (_) bằng khoảng trắng ( )
      nameWithoutExt = nameWithoutExt.toUpperCase().replace(/_/g, " ");

      // 4. Ghép lại tên hoàn chỉnh với phần đuôi mở rộng
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

      // 1. Khởi tạo thanh tiến trình: Bắt đầu chạy chậm, sau đó tăng tốc dần đều theo thời gian (giới hạn tối đa 90% khi đang chờ)
      let currentProgress = 0;
      let elapsed = 0;
      const progressInterval = setInterval(() => {
        elapsed++;
        const increment = Math.min(4, 0.3 + elapsed * 0.12);
        currentProgress = Math.min(90, currentProgress + increment);
        setUploadProgress(Math.round(currentProgress));
      }, 200);

      // 2. Gọi API thực tế với các file đã được chuẩn hóa tên: Chờ Google Drive ghi file xong
      const res = await uploadBatchKeHoachDayHoc(files, metadata);

      // Dừng bộ chạy khi server đã trả về kết quả thành công thực tế
      clearInterval(progressInterval);

      if (!res.success) throw new Error(res.error);

      // 3. Khi Google Drive hoàn tất: Kéo thanh tiến trình lên tròn 100%
      setUploadProgress(100);

      // 4. Cập nhật danh sách file từ Firestore (đảm bảo file sẵn sàng để preview)
      await fetchFileList();

      // 🌟 Cập nhật trực tiếp state thống kê ngay lập tức mà không cần gọi lại Firestore
      setStatsData((prevStats) => {
        const newStats = prevStats.map((item) => ({ ...item }));
        let entry = newStats.find((item) => item.subject === subject);
        const khoiKey = className; // Khối/Lớp đang chọn

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

      // 5. Bật thông báo thành công
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
  
  // ✅ Xóa file khỏi Subcollection Firestore
  // Bước 1: Khi người dùng bấm nút Xóa ở giao diện -> Mở Dialog lên
const handleDeleteFiles = (files) => {
  if (!files || files.length === 0) return;
  setFilesToDelete(files);
  setDeleteDialogOpen(true);
};

// Bước 2: Khi người dùng bấm "Xóa" xác nhận trong Dialog
const handleConfirmDelete = async () => {
  if (filesToDelete.length === 0) return;

  // Đóng dialog ngay lập tức
  setDeleteDialogOpen(false);

  // 1. Lưu các ID cần xóa vào biến để lọc state danh sách file bên trái ngay lập tức
  const fileIdsToDelete = new Set(filesToDelete.map((f) => f.id));

  // 2. Cập nhật giao diện danh sách file bên trái ngay lập tức (Lọc bỏ các file vừa chọn)
  setFileList((prevList) => prevList.filter((f) => !fileIdsToDelete.has(f.id)));

  // 3. Hiển thị thông báo thành công ngay lập tức
  showMessage("🗑️ Đã xóa file thành công!", "success");

  // 4. Cập nhật ngay lập tức state thống kê trên giao diện
  setStatsData((prevStats) => {
    const newStats = prevStats.map((item) => ({ ...item }));
    let entry = newStats.find((item) => item.subject === subject);
    const khoiKey = className;

    if (entry) {
      entry[khoiKey] = Math.max(0, (entry[khoiKey] || 0) - filesToDelete.length);
    }
    return newStats;
  });

  // 5. Chạy ngầm dưới nền (Xóa Google Drive và Firestore) mà không làm gián đoạn trải nghiệm người dùng
  (async () => {
    const yearCol = `KEHOACH_DAYHOC_${academicYear}`;
    for (const file of filesToDelete) {
      try {
        // Xóa ngầm trên Google Drive
        if (file.fileId) {
          await deleteGoogleDriveFile(file.fileId);
        }
        // Xóa ngầm trên Firestore
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
        //p: 2,
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

            <Box sx={{ display: "flex", gap: 2, flexWrap: "nowrap", overflowX: "auto" }}>
              <Button
                variant="contained"
                component="label"
                disabled={uploading}
                sx={{ flex: 1, whiteSpace: "nowrap" }}
              >
                📤 Tải file
                <input type="file" accept=".doc,.docx" multiple hidden onChange={handleUpload} />
              </Button>

              <Button
                variant="outlined"
                color="error"
                disabled={!fileList.some((file) => file.selected)}
                onClick={() => {
                  const selectedFiles = fileList.filter((file) => file.selected);
                  handleDeleteFiles(selectedFiles);
                }}
                sx={{ flex: 1, whiteSpace: "nowrap" }}
              >
                🗑️ Xóa file
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

      {/* Khung xem file bên phải */}
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