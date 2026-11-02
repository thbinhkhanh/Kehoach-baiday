import { doc, getDoc, collection, getDocs } from "firebase/firestore";

/**
 * Lấy và tính toán dữ liệu thống kê của giáo viên dựa theo Tab đang chọn
 * 
 * @param {Object} params
 * @param {string} params.academicYear - Năm học hiện tại
 * @param {number|string} params.activeTab - Tab hiện tại (0: KHBD, 1: Đề KTĐK, 2: Biên bản SHCM)
 * @param {string} params.activeTeacher - ID hoặc mã giáo viên đang xem
 * @param {string} params.teacherName - Tên giáo viên (dùng làm fallback)
 * @param {string} params.teacherRole - Vai trò giáo viên (GVCN, TA, BM, ...)
 * @param {string} params.className - Tên lớp của giáo viên
 * @param {Array} params.assignedSubjectsList - Danh sách môn học được phân công
 * @param {Array} params.allMonHoc - Danh sách tất cả các môn học
 * @param {Object} params.db - Firestore instance
 * @returns {Promise<Array>} Mảng dữ liệu thống kê (stats)
 */
export const fetchTeacherStatsData = async ({
  academicYear,
  activeTab,
  activeTeacher,
  teacherName,
  teacherRole,
  className,
  assignedSubjectsList = [],
  allMonHoc = [],
  db,
}) => {
  if (!academicYear) return [];

  let stats = [];

  if (activeTab === 0) {
    // 📊 1. Thống kê Kế hoạch bài dạy (Tab 0) - Truy vấn trực tiếp từ THONGKE_{academicYear}
    if (!activeTeacher) return [];

    const docRef = doc(db, `THONGKE_${academicYear}`, activeTeacher);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const subjects = data.subjects || {};
      const breakdown = data.classBreakdown || {};

      stats = Object.keys(subjects).map((sub) => {
        const subBreakdown = breakdown[sub] || {};
        const rowData = {
          subject: sub,
          total: subjects[sub] || 0,
        };

        // Chuẩn hóa key khối thành số sạch sẽ ("1", "2", "3", "4", "5") để khớp tuyệt đối với TeacherStatsView
        Object.entries(subBreakdown).forEach(([khoiKey, count]) => {
          const match = String(khoiKey).match(/[1-5]/);
          if (match) {
            const gradeNum = match[0];
            rowData[gradeNum] = (rowData[gradeNum] || 0) + count;
          } else {
            rowData[khoiKey] = (rowData[khoiKey] || 0) + count;
          }
        });

        return rowData;
      });
    }
  } else if (activeTab === 1) {
    // 📋 2. Thống kê Đề KTĐK (Tab 1)
    const statsMap = {};
    const targetSubjects =
      assignedSubjectsList.length > 0
        ? assignedSubjectsList
        : allMonHoc.map((m) => m.name);

    let docIdentifier = "Chung";
    if (teacherRole === "TA") {
      docIdentifier = "Tieng_Anh";
    } else if (teacherRole === "BM") {
      docIdentifier = "Bo_mon";
    } else {
      const gKey =
        String(className || "")
          .split(".")[0]
          .replace(/[^0-9]/g, "") || "4";
      docIdentifier = `Khối_${gKey}`;
    }
    docIdentifier = docIdentifier
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "_");

    const mainColName = `DE_KTDK_${academicYear}`;

    for (const sub of targetSubjects) {
      try {
        const subjectName = sub
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, "_");
        const subColRef = collection(db, mainColName, docIdentifier, subjectName);
        const subSnap = await getDocs(subColRef);

        let rowData = { subject: sub, total: 0 };

        subSnap.forEach((docSnap) => {
          const docId = docSnap.id;
          const data = docSnap.data();

          const idMatch = docId.match(/^LOP_(\d+)_/i) || docId.match(/^(\d+)_/i);
          const khoiVal = String(data.khoi || data.className || "").trim();
          const khoiMatch = khoiVal.match(/^(?:khối|khoi|lớp|lop)\s*(\d+)/i);
          const grade =
            idMatch?.[1] ||
            khoiMatch?.[1] ||
            String(className || "").split(".")[0];

          if (grade) {
            rowData[grade] = (rowData[grade] || 0) + 1;
            rowData.total++;
          }
        });

        if (rowData.total > 0) {
          statsMap[sub] = rowData;
        }
      } catch (subErr) {
        console.error(`Lỗi thống kê đề KTĐK môn ${sub}:`, subErr);
      }
    }

    stats = Object.values(statsMap);
  } else if (activeTab === 2) {
    // 📝 3. Thống kê Biên bản sinh hoạt chuyên môn (Tab 2)
    const statsMap = {};
    let docIdentifier = "Chung";
    if (teacherRole === "TA") {
      docIdentifier = "Tieng_Anh";
    } else if (teacherRole === "BM") {
      docIdentifier = "Bo_mon";
    } else {
      const gKey =
        String(className || "")
          .split(".")[0]
          .replace(/[^0-9]/g, "") || "4";
      docIdentifier = `Khối_${gKey}`;
    }
    docIdentifier = docIdentifier
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "_");

    const mainColName = `BIEN_BAN_${academicYear}`;
    try {
      const filesRef = collection(db, mainColName, docIdentifier, "FILES_LIST");
      const snap = await getDocs(filesRef);

      let rowData = { subject: "Biên bản sinh hoạt CM", total: 0 };
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        const gVal = String(data.khoi || data.className || "Chung").trim();
        rowData[gVal] = (rowData[gVal] || 0) + 1;
        rowData.total++;
      });

      if (rowData.total > 0) {
        statsMap["Biên bản sinh hoạt CM"] = rowData;
      }
    } catch (err) {
      console.error("Lỗi thống kê Biên bản:", err);
    }

    stats = Object.values(statsMap);
  }

  return stats;
};