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
  allMonHoc = [],
  setLoadingStats,
  setStatsData,
}) => {
  if (!isAdmin || !selectedUsername) return [];

  setLoadingStats?.(true);

  try {
    const yearCol = `KEHOACH_DAYHOC_${academicYear}`;
    const stats = [];
    const teacherInfo = phanQuyenMap?.[selectedUsername];

    if (!teacherInfo) {
      setStatsData?.([]);
      return [];
    }

    const rawSubs = teacherInfo.assignedSubjects || [];
    const isGVCN = teacherInfo.role === "GVCN";

    const isAllGVCN =
      rawSubs.length === 0 ||
      rawSubs.some((s) =>
        String(s).toLowerCase().includes("tất cả")
      );

    let assignedSubs = [];

    if (isGVCN && isAllGVCN) {
      // GVCN: lấy các môn học thuộc khối được phân công,
      // loại các môn do giáo viên chuyên trách phụ trách.
      const classCode = String(
        teacherInfo.teachingClasses?.[0] ||
        teacherInfo.assignedClass ||
        ""
      );

      const grade = classCode.split(".")[0];

      const specialistKeywords = [
        "tiếng anh",
        "tin học",
        "mĩ thuật",
        "mỹ thuật",
        "âm nhạc",
        "thể dục",
        "giáo dục thể chất",
      ];

      assignedSubs = allMonHoc
        .filter((sub) => {
          const grades = (sub.grades || []).map((g) =>
            String(g).trim()
          );

          const matchesGrade =
            grades.length === 0 || grades.includes(grade);

          const isSpecialist = specialistKeywords.some((kw) =>
            String(sub.name || "").toLowerCase().includes(kw)
          );

          return matchesGrade && !isSpecialist;
        })
        .map((sub) => sub.name)
        .filter(Boolean);
        } else {
          assignedSubs = rawSubs.filter(
            (s) => !String(s).toLowerCase().includes("tất cả")
          );
        }

        // Giữ nguyên mã lớp đầy đủ, ví dụ 5.4, để khớp cột thống kê.
        const classCode = String(
          teacherInfo.teachingClasses?.[0] ||
          teacherInfo.assignedClass ||
          ""
        );

        for (const subject of [...new Set(assignedSubs)]) {
      try {
        const subjectRef = collection(
          db,
          yearCol,
          selectedUsername,
          subject
        );

        const subjectSnap = await getDocs(subjectRef);

        if (subjectSnap.empty) continue;

        const entry = {
          username: selectedUsername,
          subject,
        };

        subjectSnap.forEach((docSnap) => {
          const data = docSnap.data();
          const docId = docSnap.id;

          // GVCN: đếm tất cả bài của lớp chủ nhiệm
          if (isGVCN && classCode) {
            const isKhoiDocument = /^Khoi_\d+_/i.test(docId);

            if (
              isKhoiDocument ||
              data?.fileURL ||
              data?.fileUrl ||
              data?.url ||
              data?.fileName ||
              data?.tenFile
            ) {
              entry[classCode] = (entry[classCode] || 0) + 1;
            }

            return;
          }

          // Giáo viên bộ môn: tách số lượng theo từng khối
          const match = docId.match(/^Khoi_(\d+)_/i);

          let grade = match?.[1];

          // Nếu ID không theo mẫu Khoi_<số>_<mã>,
          // thử lấy khối từ dữ liệu tài liệu.
          if (!grade) {
            const khoiValue = String(
              data?.khoi || data?.className || ""
            ).trim();

            const metadataMatch = khoiValue.match(
              /^(?:khối|khoi|lớp|lop)\s*(\d+)/i
            );

            if (metadataMatch) {
              grade = metadataMatch[1];
            }
          }

          const hasFile =
            /^Khoi_\d+_/i.test(docId) ||
            data?.fileURL ||
            data?.fileUrl ||
            data?.url ||
            data?.fileName ||
            data?.tenFile;

          if (grade && hasFile) {
            entry[grade] = (entry[grade] || 0) + 1;
          }
        });

        // Chỉ thêm môn có dữ liệu thống kê
        const hasStats = isGVCN
          ? Number(entry[classCode] || 0) > 0
          : ["1", "2", "3", "4", "5"].some(
              (grade) => Number(entry[grade] || 0) > 0
            );

        if (hasStats) {
          stats.push(entry);
        }
      } catch (error) {
        console.error(
          `Lỗi thống kê môn ${subject} của ${selectedUsername}:`,
          error
        );
      }
    }

    setStatsData?.(stats);
    return stats;
  } catch (error) {
    console.error("Lỗi thống kê cá nhân:", error);
    setStatsData?.([]);
    return [];
  } finally {
    setLoadingStats?.(false);
  }
};