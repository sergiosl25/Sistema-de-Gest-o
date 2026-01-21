import { auth } from "./firebase-config.js";
import {
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

console.log("✅ login.js carregado com sucesso");

const msgErro = document.getElementById("msgErro");
const btnLogin = document.getElementById("btnLogin");

/* ===== Persistência ===== */
try {
  await setPersistence(auth, browserLocalPersistence);
} catch (err) {
  console.error("Erro ao definir persistência:", err);
}

/* ===== Verifica usuário logado ===== */
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Usuário já logado:", user.email);
    window.location.href = "index.html";
  }
});

/* ===== Login ===== */
btnLogin.addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("password").value.trim();

  msgErro.textContent = "";

  if (!email || !senha) {
    msgErro.textContent = "Informe e-mail e senha.";
    return;
  }

  btnLogin.disabled = true;
  btnLogin.textContent = "Entrando...";

  try {
    await signInWithEmailAndPassword(auth, email, senha);
    console.log("✅ Login bem-sucedido!");
    // redirecionamento ocorre no onAuthStateChanged
  } catch (err) {
    console.error("❌ Erro no login:", err.code);

    switch (err.code) {
      case "auth/invalid-email":
        msgErro.textContent = "E-mail inválido.";
        break;
      case "auth/user-not-found":
      case "auth/wrong-password":
        msgErro.textContent = "E-mail ou senha incorretos.";
        break;
      case "auth/too-many-requests":
        msgErro.textContent = "Muitas tentativas. Tente mais tarde.";
        break;
      default:
        msgErro.textContent = "Erro ao entrar. Tente novamente.";
    }
  } finally {
    btnLogin.disabled = false;
    btnLogin.textContent = "Entrar";
  }
});
