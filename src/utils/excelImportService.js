
 // src/utils/excelImportService.js
import ExcelJS from "exceljs";
import { writeBatch, doc, collection, getDocs } from "firebase/firestore";

/**
 * Đọc file Excel phân quyền giáo viên và lưu trực tiếp vào Firestore.
 * Cột A: STT
 * Cột B: Họ và tên
 * Cột C: Lớp/Môn
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

  setFileName?.(file.name);
  setMessage?.(null);
  setImportProgress?.(0);
  setImporting?.(true);

  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();

    await workbook.xlsx.load(arrayBuffer);

    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      throw new Error("File Excel không có trang tính dữ liệu.");
    }

    const importedMap = {};

    worksheet.eachRow((row) => {
      const colName = String(
        getTextCellValue
          ? getTextCellValue(row.getCell(2))
          : row.getCell(2).text || ""
      )
        .replace(/\s+/g, " ")
        .trim();

      const colLopMon = String(
        getTextCellValue
          ? getTextCellValue(row.getCell(3))
          : row.getCell(3).text || ""
      )
        .replace(/\s+/g, " ")
        .trim();

      // Bỏ dòng tiêu đề và dòng không hợp lệ.
      if (
        !colName ||
        !colLopMon ||
        /^(họ và tên|ho va ten)$/i.test(colName) ||
        /^stt$/i.test(
          String(
            getTextCellValue
              ? getTextCellValue(row.getCell(1))
              : row.getCell(1).text || ""
          ).trim()
        )
      ) {
        return;
      }

      const upperName = colName.toLocaleUpperCase("vi-VN");
      const upperLopMon = colLopMon.toLocaleUpperCase("vi-VN");

      // Nhận diện đầy đủ mã lớp như 1.1, 2.7, 3.4, 5.4.
      const isHomeroom = /^[1-5]\.\d+$/.test(colLopMon);

      let role = "BM";
      let assignedClass = "";
      let assignedSubjectStr = "";
      let assignedSubjectsArr = [];
      let teachingClassesArr = ["1", "2", "3", "4", "5"];
      let grade = "";

      if (isHomeroom) {
        role = "GVCN";

        // Lưu nguyên mã lớp từ Excel, không cắt ký tự.
        assignedClass = colLopMon;
        teachingClassesArr = [colLopMon];
        assignedSubjectStr = "Tất cả môn GVCN";
        assignedSubjectsArr = ["Tất cả môn GVCN"];
        grade = colLopMon.split(".")[0];
      } else if (
        upperLopMon === "TA" ||
        upperLopMon.includes("TIẾNG ANH")
      ) {
        role = "TA";
        assignedSubjectStr = "Tiếng Anh";
        assignedSubjectsArr = ["Tiếng Anh"];
      } else {
        role = "BM";

        assignedSubjectsArr = colLopMon
          .split(/[,;]+/)
          .map((subject) => subject.trim())
          .filter(Boolean);

        assignedSubjectStr = assignedSubjectsArr.join(", ");
      }

      importedMap[upperName] = {
        username: upperName,
        role,
        assignedClass,
        assignedSubject: assignedSubjectStr,
        assignedSubjects: assignedSubjectsArr,
        teachingClasses: teachingClassesArr,
        ...(grade ? { grade } : {}),
        academicYear,
        updatedAt: new Date(),
      };
    });

    const entries = Object.entries(importedMap);

    if (entries.length === 0) {
      throw new Error(
        "Không tìm thấy dữ liệu hợp lệ. Vui lòng kiểm tra cột B (Họ và tên) và cột C (Lớp/Môn) trong file Excel."
      );
    }

    const collectionName = `PHANQUYEN_${academicYear}`;
    const chunkSize = 450;

    for (let i = 0; i < entries.length; i += chunkSize) {
      const batch = writeBatch(db);
      const chunk = entries.slice(i, i + chunkSize);

      chunk.forEach(([teacherName, data]) => {
        const ref = doc(db, collectionName, teacherName);
        batch.set(ref, data, { merge: true });
      });

      await batch.commit();

      const completed = Math.min(i + chunk.length, entries.length);

      setImportProgress?.(
        Math.round((completed / entries.length) * 100)
      );
    }

    // Đọc lại dữ liệu đã lưu để cập nhật giao diện.
    const pqSnap = await getDocs(collection(db, collectionName));
    const map = {};

    pqSnap.forEach((documentSnapshot) => {
      map[documentSnapshot.id] = documentSnapshot.data();
    });

    setAssignmentsMap?.(map);

    setMessage?.({
      type: "success",
      text: `Đã nhập thành công ${entries.length} giáo viên từ Excel vào ${collectionName}.`,
    });
  } catch (error) {
    console.error("Lỗi khi import file Excel phân quyền:", error);

    setMessage?.({
      type: "error",
      text: error.message || "Đã xảy ra lỗi khi đọc file Excel phân quyền.",
    });
  } finally {
    setImporting?.(false);

    if (event.target) {
      event.target.value = "";
    }
  }
};
