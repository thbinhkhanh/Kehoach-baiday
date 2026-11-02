import { collection, doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyzr9uLXSaFvkG5D2NTf_lGmi5s-0K8_lRBFlSl5O2eNKmSta3XfqNiasCuSCtRcag5/exec";

const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = (error) => reject(error);
  });
};

export async function uploadBatchKeHoachDayHoc(files, metadata) {
  try {
    const formattedFiles = await Promise.all(
      files.map(async (file) => ({
        filename: file.name,
        mimetype: file.type,
        filedata: await fileToBase64(file),
      }))
    );

    const activeTab = metadata.activeTab ?? 0;

    // 1. Payload gửi lên Google Drive (Giữ nguyên gọn gàng)
    let payload = {
      files: formattedFiles,
      academicYear: metadata.academicYear,
      nhomPhanLoai: metadata.nhomPhanLoai,
      giaoVien: metadata.giaoVien,
      monHoc: metadata.monHoc,
      khoi: metadata.khoi
    };

    if (activeTab === 1) {
      payload.giaoVien = "Đề KTĐK";
      delete payload.monHoc;
      delete payload.khoi;
    } else if (activeTab === 2) {
      payload.giaoVien = "BIÊN BẢN";
      delete payload.monHoc;
      delete payload.khoi;
    }

    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    if (result.status !== "success") {
      throw new Error(result.message || "Lỗi khi lưu file lên Google Drive");
    }

    // 2. 🌟 Cấu trúc lưu trữ trên Firestore chuẩn gọn gàng như KHBD
    const yearStr = metadata.academicYear || "2026-2027";
    let mainColName = `KEHOACH_DAYHOC_${yearStr}`;
    
    // Xác định Document nhóm chính (Bo_mon, Tieng_Anh, hoặc Khối X)
    let docIdentifier = "Chung";
    if (metadata.nhomPhanLoai === "Tiếng Anh" || metadata.teacherRole === "TA") {
      docIdentifier = "Tieng_Anh";
    } else if (metadata.teacherRole === "BM" || metadata.nhomPhanLoai === "Bộ môn") {
      docIdentifier = "Bo_mon";
    } else if (metadata.khoi) {
      docIdentifier = metadata.khoi;
    } else {
      docIdentifier = metadata.nhomPhanLoai || "Chung";
    }
    docIdentifier = docIdentifier.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");

    let parentColRef;

    if (activeTab === 1) {
      // Tab Đề KTĐK: DE_KTDK_{year} -> [Nhóm: Bo_mon/Tieng_Anh] -> [Tên môn học]
      mainColName = `DE_KTDK_${yearStr}`;
      const subjectName = (metadata.monHoc || "Chung").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");
      
      parentColRef = collection(db, mainColName, docIdentifier, subjectName);
    } else if (activeTab === 2) {
      // Tab Biên bản: BIEN_BAN_{year} -> [Nhóm: Bo_mon/Tieng_Anh] -> FILES_LIST
      mainColName = `BIEN_BAN_${yearStr}`;
      
      parentColRef = collection(db, mainColName, docIdentifier, "FILES_LIST");
    } else {
      // Tab KHBD (Tab 0)
      parentColRef = collection(db, mainColName, metadata.giaoVien || "Chua_ro_GV", metadata.monHoc || "Chung");
    }

    const firestorePromises = result.files.map(async (fileRes) => {
      let customDocId = "";

      // 🌟 Nếu là Tab KHBD (activeTab === 0), tạo ID chuẩn Khoi_<Số Khối>_<Mã ngẫu nhiên>
      if (activeTab === 0) {
        const gradeKey = String(metadata.khoi || "").replace(/[^0-9]/g, "") || "1";
        const randomString = Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12);
        customDocId = `Khoi_${gradeKey}_${randomString}`;
      } else {
        // 🌟 Nếu là Tab Đề KTĐK (activeTab === 1), thêm tiền tố LOP_{grade}_ vào trước ID
        let prefix = "";
        if (activeTab === 1 && metadata.khoi) {
          const gradeKey = String(metadata.khoi).split(".")[0].replace(/[^0-9]/g, "") || metadata.khoi;
          prefix = `LOP_${gradeKey}_`;
        }

        const rawName = fileRes.fileName.substring(0, fileRes.fileName.lastIndexOf(".")) || fileRes.fileName;
        customDocId = (prefix + rawName)
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "") 
          .replace(/[^a-zA-Z0-9_]/g, "_")  
          .replace(/_+/g, "_")             
          .toUpperCase();                
      }

      const finalDocRef = doc(parentColRef, customDocId);

      const docData = {
        fileName: fileRes.fileName,
        giaoVien: metadata.giaoVien || "",
        // 🌟 Nếu là tab Biên bản (activeTab === 2), không lưu hoặc để trống thông tin khối
        khoi: activeTab === 2 ? "" : (metadata.khoi || ""),
        monHoc: metadata.monHoc || "",
        tuan: metadata.tuan || "",
        tabIndex: activeTab,
        fileId: fileRes.fileId,
        fileUrl: fileRes.fileUrl,
        downloadUrl: fileRes.downloadUrl,
        createdAt: serverTimestamp()
      };

      await setDoc(finalDocRef, docData);
      return { id: customDocId, ...docData };
    });

    const savedFiles = await Promise.all(firestorePromises);

    // 🌟 3. CẬP NHẬT TĂNG SỐ LIỆU TRỰC TIẾP VÀO THONGKE_{academicYear} (CHỈ LƯU "Khối X", BỎ KHÓA SỐ ĐƠN ĐỘC)
    if (activeTab === 0 && metadata.giaoVien) {
      const teacherKey = metadata.giaoVien.trim().toUpperCase();
      const thongKeRef = doc(db, `THONGKE_${yearStr}`, teacherKey);
      const thongKeSnap = await getDoc(thongKeRef);

      const existingData = thongKeSnap.exists() ? thongKeSnap.data() : {};
      const uploadCount = savedFiles.length;
      const newTotalFiles = (Number(existingData.totalFiles) || 0) + uploadCount;

      const subjectName = metadata.monHoc || "Chung";
      const gradeNum = String(metadata.khoi || "").replace(/[^0-9]/g, "") || "4";
      const gradeLabel = `Khối ${gradeNum}`;

      // Cộng dồn tổng số file theo môn (subjects)
      const subjectsMap = { ...(existingData.subjects || {}) };
      subjectsMap[subjectName] = (Number(subjectsMap[subjectName]) || 0) + uploadCount;

      // Cộng dồn chi tiết theo môn và khối (classBreakdown - CHỈ cập nhật vào gradeLabel "Khối X")
      const classBreakdownMap = { ...(existingData.classBreakdown || {}) };
      if (!classBreakdownMap[subjectName]) {
        classBreakdownMap[subjectName] = {};
      }
      const subBreakdown = { ...classBreakdownMap[subjectName] };
      
      // Chỉ tăng cho "Khối X", không thêm khóa số thuần túy (như "4")
      subBreakdown[gradeLabel] = (Number(subBreakdown[gradeLabel]) || 0) + uploadCount;
      
      classBreakdownMap[subjectName] = subBreakdown;

      // Cập nhật recentFiles (giữ tối đa 10 file gần nhất)
      const currentRecent = Array.isArray(existingData.recentFiles) ? existingData.recentFiles : [];
      const newRecentItems = savedFiles.map((file) => ({
        class: gradeLabel,
        fileId: file.fileId || "",
        fileUrl: file.fileUrl || "",
        name: file.fileName || "",
        subject: subjectName,
        updatedAt: new Date().toISOString(),
      }));
      const updatedRecentFiles = [...newRecentItems, ...currentRecent].slice(0, 10);

      await setDoc(
        thongKeRef,
        {
          teacherId: teacherKey,
          teacherName: metadata.giaoVien,
          group: metadata.teacherRole || existingData.group || "BM",
          totalFiles: newTotalFiles,
          subjects: subjectsMap,
          classBreakdown: classBreakdownMap,
          recentFiles: updatedRecentFiles,
          lastUpdated: new Date().toISOString(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    return { success: true, files: savedFiles };

  } catch (error) {
    console.error("Lỗi upload batch:", error);
    return { success: false, error: error.message };
  }
}

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