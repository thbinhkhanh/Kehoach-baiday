import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  Button,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress, 
} from "@mui/material";

export default function Users({ user }) {
  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [subject, setSubject] = useState("");
  const [className, setClassName] = useState("");

  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMode, setUploadMode] = useState("upload"); // "upload" | "delete"

  // ✅ Lấy môn học theo tài khoản đăng nhập
  useEffect(() => {
    const fetchUserSubject = async () => {
      if (!user?.email) return;
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("subject")
          .eq("email", user.email)
          .single();

        if (error) throw error;

        if (data?.subject) {
          // Nếu subject là mảng → lấy môn đầu tiên
          const subjectName = Array.isArray(data.subject)
            ? data.subject[0]
            : data.subject;
          setSubject(subjectName);
        }
      } catch (err) {
        console.error("❌ Lỗi khi lấy môn học:", err.message || err);
      }
    };

    fetchUserSubject();
  }, [user]);

  const normalizeFileName = (name) =>
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9.\-_ ]/g, "")
      .replace(/\s+/g, "_")
      .toLowerCase();

  const normalizeFolderName = (str) =>
    str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .toLowerCase();

  const fetchFileList = async () => {
    if (!user?.email) return;

    // Nếu chưa chọn lớp, không fetch
    if (!className) {
      setFileList([]); // hoặc null nếu muốn hiển thị "Đang tải dữ liệu..."
      return;
    }

    try {
      let query = supabase
        .from("uploaded_files")
        .select("*")
        .eq("uploaded_by", user.email)
        .order("uploaded_at", { ascending: false });

      if (subject) query = query.eq("subject", subject);
      if (className) query = query.eq("class", className);

      const { data, error } = await query;
      if (error) throw error;

      setFileList(data || []);
    } catch (err) {
      console.error("❌ Lỗi khi tải danh sách file:", err.message || err);
      alert("❌ Lỗi khi tải danh sách file.");
    }
  };


  const getUserFolder = (email) => {
    if (!email) return "unknown";
    return email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "");
  };

  //Tải file đồng loạt

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    e.target.value = null; // 👈 Thêm dòng này để reset input file
    if (files.length === 0) return;

    for (const file of files) {
      if (
        ![
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ].includes(file.type)
      ) {
        alert(`⚠️ File "${file.name}" không hợp lệ. Chỉ hỗ trợ .doc hoặc .docx`);
        return;
      }
    }

    if (!subject || !className) {
      alert("⚠️ Vui lòng chọn Môn học và Lớp trước khi tải lên!");
      return;
    }

    try {
      setUploadMode("upload");
      setUploading(true);
      setUploadProgress(0);

      const folder = getUserFolder(user?.email);
      const cleanSubject = normalizeFolderName(subject);
      const cleanClass = normalizeFolderName(className);

      const totalFiles = files.length;
      const stepPerFile = 100 / totalFiles;

      for (let i = 0; i < totalFiles; i++) {
        const file = files[i];
        const cleanName = normalizeFileName(file.name);
        const filePath = `${folder}/${cleanSubject}/${cleanClass}/${Date.now()}_${cleanName}`;

        // 🔹 Giả lập tiến trình trong mỗi file (nội bộ)
        let localProgress = 0;
        const timer = setInterval(() => {
          localProgress = Math.min(localProgress + Math.random() * 15, 95);
          const globalProgress = Math.min(
            Math.round(i * stepPerFile + (localProgress / 100) * stepPerFile),
            99
          );
          setUploadProgress(globalProgress);
        }, 200);

        // 🔹 Upload thật
        const { error: uploadError } = await supabase.storage
          .from("data")
          .upload(filePath, file, { upsert: false });
        clearInterval(timer);
        if (uploadError) throw uploadError;

        // 🔹 Lấy URL công khai
        const { data: publicData, error: urlError } = await supabase.storage
          .from("data")
          .getPublicUrl(filePath);
        if (urlError) throw urlError;

        // 🔹 Ghi vào database
        const { error: insertError } = await supabase.from("uploaded_files").insert([
          {
            name: file.name,
            path: filePath,
            url: publicData.publicUrl,
            uploaded_by: user?.email || "unknown",
            uploaded_at: new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString(),
            subject,
            class: className,
          },
        ]);
        if (insertError) throw insertError;

        // 🔹 Hoàn tất file hiện tại
        setUploadProgress(Math.round((i + 1) * stepPerFile));
      }

      setUploadProgress(100);
      fetchFileList();
    } catch (err) {
      console.error("❌ Lỗi khi upload:", err);
      alert("❌ Không thể tải file lên.");
    } finally {
      setTimeout(() => setUploadProgress(0), 800);
      setUploading(false);
    }
  };

  const handleDeleteFiles = async (files) => {
    if (!user?.email) {
      alert("⚠️ Bạn cần đăng nhập để xóa file.");
      return;
    }

    if (files.length === 0) return;

    const confirmMessage =
      files.length === 1
        ? `🗑️ Bạn có chắc muốn xóa "${files[0].name}" không?`
        : `🗑️ Bạn có chắc muốn xóa ${files.length} file đã chọn không?`;

    const confirmDelete = window.confirm(confirmMessage);
    if (!confirmDelete) return;

    try {
      setUploadMode("delete");
      setUploading(true);
      setUploadProgress(0);

      const totalFiles = files.length;
      const stepPerFile = 100 / totalFiles;

      for (let i = 0; i < totalFiles; i++) {
        const file = files[i];

        // Giả lập tiến trình xóa
        let localProgress = 0;
        const timer = setInterval(() => {
          localProgress = Math.min(localProgress + Math.random() * 25, 95);
          const globalProgress = Math.min(
            Math.round(i * stepPerFile + (localProgress / 100) * stepPerFile),
            99
          );
          setUploadProgress(globalProgress);
        }, 200);

        // Xóa file trong storage
        const { error: storageError } = await supabase.storage
          .from("data")
          .remove([file.path]);
        clearInterval(timer);
        if (storageError) throw storageError;

        // Xóa file trong DB
        const { error: dbError } = await supabase
          .from("uploaded_files")
          .delete()
          .eq("path", file.path)
          .eq("uploaded_by", user.email);
        if (dbError) throw dbError;

        setUploadProgress(Math.round((i + 1) * stepPerFile));
      }

      setUploadProgress(100);
      fetchFileList();
    } catch (err) {
      console.error("❌ Lỗi khi xóa file:", err);
      alert("❌ Không thể xóa file. Vui lòng thử lại sau.");
    } finally {
      setTimeout(() => setUploadProgress(0), 800);
      setUploading(false);
    }
  };


  useEffect(() => {
    fetchFileList();
  }, [user, subject, className]);

  const formatVNDate = (isoString) => {
    const date = new Date(isoString);

    // Ngày theo dd/mm/yyyy
    const optionsDate = { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" };
    const formattedDate = date.toLocaleDateString("vi-VN", optionsDate);

    // Giờ theo hh:mm:ss
    const optionsTime = { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "Asia/Ho_Chi_Minh" };
    const formattedTime = date.toLocaleTimeString("vi-VN", optionsTime);

    return `${formattedDate}, ${formattedTime}`;
  };

  return (
    <Box
      sx={{
        height: "95vh",
        width: "100vw",
        display: "flex",
        gap: 2,
        p: 2,
        alignItems: "flex-start",
        flexDirection: { xs: "column", sm: "row" }, // stack trên mobile
      }}
    >
      {/* Cột trái: Upload + Danh sách file */}
      <Box
        sx={{
          width: { xs: "100%", sm: "25%" },
          minWidth: 250,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          height: { xs: "auto", sm: "95%" },
        }}
      >
        {/* Upload Card */}
        <Card sx={{ width: "100%", flexShrink: 0, mt: -3 }}>
          <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography variant="h5" gutterBottom color="primary">
              📚 Kế hoạch bài dạy
            </Typography>

            {/* Nhóm chọn môn và lớp */}
            <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>Môn học</InputLabel>
                <Select value={subject} label="Môn học" onChange={(e) => setSubject(e.target.value)}>
                  <MenuItem value="Âm nhạc">Âm nhạc</MenuItem>
                  <MenuItem value="Công nghệ">Công nghệ</MenuItem>
                  <MenuItem value="Đạo đức">Đạo đức</MenuItem>
                  <MenuItem value="Giáo dục thể chất">GD thể chất</MenuItem>
                  <MenuItem value="Mĩ thuật">Mĩ thuật</MenuItem>
                  <MenuItem value="Tiếng Anh">Tiếng Anh</MenuItem>
                  <MenuItem value="Tin học">Tin học</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>Lớp</InputLabel>
                <Select value={className} label="Lớp" onChange={(e) => setClassName(e.target.value)}>
                  <MenuItem value="1">Lớp 1</MenuItem>
                  <MenuItem value="2">Lớp 2</MenuItem>
                  <MenuItem value="3">Lớp 3</MenuItem>
                  <MenuItem value="4">Lớp 4</MenuItem>
                  <MenuItem value="5">Lớp 5</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Nhóm nút thao tác */}
            <Box
              sx={{
                display: "flex",
                gap: 2,
                flexWrap: "nowrap", // luôn trên 1 hàng
                overflowX: "auto",  // scroll ngang nếu nhỏ màn hình
              }}
            >
              <Button
                variant="contained"
                component="label"
                disabled={uploading}
                sx={{ flex: 1, whiteSpace: "nowrap" }}
              >
                📤 Tải file
                <input type="file" accept=".doc,.docx" multiple hidden onChange={handleUpload} />
              </Button>

              <Button
                variant="outlined"
                color="error"
                disabled={!fileList.some((file) => file.selected)}
                onClick={() => {
                  const selectedFiles = fileList.filter((file) => file.selected);
                  handleDeleteFiles(selectedFiles);
                }}
                sx={{ flex: 1, whiteSpace: "nowrap" }}
              >
                🗑️ Xóa file
              </Button>
            </Box>

 
            {uploading && (
              <Box sx={{ width: "60%", mx: "auto", mt: 2 }}>
                <LinearProgress
                  variant="determinate"
                  value={uploadProgress}
                  sx={{
                    height: 4,
                    borderRadius: 3,
                  }}
                />
                <Typography
                  variant="body2"
                  align="center"
                  sx={{ mt: 1, color: "text.secondary" }}
                >
                  {`${uploadMode === "delete" ? "Đang xóa" : "Đang tải lên"}: ${uploadProgress}%`}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Danh sách file */}
        <Card sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <CardContent
            sx={{
              p: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <Typography variant="h6">📂 Danh sách file</Typography>
            {fileList.length > 0 && (
              <Box sx={{ display: "flex", alignItems: "center", mr: 1.25 }}>
                <Typography variant="body2" sx={{ mr: 1 }}>
                  Chọn tất cả
                </Typography>
                <input
                  type="checkbox"
                  checked={fileList.every((file) => file.selected === true)}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setFileList((prev) => prev.map((file) => ({ ...file, selected: checked })));
                  }}
                />
              </Box>
            )}
          </CardContent>

          <List sx={{ height: "100%", overflowY: "auto", p: 0 }}>
            {fileList.length === 0 ? (
              <ListItem>
                <ListItemText primary="Chưa có file nào." />
              </ListItem>
            ) : (
              fileList.map((file, index) => {
                const isSelected = selectedFile?.url === file.url;
                return (
                  <ListItem
                    key={index}
                    onClick={() => {
                      // Nếu đang ở trên điện thoại → mở file trực tiếp
                      if (window.innerWidth < 600) {
                        window.open(
                          `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(file.url)}`,
                          "_blank"
                        );
                      } else {
                        setSelectedFile(file);
                      }
                    }}
                    sx={{
                      mb: 1,
                      border: "1px solid #ddd",
                      borderRadius: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                      bgcolor: isSelected ? "rgba(25,118,210,0.1)" : "background.paper",
                      "&:hover": {
                        bgcolor: isSelected ? "rgba(25,118,210,0.15)" : "action.hover",
                      },
                    }}
                  >
                    <ListItemText
                      primary={file.name}
                      secondary={`Tải lên: ${formatVNDate(file.uploaded_at)}`}
                    />
                    <input
                      type="checkbox"
                      checked={!!file.selected}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFileList((prev) =>
                          prev.map((f, i) => (i === index ? { ...f, selected: checked } : f))
                        );
                      }}
                    />
                  </ListItem>

                );
              })
            )}
          </List>
        </Card>
      </Box>

      {/* Khung xem file (ẩn trên mobile) */}
      <Card
        sx={{
          width: { xs: "100%", sm: "70%" },
          minWidth: 0,
          height: "200%",
          mt: { xs: 2, sm: -15 },
          display: { xs: "none", sm: "block" }, // ẩn iframe trên mobile
        }}
      >
        <CardContent sx={{ height: "100%", p: 0 }}>
          {selectedFile ? (
            <iframe
              src={`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(selectedFile.url)}`}
              style={{ width: "100%", height: "100%", border: "none" }}
              title="File Preview"
            />
          ) : (
            <Box sx={{ p: 2 }}>
              <Typography>Chọn một file để xem nội dung.</Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );

}
