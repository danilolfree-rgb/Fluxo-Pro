import { s_client } from "../../config.js";

// --- AUTH & SESSÃO ---
export async function checarSessao() {
    const { data: { session } } = await s_client.auth.getSession();
    
    // Se não houver sessão, apenas retorna null em vez de redirecionar aqui.
    // Deixaremos o redirecionamento para quem chamou a função (main.js).
    if (!session) return null;

    const meta = session.user.user_metadata || {};
    const isCasal = meta.tipo_uso === 'casal';

    const saudacao = isCasal && meta.parceiro_nome
        ? `Bem-vindos, ${meta.display_name} & ${meta.parceiro_nome}! ❤️`
        : `${meta.genero === 'f' ? 'Bem-vinda' : 'Bem-vindo'}, ${meta.display_name}!`;

    // --- PROTEÇÃO CONTRA ELEMENTOS NULOS (Onde o erro acontecia) ---
    
    const elSaudacao = document.getElementById('tituloSaudacao');
    if (elSaudacao) elSaudacao.innerText = saudacao;

    const divQuem = document.getElementById('divQuemGastou');
    if (divQuem) {
        divQuem.style.display = isCasal ? 'flex' : 'none';
        
        const elLabelUser = document.getElementById('labelUser');
        const elLabelPartner = document.getElementById('labelPartner');
        
        if (isCasal && elLabelUser && elLabelPartner) {
            elLabelUser.innerText = meta.display_name || 'Eu';
            elLabelPartner.innerText = meta.parceiro_nome || 'Parceiro';
        }
    }

    return session; 
}

export async function deslogar() {
    await s_client.auth.signOut();
    window.location.href = '../login/login.html';
};

window.checarSessao = checarSessao;
window.deslogar = deslogar;
