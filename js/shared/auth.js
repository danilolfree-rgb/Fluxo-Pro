import { s_client } from "../../config.js";

// --- AUTH & SESSÃO ---
export async function checarSessao() {
    const { data: { session } } = await s_client.auth.getSession();
    if (!session) return (window.location.href = '../login/login.html');

    const meta = session.user.user_metadata;
    const isCasal = meta.tipo_uso === 'casal';

    const saudacao = isCasal && meta.parceiro_nome
        ? `Bem-vindos, ${meta.display_name} & ${meta.parceiro_nome}! ❤️`
        : `${meta.genero === 'f' ? 'Bem-vinda' : 'Bem-vindo'}, ${meta.display_name}!`;

    document.getElementById('tituloSaudacao').innerText = saudacao;

    const divQuem = document.getElementById('divQuemGastou');
    if (divQuem) {
        divQuem.style.display = isCasal ? 'flex' : 'none';
        if (isCasal) {
            document.getElementById('labelUser').innerText = meta.display_name || 'Eu';
            document.getElementById('labelPartner').innerText = meta.parceiro_nome || 'Parceiro';
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
