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
  activeTab = 0,     // 👈 activeTab (mặc định là 0 nếu không truyền)
  teacherRole = "GVCN", // 👈 teacherRole để xác định nhóm phân loại
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

  // Bóc tách chuẩn gradeKey (Ví dụ: "4.3" -> "4") để khớp với cấu trúc bảng thống kê tổng hợp
  const gradeKey = String(className).split(".")[0].replace(/[^0-9]/g, "") || className;

  // 1. Cập nhật danh sách file trên giao diện và đồng bộ Context
  setFileList((prevList) => {
    const newList = prevList.filter((f) => !fileIdsToDelete.has(f.id));

    updateFileList(
      `${academicYear}_${teacherName}_${subject}_Khối_${gradeKey}_tab_${activeTab}`,
      newList
    );

    return newList;
  });

  // 2. Cập nhật thống kê trên giao diện và đồng bộ Context theo đúng gradeKey
  setStatsData((prevStats) => {
    const newStats = prevStats.map((item) => ({ ...item }));
    const entry = newStats.find((item) => item.subject === subject);

    if (entry) {
      // Trừ số lượng theo đúng cột Khối (ví dụ: "4") và tổng cộng (total/count)
      entry[gradeKey] = Math.max(
        0,
        (Number(entry[gradeKey]) || 0) - filesDeleted.length
      );
      
      // Đồng thời cập nhật lại tổng số bài nộp của môn đó nếu có cấu trúc total/count
      if (entry.total !== undefined) {
        entry.total = Math.max(0, entry.total - filesDeleted.length);
      }
      if (entry.count !== undefined) {
        entry.count = Math.max(0, entry.count - filesDeleted.length);
      }
    }

    updateTeacherStats(`${academicYear}_${teacherName}`, newStats);

    return newStats;
  });

  showMessage("🗑️ Đã xóa file thành công!", "success");

  // 3. Xóa file trên Google Drive và Firestore ở tiến trình nền (Background)
  (async () => {
    const yearStr = academicYear;
    let firestoreChanged = false;
    let deletedCount = 0;

    // 🌟 Sửa lại logic xác định docIdentifier theo đúng thứ tự ưu tiên vai trò (TA -> BM -> GVCN)
    let docIdentifier = "Chung";
    if (teacherRole === "TA" || subject.toLowerCase().includes("tiếng anh")) {
      docIdentifier = "Tieng_Anh";
    } else if (teacherRole === "BM") {
      docIdentifier = "Bo_mon";
    } else if (teacherRole === "GVCN" && gradeKey) {
      docIdentifier = `Khối_${gradeKey}`;
    }
    docIdentifier = docIdentifier.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");

    for (const file of filesDeleted) {
      try {
        // Xóa file trên Google Drive nếu có
        if (file.fileId) {
          await deleteGoogleDriveFile(file.fileId);
        }

        // 🌟 Định nghĩa chuẩn xác đường dẫn doc Firestore theo từng activeTab khi xóa
        let fileDocRef;
        if (activeTab === 0) {
          // Tab 0: KHBD (KEHOACH_DAYHOC_{year} -> teacherName -> subject -> fileId)
          fileDocRef = doc(db, `KEHOACH_DAYHOC_${yearStr}`, teacherName, subject, file.id);
        } else if (activeTab === 1) {
          // Tab 1: Đề KTĐK (DE_KTDK_{year} -> docIdentifier -> subjectName -> fileId)
          const subjectName = (subject || "Chung").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");
          fileDocRef = doc(db, `DE_KTDK_${yearStr}`, docIdentifier, subjectName, file.id);
        } else if (activeTab === 2) {
          // Tab 2: Biên bản (BIEN_BAN_{year} -> docIdentifier -> FILES_LIST -> fileId)
          fileDocRef = doc(db, `BIEN_BAN_${yearStr}`, docIdentifier, "FILES_LIST", file.id);
        }

        if (fileDocRef) {
          await deleteDoc(fileDocRef);
          firestoreChanged = true;
          deletedCount++;
        }
      } catch (err) {
        console.error(
          `Lỗi khi xóa file ${file.fileName || file.id}:`,
          err
        );
      }
    }

    // 🌟 Bật đồng thời cả hai cờ thay đổi (cho User và cho BGH) nếu xóa thành công trên Firestore
    if (firestoreChanged) {
      try {
        const teacherRef = doc(db, `KEHOACH_DAYHOC_${yearStr}`, teacherName);
        await setDoc(
          teacherRef,
          {
            statsChanged: true,
            statsBGHChanged: true, // 🌟 Bổ sung cờ riêng cho BGH nhận biết
            updatedAt: new Date(),
          },
          { merge: true }
        );
      } catch (flagError) {
        console.error("Lỗi bật cờ thống kê sau khi xóa:", flagError);
      }

      // 🌟 5. Bật cờ tổng hợp toàn trường trong CONFIG/config để báo hiệu bảng Tổng hợp toàn trường cần làm mới
      try {
        const configRef = doc(db, "CONFIG", "config");
        await setDoc(
          configRef,
          {
            flagSchoolSummary: true,
            updatedAt: new Date(),
          },
          { merge: true }
        );
      } catch (configFlagErr) {
        console.error("Lỗi bật cờ tổng hợp toàn trường trong CONFIG khi xóa file:", configFlagErr);
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