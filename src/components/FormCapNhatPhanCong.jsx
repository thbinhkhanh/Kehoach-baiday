import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  OutlinedInput,
  Button,
  ListSubheader,
} from "@mui/material";

export default function FormCapNhatPhanCong({
  assignedRole,
  handleRoleChange,
  selectedTeacher,
  setSelectedTeacher,
  filteredTeachers,
  teachers,
  assignmentsMap,
  gvcnList,
  assignedClass,
  setAssignedClass,
  selectedGrade,
  setSelectedGrade,
  assignedSubjects,
  handleSubjectChange,
  currentAvailableSubjects,
  teachingClasses,
  handleClassCheck,
  handleSave,
  saving,
}) {

  useEffect(() => {
    if (teachers.length > 0 && Object.keys(assignmentsMap).length > 0) {
      // Nếu chưa chọn giáo viên hoặc muốn ép mặc định lớp 1.1 khi vừa load trang
      const gvcn11 = Object.values(assignmentsMap).find(
        (item) => item.role === "GVCN" && String(item.assignedClass || "").replace(/^lớp\s*/i, "").trim() === "1.1"
      );

      if (gvcn11 && gvcn11.username) {
        setSelectedTeacher(gvcn11.username);
      } else if (filteredTeachers.length > 0 && !selectedTeacher) {
        setSelectedTeacher(filteredTeachers[0].username);
      }
    }
  }, [assignmentsMap, teachers]);
    // Hàm phân nhóm GVCN theo khối và sắp xếp theo thứ tự lớp
  const renderTeacherOptions = () => {
    if (assignedRole === "GVCN") {
      const groups = { "1": [], "2": [], "3": [], "4": [], "5": [] };
      
      filteredTeachers.forEach((t) => {
        const cls = assignmentsMap[t.username]?.assignedClass || "";
        const grade = cls.replace(/^lớp\s*/i, "").split(".")[0] || "Khác";
        if (!groups[grade]) groups[grade] = [];
        groups[grade].push(t);
      });

      // Sắp xếp giáo viên trong từng khối theo thứ tự lớp (1.1, 1.2, ...)
      Object.keys(groups).forEach((grade) => {
        groups[grade].sort((a, b) => {
          const classA = assignmentsMap[a.username]?.assignedClass || "";
          const classB = assignmentsMap[b.username]?.assignedClass || "";
          return classA.localeCompare(classB, "vi", { numeric: true });
        });
      });

      const items = [];
      ["1", "2", "3", "4", "5", "Khác"].forEach((grade) => {
        if (groups[grade] && groups[grade].length > 0) {
          items.push(
            <ListSubheader 
              key={`grade-${grade}`} 
              sx={{ fontWeight: 700, bgcolor: "#f8fafc", color: "#2457c5", lineHeight: "32px" }}
            >
              Khối lớp {grade}
            </ListSubheader>
          );
          groups[grade].forEach((t) => {
            items.push(
              <MenuItem key={t.id || t.username} value={t.username} sx={{ pl: 3 }}>
                {t.username} {/* Chỉ hiển thị tên giáo viên gọn gàng */}
              </MenuItem>
            );
          });
        }
      });
      return items;
    }

    // Đối với vai trò khác (TA, BM)
    return filteredTeachers.map((t) => (
      <MenuItem key={t.id || t.username} value={t.username}>
        {t.username}
      </MenuItem>
    ));
  };

  return (
    <Box sx={{ p: 2, bgcolor: "#f8fafc", borderRadius: 2, border: "1px solid #e2e8f0" }}>
      <Typography sx={{ fontWeight: 700, mb: 2, color: "#172b4d" }}>
        Cập nhật phân công giáo viên
      </Typography>

      <Stack spacing={2} sx={{ width: "100%", minWidth: 0 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.5}
          alignItems={{ xs: "stretch", md: "center" }}
          sx={{ width: "100%", minWidth: 0 }}
        >
          {/* Vai trò */}
          <FormControl
            size="small"
            sx={{
              width: { xs: "100%", md: "auto" },
              minWidth: "95px",
              flexShrink: 0,
            }}
          >
            <InputLabel>Vai trò</InputLabel>
            <Select
              value={assignedRole}
              label="Vai trò"
              onChange={handleRoleChange}
              sx={{
                "& .MuiSelect-select": {
                  py: 1,
                  px: 1.5,
                },
              }}
            >
              <MenuItem value="GVCN">GVCN</MenuItem>
              <MenuItem value="TA">TA</MenuItem>
              <MenuItem value="BM">GVBM</MenuItem>
            </Select>
          </FormControl>

          {/* Giáo viên */}
          <FormControl
            size="small"
            sx={{
              flex: 1,
              minWidth: { xs: "100%", md: "180px" },
            }}
          >
            <InputLabel>Giáo viên</InputLabel>
            <Select
              value={selectedTeacher}
              label="Giáo viên"
              onChange={(e) => setSelectedTeacher(e.target.value)}
              sx={{
                "& .MuiSelect-select": {
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                },
              }}
            >
              {renderTeacherOptions()}
            </Select>
          </FormControl>

          {/* Khối và Lớp dành cho GVCN */}
          {assignedRole === "GVCN" && (() => {
            const teacherObj =
              teachers.find((t) => t.username === selectedTeacher) || {};

            const currentAssignment = assignmentsMap[selectedTeacher] || {};

            const normalizeClass = (value) =>
              String(value || "")
                .replace(/^lớp\s*/i, "")
                .trim();

            const initialExcelClasses = teachers.map((t) => normalizeClass(t.excelClassSubject || t.subject));

            const allClasses = [
              ...new Set([
                ...initialExcelClasses,
                ...gvcnList.map((item) => normalizeClass(item.assignedClass)),
                ...(teacherObj.teachingClasses || []).map(normalizeClass),
                normalizeClass(assignedClass),
                normalizeClass(currentAssignment.assignedClass),
              ].filter((cls) => /^\d+\.\d+$/.test(cls))),
            ].sort((a, b) =>
              a.localeCompare(b, "vi", { numeric: true })
            );

            const grade =
              selectedGrade ||
              normalizeClass(assignedClass).split(".")[0] ||
              String(teacherObj.grade || "");

            const gradeOptions = [
              ...new Set([
                ...allClasses.map((cls) => cls.split(".")[0]),
                String(teacherObj.grade || ""),
                grade,
              ].filter(Boolean)),
            ].sort((a, b) => Number(a) - Number(b));

            const classOptions = allClasses.filter(
              (cls) => cls.split(".")[0] === grade
            );

            return (
              <>
                <FormControl
                  size="small"
                  sx={{ width: { xs: "100%", md: "85px" }, flexShrink: 0 }}
                >
                  <InputLabel id="gvcn-grade-label">Khối</InputLabel>
                  <Select
                    labelId="gvcn-grade-label"
                    value={grade}
                    label="Khối"
                    onChange={(e) => {
                      const newGrade = String(e.target.value);
                      setSelectedGrade(newGrade);

                      const firstClass = allClasses.find(
                        (cls) => cls.split(".")[0] === newGrade
                      );

                      setAssignedClass(firstClass || "");
                    }}
                  >
                    {gradeOptions.map((item) => (
                      <MenuItem key={item} value={item}>
                        {item}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl
                  size="small"
                  sx={{ width: { xs: "100%", md: "110px" }, flexShrink: 0 }}
                >
                  <InputLabel id="gvcn-class-label">Lớp</InputLabel>
                  <Select
                    labelId="gvcn-class-label"
                    value={
                      classOptions.includes(normalizeClass(assignedClass))
                        ? normalizeClass(assignedClass)
                        : ""
                    }
                    label="Lớp"
                    onChange={(e) => {
                      const newClass = String(e.target.value);
                      setAssignedClass(newClass);
                      setSelectedGrade(newClass.split(".")[0]);
                    }}
                  >
                    {classOptions.map((cls) => (
                      <MenuItem key={cls} value={cls}>
                        {cls}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            );
          })()}

          {/* Môn học (Dành cho BM hoặc TA) */}
          {(assignedRole === "BM" || assignedRole === "TA") && (
            <FormControl
              size="small"
              sx={{
                flex: 1,
                minWidth: { xs: "100%", md: "180px" },
              }}
            >
              <InputLabel>Môn học</InputLabel>
              <Select
                multiple
                value={assignedSubjects}
                onChange={handleSubjectChange}
                input={<OutlinedInput label="Môn học" />}
                renderValue={(selected) => selected.join(", ")}
              >
                {currentAvailableSubjects.map((sub) => (
                  <MenuItem key={sub.name} value={sub.name}>
                    <Checkbox checked={assignedSubjects.indexOf(sub.name) > -1} />
                    <ListItemText primary={sub.name} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Nút Lưu */}
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            sx={{
              width: { xs: "100%", md: "auto" },
              height: "40px",
              px: 2.5,
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 700,
              whiteSpace: "nowrap",
              bgcolor: "#2457c5",
              flexShrink: 0,
              "&:hover": { bgcolor: "#1d459e" },
            }}
          >
            {saving ? "Đang lưu..." : "Lưu"}
          </Button>
        </Stack>

        {/* Chọn khối lớp giảng dạy (Dành cho BM hoặc TA) */}
        {(assignedRole === "BM" || assignedRole === "TA") && (
          <Box sx={{ mt: 1, p: 1.5, bgcolor: "#ffffff", borderRadius: 1.5, border: "1px solid #e2e8f0" }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: "#475569" }}>
              Chọn các khối lớp giảng dạy:
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={2}>
              {["1", "2", "3", "4", "5"].map((grade) => (
                <Box key={grade} sx={{ display: "flex", alignItems: "center" }}>
                  <Checkbox
                    size="small"
                    checked={teachingClasses.includes(grade)}
                    onChange={() => handleClassCheck(grade)}
                  />
                  <Typography variant="body2">Khối {grade}</Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        )}
      </Stack>
    </Box>
  );
}