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

import { handleConfirmDeleteService } from "../utils/fileDeleteService";
import { handleUploadService } from "../utils/fileUploadHandlerService";
import { getAvailableSubjectsService } from "../utils/subjectUtils";
import { openNotificationByFileIdService, markBghRequestAsReadService } from "../utils/gvNotificationService";
import { fetchTeamSummaryData } from "../utils/teamSummaryUtils";
import { fetchTeacherStatsData } from "../utils/teacherStatsUtils";

import TeacherStatsView from "../components/TeacherStatsView";
import FileListCard from "../components/FileListCard";

import ConfirmDeleteDialog from "../dialogs/ConfirmDeleteDialog";
import EditLessonPlanDialog from "../dialogs/EditLessonPlanDialog";
import TeacherStatsDialog from "../dialogs/TeacherStatsDialog";
import BghRequestDialog from "../dialogs/BghRequestDialog";
import TeacherAdjustmentDialog from "../dialogs/TeacherAdjustmentDialog";
import TeamSummaryDialog from "../dialogs/TeamSummaryDialog";

import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded"; 

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
  Tabs, 
  Tab,
  Tooltip,
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


  const [activeTab, setActiveTab] = React.useState(0); // 0: KHBD, 1: Biên bản, 2: Đề KTĐK
  const [isTTCM, setIsTTCM] = useState(false);
  const [toTeachers, setToTeachers] = useState([]);       // Danh sách GV trong tổ
  const [targetTeacherName, setTargetTeacherName] = useState(""); // GV đang chọn
  const activeTeacher = isTTCM && targetTeacherName ? targetTeacherName : teacherName;
  const [phanQuyenMap, setPhanQuyenMap] = useState({});   // 🌟 Thêm state lưu map phân quyền

  const [schoolSummaryGrouped, setSchoolSummaryGrouped] = useState({});
  const [loadingSchoolSummary, setLoadingSchoolSummary] = useState(false);
  const [teamSummaryOpen, setTeamSummaryOpen] = useState(false);
  

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
      if (!activeTeacher || !academicYear) return; // 🌟 Dùng activeTeacher

      try {
        const yearCol = `KEHOACH_DAYHOC_${academicYear}`;
        const teacherRef = doc(db, yearCol, activeTeacher); // 🌟 Dùng activeTeacher
        const teacherSnap = await getDoc(teacherRef);

        if (teacherSnap.exists()) {
          const data = teacherSnap.data();
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
  }, [activeTeacher, academicYear]); // 🌟 Lắng nghe thay đổi của activeTeacher

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
          const verifiedName = pqData.username ? pqData.username.toUpperCase() : foundName;
          if (pqData.username) {
            setTeacherName(verifiedName);
          }

          const role = pqData.role || "GVCN";
          setTeacherRole(role);
          
          const isT = Boolean(pqData.isTTCM);
          setIsTTCM(isT);

          // 🌟 Tải và lọc danh sách giáo viên theo đúng Nhóm (GVCN cùng khối, TA, hoặc BM)
          if (isT) {
            const allPqSnap = await getDocs(collection(db, phanQuyenColName));
            const teachersList = [];
            const pqMap = {}; // 🌟 Khai báo map phân quyền tạm
            
            // 1. Lấy thông tin vai trò và lớp/khối của chính giáo viên đang đăng nhập
            const myRole = (pqData.role || "GVCN").toUpperCase();
            const myClasses = pqData.teachingClasses || (pqData.assignedClass ? [pqData.assignedClass] : []);
            const myGrades = myClasses.map(function(c) {
              return String(c).split(".")[0].replace(/[^0-9]/g, "");
            }).filter(Boolean);

            // 2. Duyệt toàn bộ danh sách phân quyền toàn trường
            allPqSnap.forEach(function(docItem) {
              const tData = docItem.data();
              const tName = (tData.username || docItem.id || "").trim().toUpperCase();
              if (!tName) return;

              pqMap[tName] = tData; // 🌟 Lưu thông tin phân quyền của từng giáo viên vào map

              const tRole = (tData.role || "GVCN").toUpperCase();
              const tClasses = tData.teachingClasses || (tData.assignedClass ? [tData.assignedClass] : []);
              const tGrades = tClasses.map(function(c) {
                return String(c).split(".")[0].replace(/[^0-9]/g, "");
              }).filter(Boolean);

              let isSameGroup = false;

              if (myRole === "TA") {
                // Nếu mình là Tiếng Anh -> chỉ lấy các GV có role TA
                if (tRole === "TA") {
                  isSameGroup = true;
                }
              } else if (myRole === "BM") {
                // Nếu mình là Bộ môn -> chỉ lấy các GV có role BM
                if (tRole === "BM") {
                  isSameGroup = true;
                }
              } else {
                // Nếu mình là GVCN -> chỉ lấy các GVCN dạy chung khối (ví dụ cùng khối 5) và tRole cũng là GVCN
                if (tRole === "GVCN") {
                  const hasCommonGrade = tGrades.some(function(g) {
                    return myGrades.includes(g);
                  });
                  if (hasCommonGrade) {
                    isSameGroup = true;
                  }
                }
              }

              // Luôn luôn cho phép nhìn thấy chính mình trong danh sách của tổ
              if (tName === verifiedName || isSameGroup) {
                if (!teachersList.includes(tName)) {
                  teachersList.push(tName);
                }
              }
            });

            if (teachersList.length === 0) {
              teachersList.push(verifiedName);
            }

            // 3. Sắp xếp tên tiếng Việt chuẩn từ phải sang trái (Tên -> Tên đệm -> Họ)
            teachersList.sort(function(a, b) {
              const normalizeName = function(str) {
                return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
              };

              const partsA = a.trim().split(/\s+/);
              const partsB = b.trim().split(/\s+/);

              let i = partsA.length - 1;
              let j = partsB.length - 1;

              while (i >= 0 && j >= 0) {
                const cmp = normalizeName(partsA[i]).localeCompare(normalizeName(partsB[j]), "vi", { sensitivity: "base" });
                if (cmp !== 0) return cmp;
                i--;
                j--;
              }

              return partsA.length - partsB.length;
            });

            console.log("📋 Danh sách GV trong tổ đã lọc và sắp xếp:", teachersList);
            setToTeachers(teachersList);
            setPhanQuyenMap(pqMap); // 🌟 Lưu vào state phanQuyenMap để dùng cho việc đổi lớp tự động
            setTargetTeacherName(verifiedName);
          }

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

  // 🌟 Tự động cập nhật danh sách lớp và chọn lớp/môn mặc định khi đổi giáo viên được chọn (activeTeacher)
  useEffect(() => {
    if (!activeTeacher || Object.keys(phanQuyenMap).length === 0) return;

    const teacherInfo = phanQuyenMap[activeTeacher];
    if (!teacherInfo) return;

    // 🌟 1. Cập nhật vai trò chuẩn của giáo viên được chọn (GVCN, BM, TA)
    const role = teacherInfo.role || "GVCN";
    setTeacherRole(role);

    // 🌟 2. Cập nhật danh sách môn học được phân công của giáo viên đó
    let subs = [];
    if (Array.isArray(teacherInfo.assignedSubjects) && teacherInfo.assignedSubjects.length > 0) {
      subs = teacherInfo.assignedSubjects;
    } else if (teacherInfo.assignedSubject) {
      subs = teacherInfo.assignedSubject.split(",").map((s) => s.trim()).filter(Boolean);
    } else if (Array.isArray(teacherInfo.subjects)) {
      subs = teacherInfo.subjects;
    }
    setTeacherAssignedSubjects(subs);

    let cls = [];
    if (role === "GVCN") {
      if (teacherInfo.assignedClass) {
        cls = [teacherInfo.assignedClass];
      } else if (Array.isArray(teacherInfo.teachingClasses) && teacherInfo.teachingClasses.length > 0) {
        cls = teacherInfo.teachingClasses;
      } else {
        cls = ["1"];
      }
    } else {
      if (Array.isArray(teacherInfo.teachingClasses) && teacherInfo.teachingClasses.length > 0) {
        cls = teacherInfo.teachingClasses;
      } else {
        cls = ["1", "2", "3", "4", "5"];
      }
    }

    setAssignedClassesList(cls);
    if (cls.length > 0) {
      setClassName(String(cls[0]));
    }
  }, [activeTeacher, phanQuyenMap]);

  // ✅ Bước 2: Lọc danh sách môn học hiển thị
  // ✅ Lấy danh sách môn học linh hoạt: Tab 1, 2 cho nhóm Bộ môn sẽ lấy tất cả môn của bộ môn; các tab/nhóm khác lấy theo phân công
  const getAvailableSubjects = () => {
    // Nếu đang ở Tab 1 hoặc Tab 2 và giáo viên thuộc nhóm Bộ môn (BM)
    if ((activeTab === 1 || activeTab === 2) && teacherRole === "BM") {
      let allowed = [];
      allMonHoc.forEach(m => {
        const nameLower = String(m.name).toLowerCase();
        // Lấy tất cả các môn trừ Toán và Tiếng Việt (chuẩn định nghĩa nhóm Bộ môn)
        if (!nameLower.includes("toán") && !nameLower.includes("tiếng việt")) {
          allowed.push(m.name);
        }
      });
      return allowed.length > 0 ? allowed : allMonHoc.map(m => m.name);
    }

    // Nếu là nhóm Bộ môn ở Tab 0 nhưng chưa có phân công cụ thể
    if (teacherRole === "BM" && teacherAssignedSubjects.length === 0) {
      let allowed = [];
      allMonHoc.forEach(m => {
        const nameLower = String(m.name).toLowerCase();
        if (!nameLower.includes("toán") && !nameLower.includes("tiếng việt")) {
          allowed.push(m.name);
        }
      });
      return allowed;
    }

    // Nếu là nhóm Tiếng Anh hoặc có phân công riêng
    if ((teacherRole === "BM" || teacherRole === "TA") && teacherAssignedSubjects.length > 0) {
      return teacherAssignedSubjects;
    }

    // Các trường hợp còn lại (GVCN) sử dụng service tiêu chuẩn theo lớp
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
    if (assignedSubjectsList.length > 0) {
      if (!subject || !assignedSubjectsList.includes(subject)) {
        setSubject(assignedSubjectsList[0]);
      }
    } else {
      setSubject("");
    }
  }, [
    activeTeacher,            // 🌟 Thêm activeTeacher để bắt sự kiện đổi giáo viên
    teacherAssignedSubjects,  // 🌟 Thêm danh sách môn phân công của giáo viên đó
    className, 
    teacherRole, 
    lopMonHocMap, 
    allMonHoc
  ]);
  
  // ✅ Lấy danh sách file từ Firestore theo tab đang chọn và lọc chính xác theo Lớp (hỗ trợ định dạng LOP_4_, LOP_5_...)
  const fetchFileList = async () => {
    // 🌟 Sử dụng activeTeacher thay cho teacherName để hỗ trợ TTCM xem dữ liệu GV khác
    if (!activeTeacher || !academicYear) {
      setFileList([]);
      return;
    }

    const gradeKey = String(className).split(".")[0].replace(/[^0-9]/g, "") || className;
    const yearStr = academicYear;
    
    // 🌟 Khóa cache theo activeTeacher
    const fileKey = `${academicYear}_${activeTeacher}_${subject}_Khối_${gradeKey}_tab_${activeTab}`;

    try {
      let filesRef;
      const yearCol = `KEHOACH_DAYHOC_${yearStr}`;

      // 1. Xác định đường dẫn collection/sub-collection dựa theo activeTab
      if (activeTab === 0) {
        // Tab 0: Kế hoạch bài dạy
        if (!className || !subject) {
          setFileList([]);
          return;
        }
        // 🌟 Truy cập kho lưu trữ của activeTeacher
        filesRef = collection(db, yearCol, activeTeacher, subject);

      } else {
        // Tab 1 (Đề KTĐK) hoặc Tab 2 (Biên bản) -> Phân nhóm chuẩn theo role và khối
        let docIdentifier = "Chung";
        if (teacherRole === "TA" || subject.toLowerCase().includes("tiếng anh")) {
          docIdentifier = "Tieng_Anh";
        } else if (teacherRole === "BM") {
          docIdentifier = "Bo_mon";
        } else if (teacherRole === "GVCN" && gradeKey) {
          docIdentifier = `Khối_${gradeKey}`;
        }
        docIdentifier = docIdentifier.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");

        if (activeTab === 1) {
          const mainColName = `DE_KTDK_${yearStr}`;
          const subjectName = (subject || "Chung").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");
          filesRef = collection(db, mainColName, docIdentifier, subjectName);

        } else if (activeTab === 2) {
          const mainColName = `BIEN_BAN_${yearStr}`;
          filesRef = collection(db, mainColName, docIdentifier, "FILES_LIST");
        }
      }

      // 2. Lấy thông tin từ document gốc của activeTeacher để quét thông báo BGH (nếu có)
      const teacherRef = doc(db, yearCol, activeTeacher); // 🌟 Dùng activeTeacher
      const teacherSnap = await getDoc(teacherRef);
      const teacherData = teacherSnap.exists() ? teacherSnap.data() : {};
      const notifications = teacherData.bghNotifications || [];

      const notificationMap = {};
      notifications.forEach((item) => {
        const fId = typeof item === "string" ? item : item.fileId;
        const fContent = typeof item === "string" ? "Yêu cầu từ BGH" : (item.content || "Yêu cầu từ BGH");
        const fRead = typeof item === "string" ? false : Boolean(item.read);

        if (fId) {
          notificationMap[fId] = { content: fContent, read: fRead };
        }
      });

      // 3. Truy vấn dữ liệu từ Firestore
      const querySnapshot = await getDocs(filesRef);
      const files = [];

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const docId = docSnap.id;

        // 🌟 Lọc theo lớp áp dụng cho Tab 0 (KHBD) và Tab 1 (Đề KTĐK)
        if (activeTab === 0 || activeTab === 1) {
          const idMatch = docId.match(/^LOP_(\d+)_/i) || docId.match(/^(\d+)_/i) || docId.match(/^Khoi_(\d+)_/i);
          const khoiValue = String(data.khoi || data.className || "").trim();
          const khoiMatch = khoiValue.match(/^(?:khối|khoi|lớp|lop)\s*(\d+)/i);
          const documentGrade = idMatch?.[1] || khoiMatch?.[1];

          const rawClassValue = String(data.className || data.khoi || "").trim();
          const matchesClass =
            documentGrade === gradeKey || 
            docId.startsWith(`LOP_${gradeKey}_`) || 
            docId.startsWith(`${gradeKey}_`) || 
            rawClassValue === gradeKey || 
            rawClassValue === `Khối ${gradeKey}` || 
            rawClassValue.startsWith(`${gradeKey}.`) || 
            rawClassValue.toLowerCase().startsWith(`khối ${gradeKey}.`) || 
            khoiValue === String(gradeKey);

          if (!matchesClass) return;
        }

        const notifInfo = notificationMap[docId];
        const hasNotification = Boolean(notifInfo);

        files.push({
          id: docId,
          ...data,
          bghRequest: hasNotification ? notifInfo.content : undefined,
          bghRequestRead: hasNotification ? notifInfo.read : undefined,
        });
      });

      files.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });

      setFileList(files);
      updateFileList(fileKey, files);

    } catch (err) {
      console.error("Lỗi khi tải danh sách file theo tab:", err);
      const cachedFiles = getFileList(fileKey);
      setFileList(cachedFiles.length > 0 ? cachedFiles : []);
    }
  };

  // ✅ Thống kê linh hoạt theo Tab đang chọn (Tab 0: KHBD lấy trực tiếp từ THONGKE_{academicYear})
  const fetchTeacherStats = async () => {
    if (!academicYear) return;

    const statsKey = `${academicYear}_${activeTeacher || teacherName}_tab_${activeTab}`;
    const cachedStats = getTeacherStats(statsKey);

    if (cachedStats.length > 0) {
      setStatsData(cachedStats);
      setLoadingStats(false);
    } else {
      setLoadingStats(true);
    }

    try {
      const stats = await fetchTeacherStatsData({
        academicYear,
        activeTab,
        activeTeacher,
        teacherName,
        teacherRole,
        className,
        assignedSubjectsList,
        allMonHoc,
        db,
      });

      setStatsData(stats);
      updateTeacherStats(statsKey, stats);
    } catch (error) {
      console.error("Lỗi khi thống kê theo tab:", error);
      setStatsData([]);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (
      activeTeacher &&
      teacherName &&
      academicYear &&
      teacherRole &&
      assignedClassesList.length > 0
    ) {
      fetchTeacherStats();
    }
  }, [
    activeTeacher,
    teacherName,
    academicYear,
    teacherRole,
    teacherAssignedSubjects,
    assignedClassesList,
    allMonHoc,
    lopMonHocMap,
    //className,
    activeTab,
  ]);

  // ✅ Xử lý tải file lên
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
      activeTab, // 👈 Truyền thêm activeTab để định hướng thư mục đích trên Drive (0: KHBD, 1: Đề KTĐK, 2: Biên bản)
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

  // ✅ Cập nhật hàm xóa để truyền thêm activeTab và teacherRole
  // ✅ Xóa file chuẩn xác theo tab (Tab 1: Đề KTĐK, Tab 2: Biên bản) và đúng nhóm phân quyền
  const handleConfirmDelete = async () => {
    // Lấy số khối từ className (Ví dụ: "5.1" -> "5")
    const gradeKey = String(className).split(".")[0].replace(/[^0-9]/g, "") || className;

    await handleConfirmDeleteService({
      filesToDelete,
      academicYear,
      teacherName,
      subject,
      className: gradeKey,    // Truyền khối đã chuẩn hóa (ví dụ: "5")
      activeTab,              // Tab hiện tại (0: KHBD, 1: Đề KTĐK, 2: Biên bản)
      teacherRole,            // Vai trò giáo viên (GVCN, BM, TA)
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
  }, [activeTeacher, subject, className, bghNotifications, activeTab]); // 🌟 Thay teacherName bằng activeTeacher

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

  // Hàm chuyển đổi tên môn học sang dạng viết tắt trên tiêu đề bảng tổng hợp
const getShortSubjectName = (name) => {
  if (!name) return "";
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();

  if (lower.includes("tiếng anh")) return "TA";
  if (lower.includes("tin học")) return "TH";
  if (lower.includes("công nghệ")) return "CN";
  if (lower.includes("giáo dục thể chất")) return "GDTC";
  if (lower.includes("âm nhạc")) return "AN";
  if (lower.includes("mĩ thuật") || lower.includes("mỹ thuật")) return "MT";
  if (lower === "toán") return "Toán";
  if (lower.includes("tiếng việt")) return "TV";
  if (lower.includes("đạo đức")) return "ĐĐ";
  if (lower.includes("tự nhiên và xã hội")) return "TNXH";
  if (lower === "khoa học") return "KH";
  if (lower.includes("lịch sử") || lower.includes("địa lí") || lower.includes("địa lý")) return "LSĐL";
  if (lower.includes("hoạt động trải nghiệm")) return "HĐTN";

  return trimmed;
};

// ============================================================
// TỔNG HỢP SỐ LIỆU GIÁO VIÊN THEO TỔ / KHỐI
// Nguồn dữ liệu: THONGKE_{academicYear}
// ============================================================
const handleOpenTeamSummary = async () => {
  setTeamSummaryOpen(true);
  setLoadingSchoolSummary(true);

  try {
    const { groupedSummary, teamList, missingCount } = await fetchTeamSummaryData({
      toTeachers,
      academicYear,
      db,
    });

    // Cập nhật State giao diện
    setSchoolSummaryGrouped(groupedSummary);

    console.log("🎯 KẾT QUẢ TỔNG HỢP GIÁO VIÊN:", groupedSummary);

    // Thông báo nếu có giáo viên thiếu dữ liệu
    if (missingCount > 0) {
      showMessage(
        `Không tìm thấy dữ liệu thống kê của ${missingCount}/${teamList.length} giáo viên. Kiểm tra mã giáo viên trong Firestore.`,
        "warning"
      );
    }
  } catch (error) {
    console.error("❌ Lỗi tổng hợp dữ liệu tổ/khối:", error);
    showMessage(
      "Không thể tải dữ liệu tổng hợp: " + (error.message || ""),
      "error"
    );
  } finally {
    setLoadingSchoolSummary(false);
  }
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
    {/* Cột trái: Tabs + Upload + Danh sách file */}
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
        <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2, p: 2, "&:last-child": { pb: 2 } }}>
          
          {/* 🌟 Thanh Tabs theo thứ tự: KHBD, Đề KTĐK, Biên bản */}
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => {
              setActiveTab(newValue);
              // Nếu chuyển sang Tab 1 hoặc Tab 2, tự động đưa targetTeacherName về lại tên chính mình (TTCM)
              if (newValue === 1 || newValue === 2) {
                if (typeof setTargetTeacherName === "function") {
                  setTargetTeacherName(teacherName);
                }
              }
            }}
            variant="fullWidth"
            sx={{
              minHeight: 46,
              bgcolor: "transparent",
              borderBottom: "2px solid #e2e8f0",
              "& .MuiTabs-indicator": {
                height: 3,
                borderRadius: "3px 3px 0 0",
                backgroundColor: "#1976d2",
              },
              "& .MuiTab-root": {
                minHeight: 44,
                fontWeight: 600,
                fontSize: "15px",
                textTransform: "none",
                color: "#64748b",
                mx: 1,
                padding: "6px 0",
                "&:hover": {
                  color: "#1976d2",
                },
                "&.Mui-selected": {
                  color: "#1976d2",
                  fontWeight: 700,
                },
              },
            }}
          >
            {/* Tab KHBD luôn luôn mở */}
            <Tab label="📚 KHBD" />

            {/* Tab Đề KTĐK: Bị khóa (disabled) nếu không phải TTCM */}
            <Tab label="📋 Đề KTĐK" disabled={!isTTCM} />
            
            {/* Tab Biên bản: Bị khóa (disabled) nếu không phải TTCM */}
            <Tab label="📝 Biên bản" disabled={!isTTCM} />
          </Tabs>

          {/* Hàng tiêu đề và quả chuông căn sát phải */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 0.5 }}>
            <Typography variant="h6" color="primary" sx={{ m: 0, fontWeight: 700 }}>
              {activeTab === 0 && "📚 Kế hoạch bài dạy"}
              {activeTab === 1 && "📋 Đề kiểm tra định kỳ"}
              {activeTab === 2 && "📝 Biên bản sinh hoạt CM"}
            </Typography>

            {/* Chỉ hiển thị nút bảng tổng hợp nếu là TTCM */}
            {isTTCM && (
              <Tooltip title="Xem bảng tổng hợp">
                <IconButton 
                  onClick={handleOpenTeamSummary}
                  sx={{ color: "#dc2626" }}
                >
                  <BarChartRoundedIcon />
                </IconButton>
              </Tooltip>
            )}

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

          {/* 🌟 Chỉ hiển thị ô chọn giáo viên trong tổ khi đang ở Tab 0 (KHBD) */}
          {isTTCM && activeTab === 0 && (
            <FormControl size="small" sx={{ width: "100%", mb: 2 }}>
              <InputLabel>Chọn giáo viên trong tổ</InputLabel>
              <Select
                value={targetTeacherName}
                label="Chọn giáo viên trong tổ"
                onChange={(e) => setTargetTeacherName(e.target.value)}
              >
                {toTeachers.map((tName) => (
                  <MenuItem key={tName} value={tName}>
                    {tName} {tName === teacherName ? "(Tôi)" : ""}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <FormControl size="small" sx={{ flex: 1 }} disabled={activeTab === 2}>
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

            {/* 🌟 Ẩn ô Lớp khi ở Tab 2 nếu là GVCN hoặc Tiếng Anh (TA) */}
            {!(teacherRole === "GVCN" && (activeTab === 1 || activeTab === 2)) && (
              <FormControl 
                size="small" 
                sx={{ flex: 1 }} 
                // 🌟 Khóa (disabled) nếu là BM ở Tab 2, hoặc là TA ở Tab 2
                disabled={
                  (teacherRole === "GVCN" && (activeTab === 1 || activeTab === 2)) || 
                  (teacherRole === "BM" && activeTab === 2) ||
                  (teacherRole === "TA" && activeTab === 2)
                }
              >
                <InputLabel>Lớp</InputLabel>
                <Select 
                  // 🌟 Ép giá trị thành rỗng nếu là BM hoặc TA ở Tab 2
                  value={
                    (activeTab === 2 && (teacherRole === "BM" || teacherRole === "TA")) 
                    ? "" 
                    : ((activeTab === 1 || activeTab === 2) && teacherRole === "GVCN" ? "" : className)
                  } 
                  label="Lớp" 
                  onChange={(e) => setClassName(e.target.value)}
                >
                  {activeTab === 1 && (teacherRole === "BM" || teacherRole === "TA") ? (
                    ["1", "2", "3", "4", "5"].map((clsNum) => (
                      <MenuItem key={clsNum} value={clsNum}>
                        {clsNum}
                      </MenuItem>
                    ))
                  ) : (
                    assignedClassesList.map((clsNum) => (
                      <MenuItem key={clsNum} value={clsNum}>
                        {clsNum}
                      </MenuItem>
                  ))
                  )}
                </Select>
              </FormControl>
            )}
          </Box>

          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "nowrap", overflowX: "auto" }}>
            {/* 🌟 Chỉ hiển thị nút Tải file nếu KHÔNG PHẢI là TTCM đang xem giáo viên khác */}
            {!(isTTCM && targetTeacherName && targetTeacherName !== teacherName) && (
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
                <input type="file" accept=".doc,.docx" multiple hidden onChange={(e) => handleUpload(e, activeTab)} />
              </Button>
            )}

            {/* 🌟 Chỉ hiển thị nút Xóa file nếu KHÔNG PHẢI là TTCM đang xem giáo viên khác */}
            {!(isTTCM && targetTeacherName && targetTeacherName !== teacherName) && (
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
            )}

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
            <Box sx={{ width: "70%", mx: "auto", mt: 1, mb: 1 }}>
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

      {/* Danh sách file lọc theo Tab đang chọn */}
      <FileListCard
        fileList={fileList.filter(file => {
          return file.tabIndex === activeTab || file.category === activeTab || true; 
        })}
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
            <Box sx={{ flex: 1, p: 1, position: "relative", overflow: "hidden" }}>
              <iframe
                src={`https://drive.google.com/file/d/${selectedFile.fileId}/preview`}
                style={{ width: "100%", height: "100%", border: "none" }}
                title="File Preview"
              />
              
              {/* 🌟 Lớp phủ vô hình che nút "Mở trong tab mới" ở góc trên bên phải */}
              <Box
                sx={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  width: 48,
                  height: 48,
                  zIndex: 10,
                  cursor: "default",
                  // bgcolor: "rgba(255,0,0,0.2)" // Bỏ comment dòng này nếu muốn test xem vị trí che đã chuẩn chưa
                }}
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
            activeTeacher={activeTeacher}
            activeTab={activeTab} 
            className={className}
            teacherRole={teacherRole}
          />
        )}
      </CardContent>
    </Card>

    {/* Các Dialog và Snackbar giữ nguyên */}
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

    <TeacherStatsDialog
      open={mobileStatsOpen}
      onClose={() => setMobileStatsOpen(false)}
      teacherName={teacherName}
      statsData={statsData}
      teacherAssignedSubjects={teacherAssignedSubjects}
      assignedClassesList={assignedClassesList}
      loadingStats={loadingStats}
      academicYear={academicYear}
      activeTeacher={activeTeacher}
      activeTab={activeTab}
      className={className}
      teacherRole={teacherRole}
    />

    <ConfirmDeleteDialog
      open={deleteDialogOpen}
      onClose={() => setDeleteDialogOpen(false)}
      filesToDelete={filesToDelete}
      onConfirm={handleConfirmDelete}
    />

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

    <TeamSummaryDialog
      open={teamSummaryOpen}
      onClose={() => setTeamSummaryOpen(false)}
      academicYear={academicYear}
      schoolSummaryGrouped={schoolSummaryGrouped}
      // 🌟 Đảm bảo filteredSubjectNames lấy đầy đủ danh sách môn học của tổ
      filteredSubjectNames={
        teacherRole === "BM" 
          ? allMonHoc.map(m => m.name).filter(name => !name.toLowerCase().includes("toán") && !name.toLowerCase().includes("tiếng việt"))
          : assignedSubjectsList
      }
      getShortSubjectName={getShortSubjectName}
      setSelectedUsername={(username) => {
        setTargetTeacherName(username);
      }}
      setSelectedFile={setSelectedFile}
      setSnackbar={setSnackbar}
    />
  </Box>
);
}