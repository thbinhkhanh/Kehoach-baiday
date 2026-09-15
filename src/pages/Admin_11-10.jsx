// 🔧 PHIÊN BẢN ĐÃ SỬA
import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { 
  Box, Card, CardContent, Typography, List, ListItem, ListItemText,
  Button, CircularProgress, IconButton, FormControl, InputLabel, Select, MenuItem,
  useTheme, useMediaQuery, 
} from "@mui/material";



import DeleteIcon from "@mui/icons-material/Delete";
import SettingsIcon from "@mui/icons-material/Settings";

export default function Admin({ user }) {
  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [subject, setSubject] = useState("");
  const [className, setClassName] = useState("1");

  // ✅ Danh sách và tài khoản đang chọn
  const [usernames, setUsernames] = useState([]);
  const [usernameMap, setUsernameMap] = useState({});
  //const [selectedUsername, setSelectedUsername] = useState("");

  const isAdmin = user?.email === "thbinhkhanh@gmail.com";
  const [selectedUsername, setSelectedUsername] = useState("Phạm Văn Thái");

  const [showStats, setShowStats] = useState(false); // trạng thái hiển thị thống kê
  const [statsData, setStatsData] = useState([]); // dữ liệu thống kê

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [selectedTeachersToDelete, setSelectedTeachersToDelete] = useState([]);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm")); // Kiểm tra mobile

  const [showLeftStats, setShowLeftStats] = useState(false); //

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

  // 🧩 Chuẩn hóa tên thư mục (xóa dấu, ký tự đặc biệt)
  const normalizeFolderName = (str) => {
    if (typeof str !== "string") return ""; // ✅ đảm bảo là chuỗi
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // bỏ dấu tiếng Việt
      .replace(/[^a-zA-Z0-9\s_-]/g, "") // bỏ ký tự đặc biệt
      .trim();
  };


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

  const handleStats = async () => {
    if (!isAdmin) return;

    try {
      // 🔹 Lấy toàn bộ file từ bảng uploaded_files
      const { data: allFiles, error } = await supabase
        .from("uploaded_files")
        .select("*")
        .order("uploaded_at", { ascending: false });

      if (error) throw error;

      const stats = [];

      allFiles.forEach((file) => {
        // Tìm tên giáo viên từ email
        const username =
          Object.keys(usernameMap).find((key) => usernameMap[key].email === file.uploaded_by) ||
          "Unknown";

        const subject = file.subject || "Unknown";
        const className = file.class || "Unknown";

        // Kiểm tra xem đã có entry cho username + subject chưa
        let entry = stats.find((e) => e.username === username && e.subject === subject);
        if (!entry) {
          entry = { username, subject, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
          stats.push(entry);
        }

        // Cộng số file cho lớp tương ứng
        entry[className] = (entry[className] || 0) + 1;
      });

      // Cập nhật state để hiển thị
      setStatsData(stats);
      setShowStats(true);
    } catch (err) {
      console.error("❌ Lỗi khi lấy thống kê:", err);
      alert("❌ Không thể lấy thống kê. Vui lòng thử lại.");
    }
  };

  const handleResetAll = async (selectedTeachers = []) => {
  try {
    if (selectedTeachers.length === 0) {
      alert("⚠️ Không có giáo viên nào được chọn.");
      return;
    }

    // Lấy email của GV cần xóa
    const selectedEmails = selectedTeachers
      .map((name) => usernameMap[name]?.email)
      .filter(Boolean);

    // Lấy tất cả file thuộc các email này
    const { data: allRows, error: getError } = await supabase
      .from("uploaded_files")
      .select("id, path, uploaded_by")
      .in("uploaded_by", selectedEmails);

    if (getError) throw getError;

    if (!allRows || allRows.length === 0) {
      alert("📭 Không có dữ liệu nào để xóa.");
      return;
    }

    // Xóa file trong storage
    const allPaths = allRows.map((r) => r.path);
    const chunkSize = 200;
    for (let i = 0; i < allPaths.length; i += chunkSize) {
      const chunk = allPaths.slice(i, i + chunkSize);
      const { error: removeError } = await supabase.storage
        .from("data")
        .remove(chunk);
      if (removeError) console.error("⚠️ Lỗi khi xóa file:", removeError);
    }

    // Xóa bản ghi trong DB
    const allIds = allRows.map((r) => r.id);
    const { error: deleteError } = await supabase
      .from("uploaded_files")
      .delete()
      .in("id", allIds);
    if (deleteError) throw deleteError;

    alert(`✅ Đã xóa toàn bộ file của ${selectedTeachers.length} giáo viên.`);
    fetchFileList();
    setStatsData([]);
    setShowStats(false);
  } catch (err) {
    console.error("❌ Lỗi khi xóa dữ liệu:", err);
    alert("❌ Không thể xóa dữ liệu. Vui lòng thử lại.");
  }
};


  {/*const handleResetAll_OK = async () => {
  try {
    // 1️⃣ Kiểm tra bảng uploaded_files trước
    const { data: allRows, error: getError } = await supabase
      .from("uploaded_files")
      .select("id");

    if (getError) throw getError;

    if (!allRows || allRows.length === 0) {
      alert("📭 Không có dữ liệu nào để xóa.");
      return;
    }

    // 2️⃣ Xác nhận xóa nếu có dữ liệu
    const confirmDelete = window.confirm("⚠️ Bạn có chắc muốn xóa toàn bộ file đã tải lên?");
    if (!confirmDelete) return;

    // 3️⃣ Hàm đệ quy gom toàn bộ đường dẫn file trong bucket "data"
    const collectAllFilePaths = async (path = "") => {
      const { data: items, error } = await supabase.storage.from("data").list(path, { limit: 1000 });
      if (error) {
        console.warn("⚠️ Lỗi khi liệt kê:", path, error);
        return [];
      }

      const tasks = items.map(async (item) => {
        const fullPath = path ? `${path.replace(/\/$/, "")}/${item.name}` : item.name;

        if (item.metadata?.size === undefined) {
          return await collectAllFilePaths(fullPath);
        } else {
          return [fullPath];
        }
      });

      const results = await Promise.all(tasks);
      return results.flat();
    };

    // 4️⃣ Gom và xóa toàn bộ file trong bucket "data"
    const allFilePaths = await collectAllFilePaths("");

    if (allFilePaths.length > 0) {
      const chunkSize = 200;
      for (let i = 0; i < allFilePaths.length; i += chunkSize) {
        const chunk = allFilePaths.slice(i, i + chunkSize);
        const { error: removeError } = await supabase.storage.from("data").remove(chunk);
        if (removeError) {
          console.error("❌ Lỗi khi xóa file:", removeError);
        } else {
          console.log(`🗑️ Đã xóa ${chunk.length} file`);
        }
      }
    } else {
      console.log("📁 Không có file nào để xóa trong bucket data");
    }

    // 5️⃣ Xóa toàn bộ dữ liệu trong bảng uploaded_files
    const allIds = allRows.map((r) => r.id);
    const { error: deleteError } = await supabase
      .from("uploaded_files")
      .delete()
      .in("id", allIds);

    if (deleteError) throw deleteError;

    console.log(`✅ Đã xóa ${allIds.length} dòng trong bảng uploaded_files`);

    // 6️⃣ Hoàn tất
    alert("✅ Đã xóa toàn bộ file và dữ liệu thành công.");
    fetchFileList();
    setStatsData([]);
    setShowStats(false);
  } catch (err) {
    console.error("❌ Lỗi khi xóa tất cả:", err);
    alert("❌ Không thể xóa tất cả. Vui lòng thử lại.");
  }
};*/}

// Khi usernames thay đổi (sau khi load từ server)
useEffect(() => {
  if (usernames.length === 0) return; // chưa có dữ liệu thì thôi
  // Lấy danh sách hợp lệ (bỏ Admin, BGH, Ban Giám Hiệu)
  const validTeachers = usernames.filter((name) => {
    const lower = name?.toLowerCase() || "";
    return lower !== "admin" && lower !== "bgh" && !lower.includes("ban giám hiệu") && !lower.includes("ban giam hieu");
  }).sort((a, b) => {
    const getLastName = (fullName) =>
      fullName?.trim().split(" ").slice(-1)[0]?.toLowerCase() || "";
    return getLastName(a).localeCompare(getLastName(b), "vi");
  });

  // Set mặc định GV đầu tiên
  if (validTeachers.length > 0) {
    setSelectedUsername(validTeachers[0]);
  }

  // Đồng thời gọi thống kê
  handleStats();
}, [usernames]);


  useEffect(() => {
    if (usernames.length === 0) return; // đợi usernames load xong
    const fetchStats = async () => {
      await handleStats();
    };
    fetchStats();
  }, [usernames]);

  return (
    <Box
      sx={{
        height: "95vh",
        width: "100vw",
        display: "flex",
        gap: 2,
        p: 2,
        alignItems: "flex-start",
        flexDirection: { xs: "column", sm: "row" },
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
              color="primary"
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <SettingsIcon color="primary" />
              Quản trị hệ thống
            </Typography>

            {/* Chọn tài khoản */}
            <FormControl fullWidth size="small">
              <InputLabel>👤 Giáo viên</InputLabel>
              <Select
                value={selectedUsername || usernames[0]}
                label="Tài khoản"
                onChange={(e) => setSelectedUsername(e.target.value)}
              >
                {usernames
                  .filter((name) => {
                    const lower = name?.toLowerCase() || "";
                    return (
                      lower !== "admin" &&
                      lower !== "bgh" &&
                      !lower.includes("ban giám hiệu") &&
                      !lower.includes("ban giam hieu")
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
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <FormControl size="small" sx={{ flex: 1, minWidth: 100 }}>
                <InputLabel>Môn học</InputLabel>
                <Select
                  value={subject}
                  label="Môn học"
                  onChange={(e) => setSubject(e.target.value)}
                >
                  <MenuItem value="Âm nhạc">Âm nhạc</MenuItem>
                  <MenuItem value="Đạo đức">Đạo đức</MenuItem>
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
                  {[1, 2, 3, 4, 5].map((i) => (
                    <MenuItem key={i} value={i}>
                      Lớp {i}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Nhóm nút thao tác */}
            <Box sx={{ display: "flex", gap: 2, flexWrap: "nowrap", overflowX: "auto" }}>
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

            {/* Nút Thống kê + Reset */}
            <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
              <Button
                variant="outlined"
                color="primary"
                sx={{ flex: 1 }}
                onClick={() => {
                  setShowResetConfirm(false);
                  setSelectedFile(null);
                  if (isMobile) {
                    setShowLeftStats((prev) => !prev);
                    if (!showLeftStats) handleStats();
                  } else {
                    handleStats();
                  }
                }}
              >
                {isMobile ? (showLeftStats ? "Ẩn Thống kê" : "📊 Thống kê") : "📊 Thống kê"}
              </Button>



              <Button
                variant="outlined"
                color="secondary"
                sx={{ flex: 1 }}
                onClick={() => {
                  setShowStats(false);
                  setSelectedFile(null);
                  const validTeachers = usernames.filter((name) => {
                    const lower = name?.toLowerCase() || "";
                    return (
                      lower !== "admin" &&
                      lower !== "bgh" &&
                      !lower.includes("ban giám hiệu") &&
                      !lower.includes("ban giam hieu")
                    );
                  });
                  setSelectedTeachersToDelete(validTeachers);
                  setShowResetConfirm(true);
                }}
              >
                🔄 Reset data
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

        {/* Hiển thị Thống kê & Reset trên điện thoại */}
        {(showLeftStats || showResetConfirm) && (
          <Box sx={{ display: { xs: "block", sm: "none" }, mb: 2 }}>
            {showResetConfirm ? (
              <Card sx={{ p: 3, borderRadius: 3, boxShadow: 4, bgcolor: "#fff8e1" }}>
                <Typography variant="h6" gutterBottom color="warning.main">
                  ⚠️ Chọn giáo viên cần xóa dữ liệu
                </Typography>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 2 }}>
                  {usernames
                    .filter((name) => {
                      const lower = name?.toLowerCase() || "";
                      return (
                        lower !== "admin" &&
                        lower !== "bgh" &&
                        !lower.includes("ban giám hiệu") &&
                        !lower.includes("ban giam hieu")
                      );
                    })
                    .sort((a, b) => {
                      const getLastName = (fullName) =>
                        fullName?.trim().split(" ").slice(-1)[0]?.toLowerCase() || "";
                      return getLastName(a).localeCompare(getLastName(b), "vi");
                    })
                    .map((name) => (
                      <Box key={name} sx={{ display: "flex", alignItems: "center", ml: 4 }}>
                        <input
                          type="checkbox"
                          checked={selectedTeachersToDelete.includes(name)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setSelectedTeachersToDelete((prev) =>
                              checked ? [...prev, name] : prev.filter((n) => n !== name)
                            );
                          }}
                        />
                        <Typography sx={{ ml: 1 }}>{name}</Typography>
                      </Box>
                    ))}
                </Box>

                <Box sx={{ display: "flex", gap: 2 }}>
                  <Button
                    variant="contained"
                    color="error"
                    onClick={async () => {
                      if (selectedTeachersToDelete.length === 0) {
                        alert("⚠️ Chưa chọn giáo viên nào!");
                        return;
                      }
                      const confirm = window.confirm(
                        `⚠️ Xóa toàn bộ file của ${selectedTeachersToDelete.length} giáo viên đã chọn?`
                      );
                      if (!confirm) return;
                      await handleResetAll(selectedTeachersToDelete);
                      setShowResetConfirm(false);
                    }}
                  >
                    ✅ Xác nhận xóa
                  </Button>
                  <Button variant="outlined" onClick={() => setShowResetConfirm(false)}>
                    ❌ Hủy
                  </Button>
                </Box>
              </Card>
            ) : (
              showLeftStats && (
                <Card sx={{ p: 2, borderRadius: 3, boxShadow: 3 }}>
                  <Typography variant="h6" gutterBottom color="primary">
                    📊 Thống kê số bài
                  </Typography>
                  {statsData.length === 0 ? (
                    <Typography>Chưa có dữ liệu.</Typography>
                  ) : (
                    statsData.map((row, idx) => (
                      <Card key={idx} sx={{ p: 2, borderRadius: 3, mb: 1 }}>
                        <Typography variant="subtitle1" fontWeight="bold" color="#1976d2">
                          {row.username} — {row.subject}
                        </Typography>
                        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}>
                          {["1", "2", "3", "4", "5"]
                            .filter((cls) => row[cls] > 0)
                            .map((cls) => (
                              <Box
                                key={cls}
                                sx={{
                                  px: 2,
                                  py: 1,
                                  borderRadius: 2,
                                  bgcolor: "#e3f2fd",
                                  color: "#0d47a1",
                                  fontWeight: "bold",
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                }}
                              >
                                <Typography variant="body2">Lớp {cls}</Typography>
                                <Typography variant="h6" color="#d32f2f">
                                  {row[cls]}
                                </Typography>
                              </Box>
                            ))}
                        </Box>
                      </Card>
                    ))
                  )}
                </Card>
              )
            )}
          </Box>
        )}


        {/* Danh sách file */}
        <Card sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <CardContent
            sx={{ p: 1, display: "flex", justifyContent: "space-between", flexShrink: 0 }}
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
                    onClick={() => {
                      if (window.innerWidth < 600) {
                        setShowStats(false);
                        setShowResetConfirm(false);
                        setSelectedFile(file);
                        window.open(
                          `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(
                            file.url
                          )}`,
                          "_blank"
                        );
                      } else {
                        setShowStats(false);
                        setShowResetConfirm(false);
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

      {/* Cột phải: khung xem file / thống kê / reset */}
      <Card
        sx={{
          width: { xs: "100%", sm: "70%" },
          minWidth: 0,
          height: "200%",
          mt: { xs: 2, sm: -15 },
          display: { xs: "none", sm: "block" },
        }}
      >
        <CardContent sx={{ height: "100%", p: 2, overflowY: "auto", mt: 10 }}>
          {showResetConfirm ? (
            <Card sx={{ p: 3, mt: 4, borderRadius: 3, boxShadow: 4, bgcolor: "#fff8e1" }}>
              <Typography variant="h6" gutterBottom color="warning.main">
                ⚠️ Chọn giáo viên cần xóa dữ liệu
              </Typography>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 2 }}>
                {usernames
                  .filter((name) => {
                    const lower = name?.toLowerCase() || "";
                    // ✅ Bỏ Admin / BGH / Ban Giám Hiệu
                    return (
                      lower !== "admin" &&
                      lower !== "bgh" &&
                      !lower.includes("ban giám hiệu") &&
                      !lower.includes("ban giam hieu")
                    );
                  })
                  .sort((a, b) => {
                    // ✅ Sắp xếp theo tên cuối cùng (giống dropdown chọn tài khoản)
                    const getLastName = (fullName) =>
                      fullName?.trim().split(" ").slice(-1)[0]?.toLowerCase() || "";
                    return getLastName(a).localeCompare(getLastName(b), "vi");
                  })
                  .map((name) => (
                    <Box key={name} sx={{ display: "flex", alignItems: "center", ml: 4 }}>
                      <input
                        type="checkbox"
                        checked={selectedTeachersToDelete.includes(name)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setSelectedTeachersToDelete((prev) =>
                            checked ? [...prev, name] : prev.filter((n) => n !== name)
                          );
                        }}
                      />
                      <Typography sx={{ ml: 1 }}>{name}</Typography>
                    </Box>
                  ))}
              </Box>

              <Box sx={{ display: "flex", gap: 2 }}>
                <Button
                  variant="contained"
                  color="error"
                  onClick={async () => {
                    if (selectedTeachersToDelete.length === 0) {
                      alert("⚠️ Chưa chọn giáo viên nào!");
                      return;
                    }
                    const confirm = window.confirm(
                      `⚠️ Xóa toàn bộ file của ${selectedTeachersToDelete.length} giáo viên đã chọn?`
                    );
                    if (!confirm) return;
                    await handleResetAll(selectedTeachersToDelete);
                    setShowResetConfirm(false);
                  }}
                >
                  ✅ Xác nhận xóa
                </Button>

                <Button variant="outlined" onClick={() => setShowResetConfirm(false)}>
                  ❌ Hủy
                </Button>
              </Box>
            </Card>

          ) : showStats ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3, mt: 2 }}>
              <Typography variant="h6" gutterBottom color="primary">
                📊 Thống kê số bài
              </Typography>
              {statsData.length === 0 ? (
                <Typography>Chưa có dữ liệu.</Typography>
              ) : (
                statsData.map((row, idx) => (
                  <Card key={idx} sx={{ p: 2, borderRadius: 3, boxShadow: 3 }}>
                    <Typography variant="subtitle1" fontWeight="bold" color="#1976d2">
                      {row.username} — {row.subject}
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}>
                      {["1", "2", "3", "4", "5"]
                        .filter((cls) => row[cls] > 0)
                        .map((cls) => (
                          <Box
                            key={cls}
                            sx={{
                              px: 2,
                              py: 1,
                              borderRadius: 2,
                              bgcolor: "#e3f2fd",
                              color: "#0d47a1",
                              fontWeight: "bold",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              cursor: "pointer",
                              transition: "0.3s",
                              "&:hover": { bgcolor: "#bbdefb" },
                            }}
                          >
                            <Typography variant="body2">Lớp {cls}</Typography>
                            <Typography variant="h6" color="#d32f2f">
                              {row[cls]}
                            </Typography>
                          </Box>
                        ))}
                    </Box>
                  </Card>
                ))
              )}
            </Box>
          ) : selectedFile ? (
            <iframe
              src={`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(
                selectedFile.url
              )}`}
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                marginTop: "-95px",
              }}
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

