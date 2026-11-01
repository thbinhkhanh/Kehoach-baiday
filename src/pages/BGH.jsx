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
  Tabs,
  Tab,
  IconButton, 
  Tooltip,
} from "@mui/material";

import {
  SchoolRounded,
  ClassRounded,
  MenuBookRounded,
  BookmarkRounded,
  StarRounded,
} from "@mui/icons-material";


import { db } from "../firebase";
import { collection, getDocs, doc, getDoc, query, where, updateDoc, serverTimestamp } from "firebase/firestore";
import { fetchSchoolSummaryData, fetchTeacherStatsData } from "../utils/thongKe";
import { saveBghRequestService, deleteBghRequestService } from "../utils/bghNotificationService";
import { fetchPhanQuyen } from "../utils/phanQuyenHelper";
import { tinhToanMonHocChoGiaoVien } from "../utils/monHocHelper";
import { taiThongKeGiaoVien } from "../utils/thongKeGiaoVien";
import { handleExportExcel } from "../utils/exportSchoolSummary";

import TeacherStatsView from "../components/TeacherStatsView";
import SchoolSummaryView from "../components/SchoolSummaryView";
import FileListCardBGH from "../components/FileListCardBGH";

import { useBGHStats } from "../contexts/BGHStatsContext";
import BghRequestManageDialog from "../dialogs/BghRequestManageDialog";
import MobileStatsSummaryDialog from "../dialogs/MobileStatsSummaryDialog";
import TeacherAdjustmentDialog from "../dialogs/TeacherAdjustmentDialog";

import PersonRounded from "@mui/icons-material/PersonRounded";
import BarChartRounded from "@mui/icons-material/BarChartRounded";

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

  const [activeTab, setActiveTab] = useState(0);      // 0: KHBD, 1: Đề KTĐK, 2: Biên bản
  const [selectedGrade, setSelectedGrade] = useState("1"); // Khối dùng chung cho Tab 1 & Tab 2
  const [subjectTab1, setSubjectTab1] = useState(""); // Môn học riêng cho Tab 1
  // 🌟 Xác định đúng lớp/khối và môn học tùy thuộc vào Tab đang hoạt động
  const currentClassForStats = (activeTab === 1 || activeTab === 2) ? selectedGrade : className;
  const currentSubjectForStats = activeTab === 1 ? subjectTab1 : (activeTab === 2 ? "" : subject);
  const [tab1AllowedSubjects, setTab1AllowedSubjects] = useState([]);

  const [openStatsDialog, setOpenStatsDialog] = useState(false);

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

  // 🌟 1. Tự động chọn môn học mặc định đầu tiên cho Tab 1 khi chuyển tab hoặc đổi Khối
  useEffect(() => {
    if (activeTab === 1) {
      const filteredSubs = allMonHoc.filter((sub) => {
        if (["1", "2", "3", "4", "5"].includes(String(selectedGrade))) {
          return !sub.grades || sub.grades.length === 0 || sub.grades.map(String).includes(String(selectedGrade));
        }
        return true;
      });

      const subNames = filteredSubs.map((sub) => (typeof sub === "object" ? sub.name : sub));
      if (subNames.length > 0 && (!subjectTab1 || !subNames.includes(subjectTab1))) {
        setSubjectTab1(subNames[0]);
      }
    }
  }, [activeTab, selectedGrade, allMonHoc]);

  // 🌟 2. Tự động gọi fetchFileList mỗi khi người dùng đổi Tab, đổi Khối, hoặc đổi Môn học
  useEffect(() => {
    if (isBGH && selectedUsername) {
      fetchFileList();
    }
  }, [activeTab, selectedGrade, subjectTab1, subject, className, selectedUsername, academicYear]);

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

  // 🌟 Cập nhật danh sách lớp và tự động chọn lớp mặc định khi đổi giáo viên ở Tab 0 (hoặc khi quay về Tab 0)
  useEffect(() => {
    if (!selectedUsername || !phanQuyenMap[selectedUsername]) return;

    const teacherInfo = phanQuyenMap[selectedUsername];
    const rawClasses = teacherInfo.teachingClasses || ["1"];

    setTeacherAllowedClasses(rawClasses);
    
    // Luôn đảm bảo `className` hợp lệ với giáo viên được chọn (đặc biệt khi ở Tab 0)
    if (rawClasses.length > 0) {
      if (!className || !rawClasses.includes(String(className))) {
        setClassName(String(rawClasses[0]));
      }
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

  // 🌟 1. Tự động chọn môn học mặc định đầu tiên cho Tab 1 khi chuyển tab hoặc đổi Khối
  useEffect(() => {
    if (activeTab === 1) {
      const filteredSubs = allMonHoc.filter((sub) => {
        if (["1", "2", "3", "4", "5"].includes(String(selectedGrade))) {
          return !sub.grades || sub.grades.length === 0 || sub.grades.map(String).includes(String(selectedGrade));
        }
        return true;
      });

      const subNames = filteredSubs.map((sub) => (typeof sub === "object" ? sub.name : sub));
      if (subNames.length > 0 && (!subjectTab1 || !subNames.includes(subjectTab1))) {
        setSubjectTab1(subNames[0]);
      }
    }
  }, [activeTab, selectedGrade, allMonHoc]);

  // 🌟 2. Tự động gọi fetchFileList mỗi khi người dùng đổi Tab, đổi Khối, hoặc đổi Môn học ở Tab 1
  useEffect(() => {
    if (isBGH && selectedUsername) {
      fetchFileList();
    }
  }, [activeTab, selectedGrade, subjectTab1, subject, className, selectedUsername, academicYear]);

  // Truy vấn danh sách file từ Firestore
  
  // 🌟 Hàm quét và đồng bộ danh sách file chuẩn theo cả 2 cấu trúc (Khối mới và Lớp cũ như 4.3)
  const fetchFileList = async () => {
    const targetClassOrGrade = (activeTab === 1 || activeTab === 2) ? selectedGrade : className;
    const currentSubject = activeTab === 1 ? subjectTab1 : subject;

    if (!selectedUsername || !targetClassOrGrade || (!currentSubject && activeTab !== 2) || !academicYear) {
      setFileList([]);
      setSelectedFile(null);
      setLoadingFiles(false);
      return false;
    }

    setLoadingFiles(true);

    try {
      const yearCol = `KEHOACH_DAYHOC_${academicYear}`;
      const teacherId = selectedUsername.trim().toUpperCase();
      const gradeKey = String(targetClassOrGrade).trim().split(".")[0].replace(/[^0-9]/g, "") || targetClassOrGrade;

      let filesRef;

      if (activeTab === 0) {
        // Tab 0 (KHBD)
        filesRef = collection(db, yearCol, teacherId, subject);

      } else {
        let docIdentifier = "Chung";
        const currentSelection = String(targetClassOrGrade).trim();
        
        if (currentSelection === "Tieng_Anh" || currentSelection.toLowerCase().includes("tiếng anh")) {
          docIdentifier = "Tieng_Anh";
        } else if (currentSelection === "Bo_mon" || currentSelection.toLowerCase().includes("bộ môn")) {
          docIdentifier = "Bo_mon";
        } else if (["1", "2", "3", "4", "5"].includes(String(gradeKey))) {
          docIdentifier = `Khối_${gradeKey}`;
        } else {
          docIdentifier = currentSelection;
        }

        docIdentifier = docIdentifier.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");

        if (activeTab === 1) {
          const mainColName = `DE_KTDK_${academicYear}`;
          const rawSubName = subjectTab1 || "";
          const subjectName = rawSubName
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, "_");
          
          filesRef = collection(db, mainColName, docIdentifier, subjectName);

        } else if (activeTab === 2) {
          const mainColName = `BIEN_BAN_${academicYear}`;
          filesRef = collection(db, mainColName, docIdentifier, "FILES_LIST");
        }
      }

      const teacherRef = doc(db, yearCol, teacherId);
      const teacherSnap = await getDoc(teacherRef);
      const teacherData = teacherSnap.exists() ? teacherSnap.data() : {};
      const notifications = teacherData.bghNotifications || [];

      const notificationMap = {};
      notifications.forEach((n) => {
        const fId = typeof n === "string" ? n : n.fileId;
        const fContent = typeof n === "string" ? "Yêu cầu từ BGH" : (n.content || "Yêu cầu từ BGH");
        const fRead = typeof n === "string" ? false : Boolean(n.read);
        if (fId) notificationMap[fId] = { content: fContent, read: fRead };
      });

      const snapshot = await getDocs(filesRef);
      const files = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const docId = docSnap.id;

        const notifInfo = notificationMap[docId];
        const hasNotification = Boolean(notifInfo);

        // 🌟 BỔ SUNG: Lọc chính xác theo lớp được chọn khi ở Tab 0 (Cá nhân)
        if (activeTab === 0) {
          const selectedClass = String(className).trim();
          const gradeKey = selectedClass.split(".")[0].replace(/[^0-9]/g, "") || selectedClass;

          const idMatch = docId.match(/^Khoi_(\d+)_/i);
          const khoiValue = String(data.khoi || data.className || data.lop || "").trim();
          const khoiMatch = khoiValue.match(/^(?:khối|khoi|lớp|lop)\s*(\d+)/i);
          const documentGrade = idMatch?.[1] || khoiMatch?.[1];

          const rawClassValue = String(data.className || data.lop || data.khoi || "").trim();
          const rawClassGrade = rawClassValue.split(".")[0].replace(/[^0-9]/g, "");

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
        } else {
          // Các tab khác lấy toàn bộ danh sách theo khối/tổ
          files.push({
            id: docId,
            ...data,
            bghRequest: hasNotification ? notifInfo.content : undefined,
            bghRequestRead: hasNotification ? notifInfo.read : undefined,
          });
        }
      });

      files.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });

      setFileList(files);
      setSelectedFile(false);
      return true;
    } catch (err) {
      console.error("Lỗi tải file theo tab:", err);
      setFileList([]);
      return false;
    } finally {
      setLoadingFiles(false);
    }
  };

  // Sắp xếp danh sách môn học theo thứ tự: Tổ bộ môn trước, GVCN sau
  // 🌟 Lấy danh sách môn học chuẩn xác theo đúng cấu hình phân bổ môn học của lớp/khối (giống hệt Tab 0)
  // 🌟 Lấy danh sách toàn bộ các môn học để hiển thị đầy đủ mọi cột cho tất cả các nhóm (GVCN, Tiếng Anh, Bộ môn)
  const getFilteredSubjectNames = () => {
    let allowedSubjects = new Set();
    
    // Quét toàn bộ danh sách từ MONHOC để đảm bảo không thiếu bất kỳ cột môn bộ môn nào
    allMonHoc.forEach(m => {
      const name = typeof m === "object" ? m.name : m;
      if (name) allowedSubjects.add(name);
    });

    // Quét thêm từ phân quyền giáo viên để gom đủ các môn đặc thù
    Object.values(phanQuyenMap).forEach((t) => {
      const subs = t.assignedSubjects || [];
      subs.forEach((s) => {
        if (s) allowedSubjects.add(s);
      });
    });

    let rawList = Array.from(allowedSubjects).filter((subName) => subName && !subName.toLowerCase().includes("tất cả"));

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

    // Thứ tự ưu tiên hiển thị các cột môn học từ trái sang phải
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

  // 🔹 Thống kê linh hoạt: Tab 0 theo Cá nhân giáo viên, Tab 1 theo Khối / Tổ CM
  // 🔹 Thống kê linh hoạt: Tab 0 theo Cá nhân giáo viên, Tab 1 theo Đề KTĐK, Tab 2 theo Biên bản
  useEffect(() => {
    const fetchStatsForBGH = async () => {
      if (!academicYear) return;

      setLoadingStats(true);
      const yearStr = academicYear;

      try {
        let stats = [];

        if (activeTab === 0) {
          // 📊 Tab 0: Thống kê KHBD cá nhân giáo viên
          if (!selectedUsername) {
            setStatsData([]);
            setLoadingStats(false);
            return;
          }

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
            fetchFileListFn: fetchFileList,
            setStatsData,
            setLoadingFiles,
            setLoadingStats,
            isCancelled,
          });
          return;

        } else if (activeTab === 1) {
          // 📋 Tab 1: Thống kê Đề KTĐK theo Khối / Tổ chuyên môn (selectedGrade)
          const statsMap = {};
          
          let docIdentifier = "Chung";
          const currentSelection = String(selectedGrade || "").trim();

          if (currentSelection === "Tieng_Anh" || currentSelection.toLowerCase().includes("tiếng anh")) {
            docIdentifier = "Tieng_Anh";
          } else if (currentSelection === "Bo_mon" || currentSelection.toLowerCase().includes("bộ môn")) {
            docIdentifier = "Bo_mon";
          } else if (["1", "2", "3", "4", "5"].includes(currentSelection)) {
            docIdentifier = `Khối_${currentSelection}`;
          } else {
            docIdentifier = currentSelection;
          }

          docIdentifier = docIdentifier.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");
          const mainColName = `DE_KTDK_${yearStr}`;

          const targetSubjects = filteredSubjectNames.length > 0 ? filteredSubjectNames : allMonHoc.map(m => m.name);

          for (const sub of targetSubjects) {
            try {
              const subjectName = sub.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");
              const subColRef = collection(db, mainColName, docIdentifier, subjectName);
              const subSnap = await getDocs(subColRef);

              let rowData = { subject: sub, total: 0 };

              subSnap.forEach((docSnap) => {
                const docId = docSnap.id;
                const data = docSnap.data();

                const idMatch = docId.match(/^LOP_(\d+)_/i) || docId.match(/^(\d+)_/i) || docId.match(/^Khoi_(\d+)_/i);
                const khoiVal = String(data.khoi || data.className || "").trim();
                const khoiMatch = khoiVal.match(/^(?:khối|khoi|lớp|lop)\s*(\d+)/i);
                const grade = idMatch?.[1] || khoiMatch?.[1] || String(selectedGrade).replace(/[^0-9]/g, "") || "1";

                rowData[grade] = (rowData[grade] || 0) + 1;
                rowData.total++;
              });

              if (rowData.total > 0) {
                statsMap[sub] = rowData;
              }
            } catch (subErr) {
              console.error(`Lỗi thống kê đề KTĐK môn ${sub}:`, subErr);
            }
          }

          stats = Object.values(statsMap);
          setStatsData(stats);

        } else if (activeTab === 2) {
          // 📋 Tab 2: Thống kê Biên bản theo Khối / Tổ chuyên môn (selectedGrade)
          const statsMap = {};

          let docIdentifier = "Chung";
          const currentSelection = String(selectedGrade || "").trim();

          if (currentSelection === "Tieng_Anh" || currentSelection.toLowerCase().includes("tiếng anh")) {
            docIdentifier = "Tieng_Anh";
          } else if (currentSelection === "Bo_mon" || currentSelection.toLowerCase().includes("bộ môn")) {
            docIdentifier = "Bo_mon";
          } else if (["1", "2", "3", "4", "5"].includes(currentSelection)) {
            docIdentifier = `Khối_${currentSelection}`;
          } else {
            docIdentifier = currentSelection;
          }

          docIdentifier = docIdentifier.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");
          const mainColName = `BIEN_BAN_${yearStr}`;

          try {
            // Đối với Biên bản, cấu trúc lưu trữ thường nằm trong collection con FILES_LIST hoặc trực tiếp theo nhóm
            const filesListRef = collection(db, mainColName, docIdentifier, "FILES_LIST");
            const filesSnap = await getDocs(filesListRef);

            // Gom nhóm thống kê Biên bản theo loại biên bản hoặc tên hiển thị tương ứng
            let rowData = { subject: "Biên bản sinh hoạt chuyên môn", total: 0 };

            filesSnap.forEach((docSnap) => {
              const data = docSnap.data();
              // Xác định khối hoặc lớp từ dữ liệu biên bản
              const khoiVal = String(data.khoi || data.grade || selectedGrade || "1").trim();
              const gradeMatch = khoiVal.match(/(\d+)/);
              const grade = gradeMatch ? gradeMatch[1] : String(selectedGrade).replace(/[^0-9]/g, "") || "1";

              rowData[grade] = (rowData[grade] || 0) + 1;
              rowData.total++;
            });

            if (rowData.total > 0) {
              statsMap["Biên bản"] = rowData;
            }
          } catch (bbErr) {
            console.error("Lỗi thống kê Biên bản:", bbErr);
          }

          stats = Object.values(statsMap);
          setStatsData(stats);
        } else {
          setStatsData([]);
        }
      } catch (error) {
        console.error("Lỗi khi thống kê BGH theo tab:", error);
        setStatsData([]);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStatsForBGH();
  }, [
    isBGH,
    selectedUsername,
    academicYear,
    subject,
    subjectTab1,
    className,
    selectedGrade,
    activeTab,
    phanQuyenMap,
    allMonHoc,
    isAdmin,
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

  // 🌟 1. Tự động chọn môn học mặc định đầu tiên cho Tab 1 khi chuyển tab hoặc đổi Khối
  useEffect(() => {
    if (activeTab === 1) {
      const filteredSubs = allMonHoc.filter((sub) => {
        if (["1", "2", "3", "4", "5"].includes(String(selectedGrade))) {
          return !sub.grades || sub.grades.length === 0 || sub.grades.map(String).includes(String(selectedGrade));
        }
        return true;
      });

      const subNames = filteredSubs.map((sub) => (typeof sub === "object" ? sub.name : sub));
      if (subNames.length > 0 && (!subjectTab1 || !subNames.includes(subjectTab1))) {
        setSubjectTab1(subNames[0]);
      }
    }
  }, [activeTab, selectedGrade, allMonHoc]);

  // 🌟 2. Tự động gọi fetchFileList mỗi khi người dùng đổi Tab, đổi Khối, hoặc đổi Môn học ở Tab 1
  useEffect(() => {
    if (isBGH && selectedUsername) {
      fetchFileList();
    }
  }, [activeTab, selectedGrade, subjectTab1, subject, className, selectedUsername, academicYear]);

  // Xác định tiêu đề hiển thị cho phần thống kê bên phải
  // 🌟 Xác định tiêu đề hiển thị linh hoạt theo đúng yêu cầu từng tab
  const getStatsTitleLabel = () => {
    if (activeTab === 0) {
      return `Tổng hợp: ${selectedUsername || ""}`;
    } else {
      // Tab 1 (Đề KTĐK) hoặc Tab 2 (Biên bản)
      let label = selectedGrade || "";
      const currentSelection = String(selectedGrade || "").trim();

      if (currentSelection === "Tieng_Anh" || currentSelection.toLowerCase().includes("tiếng anh")) {
        label = "Tiếng Anh";
      } else if (currentSelection === "Bo_mon" || currentSelection.toLowerCase().includes("bộ môn")) {
        label = "Bộ môn";
      } else if (["1", "2", "3", "4", "5"].includes(currentSelection)) {
        label = `Khối ${currentSelection}`;
      }

      // Có thể phân biệt hoặc dùng chung nhãn "Tổng hợp theo Khối / Tổ CM"
      return `Tổng hợp theo Khối / Tổ CM: ${label}`;
    }
  };

  // 🌟 Lấy chính xác danh sách môn học cho Tab 1 từ LOP_MONHOC theo số khối (1, 2, 3, 4, 5)
  useEffect(() => {
    const fetchSubjectsForTab1 = async () => {
      if (activeTab !== 1) return;

      let allowedSet = new Set();
      const currentSelection = String(selectedGrade || "").trim();
      
      // Chuyển đổi "Khối 1" hoặc "1" thành ID document chuẩn trên Firestore là "1", "2", "3", "4", "5"[cite: 3]
      const gradeId = currentSelection.replace(/[^0-9]/g, ""); 

      if (currentSelection.toLowerCase().includes("tiếng anh") || currentSelection === "Tieng_Anh") {
        // Lấy môn Tiếng Anh từ phân quyền giáo viên hoặc fallback
        const teachers = groupedTeachers.tiengAnh || [];
        teachers.forEach((tName) => {
          const tInfo = phanQuyenMap[tName];
          if (tInfo?.assignedSubjects) {
            tInfo.assignedSubjects.forEach((sub) => { if (sub) allowedSet.add(sub); });
          }
        });
        if (allowedSet.size === 0) {
          allMonHoc.forEach((m) => {
            const name = typeof m === "object" ? m.name : m;
            if (String(name).toLowerCase().includes("tiếng anh")) allowedSet.add(name);
          });
        }

      } else if (currentSelection.toLowerCase().includes("bộ môn") || currentSelection === "Bo_mon") {
        // Lấy chuẩn xác các môn chuyên biệt từ nhóm Bộ môn (groupedTeachers.boMon) giống Tab 0
        const teachers = groupedTeachers.boMon || [];
        teachers.forEach((tName) => {
          const tInfo = phanQuyenMap[tName];
          if (tInfo) {
            if (tInfo.assignedSubjects && Array.isArray(tInfo.assignedSubjects)) {
              tInfo.assignedSubjects.forEach((sub) => { if (sub) allowedSet.add(sub); });
            }
            if (tInfo.subjectsByClass && typeof tInfo.subjectsByClass === "object") {
              Object.values(tInfo.subjectsByClass).forEach((subs) => {
                if (Array.isArray(subs)) subs.forEach((sub) => { if (sub) allowedSet.add(sub); });
              });
            }
          }
        });

        // Fallback dự phòng nếu chưa có phân quyền, lọc các môn chuyên biệt phổ biến
        if (allowedSet.size === 0 && allMonHoc.length > 0) {
          allMonHoc.forEach((m) => {
            const name = typeof m === "object" ? m.name : m;
            const lower = String(name).toLowerCase();
            if (
              lower.includes("tin") || 
              lower.includes("công nghệ") || 
              lower.includes("nhạc") || 
              lower.includes("mĩ thuật") || 
              lower.includes("mỹ thuật") || 
              lower.includes("thể chất") ||
              lower.includes("giáo dục thể chất")
            ) {
              allowedSet.add(name);
            }
          });
        }

      } else if (gradeId && ["1", "2", "3", "4", "5"].includes(gradeId)) {
        try {
          // Truy vấn trực tiếp document theo ID số khối (VD: "1", lấy mảng subjects từ LOP_MONHOC/1)[cite: 3]
          const docRef = doc(db, "LOP_MONHOC", gradeId);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            const subjectsArray = data.subjects || []; // Lấy mảng subjects[cite: 3]
            subjectsArray.forEach((sub) => {
              if (sub) allowedSet.add(sub);
            });
          }
        } catch (err) {
          console.error("❌ Lỗi khi tải môn học từ LOP_MONHOC:", err);
        }
      }

      let subList = Array.from(allowedSet).filter(
        (sub) => sub && !String(sub).toLowerCase().includes("tất cả")
      );
      
      // 🌟 Sắp xếp danh sách môn học theo thứ tự bảng chữ cái tiếng Việt (ABC)
      subList.sort((a, b) => {
        const nameA = String(a).trim();
        const nameB = String(b).trim();
        return nameA.localeCompare(nameB, "vi", { sensitivity: "accent" });
      });

      setTab1AllowedSubjects(subList);

      // Tự động chọn môn đầu tiên nếu chưa có hoặc môn hiện tại không nằm trong danh sách
      if (subList.length > 0 && (!subjectTab1 || !subList.includes(subjectTab1))) {
        setSubjectTab1(subList[0]);
      }
    };

    fetchSubjectsForTab1();
  }, [activeTab, selectedGrade, allMonHoc, groupedTeachers, phanQuyenMap]);
  
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
              {/* 👉 TIÊU ĐỀ VÀ 2 ICON THAO TÁC CÙNG MỘT HÀNG TRÊN CẢ MOBILE VÀ DESKTOP */}
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0 }}>
                <Typography variant="h6" color="primary" sx={{ mb: 0, fontWeight: "bold", fontSize: { xs: "1rem", sm: "1.25rem" } }}>
                  📚 QUẢN LÝ CHUYÊN MÔN
                </Typography>

                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                  {/* 👤 Icon Cá nhân (Hiển thị trên cả điện thoại và máy tính) */}
                  <Tooltip title="Thống kê cá nhân">
                    <IconButton
                      onClick={() => setViewMode("personal")}
                      sx={{
                        bgcolor: viewMode === "personal" ? "#1976d2" : "#f8fafc",
                        color: viewMode === "personal" ? "#ffffff" : "#475569",
                        border: "1px solid #cbd5e1",
                        height: 32,
                        width: 32,
                        "&:hover": { bgcolor: viewMode === "personal" ? "#115293" : "#f1f5f9" }
                      }}
                    >
                      <PersonRounded fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  {/* 📊 Icon Tổng hợp toàn trường (Hiển thị trên cả điện thoại và máy tính) */}
                  <Tooltip title="Tổng hợp toàn trường">
                    <IconButton
                      onClick={() => {
                        setViewMode("summary");
                        if (Object.keys(schoolSummaryGrouped).length === 0) {
                          fetchSchoolSummary();
                        }
                      }}
                      sx={{
                        bgcolor: viewMode === "summary" ? "#1976d2" : "#f8fafc",
                        color: viewMode === "summary" ? "#ffffff" : "#475569",
                        border: "1px solid #cbd5e1",
                        height: 32,
                        width: 32,
                        "&:hover": { bgcolor: viewMode === "summary" ? "#115293" : "#f1f5f9" }
                      }}
                    >
                      <BarChartRounded fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              {/* 🌟 THANH 3 TABS: KHBD, Đề KTĐK, Biên bản */}
              <Tabs
                value={activeTab}
                onChange={(e, newValue) => {
                  setActiveTab(newValue);
                  // Khi chuyển sang tab Đề KTĐK (1) hoặc Biên bản (2), mặc định đặt Khối là "1"
                  if (newValue === 1 || newValue === 2) {
                    setClassName("1");
                  }
                }}
                variant="fullWidth"
                sx={{
                  minHeight: 42,
                  bgcolor: "transparent",
                  borderBottom: "2px solid #e2e8f0",
                  "& .MuiTabs-indicator": {
                    height: 3,
                    borderRadius: "3px 3px 0 0",
                    backgroundColor: "#1976d2",
                  },
                  "& .MuiTab-root": {
                    minHeight: 40,
                    fontWeight: 600,
                    fontSize: "13.5px",
                    textTransform: "none",
                    color: "#64748b",
                    mx: 0.5,
                    padding: "4px 0",
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
                <Tab label="📚 KHBD" />
                <Tab label="📋 Đề KTĐK" />
                <Tab label="📝 Biên bản" />
              </Tabs>

              {/* 🌟 CHỈ HIỂN THỊ CÁC NÚT TỔNG HỢP VÀ BỘ LỌC CÁ NHÂN Ở TAB KHBD (activeTab === 0) */}
              {activeTab === 0 && (
                <>
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
                </>
              )}

              {/* 📋 TAB 1: ĐỀ KTĐK -> Sử dụng subjectTab1 độc lập */}
              {/* 📋 TAB 1: ĐỀ KTĐK -> Sử dụng subjectTab1 độc lập */}
              {activeTab === 1 && (
                <Box sx={{ display: "flex", gap: 1.5, mt: 0.5 }}>
                  <FormControl size="small" sx={{ flex: 1 }}>
                    <InputLabel>Khối / Tổ CM</InputLabel>
                    <Select
                      value={selectedGrade}
                      label="Khối / Tổ CM"
                      onChange={(e) => setSelectedGrade(e.target.value)}
                    >
                      {["1", "2", "3", "4", "5", "Bo_mon", "Tieng_Anh"].map((item) => (
                        <MenuItem key={item} value={item}>
                          {item === "Bo_mon" ? "Bộ môn" : item === "Tieng_Anh" ? "Tiếng Anh" : `Khối ${item}`}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl size="small" sx={{ flex: 1 }}>
                    <InputLabel>Môn học</InputLabel>
                    <Select 
                      value={subjectTab1} 
                      label="Môn học" 
                      onChange={(e) => setSubjectTab1(e.target.value)}
                    >
                      {/* 🌟 THAY ĐỔI TỪ ĐÂY: Dùng tab1AllowedSubjects lấy từ LOP_MONHOC */}
                      {(!tab1AllowedSubjects || tab1AllowedSubjects.length === 0) ? (
                        <MenuItem disabled value=""><em>Không có môn học</em></MenuItem>
                      ) : (
                        tab1AllowedSubjects.map((subName) => (
                          <MenuItem key={subName} value={subName}>
                            {subName}
                          </MenuItem>
                        ))
                      )}
                    </Select>
                  </FormControl>
                </Box>
              )}

              {/* 📝 TAB 2: BIÊN BẢN -> Đồng bộ chọn Khối / Tổ CM với Tab 1 */}
              {activeTab === 2 && (
                <Box sx={{ mt: 0.5 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Khối / Tổ CM</InputLabel>
                    <Select
                      value={selectedGrade}
                      label="Khối / Tổ CM"
                      onChange={(e) => setSelectedGrade(e.target.value)}
                    >
                      {["1", "2", "3", "4", "5", "Bo_mon", "Tieng_Anh"].map((item) => (
                        <MenuItem key={item} value={item}>
                          {item === "Bo_mon" ? "Bộ môn" : item === "Tieng_Anh" ? "Tiếng Anh" : `Khối ${item}`}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              )}

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
              setBghRequestText(file.bghRequest || ""); 
              setBghRequestOpen(true); 
            }}
            onViewAdjusted={handleViewAdjustedFile} 
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
              title={getStatsTitleLabel()} // 👈 Truyền thẳng chuỗi tiêu đề đã xử lý vào đây
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