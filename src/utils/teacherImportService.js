// src/utils/teacherImportService.js
import ExcelJS from "exceljs";
import { writeBatch, doc } from "firebase/firestore";

/**
 * Xử lý đọc file Excel danh sách giáo viên và lưu vào Firestore collection DANHSACH_GV theo từng batch
 */
export const handleFileSelectService = async (
  event,
  {
    db,
    academicYear,
    getTextCellValue,
    normalizeTeacherId,
    fetchTeachersAndAccountsData,
    setFileName,
    setMessage,
    setProgress,
    setImporting,
  }
) => {
  const file = event.target.files?.[0];
  if (!file) return;

  if (setFileName) setFileName(file.name);
  if (setMessage) setMessage(null);
  if (setProgress) setProgress(0);
  if (setImporting) setImporting(true);

  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error("File Excel không có trang tính dữ liệu.");
    }

    const teachers = new Map();

    worksheet.eachRow((row) => {
      const col0 = getTextCellValue ? getTextCellValue(row.getCell(1)).toLowerCase() : row.getCell(1).text.toLowerCase();
      const col1 = getTextCellValue ? getTextCellValue(row.getCell(2)) : row.getCell(2).text;
      const col2 = getTextCellValue ? getTextCellValue(row.getCell(3)) : row.getCell(3).text;

      if (
        !col1 ||
        col0 === "stt" ||
        col1.toLowerCase().includes("họ và tên") ||
        col1.toLowerCase().includes("ho va ten") ||
        col1.toLowerCase().includes("dạy lớp")
      ) {
        return;
      }

      const docId = normalizeTeacherId ? normalizeTeacherId(col1) : col1.trim().toUpperCase();
      const uppercaseName = col1.trim().toUpperCase();

      teachers.set(docId, {
        username: uppercaseName,
        subject: col2 ? col2.replace(/^lớp\s*/i, "").trim() : "",
        pass: "123",
        academicYear: academicYear,
        updatedAt: new Date(),
      });
    });

    const entries = Array.from(teachers.entries());
    if (entries.length === 0) {
      throw new Error("Không tìm thấy dữ liệu hợp lệ. Vui lòng kiểm tra file Excel.");
    }

    const chunkSize = 450;
    for (let i = 0; i < entries.length; i += chunkSize) {
      const batch = writeBatch(db);
      const chunk = entries.slice(i, i + chunkSize);

      chunk.forEach(([docId, teacherData]) => {
        const ref = doc(db, "DANHSACH_GV", docId);
        batch.set(ref, teacherData, { merge: true });
      });

      await batch.commit();
      const completed = Math.min(i + chunk.length, entries.length);
      if (setProgress) {
        setProgress(Math.round((completed / entries.length) * 100));
      }
    }

    if (fetchTeachersAndAccountsData) {
      await fetchTeachersAndAccountsData();
    }

    if (setMessage) {
      setMessage({
        type: "success",
        text: `Đã nhập thành công ${entries.length} giáo viên vào DANHSACH_GV cho năm học ${academicYear}.`,
      });
    }
  } catch (error) {
    console.error("Lỗi nhập danh sách giáo viên:", error);
    if (setMessage) {
      setMessage({
        type: "error",
        text: error.message || "Đã xảy ra lỗi khi nhập dữ liệu.",
      });
    }
  } finally {
    if (setImporting) setImporting(false);
    if (event.target) event.target.value = "";
  }
};