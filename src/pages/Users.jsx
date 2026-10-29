import React, { useState, useEffect, useRef } from "react";

import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";

import { useLessonPlan } from "../contexts/LessonPlanContext";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";

import { fetchTeacherStatsService } from "../utils/teacherStatsService";
import { handleConfirmDeleteService } from "../utils/fileDeleteService";
import { handleUploadService } from "../utils/fileUploadHandlerService";
import { getAvailableSubjectsService } from "../utils/subjectUtils";
import { openNotificationByFileIdService, markBghRequestAsReadService } from "../utils/gvNotificationService";

import TeacherStatsView from "../components/TeacherStatsView";
import FileListCard from "../components/FileListCard";

import ConfirmDeleteDialog from "../dialogs/ConfirmDeleteDialog";
import EditLessonPlanDialog from "../dialogs/EditLessonPlanDialog";
import TeacherStatsDialog from "../dialogs/TeacherStatsDialog";
import BghRequestDialog from "../dialogs/BghRequestDialog";
import TeacherAdjustmentDialog from "../dialogs/TeacherAdjustmentDialog";

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
  IconButton,
  Badge,
} from "@mui/material";

export default function Users({ user }) {
  const {
    updateFileList,
    updateTeacherStats,
    getFileList,
    getTeacherStats,
  } = useLessonPlan();

  const editorRef = useRef(null);

  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  
  const [teacherName, setTeacherName] = useState("");
  const [academicYear, setAcademicYear] = useState("2026-2027");
  const [subject, setSubject] = useState("");
  const [className, setClassName] = useState("");

  const [teacherRole, setTeacherRole] = useState("GVCN");
  const [teacherAssignedSubjects, setTeacherAssignedSubjects] = useState([]);
  const [allMonHoc, setAllMonHoc] = useState([]);
  const [assignedClassesList, setAssignedClassesList] = useState([]); 

  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMode, setUploadMode] = useState("upload");
  const [currentFileMsg, setCurrentFileMsg] = useState("");

  const [statsData, setStatsData] = useState([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [lopMonHocMap, setLopMonHocMap] = useState({}); 
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [filesToDelete, setFilesToDelete] = useState([]);
  const [mobileStatsOpen, setMobileStatsOpen] = useState(false);

  // Thêm các state này vào trong component Users
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [editingFile, setEditingFile] = useState(null);

  const [bghRequestViewOpen, setBghRequestViewOpen] = useState(false);
  const [bghRequestContent, setBghRequestContent] = useState("");
  const [currentRequest, setCurrentRequest] = useState(null);
  const [bghNotifications, setBghNotifications] = useState([]);

  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [selectedAdjustmentFile, setSelectedAdjustmentFile] = useState(null);

  // Lấy phần khối từ className (Ví dụ: "2.4" -> "2", "1.6" -> "1")
  const gradeKey = String(className).split(".")[0].replace(/[^0-9]/g, "") || className;

  // Khóa lưu file sẽ dùng gradeKey thay vì className để gom chung vào khối
  const makeFileListKey = () =>
    `${academicYear}_${teacherName}_${subject}_Khối_${gradeKey}`;

  const makeStatsKey = () =>
    `${academicYear}_${teacherName}`;

  // Đánh dấu thống kê cần được BGH tải lại
  /*const markTeacherStatsChanged = async () => {
    if (!teacherName || !academicYear) return;

    const teacherRef = doc(
      db,
      `KEHOACH_DAYHOC_${academicYear}`,
      teacherName
    );

    await setDoc(
      teacherRef,
      {
        statsChanged: true,
        statsBGHChanged: true, // 🌟 Thêm cờ riêng cho BGH
        updatedAt: new Date(),
      },
      { merge: true }
    );
  };*/

  // 🌟 Lấy mảng bghNotifications trực tiếp từ document gốc của giáo viên khi tải trang hoặc đổi năm học
  useEffect(() => {
    const fetchTeacherNotifications = async () => {
      if (!teacherName || !academicYear) return;

      try {
        const yearCol = `KEHOACH_DAYHOC_${academicYear}`;
        const teacherRef = doc(db, yearCol, teacherName);
        const teacherSnap = await getDoc(teacherRef);

        if (teacherSnap.exists()) {
          const data = teacherSnap.data();
          // Hỗ trợ tương thích ngược nếu dữ liệu cũ là mảng chuỗi ID hoặc mảng object mới
          const rawNotifs = data.bghNotifications || [];
          const formattedNotifs = rawNotifs.map((item) =>
            typeof item === "string"
              ? { fileId: item, content: "Yêu cầu từ BGH", read: false }
              : item
          );
          setBghNotifications(formattedNotifs);
        } else {
          setBghNotifications([]);
        }
      } catch (err) {
        console.error("❌ Lỗi tải thông báo:", err);
      }
    };

    fetchTeacherNotifications();
  }, [teacherName, academicYear]);

  // 🔔 Tổng số lượng thông báo chưa đọc (dùng cho Badge trên quả chuông)
  const unreadCount = bghNotifications.filter((n) => !n.read).length;

  // 🌟 Hàm mở thông báo, tự động quét và gom đủ thông tin Tên bài, Môn, Lớp
  const handleOpenNotificationByFileId = async (fileId) => {
    try {
      const res = await openNotificationByFileIdService({
        fileId,
        bghNotifications,
        fileList,
        assignedSubjectsList,
        academicYear,
        teacherName,
        fallbackSubject: subject,
        fallbackClass: className,
      });

      if (res.success) {
        setCurrentRequest(res.requestData);
        setBghRequestContent(res.contentText);
        setBghRequestViewOpen(true);
      }
    } catch (err) {
      console.error("❌ Lỗi mở thông báo:", err);
    }
  };

  const handleCloseBghRequestView = async () => {
    // 1. Đóng Dialog và hiện Snackbar NGAY LẬP TỨC (Phản hồi siêu mượt)
    setBghRequestViewOpen(false);
    showMessage("✅ Xác nhận đã hiểu yêu cầu từ BGH!", "success");

    const reqToSave = currentRequest;
    setCurrentRequest(null);

    if (!reqToSave || !reqToSave.id) {
      return;
    }

    // 2. Chạy ngầm việc cập nhật Firestore phía sau không chặn giao diện
    try {
      const res = await markBghRequestAsReadService({
        currentRequest: reqToSave,
        academicYear,
        teacherName,
      });

      if (res.success) {
        // Cập nhật state local thông báo
        setBghNotifications(res.updatedNotifications);

        // Cập nhật giao diện fileList hiện tại
        setFileList((prev) =>
          prev.map((f) => (f.id === res.docId ? { ...f, bghRequestRead: true } : f))
        );
      }
    } catch (error) {
      console.error("❌ Lỗi ngầm khi xác nhận đã hiểu:", error);
    }
  };

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
    return getAvailableSubjectsService({
      className,
      allMonHoc,
      teacherAssignedSubjects,
      teacherRole,
      lopMonHocMap,
    });
  };

  const assignedSubjectsList = getAvailableSubjects();

  useEffect(() => {
    if (assignedSubjectsList.length > 0 && !assignedSubjectsList.includes(subject)) {
      setSubject(assignedSubjectsList[0]);
    } else if (assignedSubjectsList.length === 0) {
      setSubject("");
    }
  }, [className, teacherRole, lopMonHocMap, allMonHoc]);
  
  // ✅ Lấy danh sách file từ Firestore và map trạng thái chip từ bghNotifications
  // ✅ Lấy danh sách file từ Firestore và map trạng thái chip từ bghNotifications
  const fetchFileList = async () => {
    if (!teacherName || !className || !subject || !academicYear) {
      setFileList([]);
      return;
    }

    // Bóc tách lấy phần khối từ className (Ví dụ: "2.4" -> "2") để dùng làm khóa lưu trữ chung
    const gradeKey = String(className).split(".")[0].replace(/[^0-9]/g, "") || className;
    const fileKey = `${academicYear}_${teacherName}_${subject}_Khối_${gradeKey}`;

    try {
      const yearCol = `KEHOACH_DAYHOC_${academicYear}`;

      // 1. Lấy thông tin từ document gốc của giáo viên
      const teacherRef = doc(db, yearCol, teacherName);
      const teacherSnap = await getDoc(teacherRef);
      const teacherData = teacherSnap.exists() ? teacherSnap.data() : {};
      
      const statsChangedFlag = teacherData.statsChanged === true;
      const notifications = teacherData.bghNotifications || [];

      // Tạo map tra cứu nhanh thông tin theo fileId để gắn chip
      const notificationMap = {};
      notifications.forEach((item) => {
        const fId = typeof item === "string" ? item : item.fileId;
        const fContent = typeof item === "string" ? "Yêu cầu từ BGH" : (item.content || "Yêu cầu từ BGH");
        const fRead = typeof item === "string" ? false : Boolean(item.read);

        if (fId) {
          notificationMap[fId] = { content: fContent, read: fRead };
        }
      });

      // 2. Tải danh sách file từ sub-collection môn học
      const filesRef = collection(
        db,
        yearCol,
        teacherName,
        subject
      );

      const querySnapshot = await getDocs(filesRef);
      const files = [];

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const docId = docSnap.id;

        const idMatch = docId.match(/^Khoi_(\d+)_/i);
        const khoiValue = String(
          data.khoi || data.className || ""
        ).trim();

        const khoiMatch = khoiValue.match(
          /^(?:khối|khoi|lớp|lop)\s*(\d+)/i
        );

        const documentGrade = idMatch?.[1] || khoiMatch?.[1];

        // Xử lý linh hoạt quét cả 2 dạng: dạng khối (ví dụ: "4") và dạng lớp chi tiết cũ (ví dụ: "4.3")
        const rawClassValue = String(data.className || data.khoi || "").trim();
        
        const matchesClass =
          documentGrade === gradeKey || 
          rawClassValue === gradeKey || 
          rawClassValue === `Khối ${gradeKey}` || 
          rawClassValue.startsWith(`${gradeKey}.`) || // Khớp dữ liệu cũ dạng "4.3"
          rawClassValue.toLowerCase().startsWith(`khối ${gradeKey}.`) || // Khớp dữ liệu cũ dạng "Khối 4.3"
          khoiValue === String(gradeKey);

        if (matchesClass) {
          const notifInfo = notificationMap[docId];
          const hasNotification = Boolean(notifInfo);

          files.push({
            id: docId,
            ...data,
            bghRequest: hasNotification ? notifInfo.content : undefined,
            bghRequestRead: hasNotification ? notifInfo.read : undefined,
          });
        }
      });

      files.sort((a, b) => {
        const timeA = a.createdAt?.toMillis
          ? a.createdAt.toMillis()
          : new Date(a.createdAt || 0).getTime();

        const timeB = b.createdAt?.toMillis
          ? b.createdAt.toMillis()
          : new Date(b.createdAt || 0).getTime();

        return timeB - timeA;
      });

      setFileList(files);

      // Cập nhật lại danh sách file mới nhất vào Context/Cache theo khóa Khối
      updateFileList(fileKey, files);

      // 👉 3. SAU KHI TẢI XONG THÀNH CÔNG, ĐẶT CỜ VỀ FALSE TRÊN FIRESTORE
      if (statsChangedFlag) {
        await setDoc(teacherRef, { statsChanged: false }, { merge: true });
      }

    } catch (err) {
      console.error("Lỗi khi tải danh sách file:", err);
      const cachedFiles = getFileList(fileKey);
      if (cachedFiles.length > 0) {
        setFileList(cachedFiles);
      } else {
        setFileList([]);
      }
    }
  };

  // ✅ Thống kê cá nhân của giáo viên
  const fetchTeacherStats = async () => {
    if (!teacherName || !academicYear) return;

    const statsKey = `${academicYear}_${teacherName}`;
    const cachedStats = getTeacherStats(statsKey);

    // Nếu đã có thống kê trong Context/localStorage, hiển thị ngay và không bật vòng xoay chờ.
    if (cachedStats.length > 0) {
      setStatsData(cachedStats);
      setLoadingStats(false);
    } else {
      setLoadingStats(true);
    }

    try {
      const stats = await fetchTeacherStatsService({
        teacherName,
        academicYear,
        teacherRole,
        className,
        assignedClassesList,
        assignedSubjectsList,
        allMonHoc,
        teacherAssignedSubjects,
      });

      setStatsData(stats);
      updateTeacherStats(statsKey, stats);
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
  // ✅ Xử lý tải file lên (gom lưu trữ theo khối nhưng vẫn giữ className trên giao diện)
  const handleUpload = async (e) => {
    // Bóc tách lấy phần khối từ className (Ví dụ: "2.4" -> "2")
    const gradeKey = String(className).split(".")[0].replace(/[^0-9]/g, "") || className;

    await handleUploadService({
      e,
      teacherName,
      academicYear,
      subject,
      className: gradeKey, // Truyền giá trị Khối vào service lưu file
      teacherRole,
      statsData,
      setUploading,
      setUploadMode,
      setUploadProgress,
      setCurrentFileMsg,
      setStatsData,
      updateTeacherStats,
      fetchFileList,
      showMessage,
    });
  };

  // ✅ Xóa file
  const handleDeleteFiles = (files) => {
    if (!files || files.length === 0) return;
    setFilesToDelete(files);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    await handleConfirmDeleteService({
      filesToDelete,
      academicYear,
      teacherName,
      subject,
      className,
      setFileList,
      setStatsData,
      setDeleteDialogOpen,
      updateFileList,
      updateTeacherStats,
      showMessage,
      fetchFileList,
    });
  };

  useEffect(() => {
    fetchFileList();
  }, [teacherName, subject, className, bghNotifications]);

  const formatVNDate = (timestamp) => {
    if (!timestamp) return "";

    let date;

    // Kiểm tra các định dạng thời gian khác nhau để chuyển đổi an toàn cho giao diện
    if (timestamp && typeof timestamp.toDate === "function") {
      // 1. Định dạng chuẩn Firestore Timestamp
      date = timestamp.toDate();
    } else if (timestamp && typeof timestamp.seconds === "number") {
      // 2. Định dạng object chứa seconds (nếu qua cache/state)
      date = new Date(timestamp.seconds * 1000);
    } else {
      // 3. Các định dạng chuỗi hoặc số thông thường
      date = new Date(timestamp);
    }

    // Nếu không thể chuyển đổi thành ngày hợp lệ thì trả về chuỗi trống
    if (isNaN(date.getTime())) {
      return "";
    }

    const optionsDate = {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "Asia/Ho_Chi_Minh",
    };
    const optionsTime = {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "Asia/Ho_Chi_Minh",
    };

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
            
            {/* 🌟 Hàng tiêu đề và quả chuông căn sát phải */}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="h5" color="primary" sx={{ m: 0, fontWeight: 700 }}>
                📚 Kế hoạch bài dạy
              </Typography>

              <IconButton 
                onClick={async () => {
                  const unreadList = bghNotifications.filter((n) => !n.read);
                  const targetNotif = unreadList.length > 0 ? unreadList[0] : bghNotifications[0];

                  if (targetNotif) {
                    await handleOpenNotificationByFileId(targetNotif.fileId);
                  } else {
                    showMessage("📭 Không có thông báo nào từ BGH.", "info");
                  }
                }}
              >
                <Badge badgeContent={unreadCount} color="error" max={99}>
                  <NotificationsRoundedIcon />
                </Badge>
              </IconButton>
            </Box>

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

              {/* Nút Thống kê - Chỉ hiển thị trên điện thoại (xs) */}
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

        {/* Danh sách file kèm sự kiện bấm Icon sửa mở form */}
        <FileListCard
          fileList={fileList}
          selectedFile={selectedFile}
          setSelectedFile={setSelectedFile}
          setFileList={setFileList}
          formatVNDate={formatVNDate}
          onEditFile={(file) => {
            setEditingFile(file);
            setEditFormOpen(true);
          }}
          onOpenBghRequest={(file) => {
            setCurrentRequest({
              ...file,
              tenBai: file.tenBai || file.metadata?.tenBai || file.fileName || file.name || "Kế hoạch bài dạy",
              subject: file.subject || file.metadata?.monHoc || subject || "Chưa xác định",
              khoi: file.khoi || file.metadata?.khoiLop || file.lop || className || "Chưa xác định"
            });
            setBghRequestContent(file.bghRequest || "Không có nội dung chi tiết.");
            setBghRequestViewOpen(true);
          }}
          // 🌟 Thêm dòng này vào các props của FileListCard
          onOpenAdjustment={(file) => {
            setSelectedAdjustmentFile(file);
            setAdjustmentDialogOpen(true);
          }}
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

      {/* 📝 DIALOG MỞ FORM CHỈNH SỬA KẾ HOẠCH BÀI DẠY*/}
      <EditLessonPlanDialog
        open={editFormOpen}
        onClose={() => setEditFormOpen(false)}
        editingFile={editingFile}
        teacherName={teacherName}
        subject={subject}
        className={className}
        academicYear={academicYear}
        setFileList={setFileList}
        updateFileList={updateFileList}
        showMessage={showMessage}
      />

      {/* 📱 DIALOG HIỂN THỊ BẢNG THỐNG KÊ TRÊN ĐIỆN THOẠI */}
      <TeacherStatsDialog
        open={mobileStatsOpen}
        onClose={() => setMobileStatsOpen(false)}
        teacherName={teacherName}
        statsData={statsData}
        teacherAssignedSubjects={teacherAssignedSubjects}
        assignedClassesList={assignedClassesList}
        loadingStats={loadingStats}
        academicYear={academicYear}
      />

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

      {/* 2. Gắn hàm xử lý vào sự kiện onClose của Dialog */}
      <BghRequestDialog
        open={bghRequestViewOpen}
        onClose={handleCloseBghRequestView}
        content={bghRequestContent}
        fileInfo={currentRequest} 
      />

      <TeacherAdjustmentDialog
        open={adjustmentDialogOpen}
        onClose={() => setAdjustmentDialogOpen(false)}
        fileData={selectedAdjustmentFile}
        teacherName={teacherName}
        subject={subject}
        className={className}
      />

    </Box>
  );
}