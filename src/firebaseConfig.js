import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
const firebaseConfig = {
    apiKey: "AIzaSyDbZOF5-SydeTdO2mAQ1H1l6wsQWGDhSHs",
    authDomain: "anime-dbb70.firebaseapp.com",
    projectId: "anime-dbb70",
    storageBucket: "anime-dbb70.firebasestorage.app",
    messagingSenderId: "761260964736",
    appId: "1:761260964736:web:8c830c5a4852e24950df65"
  };
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const provider = new GoogleAuthProvider();
export { auth, provider, db };