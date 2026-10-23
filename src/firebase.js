// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Cấu hình Firebase mới của trường
const firebaseConfig = {
  apiKey: "AIzaSyBvnG3COSNGkefxLmcBoFzYKC-_RzGVc_4",
  authDomain: "kehoach-dayhoc-bk.firebaseapp.com",
  projectId: "kehoach-dayhoc-bk",
  storageBucket: "kehoach-dayhoc-bk.firebasestorage.app",
  messagingSenderId: "387550827042",
  appId: "1:387550827042:web:ebb6f29367431c0b54307b"
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);

// Export các dịch vụ
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;