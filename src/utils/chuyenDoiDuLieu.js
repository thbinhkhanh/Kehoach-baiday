/**
 * utils/chuyenDoiDuLieu.js
 * Thư viện tổng hợp dữ liệu kế hoạch bài dạy sang collection THONGKE_{namHoc}
 */

import { doc, collection, getDocs, setDoc, updateDoc, increment } from "firebase/firestore";

/**
 * Hàm quy chuẩn mọi định dạng khối lớp về dạng tổng quát: "Khối 1", "Khối 2", "Khối 3", "Khối 4", "Khối 5"
 */
function trichXuatTenKhoi(fileId, fileData) {
  let raw = fileData.khoi || fileData.lop || "";

  if (!raw && fileId && fileId.startsWith("Khoi_")) {
    const parts = fileId.split("_");
    if (parts.length >= 2) raw = parts[1]; // Lấy phần sau chữ Khoi_, ví dụ "1", "1.4", "5.2"
  }

  // Tìm chữ số đầu tiên (1-5) để gom về đúng khối chính
  const match = String(raw).match(/[1-5]/);
  if (match) {
    return `Khối ${match[0]}`;
  }

  return "Chưa phân loại";
}

/**
 * 1. Tổng hợp dữ liệu kế hoạch bài dạy của MỘT GIÁO VIÊN sang collection "THONGKE_{namHoc}"
 */
export async function tongHopDuLieuGiaoVien(db, namHoc, maGiaoVien, tenGiaoVien, nhomGiaoVien = "BM", lopChuNhiem = "") {
  try {
    let totalFiles = 0;
    const subjectsCount = {};
    const classBreakdown = {}; 
    const allFilesForRecent = [];

    // Danh sách toàn bộ các môn học tiểu học (khớp chính xác tên subcollection tiếng Việt trên Firestore)
    let danhSachMonHoc = [
      "Toán", 
      "Tiếng Việt", 
      "Đạo đức", 
      "Khoa học", 
      "Lịch sử và Địa lí", 
      "Giáo dục thể chất", 
      "Tin học", 
      "Công nghệ", 
      "Mĩ thuật", 
      "Âm nhạc", 
      "Tiếng Anh", 
      "Hoạt động trải nghiệm", 
      "Tự nhiên và Xã hội"
    ];
    
    // Thêm danh sách lấy động từ collection MONHOC nếu có
    try {
      const monHocSnap = await getDocs(collection(db, "MONHOC"));
      if (!monHocSnap.empty) {
        monHocSnap.forEach(d => {
          const data = d.data();
          const ten = data.tenMon || data.name || d.id;
          if (ten && !danhSachMonHoc.includes(ten)) danhSachMonHoc.push(ten);
        });
      }
    } catch (e) {
      // Bỏ qua nếu không truy vấn được collection MONHOC
    }

    // Duyệt qua từng môn học để quét dữ liệu subcollection của giáo viên
    for (const tenMon of danhSachMonHoc) {
      try {
        const subColRef = collection(db, `KEHOACH_DAYHOC_${namHoc}`, maGiaoVien, tenMon);
        const filesSnapshot = await getDocs(subColRef);

        if (!filesSnapshot.empty) {
          filesSnapshot.forEach((fileDoc) => {
            const fileData = fileDoc.data();
            totalFiles++;

            const fileId = fileDoc.id; 
            const tenKhoi = trichXuatTenKhoi(fileId, fileData);

            // A. Cộng dồn tổng số bài theo môn
            subjectsCount[tenMon] = (subjectsCount[tenMon] || 0) + 1;

            // B. Cộng dồn chi tiết theo Môn x Khối lớp
            if (!classBreakdown[tenMon]) {
              classBreakdown[tenMon] = {};
            }
            classBreakdown[tenMon][tenKhoi] = (classBreakdown[tenMon][tenKhoi] || 0) + 1;

            // C. Xử lý thời gian cập nhật file gần đây
            let thoiGianTao = new Date().toISOString();
            if (fileData.createdAt) {
              thoiGianTao = typeof fileData.createdAt.toDate === 'function' 
                ? fileData.createdAt.toDate().toISOString() 
                : new Date(fileData.createdAt).toISOString();
            }

            allFilesForRecent.push({
              fileId: fileData.fileId || fileId,
              name: fileData.fileName || fileData.name || "Không tên",
              subject: tenMon,
              class: tenKhoi,
              fileUrl: fileData.fileUrl || fileData.downloadUrl || "",
              updatedAt: thoiGianTao
            });
          });
        }
      } catch (subErr) {
        // Bỏ qua nếu giáo viên không có subcollection môn này
      }
    }

    allFilesForRecent.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    const recentFiles = allFilesForRecent.slice(0, 5);

    // Đóng gói dữ liệu chuẩn theo đúng yêu cầu cấu trúc
    const duLieuTongHopGiaoVien = {
      teacherId: maGiaoVien,
      teacherName: tenGiaoVien || maGiaoVien,
      group: nhomGiaoVien,
      ...(nhomGiaoVien === "GVCN" && lopChuNhiem ? { class: lopChuNhiem } : {}),
      totalFiles: totalFiles,
      subjects: subjectsCount,
      classBreakdown: classBreakdown, 
      recentFiles: recentFiles,
      lastUpdated: new Date().toISOString()
    };

    const collectionDich = `THONGKE_${namHoc}`;
    const docThongKeRef = doc(db, collectionDich, maGiaoVien);
    await setDoc(docThongKeRef, duLieuTongHopGiaoVien, { merge: true });

    console.log(`[Thành công] Đã tổng hợp cho: ${tenGiaoVien} (${totalFiles} bài - Nhóm: ${nhomGiaoVien}) vào ${collectionDich}.`);
    return true;

  } catch (error) {
    console.error(`[Lỗi] Không thể tổng hợp cho giáo viên ${maGiaoVien}:`, error);
    return false;
  }
}

/**
 * 2. Chạy tổng hợp dữ liệu TOÀN TRƯỜNG tự động phân loại group (BM, TA, GVCN) từ DANHSACH_GV
 */
export async function chayTongHopDuLieuToanTruong(db, namHoc = "2026-2027") {
  try {
    console.log(`🚀 Bắt đầu chạy tổng hợp dữ liệu toàn trường cho năm học ${namHoc}...`);
    
    // Đọc bảng DANHSACH_GV để lấy phân loại group và lớp chủ nhiệm chính xác
    const danhSachGvSnap = await getDocs(collection(db, "DANHSACH_GV"));
    const thongTinGvMap = {};

    danhSachGvSnap.forEach((docSnap) => {
      const data = docSnap.data();
      const username = (data.username || "").trim();
      if (username) {
        const sub = (data.subject || "").trim().toUpperCase();
        let nhom = "BM";
        let lopCn = "";

        if (sub === "TA" || sub.includes("TIENG ANH")) {
          nhom = "TA";
        } else if (sub === "BM" || sub === "BO MON") {
          nhom = "BM";
        } else if (sub !== "") {
          nhom = "GVCN";
          lopCn = data.subject; // Ví dụ: "3.6", "1.4",...
        }

        thongTinGvMap[username.toUpperCase()] = {
          teacherName: data.username,
          group: nhom,
          class: lopCn
        };
      }
    });

    const collectionGocRef = collection(db, `KEHOACH_DAYHOC_${namHoc}`);
    const danhSachGiaoVienDocs = await getDocs(collectionGocRef);

    let soLuongThanhCong = 0;

    for (const giaoVienDoc of danhSachGiaoVienDocs.docs) {
      const maGiaoVien = giaoVienDoc.id; 
      const keyMap = maGiaoVien.toUpperCase();
      
      const infoGv = thongTinGvMap[keyMap] || {
        teacherName: maGiaoVien,
        group: "BM",
        class: ""
      };

      const ketQua = await tongHopDuLieuGiaoVien(
        db, 
        namHoc, 
        maGiaoVien, 
        infoGv.teacherName, 
        infoGv.group, 
        infoGv.class
      );
      
      if (ketQua) soLuongThanhCong++;
    }

    console.log(`🎉 HOÀN TẤT! Đã tổng hợp thành công cho ${soLuongThanhCong}/${danhSachGiaoVienDocs.size} giáo viên.`);
    return true;

  } catch (error) {
    console.error("❌ Lỗi nghiêm trọng trong quá trình chạy tổng hợp toàn trường:", error);
    return false;
  }
}

/**
 * 3. Cập nhật số liệu THỜI GIAN THỰC (Real-time Increment) khi nộp bài mới
 */
export async function capNhatSoLieuKhiNopBaiMoi(db, namHoc = "2026-2027", maGiaoVien, tenMon, tenKhoi) {
  try {
    const fieldPathSubjects = `subjects.${tenMon}`;
    const fieldPathClassBreakdown = `classBreakdown.${tenMon}.${tenKhoi}`;

    const collectionDich = `THONGKE_${namHoc}`;
    const docThongKeRef = doc(db, collectionDich, maGiaoVien);

    await updateDoc(docThongKeRef, {
      totalFiles: increment(1),
      [fieldPathSubjects]: increment(1),
      [fieldPathClassBreakdown]: increment(1),
      lastUpdated: new Date().toISOString()
    });

    console.log(`⚡ Đã cập nhật real-time cho GV ${maGiaoVien} tại ${collectionDich} (Môn: ${tenMon} - ${tenKhoi})`);
    return true;
  } catch (error) {
    console.error("Lỗi khi cập nhật real-time:", error);
    return false;
  }
}