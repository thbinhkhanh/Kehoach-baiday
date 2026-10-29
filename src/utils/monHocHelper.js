/**
 * 🚀 Hàm tính toán và lọc danh sách môn học hợp lệ theo giáo viên và lớp được chọn
 */
export const tinhToanMonHocChoGiaoVien = ({
  selectedUsername,
  phanQuyenMap,
  className,
  allMonHoc,
  lopMonHocMap,
  currentSubject,
}) => {
  if (
    !selectedUsername ||
    !phanQuyenMap[selectedUsername] ||
    !className ||
    allMonHoc.length === 0
  ) {
    return { finalSubjects: [], newSubject: currentSubject };
  }

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

  // Xác định môn học được chọn phù hợp
  let newSubject = currentSubject;
  if (finalSubjects.length > 0 && !finalSubjects.includes(currentSubject)) {
    newSubject = finalSubjects[0];
  } else if (finalSubjects.length === 0) {
    newSubject = "";
  }

  return {
    finalSubjects,
    newSubject,
  };
};