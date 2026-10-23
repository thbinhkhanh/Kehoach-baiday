import React from "react";
import {
  Box,
  Stack,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Chip,
  Checkbox,
  Button,
  FormGroup,
  FormControlLabel,
} from "@mui/material";
import AssignmentIndOutlinedIcon from "@mui/icons-material/AssignmentIndOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";

export default function TeacherAssignmentForm({
  assignedRole,
  handleRoleChange,
  selectedTeacher,
  setSelectedTeacher,
  filteredTeachers,
  assignedSubjects,
  handleSubjectChange,
  currentAvailableSubjects,
  assignedClass,
  setAssignedClass,
  teachingClasses,
  handleClassCheck,
  saving,
  handleSave,
}) {
  return (
    <Box
      sx={{
        minWidth: 0,
        pb: 2.5,
        borderBottom: "1px solid #e8edf5",
      }}
    >
      <Box
        sx={{
          height: 4,
          width: 54,
          borderRadius: 5,
          bgcolor: "#2563eb",
          mb: 2,
        }}
      />

      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        sx={{ mb: 2.5 }}
      >
        <Box
          sx={{
            width: 42,
            height: 42,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "#eaf1ff",
            color: "#2563eb",
            flexShrink: 0,
          }}
        >
          <AssignmentIndOutlinedIcon />
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: 18,
              fontWeight: 750,
              color: "#172b4d",
            }}
          >
            Phân công giáo viên
          </Typography>

          <Typography
            sx={{
              fontSize: 13,
              color: "#718096",
              mt: 0.3,
            }}
          >
            Chọn giáo viên và thiết lập nhiệm vụ giảng dạy
          </Typography>
        </Box>
      </Stack>

      <Box
        sx={{
          p: { xs: 1.5, sm: 2 },
          borderRadius: 2.5,
          bgcolor: "#f8faff",
          border: "1px solid #e8eef8",
        }}
      >
        <Grid container spacing={2} alignItems="center">
          {/* VAI TRÒ CHUYÊN MÔN */}
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Vai trò chuyên môn</InputLabel>
              <Select
                value={assignedRole}
                label="Vai trò chuyên môn"
                onChange={handleRoleChange}
                sx={{ bgcolor: "#fff", borderRadius: 2 }}
              >
                <MenuItem value="GVCN">Giáo viên chủ nhiệm</MenuItem>
                <MenuItem value="BM">Giáo viên bộ môn</MenuItem>
                <MenuItem value="TA">Giáo viên Tiếng Anh</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* GIÁO VIÊN */}
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Giáo viên</InputLabel>
              <Select
                value={selectedTeacher}
                label="Giáo viên"
                onChange={(e) => setSelectedTeacher(e.target.value)}
                sx={{ bgcolor: "#fff", borderRadius: 2 }}
              >
                {filteredTeachers.length === 0 ? (
                  <MenuItem disabled value="">
                    <em>Không có giáo viên trong nhóm này</em>
                  </MenuItem>
                ) : (
                  filteredTeachers.map((t) => (
                    <MenuItem key={t.id || t.username} value={t.username}>
                      {t.username}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
          </Grid>

          {/* MÔN HỌC HOẶC LỚP CHỦ NHIỆM */}
          {assignedRole === "BM" && (
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Môn học giảng dạy</InputLabel>
                <Select
                  multiple
                  value={assignedSubjects}
                  onChange={handleSubjectChange}
                  input={<OutlinedInput label="Môn học giảng dạy" />}
                  renderValue={(selected) => (
                    <Box
                      sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 0.5,
                      }}
                    >
                      {selected.map((value) => (
                        <Chip
                          key={value}
                          label={value}
                          size="small"
                          sx={{
                            bgcolor: "#edf4ff",
                            color: "#2457c5",
                            fontWeight: 600,
                          }}
                        />
                      ))}
                    </Box>
                  )}
                  sx={{ bgcolor: "#fff", borderRadius: 2 }}
                >
                  {currentAvailableSubjects.length === 0 ? (
                    <MenuItem disabled value="">
                      <em>Không có môn học phù hợp với lớp đã chọn</em>
                    </MenuItem>
                  ) : (
                    currentAvailableSubjects.map((sub) => (
                      <MenuItem key={sub.name} value={sub.name}>
                        <Checkbox
                          size="small"
                          checked={assignedSubjects.indexOf(sub.name) > -1}
                        />
                        {sub.name}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </Grid>
          )}

          {assignedRole === "TA" && (
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small" disabled>
                <InputLabel>Môn học giảng dạy</InputLabel>
                <Select
                  value="Tiếng Anh"
                  label="Môn học giảng dạy"
                  sx={{ bgcolor: "#fff", borderRadius: 2 }}
                >
                  <MenuItem value="Tiếng Anh">Tiếng Anh</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          )}

          {assignedRole === "GVCN" && (
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Lớp chủ nhiệm</InputLabel>
                <Select
                  value={assignedClass}
                  label="Lớp chủ nhiệm"
                  onChange={(e) => setAssignedClass(e.target.value)}
                  sx={{ bgcolor: "#fff", borderRadius: 2 }}
                >
                  {[1, 2, 3, 4, 5].map((i) => (
                    <MenuItem key={i} value={String(i)}>
                      Lớp {i}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}

          {/* NÚT LƯU */}
          <Grid item xs={12} md={3}>
            <Button
              variant="contained"
              disabled={saving || !selectedTeacher}
              onClick={handleSave}
              startIcon={<SaveOutlinedIcon />}
              title="Lưu phân công"
              aria-label="Lưu phân công"
              sx={{
                minHeight: 40,
                height: 40,
                width: "100%",
                borderRadius: 2,
                bgcolor: "#2563eb",
                fontWeight: 700,
                textTransform: "none",
                boxShadow: "none",
                "&:hover": {
                  bgcolor: "#1d4ed8",
                  boxShadow: "none",
                },
              }}
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </Button>
          </Grid>

          {/* CÁC KHỐI/LỚP PHỤ TRÁCH */}
          {(assignedRole === "BM" || assignedRole === "TA") && (
            <Grid item xs={12}>
              <Box
                sx={{
                  width: "100%",
                  boxSizing: "border-box",
                  mt: 1,
                  p: 2,
                  border: "1px solid #dbe3ef",
                  borderRadius: 2,
                  bgcolor: "#f8fafc",
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 700,
                    color: "#1e3a8a",
                    mb: 1.5,
                  }}
                >
                  Chọn các khối/lớp phụ trách giảng dạy:
                </Typography>
                <FormGroup row>
                  {["1", "2", "3", "4", "5"].map((cls) => (
                    <FormControlLabel
                      key={cls}
                      control={
                        <Checkbox
                          checked={teachingClasses.includes(cls)}
                          onChange={() => handleClassCheck(cls)}
                          size="small"
                        />
                      }
                      label={`Lớp ${cls}`}
                      sx={{ mr: 3 }}
                    />
                  ))}
                </FormGroup>
              </Box>
            </Grid>
          )}
        </Grid>
      </Box>
    </Box>
  );
}