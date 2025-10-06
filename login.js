// login.js
// incluir com: <script type="module" src="login.js"></script>

import { auth } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

// Se já estiver logado, redireciona para o programa
onAuthStateChanged(auth, (user) => {
  if (user) {
    window.location.href = "index.html"; // ou programa.html, conforme o nome do arquivo principal
  }
});

document.getElementById("btnLogin").addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value.trim();

  if (!email || !senha) return alert("Informe email e senha");

  try {
    await signInWithEmailAndPassword(auth, email, senha);
    window.location.href = "index.html";
  } catch (err) {
    alert("Erro ao entrar: " + err.message);
  }
});
