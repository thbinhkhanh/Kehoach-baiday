// firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";

// Cấu hình Firebase mới
const firebaseConfig = {
  apiKey: "AIzaSyANBtd_rw2pGcb0jiBdSLceqE2thMzGWbQ",
  authDomain: "kehoach-dayhoc-2025-2026.firebaseapp.com",
  projectId: "kehoach-dayhoc-2025-2026",
  storageBucket: "kehoach-dayhoc-2025-2026.firebasestorage.app",
  messagingSenderId: "50688141757",
  appId: "1:50688141757:web:b08f844664b72101008ad4",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export các dịch vụ để sử dụng trong app
export const auth = getAuth(app);
export const storage = getStorage(app);
export const db = getFirestore(app);

export default app;
