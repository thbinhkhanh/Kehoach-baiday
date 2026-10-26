import { db } from "../firebase";
import { doc, getDoc, updateDoc, getDocs, collection, writeBatch } from "firebase/firestore";

/**
 * Hàm dịch vụ reset mật khẩu cho một giáo viên cụ thể
 */
export async function resetTeacherPasswordService({
  teacherNameToReset,
  academicYear,
  normalizeTeacherId,
}) {
  const teacherName = (teacherNameToReset || "").trim();

  if (!teacherName) {
    throw new Error("Vui lòng chọn họ tên giáo viên cần reset mật khẩu.");
  }

  const teacherId = normalizeTeacherId ? normalizeTeacherId(teacherName) : teacherName;
  const teacherRef = doc(db, "DANHSACH_GV", teacherId);
  const teacherSnapshot = await getDoc(teacherRef);

  if (!teacherSnapshot.exists()) {
    throw new Error(
      `Không tìm thấy giáo viên "${teacherName}" trong DANHSACH_GV. Vui lòng kiểm tra lại họ tên.`
    );
  }

  await updateDoc(teacherRef, {
    pass: "123",
    academicYear: academicYear,
    updatedAt: new Date(),
  });

  const teacherData = teacherSnapshot.data();
  const displayName = teacherData.username || teacherName;

  return {
    success: true,
    message: `Đã reset mật khẩu của ${displayName} về 123 (Năm học: ${academicYear}).`,
  };
}

/**
 * Hàm dịch vụ reset mật khẩu hàng loạt cho toàn bộ giáo viên (tự động bỏ qua Admin/BGH)
 */
export async function resetAllTeachersPasswordService({ academicYear }) {
  const querySnapshot = await getDocs(collection(db, "DANHSACH_GV"));
  let updatedCount = 0;
  let skippedCount = 0;

  const batch = writeBatch(db);

  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const role = (data.role || data.quyen || data.chucVu || "").toLowerCase();
    const docId = docSnap.id.toUpperCase();
    const username = (data.username || "").toLowerCase();

    const isAdminOrBgh =
      role.includes("admin") ||
      role.includes("bgh") ||
      role.includes("ban giám hiệu") ||
      role.includes("ban giam hieu") ||
      docId.includes("ADMIN") ||
      docId.includes("BGH") ||
      username.includes("admin") ||
      username.includes("bgh");

    if (isAdminOrBgh) {
      skippedCount++;
    } else {
      batch.update(docSnap.ref, {
        pass: "123",
        academicYear: academicYear,
        updatedAt: new Date(),
      });
      updatedCount++;
    }
  });

  if (updatedCount > 0) {
    await batch.commit();
  }

  return {
    success: true,
    message: `Đã reset mật khẩu về 123 cho ${updatedCount} giáo viên (Đã tự động bỏ qua ${skippedCount} tài khoản Admin/BGH).`,
    updatedCount,
    skippedCount,
  };
}