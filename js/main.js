// js/main.js
// = EXECUTA TODAS AS FUNÇÕES DA PÁGINA DASHBOARD =
// ================================================

import { checarSessao } from './shared/auth.js';
import { debounce } from './shared/utils.js';
import { configurarSincronizacao } from './shared/offline.js';
import { buscarDadosLancamentos, salvarLancamentoBD, excluirLancamentoBD } from './dashboard/api.js';
import { calcularResumoMensal, calcularAnalises } from './dashboard/logic.js';
import {
    atualizarCardsResumo, configurarSeletorMeses,
    gerenciarVisibilidadeInsights, renderizarCardInsight,
    gerenciarNavegacao, gerenciarFab,
    abrirModalUI, fecharModalUI, limparFormulario,
    renderizarListaReservas, renderizarTabelaGastos, popularSelectCategorias,
    renderizarPerfilUI
} from './dashboard/ui.js';

let dadosCache = [];
let analiseDadosCache = {};
let usuarioLogado = null; // Guardamos os dados do usuário aqui

// --- ATUALIZA INFORMAÇÕES AO INICIALIZAR ---

// Ela espera 300ms antes de executar a lógica pesada
const atualizarDashboardDebounced = debounce((novoMes) => {
    atualizarDashboard(novoMes);
}, 300);

window.onload = async function () {
    usuarioLogado = await checarSessao(); 

    if (!usuarioLogado) {
        if (!window.location.pathname.includes('index.html')) {
            window.location.replace('index.html');
        }
        return;
    }
    
    console.log("Usuário autenticado:", usuarioLogado.user.email);

    // 1. Configurações Iniciais
    configurarSincronizacao();

    const mesInicial = configurarSeletorMeses((novoMes) => {
        atualizarDashboardDebounced(novoMes);
    });

    // 2. BUSCA DE DADOS (Aqui estava o erro)
    try {
        // Extraímos o meta aqui para poder usar nos IDs
        const meta = usuarioLogado.user.user_metadata;
        const ids = [usuarioLogado.user.id, meta.parceiro_id].filter(Boolean);

        console.log("Buscando dados para os IDs:", ids);
        dadosCache = await buscarDadosLancamentos(ids);

        // Salva para uso offline
        localStorage.setItem('ultimo_cache_dados', JSON.stringify(dadosCache));

        // Renderiza a tela
        atualizarDashboard(mesInicial);

    } catch (err) {
        console.error("Erro na busca inicial:", err);
        
        // Tenta carregar do cache se estiver offline
        if (!window.navigator.onLine) {
            const cacheSalvo = localStorage.getItem('ultimo_cache_dados');
            if (cacheSalvo) {
                dadosCache = JSON.parse(cacheSalvo);
                atualizarDashboard(mesInicial);
                console.log("Dados carregados do cache offline.");
            }
        }
    }

    // 3. Delegação de Eventos (Exclusão)
    const tabelaBody = document.getElementById('tabelaGastosBody');
    if (tabelaBody) {
        tabelaBody.addEventListener('click', (event) => {
            const btn = event.target.closest('[data-acao="excluir"]');
            if (btn) {
                const idParaDeletar = btn.dataset.id;
                window.excluirAcao(idParaDeletar, 'item');
            }
        });
    }
};

// --- FUNÇÃO PRINCIPAL QUE GERENCIA A TELA ---

async function atualizarDashboard(mesManual) {
    try {
        const mesAtual = mesManual || document.getElementById('mesGlobal').value;
        const meta = usuarioLogado.user.user_metadata;

        // Processamento Financeiro (Logic)
        const resumo = calcularResumoMensal(dadosCache, mesAtual);

        // Filtragem e Ordenação de Gastos (Logic)
        const listaGastos = dadosCache
            .filter(i => i.tipo === 'gasto' && i.mes === mesAtual)
            .sort((a, b) => new Date(b.data || b.created_at) - new Date(a.data || a.created_at));

        // Atualizar Interface (UI)
        popularSelectCategorias('catGasto');
        atualizarCardsResumo(resumo);
        processarInsights(listaGastos, meta);
        renderizarListaReservas(resumo.reservas, window.excluirAcao);
        renderizarTabelaGastos(listaGastos, meta, window.excluirAcao);

        // Atualiza ícones do Lucide
        if (window.lucide) lucide.createIcons();

    } catch (err) {
        console.error("Erro ao atualizar dashboard:", err);
    }
}

// --- ENVIA OS DADOS PRO BANCO ---
window.enviar = async (tipo) => {
    const btnId = `btnSalvar${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`;
    const btn = document.getElementById(btnId);
    if (!btn || btn.disabled) return;

    try {
        const meta = usuarioLogado.user.user_metadata;
        const mesAtual = document.getElementById('mesGlobal').value;

        // --- 1. MONTAGEM DO PAYLOAD (Não pode faltar!) ---
        let payload = {
            user_id: usuarioLogado.user.id,
            tipo: tipo,
            mes: mesAtual,
            data: new Date().toISOString().split('T')[0]
        };

        if (tipo === 'gasto') {
            payload.valor = parseFloat(document.getElementById('valGasto').value);
            payload.descricao = document.getElementById('descGasto').value;
            payload.categoria = document.getElementById('catGasto').value;
            payload.pagamento = document.getElementById('pagGasto').value;
            payload.data = document.getElementById('dataGasto').value || payload.data;
            payload.responsavel = document.querySelector('input[name="quemGastou"]:checked')?.value === 'partner'
                ? meta.parceiro_nome : meta.display_name;
        } else if (tipo === 'renda') {
            payload.valor = parseFloat(document.getElementById('valRenda').value);
            payload.categoria = document.getElementById('catRenda').value;
            payload.descricao = "Entrada";
        } else if (tipo === 'reserva') {
            payload.valor = parseFloat(document.getElementById('valReserva').value);
            payload.descricao = document.getElementById('descReserva').value;
            payload.categoria = "Investimento";
        }

        // Validação básica
        if (!payload.valor || isNaN(payload.valor)) {
            return alert("Por favor, insira um valor válido.");
        }

        btn.disabled = true;

        // --- 2. LÓGICA OTIMISTA (Interface responde na hora) ---

        const itemOtimista = {
            ...payload,
            id: 'temp-' + Date.now(),
            status: 'pendente'
        };

        fecharModalUI(`modal${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`);
        limparFormulario(tipo);

        // Adiciona ao cache local e desenha a tabela imediatamente
        dadosCache.push(itemOtimista);
        atualizarDashboard(payload.mes);

        try {
            // --- 3. TENTA SALVAR NO BANCO ---
            const resultadoReal = await salvarLancamentoBD(payload);

            // Troca o item temporário pelo oficial do banco
            dadosCache = dadosCache.filter(i => i.id !== itemOtimista.id);
            dadosCache.push(resultadoReal);

            // Recarrega o cache para garantir que os IDs e dados estejam 100% sincronizados
            const ids = [usuarioLogado.user.id, meta.parceiro_id].filter(Boolean);
            dadosCache = await buscarDadosLancamentos(ids);

            atualizarDashboard(payload.mes);

        } catch (err) {
            // --- 4. TRATAMENTO DE ERRO / OFFLINE ---
            if (!window.navigator.onLine) {
                const pendentes = JSON.parse(localStorage.getItem('sync_pendente') || '[]');
                pendentes.push(payload);
                localStorage.setItem('sync_pendente', JSON.stringify(pendentes));

                alert("Salvo localmente! Sincronizaremos assim que a internet voltar.");
            } else {
                // Se o erro não for internet, removemos o item da tela pois falhou de verdade
                dadosCache = dadosCache.filter(i => i.id !== itemOtimista.id);
                atualizarDashboard(payload.mes);
                throw err;
            }
        }

    } catch (err) {
        console.error("Erro ao salvar:", err);
        alert("Erro ao salvar: " + err.message);
    } finally {
        btn.disabled = false;
    }
};

// --- PUXA E FAZ UMA ANÁLISE DOS DADOS ---

function processarInsights(gastos, meta) {
    const temDados = gastos && gastos.length > 0;
    gerenciarVisibilidadeInsights(temDados, meta.tipo_uso);

    if (temDados) {
        analiseDadosCache = calcularAnalises(gastos);
        window.mostrarInsight('categoria');
    }
}

// --- MOSTRA A ANALISE  ---

window.mostrarInsight = (tipo, event) => {
    const dado = analiseDadosCache[tipo] || { nome: "---", valor: 0 };
    renderizarCardInsight(tipo, dado, event);
};

// --- EXCLUI DADO DO BANCO ---

window.excluirAcao = async (idOuNome, acao) => {
    if (!confirm("Confirmar exclusão?")) return;

    try {
        // 1. Chama a API para deletar
        await excluirLancamentoBD(idOuNome, acao);

        // 2. Atualiza os dados locais (Cache)
        // Buscamos os dados novamente para garantir que a tela reflita o banco
        const meta = usuarioLogado.user.user_metadata;
        const ids = [usuarioLogado.user.id, meta.parceiro_id].filter(Boolean);
        dadosCache = await buscarDadosLancamentos(ids);

        // 3. Atualiza a tela
        const mesAtual = document.getElementById('mesGlobal').value;
        atualizarDashboard(mesAtual);

        alert("Excluído com sucesso!");

    } catch (err) {
        console.error("Erro ao excluir:", err);
        alert("Erro ao excluir: " + err.message);
    }
};

// --- NAVEGAÇÃO DO MENU FIXO ---

window.navegar = (pagina) => {
    // 1. Chama sua função existente que esconde/mostra as sections
    gerenciarNavegacao(pagina);

    // 2. Se a página for perfil, alimenta os dados
    if (pagina === 'perfil') {
        // usuarioLogado e dadosCache devem ser suas variáveis globais do main.js
        renderizarPerfilUI(usuarioLogado, dadosCache);
    }
};

// --- OPÇÕES DO BOTÃO DE ABRIR MODAIS ---

window.toggleFab = () => {
    gerenciarFab();
};

// --- ABRIR E FECHAR MODAIS ---

window.abrirModal = (id) => abrirModalUI(id);
window.fecharModal = (id) => fecharModalUI(id);

// Vigia de Conexão - Cole no final do seu main.js
window.addEventListener('online', async () => {
    const pendentes = JSON.parse(localStorage.getItem('sync_pendente') || '[]');
    if (pendentes.length === 0) return;

    console.log("Internet detectada! Sincronizando dados pendentes...");

    for (const item of pendentes) {
        try {
            await salvarLancamentoBD(item);
        } catch (err) {
            console.error("Erro ao sincronizar item:", err);
        }
    }

    localStorage.removeItem('sync_pendente');
    alert("Sincronização concluída! Seus gastos offline foram salvos no banco.");

    // Recarrega para garantir que os dados oficiais apareçam
    window.location.reload();
});
