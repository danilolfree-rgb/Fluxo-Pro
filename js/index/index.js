import { checarSessao } from "../shared/auth";

async function bloquearSeLogado() {
    const usuario = await checarSessao();

    // SÓ redireciona se houver usuário E se não estivermos já no dashboard
    if (usuario && !window.location.pathname.includes('dashboard.html')) {
        window.location.replace('dashboard.html');
    } else if (!usuario) {
        // Se não tem usuário, garante que o corpo da página apareça
        document.body.style.opacity = "1";
    }
}
bloquearSeLogado();