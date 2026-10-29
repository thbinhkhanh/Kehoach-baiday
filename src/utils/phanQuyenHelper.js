import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

/**
 * 🚀 Tải và phân loại quyền hạn giáo viên theo năm học từ Firestore
 */
export const fetchPhanQuyen = async (academicYear) => {
  try {
    const phanQuyenColName = `PHANQUYEN_${academicYear}`;
    const querySnapshot = await getDocs(collection(db, phanQuyenColName));

    const groups = {
      khoi1: [],
      khoi2: [],
      khoi3: [],
      khoi4: [],
      khoi5: [],
      tiengAnh: [],
      boMon: [],
    };
    const map = {};
    let firstAvailableTeacher = "";

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const name = data.username || docSnap.id;
      const lowerName = name.toLowerCase();

      if (
        lowerName !== "admin" &&
        lowerName !== "bgh" &&
        !lowerName.includes("ban giám hiệu") &&
        !lowerName.includes("thbinhkhanh")
      ) {
        const upperName = name.toUpperCase();

        let subs = [];
        if (
          Array.isArray(data.assignedSubjects) &&
          data.assignedSubjects.length > 0
        ) {
          subs = data.assignedSubjects;
        } else if (data.assignedSubject) {
          subs = data.assignedSubject
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        }

        let cls = [];
        if (data.assignedClass) {
          cls = [String(data.assignedClass)];
        } else if (
          Array.isArray(data.teachingClasses) &&
          data.teachingClasses.length > 0
        ) {
          cls = data.teachingClasses.map(String);
        } else {
          cls = ["1", "2", "3", "4", "5"];
        }

        const teacherObj = {
          username: upperName,
          role: data.role || "GVCN",
          assignedSubjects: subs,
          teachingClasses: cls,
          grade: data.grade || "",
        };

        map[upperName] = teacherObj;

        const role = teacherObj.role;
        const subString = subs.join(" ").toLowerCase();

        if (role === "TA" || subString.includes("tiếng anh")) {
          groups.tiengAnh.push(upperName);
        } else if (
          role === "BM" ||
          subString.includes("tin học") ||
          subString.includes("mĩ thuật") ||
          subString.includes("mỹ thuật") ||
          subString.includes("âm nhạc") ||
          subString.includes("thể dục")
        ) {
          groups.boMon.push(upperName);
        } else {
          const gradeVal = teacherObj.grade || String(cls[0] || "").charAt(0);

          if (gradeVal === "1") groups.khoi1.push(upperName);
          else if (gradeVal === "2") groups.khoi2.push(upperName);
          else if (gradeVal === "3") groups.khoi3.push(upperName);
          else if (gradeVal === "4") groups.khoi4.push(upperName);
          else if (gradeVal === "5") groups.khoi5.push(upperName);
          else {
            groups.boMon.push(upperName);
          }
        }
      }
    });

    const sortByName = (arr) => {
      return arr.sort((a, b) => {
        const getLastName = (fullName) =>
          fullName?.trim().split(" ").slice(-1)[0]?.toLowerCase() || "";
        return getLastName(a).localeCompare(getLastName(b), "vi");
      });
    };

    Object.keys(groups).forEach((key) => {
      sortByName(groups[key]);
    });

    for (const key of Object.keys(groups)) {
      if (groups[key].length > 0) {
        firstAvailableTeacher = groups[key][0];
        break;
      }
    }

    return {
      groups,
      map,
      firstAvailableTeacher,
    };
  } catch (err) {
    console.error("❌ Lỗi khi tải dữ liệu phân quyền:", err);
    return null;
  }
};