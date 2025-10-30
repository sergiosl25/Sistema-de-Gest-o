import { auth } from "./firebase-config.js";
import { signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

// Redireciona se já logado
onAuthStateChanged(auth, (user) => {
  if (user) window.location.href = "index.html";
});

// Login
document.getElementById("btnLogin").addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("password").value.trim();
  if (!email || !senha) return alert("Informe email e senha");

  try {
    await signInWithEmailAndPassword(auth, email, senha);
    window.location.href = "index.html";
  } catch (err) {
    alert("Erro ao entrar: " + err.message);
  }
});
