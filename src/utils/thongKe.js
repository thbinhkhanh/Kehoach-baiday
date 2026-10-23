// src/utils/thongKe.js
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Hàm tổng hợp dữ liệu toàn trường theo các khối và tổ
 */
export const fetchSchoolSummaryData = async ({
  isAdmin,
  phanQuyenMap,
  allMonHoc,
  academicYear,
  groupedTeachers,
  filteredSubjectNames,
  setLoadingSchoolSummary,
  setSchoolSummaryGrouped,
}) => {
  if (!isAdmin || Object.keys(phanQuyenMap).length === 0 || allMonHoc.length === 0) return;
  
  setLoadingSchoolSummary(true);
  try {
    const yearCol = `KEHOACH_DAYHOC_${academicYear}`;

    const groupDefinitions = [
      { key: "khoi1", title: "📌 Khối 1" },
      { key: "khoi2", title: "📌 Khối 2" },
      { key: "khoi3", title: "📌 Khối 3" },
      { key: "khoi4", title: "📌 Khối 4" },
      { key: "khoi5", title: "📌 Khối 5" },
      { key: "tiengAnh", title: "📌 Tổ Tiếng Anh" },
      { key: "boMon", title: "📌 Tổ Bộ Môn" },
    ];

    const groupedResult = {};

    for (const groupDef of groupDefinitions) {
      const teacherList = groupedTeachers[groupDef.key] || [];
      if (teacherList.length === 0) continue;

      const teacherPromises = teacherList.map(async (username) => {
        const teacherInfo = phanQuyenMap[username] || {};
        const subjectCounts = {};
        let totalCount = 0;

        const subPromises = filteredSubjectNames.map(async (subName) => {
          try {
            const subColRef = collection(db, yearCol, username, subName);
            const subSnap = await getDocs(subColRef);
            return { subName, count: subSnap.size };
          } catch (e) {
            return { subName, count: 0 };
          }
        });

        const subResults = await Promise.all(subPromises);
        subResults.forEach(({ subName, count }) => {
          subjectCounts[subName] = count;
          totalCount += count;
        });

        return {
          username,
          role: teacherInfo.role || "GVCN",
          assignedSubjects: teacherInfo.assignedSubjects || [],
          teachingClasses: teacherInfo.teachingClasses || [],
          subjectCounts,
          totalCount,
        };
      });

      const rows = await Promise.all(teacherPromises);
      groupedResult[groupDef.key] = {
        title: groupDef.title,
        rows,
      };
    }

    setSchoolSummaryGrouped(groupedResult);
  } catch (err) {
    console.error("❌ Lỗi khi tổng hợp toàn trường:", err);
  } finally {
    setLoadingSchoolSummary(false);
  }
};

/**
 * Hàm thống kê bài nộp cá nhân của một giáo viên
 */
export const fetchTeacherStatsData = async ({
  isAdmin,
  selectedUsername,
  academicYear,
  phanQuyenMap,
  setLoadingStats,
  setStatsData,
}) => {
  if (!isAdmin || !selectedUsername) return [];
  
  setLoadingStats(true);
  try {
    const yearCol = `KEHOACH_DAYHOC_${academicYear}`;
    const stats = [];

    const teacherInfo = phanQuyenMap[selectedUsername];
    if (teacherInfo) {
      const assignedSubs = teacherInfo.assignedSubjects || [];

      for (const sub of assignedSubs) {
        try {
          const subColRef = collection(db, yearCol, selectedUsername, sub);
          const subSnap = await getDocs(subColRef);

          if (!subSnap.empty) {
            let entry = {
              username: selectedUsername,
              subject: sub,
              "1": 0,
              "2": 0,
              "3": 0,
              "4": 0,
              "5": 0,
            };

            subSnap.forEach((docSnap) => {
              const data = docSnap.data();
              const khoiStr = String(data.khoi || "");

              ["1", "2", "3", "4", "5"].forEach((cls) => {
                if (khoiStr.includes(cls)) {
                  entry[cls] += 1;
                }
              });
            });

            stats.push(entry);
          }
        } catch (e) {
          // Bỏ qua nếu subcollection chưa tồn tại
        }
      }
    }

    setStatsData(stats);
    return stats;
  } catch (err) {
    console.error("❌ Lỗi khi thống kê bài nộp:", err);
    return [];
  } finally {
    setLoadingStats(false);
  }
};