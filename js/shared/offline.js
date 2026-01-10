// js/shared/offline.js
import { salvarLancamentoBD } from '../dashboard/api.js';

export function configurarSincronizacao() {
    // Escuta o evento do navegador quando a internet volta
    window.addEventListener('online', async () => {
        const pendentes = JSON.parse(localStorage.getItem('sync_pendente') || '[]');
        
        if (pendentes.length === 0) return;

        console.log(`📡 Internet voltou! Sincronizando ${pendentes.length} itens...`);

        for (const item of pendentes) {
            try {
                await salvarLancamentoBD(item);
            } catch (err) {
                console.error("Falha ao sincronizar item:", item, err);
            }
        }

        // Limpa a lista após tentar enviar tudo
        localStorage.removeItem('sync_pendente');
        
        // Notifica o usuário e recarrega a tela
        alert("Sincronização concluída com sucesso!");
        window.location.reload(); 
    });
}
