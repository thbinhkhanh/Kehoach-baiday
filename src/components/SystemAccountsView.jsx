import React from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";

export default function SystemAccountsView({ accountsList, formatDate }) {
  return (
    <Box sx={{ minWidth: 0, width: "100%" }}>
      <Box
        sx={{
          p: 2.5,
          borderRadius: 2.5,
          backgroundColor: "#f8fafc",
          border: "1px solid #e2e8f0",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          width: "100%",
          minWidth: 0,
          boxSizing: "border-box",
        }}
      >
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 800,
            color: "#1e293b",
            mb: 0.5,
            fontSize: "1.05rem",
            overflowWrap: "anywhere",
          }}
        >
          📋 Danh sách tài khoản hệ thống
        </Typography>

        <Typography
          variant="body2"
          sx={{
            color: "#64748b",
            mb: 2,
            fontSize: "0.9rem",
            fontWeight: 400, // 🌟 Đảm bảo không in đậm
          }}
        >
          Tổng số: <strong>{accountsList.length}</strong> tài khoản trong cơ sở dữ liệu.
        </Typography>

        <TableContainer
          sx={{
            maxHeight: 520,
            maxWidth: "100%",
            minWidth: 0,
            overflowX: "auto",
            borderRadius: 2,
            border: "1px solid #cbd5e1",
            backgroundColor: "#ffffff",
          }}
        >
          <Table
            stickyHeader
            size="small"
            sx={{
              width: "auto",
              tableLayout: "auto",
              "& th, & td": {
                boxSizing: "border-box",
                whiteSpace: "nowrap",
                px: 2,
              },
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    fontWeight: 700,
                    backgroundColor: "#f1f5f9",
                    fontSize: "0.85rem",
                    color: "#334155",
                  }}
                >
                  STT
                </TableCell>

                <TableCell
                  sx={{
                    fontWeight: 700,
                    backgroundColor: "#f1f5f9",
                    fontSize: "0.85rem",
                    color: "#334155",
                  }}
                >
                  Tài khoản
                </TableCell>

                <TableCell
                  sx={{
                    fontWeight: 700,
                    backgroundColor: "#f1f5f9",
                    fontSize: "0.85rem",
                    color: "#334155",
                  }}
                >
                  Mật khẩu
                </TableCell>

                <TableCell
                  sx={{
                    fontWeight: 700,
                    backgroundColor: "#f1f5f9",
                    fontSize: "0.85rem",
                    color: "#334155",
                  }}
                >
                  Ngày cập nhật mật khẩu
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {accountsList.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    align="center"
                    sx={{
                      py: 4,
                      color: "#64748b",
                      fontSize: "0.9rem",
                      fontWeight: 400,
                    }}
                  >
                    Chưa có dữ liệu tài khoản trong hệ thống.
                  </TableCell>
                </TableRow>
              ) : (
                accountsList.map((acc, index) => (
                  <TableRow key={acc.id} hover>
                    <TableCell
                      sx={{
                        fontSize: "0.85rem",
                        color: "#64748b",
                        fontWeight: 400, // 🌟 Chữ thường không in đậm
                      }}
                    >
                      {index + 1}
                    </TableCell>

                    <TableCell
                      sx={{
                        fontSize: "0.85rem",
                        color: "#0f172a",
                        fontWeight: 400, // 🌟 Đã bỏ in đậm tên tài khoản
                      }}
                    >
                      {acc.username}
                    </TableCell>

                    <TableCell
                      sx={{
                        fontSize: "0.85rem",
                        fontFamily: "monospace",
                        color: "#2563eb",
                        fontWeight: 400, // 🌟 Đã bỏ in đậm mật khẩu (giữ màu xanh đặc trưng)
                      }}
                    >
                      {acc.pass}
                    </TableCell>

                    <TableCell
                      sx={{
                        fontSize: "0.85rem",
                        color: "#64748b",
                        fontWeight: 400, // 🌟 Chữ thường không in đậm
                      }}
                    >
                      {formatDate ? formatDate(acc.updatedAt) : acc.updatedAt}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
}