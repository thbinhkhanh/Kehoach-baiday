import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";

/**
 * Hàm dịch vụ thực hiện truy vấn và tính toán thống kê kế hoạch bài dạy của giáo viên từ Firestore
 */
export async function fetchTeacherStatsService({
  teacherName,
  academicYear,
  teacherRole,
  className,
  assignedClassesList,
  assignedSubjectsList,
  allMonHoc,
  teacherAssignedSubjects,
}) {
  const yearCol = `KEHOACH_DAYHOC_${academicYear}`;
  const stats = [];

  const isGVCN = teacherRole === "GVCN";

  const classCode = String(
    className ||
    assignedClassesList?.[0] ||
    "1"
  );

  const selectedGrade = classCode.split(".")[0].replace(/[^0-9]/g, "") || "1";

  let subjectsToQuery = [];

  if (isGVCN) {
    // Thống kê theo danh sách môn được phép hiển thị của GVCN.
    subjectsToQuery = assignedSubjectsList?.length > 0
      ? assignedSubjectsList
      : (allMonHoc || [])
          .filter((sub) => {
            const grades = (sub.grades || []).map((g) =>
              String(g).split(".")[0].replace(/[^0-9]/g, "")
            );

            return (
              grades.length === 0 ||
              grades.includes(selectedGrade)
            );
          })
          .map((sub) => sub.name);
  } else if (teacherRole === "TA") {
    subjectsToQuery = assignedSubjectsList || [];
  } else if (teacherRole === "BM") {
    // Giữ đúng các môn được phân quyền, không lấy tất cả môn.
    subjectsToQuery = (teacherAssignedSubjects || []).filter(
      (s) => !String(s).toLowerCase().includes("tất cả")
    );

    if (subjectsToQuery.length === 0) {
      subjectsToQuery = assignedSubjectsList || [];
    }
  } else {
    subjectsToQuery = assignedSubjectsList || [];
  }

  subjectsToQuery = [...new Set((subjectsToQuery || []).filter(Boolean))];

  for (const subjectName of subjectsToQuery) {
    try {
      const subjectRef = collection(
        db,
        yearCol,
        teacherName,
        subjectName
      );

      const subjectSnap = await getDocs(subjectRef);

      const entry = {
        subject: subjectName,
        username: teacherName,
      };

      subjectSnap.forEach((docSnap) => {
        const data = docSnap.data();
        const docId = docSnap.id;

        // 1. Lấy thông tin khối từ ID document (vd: Khoi_4_...)
        const idMatch = docId.match(/^Khoi_(\d+)_/i);
        let grade = idMatch?.[1];

        // 2. Dự phòng lấy từ thuộc tính khoi hoặc className trong document
        if (!grade) {
          const khoiValue = String(
            data.khoi || data.className || ""
          ).trim();

          const valueMatch = khoiValue.match(
            /^(?:khối|khoi|lớp|lop)\s*(\d+)/i
          );

          grade = valueMatch?.[1];
        }

        // 3. Nếu vẫn chưa có, cắt lấy phần số trước dấu chấm từ className hoặc classCode (vd: "4.3" -> "4")
        if (!grade) {
          const rawCls = data.className || classCode;
          grade = String(rawCls).split(".")[0].replace(/[^0-9]/g, "");
        }

        const hasFile =
          /^Khoi_\d+_/i.test(docId) ||
          Boolean(
            data.fileURL ||
            data.fileUrl ||
            data.url ||
            data.fileName ||
            data.tenFile
          );

        if (!hasFile) return;

        // Ép chuẩn targetKey về dạng số Khối (ví dụ: "4") để khớp với cấu trúc cột thống kê
        const targetKey = grade || selectedGrade;

        entry[targetKey] = (entry[targetKey] || 0) + 1;
      });

      stats.push(entry);
    } catch (error) {
      console.error(
        `Lỗi thống kê môn "${subjectName}":`,
        error
      );
    }
  }

  return stats;
}