import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { fetchTeacherStatsData } from "./thongKe";

/**
 * 🚀 Tải và xử lý thống kê cá nhân của giáo viên, đồng bộ cache và cập nhật cờ statsBGHChanged
 */
export const taiThongKeGiaoVien = async ({
  isBGH,
  isAdmin,
  selectedUsername,
  academicYear,
  subject,
  className,
  phanQuyenMap,
  allMonHoc,
  getTeacherStats,
  updateTeacherStats,
  fetchFileListFn, // 🌟 Truyền hàm fetchFileList gốc từ component vào đây
  setStatsData,
  setLoadingFiles,
  setLoadingStats,
  isCancelled,
}) => {
  if (
    !isBGH ||
    !selectedUsername ||
    !academicYear ||
    !subject ||
    !className ||
    Object.keys(phanQuyenMap).length === 0 ||
    allMonHoc.length === 0
  ) {
    return;
  }

  const teacherName = selectedUsername.trim().toUpperCase();
  const cacheKey = `${academicYear}_${teacherName}`;

  const teacherRef = doc(
    db,
    `KEHOACH_DAYHOC_${academicYear}`,
    teacherName
  );

  setLoadingFiles(true);
  setLoadingStats(true);

  try {
    // BƯỚC 1: Đọc cờ cập nhật dành riêng cho BGH trên Firestore
    const teacherSnap = await getDoc(teacherRef);

    if (isCancelled()) return;

    const teacherExists = teacherSnap.exists();
    const teacherData = teacherExists ? teacherSnap.data() : {};
    const statsBGHChanged = teacherData.statsBGHChanged === true;

    // BƯỚC 2: Gọi hàm fetchFileList được truyền vào từ component
    const filesLoaded = fetchFileListFn ? await fetchFileListFn() : false;

    if (isCancelled()) return;

    if (statsBGHChanged && !filesLoaded) {
      console.error("Tải danh sách file thất bại. Giữ nguyên statsBGHChanged = true.");
      return;
    }

    // BƯỚC 3: Dùng Cache nếu không có thay đổi
    const cachedStats = getTeacherStats(cacheKey);
    const hasCache = Array.isArray(cachedStats) && cachedStats.length > 0;

    if (teacherExists && !statsBGHChanged && hasCache) {
      setStatsData(cachedStats);
      setLoadingStats(false);
      setLoadingFiles(false);
      return;
    }

    // BƯỚC 4: Tải thống kê từ Firestore
    let statsLoaded = false;

    await fetchTeacherStatsData({
      isAdmin,
      selectedUsername,
      academicYear,
      phanQuyenMap,
      allMonHoc,

      setLoadingStats: (loading) => {
        if (!isCancelled()) {
          setLoadingStats(loading);
        }
      },

      setStatsData: (data) => {
        if (isCancelled() || !Array.isArray(data)) return;

        setStatsData(data);
        updateTeacherStats(cacheKey, data);
        statsLoaded = true;
      },
    });

    if (isCancelled()) return;

    // BƯỚC 5: Chỉ tắt cờ statsBGHChanged khi thành công
    if (teacherExists && statsBGHChanged) {
      if (!filesLoaded || !statsLoaded) {
        console.error("Không thể cập nhật statsBGHChanged = false do thiếu dữ liệu.");
        return;
      }

      try {
        await updateDoc(teacherRef, {
          statsBGHChanged: false,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        console.error("Lỗi cập nhật statsBGHChanged:", error);
      }
    }
  } catch (error) {
    if (!isCancelled()) {
      console.error("Lỗi tải dữ liệu BGH:", error);
    }
  } finally {
    if (!isCancelled()) {
      setLoadingFiles(false);
      setLoadingStats(false);
    }
  }
};