// firebase-config.js
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAKbGyqNjLGBPmPHaxCGvnDQV4tjQ",
  authDomain: "personalizados-2eb5f.firebaseapp.com",
  projectId: "personalizados-2eb5f",
  storageBucket: "personalizados-2eb5f.appspot.com",
  messagingSenderId: "498226923096",
  appId: "1:498226923096:web:98df6f34a7fd8630a5ec2d"
};

// Inicializa o Firebase apenas se ainda não houver um app
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Exporta Firestore e Auth
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
