import { db } from "../firebase";
import { deleteDoc, doc, setDoc } from "firebase/firestore";
import { deleteGoogleDriveFile } from "./uploadService";

/**
 * Hàm dịch vụ xử lý xóa file (optimistic update giao diện + xóa ngầm trên Drive & Firestore)
 */
export async function handleConfirmDeleteService({
  filesToDelete,
  academicYear,
  teacherName,
  subject,
  className,
  setFileList,
  setStatsData,
  setDeleteDialogOpen,
  updateFileList,
  updateTeacherStats,
  showMessage,
  fetchFileList,
}) {
  if (!filesToDelete || filesToDelete.length === 0) return;

  setDeleteDialogOpen(false);

  const filesDeleted = [...filesToDelete];
  const fileIdsToDelete = new Set(filesDeleted.map((f) => f.id));

  // 1. Cập nhật danh sách file trên giao diện và đồng bộ Context
  setFileList((prevList) => {
    const newList = prevList.filter((f) => !fileIdsToDelete.has(f.id));

    updateFileList(
      `${academicYear}_${teacherName}_${subject}_${className}`,
      newList
    );

    return newList;
  });

  // 2. Cập nhật thống kê trên giao diện và đồng bộ Context
  setStatsData((prevStats) => {
    const newStats = prevStats.map((item) => ({ ...item }));
    const entry = newStats.find((item) => item.subject === subject);
    const khoiKey = className;

    if (entry) {
      entry[khoiKey] = Math.max(
        0,
        (Number(entry[khoiKey]) || 0) - filesDeleted.length
      );
    }

    updateTeacherStats(`${academicYear}_${teacherName}`, newStats);

    return newStats;
  });

  showMessage("🗑️ Đã xóa file thành công!", "success");

  // 3. Xóa file trên Google Drive và Firestore ở tiến trình nền (Background)
  (async () => {
    const yearCol = `KEHOACH_DAYHOC_${academicYear}`;
    let firestoreChanged = false;
    let deletedCount = 0;

    for (const file of filesDeleted) {
      try {
        // Xóa file trên Google Drive nếu có
        if (file.fileId) {
          await deleteGoogleDriveFile(file.fileId);
        }

        // Xóa tài liệu trên Firestore
        await deleteDoc(
          doc(db, yearCol, teacherName, subject, file.id)
        );

        firestoreChanged = true;
        deletedCount++;
      } catch (err) {
        console.error(
          `Lỗi khi xóa file ${file.fileName || file.id}:`,
          err
        );
      }
    }

    // Bật cờ thống kê thay đổi nếu xóa thành công trên Firestore
    if (firestoreChanged) {
      try {
        const teacherRef = doc(db, yearCol, teacherName);
        await setDoc(
          teacherRef,
          {
            statsChanged: true,
            updatedAt: new Date(),
          },
          { merge: true }
        );
      } catch (flagError) {
        console.error("Lỗi bật cờ thống kê sau khi xóa:", flagError);
      }
    }

    if (deletedCount > 0) {
      showMessage(
        `Đã xóa thành công ${deletedCount}/${filesDeleted.length} file.`,
        deletedCount === filesDeleted.length ? "success" : "warning"
      );
    } else {
      showMessage("Không xóa được file nào trên Firestore.", "error");
    }

    // Tải lại danh sách file thực tế từ Firestore
    if (fetchFileList) {
      await fetchFileList();
    }
  })();
}