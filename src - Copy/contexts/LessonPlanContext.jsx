import React, { createContext, useContext, useState, useCallback } from "react";
import { db } from "../firebase";
import { 
  collection, 
  getDocs, 
  deleteDoc, 
  doc 
} from "firebase/firestore";
import { uploadBatchKeHoachDayHoc, deleteGoogleDriveFile } from "../utils/uploadService";

const LessonPlanContext = createContext();

export function LessonPlanProvider({ children }) {
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);

  // 🛠️ Helper lấy dữ liệu từ localStorage an toàn
  const getStorageData = (key) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error("Lỗi đọc localStorage:", error);
      return null;
    }
  };

  // 🛠️ Helper lưu dữ liệu vào localStorage an toàn
  const setStorageData = (key, data) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error("Lỗi ghi localStorage:", error);
    }
  };

  // 📂 1. Lấy danh sách file (Kiểm tra localStorage riêng theo từng GV/Năm/Môn/Lớp)
  const getFileList = useCallback(async ({ academicYear, teacherName, subject, className }, forceRefresh = false) => {
    if (!teacherName || !subject || !academicYear || !className) return [];

    // 🔑 Khóa độc lập cho từng giáo viên, năm học, môn, lớp
    // Ví dụ: "LP_FILES_2026-2027_NGUYENVANA_TOAN_1"
    const storageKey = `LP_FILES_${academicYear}_${teacherName}_${subject}_${className}`;

    // Nếu có trong localStorage và không bắt buộc refresh -> lấy ra dùng ngay
    if (!forceRefresh) {
      const cachedData = getStorageData(storageKey);
      if (cachedData) {
        return cachedData;
      }
    }

    setLoadingFiles(true);
    try {
      const yearCol = `KEHOACH_DAYHOC_${academicYear}`;
      const filesRef = collection(db, yearCol, teacherName, subject);
      const querySnapshot = await getDocs(filesRef);
      const selectedGrade = String(className).split(".")[0];
      const files = [];

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const docId = docSnap.id;
        const idMatch = docId.match(/^Khoi_(\d+)_/i);
        const khoiValue = String(data.khoi || data.className || "").trim();
        const khoiMatch = khoiValue.match(/^(?:khối|khoi|lớp|lop)\s*(\d+)/i);
        const documentGrade = idMatch?.[1] || khoiMatch?.[1];

        const matchesClass =
          documentGrade === selectedGrade ||
          khoiValue === `Khối ${className}` ||
          khoiValue === String(className);

        if (matchesClass) {
          files.push({ id: docSnap.id, ...data });
        }
      });

      files.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });

      // 💾 Lưu vào localStorage với khóa riêng của giáo viên này
      setStorageData(storageKey, files);
      return files;
    } catch (err) {
      console.error("Lỗi khi tải danh sách file:", err);
      return [];
    } finally {
      setLoadingFiles(false);
    }
  }, []);

  // 📊 2. Lấy số liệu thống kê cá nhân giáo viên (Lưu riêng theo giáo viên và năm học)
  const getTeacherStats = useCallback(async ({ academicYear, teacherName, teacherRole, teacherAssignedSubjects, assignedClassesList, allMonHoc, lopMonHocMap }, forceRefresh = false) => {
    if (!teacherName || !academicYear) return [];

    // 🔑 Khóa thống kê riêng cho từng giáo viên: "LP_STATS_2026-2027_NGUYENVANA"
    const storageKey = `LP_STATS_${academicYear}_${teacherName}`;

    if (!forceRefresh) {
      const cachedStats = getStorageData(storageKey);
      if (cachedStats) {
        return cachedStats;
      }
    }

    setLoadingStats(true);
    try {
      const yearCol = `KEHOACH_DAYHOC_${academicYear}`;
      const stats = [];
      const isGVCN = teacherRole === "GVCN";
      const classCode = String(assignedClassesList[0] || "1");
      const selectedGrade = classCode.split(".")[0];

      let subjectsToQuery = [];
      if (isGVCN) {
        subjectsToQuery = allMonHoc
          .filter((sub) => {
            const grades = (sub.grades || []).map((g) => String(g).split(".")[0]);
            return grades.length === 0 || grades.includes(selectedGrade);
          })
          .map((sub) => sub.name);
      } else if (teacherRole === "BM") {
        subjectsToQuery = teacherAssignedSubjects.filter((s) => !String(s).toLowerCase().includes("tất cả"));
      } else {
        subjectsToQuery = teacherAssignedSubjects;
      }
      subjectsToQuery = [...new Set(subjectsToQuery.filter(Boolean))];

      for (const subjectName of subjectsToQuery) {
        try {
          const subjectRef = collection(db, yearCol, teacherName, subjectName);
          const subjectSnap = await getDocs(subjectRef);
          const entry = { subject: subjectName, username: teacherName };

          subjectSnap.forEach((docSnap) => {
            const data = docSnap.data();
            const docId = docSnap.id;
            const idMatch = docId.match(/^Khoi_(\d+)_/i);
            let grade = idMatch?.[1];

            if (!grade) {
              const khoiValue = String(data.khoi || data.className || "").trim();
              const valueMatch = khoiValue.match(/^(?:khối|khoi|lớp|lop)\s*(\d+)/i);
              grade = valueMatch?.[1];
            }

            const hasFile = /^Khoi_\d+_/i.test(docId) || Boolean(data.fileURL || data.fileUrl || data.url || data.fileName || data.tenFile);
            if (!hasFile) return;

            if (isGVCN) {
              entry[classCode] = (entry[classCode] || 0) + 1;
            } else if (grade) {
              entry[grade] = (entry[grade] || 0) + 1;
            }
          });
          stats.push(entry);
        } catch (error) {
          console.error(`Lỗi thống kê môn "${subjectName}":`, error);
        }
      }

      // 💾 Lưu thống kê vào localStorage
      setStorageData(storageKey, stats);
      return stats;
    } catch (error) {
      console.error("Lỗi khi thống kê cá nhân:", error);
      return [];
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // 📤 3. Thêm file mới & tự động làm sạch kho lưu trữ riêng của GV đó
  const uploadFilesToContext = async ({ files, metadata, academicYear, teacherName, subject, className }) => {
    let groupFolder = `Khối ${className}`;
    if (metadata.teacherRole === "TA") groupFolder = "Tiếng Anh";
    else if (metadata.teacherRole === "BM") groupFolder = "Bộ môn";

    const uploadMetadata = {
      giaoVien: teacherName,
      khoi: `Khối ${className}`,
      monHoc: subject,
      academicYear: academicYear,
      nhomPhanLoai: groupFolder,
    };

    const res = await uploadBatchKeHoachDayHoc(files, uploadMetadata);
    if (!res.success) throw new Error(res.error);

    // Xóa cache cũ trong localStorage của đúng file và thống kê của giáo viên này để cập nhật mới
    const storageKey = `LP_FILES_${academicYear}_${teacherName}_${subject}_${className}`;
    const statsStorageKey = `LP_STATS_${academicYear}_${teacherName}`;
    localStorage.removeItem(storageKey);
    localStorage.removeItem(statsStorageKey);

    const updatedFiles = await getFileList({ academicYear, teacherName, subject, className }, true);
    return updatedFiles;
  };

  // 🗑️ 4. Xóa file & tự động cập nhật localStorage riêng của GV đó
  const deleteFilesFromContext = async ({ filesToDelete, academicYear, teacherName, subject, className }) => {
    const yearCol = `KEHOACH_DAYHOC_${academicYear}`;
    
    for (const file of filesToDelete) {
      if (file.fileId) {
        await deleteGoogleDriveFile(file.fileId);
      }
      await deleteDoc(doc(db, yearCol, teacherName, subject, file.id));
    }

    // Xóa cache cũ trong localStorage của đúng file và thống kê của giáo viên này
    const storageKey = `LP_FILES_${academicYear}_${teacherName}_${subject}_${className}`;
    const statsStorageKey = `LP_STATS_${academicYear}_${teacherName}`;
    localStorage.removeItem(storageKey);
    localStorage.removeItem(statsStorageKey);

    const updatedFiles = await getFileList({ academicYear, teacherName, subject, className }, true);
    return updatedFiles;
  };

  return (
    <LessonPlanContext.Provider
      value={{
        getFileList,
        getTeacherStats,
        uploadFilesToContext,
        deleteFilesFromContext,
        loadingFiles,
        loadingStats,
      }}
    >
      {children}
    </LessonPlanContext.Provider>
  );
}

export function useLessonPlan() {
  return useContext(LessonPlanContext);
}