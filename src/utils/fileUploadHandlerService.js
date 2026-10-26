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

  if (!subject || !className || !teacherName) {
    showMessage(
      "⚠️ Thiếu thông tin Môn học, Lớp hoặc Tên giáo viên!",
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

    let groupFolder = `Khối ${className}`;

    if (teacherRole === "TA") {
      groupFolder = "Tiếng Anh";
    } else if (teacherRole === "BM") {
      groupFolder = "Bộ môn";
    }

    const metadata = {
      giaoVien: teacherName,
      khoi: `Khối ${className}`,
      monHoc: subject,
      academicYear,
      nhomPhanLoai: groupFolder,
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
          updatedAt: new Date(),
        },
        { merge: true }
      );
    } catch (flagError) {
      console.error("Lỗi bật cờ thống kê:", flagError);
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