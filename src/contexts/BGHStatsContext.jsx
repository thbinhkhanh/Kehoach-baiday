import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";

const BGHStatsContext = createContext(null);

const STATS_STORAGE_KEY = "bgh_teacher_stats_v1";
const SCHOOL_SUMMARY_STORAGE_KEY = "bgh_school_summary_v1"; // 🌟 Thêm key lưu tổng hợp toàn trường

const readStorage = (key) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : {};
  } catch (error) {
    console.warn(`Không đọc được dữ liệu ${key}:`, error);
    return {};
  }
};

export function BGHStatsProvider({ children }) {
  // Khôi phục dữ liệu thống kê cá nhân
  const [teacherStats, setTeacherStats] = useState(() =>
    readStorage(STATS_STORAGE_KEY)
  );

  // 🌟 Thêm state lưu tổng hợp toàn trường theo năm học (VD: {"2026-2027": { ...data... }})
  const [schoolSummaryCache, setSchoolSummaryCache] = useState(() =>
    readStorage(SCHOOL_SUMMARY_STORAGE_KEY)
  );

  const [loadingStats, setLoadingStats] = useState(false);

  const teacherStatsRef = useRef(teacherStats);
  const schoolSummaryRef = useRef(schoolSummaryCache); // 🌟 Ref cho tổng hợp toàn trường

  useEffect(() => {
    teacherStatsRef.current = teacherStats;
  }, [teacherStats]);

  useEffect(() => {
    schoolSummaryRef.current = schoolSummaryCache;
  }, [schoolSummaryCache]);

  // Lưu thống kê cá nhân vào localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(teacherStats));
    } catch (error) {
      console.warn("Không thể lưu dữ liệu thống kê:", error);
    }
  }, [teacherStats]);

  // 🌟 Lưu tổng hợp toàn trường vào localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        SCHOOL_SUMMARY_STORAGE_KEY,
        JSON.stringify(schoolSummaryCache)
      );
    } catch (error) {
      console.warn("Không thể lưu dữ liệu tổng hợp toàn trường:", error);
    }
  }, [schoolSummaryCache]);

  const updateTeacherStats = useCallback((key, stats) => {
    setTeacherStats((prev) => {
      const currentStats = prev[key];
      if (
        JSON.stringify(currentStats ?? []) ===
        JSON.stringify(stats ?? [])
      ) {
        return prev;
      }
      return { ...prev, [key]: stats };
    });
  }, []);

  const getTeacherStats = useCallback((key) => {
    return teacherStatsRef.current[key] ?? [];
  }, []);

  // 🌟 Hàm cập nhật cache tổng hợp toàn trường theo năm học
  const updateSchoolSummary = useCallback((year, data) => {
    setSchoolSummaryCache((prev) => ({
      ...prev,
      [year]: data,
    }));
  }, []);

  // 🌟 Hàm lấy cache tổng hợp toàn trường theo năm học
  const getSchoolSummary = useCallback((year) => {
    return schoolSummaryRef.current[year] ?? null;
  }, []);

  const value = {
    teacherStats,
    setTeacherStats,
    updateTeacherStats,
    getTeacherStats,
    schoolSummaryCache,
    updateSchoolSummary,
    getSchoolSummary,
    loadingStats,
    setLoadingStats,
  };

  return (
    <BGHStatsContext.Provider value={value}>
      {children}
    </BGHStatsContext.Provider>
  );
}

export function useBGHStats() {
  const context = useContext(BGHStatsContext);
  if (!context) {
    throw new Error("useBGHStats phải được sử dụng bên trong BGHStatsProvider.");
  }
  return context;
}