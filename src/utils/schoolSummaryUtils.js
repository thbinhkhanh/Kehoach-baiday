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
 * Lấy và tổng hợp dữ liệu thống kê toàn trường từ Firestore
 * 
 * @param {Object} params
 * @param {string} params.academicYear - Năm học hiện tại
 * @param {Object} params.groupedTeachers - Danh sách giáo viên phân theo các nhóm (khoi1-5, tiengAnh, boMon)
 * @param {Object} params.phanQuyenMap - Bản đồ phân quyền giáo viên
 * @param {Object} params.db - Firestore instance
 * @returns {Promise<Object>} Trả về đối tượng dữ liệu đã phân nhóm (groupedSummary)
 */
export const fetchSchoolSummaryDataService = async ({
  academicYear,
  groupedTeachers,
  phanQuyenMap,
  db,
}) => {
  const collectionName = `THONGKE_${academicYear}`;
  const snapshot = await getDocs(collection(db, collectionName));

  // Tạo Map tra cứu thống kê của từng giáo viên theo mã GV hoặc tên
  const thongKeMap = new Map();

  snapshot.forEach((docSnap) => {
    const data = docSnap.data() || {};
    const record = { ...data, documentId: docSnap.id };

    [docSnap.id, data.teacherId, data.teacherName].forEach((key) => {
      const normalized = normalizeKey(key);
      if (normalized) {
        thongKeMap.set(normalized, record);
      }
    });
  });

  // Lấy danh sách toàn bộ giáo viên từ groupedTeachers
  const allTeachersList = [
    ...(groupedTeachers.khoi1 || []),
    ...(groupedTeachers.khoi2 || []),
    ...(groupedTeachers.khoi3 || []),
    ...(groupedTeachers.khoi4 || []),
    ...(groupedTeachers.khoi5 || []),
    ...(groupedTeachers.tiengAnh || []),
    ...(groupedTeachers.boMon || []),
  ];

  const uniqueTeachers = Array.from(new Set(allTeachersList));

  const teamList = uniqueTeachers.map((teacherNameItem) => {
    const teacherInfo = phanQuyenMap[teacherNameItem] || {};
    const teacherIdItem = teacherInfo.teacherId || teacherNameItem;

    const data =
      thongKeMap.get(normalizeKey(teacherIdItem)) ||
      thongKeMap.get(normalizeKey(teacherNameItem));

    if (!data) {
      return {
        teacherId: teacherIdItem,
        teacherName: teacherNameItem,
        group: teacherInfo.role || "",
        class: teacherInfo.assignedClass || (teacherInfo.teachingClasses?.[0] || ""),
        totalFiles: 0,
        subjects: {},
        classBreakdown: {},
        recentFiles: [],
        hasStatistics: false,
      };
    }

    // Format subjects
    const rawSubjects = data.subjects && typeof data.subjects === "object" ? data.subjects : {};
    const formattedSubjects = {};
    Object.entries(rawSubjects).forEach(([subName, count]) => {
      formattedSubjects[subName] = Number(count) || 0;
    });

    // Format classBreakdown
    const rawBreakdown = data.classBreakdown && typeof data.classBreakdown === "object" ? data.classBreakdown : {};
    const formattedBreakdown = {};
    Object.entries(rawBreakdown).forEach(([subjectName, gradeMap]) => {
      formattedBreakdown[subjectName] = {};
      if (!gradeMap || typeof gradeMap !== "object" || Array.isArray(gradeMap)) return;

      Object.entries(gradeMap).forEach(([gradeName, count]) => {
        const value = Number(count) || 0;
        formattedBreakdown[subjectName][gradeName] = value;
        const match = String(gradeName).match(/[1-5]/);
        if (match) {
          formattedBreakdown[subjectName][match[0]] = value;
        }
      });
    });

    return {
      teacherId: data.teacherId || data.documentId,
      teacherName: data.teacherName || teacherNameItem,
      group: String(data.group || teacherInfo.role || "").trim().toUpperCase(),
      class: data.class || teacherInfo.assignedClass || (teacherInfo.teachingClasses?.[0] || ""),
      totalFiles: Number(data.totalFiles) || 0,
      subjects: formattedSubjects,
      classBreakdown: formattedBreakdown,
      recentFiles: Array.isArray(data.recentFiles) ? data.recentFiles : [],
      hasStatistics: true,
    };
  });

  // Phân nhóm theo Khối và Bộ môn
  const groupedSummary = {
    khoi1: [],
    khoi2: [],
    khoi3: [],
    khoi4: [],
    khoi5: [],
    tiengAnh: [],
    boMon: [],
    toBoMon: teamList,
  };

  teamList.forEach((teacher) => {
    const group = String(teacher.group || "").toUpperCase();
    const className = String(teacher.class || "").trim();

    if (group === "GVCN") {
      const match = className.match(/^([1-5])(?:\.|$)/);
      if (match) {
        groupedSummary[`khoi${match[1]}`].push(teacher);
      }
    } else if (group === "TA") {
      groupedSummary.tiengAnh.push(teacher);
    } else if (group === "BM" || group === "GVBM") {
      groupedSummary.boMon.push(teacher);
    }
  });

  return groupedSummary;
};