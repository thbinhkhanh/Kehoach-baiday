import { db } from "../firebase";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

/**
 * Lưu phân quyền giáo viên và cập nhật thông tin tài khoản tương ứng.
 * 
 * Nguyên tắc:
 * - teachingClasses chỉ lưu ĐÚNG 1 giá trị lớp mới nhất sau khi thay đổi (không cộng dồn lớp cũ).
 */
export async function saveTeacherAssignmentService({
  selectedTeacher,
  teachers,
  assignedRole,
  assignedClass,
  assignedSubjects = [],
  teachingClasses = [],
  academicYear,
  taoMaGiaoVien,
}) {
  // 1. Kiểm tra dữ liệu đầu vào.
  if (!selectedTeacher) {
    throw new Error("Chưa chọn giáo viên cần lưu phân quyền.");
  }

  if (!academicYear) {
    throw new Error("Chưa chọn năm học.");
  }

  const teacher = (Array.isArray(teachers) ? teachers : []).find(
    (t) => t.username === selectedTeacher
  );

  if (!teacher) {
    throw new Error(
      "Không tìm thấy giáo viên trong danh sách đã nhập từ Excel."
    );
  }

  // 2. Chuẩn hóa lớp chủ nhiệm.
  const normalizedClass = String(assignedClass || "")
    .replace(/^lớp\s*/i, "")
    .trim();

  // Xác định khối, ví dụ lớp 2.1 thuộc khối 2.
  const grade =
    assignedRole === "GVCN"
      ? normalizedClass.split(".")[0]
      : "";

  // Kiểm tra lớp chủ nhiệm.
  if (
    assignedRole === "GVCN" &&
    (
      !grade ||
      !/^\d+$/.test(grade) ||
      !/^\d+\.\d+$/.test(normalizedClass)
    )
  ) {
    throw new Error(
      "Vui lòng chọn lớp chủ nhiệm hợp lệ, ví dụ 3.1."
    );
  }

  // 3. Xác định thông tin môn học.
  const subjectString =
    assignedRole === "GVCN"
      ? "Tất cả môn GVCN"
      : assignedRole === "TA"
        ? "Tiếng Anh"
        : assignedSubjects.join(", ");

  // 4. Tham chiếu tài liệu phân quyền theo năm học.
  const phanQuyenRef = doc(
    db,
    `PHANQUYEN_${academicYear}`,
    selectedTeacher
  );

  // 5. Xác định danh sách teachingClasses CHỈ LẤY ĐÚNG GIÁ TRỊ MỚI NHẤT.
  // Nếu là GVCN thì teachingClasses sẽ là mảng chứa đúng 1 lớp hiện tại: [normalizedClass] (ví dụ: ["2.3"]).
  // Nếu là Bộ môn/TA thì lấy từ mảng teachingClasses truyền lên từ giao diện.
  const rawClasses = assignedRole === "GVCN"
    ? (normalizedClass ? [normalizedClass] : [])
    : (Array.isArray(teachingClasses) ? teachingClasses : []);

  const normalizedTeachingClasses = [
    ...new Set(
      rawClasses
        .map((item) =>
          String(item || "")
            .replace(/^lớp\s*/i, "")
            .trim()
        )
        .filter(Boolean)
    ),
  ];

  // 6. Tạo dữ liệu phân quyền mới.
  const payload = {
    username: selectedTeacher,
    role: assignedRole,

    // Cập nhật lớp chủ nhiệm mới nhất.
    assignedClass:
      assignedRole === "GVCN" ? normalizedClass : "",

    assignedSubject: subjectString,

    assignedSubjects:
      assignedRole === "GVCN"
        ? ["Tất cả môn GVCN"]
        : assignedSubjects,

    // Chỉ lưu danh sách lớp mới nhất sau khi thay đổi.
    teachingClasses: normalizedTeachingClasses,

    academicYear,
    updatedAt: serverTimestamp(),
  };

  // Chỉ cập nhật grade khi giáo viên được phân công GVCN.
  if (assignedRole === "GVCN") {
    payload.grade = grade;
  }

  // 7. Xác định subject cho tài khoản DANHSACH_GV.
  const excelClassSubject = String(
    teacher.excelClassSubject || teacher.subject || ""
  ).trim();

  let accountSubject = "BM";

  if (/^TA$/i.test(excelClassSubject)) {
    accountSubject = "TA";
  } else if (/^\d+\.\d+$/.test(excelClassSubject)) {
    accountSubject = excelClassSubject;
  }

  // Nếu là GVCN, tài khoản sử dụng lớp chủ nhiệm mới.
  if (assignedRole === "GVCN") {
    accountSubject = normalizedClass;
  }

  // 8. Xác định ID tài khoản giáo viên.
  const teacherId = taoMaGiaoVien
    ? taoMaGiaoVien(selectedTeacher)
    : selectedTeacher;

  const accountRef = doc(
    db,
    "DANHSACH_GV",
    teacherId
  );

  // Đọc tài khoản hiện tại để giữ nguyên mật khẩu.
  const accountSnap = await getDoc(accountRef);

  const accountPayload = {
    username: selectedTeacher,
    subject: accountSubject,
    academicYear,
    updatedAt: serverTimestamp(),
  };

  // Chỉ tạo mật khẩu mặc định khi tài khoản chưa tồn tại.
  if (!accountSnap.exists()) {
    accountPayload.pass = "123";
  }

  // 9. Lưu dữ liệu lên Firestore.
  await setDoc(phanQuyenRef, payload, { merge: true });
  await setDoc(accountRef, accountPayload, { merge: true });

  return {
    success: true,
    payload,
    selectedTeacher,
    message: `Đã lưu phân quyền và cập nhật tài khoản ${selectedTeacher}.`,
  };
}