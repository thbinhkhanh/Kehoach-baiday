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
  Dialog,
  DialogContent,
  IconButton,
  ListSubheader,
} from "@mui/material";

import { db } from "../firebase";
import { collection, getDocs, doc, getDoc, query, where } from "firebase/firestore";
import { fetchSchoolSummaryData, fetchTeacherStatsData } from "../utils/thongKe";
import TeacherStatsView from "../components/TeacherStatsView";
import SchoolSummaryView from "../components/SchoolSummaryView";
import FileListCardBGH from "../components/FileListCardBGH";
import CloseIcon from "@mui/icons-material/Close";

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
  const [loadingStats, setLoadingStats] = useState(false);

  // State cho chế độ Tổng hợp toàn trường
  const [viewMode, setViewMode] = useState("single"); // "single" hoặc "summary"
  const [loadingSchoolSummary, setLoadingSchoolSummary] = useState(false);
  const [schoolSummaryGrouped, setSchoolSummaryGrouped] = useState({});

  // State bật/tắt chế độ toàn màn hình cho phần hiển thị bên phải
  const [isFullScreen, setIsFullScreen] = useState(false);

  const [academicYear, setAcademicYear] = useState("2026-2027");
  const [subject, setSubject] = useState("");
  const [className, setClassName] = useState("");

  const [teacherAllowedSubjects, setTeacherAllowedSubjects] = useState([]);
  const [teacherAllowedClasses, setTeacherAllowedClasses] = useState([]);

  const [allMonHoc, setAllMonHoc] = useState([]);
  const [lopMonHocMap, setLopMonHocMap] = useState({}); 
  const [filterCategory, setFilterCategory] = useState("gvcn");

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

  const [statsData, setStatsData] = useState([]);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const lowerUsername = user?.username?.toLowerCase() || "";
  const isBGH =
    lowerUsername === "bgh" ||
    lowerUsername.includes("chuyên môn") ||
    user?.role === "bgh";
  const isAdmin = isBGH;

  // 1. Lấy CONFIG & MONHOC
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

  // 2. Phân quyền giáo viên
  // 2. Phân quyền giáo viên
  useEffect(() => {
      const fetchPhanQuyen = async () => {
        try {
          const phanQuyenColName = `PHANQUYEN_${academicYear}`;
          const querySnapshot = await getDocs(collection(db, phanQuyenColName));
 
          const groups = {
            khoi1: [],
            khoi2: [],
            khoi3: [],
            khoi4: [],
            khoi5: [],
            tiengAnh: [],
            boMon: [],
          };
          const map = {};
          let firstAvailableTeacher = "";
 
          querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const name = data.username || docSnap.id;
            const lowerName = name.toLowerCase();
 
            if (
              lowerName !== "admin" &&
              lowerName !== "bgh" &&
              !lowerName.includes("ban giám hiệu") &&
              !lowerName.includes("thbinhkhanh")
            ) {
              const upperName = name.toUpperCase();
 
              let subs = [];
              if (
                Array.isArray(data.assignedSubjects) &&
                data.assignedSubjects.length > 0
              ) {
                subs = data.assignedSubjects;
              } else if (data.assignedSubject) {
                subs = data.assignedSubject
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean);
              }
 
              let cls = [];
              if (data.assignedClass) {
                cls = [String(data.assignedClass)];
              } else if (
                Array.isArray(data.teachingClasses) &&
                data.teachingClasses.length > 0
              ) {
                cls = data.teachingClasses.map(String);
              } else {
                cls = ["1", "2", "3", "4", "5"];
              }
 
              const teacherObj = {
                username: upperName,
                role: data.role || "GVCN",
                assignedSubjects: subs,
                teachingClasses: cls,
                grade: data.grade || "", // Đọc thêm trường grade từ Firestore
              };
 
              map[upperName] = teacherObj;
 
              const role = teacherObj.role;
              const subString = subs.join(" ").toLowerCase();
 
              if (role === "TA" || subString.includes("tiếng anh")) {
                groups.tiengAnh.push(upperName);
              } else if (
                role === "BM" ||
                subString.includes("tin học") ||
                subString.includes("mĩ thuật") ||
                subString.includes("mỹ thuật") ||
                subString.includes("âm nhạc") ||
                subString.includes("thể dục")
              ) {
                groups.boMon.push(upperName);
              } else {
                // Xác định chính xác khối dựa vào field grade hoặc ký tự đầu tiên của lớp (VD: "5.4" -> "5")
                const gradeVal = teacherObj.grade || String(cls[0] || "").charAt(0);
 
                if (gradeVal === "1") groups.khoi1.push(upperName);
                else if (gradeVal === "2") groups.khoi2.push(upperName);
                else if (gradeVal === "3") groups.khoi3.push(upperName);
                else if (gradeVal === "4") groups.khoi4.push(upperName);
                else if (gradeVal === "5") groups.khoi5.push(upperName);
                else {
                  groups.boMon.push(upperName);
                }
              }
            }
          });
 
          const sortByName = (arr) => {
            return arr.sort((a, b) => {
              const getLastName = (fullName) =>
                fullName?.trim().split(" ").slice(-1)[0]?.toLowerCase() || "";
              return getLastName(a).localeCompare(getLastName(b), "vi");
            });
          };
 
          Object.keys(groups).forEach((key) => {
            sortByName(groups[key]);
          });
 
          setGroupedTeachers(groups);
          setPhanQuyenMap(map);
 
          for (const key of Object.keys(groups)) {
            if (groups[key].length > 0) {
              firstAvailableTeacher = groups[key][0];
              break;
            }
          }
 
          if (firstAvailableTeacher && !selectedUsername) {
            setSelectedUsername(firstAvailableTeacher);
          }
        } catch (err) {
          console.error("❌ Lỗi khi tải dữ liệu phân quyền:", err);
        }
      };
 
      if (isBGH) {
        fetchPhanQuyen();
      }
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
  useEffect(() => {
    if (
      !selectedUsername ||
      !phanQuyenMap[selectedUsername] ||
      !className ||
      allMonHoc.length === 0
    )
      return;

    const teacherInfo = phanQuyenMap[selectedUsername];
    const rawSubs = teacherInfo.assignedSubjects || [];
    const teacherRole = teacherInfo.role || "GVCN";

    // Lấy khối từ mã lớp đầy đủ, ví dụ 5.4 -> 5
    const gradeFromClass = String(className).split(".")[0].trim();

    let finalSubjects = [];

    if (teacherRole === "TA") {
      const taSub = allMonHoc.find((s) => s.name.toLowerCase().includes("tiếng anh"));
      if (taSub) {
        if (!taSub.grades || taSub.grades.length === 0 || taSub.grades.includes(String(className))) {
          finalSubjects = [taSub.name];
        }
      }
      if (finalSubjects.length === 0) finalSubjects = ["Tiếng Anh"];
    } else if (teacherRole === "BM") {
      const filtered = allMonHoc
        .filter((sub) => {
          const matchesAssigned = rawSubs.some(
            (as) => as.toLowerCase().trim() === sub.name.toLowerCase().trim()
          );
          if (!matchesAssigned) return false;
          if (!sub.grades || sub.grades.length === 0) return true;
          return sub.grades.includes(String(className));
        })
        .map((sub) => sub.name);

      finalSubjects = filtered.length > 0 ? filtered : rawSubs;
    } else if (teacherRole === "GVCN") {
      const gradeFromClass = String(className).split(".")[0];
      const subjectsForClass = lopMonHocMap[String(className)] || lopMonHocMap[gradeFromClass];

      if (Array.isArray(subjectsForClass) && subjectsForClass.length > 0) {
        const hasSpecificAssigned =
          rawSubs.length > 0 &&
          !rawSubs.some((sub) => sub.toLowerCase().includes("tất cả"));

        if (hasSpecificAssigned) {
          finalSubjects = subjectsForClass.filter((subName) =>
            rawSubs.some((as) => as.toLowerCase() === subName.toLowerCase())
          );
        } else {
          const specialistKeywords = ["tiếng anh", "tin học"];
          finalSubjects = subjectsForClass.filter(
            (subName) =>
              !specialistKeywords.some((kw) => subName.toLowerCase().includes(kw))
          );
        }
      } else {
        const hasSpecificAssigned =
          rawSubs.length > 0 &&
          !rawSubs.some((sub) => sub.toLowerCase().includes("tất cả"));

        finalSubjects = allMonHoc
          .filter((sub) => {
            const subLower = sub.name.toLowerCase();
            if (hasSpecificAssigned) {
              const matchesAssigned = rawSubs.some((as) => as.toLowerCase() === subLower);
              if (!matchesAssigned) return false;
            } else {
              const strictSpecialistKeywords = ["tiếng anh", "tin học"];
              const isStrictSpecialist = strictSpecialistKeywords.some((kw) =>
                subLower.includes(kw)
              );
              if (isStrictSpecialist) return false;
            }

            if (!sub.grades || sub.grades.length === 0) return true;
            return (
              sub.grades.map(String).includes(gradeFromClass) ||
              sub.grades.map(String).includes(String(className))
            );
          })
          .map((sub) => sub.name);
      }
    } else {
      finalSubjects = allMonHoc.map((sub) => sub.name);
    }

    setTeacherAllowedSubjects(finalSubjects);

    if (finalSubjects.length > 0 && !finalSubjects.includes(subject)) {
      setSubject(finalSubjects[0]);
    } else if (finalSubjects.length === 0) {
      setSubject("");
    }
  }, [selectedUsername, className, phanQuyenMap, allMonHoc, lopMonHocMap]);

  // Truy vấn danh sách file từ Firestore
  
  const fetchFileList = async () => {
    if (!selectedUsername || !className || !subject || !academicYear) {
      setFileList([]);
      setSelectedFile(null);
      return;
    }

    setLoadingFiles(true);

    try {
      const yearCol = `KEHOACH_DAYHOC_${academicYear}`;

      const filesRef = collection(
        db,
        yearCol,
        selectedUsername,
        subject
      );

      const selectedClass = String(className).trim();
      const selectedGrade = selectedClass.split(".")[0];

      const snapshot = await getDocs(filesRef);
      const files = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const docId = docSnap.id;

        // Trường hợp mới: Khoi_5.8_...
        const escapedClass = selectedClass.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );

        const exactClassPattern = new RegExp(
          `^Khoi_${escapedClass}_`,
          "i"
        );

        const idMatchesExactClass = exactClassPattern.test(docId);

        // Trường hợp cũ: Khoi_5_...
        const oldIdMatch = docId.match(/^Khoi_(\d+)_/i);

        const idMatchesOldGrade =
          oldIdMatch !== null &&
          oldIdMatch[1] === selectedGrade;

        // Dự phòng: lấy thông tin lớp từ dữ liệu tài liệu.
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

        const dataMatchesClass = classValues.some(
          (value) => value === selectedClass
        );

        const dataMatchesGrade = classValues.some(
          (value) => value === selectedGrade
        );

        // Chấp nhận cả ID lớp đầy đủ và ID dữ liệu cũ theo khối.
        const isMatch =
          idMatchesExactClass ||
          idMatchesOldGrade ||
          dataMatchesClass ||
          dataMatchesGrade;

        if (isMatch) {
          files.push({
            id: docId,
            ...data,
          });
        }
      });

      // Sắp xếp file mới nhất lên đầu.
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
      setSelectedFile(null);

      /*console.log("Danh sách file BGH:", {
        teacher: selectedUsername,
        subject,
        selectedClass,
        selectedGrade,
        totalInCollection: snapshot.size,
        matchedFiles: files.length,
        files: files.map((file) => file.id),
      });*/
    } catch (err) {
      console.error("Lỗi khi tải danh sách file:", err);
      setFileList([]);
      setSelectedFile(null);
    } finally {
      setLoadingFiles(false);
    }
  };


  useEffect(() => {
    fetchFileList();
  }, [subject, className, selectedUsername, academicYear]);

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

  // 🔹 THỐNG KÊ BÀI NỘP TOÀN TRƯỜNG PHÂN THEO CÁC NHÓM/TỔ
  const fetchSchoolSummary = async () => {
    await fetchSchoolSummaryData({
      isAdmin,
      phanQuyenMap,
      allMonHoc,
      academicYear,
      groupedTeachers,
      filteredSubjectNames,
      setLoadingSchoolSummary,
      setSchoolSummaryGrouped,
    });
  };

  const handleStats = async () => {
    return await fetchTeacherStatsData({
      isAdmin,
      selectedUsername,
      academicYear,
      phanQuyenMap,
      allMonHoc, // 👈 Bổ sung thêm dòng này
      setLoadingStats,
      setStatsData,
    });
  };

  useEffect(() => {
    if (isBGH && selectedUsername && Object.keys(phanQuyenMap).length > 0) {
      handleStats();
    }
  }, [isBGH, academicYear, phanQuyenMap, selectedUsername]);

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
                📚 QUẢN LÍ KẾ HOẠCH BÀI DẠY
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
          />
        </Box>
      )}

      {/* 📱 DIALOG HIỂN THỊ BẢNG NỔI TRÊN ĐIỆN THOẠI KHI BẤM NÚT CÁ NHÂN HOẶC TOÀN TRƯỜNG */}
      <Dialog
        open={isMobile && (viewMode === "summary" || viewMode === "personal")}
        onClose={() => setViewMode("single")}
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
            {viewMode === "summary" 
              ? `📊 Bảng tổng hợp toàn trường` 
              : `📊 Thống kê KHBD`}
          </Typography>
          <IconButton onClick={() => setViewMode("single")}>
            <CloseIcon />
          </IconButton>
        </Box>
        <DialogContent sx={{ p: 1, overflowY: "auto" }}>
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
          ) : (
            <TeacherStatsView
              selectedUsername={selectedUsername}
              statsData={statsData}
              teacherAllowedSubjects={teacherAllowedSubjects}
              teacherAllowedClasses={teacherAllowedClasses}
              loadingStats={loadingStats}
              academicYear={academicYear}
            />
          )}
        </DialogContent>
      </Dialog>

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
    </Box>
  );
}