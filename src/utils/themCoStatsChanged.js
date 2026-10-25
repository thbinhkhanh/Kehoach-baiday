
import { db } from "../firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";

/**
 * Ghi đè statsChanged: true cho TẤT CẢ document
 * trong KEHOACH_DAYHOC_2026-2027.
 *
 * - Không phân biệt statsChanged đã tồn tại hay chưa.
 * - Không xóa các trường dữ liệu khác.
 * - Không xóa hoặc thay đổi các subcollection.
 * - Không dùng setDoc để tránh ghi đè document.
 */
export const themCoStatsChangedHangLoat = async () => {
  const collectionName = "KEHOACH_DAYHOC_2026-2027";

  const result = {
    total: 0,
    updated: [],
    errors: [],
  };

  const snapshot = await getDocs(
    collection(db, collectionName)
  );

  result.total = snapshot.size;

  for (const item of snapshot.docs) {
    try {
      await updateDoc(
        doc(db, collectionName, item.id),
        {
          statsChanged: true,
          updatedAt: new Date(),
        }
      );

      result.updated.push(item.id);

      //console.log(`Đã cập nhật statsChanged: ${item.id}`);
    } catch (error) {
      result.errors.push({
        teacher: item.id,
        message: error.message,
      });

      console.error(
        `Lỗi cập nhật ${item.id}:`,
        error
      );
    }
  }

  //console.log("KẾT QUẢ CẬP NHẬT CỜ HÀNG LOẠT:", result);

  return result;
};
