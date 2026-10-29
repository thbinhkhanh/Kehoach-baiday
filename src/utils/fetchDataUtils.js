import { doc, getDoc, collection, getDocs } from "firebase/firestore";

/**
 * Tải toàn bộ dữ liệu cấu hình, danh sách giáo viên, môn học và phân quyền.
 * @param {Object} db - Firestore instance
 * @param {Function} determineTeacherRole - Hàm xác định vai trò giáo viên
 * @returns {Promise<Object>} Trả về object chứa các dữ liệu đã fetch
 */
export async function fetchInitialData(db, determineTeacherRole) {
  try {
    let currentYear = "2026-2027";
    
    // 1. Lấy cấu hình năm học
    const configRef = doc(db, "CONFIG", "config");
    const configSnap = await getDoc(configRef);
    if (configSnap.exists() && configSnap.data().namHoc) {
      currentYear = configSnap.data().namHoc;
    }

    // 2. Lấy danh sách giáo viên (DANHSACH_GV)
    const gvSnap = await getDocs(collection(db, "DANHSACH_GV"));
    const teacherList = [];
    gvSnap.forEach((d) => {
      const data = d.data();
      const name = data.username || d.id;
      const lower = name.toLowerCase();
      if (lower !== "admin" && lower !== "bgh" && !lower.includes("ban giám hiệu")) {
        teacherList.push({
          id: d.id,
          username: name.toUpperCase(),
          subject: data.subject || "",
          grade: data.grade == null ? "" : String(data.grade),
          teachingClasses: Array.isArray(data.teachingClasses)
            ? data.teachingClasses.map(String)
            : [],
        });
      }
    });
    
    // Sắp xếp theo tên tiếng Việt
    teacherList.sort((a, b) =>
      a.username.split(" ").slice(-1)[0].localeCompare(b.username.split(" ").slice(-1)[0], "vi")
    );

    // 3. Lấy danh sách môn học (MONHOC)
    const monSnap = await getDocs(collection(db, "MONHOC"));
    const monList = [];
    monSnap.forEach((d) => {
      const data = d.data();
      const subName = data.name || d.id;
      if (subName) {
        monList.push({
          name: subName,
          grades: data.grades || [],
        });
      }
    });
    monList.sort((a, b) => a.name.localeCompare(b.name, "vi"));

    // 4. Lấy ánh xạ lớp môn học (LOP_MONHOC)
    const lopMonHocSnap = await getDocs(collection(db, "LOP_MONHOC"));
    let classSubjectMap = {};
    
    if (!lopMonHocSnap.empty) {
      const savedGradeMap = {};
      lopMonHocSnap.forEach((d) => {
        savedGradeMap[d.id] = d.data().subjects || [];
      });

      monList.forEach((s) => {
        const applicableGrades = [];
        ["1", "2", "3", "4", "5"].forEach((cls) => {
          if (savedGradeMap[cls] && savedGradeMap[cls].includes(s.name)) {
            applicableGrades.push(cls);
          }
        });
        classSubjectMap[s.name] = applicableGrades;
      });
    } else {
      monList.forEach((s) => {
        const defaultGrades = !s.grades || s.grades.length === 0 ? ["1", "2", "3", "4", "5"] : s.grades.map(String);
        classSubjectMap[s.name] = defaultGrades;
      });
    }

    // 5. Lấy phân quyền theo năm học
    const phanQuyenColName = `PHANQUYEN_${currentYear}`;
    const pqSnap = await getDocs(collection(db, phanQuyenColName));
    const assignmentsMap = {};
    pqSnap.forEach((d) => {
      assignmentsMap[d.id] = d.data();
    });

    // 6. Tìm giáo viên chủ nhiệm mặc định (nếu có hàm determineTeacherRole)
    let defaultSelectedTeacher = "";
    if (typeof determineTeacherRole === "function") {
      const defaultTeachers = teacherList.filter(
        (t) => determineTeacherRole(t.username, teacherList, assignmentsMap) === "GVCN"
      );
      if (defaultTeachers.length > 0) {
        defaultSelectedTeacher = defaultTeachers[0].username;
      }
    }

    return {
      academicYear: currentYear,
      teacherList,
      monList,
      classSubjectMap,
      assignmentsMap,
      defaultSelectedTeacher,
    };
  } catch (err) {
    console.error("Lỗi tải dữ liệu phân quyền:", err);
    throw err;
  }
}