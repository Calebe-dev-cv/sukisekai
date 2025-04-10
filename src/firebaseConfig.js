import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAG_xUVnl5ikgyzHz_8AGws4Ah1E7xuTaU",
  authDomain: "sukisekai-5e3e0.firebaseapp.com",
  projectId: "sukisekai-5e3e0",
  storageBucket: "sukisekai-5e3e0.firebasestorage.app",
  messagingSenderId: "953159347645",
  appId: "1:953159347645:web:d88b9a85984880453436d4"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp)
const provider = new GoogleAuthProvider();
export { auth, provider, db, storage };