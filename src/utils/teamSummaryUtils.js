import { collection, getDocs } from "firebase/firestore";

/**
 * Chuẩn hóa chuỗi (bỏ dấu, chuyển chữ hoa, chuẩn hóa khoảng trắng)
 */
const normalizeKey = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();

/**
 * Lấy và tổng hợp dữ liệu thống kê giáo viên theo tổ/khối
 * 
 * @param {Object} params
 * @param {Array} params.toTeachers - Danh sách giáo viên trong tổ/khối
 * @param {string} params.academicYear - Năm học hiện tại
 * @param {Object} params.db - Firestore instance
 * @returns {Promise<Object>} Trả về đối tượng dữ liệu đã phân nhóm (groupedSummary)
 */
export const fetchTeamSummaryData = async ({ toTeachers, academicYear, db }) => {
  // 1. Kiểm tra danh sách giáo viên
  if (!Array.isArray(toTeachers) || toTeachers.length === 0) {
    throw new Error("Không tìm thấy danh sách giáo viên trong tổ/khối.");
  }

  // 2. Đọc đúng collection thống kê
  const collectionName = `THONGKE_${academicYear}`;

  console.log("📁 Collection:", collectionName);
  console.log("👥 Danh sách giáo viên:", toTeachers);

  const snapshot = await getDocs(collection(db, collectionName));

  console.log("📊 Số tài liệu thống kê:", snapshot.size);

  // 3. Tạo Map tra cứu theo mã GV, tên GV và ID tài liệu
  const thongKeMap = new Map();

  snapshot.forEach((docSnap) => {
    const data = docSnap.data() || {};

    const record = {
      ...data,
      documentId: docSnap.id,
    };

    const keys = [
      docSnap.id,
      data.teacherId,
      data.teacherName,
    ];

    keys.forEach((key) => {
      const normalized = normalizeKey(key);

      if (normalized) {
        thongKeMap.set(normalized, record);
      }
    });
  });

  console.log("🔑 Các khóa thống kê:", [...thongKeMap.keys()]);

  // 4. Đọc thông tin từng giáo viên trong danh sách tổ/khối
  const teamList = toTeachers.map((teacher) => {
    // Hỗ trợ cả danh sách dạng chuỗi và dạng object
    const teacherNameItem =
      typeof teacher === "string"
        ? teacher.trim()
        : String(
            teacher?.teacherName ||
              teacher?.username ||
              teacher?.name ||
              teacher?.teacherId ||
              ""
          ).trim();

    const teacherIdItem =
      typeof teacher === "object" && teacher
        ? String(teacher.teacherId || teacher.username || "").trim()
        : "";

    // Tìm theo mã giáo viên trước, sau đó theo tên
    const data =
      thongKeMap.get(normalizeKey(teacherIdItem)) ||
      thongKeMap.get(normalizeKey(teacherNameItem));

    if (!data) {
      console.warn("⚠️ Không tìm thấy dữ liệu thống kê:", {
        teacherNameItem,
        teacherIdItem,
      });

      return {
        teacherId: teacherIdItem || normalizeKey(teacherNameItem),
        teacherName: teacherNameItem,
        group:
          typeof teacher === "object" && teacher
            ? teacher.group || ""
            : "",
        class:
          typeof teacher === "object" && teacher
            ? teacher.class || ""
            : "",
        totalFiles: 0,
        subjects: {},
        classBreakdown: {},
        recentFiles: [],
        hasStatistics: false,
      };
    }

    // Đọc subjects
    const rawSubjects =
      data.subjects && typeof data.subjects === "object"
        ? data.subjects
        : {};

    const formattedSubjects = {};

    Object.entries(rawSubjects).forEach(([subjectName, count]) => {
      formattedSubjects[subjectName] = Number(count) || 0;
    });

    // Đọc classBreakdown
    const rawBreakdown =
      data.classBreakdown && typeof data.classBreakdown === "object"
        ? data.classBreakdown
        : {};

    const formattedBreakdown = {};

    Object.entries(rawBreakdown).forEach(([subjectName, gradeMap]) => {
      formattedBreakdown[subjectName] = {};

      if (
        !gradeMap ||
        typeof gradeMap !== "object" ||
        Array.isArray(gradeMap)
      ) {
        return;
      }

      Object.entries(gradeMap).forEach(([gradeName, count]) => {
        const value = Number(count) || 0;

        // Giữ nguyên tên khối trong Firestore
        formattedBreakdown[subjectName][gradeName] = value;

        // Bổ sung khóa số để tương thích giao diện cũ
        const match = String(gradeName).match(/[1-5]/);

        if (match) {
          formattedBreakdown[subjectName][match[0]] = value;
        }
      });
    });

    // Tạo bản ghi thống kê giáo viên
    const teacherSummary = {
      teacherId: data.teacherId || data.documentId,
      teacherName: data.teacherName || teacherNameItem,
      group: String(data.group || "").trim().toUpperCase(),
      class: data.class || "",
      totalFiles: Number(data.totalFiles) || 0,
      subjects: formattedSubjects,
      classBreakdown: formattedBreakdown,
      recentFiles: Array.isArray(data.recentFiles)
        ? data.recentFiles
        : [],
      hasStatistics: true,
    };

    console.log("✅ Giáo viên đã tìm thấy:", teacherSummary);

    return teacherSummary;
  });

  // 5. Phân nhóm theo group và class thực tế trong THONGKE
  const groupedSummary = {
    khoi1: [],
    khoi2: [],
    khoi3: [],
    khoi4: [],
    khoi5: [],
    tiengAnh: [],
    boMon: [],
    toBoMon: [],
  };

  teamList.forEach((teacher) => {
    const group = String(teacher.group || "").toUpperCase();
    const className = String(teacher.class || "").trim();

    if (group === "GVCN") {
      const match = className.match(/^([1-5])(?:\.|$)/);

      if (match) {
        groupedSummary[`khoi${match[1]}`].push(teacher);
      } else {
        console.warn(
          "⚠️ Giáo viên GVCN chưa xác định được khối:",
          teacher.teacherName,
          className
        );
      }
    } else if (group === "TA") {
      groupedSummary.tiengAnh.push(teacher);
    } else if (group === "BM" || group === "GVBM") {
      groupedSummary.boMon.push(teacher);
    } else {
      console.warn(
        "⚠️ Giáo viên chưa xác định nhóm:",
        teacher.teacherName,
        teacher.group
      );
    }
  });

  // Giữ danh sách thành viên tổ để tương thích giao diện cũ
  groupedSummary.toBoMon = teamList;

  // Trả về kết quả và danh sách thiếu dữ liệu để component xử lý thông báo
  const missingCount = teamList.filter((t) => !t.hasStatistics).length;

  return {
    groupedSummary,
    teamList,
    missingCount,
  };
};