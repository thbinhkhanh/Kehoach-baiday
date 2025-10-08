import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../supabase";

const ProfileContext = createContext();
export const useProfile = () => useContext(ProfileContext);

export const ProfileProvider = ({ children }) => {
  const [allProfiles, setAllProfiles] = useState([]); // toàn bộ users
  const [currentUser, setCurrentUser] = useState(null); // user hiện tại

  // 🔹 Lấy danh sách profile (gồm cả môn học)
  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, username, custom_password, subject"); // 👈 thêm subject
      if (error) throw error;
      setAllProfiles(data || []);
      console.log("⚡ Fetched profiles:", data);
    } catch (err) {
      console.error("❌ Lỗi fetch profiles:", err);
    }
  };

  // 🔹 Hàm cập nhật môn học cho 1 user (nếu cần dùng)
  const updateUserSubject = async (userId, newSubject) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ subject: newSubject })
        .eq("id", userId);

      if (error) throw error;

      // Cập nhật lại state local
      setAllProfiles((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, subject: newSubject } : u
        )
      );

      console.log(`✅ Đã cập nhật môn học cho user ${userId}: ${newSubject}`);
    } catch (err) {
      console.error("❌ Lỗi cập nhật môn học:", err);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  return (
    <ProfileContext.Provider
      value={{
        allProfiles,
        setAllProfiles,
        currentUser,
        setCurrentUser,
        fetchProfiles,
        updateUserSubject, // 👈 thêm vào context
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};
