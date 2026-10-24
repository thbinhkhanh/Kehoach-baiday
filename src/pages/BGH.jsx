import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { db } from "../firebase";
import { collection, getDocs, doc, getDoc, query, where } from "firebase/firestore";
import { fetchSchoolSummaryData, fetchTeacherStatsData } from "../utils/thongKe";
import TeacherStatsView from "../components/TeacherStatsView";
import SchoolSummaryView from "../components/SchoolSummaryView";
import FileListCardBGH from "../components/FileListCardBGH";
import { IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

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

  const [academicYear, setAcademicYear] = useState("2026-2027");
  const [subject, setSubject] = useState("");
  const [className, setClassName] = useState("");

  const [teacherAllowedSubjects, setTeacherAllowedSubjects] = useState([]);
  const [teacherAllowedClasses, setTeacherAllowedClasses] = useState([]);

  const [allMonHoc, setAllMonHoc] = useState([]);
  const [filterCategory, setFilterCategory] = useState("all");

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
      } catch (err) {
        console.error("❌ Lỗi khi tải CONFIG / MONHOC:", err);
      }
    };

    if (isBGH) {
      fetchConfigAndMonHoc();
    }
  }, [isBGH]);

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
              const firstCls = String(cls[0] || "");
              if (firstCls.includes("1")) groups.khoi1.push(upperName);
              else if (firstCls.includes("2")) groups.khoi2.push(upperName);
              else if (firstCls.includes("3")) groups.khoi3.push(upperName);
              else if (firstCls.includes("4")) groups.khoi4.push(upperName);
              else if (firstCls.includes("5")) groups.khoi5.push(upperName);
              else groups.boMon.push(upperName);
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
    const isAllGVCN = rawSubs.some((s) => s.toLowerCase().includes("tất cả"));

    const subjectsForClass = allMonHoc.filter((sub) => {
      if (!sub.grades || sub.grades.length === 0) return true;
      return sub.grades.map(String).includes(String(className));
    });

    let finalSubjects = [];

    if (teacherInfo.role === "TA") {
      finalSubjects = subjectsForClass
        .filter((sub) => sub.name.toLowerCase().includes("tiếng anh"))
        .map((sub) => sub.name);
      if (finalSubjects.length === 0) finalSubjects = ["Tiếng Anh"];
    } else if (isAllGVCN || rawSubs.length === 0) {
      const specialistKeywords = ["tiếng anh", "tin học"];
      finalSubjects = subjectsForClass
        .filter(
          (sub) =>
            !specialistKeywords.some((kw) => sub.name.toLowerCase().includes(kw))
        )
        .map((sub) => sub.name);
    } else {
      finalSubjects = subjectsForClass
        .filter((sub) =>
          rawSubs.some((as) => as.toLowerCase() === sub.name.toLowerCase())
        )
        .map((sub) => sub.name);

      if (finalSubjects.length === 0) {
        finalSubjects = rawSubs;
      }
    }

    setTeacherAllowedSubjects(finalSubjects);

    if (finalSubjects.length > 0 && !finalSubjects.includes(subject)) {
      setSubject(finalSubjects[0]);
    } else if (finalSubjects.length === 0) {
      setSubject("");
    }
  }, [selectedUsername, className, phanQuyenMap, allMonHoc]);

  // Truy vấn danh sách file từ Firestore
  const fetchFileList = async () => {
    if (!selectedUsername || !className || !subject) {
      setFileList([]);
      return;
    }

    setLoadingFiles(true);
    try {
      const yearCol = `KEHOACH_DAYHOC_${academicYear}`;
      const filesRef = collection(db, yearCol, selectedUsername, subject);
      
      const q = query(filesRef, where("khoi", "==", `Khối ${className}`));
      const querySnapshot = await getDocs(q);

      const files = [];
      querySnapshot.forEach((docSnap) => {
        files.push({ id: docSnap.id, ...docSnap.data() });
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
      setSelectedFile(null);
    } catch (err) {
      console.error("❌ Lỗi khi tải danh sách file:", err);
      setFileList([]);
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

  return (
    <Box
      sx={{
        height: "calc(100vh - 64px)",
        width: "100vw",
        display: "flex",
        gap: 1.5,
        px: 1.5,
        pb: 1.5,
        mt:2, 
        alignItems: "stretch",
        flexDirection: { xs: "column", sm: "row" },
        boxSizing: "border-box",
      }}
    >
      {/* Cột trái: Bộ lọc + Danh sách file */}
      <Box
        sx={{
          width: { xs: "100%", sm: "32%" },
          minWidth: 280,
          // 📱 Trên điện thoại: Ẩn cột trái nếu đang ở chế độ Tổng hợp cá nhân hoặc Tổng hợp toàn trường
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

            {/* Nút Tổng hợp toàn trường */}
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
                👤 Tổng hợp cá nhân
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
                📊 Tổng hợp toàn trường
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
                value={selectedUsername}
                label="👤 Chọn Giáo viên"
                onChange={(e) => {
                  setSelectedUsername(e.target.value);
                  setViewMode("single");
                }}
              >
                {currentTeacherList.length === 0 ? (
                  <MenuItem disabled value="">
                    <em>Không có giáo viên trong nhóm này</em>
                  </MenuItem>
                ) : (
                  currentTeacherList.map((name) => (
                    <MenuItem key={name} value={name}>
                      {name}
                    </MenuItem>
                  ))
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
                    teacherAllowedClasses.map((clsNum) => (
                      <MenuItem key={clsNum} value={clsNum}>
                        Lớp {clsNum}
                      </MenuItem>
                    ))
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

      {/* Cột phải: Bảng tổng hợp toàn trường theo nhóm / Xem trước file / Thống kê cá nhân */}
      {/* Cột phải: Bảng tổng hợp toàn trường / Thống kê cá nhân / Xem trước file */}
      {/* Cột phải: Bảng tổng hợp / Thống kê cá nhân / Xem trước file */}
      <Card
        sx={{
          flex: 1,
          height: "100%",
          display: {
            xs: viewMode === "summary" || viewMode === "personal" || selectedFile?.fileId ? "flex" : "none",
            sm: "flex",
          },
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <CardContent sx={{ height: "100%", p: 0, boxSizing: "border-box", display: "flex", flexDirection: "column", position: "relative" }}>
         
         {/* 📱 NÚT THOÁT (X) TRÊN ĐIỆN THOẠI KHI XEM THỐNG KÊ CÁ NHÂN HOẶC TỔNG HỢP TOÀN TRƯỜNG */}
         {isMobile && (viewMode === "summary" || viewMode === "personal") && (
          <Box 
            sx={{ 
              p: 1, 
              px: 2,
              bgcolor: "#f1f5f9", 
              borderBottom: "1px solid #e2e8f0", 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center",
              flexShrink: 0 
            }}
          >
            <Typography variant="subtitle1" fontWeight="bold" color="primary" sx={{ fontSize: "0.95rem" }}>
              {viewMode === "summary" 
                ? `📊 BẢNG TỔNG HỢP TOÀN TRƯỜNG(${academicYear})` 
                : "👤 BẢNG TỔNG HỢP CÁ NHÂN"}
            </Typography>
            
            <IconButton 
              size="small" 
              onClick={() => setViewMode("single")}
              sx={{ 
                bgcolor: "#e2e8f0", 
                color: "#475569",
                "&:hover": { bgcolor: "#cbd5e1" } 
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        )}

         {viewMode === "summary" ? (
           <SchoolSummaryView
             academicYear={academicYear}
             loadingSchoolSummary={loadingSchoolSummary}
             schoolSummaryGrouped={schoolSummaryGrouped}
             filteredSubjectNames={filteredSubjectNames}
             fetchSchoolSummary={fetchSchoolSummary}
             setViewMode={setViewMode}
             getShortSubjectName={getShortSubjectName}
             setSelectedUsername={setSelectedUsername}
             setSelectedFile={setSelectedFile}
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