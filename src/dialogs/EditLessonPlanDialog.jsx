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
  viewOnly = false,
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
          justifyContent: viewOnly ? "flex-end" : "space-between", // Nếu chỉ xem thì đẩy nút Đóng sang phải
          alignItems: "center",
          p: 1,
          bgcolor: "white",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        {/* Chỉ hiện nút Lưu khi KHÔNG phải chế độ xem */}
        {!viewOnly && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            onClick={() => {
              if (editorRef.current) {
                editorRef.current.triggerSave();
              }
            }}
            sx={{ borderRadius: "8px", textTransform: "none", fontWeight: 600 }}
          >
            Lưu điều chỉnh
          </Button>
        )}

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
          viewOnly={viewOnly}            // 👈 Truyền cờ khóa chỉnh sửa xuống editor
          defaultTab="edit"              // 👈 Mở về Tab 1: Soạn thảo form
          onSaveToFirestore={async (updatedPayload) => {
            if (viewOnly) return;        // Nếu đang xem thì không thực hiện lưu
            try {
              console.log("🔥 Đã xử lý dữ liệu KHBD:", updatedPayload);

              let updatedList = [];

              setFileList((prevList) => {
                updatedList = prevList.map((f) => {
                  const fId = f.id || f.fileId;
                  const targetId = editingFile?.id || editingFile?.fileId;

                  if (fId === targetId) {
                    if (updatedPayload === null) {
                      const { outcomes, equipment, activities, adjustments, updatedAt, ...cleanFile } = f;
                      return cleanFile;
                    } else {
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

              const fileKey = `${academicYear}_${teacherName}_${subject}_${className}`;
              updateFileList(fileKey, updatedList);

              onClose();
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