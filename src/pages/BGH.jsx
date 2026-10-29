import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  useMediaQuery,
  useTheme,
  ListSubheader,
} from "@mui/material";

import { db } from "../firebase";
import { collection, getDocs, doc, getDoc, query, where, updateDoc, serverTimestamp } from "firebase/firestore";
import { fetchSchoolSummaryData, fetchTeacherStatsData } from "../utils/thongKe";
import { saveBghRequestService, deleteBghRequestService } from "../utils/bghNotificationService";
import { fetchPhanQuyen } from "../utils/phanQuyenHelper";
import { tinhToanMonHocChoGiaoVien } from "../utils/monHocHelper";
import { taiThongKeGiaoVien } from "../utils/thongKeGiaoVien";

import TeacherStatsView from "../components/TeacherStatsView";
import SchoolSummaryView from "../components/SchoolSummaryView";
import FileListCardBGH from "../components/FileListCardBGH";

import { useBGHStats } from "../contexts/BGHStatsContext";
import BghRequestManageDialog from "../dialogs/BghRequestManageDialog";
import MobileStatsSummaryDialog from "../dialogs/MobileStatsSummaryDialog";
import TeacherAdjustmentDialog from "../dialogs/TeacherAdjustmentDialog";

import {
  SchoolRounded,
  ClassRounded,
  MenuBookRounded,
  BookmarkRounded,
  StarRounded,
} from "@mui/icons-material";

// Hàm chuyển đổi tên môn học sang dạng viết tắt trên tiêu đề
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

export default function BGH({ user }) {
  const [fileList, setFileList] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loadingFiles, setLoadingFiles] = useState(false);

  // State cho chế độ Tổng hợp toàn trường
  const [viewMode, setViewMode] = useState("single");
  const [loadingSchoolSummary, setLoadingSchoolSummary] = useState(false);
  const [schoolSummaryGrouped, setSchoolSummaryGrouped] = useState({});

  // State bật/tắt chế độ toàn màn hình
  const [isFullScreen, setIsFullScreen] = useState(false);

  const [academicYear, setAcademicYear] = useState("2026-2027");
  const [subject, setSubject] = useState("");
  const [className, setClassName] = useState("");

  // Dữ liệu thống kê giáo viên
  const [statsData, setStatsData] = useState([]);
  const [loadingStats, setLoadingStats] = useState(false);

  // Context quản lý dữ liệu thống kê dùng chung và cache tổng hợp toàn trường
  const { 
    updateTeacherStats, 
    getTeacherStats, 
    getSchoolSummary,      // 🌟 Thêm hàm lấy cache tổng hợp
    updateSchoolSummary    // 🌟 Thêm hàm lưu cache tổng hợp
  } = useBGHStats();

  const [teacherAllowedSubjects, setTeacherAllowedSubjects] = useState([]);
  const [teacherAllowedClasses, setTeacherAllowedClasses] = useState([]);

  const [allMonHoc, setAllMonHoc] = useState([]);
  const [lopMonHocMap, setLopMonHocMap] = useState({});
  const [filterCategory, setFilterCategory] = useState("gvcn");

// 🚀 State quản lý Dialog nhập yêu cầu điều chỉnh của BGH
  const [bghRequestOpen, setBghRequestOpen] = useState(false);
  const [bghTargetFile, setBghTargetFile] = useState(null);
  const [bghRequestText, setBghRequestText] = useState("");
  const [saving, setSaving] = useState(false);

  // 🚀 State quản lý Dialog xem/sửa kế hoạch bài dạy của giáo viên
  const [teacherAdjOpen, setTeacherAdjOpen] = useState(false);
  const [selectedTeacherAdjFile, setSelectedTeacherAdjFile] = useState(null);   

  // State theo dõi cờ tổng hợp toàn trường từ CONFIG
  const [flagSchoolSummary, setFlagSchoolSummary] = useState(false);

  const [groupedTeachers, setGroupedTeachers] = useState({
    khoi1: [],
    khoi2: [],
    khoi3: [],
    khoi4: [],
    khoi5: [],
    tiengAnh: [],
    boMon: [],
  });

  const [phanQuyenMap, setPhanQuyenMap] = useState({});
  const [selectedUsername, setSelectedUsername] = useState("");

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const lowerUsername = user?.username?.toLowerCase() || "";
  const isBGH =
    lowerUsername === "bgh" ||
    lowerUsername.includes("chuyên môn") ||
    user?.role === "bgh";
  const isAdmin = isBGH;

  // 3. Kiểm tra cờ flagSchoolSummary từ CONFIG để tự động tổng hợp toàn trường nếu cần
  useEffect(() => {
    const checkSchoolSummaryFlag = async () => {
      if (!isBGH) return;
      try {
        const configRef = doc(db, "CONFIG", "config");
        const configSnap = await getDoc(configRef);
        if (configSnap.exists()) {
          const data = configSnap.data();
          if (data.flagSchoolSummary === true) {
            setFlagSchoolSummary(true);
            setViewMode("schoolSummary");
            // 🌟 Ép làm mới (forceRefresh = true) vì trên Server vừa có dữ liệu mới do giáo viên nộp bài
            await fetchSchoolSummary(true); 
          }
        }
      } catch (err) {
        console.error("❌ Lỗi kiểm tra flagSchoolSummary:", err);
      }
    };

    checkSchoolSummaryFlag();
  }, [isBGH, academicYear, phanQuyenMap, allMonHoc]);

  // 1. Lấy CONFIG, MONHOC & LOP_MONHOC
  useEffect(() => {
    const fetchConfigAndMonHoc = async () => {
      try {
        const configRef = doc(db, "CONFIG", "config");
        const configSnap = await getDoc(configRef);
        if (configSnap.exists() && configSnap.data().namHoc) {
          setAcademicYear(configSnap.data().namHoc);
        }

        const monSnap = await getDocs(collection(db, "MONHOC"));
        const monList = [];
        monSnap.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.name) {
            monList.push({
              name: data.name,
              grades: data.grades || [],
            });
          }
        });
        setAllMonHoc(monList);

        // 🟢 THÊM: Lấy dữ liệu phân bổ môn học theo lớp từ LOP_MONHOC
        const lopMonHocSnap = await getDocs(collection(db, "LOP_MONHOC"));
        const lopMap = {};
        lopMonHocSnap.forEach((d) => {
          lopMap[d.id] = d.data().subjects || [];
        });
        setLopMonHocMap(lopMap);

      } catch (err) {
        console.error("❌ Lỗi khi tải CONFIG / MONHOC / LOP_MONHOC:", err);
      }
    };

    if (isBGH) {
      fetchConfigAndMonHoc();
    }
  }, [isBGH]);

  // 2. Phân quyền giáo viên (Sử dụng tiện ích)
  useEffect(() => {
    const loadPhanQuyenData = async () => {
      if (!isBGH) return;

      const result = await fetchPhanQuyen(academicYear);
      if (result) {
        setGroupedTeachers(result.groups);
        setPhanQuyenMap(result.map);

        setSelectedUsername((prevSelected) =>
          !prevSelected && result.firstAvailableTeacher
            ? result.firstAvailableTeacher
            : prevSelected
        );
      }
    };

    loadPhanQuyenData();
  }, [isBGH, academicYear]);

  const getFilteredTeacherList = () => {
    let list = [];
    if (filterCategory === "all") {
      list = [
        ...groupedTeachers.khoi1,
        ...groupedTeachers.khoi2,
        ...groupedTeachers.khoi3,
        ...groupedTeachers.khoi4,
        ...groupedTeachers.khoi5,
        ...groupedTeachers.tiengAnh,
        ...groupedTeachers.boMon,
      ];
    } else if (filterCategory === "gvcn") {
      list = [
        ...groupedTeachers.khoi1,
        ...groupedTeachers.khoi2,
        ...groupedTeachers.khoi3,
        ...groupedTeachers.khoi4,
        ...groupedTeachers.khoi5,
      ];
    } else if (filterCategory === "tieng_anh") {
      list = groupedTeachers.tiengAnh;
    } else if (filterCategory === "bo_mon") {
      list = groupedTeachers.boMon;
    }
    return Array.from(new Set(list));
  };

  const handleCategoryChange = (event, newCategory) => {
    if (newCategory !== null) {
      setFilterCategory(newCategory);
      setViewMode("single");
      let tempGroups = { ...groupedTeachers };
      let newList = [];
      if (newCategory === "all") {
        newList = [
          ...tempGroups.khoi1,
          ...tempGroups.khoi2,
          ...tempGroups.khoi3,
          ...tempGroups.khoi4,
          ...tempGroups.khoi5,
          ...tempGroups.tiengAnh,
          ...tempGroups.boMon,
        ];
      } else if (newCategory === "gvcn") {
        newList = [
          ...tempGroups.khoi1,
          ...tempGroups.khoi2,
          ...tempGroups.khoi3,
          ...tempGroups.khoi4,
          ...tempGroups.khoi5,
        ];
      } else if (newCategory === "tieng_anh") {
        newList = tempGroups.tiengAnh;
      } else if (newCategory === "bo_mon") {
        newList = tempGroups.boMon;
      }
      const uniqueList = Array.from(new Set(newList));
      if (uniqueList.length > 0) {
        setSelectedUsername(uniqueList[0]);
      }
    }
  };

  useEffect(() => {
    if (!selectedUsername || !phanQuyenMap[selectedUsername]) return;

    const teacherInfo = phanQuyenMap[selectedUsername];
    const rawClasses = teacherInfo.teachingClasses || ["1"];

    setTeacherAllowedClasses(rawClasses);
    if (rawClasses.length > 0 && !rawClasses.includes(String(className))) {
      setClassName(String(rawClasses[0]));
    }
  }, [selectedUsername, phanQuyenMap]);

  // Lọc danh sách môn học phù hợp với giáo viên và lớp được chọn (đồng bộ logic với Users.jsx)
  // Lọc danh sách môn học phù hợp với giáo viên và lớp được chọn (Sử dụng tiện ích)
  useEffect(() => {
    const { finalSubjects, newSubject } = tinhToanMonHocChoGiaoVien({
      selectedUsername,
      phanQuyenMap,
      className,
      allMonHoc,
      lopMonHocMap,
      currentSubject: subject,
    });

    setTeacherAllowedSubjects(finalSubjects);
    setSubject(newSubject);
  }, [selectedUsername, className, phanQuyenMap, allMonHoc, lopMonHocMap]);

  // Truy vấn danh sách file từ Firestore
  
  // 🌟 Hàm quét và đồng bộ danh sách file chuẩn theo cả 2 cấu trúc (Khối mới và Lớp cũ như 4.3)
  const fetchFileList = async () => {
    if (!selectedUsername || !className || !subject || !academicYear) {
      setFileList([]);
      setSelectedFile(null);
      setLoadingFiles(false);
      return false;
    }

    setLoadingFiles(true);

    try {
      const yearCol = `KEHOACH_DAYHOC_${academicYear}`;
      const teacherId = selectedUsername.trim().toUpperCase();

      const teacherRef = doc(db, yearCol, teacherId);
      const teacherSnap = await getDoc(teacherRef);
      const teacherData = teacherSnap.exists() ? teacherSnap.data() : {};
      const notifications = teacherData.bghNotifications || [];

      const notificationMap = {};
      notifications.forEach((n) => {
        const fId = typeof n === "string" ? n : n.fileId;
        const fContent = typeof n === "string" ? "Yêu cầu từ BGH" : (n.content || "Yêu cầu từ BGH");
        const fRead = typeof n === "string" ? false : Boolean(n.read);

        if (fId) {
          notificationMap[fId] = { content: fContent, read: fRead };
        }
      });

      const filesRef = collection(db, yearCol, teacherId, subject);
      const snapshot = await getDocs(filesRef);
      const files = [];

      const selectedClass = String(className).trim();
      const gradeKey = selectedClass.split(".")[0].replace(/[^0-9]/g, "") || selectedClass;

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const docId = docSnap.id;

        const notifInfo = notificationMap[docId];
        const hasNotification = Boolean(notifInfo);

        const idMatch = docId.match(/^Khoi_(\d+)_/i);
        const khoiValue = String(data.khoi || data.className || data.lop || "").trim();
        const khoiMatch = khoiValue.match(/^(?:khối|khoi|lớp|lop)\s*(\d+)/i);
        const documentGrade = idMatch?.[1] || khoiMatch?.[1];

        const rawClassValue = String(data.className || data.lop || data.khoi || "").trim();
        const rawClassGrade = rawClassValue.split(".")[0].replace(/[^0-9]/g, "");

        // 🌟 Điều kiện quét gộp cả 2 nguồn (Khối mới và lớp cũ) để không bị sót số liệu
        const matchesClass =
          documentGrade === gradeKey || 
          rawClassGrade === gradeKey ||
          rawClassValue === gradeKey || 
          rawClassValue === `Khối ${gradeKey}` || 
          rawClassValue === selectedClass ||
          rawClassValue.startsWith(`${gradeKey}.`) || 
          rawClassValue.toLowerCase().startsWith(`khối ${gradeKey}.`) || 
          khoiValue === String(gradeKey) ||
          docId.includes(`Khoi_${gradeKey}_`) ||
          docId.includes(`_${selectedClass}_`);

        if (matchesClass) {
          files.push({
            id: docId,
            ...data,
            bghRequest: hasNotification ? notifInfo.content : undefined,
            bghRequestRead: hasNotification ? notifInfo.read : undefined,
          });
        }
      });

      // Sắp xếp danh sách file theo thời gian mới nhất
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
      setSelectedFile(false);
      return true;
    } catch (err) {
      console.error("Lỗi tải file:", err);
      return false;
    } finally {
      setLoadingFiles(false);
    }
  };

  // Sắp xếp danh sách môn học theo thứ tự: Tổ bộ môn trước, GVCN sau
  const getFilteredSubjectNames = () => {
    const rawList = Array.from(
      new Set([
        ...allMonHoc.map((m) => m.name),
        ...Object.values(phanQuyenMap).flatMap((t) => t.assignedSubjects || []),
      ])
    ).filter((subName) => subName && !subName.toLowerCase().includes("tất cả"));

    // Lọc loại bỏ trùng lặp tên viết tắt
    const seenShortNames = new Set();
    const uniqueSubjects = [];

    for (const subName of rawList) {
      const shortName = getShortSubjectName(subName);
      if (!seenShortNames.has(shortName)) {
        seenShortNames.add(shortName);
        uniqueSubjects.push(subName);
      }
    }

    // Thứ tự ưu tiên cho các môn Tổ Bộ môn
    const subjectPriority = {
      TA: 1,
      TH: 2,
      CN: 3,
      GDTC: 4,
      AN: 5,
      MT: 6,
      Toán: 7,
      TV: 8,
      ĐĐ: 9,
      TNXH: 10,
      KH: 11,
      "LSĐL": 12,
      HĐTN: 13,
    };

    uniqueSubjects.sort((a, b) => {
      const shortA = getShortSubjectName(a);
      const shortB = getShortSubjectName(b);
      const prioA = subjectPriority[shortA] || 99;
      const prioB = subjectPriority[shortB] || 99;
      return prioA - prioB;
    });

    return uniqueSubjects;
  };

  const filteredSubjectNames = getFilteredSubjectNames();

  // 🔹 THỐNG KÊ BÀI NỘP TOÀN TRƯỜNG (Có tích hợp Cache từ Context)
  const fetchSchoolSummary = async (isForceRefresh = false) => {
    // 1. Nếu không bắt buộc làm mới (isForceRefresh = false), thử lấy từ Cache trước
    if (!isForceRefresh) {
      const cachedSummary = getSchoolSummary(academicYear);
      if (cachedSummary && Object.keys(cachedSummary).length > 0) {
        console.log("⚡ Đang sử dụng dữ liệu Tổng hợp toàn trường từ Cache (Context/LocalStorage)");
        setSchoolSummaryGrouped(cachedSummary);
        return; // Dừng lại, không cần gọi Firebase giúp load tức thì!
      }
    }

    // 2. Nếu chưa có cache hoặc có yêu cầu làm mới, gọi hàm fetch từ file thongKe.js
    await fetchSchoolSummaryData({
      isAdmin,
      phanQuyenMap,
      allMonHoc,
      academicYear,
      groupedTeachers,
      filteredSubjectNames,
      setLoadingSchoolSummary,
      setSchoolSummaryGrouped: (groupedResult) => {
        // Cập nhật State hiển thị lên giao diện
        setSchoolSummaryGrouped(groupedResult);
        // 🌟 Lưu ngược lại vào Context và LocalStorage để lần sau dùng luôn
        updateSchoolSummary(academicYear, groupedResult);
      },
      forceRefresh: isForceRefresh,
    });
  };

  // Thống kê cá nhân theo giáo viên và năm học
  
  // Thống kê cá nhân theo giáo viên và năm học (Sử dụng tiện ích)
  useEffect(() => {
    let cancelled = false;
    const isCancelled = () => cancelled;

    taiThongKeGiaoVien({
      isBGH,
      isAdmin,
      selectedUsername,
      academicYear,
      subject,
      className,
      phanQuyenMap,
      allMonHoc,
      getTeacherStats,
      updateTeacherStats,
      fetchFileListFn: fetchFileList, // 🌟 Truyền hàm fetchFileList gốc đang nằm trong component vào
      setStatsData,
      setLoadingFiles,
      setLoadingStats,
      isCancelled,
    });

    return () => {
      cancelled = true;
    };
  }, [
    isBGH,
    selectedUsername,
    academicYear,
    subject,
    className,
    phanQuyenMap,
    allMonHoc,
    isAdmin,
    getTeacherStats,
    updateTeacherStats,
  ]);

  if (!isBGH) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography color="error" variant="h6">
          ⚠️ Bạn không có quyền truy cập trang Ban Giám Hiệu.
        </Typography>
      </Box>
    );
  }

  const formatVNDate = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
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

  const currentTeacherList = getFilteredTeacherList();
  
  const handleSelectTeacherFromSummary = (teacherName) => {
    if (!teacherName) return;

    // Tìm đúng tên giáo viên trong danh sách phân quyền
    const normalizedName = String(teacherName).trim().toUpperCase();

    const matchedName =
      Object.keys(phanQuyenMap).find(
        (name) => name.trim().toUpperCase() === normalizedName
      ) || normalizedName;

    // Xác định nhóm của giáo viên
    let category = "gvcn";

    if (
      groupedTeachers.tiengAnh.some(
        (name) => name.trim().toUpperCase() === normalizedName
      )
    ) {
      category = "tieng_anh";
    } else if (
      groupedTeachers.boMon.some(
        (name) => name.trim().toUpperCase() === normalizedName
      )
    ) {
      category = "bo_mon";
    } else {
      const teacherInfo = phanQuyenMap[matchedName];
      const role = String(teacherInfo?.role || "").toUpperCase();
      const subjects = (teacherInfo?.assignedSubjects || [])
        .join(" ")
        .toLowerCase();

      if (role === "TA" || subjects.includes("tiếng anh")) {
        category = "tieng_anh";
      } else if (role === "BM") {
        category = "bo_mon";
      }
    }

    // Mở đúng nhóm và giữ nguyên giáo viên vừa bấm
    setFilterCategory(category);
    setSelectedUsername(matchedName);
    setSelectedFile(null);
    setIsFullScreen(false);
    setViewMode("single");
  };

  // Hàm lưu nội dung yêu cầu điều chỉnh từ BGH
  const handleSaveBghRequest = async () => {
    if (!bghTargetFile || !bghTargetFile.id) return;

    try {
      setSaving(true);
      const res = await saveBghRequestService({
        bghTargetFile,
        academicYear,
        selectedUsername,
        subject,
        bghRequestText,
      });

      if (res.success) {
        // Cập nhật lại giao diện danh sách file ngay lập tức
        setFileList((prev) =>
          prev.map((f) => (f.id === res.fileId ? { ...f, bghRequest: bghRequestText } : f))
        );

        setBghRequestOpen(false);
        setBghTargetFile(null);
        setBghRequestText("");
        console.log("✅ Đã lưu yêu cầu thành công!");
      }
    } catch (error) {
      console.error("❌ Lỗi khi gửi yêu cầu:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBghRequest = async () => {
    if (!bghTargetFile) return;

    try {
      setSaving(true);
      const res = await deleteBghRequestService({
        bghTargetFile,
        academicYear,
        selectedUsername,
      });

      if (res.success) {
        // Cập nhật lại state fileList để ẩn chip đi
        setFileList((prev) =>
          prev.map((f) => (f.id === res.fileId ? { ...f, bghRequest: undefined } : f))
        );

        setBghRequestOpen(false);
        setBghTargetFile(null);
        setBghRequestText("");
        console.log("✅ Đã xóa yêu cầu hoàn toàn!");
      }
    } catch (error) {
      console.error("❌ Lỗi khi xóa:", error);
    } finally {
      setSaving(false);
    }
  };

  // 🚀 Hàm mở dialog và lấy nội dung điều chỉnh theo fileId từ bghNotifications
  const handleViewAdjustedFile = async (file) => {
    try {
      const yearCol = `KEHOACH_DAYHOC_${academicYear}`;
      const teacherRef = doc(db, yearCol, selectedUsername.trim().toUpperCase());
      const teacherSnap = await getDoc(teacherRef);

      let matchedContent = "";
      if (teacherSnap.exists()) {
        const data = teacherSnap.data();
        const notifications = data.bghNotifications || [];
        
        // Tìm thông báo khớp với ID của file hiện tại
        const targetNotif = notifications.find(
          (n) => n.fileId === file.id || n.fileId === file.fileId
        );
        
        if (targetNotif) {
          matchedContent = targetNotif.content;
        }
      }

      // Truyền file kèm theo nội dung điều chỉnh tìm được vào state
      setSelectedTeacherAdjFile({
        ...file,
        adjustmentContent: matchedContent || "Chưa có nội dung điều chỉnh cho file này.",
      });
      setTeacherAdjOpen(true);
    } catch (err) {
      console.error("Lỗi lấy nội dung điều chỉnh:", err);
    }
  };
  
  return (
    <Box
      sx={{
        height: "calc(100vh - 64px)",
        width: "100vw",
        display: "flex",
        gap: 1.5,
        px: 1.5,
        pb: 1.5,
        mt: 2, 
        alignItems: "stretch",
        flexDirection: { xs: "column", sm: "row" },
        boxSizing: "border-box",
      }}
    >
      {/* Cột trái: Bộ lọc + Danh sách file (Ẩn đi nếu bật chế độ toàn màn hình) */}
      {!isFullScreen && (
        <Box
          sx={{
            width: { xs: "100%", sm: "32%" },
            minWidth: 280,
            display: { xs: viewMode === "single" ? "flex" : "none", sm: "flex" },
            flexDirection: "column",
            gap: 1.5,
            height: "100%",
          }}
        >
          <Card sx={{ width: "100%", flexShrink: 0 }}>
            <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.5, pt: 1.5, pb: "16px !important" }}>
              <Typography variant="h6" color="primary" sx={{ mb: 0, fontWeight: "bold" }}>
                📚 QUẢN LÍ KHBD
              </Typography>

              {/* 2 nút Tổng hợp cá nhân và Tổng hợp toàn trường */}
              <Box sx={{ display: "flex", gap: 1.5, width: "100%", flexWrap: "nowrap" }}>
                {/* Nút Tổng hợp cá nhân */}
                <Button
                  variant={viewMode === "personal" ? "contained" : "outlined"}
                  color="primary"
                  fullWidth
                  onClick={() => setViewMode("personal")}
                  sx={{
                    flex: 1,
                    height: 46,
                    borderRadius: "12px",
                    textTransform: "none",
                    fontWeight: 700,
                    fontSize: "13.5px",
                    whiteSpace: "nowrap",
                    ...(viewMode === "personal"
                      ? {
                          bgcolor: "#1976d2",
                          boxShadow: "0 8px 20px rgba(25, 118, 210, 0.3)",
                          "&:hover": { bgcolor: "#115293" },
                        }
                      : {
                          borderColor: "#cbd5e1",
                          color: "#475569",
                          "&:hover": { borderColor: "#94a3b8", bgcolor: "#f1f5f9" },
                        }),
                  }}
                >
                  👤 Cá nhân
                </Button>

                {/* Nút Tổng hợp toàn trường */}
                <Button
                  variant={viewMode === "summary" ? "contained" : "outlined"}
                  color="primary"
                  fullWidth
                  onClick={() => {
                    setViewMode("summary");
                    if (Object.keys(schoolSummaryGrouped).length === 0) {
                      fetchSchoolSummary();
                    }
                  }}
                  sx={{
                    flex: 1,
                    height: 46,
                    borderRadius: "12px",
                    textTransform: "none",
                    fontWeight: 700,
                    fontSize: "13.5px",
                    whiteSpace: "nowrap",
                    ...(viewMode === "summary"
                      ? {
                          bgcolor: "#1976d2",
                          boxShadow: "0 8px 20px rgba(25, 118, 210, 0.3)",
                          "&:hover": { bgcolor: "#115293" },
                        }
                      : {
                          borderColor: "#cbd5e1",
                          color: "#475569",
                          "&:hover": { borderColor: "#94a3b8", bgcolor: "#f1f5f9" },
                        }),
                  }}
                >
                  📊 Toàn trường
                </Button>
              </Box>

              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight="bold"
                  gutterBottom
                  display="block"
                  sx={{ mb: 0.5 }}
                >
                  🔍 LỌC NHÓM GIÁO VIÊN:
                </Typography>
                <ToggleButtonGroup
                  value={filterCategory}
                  exclusive
                  onChange={handleCategoryChange}
                  size="small"
                  fullWidth
                  sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}
                >
                  <ToggleButton value="gvcn" sx={{ flex: 1, fontSize: "0.75rem", py: 0.4 }}>
                    GVCN (1-5)
                  </ToggleButton>
                  <ToggleButton value="tieng_anh" sx={{ flex: 1, fontSize: "0.75rem", py: 0.4 }}>
                    Tiếng Anh
                  </ToggleButton>
                  <ToggleButton value="bo_mon" sx={{ flex: 1, fontSize: "0.75rem", py: 0.4 }}>
                    Bộ môn
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>

              <FormControl fullWidth size="small">
                <InputLabel>👤 Chọn Giáo viên</InputLabel>
                <Select
                  value={selectedUsername || ""}
                  label="👤 Chọn Giáo viên"
                  onChange={(e) => {
                    setSelectedUsername(e.target.value);
                    setViewMode("single");
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: { maxHeight: 420 },
                    },
                  }}
                >
                  {filterCategory === "gvcn" ? (
                    [
                      {
                        key: "khoi1",
                        title: "Khối Lớp 1",
                        teachers: groupedTeachers.khoi1,
                        icon: <ClassRounded fontSize="small" />,
                      },
                      {
                        key: "khoi2",
                        title: "Khối Lớp 2",
                        teachers: groupedTeachers.khoi2,
                        icon: <MenuBookRounded fontSize="small" />,
                      },
                      {
                        key: "khoi3",
                        title: "Khối Lớp 3",
                        teachers: groupedTeachers.khoi3,
                        icon: <BookmarkRounded fontSize="small" />,
                      },
                      {
                        key: "khoi4",
                        title: "Khối Lớp 4",
                        teachers: groupedTeachers.khoi4,
                        icon: <StarRounded fontSize="small" />,
                      },
                      {
                        key: "khoi5",
                        title: "Khối Lớp 5",
                        teachers: groupedTeachers.khoi5,
                        icon: <SchoolRounded fontSize="small" />,
                      },
                    ].flatMap((group) =>
                      group.teachers.length > 0
                        ? [
                            <ListSubheader
                              key={`header-${group.key}`}
                              disableSticky
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                bgcolor: "#f1f5f9",
                                color: "#1e40af",
                                fontWeight: 700,
                                lineHeight: "40px",
                              }}
                            >
                              {group.icon}
                              {group.title}
                            </ListSubheader>,
                            ...group.teachers.map((name) => (
                              <MenuItem
                                key={`${group.key}-${name}`}
                                value={name}
                                sx={{ pl: 4 }}
                              >
                                {name}
                              </MenuItem>
                            )),
                          ]
                        : []
                    )
                  ) : currentTeacherList.length > 0 ? (
                    currentTeacherList.map((name) => (
                      <MenuItem key={name} value={name}>
                        {name}
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem disabled value="">
                      <em>Không có giáo viên trong nhóm này</em>
                    </MenuItem>
                  )}
                </Select>
              </FormControl>

              <Box sx={{ display: "flex", gap: 1.5 }}>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>Môn học</InputLabel>
                  <Select
                    value={subject}
                    label="Môn học"
                    onChange={(e) => setSubject(e.target.value)}
                  >
                    {teacherAllowedSubjects.length === 0 ? (
                      <MenuItem disabled value="">
                        <em>Không có môn phù hợp</em>
                      </MenuItem>
                    ) : (
                      teacherAllowedSubjects.map((subName) => (
                        <MenuItem key={subName} value={subName}>
                          {subName}
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>Lớp</InputLabel>
                  <Select
                    value={className}
                    label="Lớp"
                    onChange={(e) => setClassName(e.target.value)}
                  >
                    {teacherAllowedClasses.length === 0 ? (
                      <MenuItem disabled value="">
                        <em>Không có lớp</em>
                      </MenuItem>
                    ) : (
                      teacherAllowedClasses.map((clsNum) => {
                        const isGVCN = phanQuyenMap[selectedUsername]?.role === "GVCN";
                        return (
                          <MenuItem key={clsNum} value={clsNum}>
                            {isGVCN ? clsNum : `Lớp ${clsNum}`}
                          </MenuItem>
                        );
                      })
                    )}
                  </Select>
                </FormControl>
              </Box>
            </CardContent>
          </Card>

          {/* Danh sách file */}
          <FileListCardBGH
            fileList={fileList}
            selectedFile={selectedFile}
            setSelectedFile={setSelectedFile}
            loadingFiles={loadingFiles}
            setViewMode={setViewMode}
            formatVNDate={formatVNDate}
            onRequestAdjustment={(file) => {
              setBghTargetFile(file);
              setBghRequestText(file.bghRequest || ""); // Lấy lại nội dung cũ nếu có
              setBghRequestOpen(true); // 👈 Bật Dialog mở form nhập
            }}
            onViewAdjusted={handleViewAdjustedFile} // 👈 THÊM DÒNG NÀY VÀO ĐÂY
          />
        </Box>
      )}

      {/* 📱 DIALOG HIỂN THỊ BẢNG NỔI TRÊN ĐIỆN THOẠI KHI BẤM NÚT CÁ NHÂN HOẶC TOÀN TRƯỜNG */}
      <MobileStatsSummaryDialog
        viewMode={viewMode}
        setViewMode={setViewMode}
        isMobile={isMobile}
        academicYear={academicYear}
        loadingSchoolSummary={loadingSchoolSummary}
        schoolSummaryGrouped={schoolSummaryGrouped}
        filteredSubjectNames={filteredSubjectNames}
        fetchSchoolSummary={fetchSchoolSummary}
        getShortSubjectName={getShortSubjectName}
        handleSelectTeacherFromSummary={handleSelectTeacherFromSummary}
        setSelectedFile={setSelectedFile}
        isFullScreen={isFullScreen}
        setIsFullScreen={setIsFullScreen}
        selectedUsername={selectedUsername}
        statsData={statsData}
        teacherAllowedSubjects={teacherAllowedSubjects}
        teacherAllowedClasses={teacherAllowedClasses}
        loadingStats={loadingStats}
      />

      {/* Cột phải hiển thị trên máy tính (Desktop) hoặc khi xem trước file trên điện thoại */}
      <Card
        sx={{
          flex: 1,
          height: "100%",
          display: {
            xs: selectedFile?.fileId ? "flex" : "none",
            sm: "flex",
          },
          flexDirection: "column",
          overflow: "hidden",
          ...(isFullScreen && {
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            zIndex: 1300,
            m: 0,
            borderRadius: 0,
          }),
        }}
      >
        <CardContent sx={{ height: "100%", p: 0, boxSizing: "border-box", display: "flex", flexDirection: "column", position: "relative" }}>
          {viewMode === "summary" ? (
            <SchoolSummaryView
              academicYear={academicYear}
              loadingSchoolSummary={loadingSchoolSummary}
              schoolSummaryGrouped={schoolSummaryGrouped}
              filteredSubjectNames={filteredSubjectNames}
              fetchSchoolSummary={fetchSchoolSummary}
              setViewMode={setViewMode}
              getShortSubjectName={getShortSubjectName}
              setSelectedUsername={handleSelectTeacherFromSummary}
              setSelectedFile={setSelectedFile}
              isFullScreen={isFullScreen}
              setIsFullScreen={setIsFullScreen}
            />
          ) : viewMode === "personal" || !selectedFile?.fileId ? (
            <TeacherStatsView
              selectedUsername={selectedUsername}
              statsData={statsData}
              teacherAllowedSubjects={teacherAllowedSubjects}
              teacherAllowedClasses={teacherAllowedClasses}
              loadingStats={loadingStats}
              academicYear={academicYear}
            />
          ) : (
            <>
              <Box sx={{ py: 0.5, px: 1.5, bgcolor: "#f8f9fa", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, borderBottom: "1px solid #ddd" }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  👁️ Xem trước: {selectedFile.fileName || selectedFile.name}
                </Typography>
                <Button size="small" variant="outlined" onClick={() => setSelectedFile(null)}>
                  Đóng xem trước
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
          )}
        </CardContent>
      </Card>

      {/* DIALOG NHẬP YÊU CẦU ĐIỀU CHỈNH CỦA BGH */}
      <BghRequestManageDialog
        open={bghRequestOpen}
        onClose={() => setBghRequestOpen(false)}
        selectedUsername={selectedUsername}
        subject={subject}
        className={className}
        bghRequestText={bghRequestText}
        setBghRequestText={setBghRequestText}
        hasExistingRequest={Boolean(bghTargetFile?.bghRequest)}
        handleDeleteBghRequest={handleDeleteBghRequest}
        handleSaveBghRequest={handleSaveBghRequest}
      />

      {/* 🚀 Dialog hiển thị form kế hoạch bài dạy của giáo viên */}
      {teacherAdjOpen && (
        <TeacherAdjustmentDialog
          open={teacherAdjOpen}
          onClose={() => {
            setTeacherAdjOpen(false);
            setSelectedTeacherAdjFile(null);
          }}
          fileData={selectedTeacherAdjFile}
          teacherName={selectedUsername}
        />
      )}

    </Box>
  );
}