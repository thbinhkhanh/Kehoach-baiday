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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";

export default function BGH({ user }) {
  const [fileList, setFileList] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [subject, setSubject] = useState("");
  const [className, setClassName] = useState("");
  const [usernames, setUsernames] = useState([]);
  const [usernameMap, setUsernameMap] = useState({});
  const [selectedUsername, setSelectedUsername] = useState("");

  const isBGH = user?.email === "chuyenmon@gmail.com";

  // ✅ Lấy danh sách tài khoản + môn học
  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("username, email, subject");
        if (error) throw error;

        setUsernames(data.map((u) => u.username));
        const map = {};
        data.forEach((u) => (map[u.username] = u));
        setUsernameMap(map);
      } catch (err) {
        console.error("❌ Lỗi khi lấy danh sách tài khoản:", err);
      }
    };

    fetchProfiles();
  }, []);

  // ✅ Khi chọn tài khoản → tự động chọn môn đầu tiên (nếu có)
  useEffect(() => {
    if (selectedUsername && usernameMap[selectedUsername]?.subject) {
      const firstSubject = Array.isArray(usernameMap[selectedUsername].subject)
        ? usernameMap[selectedUsername].subject[0]
        : usernameMap[selectedUsername].subject;
      setSubject(firstSubject);
    }
  }, [selectedUsername, usernameMap]);

  useEffect(() => {
    const filtered = usernames
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
      });

    // ✅ Nếu chưa có selectedUsername, tự động chọn người đầu tiên
    if (filtered.length > 0 && !selectedUsername) {
      setSelectedUsername(filtered[0]);
    }
  }, [usernames, selectedUsername]);

  // ✅ Lấy danh sách file
  const fetchFileList = async () => {
    if (!isBGH) return;

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

  // ✅ Giao diện chính
  if (!isBGH) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>⚠️ Bạn không có quyền truy cập trang BGH.</Typography>
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
        height: "90vh",
        width: "100vw",
        display: "flex",
        gap: 2,
        p: 2,
        alignItems: "flex-start",
        flexDirection: { xs: "column", sm: "row" }, // stack trên mobile
      }}
    >
      {/* Cột bộ lọc và danh sách file */}
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
        {/* Bộ lọc */}
        <Card sx={{ width: "100%", flexShrink: 0, mt: -3 }}>
          <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography variant="h5" gutterBottom>
              📚 Tra cứu bài dạy
            </Typography>

            {/* Tài khoản */}
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
          </CardContent>
        </Card>

        {/* Danh sách file */}
        <Card sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <CardContent sx={{ p: 1 }}>
            <Typography variant="h6" gutterBottom>
              📂 Danh sách file
            </Typography>
          </CardContent>
          <List sx={{ flex: 1, overflowY: "auto", p: 0 }}>
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
                      transition: "background-color 0.2s",
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
          display: { xs: "none", sm: "block" }, // ẩn iframe trên mobile
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
