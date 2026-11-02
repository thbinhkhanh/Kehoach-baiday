import { collection, getDocs } from "firebase/firestore";

/**
 * Hàm tiện ích xử lý thống kê theo các Tab (Tab 0: KHBD, Tab 1: Đề KTĐK, Tab 2: Biên bản)
 * @param {Object} db - Firestore instance
 * @param {Object} params - Các tham số đầu vào
 * @param {Object} setters - Các hàm cập nhật state (setState)
 * @param {Object} cacheHelpers - Các hàm hỗ trợ cache và service phụ trợ
 */
export const fetchTeacherStats = async (db, params, setters, cacheHelpers) => {
  const {
    academicYear,
    activeTeacher,
    teacherName,
    activeTab,
    teacherRole,
    className,
    assignedSubjectsList,
    allMonHoc,
    assignedClassesList,
    teacherAssignedSubjects,
    fetchTeacherStatsService, // Hàm dịch vụ phụ cho Tab 0 (nếu có)
  } = params;

  const { setStatsData, setLoadingStats } = setters;
  const { getTeacherStats, updateTeacherStats } = cacheHelpers;

  if (!academicYear) return;

  const yearStr = academicYear;
  const statsKey = `${academicYear}_${activeTeacher || teacherName}_tab_${activeTab}`;
  const cachedStats = getTeacherStats ? getTeacherStats(statsKey) : [];

  if (cachedStats.length > 0) {
    setStatsData(cachedStats);
    setLoadingStats(false);
  } else {
    setLoadingStats(true);
  }

  try {
    let stats = [];

    if (activeTab === 0) {
      // 📊 1. Thống kê Kế hoạch bài dạy (Tab 0)
      if (!activeTeacher) return;
      if (typeof fetchTeacherStatsService === "function") {
        stats = await fetchTeacherStatsService({
          teacherName: activeTeacher,
          academicYear,
          teacherRole,
          className,
          assignedClassesList,
          assignedSubjectsList,
          allMonHoc,
          teacherAssignedSubjects,
        });
      }

    } else if (activeTab === 1) {
      // 📋 2. Thống kê Đề KTĐK (Tab 1)
      const statsMap = {};
      const targetSubjects = assignedSubjectsList.length > 0 ? assignedSubjectsList : allMonHoc.map(m => m.name);

      let docIdentifier = "Chung";
      if (teacherRole === "TA") {
        docIdentifier = "Tieng_Anh";
      } else if (teacherRole === "BM") {
        docIdentifier = "Bo_mon";
      } else {
        const gKey = String(className || "").split(".")[0].replace(/[^0-9]/g, "") || "4";
        docIdentifier = `Khối_${gKey}`;
      }
      docIdentifier = docIdentifier.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");

      const mainColName = `DE_KTDK_${yearStr}`;

      for (const sub of targetSubjects) {
        try {
          const subjectName = sub.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");
          const subColRef = collection(db, mainColName, docIdentifier, subjectName);
          const subSnap = await getDocs(subColRef);

          let rowData = { subject: sub, total: 0 };

          subSnap.forEach((docSnap) => {
            const docId = docSnap.id;
            const data = docSnap.data();

            const idMatch = docId.match(/^LOP_(\d+)_/i) || docId.match(/^(\d+)_/i);
            const khoiVal = String(data.khoi || data.className || "").trim();
            const khoiMatch = khoiVal.match(/^(?:khối|khoi|lớp|lop)\s*(\d+)/i);
            const grade = idMatch?.[1] || khoiMatch?.[1] || String(className || "").split(".")[0];

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
        const gKey = String(className || "").split(".")[0].replace(/[^0-9]/g, "") || "4";
        docIdentifier = `Khối_${gKey}`;
      }
      docIdentifier = docIdentifier.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");

      const mainColName = `BIEN_BAN_${yearStr}`;
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

    setStatsData(stats);
    if (typeof updateTeacherStats === "function") {
      updateTeacherStats(statsKey, stats);
    }
  } catch (error) {
    console.error("Lỗi khi thống kê theo tab:", error);
    setStatsData([]);
  } finally {
    setLoadingStats(false);
  }
};