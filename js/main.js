// js/main.js
// = EXECUTA TODAS AS FUNÇÕES DA PÁGINA DASHBOARD =
// ================================================

import { checarSessao } from './shared/auth.js';
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

window.onload = async function () {
    usuarioLogado = await checarSessao();
    if (!usuarioLogado) return;

    // Configura o seletor
    const mesInicial = configurarSeletorMeses((novoMes) => {
        atualizarDashboard(novoMes); // Quando mudar o mês, atualiza
    });

    // Busca inicial
    try {
        const meta = usuarioLogado.user.user_metadata;
        const ids = [usuarioLogado.user.id, meta.parceiro_id].filter(Boolean);

        dadosCache = await buscarDadosLancamentos(ids);

        // Primeira execução
        atualizarDashboard(mesInicial);

    } catch (err) {
        console.error("Erro inicial:", err);
    }

    const tabelaBody = document.getElementById('tabelaGastosBody');
    if (tabelaBody) {
        tabelaBody.addEventListener('click', (event) => {
            // Encontra o botão mais próximo que tenha data-acao="excluir"
            const btn = event.target.closest('[data-acao="excluir"]');

            if (btn) {
                const idParaDeletar = btn.dataset.id;
                // Chama a função de exclusão passando o ID
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

        // Montagem do Objeto (Payload)
        let payload = {
            user_id: usuarioLogado.user.id,
            tipo: tipo,
            mes: mesAtual,
            data: new Date().toISOString().split('T')[0] // Data padrão
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

        // Validação
        if (!payload.valor || isNaN(payload.valor)) {
            return alert("Por favor, insira um valor válido.");
        }

        btn.disabled = true;

        // Persistência (API)
        await salvarLancamentoBD(payload);

        // Sucesso: Interface
        fecharModalUI(`modal${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`);
        limparFormulario(tipo);

        // Atualização Global (Refresh)
        const ids = [usuarioLogado.user.id, meta.parceiro_id].filter(Boolean);
        dadosCache = await buscarDadosLancamentos(ids); // Recarrega o cache local
        atualizarDashboard(mesAtual);

        alert("Salvo com sucesso!");

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

// js/main.js

// Configure isso uma única vez (ex: no window.onload)
const tabela = document.getElementById('tabelaGastosBody');
