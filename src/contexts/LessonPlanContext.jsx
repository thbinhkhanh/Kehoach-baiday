
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";

const LessonPlanContext = createContext(null);

// Khóa lưu dữ liệu trong bộ nhớ trình duyệt
const FILES_STORAGE_KEY = "lesson_plan_file_lists_v1";
const STATS_STORAGE_KEY = "lesson_plan_teacher_stats_v1";

// Đọc dữ liệu đã lưu
const readStorage = (key) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : {};
  } catch (error) {
    console.warn(`Không đọc được dữ liệu ${key}:`, error);
    return {};
  }
};

// ======================================================
// CONTEXT: QUẢN LÝ VÀ ĐỒNG BỘ TRẠNG THÁI
// ======================================================

export function LessonPlanProvider({ children }) {
  // Khôi phục dữ liệu ngay khi khởi tạo Context
  const [fileLists, setFileLists] = useState(() =>
    readStorage(FILES_STORAGE_KEY)
  );

  const [teacherStats, setTeacherStats] = useState(() =>
    readStorage(STATS_STORAGE_KEY)
  );

  const [loadingFiles, setLoadingFiles] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);

  // ------------------------------------------------------
  // TỰ ĐỘNG LƯU CONTEXT VÀO LOCALSTORAGE
  // ------------------------------------------------------

  useEffect(() => {
    try {
      localStorage.setItem(
        FILES_STORAGE_KEY,
        JSON.stringify(fileLists)
      );
    } catch (error) {
      console.warn("Không thể lưu danh sách file:", error);
    }
  }, [fileLists]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STATS_STORAGE_KEY,
        JSON.stringify(teacherStats)
      );
    } catch (error) {
      console.warn("Không thể lưu thống kê:", error);
    }
  }, [teacherStats]);

  // ------------------------------------------------------
  // CẬP NHẬT DANH SÁCH FILE
  // ------------------------------------------------------

  const updateFileList = useCallback((key, files) => {
    setFileLists((prev) => ({
      ...prev,
      [key]: files,
    }));
  }, []);

  // ------------------------------------------------------
  // CẬP NHẬT THỐNG KÊ
  // ------------------------------------------------------

  const updateTeacherStats = useCallback((key, stats) => {
    setTeacherStats((prev) => ({
      ...prev,
      [key]: stats,
    }));
  }, []);

  // ------------------------------------------------------
  // LẤY DỮ LIỆU
  // ------------------------------------------------------

  const getFileList = useCallback(
    (key) => fileLists[key] ?? [],
    [fileLists]
  );

  const getTeacherStats = useCallback(
    (key) => teacherStats[key] ?? [],
    [teacherStats]
  );

  // ------------------------------------------------------
  // CẬP NHẬT TRẠNG THÁI GIAO DIỆN
  // ------------------------------------------------------

  const uploadFilesToContext = useCallback(
    (key, files) => {
      updateFileList(key, files);
    },
    [updateFileList]
  );

  const deleteFilesFromContext = useCallback(
    (key, files) => {
      updateFileList(key, files);
    },
    [updateFileList]
  );

  // ------------------------------------------------------
  // DỮ LIỆU DÙNG CHUNG
  // ------------------------------------------------------

  const value = {
    fileLists,
    setFileLists,
    updateFileList,

    teacherStats,
    setTeacherStats,
    updateTeacherStats,

    getFileList,
    getTeacherStats,

    uploadFilesToContext,
    deleteFilesFromContext,

    loadingFiles,
    setLoadingFiles,

    loadingStats,
    setLoadingStats,
  };

  return (
    <LessonPlanContext.Provider value={value}>
      {children}
    </LessonPlanContext.Provider>
  );
}

// ======================================================
// CUSTOM HOOK
// ======================================================

export function useLessonPlan() {
  const context = useContext(LessonPlanContext);

  if (!context) {
    throw new Error(
      "useLessonPlan phải được sử dụng bên trong LessonPlanProvider."
    );
  }

  return context;
}
