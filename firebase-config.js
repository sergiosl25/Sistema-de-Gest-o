import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyAKbGyqNjLGBPmPHaxCGvnDQV4tjQWXFr8",
  authDomain: "personalizados-2eb5f.firebaseapp.com",
  projectId: "personalizados-2eb5f",
  storageBucket: "personalizados-2eb5f.firebasestorage.app",
  messagingSenderId: "498226923096",
  appId: "1:498226923096:web:98df6f34a7fd8630a5ec2d"
};

const app = initializeApp(firebaseConfig);

// Exporta Firestore e Auth
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };





