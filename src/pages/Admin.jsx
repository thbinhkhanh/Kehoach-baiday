// 🔧 PHIÊN BẢN ĐÃ SỬA
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
  CircularProgress,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import SettingsIcon from "@mui/icons-material/Settings";

export default function Admin({ user }) {
  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [subject, setSubject] = useState("");
  const [className, setClassName] = useState("4");

  // ✅ Danh sách và tài khoản đang chọn
  const [usernames, setUsernames] = useState([]);
  const [usernameMap, setUsernameMap] = useState({});
  //const [selectedUsername, setSelectedUsername] = useState("");

  const isAdmin = user?.email === "thbinhkhanh@gmail.com";
  const [selectedUsername, setSelectedUsername] = useState("Phạm Văn Thái");


  // ✅ Lấy danh sách tài khoản kèm môn học
  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("username, email, subject"); // 👈 lấy thêm subject
        if (error) throw error;

        // Lưu danh sách username
        setUsernames(data.map((u) => u.username));

        // Map username → thông tin chi tiết
        const map = {};
        data.forEach((u) => (map[u.username] = u));
        setUsernameMap(map);
      } catch (err) {
        console.error("❌ Lỗi khi lấy danh sách tài khoản:", err);
      }
    };

    fetchProfiles();
  }, []);

  // ✅ Khi chọn tài khoản → tự động điền môn học tương ứng
  useEffect(() => {
    if (selectedUsername && usernameMap[selectedUsername]?.subject) {
      setSubject(usernameMap[selectedUsername].subject);
    }
  }, [selectedUsername, usernameMap]);

  // 🔧 Chuẩn hóa tên file và folder
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
      .replace(/\s+/g, "_")
      .toLowerCase();

  const getUserFolder = (email) =>
    email ? email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "") : "unknown";

  // ✅ Lấy danh sách file (lọc theo tài khoản, môn, lớp)
  const fetchFileList = async () => {
    if (!isAdmin) return;

    // Kiểm tra đủ thông tin trước khi fetch
    if (!selectedUsername || !subject || !className || !usernameMap[selectedUsername]?.email) {
      setFileList([]); // reset danh sách rỗng
      return;
    }

    try {
      const { data, error } = await supabase
        .from("uploaded_files")
        .select("*")
        .eq("uploaded_by", usernameMap[selectedUsername].email)
        .eq("subject", subject)
        .eq("class", className)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;

      setFileList(data || []);
    } catch (err) {
      console.error("❌ Lỗi khi tải danh sách file:", err);
      alert("❌ Lỗi khi tải danh sách file.");
    }
  };


  useEffect(() => {
    fetchFileList();
  }, [subject, className, selectedUsername]);

  // Tải file đồng loạt
  const handleUpload = async (e) => {
    const files = Array.from(e.target.files); // Chuyển FileList thành Array

    if (files.length === 0) return;

    // Kiểm tra loại file
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

    if (!subject || !className || !selectedUsername) {
      alert("⚠️ Vui lòng chọn tài khoản, môn học và lớp trước khi tải lên!");
      return;
    }

    try {
      setUploading(true);

      const targetUser = usernameMap[selectedUsername];
      const folder = getUserFolder(targetUser.email);
      const cleanSubject = normalizeFolderName(subject);
      const cleanClass = normalizeFolderName(className);

      for (const file of files) {
        const cleanName = normalizeFileName(file.name);
        const filePath = `${folder}/${cleanSubject}/${cleanClass}/${Date.now()}_${cleanName}`;

        const { error: uploadError } = await supabase.storage
          .from("data")
          .upload(filePath, file, { upsert: false });
        if (uploadError) throw uploadError;

        const { data: publicData, error: urlError } = await supabase.storage
          .from("data")
          .getPublicUrl(filePath);
        if (urlError) throw urlError;

        const { error: insertError } = await supabase.from("uploaded_files").insert([
          {
            name: file.name,
            path: filePath,
            url: publicData.publicUrl,
            uploaded_by: targetUser.email,
            //uploaded_at: new Date().toISOString(),
            uploaded_at: new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString(),
            subject,
            class: className,
          },
        ]);
        if (insertError) throw insertError;
      }

      fetchFileList();
    } catch (err) {
      console.error("❌ Lỗi khi upload:", err);
      alert("❌ Không thể tải file lên.");
    } finally {
      setUploading(false);
    }
  };

  //Tải 1 file
  {/*const handleUpload1 = async (e) => {
    const file = e.target.files[0];
    if (
      !file ||
      ![
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ].includes(file.type)
    ) {
      alert("⚠️ Chỉ hỗ trợ file .doc hoặc .docx");
      return;
    }

    if (!subject || !className || !selectedUsername) {
      alert("⚠️ Vui lòng chọn tài khoản, môn học và lớp trước khi tải lên!");
      return;
    }

    try {
      setUploading(true);

      const targetUser = usernameMap[selectedUsername];
      const folder = getUserFolder(targetUser.email);
      const cleanName = normalizeFileName(file.name);
      const cleanSubject = normalizeFolderName(subject);
      const cleanClass = normalizeFolderName(className);

      const filePath = `${folder}/${cleanSubject}/${cleanClass}/${Date.now()}_${cleanName}`;

      const { error: uploadError } = await supabase.storage
        .from("data")
        .upload(filePath, file, { upsert: false });
      if (uploadError) throw uploadError;

      const { data: publicData, error: urlError } = await supabase.storage
        .from("data")
        .getPublicUrl(filePath);
      if (urlError) throw urlError;

      const { error: insertError } = await supabase.from("uploaded_files").insert([
        {
          name: file.name,
          path: filePath,
          url: publicData.publicUrl,
          uploaded_by: targetUser.email,
          uploaded_at: new Date().toISOString(),
          subject,
          class: className,
        },
      ]);
      if (insertError) throw insertError;

      fetchFileList();
    } catch (err) {
      console.error("❌ Lỗi khi upload:", err);
      alert("❌ Không thể tải file lên.");
    } finally {
      setUploading(false);
    }
  };*/}

  // ✅ Xóa file
  const handleDeleteFiles = async (files) => {
    if (files.length === 0) return;

    const confirmMessage =
      files.length === 1
        ? `🗑️ Bạn có chắc muốn xóa "${files[0].name}" không?`
        : `🗑️ Bạn có chắc muốn xóa ${files.length} file đã chọn không?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      for (const file of files) {
        // Xóa file trong storage
        const { error: storageError } = await supabase.storage
          .from("data")
          .remove([file.path]);
        if (storageError) throw storageError;

        // Xóa file trong DB (dùng email người upload thực tế)
        const { error: dbError } = await supabase
          .from("uploaded_files")
          .delete()
          .eq("path", file.path)
          .eq("uploaded_by", file.uploaded_by);
        if (dbError) throw dbError;
      }

      fetchFileList();
    } catch (err) {
      console.error("❌ Lỗi khi xóa file:", err);
      alert("❌ Không thể xóa file. Vui lòng thử lại sau.");
    }
  };

  // ✅ Giao diện
  if (!isAdmin) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>⚠️ Bạn không có quyền truy cập Admin.</Typography>
      </Box>
    );
  }

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
            <Typography
              variant="h5"
              gutterBottom
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <SettingsIcon color="primary" />
              Quản trị hệ thống
            </Typography>

            {/* Chọn tài khoản */}
            <FormControl fullWidth size="small">
              <InputLabel>👤 Giáo viên</InputLabel>
              <Select
                value={selectedUsername}
                label="Tài khoản"
                onChange={(e) => setSelectedUsername(e.target.value)}
              >
                {usernames
                  .filter((name) => {
                    const lower = name?.toLowerCase() || "";
                    return (
                      lower !== "bgh" &&
                      !lower.includes("ban giám hiệu") &&
                      lower !== "admin" &&
                      !lower.includes("thbinhkhanh")
                    );
                  })
                  .sort((a, b) => {
                    const getLastName = (fullName) =>
                      fullName?.trim().split(" ").slice(-1)[0]?.toLowerCase() || "";
                    return getLastName(a).localeCompare(getLastName(b), "vi");
                  })
                  .map((name) => (
                    <MenuItem key={name} value={name}>
                      {name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            {/* Môn học + Lớp */}
            <Box
              sx={{
                display: "flex",
                gap: 2,
                flexWrap: "wrap", // wrap trên mobile
              }}
            >
              <FormControl size="small" sx={{ flex: 1, minWidth: 100 }}>
                <InputLabel>Môn học</InputLabel>
                <Select
                  value={subject}
                  label="Môn học"
                  onChange={(e) => setSubject(e.target.value)}
                >
                  <MenuItem value="Âm nhạc">Âm nhạc</MenuItem>
                  <MenuItem value="Công nghệ">Công nghệ</MenuItem>
                  <MenuItem value="Giáo dục thể chất">GD thể chất</MenuItem>
                  <MenuItem value="Mĩ thuật">Mĩ thuật</MenuItem>
                  <MenuItem value="Tiếng Anh">Tiếng Anh</MenuItem>
                  <MenuItem value="Tin học">Tin học</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ flex: 1, minWidth: 80 }}>
                <InputLabel>Lớp</InputLabel>
                <Select
                  value={className}
                  label="Lớp"
                  onChange={(e) => setClassName(e.target.value)}
                >
                  <MenuItem value="1">Lớp 1</MenuItem>
                  <MenuItem value="2">Lớp 2</MenuItem>
                  <MenuItem value="3">Lớp 3</MenuItem>
                  <MenuItem value="4">Lớp 4</MenuItem>
                  <MenuItem value="5">Lớp 5</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Nhóm nút thao tác: tải + xóa */}
            <Box
              sx={{
                display: "flex",
                gap: 2,
                flexWrap: "nowrap", // luôn trên 1 hàng
                overflowX: "auto", // scroll ngang nếu nhỏ
              }}
            >
              <Button
                variant="contained"
                component="label"
                disabled={uploading}
                sx={{ flex: 1, whiteSpace: "nowrap" }}
              >
                📤 Tải file
                <input
                  type="file"
                  accept=".doc,.docx"
                  multiple
                  hidden
                  onChange={handleUpload}
                />
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
              <Box sx={{ display: "inline-flex", ml: 2, alignItems: "center" }}>
                <CircularProgress size={24} />
                <Typography sx={{ ml: 1 }}>Đang tải lên...</Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Danh sách file */}
        <Card sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <CardContent sx={{ p: 1, display: "flex", justifyContent: "space-between", flexShrink: 0 }}>
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
                    setFileList((prev) =>
                      prev.map((file) => ({ ...file, selected: checked }))
                    );
                  }}
                />
              </Box>
            )}
          </CardContent>

          <List sx={{ flex: 1, height: "100%", overflowY: "auto", p: 0 }}>
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
                    onClick={() => setSelectedFile(file)}
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
                        bgcolor: isSelected ? "rgba(25,118,210,0.15)" : "#f9f9f9",
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
          height: "120%",
          mt: { xs: 2, sm: -15 },
          display: { xs: "none", sm: "block" }, // ẩn trên mobile
        }}
      >
        <CardContent sx={{ height: "100%", p: 0 }}>
          {selectedFile ? (
            <iframe
              src={`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(
                selectedFile.url
              )}`}
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
