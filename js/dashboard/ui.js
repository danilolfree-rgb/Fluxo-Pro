// js/dashboard/ui.js
// = FUNÇÕES QUE RENDERIZAM OU ALTERAM VALORES NO HTML =
// =====================================================

import { formatarMoeda, CATEGORIAS_CONFIG } from '../shared/utils.js';

// --- ATUALIZA OS CARDS DE RESUMO DA PÁGINA INICIAL ---

export function atualizarCardsResumo(resumo) {
    const elSaldo = document.getElementById('saldoTotal');
    const elGanhos = document.getElementById('resumoGanhos');
    const elGastos = document.getElementById('resumoGastos');

    if (elSaldo) elSaldo.innerText = formatarMoeda(resumo.saldo);
    if (elGanhos) elGanhos.innerText = formatarMoeda(resumo.ganhos);
    if (elGastos) elGastos.innerText = formatarMoeda(resumo.gastos);

    const subtitulo = document.getElementById('subtituloAura');
    if (subtitulo) subtitulo.innerText = "Resumo atualizado com sucesso ✨";
}

// --- CONFIGURA O SELETOR DE MESES E SELECIONA O ATUAL COMO PADRÃO ---

export function configurarSeletorMeses(callbackAoMudar) {
    const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const select = document.getElementById('mesGlobal');

    if (!select) return;

    const mesAtualNome = meses[new Date().getMonth()];

    select.innerHTML = meses.map(m =>
        `<option value="${m}" ${m === mesAtualNome ? 'selected' : ''}>${m}</option>`
    ).join('');

    select.onchange = () => callbackAoMudar(select.value);

    return select.value; // Retorna o mês inicial
}

// --- MOSTRA AS INFORMAÇÕES DA ANÁLISE DOS DADOS ---

export function renderizarCardInsight(tipo, dado, event) {
    // Remove a classe 'active' de TODOS os botões
    const botoes = document.querySelectorAll('.tab-btn');
    botoes.forEach(btn => btn.classList.remove('active'));

    // Aplica 'active' no botão correto
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    } else {
        const btnAutomatico = Array.from(botoes).find(btn =>
            btn.getAttribute('onclick')?.includes(`'${tipo}'`)
        );
        if (btnAutomatico) btnAutomatico.classList.add('active');
    }

    // Textos fixos
    const labels = {
        categoria: "Maior gasto por categoria",
        pagamento: "Forma de pagamento mais usada",
        quem: "Quem mais gastou no mês"
    };

    // Atualiza o DOM
    const elLabel = document.getElementById('insight-label');
    const elValue = document.getElementById('insight-value');
    const elDetail = document.getElementById('insight-detail');

    if (elLabel) elLabel.innerText = labels[tipo];
    if (elValue) elValue.innerText = dado.nome || "---";
    if (elDetail) {
        elDetail.innerText = `Total: ${formatarMoeda(dado.valor || 0)}`;
    }
}

// --- VERIFICA SE A CONTA É DE CASAL PARA MOSTRAR QUEM GASTOU MAIS ---

export function gerenciarVisibilidadeInsights(temDados, tipoUso) {
    const section = document.querySelector('.insights-section');
    if (section) {
        section.style.display = temDados ? 'block' : 'none';
    }

    const btnQuem = document.getElementById('btn-insight-quem');
    if (btnQuem) {
        btnQuem.style.display = (tipoUso === 'casal') ? 'block' : 'none';
    }
}

// --- GERENCÍA O MENU FIXO ---

export function gerenciarNavegacao(pagina) {
    // Atualiza visual dos botões (barra inferior/lateral)
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('active');
        // Se o texto do botão tiver o nome da página, ele fica destacado
        if (btn.innerText.toLowerCase().includes(pagina)) {
            btn.classList.add('active');
        }
    });

    // Troca de telas (Sections)
    const telas = ['init', 'extract', 'reserve', 'perfil'];
    telas.forEach(t => {
        const el = document.getElementById(`screen-${t}`);
        if (el) {
            el.style.display = (t === pagina) ? 'block' : 'none';
        }
    });

    console.log(`Navegando para: ${pagina}`);
}

// --- GERENCIA OS BOTÕES DO BOTÃO DE ABRIR MODAIS ---

export function gerenciarFab() {
    const options = document.getElementById('fabOptions');
    const btn = document.querySelector('.fab-main');

    if (!options || !btn) return;

    if (options.style.display === 'flex') {
        options.style.display = 'none';
        btn.style.transform = 'rotate(0deg)';
    } else {
        options.style.display = 'flex';
        btn.style.transform = 'rotate(45deg)';
    }
}

// --- EXCLUI DADOS NO BANCO ---

export async function excluirLancamentoBD(idOuNome, acao) {
    let query = s_client.from('Lançamentos').delete();

    if (acao === 'item') {
        query = query.eq('id', idOuNome);
    } else {
        // Para reservas, deletamos pelo nome e tipo
        query = query.eq('tipo', 'reserva').eq('descricao', idOuNome);
    }

    const { error } = await query;
    if (error) throw error;
    return true;
}

// --- ABRE MODAIS ---

export function abrirModalUI(id) {
    const modal = document.getElementById(id);
    if (!modal) return;

    modal.style.display = 'flex';

    // Lógica específica para o formulário de gastos
    if (id === 'modalGasto') {
        const inputData = document.getElementById('dataGasto');
        if (inputData && !inputData.value) {
            // Define a data de hoje como padrão no formato YYYY-MM-DD
            inputData.value = new Date().toISOString().split('T')[0];
        }
    }
}

// --- FECHA MODAIS ---

export function fecharModalUI(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
}

// --- LIMPA FORMULÁRIOS ---

export function limparFormulario(tipo) {
    const campos = {
        gasto: ['valGasto', 'descGasto', 'dataGasto'],
        renda: ['valRenda', 'catRenda'],
        reserva: ['valReserva', 'descReserva']
    };

    if (campos[tipo]) {
        campos[tipo].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = "";
        });
    }
}

// ---- MOSTRA A LISTA DE RESERVAS DO USÚARIO ---

export function renderizarListaReservas(reservas, excluirAcao) {
    const container = document.getElementById('listaReservas');
    const temp = document.getElementById('temp-reserva');
    if (!container || !temp) return;

    container.innerHTML = "";
    Object.entries(reservas).forEach(([nome, total]) => {
        const clone = temp.content.cloneNode(true);
        clone.querySelector('.reserva-nome').innerText = nome;
        clone.querySelector('.reserva-valor-num').innerText = formatarMoeda(total);
        clone.querySelector('button').onclick = () => excluirAcao(nome, 'reserva');
        container.appendChild(clone);
    });
}

// MOSTRA O EXTRATO DO USÚARIO

export function renderizarTabelaGastos(listaGastos, meta) {
    const tabelaBody = document.getElementById('tabelaGastosBody');
    const tempLinha = document.getElementById('temp-linha-gasto');

    if (!tabelaBody || !tempLinha) return;

    tabelaBody.innerHTML = ""; 
    const fragmento = document.createDocumentFragment(); 

    listaGastos.forEach(g => {
        const clone = tempLinha.content.cloneNode(true);
        
        // 1. Data
        const dataRef = g.data || g.created_at;
        const dataObj = g.data ? new Date(dataRef + 'T12:00:00') : new Date(dataRef);
        clone.querySelector('.extrato-dia').innerText = dataObj.getDate().toString().padStart(2, '0');

        // 2. Textos e Valores
        clone.querySelector('.td-principal').innerText = g.descricao || 'Sem descrição';
        clone.querySelector('.td-sub').innerText = g.pagamento || 'Outros';
        clone.querySelector('.td-valor-gasto').innerText = formatarMoeda(g.valor);

        // 3. ÍCONES (Ajustado para seu CATEGORIAS_CONFIG)
        const badgeCat = clone.querySelector('.badge-cat-pura');
        if (badgeCat) {
            // Pegamos a configuração da categoria. Se não existir, usamos o fallback 'Outros'
            const config = CATEGORIAS_CONFIG[g.categoria] || CATEGORIAS_CONFIG['Outros'];
            badgeCat.innerText = `${config.icon} ${g.categoria}`;
        }

        // 4. Usuário (Modo Casal)
        const badgeUser = clone.querySelector('.badge-user-pura');
        if (badgeUser) {
            if (meta.tipo_uso === 'casal' && g.responsavel) {
                badgeUser.innerText = g.responsavel.split(' ')[0];
            } else {
                badgeUser.remove();
            }
        }

        // 5. Delegação de Eventos (Otimização)
        const btnExcluir = clone.querySelector('.btn-delete-small');
        if (btnExcluir) {
            btnExcluir.dataset.id = g.id;
            btnExcluir.dataset.acao = "excluir";
        }

        fragmento.appendChild(clone);
    });

    tabelaBody.appendChild(fragmento);
}

// --- GERENCIA OS TEXTOS E ICONES DO SELECT DE CATEGORIA ---

export function popularSelectCategorias(idSelect) {
    const select = document.getElementById(idSelect);
    if (!select) return;

    // Geramos o HTML das opções mapeando o objeto de configuração
    const optionsHTML = Object.entries(CATEGORIAS_CONFIG).map(([chave, info]) => {
        return `<option value="${chave}">${info.icon} ${info.label}</option>`;
    }).join('');

    select.innerHTML = optionsHTML;
}

// js/dashboard/ui.js

export function renderizarPerfilUI(usuario) {
    const meta = usuario.user.user_metadata;
    const eCasal = meta.tipo_uso === 'casal';

    // 1. Textos e Nomes
    document.getElementById('perfil-nome-principal').innerText = meta.display_name || "Usuário";
    document.getElementById('perfil-email').innerText = usuario.user.email;

    // 2. Lógica Casal
    const elParceiro = document.getElementById('perfil-e-parceiro');
    const elStatusText = document.getElementById('status-parceria-texto');

    if (eCasal) {
        elParceiro.style.display = 'inline';
        document.getElementById('perfil-nome-parceiro').innerText = meta.parceiro_nome;
        elStatusText.innerText = "Conectado";
    } else {
        elParceiro.style.display = 'none';
        elStatusText.innerText = "Solo";
    }

    // 3. Avatar (Sigla)
    const inicialEu = (meta.display_name || "U")[0];
    const inicialParceiro = eCasal ? (meta.parceiro_nome || "P")[0] : (meta.display_name || "U")[1] || "";
    document.getElementById('avatar-sigla').innerText = (inicialEu + inicialParceiro).toUpperCase();
}