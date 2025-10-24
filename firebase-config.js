// firebase-config.js
import { initializeApp, } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAKbGyqNjLGBPmPHaxCGvnDQV4tjQWXFr8",
  authDomain: "personalizados-2eb5f.firebaseapp.com",
  projectId: "personalizados-2eb5f",
  storageBucket: "personalizados-2eb5f.firebasestorage.app",
  messagingSenderId: "498226923096",
  appId: "1:498226923096:web:98df6f34a7fd8630a5ec2d"
};

// Inicializa o Firebase apenas se ainda não houver um app
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

window.db = db;

import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

const auth = getAuth(app);

export { db, auth };

