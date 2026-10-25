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
  // Khôi phục dữ liệu thống kê đã lưu
  const [teacherStats, setTeacherStats] = useState(() =>
    readStorage(STATS_STORAGE_KEY)
  );

  const [loadingStats, setLoadingStats] = useState(false);

  // Giữ dữ liệu mới nhất để hàm getTeacherStats không cần đổi tham chiếu
  const teacherStatsRef = useRef(teacherStats);

  useEffect(() => {
    teacherStatsRef.current = teacherStats;
  }, [teacherStats]);

  // Lưu dữ liệu vào localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STATS_STORAGE_KEY,
        JSON.stringify(teacherStats)
      );
    } catch (error) {
      console.warn("Không thể lưu dữ liệu thống kê:", error);
    }
  }, [teacherStats]);

  // Cập nhật dữ liệu thống kê theo khóa
  const updateTeacherStats = useCallback((key, stats) => {
    setTeacherStats((prev) => {
      // Tránh cập nhật state nếu dữ liệu không thay đổi
      const currentStats = prev[key];

      if (
        JSON.stringify(currentStats ?? []) ===
        JSON.stringify(stats ?? [])
      ) {
        return prev;
      }

      return {
        ...prev,
        [key]: stats,
      };
    });
  }, []);

  // Lấy dữ liệu bằng hàm ổn định, không phụ thuộc teacherStats
  const getTeacherStats = useCallback((key) => {
    return teacherStatsRef.current[key] ?? [];
  }, []);

  const value = {
    teacherStats,
    setTeacherStats,
    updateTeacherStats,
    getTeacherStats,
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
    throw new Error(
      "useBGHStats phải được sử dụng bên trong BGHStatsProvider."
    );
  }

  return context;
}