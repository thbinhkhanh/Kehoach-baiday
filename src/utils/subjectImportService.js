// src/utils/subjectImportService.js
import ExcelJS from "exceljs";
import { writeBatch, doc } from "firebase/firestore";

/**
 * Xử lý đọc file Excel danh sách môn học và lưu vào Firestore collection MONHOC theo từng batch
 */
export const handleSubjectFileSelectService = async (
  event,
  {
    db,
    academicYear,
    getTextCellValue,
    normalizeSubjectId,
    setSubjectFileName,
    setSubjectMessage,
    setSubjectProgress,
    setImportingSubject,
  }
) => {
  const file = event.target.files?.[0];
  if (!file) return;

  if (setSubjectFileName) setSubjectFileName(file.name);
  if (setSubjectMessage) setSubjectMessage(null);
  if (setSubjectProgress) setSubjectProgress(0);
  if (setImportingSubject) setImportingSubject(true);

  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error("File Excel môn học không có trang tính dữ liệu.");
    }

    const subjectsMap = new Map();

    worksheet.eachRow((row) => {
      const col1 = getTextCellValue ? getTextCellValue(row.getCell(1)) : row.getCell(1).text;
      const col2 = getTextCellValue ? getTextCellValue(row.getCell(2)) : row.getCell(2).text;

      if (
        !col1 ||
        col1.toLowerCase() === "môn" ||
        col1.toLowerCase() === "mon" ||
        col1.toLowerCase().includes("môn học")
      ) {
        return;
      }

      const subjectName = col1.trim();
      const docId = normalizeSubjectId ? normalizeSubjectId(subjectName) : subjectName.toUpperCase();
      const gradesArr = col2.split(/[,;\s]+/).filter((g) => g.trim() !== "");

      if (subjectsMap.has(docId)) {
        const existing = subjectsMap.get(docId);
        const combinedGrades = Array.from(new Set([...existing.grades, ...gradesArr])).sort();
        existing.grades = combinedGrades;
      } else {
        subjectsMap.set(docId, {
          name: subjectName,
          grades: gradesArr,
          academicYear: academicYear,
          updatedAt: new Date(),
        });
      }
    });

    const entries = Array.from(subjectsMap.entries());
    if (entries.length === 0) {
      throw new Error("Không tìm thấy dữ liệu môn học hợp lệ.");
    }

    const chunkSize = 450;
    for (let i = 0; i < entries.length; i += chunkSize) {
      const batch = writeBatch(db);
      const chunk = entries.slice(i, i + chunkSize);

      chunk.forEach(([docId, subjectData]) => {
        const ref = doc(db, "MONHOC", docId);
        batch.set(ref, subjectData, { merge: true });
      });

      await batch.commit();
      const completed = Math.min(i + chunk.length, entries.length);
      if (setSubjectProgress) {
        setSubjectProgress(Math.round((completed / entries.length) * 100));
      }
    }

    if (setSubjectMessage) {
      setSubjectMessage({
        type: "success",
        text: `Đã nhập thành công ${entries.length} môn học cho năm học ${academicYear}.`,
      });
    }
  } catch (error) {
    console.error("Lỗi nhập danh sách môn học:", error);
    if (setSubjectMessage) {
      setSubjectMessage({
        type: "error",
        text: error.message || "Đã xảy ra lỗi khi nhập danh sách môn học.",
      });
    }
  } finally {
    if (setImportingSubject) setImportingSubject(false);
    if (event.target) event.target.value = "";
  }
};