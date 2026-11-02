import { doc, getDoc } from "firebase/firestore";

// ... (các hàm cũ nếu có như getFilteredSubjectNamesBGH)

/**
 * Hàm tiện ích tải danh sách môn học cho Tab 1 dựa theo lựa chọn khối/tổ chuyên môn
 * @param {Object} db - Firestore instance
 * @param {Object} params - Các tham số đầu vào
 * @param {Object} setters - Các hàm cập nhật state (setState)
 */
export const fetchSubjectsForTab1Utility = async (db, params, setters) => {
  const {
    activeTab,
    selectedGrade,
    groupedTeachers,
    phanQuyenMap,
    allMonHoc,
    subjectTab1,
  } = params;

  const { setTab1AllowedSubjects, setSubjectTab1 } = setters;

  if (activeTab !== 1) return;

  let allowedSet = new Set();
  const currentSelection = String(selectedGrade || "").trim();
  
  // Chuyển đổi "Khối 1" hoặc "1" thành ID document chuẩn trên Firestore là "1", "2", "3", "4", "5"
  const gradeId = currentSelection.replace(/[^0-9]/g, ""); 

  if (currentSelection.toLowerCase().includes("tiếng anh") || currentSelection === "Tieng_Anh") {
    // Lấy môn Tiếng Anh từ phân quyền giáo viên hoặc fallback
    const teachers = groupedTeachers.tiengAnh || [];
    teachers.forEach((tName) => {
      const tInfo = phanQuyenMap[tName];
      if (tInfo?.assignedSubjects) {
        tInfo.assignedSubjects.forEach((sub) => { if (sub) allowedSet.add(sub); });
      }
    });
    if (allowedSet.size === 0) {
      allMonHoc.forEach((m) => {
        const name = typeof m === "object" ? m.name : m;
        if (String(name).toLowerCase().includes("tiếng anh")) allowedSet.add(name);
      });
    }

  } else if (currentSelection.toLowerCase().includes("bộ môn") || currentSelection === "Bo_mon") {
    // Lấy chuẩn xác các môn chuyên biệt từ nhóm Bộ môn (groupedTeachers.boMon) giống Tab 0
    const teachers = groupedTeachers.boMon || [];
    teachers.forEach((tName) => {
      const tInfo = phanQuyenMap[tName];
      if (tInfo) {
        if (tInfo.assignedSubjects && Array.isArray(tInfo.assignedSubjects)) {
          tInfo.assignedSubjects.forEach((sub) => { if (sub) allowedSet.add(sub); });
        }
        if (tInfo.subjectsByClass && typeof tInfo.subjectsByClass === "object") {
          Object.values(tInfo.subjectsByClass).forEach((subs) => {
            if (Array.isArray(subs)) subs.forEach((sub) => { if (sub) allowedSet.add(sub); });
          });
        }
      }
    });

    // Fallback dự phòng nếu chưa có phân quyền, lọc các môn chuyên biệt phổ biến
    if (allowedSet.size === 0 && allMonHoc.length > 0) {
      allMonHoc.forEach((m) => {
        const name = typeof m === "object" ? m.name : m;
        const lower = String(name).toLowerCase();
        if (
          lower.includes("tin") || 
          lower.includes("công nghệ") || 
          lower.includes("nhạc") || 
          lower.includes("mĩ thuật") || 
          lower.includes("mỹ thuật") || 
          lower.includes("thể chất") ||
          lower.includes("giáo dục thể chất")
        ) {
          allowedSet.add(name);
        }
      });
    }

  } else if (gradeId && ["1", "2", "3", "4", "5"].includes(gradeId)) {
    try {
      // Truy vấn trực tiếp document theo ID số khối (VD: "1", lấy mảng subjects từ LOP_MONHOC/1)
      const docRef = doc(db, "LOP_MONHOC", gradeId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const subjectsArray = data.subjects || []; // Lấy mảng subjects
        subjectsArray.forEach((sub) => {
          if (sub) allowedSet.add(sub);
        });
      }
    } catch (err) {
      console.error("❌ Lỗi khi tải môn học từ LOP_MONHOC:", err);
    }
  }

  let subList = Array.from(allowedSet).filter(
    (sub) => sub && !String(sub).toLowerCase().includes("tất cả")
  );
  
  // 🌟 Sắp xếp danh sách môn học theo thứ tự bảng chữ cái tiếng Việt (ABC)
  subList.sort((a, b) => {
    const nameA = String(a).trim();
    const nameB = String(b).trim();
    return nameA.localeCompare(nameB, "vi", { sensitivity: "accent" });
  });

  setTab1AllowedSubjects(subList);

  // Tự động chọn môn đầu tiên nếu chưa có hoặc môn hiện tại không nằm trong danh sách
  if (subList.length > 0 && (!subjectTab1 || !subList.includes(subjectTab1))) {
    setSubjectTab1(subList[0]);
  }
};