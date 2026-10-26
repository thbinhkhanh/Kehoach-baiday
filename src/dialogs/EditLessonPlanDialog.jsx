import React, { useRef } from "react";
import { Box, Button, Dialog } from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import LessonPlanEditor from "../components/LessonPlanEditor";

export default function EditLessonPlanDialog({
  open,
  onClose,
  editingFile,
  teacherName,
  subject,
  className,
  academicYear,
  setFileList,
  updateFileList,
  showMessage,
}) {
  const editorRef = useRef(null);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      PaperProps={{ sx: { bgcolor: "#f8fafc" } }}
    >
      {/* Header chứa các nút hành động */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          p: 1,
          bgcolor: "white",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <Button
          variant="contained"
          color="primary"
          startIcon={<SaveIcon />}
          onClick={() => {
            // Kích hoạt hàm lưu bên trong LessonPlanEditor
            if (editorRef.current) {
              editorRef.current.triggerSave();
            }
          }}
          sx={{ borderRadius: "8px", textTransform: "none", fontWeight: 600 }}
        >
          Lưu điều chỉnh
        </Button>

        <Button
          variant="outlined"
          color="error"
          onClick={onClose}
          sx={{ borderRadius: "8px", textTransform: "none", fontWeight: 600 }}
        >
          Đóng / Thoát
        </Button>
      </Box>

      {/* Nội dung trình chỉnh sửa bài dạy */}
      <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
        <LessonPlanEditor
          ref={editorRef}
          teacherName={teacherName}
          initialData={{
            ...editingFile,
            metadata: {
              ...editingFile?.metadata,
              monHoc: subject,
              khoiLop: className,
            },
          }}
          onClose={onClose}
          onSaveToFirestore={async (updatedPayload) => {
            try {
              console.log("🔥 Đã xử lý dữ liệu KHBD:", updatedPayload);

              let updatedList = [];

              // 1. Cập nhật ngay lập tức vào state fileList ngoài trang chính
              setFileList((prevList) => {
                updatedList = prevList.map((f) => {
                  const fId = f.id || f.fileId;
                  const targetId = editingFile?.id || editingFile?.fileId;

                  if (fId === targetId) {
                    if (updatedPayload === null) {
                      // Trường hợp XÓA ĐIỀU CHỈNH: Gỡ bỏ các trường điều chỉnh cũ ra khỏi file
                      const { outcomes, equipment, activities, adjustments, updatedAt, ...cleanFile } = f;
                      return cleanFile;
                    } else {
                      // Trường hợp LƯU ĐIỀU CHỈNH: Gộp dữ liệu mới vào file
                      return {
                        ...f,
                        ...updatedPayload,
                      };
                    }
                  }
                  return f;
                });
                return updatedList;
              });

              // 🔥 2. ĐỒNG BỘ VÀO CONTEXT / LOCALSTORAGE ĐỂ GIỮ CHIP KHI ĐỔI MÔN, ĐỔI LỚP
              const fileKey = `${academicYear}_${teacherName}_${subject}_${className}`;
              updateFileList(fileKey, updatedList);

              onClose(); // Đóng form soạn thảo lại
              showMessage("💾 Lưu nội dung điều chỉnh thành công!", "success");

            } catch (error) {
              console.error("Lỗi khi cập nhật danh sách:", error);
              showMessage("❌ Không thể cập nhật trạng thái hiển thị.", "error");
            }
          }}
        />
      </Box>
    </Dialog>
  );
}