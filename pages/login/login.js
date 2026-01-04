// Importa a configuração do cliente Supabase
import { s_client } from '../../js/config.js';

// Variables worldwide to control the login/signup
let modoLogin = true;
let tempEmail = "";
let tempPass = "";

// Function to toggle between login and signup modes
function toggleAuth() {
    modoLogin = !modoLogin;
    const titulo = document.getElementById('authTitle');
    const btn = document.getElementById('btnAuth');
    const link = document.getElementById('toggleText');
    
    /* Se for novo usuário ou antigo, tratar diferente */
    if (modoLogin) {
        titulo.innerText = 'Bem-vindo de volta';
        btn.innerText = 'Entrar';
        link.innerText = 'Cadastre-se';
    } else {
        titulo.innerText = 'Criar nova conta';
        btn.innerText = 'Criar Conta';
        link.innerText = 'Fazer Login';
    }
}

// Substitua o código de abrir o modal no seu handleAuth por isso:
function openModal() {
    document.getElementById('modalPerfil').classList.add('active');
}

function closeModal() {
    document.getElementById('modalPerfil').classList.remove('active');
}

// Lógica de mostrar/esconder campos de casal (simplificada)
window.toggleCamposCasal = () => {
    const tipo = document.getElementById('tipoUso').value;
    document.getElementById('sessaoCasal').style.display = (tipo === 'casal') ? 'block' : 'none';
};

/* Verifica se o usuário já tem conta ou não
se sim, permite o acesso */
async function handleAuth() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) return alert("Preencha e-mail e senha!");

    if (modoLogin) {
        // ... lógica de login ...
    } else {
        tempEmail = email;
        tempPass = password;
}

/* Cadastra o usuário no banco de dados */
async function finishRegister() {
    const nome = document.getElementById('nomeUser').value;
    const genero = document.getElementById('generoUser').value;
    const tipoUso = document.getElementById('tipoUso').value;
    const nomeP = document.getElementById('nomeParceiro').value;
    const generoP = document.getElementById('generoParceiro').value;

    if (!nome) return alert("Por favor, diga seu nome!");

    const { error } = await s_client.auth.signUp({
        email: tempEmail,
        password: tempPass,
        options: {
            data: {
                display_name: nome,
                genero: genero,
                tipo_uso: tipoUso,
                parceiro_nome: tipoUso === 'casal' ? nomeP : '',
                parceiro_genero: tipoUso === 'casal' ? generoP : ''
            }
        }
    });

    if (error) {
        alert(error.message);
    } else {
        alert("Cadastro realizado! Verifique seu e-mail se necessário.");
        window.location.href = '../dashboard/dashboard.html';
    }
}

// TORNAR AS FUNÇÕES ACESSÍVEIS AO HTML (onclick)
window.toggleAuth = toggleAuth;
window.handleAuth = handleAuth;
window.finishRegister = finishRegister;
window.openModal = openModal;
window.closeModal = closeModal;