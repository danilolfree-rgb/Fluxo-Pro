
import { checarSessao } from "../shared/auth.js";

async function validarAcesso() {
    try {
        const usuario = await checarSessao();
        document.body.style.opacity = '0'

        if (usuario) {
            // Se houver usuário, redireciona para o dashboard
            // Se o dashboard estiver na raiz, use apenas 'dashboard.html'
            window.location.replace('../../pages/dashboard/dashboard.html');
        } else {
            // Se não houver usuário, aí sim mostramos a Landing Page
            console.log("Acesso à Landing Page autorizado.");
            document.body.style.opacity = '1'
        }
    } catch (err) {
        console.error("Erro ao validar sessão:", err);
        // Em caso de erro técnico, mostramos a página por segurança
        document.body.style.opacity = '1'
    }
}

// Executa a validação
validarAcesso();