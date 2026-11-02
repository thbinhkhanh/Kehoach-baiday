import React from "react";
import {
  Tabs,
  Tab,
  Box,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ListSubheader,
} from "@mui/material";
import {
  ClassRounded,
  MenuBookRounded,
  BookmarkRounded,
  StarRounded,
  SchoolRounded,
} from "@mui/icons-material";

export default function BGHTabsPanel({
  activeTab,
  setActiveTab,
  className,
  setClassName,
  filterCategory,
  handleCategoryChange,
  selectedUsername,
  setSelectedUsername,
  setViewMode,
  groupedTeachers,
  currentTeacherList,
  subject,
  setSubject,
  teacherAllowedSubjects,
  teacherAllowedClasses,
  selectedGrade,
  setSelectedGrade,
  subjectTab1,
  setSubjectTab1,
  tab1AllowedSubjects,
  phanQuyenMap,
}) {
  return (
    <>
      {/* Thanh Tabs */}
      <Tabs
        value={activeTab}
        onChange={(e, newValue) => {
          setActiveTab(newValue);
          // Khi chuyển sang tab Đề KTĐK (1) hoặc Biên bản (2), mặc định đặt Khối là "1"
          if (newValue === 1 || newValue === 2) {
            setClassName("1");
          }
        }}
        variant="fullWidth"
        sx={{
          minHeight: 42,
          bgcolor: "transparent",
          borderBottom: "2px solid #e2e8f0",
          "& .MuiTabs-indicator": {
            height: 3,
            borderRadius: "3px 3px 0 0",
            backgroundColor: "#1976d2",
          },
          "& .MuiTab-root": {
            minHeight: 40,
            fontWeight: 600,
            fontSize: "13.5px",
            textTransform: "none",
            color: "#64748b",
            mx: 0.5,
            padding: "4px 0",
            "&:hover": {
              color: "#1976d2",
            },
            "&.Mui-selected": {
              color: "#1976d2",
              fontWeight: 700,
            },
          },
        }}
      >
        <Tab label="📚 KHBD" />
        <Tab label="📋 Đề KTĐK" />
        <Tab label="📝 Biên bản" />
      </Tabs>

      {/* 🌟 CHỈ HIỂN THỊ CÁC NÚT TỔNG HỢP VÀ BỘ LỌC CÁ NHÂN Ở TAB KHBD (activeTab === 0) */}
      {activeTab === 0 && (
        <>
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight="bold"
              gutterBottom
              display="block"
              sx={{ mb: 0.5 }}
            >
              🔍 LỌC NHÓM GIÁO VIÊN:
            </Typography>
            <ToggleButtonGroup
              value={filterCategory}
              exclusive
              onChange={handleCategoryChange}
              size="small"
              fullWidth
              sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}
            >
              <ToggleButton value="gvcn" sx={{ flex: 1, fontSize: "0.75rem", py: 0.4 }}>
                GVCN (1-5)
              </ToggleButton>
              <ToggleButton value="tieng_anh" sx={{ flex: 1, fontSize: "0.75rem", py: 0.4 }}>
                Tiếng Anh
              </ToggleButton>
              <ToggleButton value="bo_mon" sx={{ flex: 1, fontSize: "0.75rem", py: 0.4 }}>
                Bộ môn
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <FormControl fullWidth size="small">
            <InputLabel>👤 Chọn Giáo viên</InputLabel>
            <Select
              value={selectedUsername || ""}
              label="👤 Chọn Giáo viên"
              onChange={(e) => {
                setSelectedUsername(e.target.value);
                setViewMode("single");
              }}
              MenuProps={{
                PaperProps: {
                  sx: { maxHeight: 420 },
                },
              }}
            >
              {filterCategory === "gvcn" ? (
                [
                  {
                    key: "khoi1",
                    title: "Khối Lớp 1",
                    teachers: groupedTeachers.khoi1,
                    icon: <ClassRounded fontSize="small" />,
                  },
                  {
                    key: "khoi2",
                    title: "Khối Lớp 2",
                    teachers: groupedTeachers.khoi2,
                    icon: <MenuBookRounded fontSize="small" />,
                  },
                  {
                    key: "khoi3",
                    title: "Khối Lớp 3",
                    teachers: groupedTeachers.khoi3,
                    icon: <BookmarkRounded fontSize="small" />,
                  },
                  {
                    key: "khoi4",
                    title: "Khối Lớp 4",
                    teachers: groupedTeachers.khoi4,
                    icon: <StarRounded fontSize="small" />,
                  },
                  {
                    key: "khoi5",
                    title: "Khối Lớp 5",
                    teachers: groupedTeachers.khoi5,
                    icon: <SchoolRounded fontSize="small" />,
                  },
                ].flatMap((group) =>
                  group.teachers.length > 0
                    ? [
                        <ListSubheader
                          key={`header-${group.key}`}
                          disableSticky
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            bgcolor: "#f1f5f9",
                            color: "#1e40af",
                            fontWeight: 700,
                            lineHeight: "40px",
                          }}
                        >
                          {group.icon}
                          {group.title}
                        </ListSubheader>,
                        ...group.teachers.map((name) => (
                          <MenuItem
                            key={`${group.key}-${name}`}
                            value={name}
                            sx={{ pl: 4 }}
                          >
                            {name}
                          </MenuItem>
                        )),
                      ]
                    : []
                )
              ) : currentTeacherList.length > 0 ? (
                currentTeacherList.map((name) => (
                  <MenuItem key={name} value={name}>
                    {name}
                  </MenuItem>
                ))
              ) : (
                <MenuItem disabled value="">
                  <em>Không có giáo viên trong nhóm này</em>
                </MenuItem>
              )}
            </Select>
          </FormControl>

          <Box sx={{ display: "flex", gap: 1.5 }}>
            <FormControl size="small" sx={{ flex: 1 }}>
              <InputLabel>Môn học</InputLabel>
              <Select
                value={subject}
                label="Môn học"
                onChange={(e) => setSubject(e.target.value)}
              >
                {teacherAllowedSubjects.length === 0 ? (
                  <MenuItem disabled value="">
                    <em>Không có môn phù hợp</em>
                  </MenuItem>
                ) : (
                  teacherAllowedSubjects.map((subName) => (
                    <MenuItem key={subName} value={subName}>
                      {subName}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ flex: 1 }}>
              <InputLabel>Lớp</InputLabel>
              <Select
                value={className}
                label="Lớp"
                onChange={(e) => setClassName(e.target.value)}
              >
                {teacherAllowedClasses.length === 0 ? (
                  <MenuItem disabled value="">
                    <em>Không có lớp</em>
                  </MenuItem>
                ) : (
                  teacherAllowedClasses.map((clsNum) => {
                    const isGVCN = phanQuyenMap[selectedUsername]?.role === "GVCN";
                    return (
                      <MenuItem key={clsNum} value={clsNum}>
                        {isGVCN ? clsNum : `Lớp ${clsNum}`}
                      </MenuItem>
                    );
                  })
                )}
              </Select>
            </FormControl>
          </Box>
        </>
      )}

      {/* 📋 TAB 1: ĐỀ KTĐK -> Sử dụng subjectTab1 độc lập */}
      {activeTab === 1 && (
        <Box sx={{ display: "flex", gap: 1.5, mt: 0.5 }}>
          <FormControl size="small" sx={{ flex: 1 }}>
            <InputLabel>Khối / Tổ CM</InputLabel>
            <Select
              value={selectedGrade}
              label="Khối / Tổ CM"
              onChange={(e) => setSelectedGrade(e.target.value)}
            >
              {["1", "2", "3", "4", "5", "Bo_mon", "Tieng_Anh"].map((item) => (
                <MenuItem key={item} value={item}>
                  {item === "Bo_mon" ? "Bộ môn" : item === "Tieng_Anh" ? "Tiếng Anh" : `Khối ${item}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ flex: 1 }}>
            <InputLabel>Môn học</InputLabel>
            <Select 
              value={subjectTab1} 
              label="Môn học" 
              onChange={(e) => setSubjectTab1(e.target.value)}
            >
              {(!tab1AllowedSubjects || tab1AllowedSubjects.length === 0) ? (
                <MenuItem disabled value=""><em>Không có môn học</em></MenuItem>
              ) : (
                tab1AllowedSubjects.map((subName) => (
                  <MenuItem key={subName} value={subName}>
                    {subName}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
        </Box>
      )}

      {/* 📝 TAB 2: BIÊN BẢN -> Đồng bộ chọn Khối / Tổ CM với Tab 1 */}
      {activeTab === 2 && (
        <Box sx={{ mt: 0.5 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Khối / Tổ CM</InputLabel>
            <Select
              value={selectedGrade}
              label="Khối / Tổ CM"
              onChange={(e) => setSelectedGrade(e.target.value)}
            >
              {["1", "2", "3", "4", "5", "Bo_mon", "Tieng_Anh"].map((item) => (
                <MenuItem key={item} value={item}>
                  {item === "Bo_mon" ? "Bộ môn" : item === "Tieng_Anh" ? "Tiếng Anh" : `Khối ${item}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}
    </>
  );
}