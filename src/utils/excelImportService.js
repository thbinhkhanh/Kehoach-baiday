// src/utils/excelImportService.js
import {
  writeBatch,
  doc,
  serverTimestamp,
} from "firebase/firestore";

/**
 * Đọc Excel phân quyền giáo viên.
 * Cột A: STT
 * Cột B: Họ và tên
 * Cột C: Lớp/Môn
 *
 * Excel là nguồn dữ liệu giáo viên.
 * Lưu phân quyền vào PHANQUYEN_<năm học>.
 * Cập nhật tài khoản vào DANHSACH_GV.
 */

const taoMaGiaoVien = (hoTen) =>
  String(hoTen || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "D")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");

const chuanHoaChuoi = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

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
    setTeachers,
  }
) => {
  const file = event.target.files?.[0];
  if (!file) return;

  setFileName?.(file.name);
  setMessage?.(null);
  setImportProgress?.(0);
  setImporting?.(true);

  try {
    const ExcelJS = (await import("exceljs")).default;
    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();

    await workbook.xlsx.load(arrayBuffer);

    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      throw new Error("File Excel không có trang tính dữ liệu.");
    }

    const importedMap = {};
    const teacherList = [];
    const seenTeachers = new Set();

    worksheet.eachRow((row) => {
      const colSTT = chuanHoaChuoi(
        getTextCellValue
          ? getTextCellValue(row.getCell(1))
          : row.getCell(1).text
      );

      const colName = chuanHoaChuoi(
        getTextCellValue
          ? getTextCellValue(row.getCell(2))
          : row.getCell(2).text
      );

      const colLopMon = chuanHoaChuoi(
        getTextCellValue
          ? getTextCellValue(row.getCell(3))
          : row.getCell(3).text
      );

      // Bỏ dòng tiêu đề và dòng thiếu dữ liệu.
      if (
        !colName ||
        !colLopMon ||
        /^(họ và tên|ho va ten)$/i.test(colName) ||
        /^lớp\/môn$/i.test(colLopMon) ||
        /^stt$/i.test(colSTT)
      ) {
        return;
      }

      const username = colName.toLocaleUpperCase("vi-VN");
      const upperLopMon = colLopMon.toLocaleUpperCase("vi-VN");

      // Phân loại giáo viên dựa trên dữ liệu Excel.
      const isHomeroom = /^[1-5]\.\d+$/.test(colLopMon);
      const isTA =
        upperLopMon === "TA" ||
        upperLopMon.includes("TIẾNG ANH");

      let role = "BM";
      let assignedClass = "";
      let assignedSubject = "";
      let assignedSubjects = [];
      let teachingClasses = ["1", "2", "3", "4", "5"];
      let grade = "";

      if (isHomeroom) {
        role = "GVCN";
        assignedClass = colLopMon;
        assignedSubject = colLopMon;
        assignedSubjects = [colLopMon];
        teachingClasses = [colLopMon];
        grade = colLopMon.split(".")[0];
      } else if (isTA) {
        role = "TA";
        assignedSubject = "Tiếng Anh";
        assignedSubjects = ["Tiếng Anh"];
      } else {
        role = "BM";
        assignedSubjects = colLopMon
          .split(/[,;]+/)
          .map((subject) => subject.trim())
          .filter(Boolean);
        assignedSubject = assignedSubjects.join(", ");
      }

      // Dữ liệu phân quyền.
      importedMap[username] = {
        username,
        role,
        assignedClass,
        assignedSubject,
        assignedSubjects,
        teachingClasses,
        ...(grade ? { grade } : {}),
        academicYear,
        updatedAt: new Date(),
      };

      // Dữ liệu nguồn để cập nhật DANHSACH_GV.
      // GVCN: subject là mã lớp, ví dụ 5.4.
      // TA: subject là TA.
      // Các môn khác: subject là BM.
      const accountSubject = isHomeroom
        ? colLopMon
        : isTA
        ? "TA"
        : "BM";

      const teacherId = taoMaGiaoVien(username);

      if (!seenTeachers.has(teacherId)) {
        seenTeachers.add(teacherId);

        teacherList.push({
          id: teacherId,
          username,
          subject: accountSubject,
          excelClassSubject: colLopMon,
        });
      }
    });

    const entries = Object.entries(importedMap);

    if (entries.length === 0) {
      throw new Error(
        "Không tìm thấy dữ liệu hợp lệ. Vui lòng kiểm tra cột B (Họ và tên) và cột C (Lớp/Môn)."
      );
    }

    const chunkSize = 400;
    const totalOperations = entries.length + teacherList.length;
    let completed = 0;

    // Ghi phân quyền và tài khoản theo batch.
    const operations = [
      ...entries.map(([teacherName, data]) => ({
        type: "permission",
        id: teacherName,
        data,
      })),
      ...teacherList.map((teacher) => ({
        type: "account",
        id: teacher.id,
        data: teacher,
      })),
    ];

    for (let i = 0; i < operations.length; i += chunkSize) {
      const batch = writeBatch(db);
      const chunk = operations.slice(i, i + chunkSize);

      for (const operation of chunk) {
        if (operation.type === "permission") {
          const ref = doc(
            db,
            `PHANQUYEN_${academicYear}`,
            operation.id
          );

          batch.set(ref, operation.data, { merge: true });
        } else {
          const ref = doc(
            db,
            "DANHSACH_GV",
            operation.id
          );

          // Không ghi đè mật khẩu của tài khoản hiện có.
          // Nếu tài liệu chưa tồn tại, đặt pass mặc định.
          const accountData = {
            username: operation.data.username,
            subject: operation.data.subject,
            academicYear,
            updatedAt: serverTimestamp(),
          };

          // Dùng merge để giữ lại các trường khác, gồm pass.
          batch.set(ref, accountData, { merge: true });
        }

        completed += 1;
      }

      await batch.commit();

      setImportProgress?.(
        Math.round((completed / totalOperations) * 100)
      );
    }

    // Tạo tài khoản mới có pass mặc định nếu chưa có tài liệu.
    // Kiểm tra riêng sau khi đã ghi dữ liệu để không ghi đè mật khẩu cũ.
    // Nếu cần mật khẩu mặc định cho tài khoản mới, xử lý bổ sung bên dưới.
    // Các tài liệu đã tồn tại vẫn giữ nguyên pass.

    // Cập nhật danh sách giáo viên trên giao diện từ Excel.
    teacherList.sort((a, b) =>
      a.username
        .split(" ")
        .slice(-1)[0]
        .localeCompare(
          b.username.split(" ").slice(-1)[0],
          "vi"
        )
    );

    setTeachers?.(teacherList);

    // Cập nhật bản đồ phân quyền ngay từ dữ liệu Excel.
    setAssignmentsMap?.(importedMap);

    setMessage?.({
      type: "success",
      text:
        `Đã nhập ${entries.length} giáo viên từ Excel. ` +
        `Đã cập nhật PHANQUYEN_${academicYear} và DANHSACH_GV.`,
    });
  } catch (error) {
    console.error("Lỗi khi import file Excel phân quyền:", error);

    setMessage?.({
      type: "error",
      text:
        error.message ||
        "Đã xảy ra lỗi khi đọc file Excel phân quyền.",
    });
  } finally {
    setImporting?.(false);

    if (event.target) {
      event.target.value = "";
    }
  }
};