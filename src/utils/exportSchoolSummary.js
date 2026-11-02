import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// Rút gọn tên môn học hiển thị trên tiêu đề cột Excel
const getShortSubjectName = (name) => {
  if (!name) return "";
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();

  if (lower.includes("tiếng anh")) return "TA";
  if (lower.includes("tin học")) return "TH";
  if (lower.includes("công nghệ")) return "CN";
  if (lower.includes("giáo dục thể chất")) return "GDTC";
  if (lower.includes("âm nhạc")) return "AN";
  if (lower.includes("mĩ thuật") || lower.includes("mỹ thuật")) return "MT";
  if (lower === "toán") return "Toán";
  if (lower.includes("tiếng việt")) return "TV";
  if (lower.includes("đạo đức")) return "ĐĐ";
  if (lower.includes("tự nhiên và xã hội")) return "TNXH";
  if (lower === "khoa học") return "KH";
  if (lower.includes("lịch sử") || lower.includes("địa lí") || lower.includes("địa lý")) return "LSĐL";
  if (lower.includes("hoạt động trải nghiệm")) return "HĐTN";

  return trimmed;
};

/**
 * Hàm so sánh họ tên tiếng Việt (Tên -> Tên đệm -> Họ)
 */
const compareVietnameseNames = (nameA, nameB) => {
  const cleanA = (nameA || "").trim();
  const cleanB = (nameB || "").trim();

  const partsA = cleanA.split(/\s+/);
  const partsB = cleanB.split(/\s+/);

  const firstNameA = partsA[partsA.length - 1] || "";
  const firstNameB = partsB[partsB.length - 1] || "";

  const compareFirst = firstNameA.localeCompare(firstNameB, 'vi', { sensitivity: 'accent' });
  if (compareFirst !== 0) return compareFirst;

  return cleanA.localeCompare(cleanB, 'vi', { sensitivity: 'accent' });
};

/**
 * Hàm xuất file Excel Bảng Tổng hợp Toàn trường / Tổ / Khối
 */
export const handleExportExcel = async ({
  schoolSummaryGrouped = {},
  academicYear = '2026-2027',
  filteredSubjectNames = [],
  setSnackbar
}) => {
  if (!schoolSummaryGrouped || Object.keys(schoolSummaryGrouped).length === 0) {
    if (setSnackbar) {
      setSnackbar({
        open: true,
        message: 'Không có dữ liệu tổng hợp để xuất Excel!',
        severity: 'warning',
      });
    }
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('TongHop');
  worksheet.views = [{ showGridLines: true }];

  // 1. Thông tin trường & địa chỉ
  const schoolNameRow = worksheet.addRow(['TRƯỜNG TIỂU HỌC BÌNH KHÁNH']);
  schoolNameRow.getCell(1).font = { bold: true, size: 12, color: { argb: '1E3A8A' } };

  const addressRow = worksheet.addRow(['Xã Bình Khánh, TP. Hồ Chí Minh']);
  addressRow.getCell(1).font = { italic: true, size: 10, color: { argb: '4B5563' } };

  worksheet.addRow();

  // 🌟 2. XÁC ĐỊNH NHÓM VÀ TIÊU ĐỀ ĐỘNG (TOÀN TRƯỜNG HOẶC THEO KHỐI/TỔ)
  const groupTitlesMap = {
    khoi1: "📌 Khối 1",
    khoi2: "📌 Khối 2",
    khoi3: "📌 Khối 3",
    khoi4: "📌 Khối 4",
    khoi5: "📌 Khối 5",
    tiengAnh: "📌 Tiếng Anh",
    boMon: "📌 Bộ Môn",
  };

  const validGroupKeys = Object.keys(schoolSummaryGrouped).filter(
    (k) => k !== "toBoMon" && Array.isArray(schoolSummaryGrouped[k]) && schoolSummaryGrouped[k].length > 0
  );

  let exportTitleText = `BẢNG TỔNG HỢP KẾ HOẠCH BÀI DẠY TOÀN TRƯỜNG - NĂM HỌC ${academicYear}`;
  let isSingleGroup = false;

  // Nếu chỉ truyền dữ liệu của đúng 1 Khối/Tổ -> Đổi tên tiêu đề phù hợp
  if (validGroupKeys.length === 1) {
    isSingleGroup = true;
    const groupKey = validGroupKeys[0];
    const groupData = schoolSummaryGrouped[groupKey];
    const groupName = groupData?.title?.replace("📌 ", "").trim() || groupTitlesMap[groupKey] || groupKey.toUpperCase();
    exportTitleText = `BẢNG TỔNG HỢP KẾ HOẠCH BÀI DẠY ${groupName} - NĂM HỌC ${academicYear}`;
  }

  // 🌟 3. THÊM VÀ MERGE DÒNG TIÊU ĐỀ (Tự động merge A4:H4 nếu là khối 1/đơn lẻ hoặc theo đúng số cột)
  const titleRow = worksheet.addRow([exportTitleText]);
  
  // Nếu xuất khối đơn lẻ thì merge A4:H4 theo đúng yêu cầu, nếu toàn trường thì merge A4:L4
  const mergeRange = isSingleGroup ? 'A4:H4' : 'A4:L4';
  worksheet.mergeCells(mergeRange);

  const titleCell = titleRow.getCell(1);
  titleCell.font = { bold: true, size: 14, color: { argb: '1E40AF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleRow.height = 32;

  worksheet.addRow();

  // 4. Phân tách nhóm GVCN và Chuyên biệt
  const gvcnGroups = {};
  const chuyenBietGroups = {};

  Object.entries(schoolSummaryGrouped).forEach(([groupKey, teachersList]) => {
    if (!Array.isArray(teachersList) || teachersList.length === 0) return;
    const isKhoiGroup = groupKey.startsWith("khoi");

    const groupPayload = {
      title: groupTitlesMap[groupKey] || groupKey,
      teachers: teachersList,
    };

    if (isKhoiGroup) {
      gvcnGroups[groupKey] = groupPayload;
    } else if (groupKey !== "toBoMon") {
      chuyenBietGroups[groupKey] = groupPayload;
    }
  });

  // Hàm render từng phần
  const renderSection = (sectionTitle, groupsData, isGvcn = false) => {
    if (!groupsData || Object.keys(groupsData).length === 0) return;

    // Lọc các cột môn học động thực tế có dữ liệu
    const activeSubjects = filteredSubjectNames.filter((sub) => {
      return Object.values(groupsData).some((groupData) => {
        return groupData.teachers?.some((teacher) => {
          return (teacher.subjects?.[sub] || 0) > 0;
        });
      });
    });

    const shortHeaders = activeSubjects.map(sub => getShortSubjectName(sub));
    const totalCols = 2 + shortHeaders.length + 1;
    const lastColLet = String.fromCharCode(64 + totalCols);

    // Chỉ hiển thị tiêu đề nhóm lớn (GIÁO VIÊN CHỦ NHIỆM / GIÁO VIÊN BỘ MÔN) khi xuất toàn trường
    if (!isSingleGroup) {
      const secTitleRow = worksheet.addRow([sectionTitle]);
      worksheet.mergeCells(`A${secTitleRow.number}:${lastColLet}${secTitleRow.number}`);
      secTitleRow.height = 26;
      const secCell = secTitleRow.getCell(1);
      secCell.font = { bold: true, size: 12, color: { argb: 'FFFFFF' } };
      secCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A8A' } };
      secCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    }

    // Tiêu đề các cột
    const headers = ['STT', 'Họ và tên giáo viên', ...shortHeaders, 'Tổng số'];
    const headerRow = worksheet.addRow(headers);
    headerRow.height = 24;

    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 10.5 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2563EB' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: '94A3B8' } },
        left: { style: 'thin', color: { argb: '94A3B8' } },
        bottom: { style: 'medium', color: { argb: '1E3A8A' } },
        right: { style: 'thin', color: { argb: '94A3B8' } },
      };
    });

    let secIndex = 1;
    const colTotals = new Array(activeSubjects.length).fill(0);
    let sectionGrandTotal = 0;

    for (const [groupKey, groupData] of Object.entries(groupsData)) {
      if (!groupData.teachers || groupData.teachers.length === 0) continue;

      // Sắp xếp danh sách giáo viên
      const sortedTeachers = [...groupData.teachers].sort((a, b) => {
        if (isGvcn) {
          const classA = String(a.class || "999");
          const classB = String(b.class || "999");
          return classA.localeCompare(classB, undefined, { numeric: true });
        } else {
          const nameA = (a.teacherName || a.teacherId || "").trim();
          const nameB = (b.teacherName || b.teacherId || "").trim();
          return compareVietnameseNames(nameA, nameB);
        }
      });

      // Tên khối / tổ nhỏ
      const groupTitleRow = worksheet.addRow([`${groupData.title} (${sortedTeachers.length} giáo viên)`]);
      worksheet.mergeCells(`A${groupTitleRow.number}:${lastColLet}${groupTitleRow.number}`);
      groupTitleRow.height = 20;

      const groupCell = groupTitleRow.getCell(1);
      groupCell.font = { bold: true, size: 10.5, color: { argb: '1D4ED8' } };
      groupCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
      groupCell.alignment = { horizontal: 'left', vertical: 'middle' };

      sortedTeachers.forEach((teacher) => {
        const teacherName = teacher.teacherName || teacher.teacherId || 'Chưa rõ';

        const subjectCounts = activeSubjects.map((sub, idx) => {
          const count = Number(teacher.subjects?.[sub] || 0);
          colTotals[idx] += count;
          return count;
        });

        const rowTotal = Number(teacher.totalFiles) || subjectCounts.reduce((s, v) => s + v, 0);
        sectionGrandTotal += rowTotal;

        const rowData = [
          secIndex++,
          teacherName,
          ...subjectCounts,
          rowTotal
        ];

        const dataRow = worksheet.addRow(rowData);
        dataRow.height = 20;

        dataRow.eachCell((cell, colNumber) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'E2E8F0' } },
            left: { style: 'thin', color: { argb: 'E2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
            right: { style: 'thin', color: { argb: 'E2E8F0' } },
          };

          if (colNumber === 1) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else if (colNumber === 2) {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
            cell.font = { size: 10, color: { argb: '0F172A' }, bold: true };
          } else if (colNumber > 2 && colNumber < totalCols) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            const valNum = Number(cell.value) || 0;
            cell.font = { bold: valNum > 0, color: { argb: valNum > 0 ? '15803D' : '94A3B8' } };
            cell.value = valNum > 0 ? valNum : '—';
          } else if (colNumber === totalCols) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.font = { bold: true, color: { argb: 'DC2626' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EFF6FF' } };
          }
        });
      });
    }

    // Dòng tổng cộng
    const secTotalRowData = [`TỔNG CỘNG`, '', ...colTotals, sectionGrandTotal];
    const secTotalRow = worksheet.addRow(secTotalRowData);
    worksheet.mergeCells(`A${secTotalRow.number}:B${secTotalRow.number}`);
    secTotalRow.height = 22;

    secTotalRow.eachCell((cell, colNumber) => {
      cell.font = { bold: true, size: 10.5, color: { argb: '0F172A' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF3C7' } };
      cell.border = {
        top: { style: 'medium', color: { argb: 'D97706' } },
        bottom: { style: 'double', color: { argb: 'D97706' } },
        left: { style: 'thin', color: { argb: 'CBD5E1' } },
        right: { style: 'thin', color: { argb: 'CBD5E1' } },
      };

      if (colNumber === 1) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (colNumber > 2 && colNumber < totalCols) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.font = { bold: true, color: { argb: 'B45309' } };
      } else if (colNumber === totalCols) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.font = { bold: true, size: 11, color: { argb: 'DC2626' } };
      }
    });

    worksheet.addRow();
  };

  // 5. Render phần tương ứng
  renderSection('GIÁO VIÊN CHỦ NHIỆM', gvcnGroups, true);   
  renderSection('GIÁO VIÊN BỘ MÔN & TIẾNG ANH', chuyenBietGroups, false); 

  // 6. Định dạng độ rộng các cột
  worksheet.columns.forEach((column, index) => {
    if (index === 0) {
      column.width = 6;
    } else if (index === 1) {
      column.width = 28;
    } else {
      column.width = 10;
    }
  });

  // 7. Tạo file và tải về
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  const dateStr = `${day}-${month}-${year}`;

  const fileNamePrefix = isSingleGroup ? 'TongHop_KHBD' : 'TongHop_KHBD_ToanTruong';
  saveAs(blob, `${fileNamePrefix}_${dateStr}.xlsx`);

  if (setSnackbar) {
    setSnackbar({
      open: true,
      message: `Đã xuất file Excel ${isSingleGroup ? 'tổng hợp khối' : 'tổng hợp toàn trường'} thành công!`,
      severity: 'success',
    });
  }
};