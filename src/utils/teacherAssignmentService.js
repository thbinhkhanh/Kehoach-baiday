import { db } from "../firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

/**
 * Hàm dịch vụ lưu phân quyền giáo viên và cập nhật thông tin tài khoản tương ứng
 */
export async function saveTeacherAssignmentService({
  selectedTeacher,
  teachers,
  assignedRole,
  assignedClass,
  assignedSubjects,
  teachingClasses,
  academicYear,
  taoMaGiaoVien,
}) {
  if (!selectedTeacher) {
    throw new Error("Chưa chọn giáo viên cần lưu phân quyền.");
  }

  const teacher = teachers.find(
    (t) => t.username === selectedTeacher
  );

  if (!teacher) {
    throw new Error(
      "Không tìm thấy giáo viên trong danh sách đã nhập từ Excel."
    );
  }

  // Dữ liệu phân quyền hiện tại
  const subjectString =
    assignedRole === "GVCN"
      ? assignedClass
      : assignedRole === "TA"
      ? "Tiếng Anh"
      : assignedSubjects.join(", ");

  const payload = {
    username: selectedTeacher,
    role: assignedRole,
    assignedClass:
      assignedRole === "GVCN" ? assignedClass : "",
    assignedSubject: subjectString,
    assignedSubjects:
      assignedRole === "GVCN"
        ? [assignedClass]
        : assignedSubjects,
    teachingClasses:
      assignedRole === "GVCN"
        ? [assignedClass]
        : teachingClasses,
    academicYear,
    updatedAt: new Date(),
  };

  // 1. Lưu phân quyền theo năm học
  const phanQuyenRef = doc(
    db,
    `PHANQUYEN_${academicYear}`,
    selectedTeacher
  );

  // 2. Xác định subject ghi vào DANHSACH_GV (dữ liệu gốc từ file Excel)
  const excelClassSubject = String(
    teacher.excelClassSubject || teacher.subject || ""
  ).trim();

  let accountSubject = "BM";

  if (/^TA$/i.test(excelClassSubject)) {
    accountSubject = "TA";
  } else if (/^\d+\.\d+$/.test(excelClassSubject)) {
    accountSubject = excelClassSubject;
  }

  // 3. Document ID theo quy tắc không dấu, viết hoa, nối bằng _
  const teacherId = taoMaGiaoVien ? taoMaGiaoVien(selectedTeacher) : selectedTeacher;

  const accountRef = doc(
    db,
    "DANHSACH_GV",
    teacherId
  );

  // Kiểm tra tài khoản để giữ nguyên mật khẩu cũ nếu đã tồn tại
  const accountSnap = await getDoc(accountRef);

  const accountPayload = {
    username: selectedTeacher,
    subject: accountSubject,
    academicYear,
    updatedAt: serverTimestamp(),
  };

  if (!accountSnap.exists()) {
    accountPayload.pass = "123";
  }

  // Thực hiện ghi song song lên Firestore
  await setDoc(phanQuyenRef, payload, { merge: true });
  await setDoc(accountRef, accountPayload, { merge: true });

  return {
    success: true,
    payload,
    selectedTeacher,
    message: `Đã lưu phân quyền và cập nhật tài khoản ${selectedTeacher}.`,
  };
}