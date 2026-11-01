import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// Hàm phụ trợ rút gọn tên môn học hiển thị trên tiêu đề cột
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
 * Hàm tách họ tên và so sánh theo chuẩn tiếng Việt từ phải sang trái (Tên -> Tên đệm -> Họ)
 */
const compareVietnameseNames = (nameA, nameB) => {
  const cleanA = (nameA || "").trim();
  const cleanB = (nameB || "").trim();

  // Tách các từ trong chuỗi họ tên
  const partsA = cleanA.split(/\s+/);
  const partsB = cleanB.split(/\s+/);

  // Lấy từ cuối cùng (Tên chính)
  const firstNameA = partsA[partsA.length - 1] || "";
  const firstNameB = partsB[partsB.length - 1] || "";

  // So sánh tên chính trước
  const compareFirst = firstNameA.localeCompare(firstNameB, 'vi', { sensitivity: 'accent' });
  if (compareFirst !== 0) return compareFirst;

  // Nếu tên chính giống nhau, so sánh toàn bộ chuỗi
  return cleanA.localeCompare(cleanB, 'vi', { sensitivity: 'accent' });
};

/**
 * Hàm trích xuất số lớp để sắp xếp GVCN (Ví dụ: "1.1", "1.2",...)
 */
const getFirstClassNumber = (row) => {
  if (!row.teachingClasses || row.teachingClasses.length === 0) return "999";
  return row.teachingClasses[0];
};

/**
 * Hàm xuất file Excel Bảng Tổng hợp Toàn trường
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
  const worksheet = workbook.addWorksheet('TongHopToanTruong');
  worksheet.views = [{ showGridLines: true }];

  // 1. Thông tin tiêu đề đơn vị
  const schoolNameRow = worksheet.addRow(['TRƯỜNG TIỂU HỌC BÌNH KHÁNH']);
  schoolNameRow.getCell(1).font = { bold: true, size: 12, color: { argb: '1E3A8A' } };

  const addressRow = worksheet.addRow(['Xã Bình Khánh, TP. Hồ Chí Minh']);
  addressRow.getCell(1).font = { italic: true, size: 10, color: { argb: '4B5563' } };

  worksheet.addRow();

  const titleRow = worksheet.addRow([`BẢNG TỔNG HỢP KẾ HOẠCH BÀI DẠY TOÀN TRƯỜNG - NĂM HỌC ${academicYear}`]);
  worksheet.mergeCells('A4:L4');
  const titleCell = titleRow.getCell(1);
  titleCell.font = { bold: true, size: 15, color: { argb: '1E40AF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleRow.height = 30;

  worksheet.addRow();

  // 2. Phân tách dữ liệu thành 2 nhóm lớn
  const gvcnGroups = {};
  const chuyenBietGroups = {};

  Object.entries(schoolSummaryGrouped).forEach(([groupKey, groupData]) => {
    const titleLower = (groupData.title || "").toLowerCase();
    const isKhoiGroup = titleLower.includes("khối") || groupKey.startsWith("khoi");

    if (isKhoiGroup) {
      gvcnGroups[groupKey] = groupData;
    } else {
      if (!isKhoiGroup || titleLower.includes("tiếng anh") || titleLower.includes("bộ môn")) {
        chuyenBietGroups[groupKey] = groupData;
      }
    }
  });

  // Hàm render từng phần với logic sắp xếp riêng biệt
  const renderSection = (sectionTitle, groupsData, isGvcn = false) => {
    if (!groupsData || Object.keys(groupsData).length === 0) return;
    const hasData = Object.values(groupsData).some(g => g.rows && g.rows.length > 0);
    if (!hasData) return;

    // Lọc cột môn học động
    const activeSubjects = filteredSubjectNames.filter((sub) => {
      return Object.values(groupsData).some((groupData) => {
        return groupData.rows?.some((row) => {
          const isAssigned = row.assignedSubjects?.some(
            (as) => as.toLowerCase().trim() === sub.toLowerCase().trim()
          );
          const hasCount = (row.subjectCounts?.[sub] || 0) > 0;
          return isAssigned || hasCount;
        });
      });
    });

    const shortHeaders = activeSubjects.map(sub => getShortSubjectName(sub));
    const totalCols = 2 + shortHeaders.length + 1;
    const lastColLet = String.fromCharCode(64 + totalCols);

    // Tiêu đề phần lớn
    const secTitleRow = worksheet.addRow([sectionTitle]);
    worksheet.mergeCells(`A${secTitleRow.number}:${lastColLet}${secTitleRow.number}`);
    secTitleRow.height = 26;
    const secCell = secTitleRow.getCell(1);
    secCell.font = { bold: true, size: 12, color: { argb: 'FFFFFF' } };
    secCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A8A' } };
    secCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

    // Header bảng
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
      if (!groupData.rows || groupData.rows.length === 0) continue;

      // Sắp xếp danh sách giáo viên
      const sortedRows = [...groupData.rows].sort((a, b) => {
        if (isGvcn) {
          // GVCN: Sắp xếp theo tên lớp tăng dần (1.1, 1.2,...)
          const classA = getFirstClassNumber(a);
          const classB = getFirstClassNumber(b);
          return classA.localeCompare(classB, undefined, { numeric: true });
        } else {
          // BM & TA: Sắp xếp theo tên tiếng Việt từ phải sang trái
          const nameA = (a.username || "").trim();
          const nameB = (b.username || "").trim();
          return compareVietnameseNames(nameA, nameB);
        }
      });

      const groupTitleRow = worksheet.addRow([`${groupData.title} (${sortedRows.length} giáo viên)`]);
      worksheet.mergeCells(`A${groupTitleRow.number}:${lastColLet}${groupTitleRow.number}`);
      groupTitleRow.height = 20;

      const groupCell = groupTitleRow.getCell(1);
      groupCell.font = { bold: true, size: 10.5, color: { argb: '1D4ED8' } };
      groupCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
      groupCell.alignment = { horizontal: 'left', vertical: 'middle' };

      sortedRows.forEach((row) => {
        const teacherName = row.username || 'Chưa rõ';

        const subjectCounts = activeSubjects.map((sub, idx) => {
          const count = Number(row.subjectCounts?.[sub] || 0);
          colTotals[idx] += count;
          return count;
        });

        const rowTotal = Number(row.totalCount) || subjectCounts.reduce((s, v) => s + v, 0);
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

    // Dòng tổng kết cho phần này
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

  // 3. Render 2 phần
  renderSection('GIÁO VIÊN CHỦ NHIỆM', gvcnGroups, true);   
  renderSection('GIÁO VIÊN BỘ MÔN & TIẾNG ANH', chuyenBietGroups, false); 

  // 4. Độ rộng cột thu gọn cân đối
  worksheet.columns.forEach((column, index) => {
    if (index === 0) {
      column.width = 6;
    } else if (index === 1) {
      column.width = 26;
    } else {
      column.width = 10;
    }
  });

  // 5. Tạo Buffer và Blob, sau đó xuất file với tên định dạng TongHop_KHBD_ToanTruong_DD-MM-YYYY.xlsx
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  const dateStr = `${day}-${month}-${year}`;

  saveAs(blob, `TongHop_KHBD_ToanTruong_${dateStr}.xlsx`);

  if (setSnackbar) {
    setSnackbar({
      open: true,
      message: 'Đã xuất file Excel tổng hợp toàn trường thành công!',
      severity: 'success',
    });
  }
};