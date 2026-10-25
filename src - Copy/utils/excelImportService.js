// src/utils/excelImportService.js
import ExcelJS from "exceljs";
import { writeBatch, doc, collection, getDocs } from "firebase/firestore";

/**
 * Xử lý đọc file Excel phân quyền giáo viên và lưu vào Firestore theo từng batch
 */
export const handleExcelImportService = async (
  event,
  {
    db,
    academicYear,
    getTextCellValue,
    setFileName,
    setMessage,
    setImportProgress,
    setImporting,
    setAssignmentsMap,
  }
) => {
  const file = event.target.files?.[0];
  if (!file) return;

  if (setFileName) setFileName(file.name);
  if (setMessage) setMessage(null);
  if (setImportProgress) setImportProgress(0);
  if (setImporting) setImporting(true);

  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);
    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      throw new Error("File Excel không có trang tính dữ liệu.");
    }

    const importedMap = {};

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const colName = getTextCellValue ? getTextCellValue(row.getCell(2)) : row.getCell(2).text;
      const colLopMon = getTextCellValue ? getTextCellValue(row.getCell(3)) : row.getCell(3).text;

      if (!colName || colName.toLowerCase().includes("họ và tên")) return;

      const upperName = colName.toUpperCase();
      const isHomeroom = /^\d+[\.,]\d+$/.test(colLopMon);
      const upperLopMon = colLopMon.trim().toUpperCase();

      let role = "BM";
      let assignedClass = "";
      let assignedSubjectStr = "";
      let assignedSubjectsArr = [];
      let teachingClassesArr = ["1", "2", "3", "4", "5"];

      if (isHomeroom) {
        role = "GVCN";
        assignedClass = colLopMon.charAt(0);
        teachingClassesArr = [assignedClass];
        assignedSubjectStr = "Tất cả môn GVCN";
        assignedSubjectsArr = ["Tất cả môn GVCN"];
      } else if (upperLopMon === "TA" || upperLopMon.includes("TIẾNG ANH")) {
        role = "TA";
        assignedSubjectStr = "Tiếng Anh";
        assignedSubjectsArr = ["Tiếng Anh"];
      } else {
        role = "BM";
        assignedSubjectStr = colLopMon;
        assignedSubjectsArr = colLopMon.split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
      }

      importedMap[upperName] = {
        username: upperName,
        role: role,
        assignedClass: assignedClass,
        assignedSubject: assignedSubjectStr,
        assignedSubjects: assignedSubjectsArr,
        teachingClasses: teachingClassesArr,
        academicYear: academicYear,
        updatedAt: new Date(),
      };
    });

    const entries = Object.entries(importedMap);
    if (entries.length === 0) {
      throw new Error("Không tìm thấy dữ liệu hợp lệ trong file Excel.");
    }

    const phanQuyenColName = `PHANQUYEN_${academicYear}`;
    const chunkSize = 450;
    for (let i = 0; i < entries.length; i += chunkSize) {
      const batch = writeBatch(db);
      const chunk = entries.slice(i, i + chunkSize);

      chunk.forEach(([teacherName, data]) => {
        const ref = doc(db, phanQuyenColName, teacherName);
        batch.set(ref, data, { merge: true });
      });

      await batch.commit();
      const completed = Math.min(i + chunk.length, entries.length);
      if (setImportProgress) {
        setImportProgress(Math.round((completed / entries.length) * 100));
      }
    }

    const pqSnap = await getDocs(collection(db, phanQuyenColName));
    const map = {};
    pqSnap.forEach((d) => {
      map[d.id] = d.data();
    });
    if (setAssignmentsMap) setAssignmentsMap(map);

    if (setMessage) {
      setMessage({
        type: "success",
        text: `Đã import thành công phân công cho ${entries.length} giáo viên vào collection ${phanQuyenColName}!`,
      });
    }
  } catch (error) {
    console.error("Lỗi khi import file Excel phân quyền:", error);
    if (setMessage) {
      setMessage({
        type: "error",
        text: error.message || "Đã xảy ra lỗi khi đọc file Excel phân quyền.",
      });
    }
  } finally {
    if (setImporting) setImporting(false);
    if (event.target) event.target.value = "";
  }
};