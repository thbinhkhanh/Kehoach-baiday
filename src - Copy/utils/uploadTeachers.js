// src/utils/uploadTeachers.js
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase"; // Trỏ đúng về file khởi tạo firebase.js của trường

/**
 * Hàm upload hoặc cập nhật danh sách giáo viên lên collection "GIAOVIEN" trên Firestore (Không dùng email)
 * @param {Array<Object>} teacherList - Mảng chứa danh sách giáo viên
 * Ví dụ mẫu: 
 * [
 *   { tenGV: "Pham_Van_Thai", subject: "Tin học", class: "3" },
 *   { tenGV: "Nguyen_Van_A", subject: "Toán", class: "4" }
 * ]
 */
export async function uploadTeacherList(teacherList) {
  try {
    if (!teacherList || teacherList.length === 0) {
      return { success: false, error: "Danh sách giáo viên trống!" };
    }

    let countAdded = 0;
    let countSkipped = 0;

    for (const teacher of teacherList) {
      // Kiểm tra xem giáo viên này (theo tên tenGV) đã tồn tại trong Firestore chưa để tránh trùng lặp
      const q = query(collection(db, "GIAOVIEN"), where("tenGV", "==", teacher.tenGV));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // Nếu chưa có -> Thêm mới vào collection GIAOVIEN
        await addDoc(collection(db, "GIAOVIEN"), {
          tenGV: teacher.tenGV,       // Tên giáo viên (dùng làm thư mục Google Drive)
          subject: teacher.subject,   // Môn học được phân công
          class: teacher.class,       // Khối/Lớp được phân công
          createdAt: new Date()
        });
        countAdded++;
      } else {
        console.log(`Giáo viên ${teacher.tenGV} đã tồn tại trong hệ thống.`);
        countSkipped++;
      }
    }

    console.log(`✅ Hoàn tất! Đã thêm mới ${countAdded} giáo viên vào collection GIAOVIEN.`);
    return { success: true, added: countAdded, skipped: countSkipped };

  } catch (error) {
    console.error("❌ Lỗi khi tải danh sách giáo viên lên Firestore:", error);
    return { success: false, error: error.message };
  }
}