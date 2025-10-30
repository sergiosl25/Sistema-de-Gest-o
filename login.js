import { app } from "./firebase-config.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } 
  from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

const auth = getAuth(app);
console.log("✅ login.js carregado com sucesso");

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
    console.log("Login bem-sucedido!");
    window.location.href = "index.html";
  } catch (err) {
    console.error("Erro ao entrar:", err.code, err.message);
    alert("Erro ao entrar: " + traduzErroFirebase(err.code));
  }
});

function traduzErroFirebase(codigo) {
  switch (codigo) {
    case "auth/invalid-email": return "E-mail inválido.";
    case "auth/user-not-found": return "Usuário não encontrado.";
    case "auth/wrong-password": return "Senha incorreta.";
    default: return "Erro ao fazer login.";
  }
}



