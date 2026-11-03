/**
 * Hàm dịch vụ tính toán danh sách môn học khả dụng dựa trên lớp, vai trò và phân quyền của giáo viên
 */
export function getAvailableSubjectsService({
  className,
  allMonHoc = [],
  teacherAssignedSubjects = [],
  teacherRole,
  lopMonHocMap = {},
}) {
  if (!className || allMonHoc.length === 0) return [];

  // Lớp 5.4 -> khối 5; lớp 4 -> khối 4 (chuẩn hóa loại bỏ khoảng trắng)
  const selectedGrade = String(className).split(".")[0].trim();

  const gradeMatches = (grades) => {
    if (!Array.isArray(grades) || grades.length === 0) return true;

    return grades.some(
      (grade) => String(grade).trim().split(".")[0] === selectedGrade
    );
  };

  const isAssignedSubject = (name) =>
    teacherAssignedSubjects.some(
      (assigned) =>
        String(assigned).trim().toLowerCase() ===
        String(name).trim().toLowerCase()
    );

  const hasAllSubjectsPermission =
    teacherAssignedSubjects.length === 0 ||
    teacherAssignedSubjects.some((s) =>
      String(s).toLowerCase().includes("tất cả")
    );

  // Chuẩn hóa role về chữ hoa để tránh lỗi lệch ký tự
  const role = String(teacherRole || "").trim().toUpperCase();

  // Giáo viên Tiếng Anh
  if (role === "TA") {
    const taSubject = allMonHoc.find((s) =>
      s.name.toLowerCase().includes("tiếng anh")
    );

    return taSubject && gradeMatches(taSubject.grades)
      ? [taSubject.name]
      : [];
  }

  // Giáo viên bộ môn: chỉ hiện môn đã được phân quyền và đúng khối
  if (role === "BM") {
    return allMonHoc
      .filter(
        (sub) =>
          isAssignedSubject(sub.name) && gradeMatches(sub.grades)
      )
      .map((sub) => sub.name);
  }

  // Giáo viên chủ nhiệm
  if (role === "GVCN") {
    const subjectsForClass =
      lopMonHocMap[String(className)] ||
      lopMonHocMap[selectedGrade] ||
      [];

    let subjects = [];

    if (subjectsForClass.length > 0) {
      // 🌟 BỔ SUNG gradeMatches(sub.grades) để bắt buộc môn học phải đúng khối của lớp đang chọn
      subjects = allMonHoc
        .filter((sub) =>
          gradeMatches(sub.grades) &&
          subjectsForClass.some(
            (name) =>
              String(name).trim().toLowerCase() ===
              String(sub.name).trim().toLowerCase()
          )
        )
        .map((sub) => sub.name);
    } else {
      const specialistKeywords = [
        "tiếng anh",
        "tin học",
        "mĩ thuật",
        "mỹ thuật",
        "âm nhạc",
        "thể dục",
        "giáo dục thể chất",
      ];

      subjects = allMonHoc
        .filter((sub) => {
          if (!gradeMatches(sub.grades)) return false;

          if (!hasAllSubjectsPermission) {
            return isAssignedSubject(sub.name);
          }

          return !specialistKeywords.some((keyword) =>
            sub.name.toLowerCase().includes(keyword)
          );
        })
        .map((sub) => sub.name);
    }

    // Nếu có danh sách môn cụ thể trong phân quyền, tiếp tục giới hạn.
    if (!hasAllSubjectsPermission) {
      subjects = subjects.filter(isAssignedSubject);
    }

    return [...new Set(subjects)];
  }

  // Trường hợp mặc định
  return allMonHoc
    .filter((sub) => gradeMatches(sub.grades))
    .map((sub) => sub.name);
}