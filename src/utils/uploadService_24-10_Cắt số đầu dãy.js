import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

// URL Google Apps Script mới của bạn
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyzr9uLXSaFvkG5D2NTf_lGmi5s-0K8_lRBFlSl5O2eNKmSta3XfqNiasCuSCtRcag5/exec";

// Hàm chuyển đổi file sang Base64
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = (error) => reject(error);
  });
};

// Hàm upload hàng loạt giúp gom chung thư mục, không bị trùng lặp
export async function uploadBatchKeHoachDayHoc(files, metadata) {
  try {
    // 1. Chuyển tất cả file sang định dạng base64 đồng thời
    const formattedFiles = await Promise.all(
      files.map(async (file) => ({
        filename: file.name,
        mimetype: file.type,
        filedata: await fileToBase64(file),
      }))
    );

    const payload = {
      files: formattedFiles,
      academicYear: metadata.academicYear,
      nhomPhanLoai: metadata.nhomPhanLoai,
      giaoVien: metadata.giaoVien,
      monHoc: metadata.monHoc,
      khoi: metadata.khoi
    };

    // 2. Gửi MỘT REQUEST duy nhất lên Google Apps Script
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    if (result.status !== "success") {
      throw new Error(result.message || "Lỗi khi lưu file lên Google Drive");
    }

    // 3. Ghi đồng loạt các document vào Firestore
    const yearCol = `KEHOACH_DAYHOC_${metadata.academicYear || "2026-2027"}`;
    const teacherDoc = metadata.giaoVien || "Chua_ro_GV";
    const subjectSubCol = metadata.monHoc || "Chung";

    const parentColRef = collection(db, yearCol, teacherDoc, subjectSubCol);

    const firestorePromises = result.files.map(async (fileRes) => {
      const tempDocRef = doc(parentColRef);
      const khoiRaw = metadata.khoi || "Khac";
      const khoiPrefix = khoiRaw
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "_");

      const customDocId = `${khoiPrefix}_${tempDocRef.id}`;
      const finalDocRef = doc(db, yearCol, teacherDoc, subjectSubCol, customDocId);

      const docData = {
        fileName: fileRes.fileName,
        khoi: metadata.khoi,
        tuan: metadata.tuan || "",
        fileId: fileRes.fileId,
        fileUrl: fileRes.fileUrl,
        downloadUrl: fileRes.downloadUrl,
        createdAt: serverTimestamp()
      };

      await setDoc(finalDocRef, docData);
      return { id: customDocId, ...docData };
    });

    const savedFiles = await Promise.all(firestorePromises);

    return { success: true, files: savedFiles };

  } catch (error) {
    console.error("Lỗi upload batch:", error);
    return { success: false, error: error.message };
  }
}

// 🌟 Hàm mới: Xóa file trên Google Drive thông qua Apps Script
export async function deleteGoogleDriveFile(fileId) {
  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "delete",
        fileId: fileId
      })
    });

    const result = await response.json();
    if (result.status !== "success") {
      throw new Error(result.message || "Không thể xóa file trên Google Drive");
    }
    return { success: true };
  } catch (error) {
    console.error("Lỗi xóa file trên Google Drive:", error);
    return { success: false, error: error.message };
  }
}