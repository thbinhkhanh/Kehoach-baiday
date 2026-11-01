import { db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { uploadBatchKeHoachDayHoc } from "./uploadService";

/**
 * Hàm dịch vụ xử lý tải lên (upload) file kế hoạch bài dạy
 */
export async function handleUploadService({
  e,
  teacherName,
  academicYear,
  subject,
  className,
  teacherRole,
  activeTab, // 👈 1. Nhận thêm activeTab từ component Users.jsx truyền lên
  statsData,
  setUploading,
  setUploadMode,
  setUploadProgress,
  setCurrentFileMsg,
  setStatsData,
  updateTeacherStats,
  fetchFileList,
  showMessage,
}) {
  const target = e.target;
  const rawFiles = Array.from(target.files || []);
  target.value = null;

  if (rawFiles.length === 0) return;

  // Chuẩn hóa tên file, giữ nguyên tên gốc, không cắt dãy số đầu tên.
  const files = rawFiles.map((file) => {
    const lastDotIndex = file.name.lastIndexOf(".");
    let nameWithoutExt =
      lastDotIndex !== -1
        ? file.name.substring(0, lastDotIndex)
        : file.name;
    const ext =
      lastDotIndex !== -1
        ? file.name.substring(lastDotIndex)
        : "";

    nameWithoutExt = nameWithoutExt.toUpperCase().replace(/_/g, " ");
    const finalName = nameWithoutExt + ext.toLowerCase();

    return new File([file], finalName, { type: file.type });
  });

  // Chỉ chấp nhận file Word .doc và .docx.
  for (const file of files) {
    if (
      ![
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ].includes(file.type)
    ) {
      showMessage(
        `⚠️ File "${file.name}" không hợp lệ. Chỉ hỗ trợ .doc hoặc .docx`,
        "warning"
      );
      return;
    }
  }

  // 🌟 Nếu ở tab Biên bản (activeTab === 2), ta cho phép bỏ qua kiểm tra bắt buộc chọn Môn học
  if (activeTab !== 2 && (!subject || !className || !teacherName)) {
    showMessage(
      "⚠️ Thiếu thông tin Môn học, Lớp hoặc Tên giáo viên!",
      "warning"
    );
    return;
  } else if (activeTab === 2 && (!className || !teacherName)) {
    showMessage(
      "⚠️ Thiếu thông tin Lớp hoặc Tên giáo viên!",
      "warning"
    );
    return;
  }

  let progressInterval;

  try {
    setUploadMode("upload");
    setUploading(true);
    setUploadProgress(0);
    setCurrentFileMsg(`${files.length} file...`);

    // Bóc tách lấy phần khối từ className (Ví dụ: "2.4" -> "2", "1.6" -> "1")
    const gradeKey = String(className).split(".")[0].replace(/[^0-9]/g, "") || className;

    let groupFolder = `Khối ${gradeKey}`;

    if (teacherRole === "TA") {
      groupFolder = "Tiếng Anh";
    } else if (teacherRole === "BM") {
      groupFolder = "Bộ môn";
    }

    // 🌟 Kiểm tra năm học: Nếu là năm học 2026-2027 và đang ở tab KHBD (activeTab === 0),
    // ta sinh tiền tố ID dạng "Khoi_X_..." để đồng bộ với định dạng chuẩn cũ.
    let customDocIdPrefix = undefined;
    if (academicYear === "2026-2027" && activeTab === 0) {
      const randomString = Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12);
      customDocIdPrefix = `Khoi_${gradeKey}_${randomString}`;
    }

    const metadata = {
      giaoVien: teacherName,
      khoi: `Khối ${gradeKey}`,
      monHoc: subject || "Biên bản",
      academicYear,
      nhomPhanLoai: groupFolder,
      activeTab: activeTab ?? 0, // 👈 2. Đưa activeTab vào metadata truyền xuống service upload file
      customDocIdPrefix, // Truyền tiền tố ID chuẩn định dạng Khoi_X_... xuống service ghi dữ liệu
    };

    let currentProgress = 0;
    let elapsed = 0;

    progressInterval = setInterval(() => {
      elapsed++;
      const increment = Math.min(4, 0.3 + elapsed * 0.12);
      currentProgress = Math.min(90, currentProgress + increment);
      setUploadProgress(Math.round(currentProgress));
    }, 200);

    const res = await uploadBatchKeHoachDayHoc(files, metadata);

    clearInterval(progressInterval);
    progressInterval = null;

    if (!res.success) {
      throw new Error(res.error || "Tải file thất bại.");
    }

    // Bật cờ để BGH biết thống kê đã thay đổi
    try {
      const yearCol = `KEHOACH_DAYHOC_${academicYear}`;
      const teacherRef = doc(db, yearCol, teacherName);
      await setDoc(
        teacherRef,
        {
          statsChanged: true,
          statsBGHChanged: true,
          updatedAt: new Date(),
        },
        { merge: true }
      );
    } catch (flagError) {
      console.error("Lỗi bật cờ thống kê:", flagError);
    }
    
    // Bật cờ toàn trường trong CONFIG/config để báo hiệu bảng Tổng hợp toàn trường cần làm mới
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
      console.error("Lỗi bật cờ tổng hợp toàn trường trong CONFIG:", configFlagErr);
    }

    setUploadProgress(100);

    // Cập nhật danh sách file sau khi tải lên thành công.
    if (fetchFileList) {
      await fetchFileList();
    }

    // Cập nhật thống kê và Context bên ngoài setState updater.
    const newStats = statsData.map((item) => ({ ...item }));
    const entry = newStats.find((item) => item.subject === subject);

    if (entry) {
      entry[className] =
        (Number(entry[className]) || 0) + files.length;
    } else {
      newStats.push({
        subject,
        [className]: files.length,
      });
    }

    setStatsData(newStats);

    if (updateTeacherStats) {
      updateTeacherStats(
        `${academicYear}_${teacherName}`,
        newStats
      );
    }

    showMessage(
      `🎉 Đã tải thành công ${files.length} file lên hệ thống!`,
      "success"
    );
  } catch (err) {
    console.error("❌ Lỗi khi upload:", err);

    showMessage(
      "❌ Không thể tải file lên: " + err.message,
      "error"
    );
  } finally {
    if (progressInterval) {
      clearInterval(progressInterval);
    }

    setTimeout(() => {
      setUploadProgress(0);
      setCurrentFileMsg("");
      setUploading(false);
    }, 1000);
  }
}