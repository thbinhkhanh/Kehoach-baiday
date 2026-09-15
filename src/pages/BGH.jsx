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
  Button,
  useMediaQuery, 
  useTheme,
} from "@mui/material";

export default function BGH({ user }) {
  const [fileList, setFileList] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [subject, setSubject] = useState("");
  const [className, setClassName] = useState("1");
  const [usernames, setUsernames] = useState([]);
  const [usernameMap, setUsernameMap] = useState({});
  const [selectedUsername, setSelectedUsername] = useState("");
  

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [statsData, setStatsData] = useState([]);
  const [showStats, setShowStats] = useState(false);
  const [showLeftStats, setShowLeftStats] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
 

  const isBGH = user?.email === "chuyenmon@gmail.com";
  const isAdmin = isBGH; // bây giờ hợp lệ


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

  const handleStats = async () => {
    if (!isAdmin) return [];

    try {
      const { data: allFiles, error } = await supabase
        .from("uploaded_files")
        .select("*")
        .order("uploaded_at", { ascending: false });
      if (error) throw error;

      const stats = [];

      allFiles.forEach((file) => {
        const username =
          Object.keys(usernameMap).find((key) => usernameMap[key].email === file.uploaded_by) ||
          "Unknown";
        const subject = file.subject || "Unknown";
        const className = file.class || "Unknown";

        let entry = stats.find((e) => e.username === username && e.subject === subject);
        if (!entry) {
          entry = { username, subject, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
          stats.push(entry);
        }

        entry[className] = (entry[className] || 0) + 1;
      });

      setStatsData(stats);
      setShowStats(true);

      return stats; // 🔹 quan trọng nếu bạn muốn lấy data ngoài
    } catch (err) {
      console.error("❌ Lỗi khi lấy thống kê:", err);
      alert("❌ Không thể lấy thống kê. Vui lòng thử lại.");
      return [];
    }
  };

  useEffect(() => {
    const init = async () => {
      // chọn GV đầu tiên nếu chưa chọn
      if (!selectedUsername && usernames.length > 0) {
        const validTeachers = usernames.filter((name) => {
          const lower = name?.toLowerCase() || "";
          return lower !== "admin" && lower !== "bgh" && !lower.includes("ban giám hiệu");
        });
        if (validTeachers.length > 0) setSelectedUsername(validTeachers[0]);
      }

      // load thống kê ngay khi trang load
      await handleStats();
    };

    init();
  }, [usernames]);

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

  return (
  <Box
    sx={{
      height: "90vh",
      width: "100vw",
      display: "flex",
      gap: 2,
      p: 2,
      alignItems: "flex-start",
      flexDirection: { xs: "column", sm: "row" },
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
          <Typography variant="h5" gutterBottom color="primary">
            📚 Kế hoạch bài dạy
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
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <FormControl size="small" sx={{ flex: 1, minWidth: 100 }}>
              <InputLabel>Môn học</InputLabel>
              <Select
                value={subject}
                label="Môn học"
                onChange={(e) => setSubject(e.target.value)}
              >
                <MenuItem value="Âm nhạc">Âm nhạc</MenuItem>
                  <MenuItem value="Công nghệ">Công nghệ</MenuItem>
                  <MenuItem value="Đạo đức">Đạo đức</MenuItem>
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

          {/* Nút Thống kê */}
          <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
            <Button
              variant="outlined"
              color="primary"
              sx={{ flex: 1, minWidth: 100 }}
              onClick={async () => {
                setSelectedFile(null);
                setShowResetConfirm(false);
                setShowLeftStats((prev) => !prev);
                if (!showLeftStats) {
                  await handleStats();
                }
              }}
            >
              {isMobile ? (showLeftStats ? "Ẩn Thống kê" : "📊 Thống kê") : "📊 Thống kê"}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Card thống kê bên trái (chỉ hiển thị trên mobile) */}
      {showLeftStats && statsData.length > 0 && (
        <Card
          sx={{
            mb: 2,
            p: 2,
            borderRadius: 3,
            boxShadow: 3,
            display: { xs: "block", sm: "none" },
          }}
        >
          <Typography variant="h6" gutterBottom color="primary">
            📊 Thống kê số bài
          </Typography>
          {statsData.map((row, idx) => (
            <Card key={idx} sx={{ p: 1, borderRadius: 2, mb: 1 }}>
              <Typography variant="subtitle2" fontWeight="bold" color="#1976d2">
                {row.username} — {row.subject}
              </Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}>
                {["1", "2", "3", "4", "5"]
                  .filter((cls) => row[cls] > 0)
                  .map((cls) => (
                    <Box
                      key={cls}
                      sx={{
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        bgcolor: "#e3f2fd",
                        color: "#0d47a1",
                        fontWeight: "bold",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                      }}
                    >
                      <Typography variant="body2">Lớp {cls}</Typography>
                      <Typography variant="subtitle1" color="#d32f2f">
                        {row[cls]}
                      </Typography>
                    </Box>
                  ))}
              </Box>
            </Card>
          ))}
        </Card>
      )}

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
                  onClick={() => {
                    if (window.innerWidth < 600) {
                      window.open(
                        `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(
                          file.url
                        )}`,
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
                    transition: "background-color 0.2s",
                    cursor: "pointer",
                    bgcolor: isSelected
                      ? "rgba(25,118,210,0.1)"
                      : "background.paper",
                    "&:hover": {
                      bgcolor: isSelected
                        ? "rgba(25,118,210,0.15)"
                        : "#f9f9f9",
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

    {/* Khung xem file / thống kê bên phải (desktop) */}
    {(!selectedFile || fileList.length === 0) && statsData.length > 0 && (
      <Card
        sx={{
          width: { xs: "100%", sm: "70%" },
          minWidth: 0,
          height: "200%",
          mt: { xs: 2, sm: -15 },
          display: { xs: "none", sm: "block" },
        }}
      >
        <CardContent sx={{ height: "100%", p: 2, overflowY: "auto", mt: 0 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3, mt: 12 }}>
            <Typography variant="h6" gutterBottom color="primary">
              📊 Thống kê số bài
            </Typography>
            {statsData.map((row, idx) => (
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
            ))}
          </Box>
        </CardContent>
      </Card>
    )}

    {/* Nếu đã chọn file thì hiển thị iframe */}
    {selectedFile && (
      <Card
        sx={{
          width: { xs: "100%", sm: "70%" },
          minWidth: 0,
          height: "120%",
          mt: { xs: 2, sm: -19 },
          display: { xs: "none", sm: "block" },
        }}
      >
        <CardContent sx={{ height: "100%", p: 2, overflowY: "auto", mt: 2 }}>
          <iframe
            src={`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(
              selectedFile.url
            )}`}
            style={{ width: "100%", height: "100%", border: "none" }}
            title="File Preview"
          />
        </CardContent>
      </Card>
    )}
  </Box>
);



}
