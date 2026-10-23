import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  Card,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  AppBar,
  Toolbar,
  IconButton,
  InputAdornment,
} from "@mui/material";
import { useNavigate, useSearchParams } from "react-router-dom";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";

import LockRoundedIcon from "@mui/icons-material/LockRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";

export default function Login({ onLogin }) {
  const [selectedGroup, setSelectedGroup] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [allAccounts, setAllAccounts] = useState([]);
  const [filteredUsernames, setFilteredUsernames] = useState([]);
  const [usernameMap, setUsernameMap] = useState({});
  const [error, setError] = useState("");
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const groupParam = searchParams.get("group");

  useEffect(() => {
    if (groupParam) {
      let normalizedGroup = groupParam.replace(/-/g, "_"); // Thay thế tất cả dấu - thành _
      if (normalizedGroup === "to_bo_mon") normalizedGroup = "bo_mon";
      setSelectedGroup(normalizedGroup);
    }
  }, [groupParam]);

  useEffect(() => {
    setPassword("");
  }, []);

  useEffect(() => {
    setUsername("");
    setPassword("");
  }, [selectedGroup]);

  useEffect(() => {
    setPassword("");
  }, [username]);

  // Lấy danh sách tài khoản từ Firestore
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "DANHSACH_GV"));
        const accounts = [];
        const map = {};

        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const docId = docSnap.id.toLowerCase();
          const name = data.username || docSnap.id;

          if (name) {
            accounts.push({
              name,
              docId,
              subject: data.subject || "",
              ...data,
            });
            map[docId] = data;
            map[name] = data;
            map[name.toLowerCase()] = data;
          }
        });

        setAllAccounts(accounts);
        setUsernameMap(map);
      } catch (err) {
        console.error("❌ Lỗi khi lấy danh sách tài khoản từ DANHSACH_GV:", err);
      }
    };

    fetchAccounts();
  }, []);

  // Lọc và sắp xếp giáo viên theo tên tiếng Việt chính xác cho từng nhóm
  useEffect(() => {
    if (!selectedGroup || selectedGroup === "bgh" || selectedGroup === "admin") {
      setFilteredUsernames([]);
      return;
    }

    const filtered = allAccounts.filter((acc) => {
      if (acc.docId === "admin" || acc.docId === "bgh") return false;

      const subjUpper = (acc.subject || "").toUpperCase().trim();
      const subjLower = (acc.subject || "").toLowerCase();

      // 1. Nhóm Tiếng Anh
      if (selectedGroup === "tieng_anh" || selectedGroup === "tieng-anh") {
        return subjUpper === "TA" || subjLower.includes("anh") || subjLower.includes("tiếng anh");
      }
      
      // 2. Nhóm Tổ Bộ Môn (Lọc chính xác theo Firestore với subject là "BM" hoặc chứa "bộ môn")
      if (selectedGroup === "bo_mon" || selectedGroup === "to_bo_mon") {
        return subjUpper === "BM" || subjLower.includes("bm") || subjLower.includes("bộ môn");
      }

      // 3. Nhóm Khối lớp (1 đến 5)
      if (selectedGroup.startsWith("khoi_") || selectedGroup.startsWith("khoi-")) {
        const khoiNum = selectedGroup.replace("khoi_", "").replace("khoi-", "");
        return (
          subjLower.startsWith(khoiNum) ||
          subjLower.includes(`lớp ${khoiNum}`) ||
          subjLower.includes(`${khoiNum}.`)
        );
      }
      
      return false; // Mặc định loại bỏ nếu không khớp nhóm nào
    });

    const getSortKey = (fullName) => {
      const parts = fullName.trim().split(/\s+/);
      if (parts.length === 0) return "";
      const firstName = parts[parts.length - 1];
      const rest = parts.slice(0, parts.length - 1).join(" ");
      return `${firstName} ${rest}`.toLowerCase();
    };

    const sortedNames = filtered
      .map((item) => item.name)
      .sort((a, b) => {
        const keyA = getSortKey(a);
        const keyB = getSortKey(b);
        return keyA.localeCompare(keyB, "vi");
      });

    setFilteredUsernames(sortedNames);
  }, [selectedGroup, allAccounts]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!selectedGroup) {
      setError("⚠️ Vui lòng chọn nhóm đăng nhập!");
      return;
    }

    let currentUsername = "";
    let accountData = null;

    if (selectedGroup === "bgh") {
      currentUsername = "bgh";
      accountData = usernameMap["bgh"] || usernameMap["BGH"] || { pass: "1", username: "BGH", subject: "Ban Giám Hiệu" };
    } else if (selectedGroup === "admin") {
      currentUsername = "admin";
      accountData = usernameMap["admin"] || usernameMap["Admin"] || { pass: "123", username: "admin", subject: "Quản Trị Hệ Thống" };
    } else {
      if (!username || !password) {
        setError("⚠️ Vui lòng chọn tên giáo viên và nhập mật khẩu!");
        return;
      }
      currentUsername = username;
      accountData = usernameMap[username] || usernameMap[username.toLowerCase()];
      if (!accountData) {
        setError("Tài khoản không tồn tại trong hệ thống!");
        return;
      }
    }

    const correctPassword = accountData.pass ?? "123";
    if (String(correctPassword) !== String(password)) {
      setError("Sai mật khẩu!");
      return;
    }

    try {
      let role = "user";
      let targetPath = "/upload";

      if (selectedGroup === "admin") {
        role = "admin";
        targetPath = "/admin";
      } else if (selectedGroup === "bgh") {
        role = "bgh";
        targetPath = "/bgh";
      }

      onLogin({
        uid: currentUsername,
        username: accountData.username || currentUsername,
        subject: accountData.subject || "",
        role,
      });

      navigate(targetPath);
    } catch (err) {
      console.error("❌ Lỗi đăng nhập:", err);
      setError("Có lỗi xảy ra khi đăng nhập!");
    }
  };

  // Hiển thị tiêu đề theo thẻ đã bấm
  const getGroupTitle = (group) => {
    if (!group) return "Đăng nhập hệ thống";
    if (group.startsWith("khoi_")) {
      return `Đăng nhập - Khối Lớp ${group.replace("khoi_", "")}`;
    }
    if (group === "tieng_anh") return "Đăng nhập - Tổ Tiếng Anh";
    if (group === "bo_mon") return "Đăng nhập - Tổ Bộ Môn";
    if (group === "bgh") return "Đăng nhập - Ban Giám Hiệu";
    if (group === "admin") return "Đăng nhập - Quản Trị Hệ Thống";
    return "Đăng nhập hệ thống";
  };

  return (
    <Box
      sx={{
        width: "100vw",
        minHeight: "100vh",
        backgroundColor: "#f8fafc",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* 🔵 Thanh tiêu đề cố định chuẩn App.js */}
      <AppBar 
        position="fixed" 
        elevation={0}
        sx={{ 
          background: "#1976d2",
          boxShadow: "none", // Loại bỏ hoàn toàn bóng đổ
        }}
      >
        <Toolbar
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            minHeight: "38px !important", // Giảm chiều cao tối thiểu từ 44px xuống 38px
            py: 0.5, // Thêm padding dọc nhỏ gọn
            px: { xs: 2.5 },
          }}
        >
          <Box
            onClick={() => navigate("/")}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              ml: -2,
              whiteSpace: "nowrap",
              overflowX: "auto",
              cursor: "pointer",
            }}
          >
            <img
              src="/Logo.png"
              alt="Logo"
              style={{ height: "30px", flexShrink: 0 }} // Thu nhỏ logo từ 40px xuống 30px
            />
            <Typography
              variant="subtitle1" // Đổi từ h6 sang subtitle1 để chữ gọn và thấp hơn
              sx={{
                color: "white",
                fontWeight: 600,
                fontSize: "0.95rem", // Tinh chỉnh kích thước chữ vừa vặn
              }}
            >
              KẾ HOẠCH BÀI DẠY TRỰC TUYẾN
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>

      {/* 🧩 Form đăng nhập */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          px: 2,
          pt: 3,
          pb: 4,
          mt: "60px",
        }}
      >
        <Card
          elevation={0}
          sx={{
            borderRadius: "20px",
            overflow: "hidden",
            width: "100%",
            maxWidth: 400,
            backgroundColor: "#ffffff",
            boxShadow:
              "0 20px 40px -15px rgba(0, 0, 0, 0.07), 0 0 1px 1px rgba(0, 0, 0, 0.05)",
            border: "1px solid #e2e8f0",
            position: "relative",
          }}
        >
          {/* Nút X thoát về Dashboard */}
          <IconButton
            onClick={() => navigate("/")}
            sx={{
              position: "absolute",
              top: 12,
              right: 12,
              color: "#64748b",
              bgcolor: "rgba(255, 255, 255, 0.7)",
              "&:hover": { bgcolor: "#fee2e2", color: "#ef4444" },
              zIndex: 10,
            }}
            title="Thoát về trang chủ"
          >
            <CloseRoundedIcon fontSize="small" />
          </IconButton>

          {/* HEADER */}
          <Box
            sx={{
              pt: 4,
              pb: 3,
              px: 3,
              background: "linear-gradient(135deg, #f0f7ff 0%, #e1effe 100%)",
              textAlign: "center",
              borderBottom: "1px solid #e2e8f0",
            }}
          >
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                bgcolor: "#1976d2",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mx: "auto",
                mb: 2,
                boxShadow: "0 8px 16px rgba(25, 118, 210, 0.25)",
              }}
            >
              <LockRoundedIcon sx={{ fontSize: 28 }} />
            </Box>

            <Typography
              sx={{ fontSize: 20, fontWeight: 700, color: "#1e293b", mb: 0.5 }}
            >
              {getGroupTitle(selectedGroup)}
            </Typography>

            <Typography sx={{ fontSize: 13.5, color: "#64748b" }}>
              {selectedGroup === "bgh" || selectedGroup === "admin"
                ? "Vui lòng nhập mật khẩu."
                : "Vui lòng chọn tên giáo viên và nhập mật khẩu."}
            </Typography>
          </Box>

          {/* CONTENT */}
          <Box sx={{ px: 3, py: 3.5 }}>
            <Stack spacing={2.5}>
              {!groupParam && (
                <FormControl fullWidth size="medium">
                  <InputLabel>📚 Phân loại đăng nhập</InputLabel>
                  <Select
                    value={selectedGroup}
                    label="📚 Phân loại đăng nhập"
                    onChange={(e) => setSelectedGroup(e.target.value)}
                    sx={{
                      borderRadius: "12px",
                      bgcolor: "#f8fafc",
                      "&:hover fieldset": { borderColor: "#94a3b8" },
                      "&.Mui-focused fieldset": {
                        borderColor: "#1976d2",
                        borderWidth: "2px",
                      },
                    }}
                  >
                    <MenuItem value="khoi_1">Khối Lớp 1</MenuItem>
                    <MenuItem value="khoi_2">Khối Lớp 2</MenuItem>
                    <MenuItem value="khoi_3">Khối Lớp 3</MenuItem>
                    <MenuItem value="khoi_4">Khối Lớp 4</MenuItem>
                    <MenuItem value="khoi_5">Khối Lớp 5</MenuItem>
                    <MenuItem value="tieng_anh">Tiếng Anh</MenuItem>
                    <MenuItem value="bo_mon">Bộ môn</MenuItem>
                    <MenuItem value="bgh">Ban Giám hiệu</MenuItem>
                    <MenuItem value="admin">Quản trị hệ thống</MenuItem>
                  </Select>
                </FormControl>
              )}

              {selectedGroup !== "bgh" && selectedGroup !== "admin" && (
                <FormControl fullWidth size="medium">
                  <InputLabel>👤 Tên giáo viên</InputLabel>
                  <Select
                    value={username}
                    label="👤 Tên giáo viên"
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={!selectedGroup}
                    sx={{
                      borderRadius: "12px",
                      bgcolor: "#f8fafc",
                      "&:hover fieldset": { borderColor: "#94a3b8" },
                      "&.Mui-focused fieldset": {
                        borderColor: "#1976d2",
                        borderWidth: "2px",
                      },
                    }}
                  >
                    {filteredUsernames.length > 0 ? (
                      filteredUsernames.map((name) => (
                        <MenuItem key={name} value={name}>
                          {name.toUpperCase()}
                        </MenuItem>
                      ))
                    ) : (
                      <MenuItem disabled value="">
                        <em>
                          {selectedGroup
                            ? "Không có giáo viên nào trong nhóm này"
                            : "Vui lòng chọn phân loại ở trên trước"}
                        </em>
                      </MenuItem>
                    )}
                  </Select>
                </FormControl>
              )}

              <TextField
                fullWidth
                size="medium"
                type={showPassword ? "text" : "password"}
                label="🔑 Mật khẩu"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin(e)}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "12px",
                    bgcolor: "#f8fafc",
                    "&:hover fieldset": { borderColor: "#94a3b8" },
                    "&.Mui-focused fieldset": {
                      borderColor: "#1976d2",
                      borderWidth: "2px",
                    },
                  },
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        edge="end"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <VisibilityOffRoundedIcon fontSize="small" />
                        ) : (
                          <VisibilityRoundedIcon fontSize="small" />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              {error && (
                <Typography
                  sx={{
                    color: "#ef4444",
                    fontSize: 13,
                    fontWeight: 500,
                    textAlign: "center",
                    bgcolor: "#fef2f2",
                    py: 1,
                    px: 2,
                    borderRadius: "8px",
                    border: "1px solid #fee2e2",
                  }}
                >
                  {error}
                </Typography>
              )}

              <Button
                variant="contained"
                onClick={handleLogin}
                fullWidth
                sx={{
                  height: 48,
                  borderRadius: "12px",
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "1rem",
                  bgcolor: "#1976d2",
                  boxShadow: "0 10px 20px rgba(25, 118, 210, 0.3)",
                  "&:hover": { bgcolor: "#115293" },
                }}
              >
                🔐 Đăng nhập hệ thống
              </Button>

              <Button
                variant="text"
                onClick={() => navigate("/")}
                fullWidth
                startIcon={<ArrowBackRoundedIcon />}
                sx={{
                  color: "#64748b",
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  "&:hover": { bgcolor: "#f1f5f9", color: "#1e293b" },
                }}
              >
                Trở về Trang chủ
              </Button>
            </Stack>
          </Box>
        </Card>
      </Box>
    </Box>
  );
}