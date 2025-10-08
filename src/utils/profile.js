import { supabase } from "../supabase";

/**
 * Đổi mật khẩu tùy chỉnh cho username
 * @param {string} username - tên người dùng
 * @param {string} newPassword - mật khẩu mới
 * @returns {Promise<boolean>} - true nếu đổi thành công
 */
export const updateCustomPassword = async (username, newPassword) => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .update({ custom_password: newPassword })
      .eq("username", username);

    if (error) throw error;

    return true;
  } catch (err) {
    console.error("❌ Lỗi đổi mật khẩu:", err);
    return false;
  }
};
