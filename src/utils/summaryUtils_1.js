/**
 * Hàm tiện ích xử lý phân loại nhóm giáo viên và gọi dữ liệu tổng quan tổ
 * @param {Object} params - Các tham số đầu vào
 * @param {Object} setters - Các hàm cập nhật state (setState)
 * @param {Function} fetchSchoolSummaryData - Hàm gọi dữ liệu tổng quan trường/tổ
 */
export const handleOpenTeamSummaryUtility = async (params, setters, fetchSchoolSummaryData) => {
  const {
    phanQuyenMap,
    toTeachers,
    teacherRole,
    academicYear,
    allMonHoc,
    assignedSubjectsList,
  } = params;

  const {
    setTeamSummaryOpen,
    setLoadingSchoolSummary,
    setSchoolSummaryGrouped,
  } = setters;

  setTeamSummaryOpen(true);

  const groupedTeachersData = {
    khoi1: [], khoi2: [], khoi3: [], khoi4: [], khoi5: [],
    tiengAnh: [],
    boMon: []
  };

  // Phân loại toàn bộ giáo viên từ phanQuyenMap
  if (phanQuyenMap) {
    Object.entries(phanQuyenMap).forEach(([tName, tData]) => {
      const role = (tData.role || "GVCN").toUpperCase();
      const classes = tData.teachingClasses || (tData.assignedClass ? [tData.assignedClass] : []);
      
      if (role === "TA") {
        groupedTeachersData.tiengAnh.push(tName);
      } else if (role === "BM") {
        groupedTeachersData.boMon.push(tName);
      } else {
        classes.forEach((c) => {
          const grade = String(c).split(".")[0].replace(/[^0-9]/g, "");
          if (grade === "1") groupedTeachersData.khoi1.push(tName);
          if (grade === "2") groupedTeachersData.khoi2.push(tName);
          if (grade === "3") groupedTeachersData.khoi3.push(tName);
          if (grade === "4") groupedTeachersData.khoi4.push(tName);
          if (grade === "5") groupedTeachersData.khoi5.push(tName);
        });
      }
    });
  }

  // 🌟 Lọc cô lập chỉ lấy đúng tổ/khối của user hiện tại dựa vào toTeachers
  if (toTeachers && toTeachers.length > 0) {
    if (teacherRole === "TA") {
      groupedTeachersData.khoi1 = []; groupedTeachersData.khoi2 = [];
      groupedTeachersData.khoi3 = []; groupedTeachersData.khoi4 = [];
      groupedTeachersData.khoi5 = []; groupedTeachersData.boMon = [];
      groupedTeachersData.tiengAnh = toTeachers;
    } else if (teacherRole === "BM") {
      groupedTeachersData.khoi1 = []; groupedTeachersData.khoi2 = [];
      groupedTeachersData.khoi3 = []; groupedTeachersData.khoi4 = [];
      groupedTeachersData.khoi5 = []; groupedTeachersData.tiengAnh = [];
      groupedTeachersData.boMon = toTeachers;
    } else {
      Object.keys(groupedTeachersData).forEach((k) => {
        if (k.startsWith("khoi")) {
          groupedTeachersData[k] = groupedTeachersData[k].filter((name) => toTeachers.includes(name));
        } else {
          groupedTeachersData[k] = [];
        }
      });
    }
  }

  if (typeof fetchSchoolSummaryData === "function") {
    await fetchSchoolSummaryData({
      isAdmin: true,
      phanQuyenMap,
      allMonHoc,
      academicYear,
      groupedTeachers: groupedTeachersData,
      filteredSubjectNames: assignedSubjectsList,
      setLoadingSchoolSummary,
      setSchoolSummaryGrouped,
      forceRefresh: true,
    });
  }
};