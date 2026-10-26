import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

// ... (Các hàm service cũ đã có giữ nguyên)

/**
 * 3. Hàm dịch vụ lưu hoặc cập nhật yêu cầu chỉnh sửa từ BGH
 */
export async function saveBghRequestService({
  bghTargetFile,
  academicYear,
  selectedUsername,
  subject,
  bghRequestText,
}) {
  if (!bghTargetFile || !bghTargetFile.id) return { success: false };

  const yearCol = `KEHOACH_DAYHOC_${academicYear}`;
  const rawTeacher = selectedUsername || bghTargetFile.giaoVien || "";
  const teacherId = rawTeacher.trim().toUpperCase();
  const fileId = bghTargetFile.id;

  // 1. Đọc document gốc của giáo viên hiện tại để xử lý mảng bghNotifications
  const teacherRef = doc(db, yearCol, teacherId);
  const teacherSnap = await getDoc(teacherRef);
  const teacherData = teacherSnap.exists() ? teacherSnap.data() : {};
  let notifications = teacherData.bghNotifications || [];

  // Chuẩn hóa tương thích ngược nếu phần tử là string
  notifications = notifications.map((item) =>
    typeof item === "string"
      ? { fileId: item, content: "Yêu cầu từ BGH", read: false }
      : item
  );

  // Kiểm tra xem file này đã có thông báo chưa
  const existingIndex = notifications.findIndex((n) => n.fileId === fileId);
  const newNotificationItem = {
    fileId: fileId,
    content: bghRequestText,
    read: false, // Mặc định giáo viên chưa đọc/chưa xác nhận
    createdAt: new Date(),
  };

  if (existingIndex >= 0) {
    notifications[existingIndex] = newNotificationItem;
  } else {
    notifications.push(newNotificationItem);
  }

  // 2. Lưu mảng mới vào document giáo viên
  await setDoc(
    teacherRef,
    {
      bghNotifications: notifications,
      statsChanged: true,
      updatedAt: new Date(),
    },
    { merge: true }
  );

  return {
    success: true,
    fileId,
  };
}

/**
 * 4. Hàm dịch vụ xóa yêu cầu chỉnh sửa từ BGH
 */
export async function deleteBghRequestService({
  bghTargetFile,
  academicYear,
  selectedUsername,
}) {
  if (!bghTargetFile || !bghTargetFile.id) return { success: false };

  const yearCol = `KEHOACH_DAYHOC_${academicYear}`;
  const teacherId = (selectedUsername || bghTargetFile.giaoVien || "").trim().toUpperCase();
  const fileId = bghTargetFile.id;

  // 1. Lọc bỏ thông báo ứng với fileId này ra khỏi mảng
  const teacherRef = doc(db, yearCol, teacherId);
  const teacherSnap = await getDoc(teacherRef);

  if (teacherSnap.exists()) {
    const data = teacherSnap.data();
    let notifications = data.bghNotifications || [];
    
    notifications = notifications.map((item) =>
      typeof item === "string"
        ? { fileId: item, content: "Yêu cầu từ BGH", read: false }
        : item
    );

    notifications = notifications.filter((n) => n.fileId !== fileId);

    await setDoc(
      teacherRef,
      {
        bghNotifications: notifications,
        statsChanged: true,
        updatedAt: new Date(),
      },
      { merge: true }
    );
  }

  return {
    success: true,
    fileId,
  };
}