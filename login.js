import { auth } from "./firebase-config.js";
import { signInWithEmailAndPassword, onAuthStateChanged } 
  from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

console.log("✅ login.js carregado com sucesso");
console.log("🔥 Auth:", auth);

onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Usuário já logado:", user.email);
    window.location.href = "index.html";
  } else {
    console.log("Nenhum usuário logado ainda.");
  }
});

const btnLogin = document.getElementById("btnLogin");

btnLogin.addEventListener("click", async () => {
  console.log("🟢 Botão clicado!");
  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("password").value.trim();

  if (!email || !senha) return alert("Informe email e senha");

  console.log("Tentando login com:", email);

  try {
    await signInWithEmailAndPassword(auth, email, senha);
    console.log("✅ Login bem-sucedido!");
    window.location.href = "index.html";
  } catch (err) {
    console.error("❌ Erro no login:", err.code, err.message);
    alert("Erro ao entrar: " + err.message);
  }
});
