import { app } from "./firebase-config.js";
import { 
  getFirestore, collection, addDoc, getDocs, getDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, where, orderBy,  Timestamp 
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { 
  getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword, setPersistence, browserLocalPersistence 
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

const db = getFirestore(app);
const auth = getAuth(app);

// Garantir persistência de login
setPersistence(auth, browserLocalPersistence)
  .then(() => console.log("✅ Persistência de login garantida"))
  .catch((err) => console.error("❌ Erro ao definir persistência:", err));
  
// Elementos do DOM
const telaLogin = document.getElementById("tela-login");
const appContainer = document.getElementById("app");
const header = document.getElementById("header");
const secoes = document.querySelectorAll(".secao");
const formLogin = document.getElementById("formLogin");
const userName = document.getElementById("userName");
const emailLogin = document.getElementById("emailLogin");
const senhaLogin = document.getElementById("senhaLogin");
const userEmailSpan = document.getElementById("userEmail");
const btnLogout = document.getElementById("btnLogout");

// Tabelas e selects
const tabelaClientes = document.querySelector('#tabelaClientes tbody');
const tabelaEstoque = document.querySelector('#tabelaEstoque tbody');
const tabelaItensVenda = document.querySelector('#tabelaItensVenda tbody');
const tabelaOrcamentos = document.querySelector('#tabelaOrcamentos tbody');
const clienteSelect = document.getElementById('clienteSelect');
const produtoSelect = document.getElementById('produtoSelect');
const produtoSelectOrcamento = document.getElementById('produtoSelectOrcamento');
const tipoPrecoSelect = document.getElementById('tipoPrecoSelect'); // Ex: Estampa Frente, Branca, etc
const precoSelecionado = document.getElementById("precoSelecionado");
const quantidadeVenda = document.getElementById("quantidadeVenda");
const tbodyCaixa = document.querySelector("#tabelaFluxoCaixa tbody");
const totalEntradasEl = document.getElementById("totalEntradas");
const totalSaidasEl = document.getElementById("totalSaidas");
const saldoCaixaEl = document.getElementById("saldoCaixa");

const categoriaMovimentoEl = document.getElementById("categoriaMovimento");
const modalMovimento = document.getElementById("modalMovimento");
const tipoMovimentoEl = document.getElementById("tipoMovimento");
const descricaoMovimentoEl = document.getElementById("descricaoMovimento");
const valorMovimentoEl = document.getElementById("valorMovimento");
const dataMovimentoEl = document.getElementById("dataMovimento");
const LOGO_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJYAAACWCAIAAACzY+a1AAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAAGYktHRAD/AP8A/6C9p5MAAACMelRYdFJhdyBwcm9maWxlIHR5cGUgOGJpbQAACJlVjUEOw0AIA++8ok8AzDqb77S55ND/XwurlLRYWjFey8h8nm951JhRMMNjj0Mj1cNpL3WfuXkwE0cElAYt0ejYcrs4nSEL/GsAi6MDTvwywJHvaN5Zf1kql8FUX1wFfwyvnffBufI3b1Jt7Auq8gGE1jFBcEbwvQAAAIJ6VFh0UmF3IHByb2ZpbGUgdHlwZSBpcHRjAAAImVWNMRaAMAhDd07hEVKgqZ5HFzcH7/+EqvVZlvyUENmPc5UpX4FLWaE6A1Snq2/uBhZDDgvVWqiHw6ld68tmnSMjz4LSbuNdiAisDl6Yf20wY0Zh5oU/wzQ1v8a5Bz5ueYyjAJALAvYsiDxBe/wAAD78SURBVHja7b13lJ3ldS+8n/a2U6drpEENCQmBJCMJhACZXmUQixKCY6qTrJVA7PizndixLxffrOCV5Ti5xtcmdgzOhzHFYBkEF4QAiaIOI1lt1AWSpmjqmVPf9pTvj33mMDRfiax8YdadvbRg5pR33vP+nr33b//2ft5DgiCAcRvLRv+rT2Dc/qM2DuGYt3EIx7yNQzjmbRzCMW/jEI55G4dwzNs4hGPexiEc8zYO4Zi3cQjHvI1DOOZtHMIxb+MQjnkbh3DM2ziEY97GIRzzNg7hmLdxCMe8jUM45m0cwjFv4xCOeRuHcMzbOIRj3sYhHPM2DuGYt3EIx7yNQzjmbRzCMW/jEI554yf/Fg0AiD0xFH81BEb9QIn58HuIwaf+kI28ho76K++bAQoA1Lz/uCHUAJAPvvKjf3rkrE7KRq9sfbJv/v/ZThZCjZfMACWGUkMBAIjWoA3RhhgN74MAAMQgzEAB9AdRJIbirwYAiCYGKGhtKBXCGNBaaiO1lsYYoogh1NicGnAojyo+FZwLUQxDJ+GoKMZTQvDev/bm/R8RhI8D8qPw0FHvJQAGCHzGUTxpL9TUEEOIBmrwqlFDNIBGLKqvwYtlKCVVCDU+/AEX0VVXBg0GCGhNqsfQBBQYA0ApZ4RaFjOM5colIQQIWwimidFEE0KiSLITO+338RtZdp/0+cZccjk5CA0BRQgBsA0wDQBaUUSPAmiiKQMwhGq8ZIRqAwACAIAoIJoajcAbAmpkdRPQ1AAAKEIVhcgvU84YFZwLBgDKxIFUJsqmEsYoIHFMwjCOBbU545QSo03VyQkAgK6tkhGQqr5OquCRPwTeh987JuxkvZCOOFs189X+UV09lAEKBACAGKCGjgReAIPvrV5rAtoQIMaMeCLBxy2LA4AxKo6lNgCaAAFDie/7cexbjFEGhFGtNQMApQmAIe/nWjPi96PDpoHRMQJGXE1/8JGP/Rk++055chASA9xQdD6FPoYsQ1fzoqomPiAGuAZqNBAJAKC5JlQTKokG0BQkNwaMBkCXJWAoMZQBGKUNKCAajKGGAeWKW5oRTglhjChpCc45iSLJDCeEGAIaNDV01IXHfDbqtD/wGeQISB9xtY86n/ms4wefIhfW8p8hoAlQo4mhI0uVggEgtTQJQJD+GABKDWhS9Q9FgGh0F2KAGgAgVR7LbKGIrSgooCFABFABMABxKWhNOkKySMWEEAAASimjSsWAeRTwxGrgfYi9mA+CNPID0WDoGAUP7aQhrMUrTT7wYJWw1B4iAIbWGAteMmqAgFZEK6ARBQCgBpktHkQrQgtRrB03BvAB+gCODMHhoXwlnyPHjy4/93OnZhyuApsLKlgMEMYR5zHgwgEAQw2pXfr3MSCmSnrBaINovY+Z+QB+5mPe/hm3TwOhrqKC7lN1QfMB8k1HPAHjG15XjaUFNdQAKAqmmjirvhhRCCiUhTgaQkdXYffR3oO9xd6yX9SBK8uL62wnnXY5aO1rrRgXBGhsNCOGGG0IBUM+5HgfiASmBttImB2NIsAHvZaOgvCzTm1OmpHGVAMA05SOBFW8BpZgQRS5jluJAspoHMe2cECRSIItLK0lAFjCUspEUQyMUkqkjqUKQTiEWRWAzgAOFWF1R+eegfzRoVJIbWbX21lOVDHoO3jm7NNcqi0ASkFwTxtWrkSe44DxgQLBtGuIQTgMVUpRQgA0IYZRIMQAMQSo1MwABaKNUQAaSK0cMh+OvdXy47OO4qdQZ0bI3uhsQXSx7Nu2XSpXOLO0VDa3LEaHi6VMNhVFEQNGKfX9MI4VF5ZjCz9WytBIuDETfQA7j0UbOo78vnuoj6VyzJaZOmN7jNp+VHLioRkNDadPm1LHKEDklyuxAEItYigxoAg1BpcS1UAILiljED9jlAEtJcYCo4FRKgDAaABCAAgBShkAGK1HAuwHP9d/NUD/CRAyA6bKX+hIONIagDBGuRXn/FQmCRpMqCqVSl06FYUBBTCGxrEilDuuBcZUSgF3HG6xIYDfD5uXdh3euK9rKBAs1aTcBBCuOY+MsbnR5SL18zOm1belKQMTxZIwh3BPCGELRZiJJdGEE13FkRhDAIAYy7YAtDHcGKNBGWOMMQQoMdQYYow2GgglhBAwQBloPbrs+FC+/EzbSRcV1SVqRmiKAU01BepaLpRNfSILXfHWN9fNWXhmYkodAIn8gNuW0lobYtsWpURKrWwnEnDAh5f39by069DBiqHZNtKYKVSk1lQxJg01cWAEcBPVUzN/clsDgK2VZQgVDgDRsVQmUKEEzpADG6OIAQKaaAMAcQDIloAwQpmhjBAKhhJDQGlCwIA2BpEbLap9EEWAzz6v+RRFRZUOEABmtCEYgICEhhMG78GuR1966+VV079R75zaFJZC1034Yag5ZxYP4oBQYWxeJvBmV/T8znfXHO7N23WiaULMLBVH1BZBMeRJN+FYIUhhIltHbSlvblvGA+BRLJRkhEoVxSCJkJTHtkUBDDUSMLfpUZfeMCBcGy4NBcUlUABqcwMgCdFEgTHGGKq11hoo/Qh/+VBQ/azap8mFZOSDoTpKQHNFGWGwP9z/0+c7/vf6+lDnt3dmr5xvpS0iCMSREExTHhGgDu8z8Nqe3K83bs+lJ+q208OI+6EGbizGtNLC9bgMYXCQVYYSrmmz5Oea0lMdoDIUpsS4Bqo4jbkuGygZ48e5YWakAUmMpEaDUQAGDAHhArWAOJR5Fk0Cc2xqG+LEShjgQAhl3BhiRiIwGF6FrSrcjA38Ph2E1ADFuk8DANHMGBYDdFbaH3xqYMXOU2XSJDP929+dkjckReI44hZjlEaUxI44GsGqA/nntx88nmwr0GQlZppQZguLGRJrHUQuU25UbtaFpqSa2GjNbEid01zfAiZJ8sLKgxwCvx/iQR30lKNOJXOyPMS1IiYmoBhEYDQ1oIGEEQXmMTsr7HrhNgu3DqwU4c2KnaJYHWM2Yw4FCwzRihnNAAgAHaFqWOzL/2p0/nMgJAbMqAgjFCcKoGzv/OljR1/YOls11YFXqAR9R4egKwdNdRGLWMLyJSgGgwC/2977m63784nm0KorKwpAGCMJE3LfZ0HFiiqnpBOz2hLnTZ88bzLPMEhBuRFKttxFom6Q/cXBg+Xcu5bOU5ILZS8h5QTX1EiqNQVNjAajqAENVDCiQKgoKWMvKqUMcQw4IalvnnmRhEmcNFLWRGhGG0GAaaDGwMepo2OA0fBPaocihZNSWpallNJaE0IoEAsUISQijFMRl5WlbSDswEMv9a3sWMSnF8pDIMCllA4HuR2H6s462xWOT3nFgqMx/G5PYcWurn5rgrQa4oCA0ZbDkkyR4oBbGZrbmFkydfLnZ9c3EKizIE18BwZNfDga2h0WD0alg5bOUZ1P6Qo1IaGRy6VhsYoDYzQAM4YSoADUUEOIpEQCDRgJtGKx4loyAozTxOD+/TFtsxNnpZoW2+k5mlixUgCcEjNCs6t624iU+F8N0f8Rwk98gvM4jlPJVBRHjDHOOec8CnytlSUsQShnBDQHw+Tqw/2vH2grJXkuaKL1jLEo8HUl7tx3qK54diEqx05mEOC57T3P7+kpJFo0T0eKCKrrXEHDQtzfOclRS+e2XTjjlFlJmGDyWVqywYe4Ny7uD3K7o8I+Ex5xeZ5DSUBMqDLGSB1LqbQ2tmcBUGoMGDJKrVVaSyCaQWgJ4XBhFOhYh6rMZWREiiofVASEcWYpo6MosgQD0GA4fOYxO1EIC4VCKpXyA58Q4thOuVImhGgNhDKlgQIBCcKxoKOw7bFVUft7nmp0mcU4j5TyvGTZ7zu2b+dcuZxnE8c0vHIker6j80AZnKQVg+KCuWDkYHezzi2YWnf53KmLWq1mgAQEKchB9K4aPFQa3h3kd0PY6ZCcwyOqA0Y1pRQoAcIBONFgDGhSveQGCBhjUDU3YNkpLQMjIyNjQoFQzrhl00wharOS89KN87h7ShQJRRRQwrkFZpRCXjMyBjrAnwhhKpUSXIRhKIQAAK11FEWO62ipgjjmhtqRAcPfW7VpYOP+GTLjGc4pi6M4pirkTHlOclITeE6UJG+/V1mxeV+XskVTYwWIIFKXBuP80NyW1DVzz7hsVnIqQBJ8oQcdOqT62+PSgXJ+b1x5l5leR1Q8rhllccQCaWtDY80U4YRalAhDBCFcGwLaGGMMKKINGEWM5LFmNBI0ZEQRQ0BxoyxfN2dbljgNiyEzB0yTCW0NjBqgxJAPw6fHTGn/sfNCACCj2C9XhBCcsnKplEokwzA0xhhGlaRgjE05rD926MW3mypOi6ijwArlYZe6JRUcjcttl5815YvnFTNkQw5e2tt/IBeS5slSeDIMU1zRcu/5kzPL5k+9aLLTCOBCr6uPQ+WwHtox1PkGJ8cFKXl2KHiktQ4i6keUixYJnuYpwjKcJ5mVEjxJuUuJZTTVhhljtJFgJNUhJWEx32NoScGwlAUlY0oc12nm9kxn6hVApoHOSOVR4XkWiWMV+GXHFh/A76Me+Vm1T/RCKWUmkwmCIAxDy7KklJTSOI6JsISwHU1hGHY+85bZNzzRnRCXFGMQgGK26Q2LdFbTvD+5EpY2dFB4cvORbf1+4NUrQ4kBFhTcOH/xaa13nj9tEoU6HaTIgIBOqOyLe94u9rV7pEuwElCqNS1XHAWuoXXgNKSaZhpWR6166tSBlQWeAOoAsUATMHyEIWswMRgJENqVPlC5KOgplfpkEDhOOtE4DbJnAD9Vq/pICqU4E4YoQkALTIQfHp77rIfQ/wOEiURieHg4nU6Xy2XOealUchyHEk6AEQ3EQHnr4d439zaVPZGwK7JIFOGu2898+4yW02+/BC5u6Baw+nC4/lh/LtEUOY6UUYboRiHPaUzctXjaLAucsJhiRUF6YWjj8QOvkPDd5kxMIDRgRyobyGzMW7lzipueYiVaWeYUIB6QBFALNAdNjdRKa845AGhabZiMlHUSUtOBRpYpZ6KSG0WU2GA3gmgMQ0uDbZggDJSUUsWcEtsRMopHz1fCSK9qDDPSrVu3/vrXv/7+97/vOI6UMp1O+75vDLG4oCGAgiNvdFj9us5kpS+5JYzRviW7WPHMS8+tv/6sMAO7SrBy+96ccCLXoZQmQmUNds6fXPfli2bPdUBI3yVDqrg/P/S2yr/t0W5m++UgDkMOvJ4707yG063MGZCcDqIeTFIqro2lFVeGEmCEEMIo5dpXklTnDwkAJYSAYcQAoYaCBhobW1FutCKBsUjoMFtEQayVtC3OHaZipY2MIl2dBKhWhyNDCACf/dKQM8aCIOCcW5ZVLBYdxzHGOI7z+OOP/+QnP3Fd9/vf/77v+wBgWRYAjcPYoQLeGtj/UvtUSDHJ4tj3PCdUqqs0MOnGsybdfQW0QjeBJzYd3jHkW5OmB1LSsGiX+6+c1fBnF552GoDKD9ZnICofKvW/HufecVWXa0kpk/mK69SdYSVO9TKnQmoKiFYwSQOWBK4JAeCEU27oiLMZozUlDIisin1VhYUZoo0yigCAABAAlDAAoMZAFMWUAaMAOlIKoecj4FV1UTJW0iBCaIyhlBpjlFK2bSulPM9rb29/9dVXp02b9sQTTyxcuHDZsmVhGFYqlXQywzSBCMo7Op1+48QWI4yDYIIWIbSm1E+/YgE0Qs6GjT3hnlIcJOpjP0wnLJ3rPXti6oYFp7bEMQnzjZkgKu0qD21RxXauupWSJd+xvLb6ttOthsXAJwFPA2Rk5MbGASKAcTMya4XoVQmkAUMoGE5AAlBqKBg6MlI1ukfPoTr3Xa3ZKUgCUG0uAof39d6RHtMYEUgBgIM2nDIpJVBjcRGGIRj438+/cOTd9xKJhGVZ/+0733Us+wvXXhuHESgtCIMiHN7Q4Q5rm1BBGSG0bKIeUT7tkvO9i8+Is9CpYfWuPe+VBaQmmCDUA8cX1PE/WThjcYp5puSaHASHCt0rWbyfhu9GkSZsaiI7262fQ70ZkJxpIGUMjRVRmgOhlFmMQWSAGK2JotV5VE0AwFBJ3gcJDCcjM/2KKkIkIoqvpFXNs9omw6kRDRSAVR8ncvRAhhkrRQUK9cYYQojW2rbt/r6+1atXe56XTCbDMBwcHPyHf/iHSZMmnbVgQZQPGOfQWerZ/V4LcVzCAIzicDzOlaeIScuWQBP4LuwdMpsO94T1szm3uBqui0rXzj99aZPnQSlJ8sC7B/e9KotbOR/i3KLWRCtzbrLpbPCmGJ2phElNHE4NIYQyRgjTxkjEi+Dwv0QXpBqvMQ7AaagmMQMj3gRVsQZBrQ6LV/mOgZFC/n1BB8z7oqghGiepPvtBtTqmAACMsSiKKGNbt27du3dvQ0MDADiO47pub2/v1772tcGBATAGJAztPRLmCvVewjbEKFkmcR+rtF5yJpzVZAwMA7x1oKtXW7aXgvJwYzD4hTlTzp9SnwLpyCFQx2TXmmBgsyMHIKLcm1c/+brk5GuVsyA2p2jRSkiKE4sAJ4QRClrLWAa+X9FEaao00YYYA0QD0WAZsHAGXFGtqNQ0kiySTGoCBrgB24AAw3GmVQHXwA2qoICjydXWxMiwVjXMmuqIntZEf/YZKc6oE0II6toAsG7dOsx8lNIwDOvq6nzf371796OPPmolXCjD0Z0HEkBdQjkYqeMKiXlresGyJZCEvA0Hy7Bu/xFINhkN3C/Mb3SvmdfWzIAGx3l8LOzckD/+e8uUgdZ5mbOSzZdCZimQGZFuDGUiioVtuZxZhDAwDAwBBowbLoCCpEZSHGICaoArQmtDj4iBJlrXdjoZDqYmXEhDwADXhI8o1xR9GoipCjFEEqNH75NS1V0Dn3XjxhjGGCEE6Ux+eHjbtm3JZDKOY0JIIpHo6+urr6/P5XItLS0QA+Th+N73JlgiHhq2IBsTEjB1ypxp5PQpAZElm2/Yc7zXB1aXlZVgos2umT9zqgMJ49swFA21F3rfZmaQefVOdpHVcDYkFxpZH8QUOLMpUSoCoo3WShtCCGGCc2KM4kYbFRNDwHCAaiGP8ZMZMKBHshpUSQ0QYgCIIhAbihmRGRAaKIXqVqwR8CWOSBKQVQfEFxDc7kP1SKr8zBpFRkoIkVJyIfL5fFdXVyKRyGQyjLFSqZRMJguFwmmnnXbNNdeABChpv7fgcasiS8YYyU3RjhtOnwiOiVxeANjy7nFINShDnPLwzKRYMtXygoEsGbRMp1/Yo/VgRJI0OceZvgy8s2XcHJs0oY6WxhjjOJZSsdIxMUCAMWBGEyOVjCJiYOTf6JkBwA1TuFOOjkwVEwMAhpiRntFHiMn7M0A4Y/iBF5AROjqyu+CzbVQIoZRijDHGjNYHDhzo7+83xgRBoJRCjmOMue6661zXBQ3QnyOhkX7sgA3ahCSOJrHmqxYAVz6BrUNwqEB8xrMeb45yd19yalJDlgekvKt4fEPfQEdZkezES7On3qrj6WC1cs/hrlI0YgKCKJQSDHBKOKWUgNYq1lKCJpxYWhHGLUOAMDCgGCeUGMvi5XLZtm3GSKVcNFpSYpSMgCguKFCiDeXCI2ApaRg1oV8Ig4pj2bbtRrEyQAkhcRxzyuJIcWZz4WhDbNt1hSvLkdBMME4ppZTatk0p1Vrj5cJHpJSEEMZYGIYAYNs2Pqi1ZowppZRSlFK8vEop1CmxcxDHsZSSc66UCoIApyAZYwCgsGI9MeOYAimlSiljTC6Xw+6uMSNbmLS2LKu1tRX1C5krgS+p4gCUMoi4tNoyUGeDy2MO+3shL5lWIAv950xvmUAhTWSCF8LBA/mhQ46TzjTNEsl5Wk2KTDooR4wbSkEIEUXSSyZGUtcHZ+mB4mngZFMch5RSzmkck2KxmEql8EpZloVnyDkF0HEcGmOU0lpLz/PiqCxllM2kACCKIkop5xaOPOGVtSxHa6hUyq7rotZBlHaFpbWO4zgIAsuyAMDzPLw4tcWNMNi2zRjzfZ9zLoTAPnkcx5xzQojv+wik1joMQ845Y8yyLGOM7/uJRMLzvCiKKpUKtmZHzWKdAIR6ZOQLT6irq0trTSnF9YU5MpPJzJo1ixACFEq9g6QUMmMDSM1pQE3LqVOgIW0cKAF0vHckBs1V5MSl8+fPrRc6RYZ0cLRvcH85DCdOWJhuPgfodKBJYnTGdfKFkqHcckQUBpRGruOC/PiJFex24XWM43h4eBivjhDC931jDD6FCxnjhxCiUqlEUYRLu1Qq4XWs4YHAO45TG0tAALq7u7PZrOM4uVwOH3Qcx7KsUqkUBIGUMoqidDqNnhdFkVLKdV2UR9DhfN+P49hxHEJIGIaYqhA5KaWUEt0mjmNKaRAExhitted5CHMcx3jOJwohLl7E8vjx47VHEEIpZWNj48yZM/FBP1dgsbKBETAxg0iY5hmnQBoCBscKcLivn1sJSwczG1NntJC0GWTxkcHejmJpOFM/NdO8GKyZILPAkxD7BLTFheslASCTyQCFkl8RjH1sKZZKpWprHycKHMcJw7BcLhNCcNnif2vxgzGWSqUAYHBwsKGhIZFIIGye58VxjI5SKpU8z7Ntu1wue54XBEGxWJw0aVIcxwBQV1eHR8PAaFmW53l4cFwHtm3jr3ioVColpSyXy5TSZDKJ8FiWhZETDyWEwICMgxDGmDiO8aMJIYIgYIx5nofr44QgHP0LpbRQKODh8O8hhBMnTkyl03EUgQESxLakggkA4hulPFE/pRUsCAjs7xkaimLlQkpG58xoawTIkqFy3zuloYOe3dzUejZ4M01Ur8FmmtncHRrMpdPZLZs3r37lNc/zvnTH7bUL9FF79tlnt23bxhhzXTeVSvX29rquG4bhbbfdNmHCBM55FEV4QXEJG2N+/OMfDw4O1tXVhWHoeV6hUCgWixdeeOFFF12ERTCmMc55X1/fI4884vt+NputVCqWZdXX11955ZX/9m//hoEaExhjLI7j6hgRpVJK13WHhobQY9Lp9G233YYLBQCwKvM8r6en580331yzZk1vb++hQ4eEEPPmzZs8efKUKVPmz58/ffr0ZDKJawiDAeJ6EoEU/4ewEVotE2uHwBNta2vDhSY0CEK5IdRQTXnFSJ72oKVeAQQA7/UORZRLGTW57KzJTR4Mc+jv7t1rWZBuOcNOzVY6HRmbUzsKY9dxkm7aGPOT//Xg08+sCIIola378t13xGH8sc2Bhx9+eNeuXVrrnp4eIUQURbNmzYqi6I/+6I/wguqRbInRLJ/Pv/jiix0dHd3d3QBg23ZTU5NSavr06ejBSikMxUqpfD6/YsWKwcHB3t7eSqXS0tJy/vnnt7a2/vznP89ms93d3YVCAQDq6+uHhoYAwLKsKIrQpeI4bm5uzuVyDQ0NixcvPuecc7Cedl1XKbVq1aof/ehHq1atSiaTS5cuPfvss8MwHBgYWL16dU9Pz4QJEyZNmvSVr3zl9ttvx3QYBAHyEkJOtCZ9P3Pie5B31bweL01ra6vRWikFGhijmoDUQBgJdGxlU1CX8A2EAP35MrMdGkezJ9RNTYADubDQFYSFptbpbnYeqEmhooQaQ6Qh4Puxm3AP7N+/devW1gnNnV09L7/88h133PFJJ/qrX/0qjuNdu3b95V/+5dDQ0O233/7d7363WCxivxCrW0zneP6WZT300EPZbPYHP/jBj3/841Qq9ad/+qf33HOPlDKRSMRxnEwmtdZDQ0NKqba2tqeeekprfdNNNy1YsOAHP/gBdrz37t1LKb3vvvseffTRhoaGBx98cOrUqVrrYrEohLBtm3NeqVRs2/7BD37w8ssvNzY2AkA+n8ci+4033vj617++b9++22677R//8R+bmppqZ3vo0KFf/vKXv/jFL9rb2/v6+owxURQZY2zbdl0Xec2JQljTZUZDWPNCfDadTlcqFa01jngpqqXWjPIYfJGwwYUIoAhQiqQQCaKi01rq6sHYUMwN9zGWclOTQTTHsQvEaAKglBBWHBkwsGnTlkOHDrW1tdXXZTaue+vQ/n2nTp/6sSfqeZ5lWQ0NDcVicXBwkDGWyWSQfSAjxQSJWAJANpvNZrMAsHDhwvr6+oGBgbffftuyrJpq4fs+IaShoQEvH7Zlfv/7399333319fUIDCKNeS6bzZ566qkzZ85EDOI4FkIgDeGc19XV1SKqbduJRKJUKj311FMdHR3Lly9/+OGHhRCYd0ulUqVSmTFjxte+9rXOzs4nn3xydK0CVe6tTxxCWou8xhglZUtLC9YolUoFRjiblBKJMgigLjeChLHklkUYSWWSACAcyAdQDuOgUso4dP70+gxExeHeY0ePt0xaBKnZoIQCYnGXG0EpVSp2XF4JKv/zwR8tveDiP775j1QU9nR3PvarX9q2jZ/Btm08E6RtUko8H0JIrfbC1Yb/xY+NsRE/ERa4V1555dSpUxOJxFtvvfXWW29xzqWUhULBdd0oinzfR6IfhuG//uu/nn322cuXL/d9vzb0hewxiiKM3gBQKBSQ5RYKhTAMoyjSWtfX10+ZMgXnVDAk9vX1rVu3LpVKzZ07lxBSLpexec4Ya25uBoA4ju+8804ktDUvwgSPznqiEOK1wMvBGGttbcW8LYSoMdUoiqpIU7CziYgqxQgASK2ooEAgMuAriI1mRja4ol4AhaIKg3SyOdlwOoiJwDyttYyUYBanIo5jZWTH3j3vvXt02bVfWLbs6kTSy2YSb7+z+fjx43hxsYTAIvrEP0/NoihCTu953iWXXIIhd82aNQDAGEMPw0sWBEE6nd69e/fBgwcvvvhiZHB4BAzOQRC4rosiQKVSEUKg0+DbcYXde++9zz333KxZszC0Wpbl+35/fz/W8li/I9hYV6B/z5kz56677poxYwYhBMtEJFknDWGtugdCZs6c6bqu1tpxnFpSLJfLlDGE0GmuC7nRDJTRWsWCMWAQGyiGECvJTXhKQ7KBgizlo3Lc2DgN7DatUjHeQEjhjj4CRHNmPfmbZzSoq6++8twLzps/f64teMeu3Rs2bMAzC8MQo/rowH7iFsexbdu4tJcvX55MJgkhL7/8cldXlxACrykuU8Ry5cqVxWLxhhtuqNXsyGwty0L8EGkhBAKAvx47duw73/nO6tWrs9ns7Nmzh4eHgyBIJBK5XC6TyUyaNCmKotdeey0MQ8dx0DeQQKEgkMlkHnnkkWXLlmGwQeSkPLm9HBSJNYzQmcmTJ9fV1WE1UyNFg4ODtRdAU1YnRQRagwE9ss2Qgh+DlLEL8bSmTBIgLpd1zOsapihph7HQmhPKKeVRBGHkCyGGhwtPPPbEJZdcMrGtFUBff+P1MlZhGK968SUAwEoZr+aJZ4UPGTqQlPKMM85YunRpGIZHjx5966230LfQF7EwKBaLTz/99Nlnn71w4UJ8CsktYkkIqVQqvu8nk0ms6hBUANi+fftPfvKTnTt3AkChUMhkMrh6HMdpampqbGzEKbJvfvObWL8TQjDAUEoty+KcYy1Rgw1j4cl54eg3xFGUyWSmTp2K1LZGSru6usIgqEKY9byWbEyV1lIQkEEIAAxAGm3iIEnU1IaUBWBiyXmauE1SEyYsAjajDmE0iHyltW17L7/0SnfX8dtu/xPLtSph+cqrrmma0KoVvPnmm/v378dyOI5jVAtPnGHXzLIsTBC4um+55RZkPStWrMBghQjh5V67dm1HR8fdd9+NmRLfW3M4rXU6nW5ubt67d+/x48eHh4eLxWIQBL29vblcrrW1FZErl8ulUsmyrFwu57qubds333yz4zidnZ2//OUvly1b9sADD3R0dKRSKWwh1EpMzBcAgPOenPPe3t6TgBANRqp4zvmCBQtqEi0ACCGOHj2ay+UYY6AVpO2m6W2SagXG5qI0NAwRMABCiFZxipGJGU4goJS6iSaAhJIENIkiZQwBarjFE8m0AfLwww/POX325z//eUaYpqKlte2Siy+LInmsq3P16tXIMEfn6ZOFkI0YVmkXXXTRtGnTCCFvvfXWzp07ER4kDnEcP/PMM6eccsoXvvCFMAyRGRpjkNFYloVCye7du7/0pS997nOfO/fcc2fMmDFv3rxFixZ973vf6+vr831fStna2uo4Tq1siKLoy1/+8l133YUF4nvvvffDH/7w4osvvuSSS+6///5XX311aGjIsiw8PpIg9GAhBPbbT9A4puWaIkMIWbJkyaOPPoprBHlNd3d3Lpdrbm42WpIka50x5Rg/CpG2GB3sH4SKYsAsRohSSWbqOIRhQXCeSDWD4gw0kVrFsWXxUEvHFQpg+/bdGze89Xd/9626bF2opSGWAnbd9ctXrlxZ9isrV6688cYbm5qacIkhKz5ZCDHVBUGA7KOhoWHZsmU//elPC4XCypUr58+fj1FaCNHe3v7666/feuutmUwG5daa0F+L4aiRXnjhhbWyBAW5crnc39+fTqeR4GCwReVPSmnb9ve+971FixY99thjW7ZsAYBSqbRx48ZNmzal0+l58+YtWLDgb/7mb7CGQYm8psmdeLPiAxBieJk1a1YqlcL8hws5n8+jRhyBtjxITMpIS0GoKdBKvgQVzYEJBgwil0gPwA+VxRPCzcZ+bLsJIw3jinNS8kPL8DjSb659PQgqF19yIQD09/YlUmnN9IIFC9ra2nr7+9rb2wcGBhobG1EdRrpxshDich5pSvAoii677LKf/exnlmWtXbv27/7u77D8AIDt27cfO3Zs2bJlOO6Mjjha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v79/z549t912W00tQwIipSwWi8YYPEkMzul0Gpcg1uwwMomDr8fMN2HCBCEEMi/LssrlchzHhw8ffuihh9rb25FkAIDrum1tbYSQl1566YknnshkMnfdddfcuXNrc2+1FXmCVqXjeO0QrSAIbNuOgjCTzd56660vvPBCsVjMZDJCiE2bNrW3t0+YMMFQIiaKGVcu3t/e0aisoQPvQg6mN3NPQxQEJO3gBC01EIWhxe0tW7Y8/vjj27Zte/fdd995553bb7/9zjvvXLx4Ma7r2qI7evTof//v/10IUSwWpZTr1q370pe+VFdX941vfOPZZ589dOhQPp/v6enhnD/88MO///3ve3t7Uf3K5XI4XIRH6+zsRFyxOqxpNBjML7jgAsdxisViOp2+/PLLpZTJZBKBwdGHVCpFKd24ceMjjzxi2/arr74qpTx8+PC3vvWtQ4cOVSqVtrY2TMlYgeC+vuPHjyP1w3VGKZ0yZcq77767YsWKvXv3Xn755fPnz29tba1UKseOHXv55Zdff/11Y8wNN9zwjW98w7bt4eHhVCpVLBYx3Z4EhDXejE1BHDnEgbBSsbhkyZJ77rnnX/7lX0qlUn19ved5//hPPzj/8+fXNWTBAD371MS8yaU1B3SR7PzVirn33XB6yynDA4PQnLUSQEJqCascB5RS3/e7uro458uWLcvlct3d3WTEcG1i/Vculw8fPsw5P+uss1DI7+zslFL6vr93797u7m6l1BVXXIGJSimF7hgEAUo5qVSqUqmgwDR9+nSkM5jL0avwL06fPv3uu+/etm3bvHnzTj31VCwBsVTAnUA4GEgpxVGPqVOnzp49Gxu/p59+OromTpth8EgkEkEQTJs2Dcef6uvrMbw/+OCD7e3t69ev37lz57PPPvvzn/88lUqh7NXY2HjLLbdcddVV119/fe0kcaLgZAMpQSLwcRG2etyBgYF777139erVra2tQRAMDAx9977vfOWv76kMlRu8Fnin/5m7/z4dc/uMSRf+w1f315V25TuXzD/T0cCjcsqzS2U/mU5hlk4kEjWKiFII1ppaa1wio+uhGkGvVCoYRfHDf7TYh5EBEUznyAVyuRz2dzCEYg8SW0jpdBqn1EdPNUZRlEgkcDXjssC8hQn1o/wCKz/86/gp8vk8RnLEL5FI1Cp03/eDIEBRBic22tracOoQyxjf97GW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"

// Coleções
const clientesCol = collection(db, 'clientes');
const produtosCol = collection(db, 'produtos');
const vendasCol = collection(db, 'vendas');
const orcamentosCol = collection(db, 'orcamentos');

let itensVendaAtual = [];
let totalVenda = 0;       // Total da venda
let descontoPercentualVenda = 0; 
let descontoTotalVenda = 0;
let produtosMap = {}; // será carregado do Firestor
let fluxoCaixa = JSON.parse(localStorage.getItem("fluxoCaixa")) || [];

// =====================
// 🔹 Funções de interface
// =====================
function mostrarPaginaLogada(user) {
  if (!telaLogin || !appContainer || !header) {
    console.error("Elemento DOM não encontrado");
    return;
  }

  telaLogin.style.display = "none";
  appContainer.style.display = "block";
  header.style.display = "flex";
}

function mostrarLogin() {
  telaLogin.style.display = "block";
  app.style.display = "none";
  formLogin?.reset();
}

// =====================
// 🔹 Autenticação
// =====================
// ===== LOGIN =====
formLogin.addEventListener('submit', async (e) => {
  e.preventDefault(); // Evita reload da página
  const email = document.getElementById('emailLogin').value.trim();
  const senha = document.getElementById('senhaLogin').value.trim();

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, senha);
    const user = userCredential.user;
    userName.textContent = user.displayName || user.email;
    telaLogin.style.display = 'none';
    app.style.display = 'block';

    // Carregar dados das seções
    carregarClientesVenda();
    carregarProdutosVenda();
    carregarProdutosOrcamento();
    carregarFluxoCaixa();
    carregarTabelaPrecos();
  } catch (error) {
    alert('Email ou senha incorretos!');
    console.error(error);
  }
});

// ===== LOGOUT =====
btnLogout.addEventListener('click', async () => {
  await signOut(auth);
  app.style.display = 'none';
  telaLogin.style.display = 'block';
});

// ===== Verifica sessão =====
onAuthStateChanged(auth, (user) => {
  if (user) {
    userName.textContent = user.displayName || user.email;
    telaLogin.style.display = 'none';
    app.style.display = 'block';
    
    // Carregar dados
    carregarClientesVenda();
    carregarProdutosVenda();
    carregarProdutosOrcamento();
    carregarFluxoCaixa();
    carregarTabelaPrecos();
  } else {
    telaLogin.style.display = 'block';
    app.style.display = 'none';
  }
});

// =====================
// 🔹 Controle de seções
// =====================
function mostrarSecao(secaoId) {
  document.querySelectorAll(".secao").forEach(secao => secao.style.display = "none");

  const secao = document.getElementById(secaoId); // pega o elemento
  if (secao) {                                 // verifica se existe
    secao.style.display = "block";             // só aí atribui
  }

  switch (secaoId) {
  case "clientes":
    carregarClientes();
    break;
  case "estoque":
    carregarEstoque();
    break;
  case "vendas":
    carregarClientesVenda();
    carregarProdutosVenda();
    break;
  case "orcamentos":
    renderizarOrcamentos();
    break;
  case "registrosVendas":
    // ✅ aguarda o DOM atualizar antes de carregar
    setTimeout(() => carregarTabelaRegistrosVendas(), 110);
    break;
  case "precos":
    carregarTabelaPrecos();
    break;
  case "simulador":
    carregarSimuladorPrecosUnitarios();
    break;
  }
}

document.querySelectorAll("nav button").forEach(btn => {
  btn.addEventListener("click", () => mostrarSecao(btn.dataset.target));
});

async function adicionarLogo(doc, pdfWidth, y = 10, logoWidth = 40) {
  try {
    const imgProps = doc.getImageProperties(LOGO_BASE64);
    const logoHeight = (imgProps.height * logoWidth) / imgProps.width;
    const xPos = (pdfWidth - logoWidth) / 2;

    doc.addImage(LOGO_BASE64, "PNG", xPos, y, logoWidth, logoHeight);
  } catch (e) {
    console.error("Erro ao adicionar logo:", e);
  }
}

// ==========================
// 🔹 Clientes
// ==========================
async function carregarClientes() {
    const q = query(clientesCol, orderBy("nome")); // 🔹 Ordena pelo nome
    const snapshot = await getDocs(q);

    tabelaClientes.innerHTML = '';
    clienteSelect.innerHTML = '<option value="">Selecione o cliente</option>';

    if (!snapshot.empty) {
        snapshot.forEach(docSnap => {
            const cliente = docSnap.data() || {};
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${cliente.nome || ''}</td>
                <td>${cliente.telefone || ''}</td>
                <td>
                    <button onclick="editarCliente('${docSnap.id}', '${cliente.nome || ''}', '${cliente.telefone || ''}')">Editar</button>
                    <button onclick="excluirCliente('${docSnap.id}')">Excluir</button>
                </td>`;
            tabelaClientes.appendChild(tr);

            clienteSelect.innerHTML += `<option value="${docSnap.id}">${cliente.nome || ''}</option>`;
        });
    }
}

window.editarCliente = async (id, nome, telefone) => {
    const novoNome = await mostrarPrompt("Novo nome:", nome);
     if (novoNome !== null) {
    const novoTel = await mostrarPrompt("Novo telefone:", telefone);
     if (novoTel !== null) {
        await updateDoc(doc(db, "clientes", id), { nome: novoNome, telefone: novoTel });
        carregarClientes();
    }
}
}

window.excluirCliente = async (id) => {
    if (await mostrarConfirm("Deseja realmente excluir?")) {
    await deleteDoc(doc(db, "clientes", id));
    carregarClientes();
}
}

document.getElementById("btnCadastrarCliente")?.addEventListener("click", async () => {
    const nome = document.getElementById("nomeCliente").value.trim();
    const telefone = document.getElementById("telefoneCliente").value.trim();
    if (!nome) return mostrarModal("Nome é obrigatório");
    await addDoc(clientesCol, { nome, telefone });
    document.getElementById("nomeCliente").value = "";
    document.getElementById("telefoneCliente").value = "";
    carregarClientes();
});

// ==========================
// 🔹 Estoque / Produtos
// ==========================
async function carregarEstoque() {
    const q = query(produtosCol, orderBy("nome")); // 🔹 Ordena pelo nome
    const snapshot = await getDocs(q);

    tabelaEstoque.innerHTML = '';
    produtoSelect.innerHTML = '<option value="">Selecione o produto</option>';
    produtoSelectOrcamento.innerHTML = '<option value="">Selecione o produto</option>';
    produtosMap = {};

    if (!snapshot.empty) {
        snapshot.forEach(docSnap => {
            const produto = docSnap.data() || {};
            produtosMap[docSnap.id] = produto;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${produto.nome || ''}</td>
                <td>${produto.quantidade || 0}</td>
                <td>
                    <button onclick="editarProduto('${docSnap.id}', '${produto.nome || ''}', ${produto.quantidade || 0}, ${produto.preco || 0})">Editar</button>
                    <button onclick="excluirProduto('${docSnap.id}')">Excluir</button>
                </td>`;
            tabelaEstoque.appendChild(tr);

            produtoSelect.innerHTML += `<option value="${docSnap.id}">${produto.nome || ''}</option>`;
            produtoSelectOrcamento.innerHTML += `<option value="${docSnap.id}">${produto.nome || ''}</option>`;
        });
    }
}

// ===============================
// AO SELECIONAR PRODUTO OU TIPO DE PREÇO
// ===============================
function atualizarPrecoProduto() {
  const produtoId = produtoSelect.value;
  const tipo = tipoPrecoSelect.value;
  const produto = produtosMap[produtoId];

  if (!produto) {
    document.getElementById("precoSelecionado").value = '';
    return;
  }

  const precos = {
    preco: produto.preco || 0,
    estampaFrente: produto.estampaFrente || 0,
    estampaFrenteVerso: produto.estampaFrenteVerso || 0,
  };

  document.getElementById("precoSelecionado").value = precos[tipo] || 0;
}

produtoSelect.addEventListener("change", atualizarPrecoProduto);
tipoPrecoSelect.addEventListener("change", atualizarPrecoProduto);

window.editarProduto = async (id, nome, qtd, preco) => {
    const novoNome = await mostrarPrompt("Nome:", nome);
    const novaQtd = parseInt(await mostrarPrompt("Quantidade:", qtd));
    const novoPreco = parseFloat(await mostrarPrompt("Preço:", preco));
    if (novoNome) {
        await updateDoc(doc(db, "produtos", id), { nome: novoNome, quantidade: novaQtd, preco: novoPreco });
        carregarEstoque();
    }
}

window.excluirProduto = async (id) => {
    if (await mostrarConfirm("Excluir produto?")) {
        await deleteDoc(doc(db, "produtos", id));
        carregarEstoque();
    }
}

document.getElementById("btnCadastrarProduto")?.addEventListener("click", async () => {
    const nome = document.getElementById("nomeProduto").value.trim();
    const quantidade = parseInt(document.getElementById("quantidadeProduto").value) || 0;
    if (!nome) return mostrarModal("Nome é obrigatório");
    await addDoc(produtosCol, { nome, quantidade });
    document.getElementById("nomeProduto").value = "";
    document.getElementById("quantidadeProduto").value = "";
    carregarEstoque();
});

document.addEventListener("DOMContentLoaded", () => {
  const btnAdicionarItemVenda = document.getElementById("btnAdicionarItemVenda");
  btnAdicionarItemVenda.addEventListener("click", adicionarItemVenda);

  const btnDescontoItem = document.getElementById("btnDescontoItem");
  btnDescontoItem?.addEventListener("click", aplicarDescontoItemPrompt);

  const btnDescontoVenda = document.getElementById("btnDescontoVenda");
  btnDescontoVenda?.addEventListener("click", aplicarDescontoVendaPrompt);

  const btnFinalizarVenda = document.getElementById("btnFinalizarVenda");
  btnFinalizarVenda?.addEventListener("click", finalizarVenda);
});

// ==========================
// 🔹 Adicionar Item à Venda
// ==========================
function adicionarItemVenda() {
  const produtoSelect = document.getElementById("produtoSelect");
  const tipoPrecoSelect = document.getElementById("tipoPrecoSelect");
  const quantidadeInput = document.getElementById("quantidadeVenda");
  const precoInput = document.getElementById("precoSelecionado");

  if (!produtoSelect || !tipoPrecoSelect || !quantidadeInput || !precoInput) {
    console.error("Algum elemento do formulário não foi encontrado!");
    return;
  }

  const produtoId = produtoSelect.value;
  const tipoPreco = tipoPrecoSelect.value;
  const quantidade = Number(quantidadeInput.value);
  const preco = Number(precoInput.value);

  if (!produtoId || quantidade <= 0 || preco <= 0) {
    mostrarModal("Preencha todos os campos corretamente!");
    return;
  }

  const produtoNome = produtoSelect.options[produtoSelect.selectedIndex].text;

  itensVendaAtual.push({
  produtoId,
  nome: produtoNome,
  quantidade,
  valorUnitario: preco,
  desconto: 0,          
  total: quantidade * preco
});

  atualizarTabelaItensVenda();
  atualizarTotalVenda();
}

// ==========================
// 🔹 Desconto por Item
// ==========================
async function promptDescontoItem(indexItem) {
  const item = itensVendaAtual[indexItem];
  if (!item) return;

  const tipo = await mostrarPrompt(
    `Escolher tipo de desconto para ${item.nome}:\n1 - Valor (R$)\n2 - Percentual (%)`,
    "1"
  );

  if (tipo !== "1" && tipo !== "2") {
    mostrarModal("Tipo de desconto inválido!");
    return;
  }

  if (tipo === "1") {
    const descStr = await mostrarPrompt(`Digite o valor do desconto (R$) para ${item.nome}:`, "0");
    const valor = parseFloat(descStr);
    if (isNaN(valor) || valor < 0) {
      mostrarModal("Desconto inválido!");
      return;
    }
    item.desconto = valor;
  } else {
    const percStr = await mostrarPrompt(`Digite o percentual de desconto (%) para ${item.nome}:`, "0");
    const perc = parseFloat(percStr);
    if (isNaN(perc) || perc < 0 || perc > 100) {
      mostrarModal("Percentual inválido!");
      return;
    }
    const subtotal = item.quantidade * item.valorUnitario;
    item.desconto = (subtotal * perc) / 100;
  }

  item.total = Math.max(0, (item.quantidade * item.valorUnitario) - item.desconto);

  atualizarTabelaItensVenda();
  atualizarTotalVenda();
}

// Botão genérico para aplicar desconto por item
async function aplicarDescontoItemPrompt() {
  if (itensVendaAtual.length === 0) {
    mostrarModal("Nenhum item na venda para aplicar desconto.");
    return;
  }

  const listaProdutos = itensVendaAtual
    .map((item, index) => `${index + 1} - ${item.nome}`)
    .join("\n");

  const indiceStr = await mostrarPrompt(`Escolha o número do item:\n${listaProdutos}`);
  const indice = parseInt(indiceStr) - 1;

  if (isNaN(indice) || indice < 0 || indice >= itensVendaAtual.length) {
    mostrarModal("Item inválido!");
    return;
  }

  promptDescontoItem(indice);
}

// ==========================
// 🔹 Desconto Total da Venda
// ==========================
async function aplicarDescontoVendaPrompt() {
  if (itensVendaAtual.length === 0) {
    mostrarModal("Nenhum item na venda para aplicar desconto.");
    return;
  }

  const totalAtual = itensVendaAtual.reduce((soma, item) => soma + item.total, 0);

  const tipo = await mostrarPrompt(
    `Total atual: R$ ${totalAtual.toFixed(2)}\n1 - Valor (R$)\n2 - Percentual (%)`,
    "1"
  );

  if (tipo !== "1" && tipo !== "2") {
    mostrarModal("Tipo inválido!");
    return;
  }

  if (tipo === "1") {
    const descStr = await mostrarPrompt(`Desconto geral (R$):`, "0");
    const valor = parseFloat(descStr);
    if (isNaN(valor) || valor < 0 || valor > totalAtual) {
      mostrarModal("Desconto inválido!");
      return;
    }
    descontoTotalVenda = valor;
    descontoPercentualVenda = 0;
  } else {
    const percStr = await mostrarPrompt(`Desconto geral (%):`, "0");
    const perc = parseFloat(percStr);
    if (isNaN(perc) || perc < 0 || perc > 100) {
      mostrarModal("Percentual inválido!");
      return;
    }
    descontoPercentualVenda = perc;
    descontoTotalVenda = (totalAtual * perc) / 100;
  }

  atualizarTotalVenda();
}

// ==========================
// 🔹 Atualizar Tabela e Total
// ==========================
function atualizarTabelaItensVenda() {
  const tbody = document.querySelector("#tabelaItensVenda tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  itensVendaAtual.forEach((item, index) => {
    const quantidade = Number(item.quantidade) || 0;
    const valorUnitario = Number(item.valorUnitario) || 0;
    const desconto = Number(item.desconto) || 0;

    const subtotal = quantidade * valorUnitario;
    const total = subtotal - desconto;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.nome}</td>
      <td>${quantidade}</td>
      <td>R$ ${valorUnitario.toFixed(2)}</td>
      <td>R$ ${desconto.toFixed(2)}</td>
      <td>R$ ${subtotal.toFixed(2)}</td>
      <td>R$ ${total.toFixed(2)}</td>
      <td>
        <button onclick="removerItemVenda(${index})">Excluir</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function atualizarTotalVenda() {
  let somaItens = itensVendaAtual.reduce((acc, item) => acc + item.total, 0);
  const totalComDesconto = Math.max(0, somaItens - (descontoTotalVenda || 0));
  document.getElementById("totalVenda").textContent = totalComDesconto.toFixed(2);
}

// ==========================
// 🔹 Remover Item
// ==========================
function removerItemVenda(index) {
  itensVendaAtual.splice(index, 1);
  atualizarTabelaItensVenda();
  atualizarTotalVenda();
}

window.removerItemVenda = removerItemVenda;


// ==========================
// 🔹 Finalizar Venda
// ==========================
async function finalizarVenda() {
  const btnFinalizarVenda = document.getElementById("btnFinalizarVenda");
  try {
    if (btnFinalizarVenda.disabled) return;
    btnFinalizarVenda.disabled = true;

    const tipoPagamentoSelect = document.getElementById("tipoPagamento");
    const clienteSelect = document.getElementById("clienteSelect");

    if (!clienteSelect || !tipoPagamentoSelect) {
      mostrarModal("Selecione cliente e tipo de pagamento.");
      btnFinalizarVenda.disabled = false;
      return;
    }

    if (itensVendaAtual.length === 0) {
      mostrarModal("Nenhum item adicionado à venda.");
      btnFinalizarVenda.disabled = false;
      return;
    }

    const tipoPagamento = tipoPagamentoSelect.value;
    const clienteId = clienteSelect.value;
    const clienteNome = clienteSelect.options[clienteSelect.selectedIndex].text;

    // Soma dos subtotais (sem desconto)
    const somaSubtotais = itensVendaAtual.reduce(
      (acc, item) => acc + (item.quantidade * item.valorUnitario),
      0
    );

    // Prepara itens para salvar, aplicando desconto proporcional
    const itensParaSalvar = itensVendaAtual.map(item => {
      const descontoProporcional = descontoTotalVenda
        ? (item.total / somaSubtotais) * descontoTotalVenda
        : 0;

      const totalItem = Math.max(0, item.total - descontoProporcional);

      return {
        produtoId: item.produtoId,
        nome: item.nome,
        quantidade: item.quantidade,
        valorUnitario: item.valorUnitario,
        subtotal: item.quantidade * item.valorUnitario,
        desconto: item.desconto + descontoProporcional,
        totalItem
      };
    });

    const totalParaSalvar = itensParaSalvar.reduce((acc, item) => acc + item.totalItem, 0);

    // --------------------- SALVA VENDA ---------------------
    const venda = {
      clienteId,
      clienteNome,
      tipoPagamento,
      itens: itensParaSalvar,
      total: totalParaSalvar,
      descontoVenda: descontoTotalVenda || 0,
      data: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, "vendas"), venda);

    // --------------------- ATUALIZA ESTOQUE ---------------------
    for (const item of itensParaSalvar) {
      const produtoRef = doc(db, "produtos", item.produtoId);
      const produtoSnap = await getDoc(produtoRef);
      if (produtoSnap.exists()) {
        const produto = produtoSnap.data();
        const novaQtd = (produto.quantidade || 0) - item.quantidade;
        await updateDoc(produtoRef, { quantidade: novaQtd });
      }
    }

    // --------------------- REGISTRA NO FLUXO DE CAIXA ---------------------
    await salvarMovimentoFluxoCaixa({
      tipo: "entrada",
      descricao: `Venda - ${clienteNome} (${tipoPagamento})`,
      valor: totalParaSalvar,
      data: new Date().toISOString().split("T")[0],
      idVenda: docRef.id
    });

    carregarFluxoCaixa();

    // --------------------- GERAR PDF ---------------------
    gerarPdfVendaPremium({
      id: docRef.id,
      clienteNome,
      tipoPagamento,
      itens: itensParaSalvar,
      total: totalParaSalvar,
      data: new Date()
    });

    mostrarModal(`✅ Venda registrada! Total: R$ ${totalParaSalvar.toFixed(2)}`);

    await carregarTabelaRegistrosVendas();

    // --------------------- LIMPA TELA ---------------------
    limparTelaVenda();

  } catch (error) {
    console.error("Erro ao registrar venda:", error);
    mostrarModal("Erro ao registrar venda: " + error.message);
  } finally {
    btnFinalizarVenda.disabled = false;
  }
}

// ==========================
// 🔹 Limpar Tela
// ==========================
function limparTelaVenda() {
  itensVendaAtual = [];
  descontoTotalVenda = 0;
  descontoPercentualVenda = 0;

  const campos = ["clienteSelect", "produtoSelect", "tipoPrecoSelect", "precoSelecionado", "quantidadeVenda", "tipoPagamento"];
  campos.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  const tbody = document.querySelector("#tabelaItensVenda tbody");
  if (tbody) tbody.innerHTML = "";

  document.getElementById("totalVenda").textContent = "0.00";
}

// ==========================
// 🔹 PDF da Venda (Itens com desconto)
// ==========================
async function gerarPdfVendaPremium(venda) {
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pdfWidth = doc.internal.pageSize.getWidth();
    const pdfHeight = doc.internal.pageSize.getHeight();

    await adicionarLogo(doc, pdfWidth, 10, 40);

    // Cabeçalho
    doc.setFontSize(16);
    doc.setFont(undefined, "bold");
    doc.text("Recibo de venda", pdfWidth / 2, 55, { align: "center" });

    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.text(`Cliente: ${venda.clienteNome || "Não informado"}`, 8, 35);
    doc.text(`Pagamento: ${venda.tipoPagamento || "Não informado"}`, 8, 42);

    // Função auxiliar para calcular total do item
    function calcularTotalItem(item) {
      const preco = Number(item.valorUnitario || 0);
      const qtd = Number(item.quantidade || 0);
      const desconto = Number(item.desconto || 0);

      let total = preco * qtd;
      if (item.tipoDesconto === "percent") total *= 1 - desconto / 100;
      else total -= desconto;

      return Math.max(0, total);
    }

    // Linhas da tabela
    const rows = venda.itens.map(item => {
      const totalItem = calcularTotalItem(item);
      return [
        item.nome,
        item.quantidade,
        Number(item.valorUnitario || 0).toFixed(2),
        item.tipoDesconto === "percent" ? `${item.desconto}%` : Number(item.desconto || 0).toFixed(2),
        totalItem.toFixed(2)
      ];
    });

    doc.autoTable({
      startY: 70,
      head: [["Produto", "Qtde", "Valor Unitário", "Desconto", "Total"]],
      body: rows,
      styles: { fontSize: 10 },
      columnStyles: { 1: { halign: "center" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
      headStyles: { fillColor: [220, 220, 220] }
    });

    // Total geral
    const finalY = doc.lastAutoTable.finalY + 10;
    const totalVenda = venda.total ?? venda.itens.reduce((acc, item) => acc + calcularTotalItem(item), 0);
    doc.setFont(undefined, "bold");
    doc.setFontSize(12);
    doc.text(`TOTAL DA VENDA: R$ ${totalVenda.toFixed(2)}`, pdfWidth - 8, finalY, { align: "right" });

    // Rodapé
    doc.setFontSize(10);
    doc.setFont(undefined, "italic");
    doc.text("Obrigado pela sua compra!", pdfWidth / 2, pdfHeight - 10, { align: "center" });

    // Salvar PDF
    const safeName = (venda.clienteNome || "cliente").replace(/[/\\?%*:|"<>]/g, "_");
    doc.save(`venda_${safeName}.pdf`);
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    mostrarModal("Erro ao gerar PDF!");
  }
}

// ===============================
// CARREGAR REGISTROS DE VENDAS
// ===============================
async function carregarTabelaRegistrosVendas() {
  const tabela = document
    .getElementById("tabelaRegistrosVendas")
    ?.querySelector("tbody");

  const totalGeralSpan = document.getElementById("totalGeralRegistros");

  if (!tabela || !totalGeralSpan) return;

  tabela.innerHTML = "";
  let totalGeral = 0;

  const vendasSnapshot = await getDocs(collection(db, "vendas"));

  vendasSnapshot.forEach((docSnap) => {
    const venda = docSnap.data();
    const id = docSnap.id;

    // ---------------- DATA ----------------
    let dataFormatada = "-";
    if (venda.data) {
      dataFormatada = venda.data.seconds
        ? new Date(venda.data.seconds * 1000).toLocaleDateString("pt-BR")
        : new Date(venda.data).toLocaleDateString("pt-BR");
    }

    const itens = venda.itens || [];
    const totalVenda = venda.total || 0;
    totalGeral += totalVenda;

    // ===============================
    // 1️⃣ LINHA PRINCIPAL DA VENDA
    // ===============================
    const rowVenda = document.createElement("tr");
    rowVenda.classList.add("linha-venda");
    rowVenda.style.cursor = "pointer";

    rowVenda.onclick = () => toggleItensVenda(id);

    rowVenda.innerHTML = `
      <td>${dataFormatada}</td>
      <td>${venda.clienteNome || "-"}</td>
      <td colspan="4"><strong>Clique para ver itens</strong></td>
      <td>R$ ${totalVenda.toFixed(2)}</td>
      <td>R$ ${totalVenda.toFixed(2)}</td>
      <td>${venda.tipoPagamento || "-"}</td>
      <td>
        <button class="btnExcluir"
          onclick="event.stopPropagation(); abrirModalExcluir('${id}')">🗑️</button>
        <button class="btnPDF"
          onclick="event.stopPropagation(); gerarPdfVenda('${id}')">📄</button>
      </td>
    `;

    tabela.appendChild(rowVenda);

    // ===============================
    // 2️⃣ ITENS DA VENDA (OCULTOS)
    // ===============================
    itens.forEach((item) => {
      const qtd = item.quantidade || 0;
      const vUnit = item.valorUnitario || 0;
      const desconto = item.desconto || 0;
      const subtotal = qtd * vUnit;
      const totalItem =
        item.totalItem ?? subtotal - desconto;

      const rowItem = document.createElement("tr");
      rowItem.classList.add(`itens-${id}`);
      rowItem.style.display = "none";
      rowItem.style.background = "#fafafa";

      rowItem.innerHTML = `
        <td></td>
        <td></td>
        <td>${item.nome}</td>
        <td>${qtd} un</td>
        <td>R$ ${vUnit.toFixed(2)}</td>
        <td>R$ ${desconto.toFixed(2)}</td>
        <td>R$ ${subtotal.toFixed(2)}</td>
        <td>R$ ${totalItem.toFixed(2)}</td>
        <td></td>
        <td></td>
      `;

      tabela.appendChild(rowItem);
    });
  });

  totalGeralSpan.textContent = `R$ ${totalGeral.toFixed(2)}`;
}

function toggleItensVenda(idVenda) {
  const linhas = document.querySelectorAll(`.itens-${idVenda}`);
  if (!linhas.length) return;

  const mostrar = linhas[0].style.display === "none";

  linhas.forEach((linha) => {
    linha.style.display = mostrar ? "table-row" : "none";
  });
}

window.toggleItensVenda = toggleItensVenda;


// --- Função para excluir venda ---
async function abrirModalExcluir(idVenda) {
  try {
    const confirmar = confirm("Deseja realmente excluir esta venda?");
    if (!confirmar) return;

    const vendaRef = doc(db, "vendas", idVenda);
    const vendaSnap = await getDoc(vendaRef);

    if (vendaSnap.exists()) {
      const venda = vendaSnap.data();

      // 🔹 Devolve itens ao estoque
      for (const item of venda.itens || []) {
        if (!item.produtoId) continue;

        const produtoRef = doc(db, "produtos", item.produtoId);
        const produtoSnap = await getDoc(produtoRef);

        if (produtoSnap.exists()) {
          const produto = produtoSnap.data();
          const novaQtd = (produto.quantidade || 0) + (item.quantidade || 0);
          await updateDoc(produtoRef, { quantidade: novaQtd });
        }
      }
    }

    // 🔹 Exclui a venda
    await deleteDoc(vendaRef);

    // 🔥 REMOVE A VENDA DO FLUXO DE CAIXA
    removerVendaDoFluxoCaixa(idVenda);

    mostrarModal("Venda excluída e estoque atualizado!");
    carregarTabelaRegistrosVendas();
    carregarEstoque();
  } catch (error) {
    console.error("Erro ao excluir venda:", error);
    mostrarModal("Erro ao excluir venda. Verifique o console.");
  }
}

window.abrirModalExcluir = abrirModalExcluir;

async function gerarPdfVenda(idVenda) {
  try {
    const vendaRef = doc(db, "vendas", idVenda);
    const vendaSnap = await getDoc(vendaRef);

    if (!vendaSnap.exists()) return mostrarModal("Venda não encontrada!");

    const venda = vendaSnap.data();
    await gerarPdfVendaPremium({
      id: idVenda,
      clienteNome: venda.clienteNome,
      tipoPagamento: venda.tipoPagamento,
      itens: venda.itens || [],
      total: venda.total || 0,
      data: venda.data?.seconds ? new Date(venda.data.seconds * 1000) : new Date()
    });
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    mostrarModal("Erro ao gerar PDF da venda.");
  }
}
window.gerarPdfVenda = gerarPdfVenda;

// --- Função para abrir modal ou aplicar desconto (versão funcional) ---
window.abrirModalDesconto = async function (idVenda) {
  const valorDesconto = parseFloat(await mostrarPrompt("Digite o valor do desconto em R$:"));
  if (isNaN(valorDesconto) || valorDesconto <= 0) {
    mostrarModal("Valor inválido!");
    return;
  }

  try {
    const vendaRef = doc(db, "vendas", idVenda);
    const vendaSnap = await getDoc(vendaRef);

    if (!vendaSnap.exists()) return mostrarModal("Venda não encontrada!");

    const venda = vendaSnap.data();
    const totalAtual = venda.total || 0;
    const novoTotal = Math.max(0, totalAtual - valorDesconto);

    await updateDoc(vendaRef, {
      descontoVenda: valorDesconto,
      totalComDesconto: novoTotal
    });

    mostrarModal(`✅ Desconto de R$ ${valorDesconto.toFixed(2)} aplicado!`);
    carregarTabelaRegistrosVendas();
  } catch (error) {
    console.error("Erro ao aplicar desconto:", error);
    mostrarModal("Erro ao aplicar desconto!");
  }
};

window.abrirModalDesconto = abrirModalDesconto;

function mostrarModal(mensagem) {
  const modal = document.getElementById("modalAlerta");
  const modalMensagem = document.getElementById("modalMensagem");
  const modalFechar = document.getElementById("modalFechar");

  modalMensagem.textContent = mensagem;
  modal.style.display = "block";

  modalFechar.onclick = () => modal.style.display = "none";
  window.onclick = (event) => {
    if (event.target == modal) modal.style.display = "none";
  };
}

function mostrarPrompt(mensagem, valorPadrao = "") {
  return new Promise((resolve) => {
    const modal = document.getElementById("modalPrompt");
    const mensagemEl = document.getElementById("modalPromptMensagem");
    const inputEl = document.getElementById("modalPromptInput");
    const btnOk = document.getElementById("modalPromptOk");
    const btnCancelar = document.getElementById("modalPromptCancelar");
    const fechar = document.getElementById("modalPromptFechar");

    mensagemEl.textContent = mensagem;
    inputEl.value = valorPadrao;
    modal.style.display = "block";

    const fecharModal = () => {
      modal.style.display = "none";
    };

    btnOk.onclick = () => {
      fecharModal();
      resolve(inputEl.value);
    };
    btnCancelar.onclick = () => {
      fecharModal();
      resolve(null);
    };
    fechar.onclick = () => {
      fecharModal();
      resolve(null);
    };
    window.onclick = (event) => {
      if (event.target == modal) fecharModal();
    };
  });
}

function mostrarConfirm(mensagem) {
  return new Promise((resolve) => {
    const modal = document.getElementById("modalConfirm");
    const mensagemEl = document.getElementById("modalConfirmMensagem");
    const btnSim = document.getElementById("modalConfirmSim");
    const btnNao = document.getElementById("modalConfirmNao");

    mensagemEl.textContent = mensagem;
    modal.style.display = "block";

    const fecharModal = () => {
      modal.style.display = "none";
      btnSim.onclick = null;
      btnNao.onclick = null;
      window.onclick = null;
    };

    btnSim.onclick = () => {
      fecharModal();
      resolve(true);
    };

    btnNao.onclick = () => {
      fecharModal();
      resolve(false);
    };

    window.onclick = (event) => {
      if (event.target === modal) {
        fecharModal();
        resolve(false);
      }
    };
  });
}

// ==========================
// 🔹 Orçamentos
// ==========================
let itensOrcamentoAtual = [];
let produtosCache = {}; // Armazena produtos do Firestore

// =======================
// CARREGAR PRODUTOS
// =======================
async function carregarProdutosOrcamento() {
  const select = document.getElementById("produtoSelectOrcamento");
  if (!select) return;

  select.innerHTML = "<option value=''>Selecione o produto</option>";

  try {
    const produtosSnapshot = await getDocs(collection(db, "produtos"));
    produtosSnapshot.forEach(docSnap => {
      const produto = docSnap.data();
      produtosCache[docSnap.id] = produto;

      const option = document.createElement("option");
      option.value = docSnap.id;
      option.textContent = produto.nome || "Produto sem nome";
      select.appendChild(option);
    });
  } catch (error) {
    console.error("Erro ao carregar produtos:", error);
  }
}

// =======================
// ATUALIZAR PREÇO AUTOMATICAMENTE
// =======================
function atualizarPrecoOrcamento() {
  const produtoId = document.getElementById("produtoSelectOrcamento").value;
  const tipoPreco = document.getElementById("tipoPrecoSelectOrcamento").value;
  const precoInput = document.getElementById("precoInputOrcamento");

  if (!produtoId || !tipoPreco) {
    precoInput.value = "";
    return;
  }

  const produto = produtosCache[produtoId];
  if (!produto) return;

  let preco = 0;

  const tipo = tipoPreco.trim().toLowerCase();
  switch (tipo) {
    case "frente":
    case "estampafrente":
      preco = Number(produto.estampaFrente || 0);
      break;
    case "frente e verso":
    case "estampafrenteverso":
      preco = Number(produto.estampaFrenteVerso || 0);
      break;
    default:
      preco = Number(produto.preco || produto.precoUnitario || 0);
      break;
  }

  precoInput.value = preco > 0 ? preco.toFixed(2) : "";
}

// =======================
// ADICIONAR PRODUTO AO ORÇAMENTO
// =======================
window.adicionarProdutoOrcamento = function () {
  const clienteNome = document.getElementById("clienteInputOrcamento").value.trim();
  const produtoId = document.getElementById("produtoSelectOrcamento").value;
  const tipoPreco = document.getElementById("tipoPrecoSelectOrcamento").value;
  const precoInput = document.getElementById("precoInputOrcamento");
  const quantidade = Number(document.getElementById("quantidadeOrcamento").value || 1);
  const descontoValor = Number(document.getElementById("descontoItemOrcamento").value || 0);
  const tipoDescontoItem = document.getElementById("tipoDescontoItem").value;

  atualizarPrecoOrcamento();
  const precoUnitario = Number(precoInput.value || 0);

  if (!clienteNome) return mostrarModal("Informe o nome do cliente!");
  if (!produtoId) return mostrarModal("Selecione um produto!");
  if (!tipoPreco) return mostrarModal("Selecione o tipo de preço!");
  if (precoUnitario <= 0) return mostrarModal("Preço inválido!");

  const existe = itensOrcamentoAtual.some(item =>
    item.produtoId === produtoId &&
    item.clienteNome === clienteNome &&
    item.tipoPreco === tipoPreco
  );
  if (existe) return mostrarModal("Este produto já foi adicionado para este cliente.");

  const produto = produtosCache[produtoId];
  const nomeProduto = produto?.nome || "Produto";

  itensOrcamentoAtual.push({
    produtoId,
    produtoNome: nomeProduto,
    preco: precoUnitario,
    quantidade,
    clienteNome,
    tipoPreco,
    descontoValor,
    tipoDescontoItem
  });

  renderizarOrcamentos();
  atualizarTotalGeral()
};

// =======================
// RENDERIZAR ORÇAMENTOS
// =======================
function renderizarOrcamentos() {
  const tabela = document.querySelector("#tabelaOrcamentos tbody");
  tabela.innerHTML = "";

  itensOrcamentoAtual.forEach((item, index) => {
    const preco = Number(item.preco);
    const qtd = Number(item.quantidade);
    const desconto = Number(item.descontoValor);

    const total = calcularTotalItem(item); // ✅ cálculo centralizado

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.produtoNome}</td>
      <td>${qtd}</td>
      <td>R$ ${preco.toFixed(2)}</td>
      <td>
        ${item.tipoDescontoItem === "percent"
          ? desconto + "%"
          : "R$ " + desconto.toFixed(2)}
      </td>
      <td>R$ ${total.toFixed(2)}</td>
      <td>
        <button class="btn-remover" onclick="removerItemOrcamento(${index})">
          Remover
        </button>
      </td>
    `;

    tabela.appendChild(tr);
  });

  atualizarTotalGeral();
}

function calcularTotalItem(item) {
  const preco = Number(item.preco) || 0;
  const qtd = Number(item.quantidade) || 0;
  const desconto = Number(item.descontoValor) || 0;

  let total = preco * qtd;

  if (item.tipoDescontoItem === "percent") {
    total *= (1 - desconto / 100);
  } else if (item.tipoDescontoItem === "valor") {
    total -= desconto;
  }

  return Math.max(0, total);
}

function atualizarTotalGeral() {
  const totalGeral = itensOrcamentoAtual.reduce(
    (acc, item) => acc + calcularTotalItem(item),
    0
  );

  document.getElementById("totalGeral").textContent =
    totalGeral.toFixed(2);
}

window.atualizarTotalGeral = atualizarTotalGeral

// =======================
// REMOVER ITEM
// =======================
window.removerItemOrcamento = (index) => {
  itensOrcamentoAtual.splice(index, 1);
  renderizarOrcamentos();
};

// Carrega produtos na inicialização
carregarProdutosOrcamento();

const btnAdd = document.getElementById("btnAdicionarProduto");
if (btnAdd && !btnAdd.dataset.listenerAttached) {
  btnAdd.addEventListener("click", adicionarProdutoOrcamento);
  btnAdd.dataset.listenerAttached = "true";
} 

// =======================
// GERAR PDF DO ORÇAMENTO
// =======================
window.gerarPdfOrcamento = async function () {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const pdfWidth = doc.internal.pageSize.getWidth();

  await adicionarLogo(doc, pdfWidth, 15, 40);

  const clienteNome = document.getElementById("clienteInputOrcamento").value.trim() || "Não informado";
  doc.text(`Cliente: ${clienteNome}`, 8, 35);
  doc.setFontSize(16);
  doc.text("ORÇAMENTO", pdfWidth / 2, 10, { align: "center" });

  // Linhas da tabela
  const rows = itensOrcamentoAtual.map(item => {
    const preco = Number(item.preco) || 0;
    const qtd = Number(item.quantidade) || 0;
    const desconto = Number(item.descontoValor) || 0;
    let total = preco * qtd;
    if (item.tipoDescontoItem === "percent") total *= (1 - desconto / 100);
    else if (item.tipoDescontoItem === "valor") total -= desconto;
    return [item.produtoNome, qtd, `R$ ${preco.toFixed(2)}`, item.tipoDescontoItem === "percent" ? `${desconto}%` : `R$ ${desconto.toFixed(2)}`, `R$ ${total.toFixed(2)}`];
  });

  doc.autoTable({ head: [['Produto', 'Qtd', 'Preço Unitário', 'Desconto', 'Total']], body: rows, startY: 60 });

  const subtotal = rows.reduce((acc, row) => acc + parseFloat(row[4].replace("R$ ", "")), 0);
  const y = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(14);
  doc.text(`TOTAL FINAL: R$ ${Math.max(0, subtotal).toFixed(2)}`, 14, y);

  doc.save("orcamento.pdf");
}

document.getElementById("produtoSelectOrcamento").addEventListener("change", atualizarPrecoOrcamento);
document.getElementById("tipoPrecoSelectOrcamento").addEventListener("change", atualizarPrecoOrcamento);
document.getElementById("btnGerarPDF").addEventListener("click", gerarPdfOrcamento);

// ==========================
// 🔹 CARREGAR TABELA DE PREÇOS
// ==========================
async function carregarTabelaPrecos() {
  console.log("carregarTabelaPrecos() iniciada");

  const tabela = document.querySelector("#tabelaPrecos tbody");
  tabela.innerHTML = "";

  try {
    const q = query(collection(db, "produtos"), orderBy("nome")); // 🔹 Ordena pelo nome
    const produtosSnapshot = await getDocs(q);
    console.log("Qtd de produtos:", produtosSnapshot.size);

    produtosSnapshot.forEach(docSnap => {
      const produto = docSnap.data();
      if (!produto || !produto.nome) return;

      const linha = document.createElement("tr");
      linha.innerHTML = `
        <td>${produto.nome || ""}</td>
        <td><input type="number" value="${produto.preco || 0}" step="0.01"></td>
        <td><input type="number" value="${produto.estampaFrente || 0}" step="0.01"></td>
        <td><input type="number" value="${produto.estampaFrenteVerso || 0}" step="0.01"></td>
      `;

      tabela.appendChild(linha);

      linha.querySelectorAll("input").forEach((input, index) => {
        input.addEventListener("change", async () => {
          const campos = ["preco", "estampaFrente", "estampaFrenteVerso"];
          const campo = campos[index];
          const novoValor = parseFloat(input.value) || 0;

          try {
            await updateDoc(doc(db, "produtos", docSnap.id), { [campo]: novoValor });
            console.log(`✅ ${campo} atualizado: R$ ${novoValor.toFixed(2)} (${produto.nome})`);
          } catch (erro) {
            console.error("❌ Erro ao atualizar preço:", erro);
            mostrarModal("Erro ao salvar o novo valor. Verifique sua conexão.");
          }
        });
      });
    });

    console.log("Tabela preenchida com sucesso!");
  } catch (erro) {
    console.error("❌ Erro ao carregar produtos:", erro);
  }
}

// exportar registros vendas
async function exportarPDFRegistros() {
  try {
    const vendasSnapshot = await getDocs(collection(db, "vendas"));
    if (vendasSnapshot.empty) return mostrarModal("Nenhuma venda encontrada.");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pdfWidth = doc.internal.pageSize.getWidth();

    await adicionarLogo(doc, pdfWidth, 10, 40);

    doc.setFontSize(16);
    doc.text("REGISTROS DE VENDAS", pdfWidth / 2, 60, { align: "center" });

    const cabecalho = [["Data", "Cliente", "Produto", "Qtde", "Unitário", "Desconto", "Total Antes", "Total Após", "Pagamento"]];
    const linhas = [];
    let totalGeral = 0;

    vendasSnapshot.forEach(vendaDoc => {
      const venda = vendaDoc.data();
      const itens = venda.itens || [];
      const data = venda.data?.seconds ? new Date(venda.data.seconds * 1000) : new Date();
      const dataTexto = data.toLocaleDateString("pt-BR");
      const cliente = venda.clienteNome || "-";
      const pagamento = venda.tipoPagamento || "-";

      let totalVenda = 0;
      itens.forEach(item => {
        const qtd = item.quantidade || 0;
        const unit = item.valorUnitario || 0;
        const desc = item.desconto || 0;
        const subtotal = qtd * unit;
        const totalItem = item.totalItem ?? (subtotal - desc);
        totalVenda += totalItem;
      });
      totalGeral += totalVenda;

      // Linha da venda
      linhas.push([dataTexto, cliente, "-", "-", "-", "-", `R$ ${totalVenda.toFixed(2)}`, `R$ ${totalVenda.toFixed(2)}`, pagamento]);
      // Linhas dos produtos
      itens.forEach(item => {
        const qtd = item.quantidade || 0;
        const unit = item.valorUnitario || 0;
        const desc = item.desconto || 0;
        const subtotal = qtd * unit;
        const totalItem = item.totalItem ?? (subtotal - desc);
        linhas.push(["", "", item.nome, `${qtd} un`, `R$ ${unit.toFixed(2)}`, `R$ ${desc.toFixed(2)}`, `R$ ${subtotal.toFixed(2)}`, `R$ ${totalItem.toFixed(2)}`, ""]);
      });
    });

    doc.autoTable({
      head: cabecalho,
      body: linhas,
      startY: 75,
      styles: { fontSize: 9, halign: "center", valign: "middle" },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      theme: "grid",
    });

    doc.setFontSize(13);
    doc.setFont(undefined, "bold");
    doc.text(`TOTAL GERAL: R$ ${totalGeral.toFixed(2)}`, pdfWidth - 20, doc.lastAutoTable.finalY + 10, { align: "right" });

    doc.save("registros_vendas.pdf");
  } catch (error) {
    console.error("Erro ao exportar PDF:", error);
    mostrarModal("Erro ao gerar PDF de registros.");
  }
}

document.getElementById("btnExportarPDF")?.addEventListener("click", exportarPDFRegistros);

/* ============================
   💾 FIRESTORE - FUNÇÕES
============================ */
async function salvarMovimentoFluxoCaixa(movimento) {
  await addDoc(collection(db, "fluxoCaixa"), {
    ...movimento,
    data: Timestamp.fromDate(new Date(movimento.data)),
    criadoEm: serverTimestamp()
  });
}

async function carregarFluxoCaixa() {
  tbodyCaixa.innerHTML = "";

  let totalEntradas = 0;
  let totalSaidas = 0;

  const dataInicio = document.getElementById("dataInicio")?.value;
  const dataFim = document.getElementById("dataFim")?.value;

  let qRef = collection(db, "fluxoCaixa");
  if (dataInicio || dataFim) {
    // Filtra datas se informado
    qRef = query(
      collection(db, "fluxoCaixa"),
      orderBy("data", "asc")
    );
  }

  const snapshot = await getDocs(qRef);

  snapshot.forEach((docSnap) => {
    const mov = docSnap.data();
    const idMov = docSnap.id;

    const data = mov.data?.seconds
      ? new Date(mov.data.seconds * 1000).toLocaleDateString("pt-BR")
      : "-";

    // Filtrar manualmente se datas estão definidas
    if (
      (dataInicio && data < dataInicio) ||
      (dataFim && data > dataFim)
    ) return;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${data}</td>
      <td>${mov.tipo === "entrada" ? "Entrada" : "Saída"}</td>
      <td>${mov.categoria ?? "-"}</td>
      <td>${mov.descricao}</td>
      <td style="color:${mov.tipo === "entrada" ? "green" : "red"}">
        R$ ${mov.valor.toFixed(2)}
      </td>
      <td>
        <button onclick="excluirMovimentoFluxo('${idMov}')">Excluir</button>
      </td>
    `;
    let totaisPorCategoria = {};

    if (mov.tipo === "saida") {
      totaisPorCategoria[mov.categoria] =
       (totaisPorCategoria[mov.categoria] || 0) + mov.valor;
    }      

    tbodyCaixa.appendChild(tr);

    mov.tipo === "entrada"
      ? totalEntradas += mov.valor
      : totalSaidas += mov.valor;
  });

  totalEntradasEl.textContent = `R$ ${totalEntradas.toFixed(2)}`;
  totalSaidasEl.textContent = `R$ ${totalSaidas.toFixed(2)}`;
  saldoCaixaEl.textContent = `R$ ${(totalEntradas - totalSaidas).toFixed(2)}`;
}

// Excluir movimento
async function excluirMovimentoFluxo(idMov) {
  if (!confirm("Excluir este movimento?")) return;
  await deleteDoc(doc(db, "fluxoCaixa", idMov));
  carregarFluxoCaixa();
}

// Remover automaticamente do fluxo de caixa ao excluir venda
async function removerVendaDoFluxoCaixa(idVenda) {
  const q = query(
    collection(db, "fluxoCaixa"),
    where("idVenda", "==", idVenda)
  );

  const snapshot = await getDocs(q);

  for (const docSnap of snapshot.docs) {
    await deleteDoc(doc(db, "fluxoCaixa", docSnap.id));
  }

  carregarFluxoCaixa();
}

/* ============================
   ➕ MODAL MOVIMENTO
============================ */
document.getElementById("btnAdicionarMovimento").addEventListener("click", () => {
  modalMovimento.style.display = "flex";
  dataMovimentoEl.value = new Date();
});

document.getElementById("btnCancelarMovimento").addEventListener("click", () => {
  modalMovimento.style.display = "none";
  limparModal();
});

document.getElementById("btnSalvarMovimento").addEventListener("click", async () => {
  const tipo = tipoMovimentoEl.value;
  const descricao = descricaoMovimentoEl.value.trim();
  const valor = parseFloat(valorMovimentoEl.value);
  const data = dataMovimentoEl.value;

  if (!descricao || isNaN(valor) || valor <= 0 || !data) {
    alert("Preencha todos os campos corretamente.");
    return;
  }

  await salvarMovimentoFluxoCaixa({ tipo, descricao, valor, data });
  modalMovimento.style.display = "none";
  limparModal();
  carregarFluxoCaixa();
});

function limparModal() {
  descricaoMovimentoEl.value = "";
  valorMovimentoEl.value = "";
}

/* ============================
   🔍 FILTRO POR DATA
============================ */
document.getElementById("btnFiltrarCaixa")
  .addEventListener("click", carregarFluxoCaixa);

/* ============================
   💵 INTEGRAÇÃO COM VENDAS
============================ */
// Registrar desconto
btnDescontoVenda?.addEventListener("click", async () => {
  const desconto = parseFloat(prompt("Valor do desconto em R$:"));
  if (!desconto || desconto <= 0) return;

  const cliente =
    document.getElementById("clienteSelect")?.selectedOptions[0]?.text ||
    "Cliente não identificado";

  await salvarMovimentoFluxoCaixa({
    tipo: "saida",
    descricao: `Desconto concedido - ${cliente}`,
    valor: desconto,
    data: new Date(),
    idVenda: null
  });

  const categoria = categoriaMovimentoEl.value;

  if (tipo === "saida" && !categoria) {
  alert("Selecione a categoria da saída.");
  return;
  }

  await salvarMovimentoFluxoCaixa({
  tipo,
  categoria: tipo === "saida" ? categoria : null,
  descricao,
  valor,
  data
  });

  carregarFluxoCaixa();
});

/* ============================
   📄 EXPORTAR PDF
============================ */
document.getElementById("btnExportarFluxoPDF")?.addEventListener("click", async () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const pdfWidth = doc.internal.pageSize.getWidth();

  await adicionarLogo(doc, pdfWidth, 10, 40);

  doc.text("Fluxo de Caixa", 14, 15);

  const rows = Array.from(tbodyCaixa.querySelectorAll("tr")).map(tr =>
    Array.from(tr.querySelectorAll("td")).slice(0, 4).map(td => td.textContent)
  );

  doc.autoTable({ head: [["Data", "Tipo", "Descrição", "Valor"]], body: rows, startY: 40 });

  const saldo = parseFloat(saldoCaixaEl.textContent.replace("R$ ", "").replace(",", "."));
  doc.text(`Saldo Total: R$ ${saldo.toFixed(2)}`, 14, doc.lastAutoTable.finalY + 10);

  doc.save("Fluxo_de_Caixa.pdf");
});

/* ============================
   🔄 CARREGAR AO ABRIR PÁGINA
============================ */
document.addEventListener("DOMContentLoaded", carregarFluxoCaixa);

// === Funções “placeholder” para evitar erros ===

// carrega os clientes disponíveis na aba de Vendas
function carregarClientesVenda() {
  console.log("carregarClientesVenda() chamada");
  // aqui você pode copiar lógica de carregarClientes()
}

function carregarProdutosVenda() {
  console.log("carregarProdutosVenda() chamada");
  // Aqui futuramente vai preencher o <select id="produtoSelect">
  // com os produtos do Firestore
}

document.getElementById("userName").textContent = "Sergio";
window.mostrarSecao = mostrarSecao;





