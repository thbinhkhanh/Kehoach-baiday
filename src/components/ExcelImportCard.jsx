import React from "react";
import {
  Box,
  Stack,
  Typography,
  Button,
  LinearProgress,
} from "@mui/material";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";

export default function ExcelImportCard({
  importing,
  handleExcelImport,
  fileName,
  importProgress,
}) {
  return (
    <Box
      sx={{
        minWidth: 0,
        overflow: "hidden",
        borderBottom: "1px solid #e8edf5",
        pb: 2.5,
      }}
    >
      <Box
        sx={{
          height: 4,
          width: 54,
          borderRadius: 5,
          bgcolor: "#7357d9",
          mb: 2,
        }}
      />

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2.5}
        alignItems={{ xs: "stretch", md: "center" }}
        justifyContent="space-between"
      >
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="flex-start"
          sx={{ minWidth: 0, flex: 1 }}
        >
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "#f0edff",
              color: "#7357d9",
              flexShrink: 0,
            }}
          >
            <CloudUploadOutlinedIcon />
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: 17,
                fontWeight: 750,
                color: "#172b4d",
              }}
            >
              Nhập phân công từ Excel
            </Typography>

            <Typography
              sx={{
                fontSize: 13,
                color: "#718096",
                mt: 0.5,
                lineHeight: 1.7,
              }}
            >
              Tự động nhận diện phân công giảng dạy từ Excel.
            </Typography>
          </Box>
        </Stack>

        <Button
          component="label"
          variant="contained"
          disabled={importing}
          startIcon={<DescriptionOutlinedIcon />}
          sx={{
            minHeight: 42,
            px: 2.5,
            borderRadius: 2,
            bgcolor: "#7357d9",
            boxShadow: "none",
            fontWeight: 700,
            textTransform: "none",
            whiteSpace: "nowrap",
            flexShrink: 0,
            "&:hover": {
              bgcolor: "#6045c0",
              boxShadow: "none",
            },
          }}
        >
          {importing ? "Đang nhập dữ liệu..." : "Chọn file Excel"}

          <input
            type="file"
            hidden
            accept=".xlsx,.xls"
            disabled={importing}
            onChange={handleExcelImport}
          />
        </Button>
      </Stack>

      {fileName && (
        <Box
          sx={{
            mt: 2,
            p: 1.25,
            borderRadius: 2,
            bgcolor: "#f7f8fc",
            border: "1px solid #e9edf5",
          }}
        >
          <Typography
            sx={{
              fontSize: 13,
              color: "#475569",
              overflowWrap: "anywhere",
            }}
          >
            <DescriptionOutlinedIcon
              sx={{
                fontSize: 17,
                verticalAlign: "middle",
                mr: 0.75,
              }}
            />
            File đã chọn: <strong>{fileName}</strong>
          </Typography>
        </Box>
      )}

      {importing && (
        <Box sx={{ mt: 2 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            sx={{ mb: 0.75 }}
          >
            <Typography sx={{ fontSize: 12.5, color: "#64748b" }}>
              Đang xử lý và cập nhật dữ liệu...
            </Typography>

            <Typography
              sx={{
                fontSize: 12.5,
                color: "#7357d9",
                fontWeight: 700,
              }}
            >
              {importProgress}%
            </Typography>
          </Stack>

          <LinearProgress
            variant="determinate"
            value={importProgress}
            sx={{
              height: 7,
              borderRadius: 5,
              bgcolor: "#ede9fe",
              "& .MuiLinearProgress-bar": {
                bgcolor: "#7357d9",
                borderRadius: 5,
              },
            }}
          />
        </Box>
      )}
    </Box>
  );
}