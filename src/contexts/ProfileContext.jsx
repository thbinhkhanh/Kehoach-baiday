import React, { createContext, useContext, useState, useEffect } from "react";
import { db } from "../firebase"; // 👈 Trỏ đúng về file khởi tạo firebase.js của bạn
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";

const ProfileContext = createContext();
export const useProfile = () => useContext(ProfileContext);

export const ProfileProvider = ({ children }) => {
  const [allProfiles, setAllProfiles] = useState([]); // toàn bộ users
  
  // 🔹 Khởi tạo currentUser từ localStorage để giữ trạng thái khi F5
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("currentUser");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (error) {
      console.error("Lỗi đọc localStorage:", error);
      return null;
    }
  });

  // 🔹 Tự động lưu hoặc xóa currentUser khỏi localStorage mỗi khi state thay đổi
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("currentUser", JSON.stringify(currentUser));
    } else {
      localStorage.removeItem("currentUser");
    }
  }, [currentUser]);

  // 🔹 Lấy danh sách profile từ Firestore
  const fetchProfiles = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "profiles"));
      const profilesList = [];
      querySnapshot.forEach((docSnap) => {
        profilesList.push({
          id: docSnap.id,
          ...docSnap.data(),
        });
      });
      setAllProfiles(profilesList);
      //console.log("⚡ Fetched profiles:", profilesList);
    } catch (err) {
      console.error("❌ Lỗi fetch profiles:", err);
    }
  };

  // 🔹 Hàm cập nhật môn học cho 1 user trên Firestore
  const updateUserSubject = async (userId, newSubject) => {
    try {
      const userDocRef = doc(db, "profiles", userId);
      await updateDoc(userDocRef, { subject: newSubject });

      // Cập nhật lại state local
      setAllProfiles((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, subject: newSubject } : u
        )
      );

      //console.log(`✅ Đã cập nhật môn học cho user ${userId}: ${newSubject}`);
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
        updateUserSubject,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};