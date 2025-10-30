import { auth } from "./firebase-config.js";
import { 
  setPersistence, 
  browserLocalPersistence, 
  signInWithEmailAndPassword, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

console.log("✅ login.js carregado com sucesso");

await setPersistence(auth, browserLocalPersistence);

onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Usuário já logado:", user.email);
    window.location.href = "index.html";
  } else {
    console.log("Nenhum usuário logado ainda.");
  }
});

document.getElementById("btnLogin").addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("password").value.trim();

  if (!email || !senha) return alert("Informe email e senha");

  try {
    await signInWithEmailAndPassword(auth, email, senha);
    console.log("✅ Login bem-sucedido!");
    window.location.href = "index.html";
  } catch (err) {
    console.error("❌ Erro no login:", err.code, err.message);
    alert("Erro ao entrar: " + err.message);
  }
});


