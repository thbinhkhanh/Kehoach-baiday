import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

/**
 * 1. Hàm tìm kiếm thông tin chi tiết của file dựa vào fileId khi click vào thông báo
 */
export async function openNotificationByFileIdService({
  fileId,
  bghNotifications,
  fileList,
  assignedSubjectsList,
  academicYear,
  teacherName,
  fallbackSubject,
  fallbackClass,
}) {
  // Tìm trong mảng bghNotifications xem có nội dung gì
  const notif = bghNotifications.find((n) => n.fileId === fileId);
  const contentText = notif ? notif.content : "BGH yêu cầu điều chỉnh kế hoạch bài dạy.";

  // Tìm file trong fileList hiện tại của màn hình
  let foundFile = fileList.find((f) => f.id === fileId);

  if (foundFile) {
    return {
      success: true,
      requestData: {
        ...foundFile,
        bghRequest: contentText,
        tenBai: foundFile.tenBai || foundFile.metadata?.tenBai || foundFile.fileName || "Kế hoạch bài dạy",
        subject: foundFile.subject || foundFile.metadata?.monHoc || fallbackSubject,
        khoi: foundFile.khoi || foundFile.metadata?.khoiLop || foundFile.lop || fallbackClass,
      },
      contentText,
    };
  }

  // Nếu file nằm ở môn/lớp khác, quét tìm trong các môn phân công
  const yearCol = `KEHOACH_DAYHOC_${academicYear}`;
  for (const sub of assignedSubjectsList) {
    try {
      const docRef = doc(db, yearCol, teacherName, sub, fileId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        foundFile = { id: docSnap.id, subject: sub, ...docSnap.data() };
        return {
          success: true,
          requestData: {
            ...foundFile,
            bghRequest: contentText,
            tenBai: foundFile.tenBai || foundFile.metadata?.tenBai || foundFile.fileName || "Kế hoạch bài dạy",
            subject: foundFile.subject || foundFile.metadata?.monHoc || sub,
            khoi: foundFile.khoi || foundFile.metadata?.khoiLop || foundFile.lop || "Chưa xác định",
          },
          contentText,
        };
      }
    } catch (e) {
      // Bỏ qua lỗi từng sub nếu không tìm thấy
    }
  }

  // Fallback an toàn nếu không tìm thấy file vật lý
  return {
    success: true,
    requestData: {
      id: fileId,
      bghRequest: contentText,
      tenBai: "Không tìm thấy file chi tiết",
      subject: "Chưa xác định",
      khoi: "Chưa xác định",
    },
    contentText,
  };
}

/**
 * 2. Hàm xử lý xác nhận "Đã hiểu" (cập nhật trạng thái read = true lên Firestore)
 */
export async function markBghRequestAsReadService({
  currentRequest,
  academicYear,
  teacherName,
}) {
  if (!currentRequest || !currentRequest.id) return { success: false };

  const yearCol = `KEHOACH_DAYHOC_${academicYear}`;
  const docId = currentRequest.id;

  const teacherRef = doc(db, yearCol, teacherName);
  const teacherSnap = await getDoc(teacherRef);

  let updatedNotifications = [];

  if (teacherSnap.exists()) {
    const data = teacherSnap.data();
    let notifications = data.bghNotifications || [];

    notifications = notifications.map((n) => {
      const currentFileId = typeof n === "string" ? n : n.fileId;
      const currentContent = typeof n === "string" ? "Yêu cầu từ BGH" : n.content;

      if (currentFileId === docId) {
        return { fileId: currentFileId, content: currentContent, read: true };
      }
      return typeof n === "string" ? { fileId: n, content: "Yêu cầu từ BGH", read: false } : n;
    });

    await setDoc(
      teacherRef,
      {
        bghNotifications: notifications,
        statsChanged: true,
        updatedAt: new Date(),
      },
      { merge: true }
    );

    updatedNotifications = notifications;
  }

  return {
    success: true,
    docId,
    updatedNotifications,
  };
}