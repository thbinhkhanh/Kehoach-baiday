import { doc, writeBatch } from "firebase/firestore";

/**
 * Lọc và lưu cấu hình môn học áp dụng cho các khối lớp từ 1 đến 5 lên Firestore.
 * @param {Object} db - Firestore instance
 * @param {Object} danhSachMonTheoLop - Object ánh xạ môn học với các khối lớp
 */
export async function luuDanhSachMonHocTheoLop(db, danhSachMonTheoLop) {
  const cacKhoiLop = { "1": [], "2": [], "3": [], "4": [], "5": [] };

  // Các quy tắc môn học không áp dụng cho khối lớp tương ứng
  const quyTacKhongHopLe = {
    "Công nghệ": ["1", "2"],
    "Khoa học": ["1", "2", "3"],
    "LS-ĐL": ["1", "2", "3"],
    "THXN": ["4", "5"],
    "GDTC": [],
    "HĐTN": []
  };

  // Lọc và sắp xếp môn học vào đúng khối lớp
  Object.entries(danhSachMonTheoLop).forEach(([tenMon, danhSachKhoi]) => {
    danhSachKhoi.forEach((khoi) => {
      const khoiBiCam = quyTacKhongHopLe[tenMon] || [];
      if (cacKhoiLop[khoi] && !khoiBiCam.includes(khoi)) {
        cacKhoiLop[khoi].push(tenMon);
      }
    });
  });

  // Ghi hàng loạt (Batch write) vào collection LOP_MONHOC
  const batch = writeBatch(db);
  Object.entries(cacKhoiLop).forEach(([khoiLop, danhSachMon]) => {
    const docRef = doc(db, "LOP_MONHOC", khoiLop);
    batch.set(docRef, {
      subjects: danhSachMon,
      updatedAt: new Date(),
    });
  });

  await batch.commit();
}