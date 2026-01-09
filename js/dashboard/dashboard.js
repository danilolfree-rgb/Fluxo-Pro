import { s_client } from '../../config.js';

// --- CONFIGURAÇÃO INICIAL ---
window.onload = async function () {
    const session = await checarSessao();
    if (!session) return;

    configurarMeses();
    const inputData = document.getElementById('dataGasto');
    if (inputData) inputData.valueAsDate = new Date();

    atualizarDashboard();
};

// --- AUTH & SESSÃO ---
async function checarSessao() {
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

window.deslogar = async () => {
    await s_client.auth.signOut();
    window.location.href = '../login/login.html';
};

// --- UI HELPERS ---
const formatarMoeda = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function configurarMeses() {
    const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const select = document.getElementById('mesGlobal');
    if (!select) return;

    select.innerHTML = meses.map((m, i) =>
        `<option value="${m}" ${i === new Date().getMonth() ? 'selected' : ''}>${m}</option>`
    ).join('');
    select.onchange = atualizarDashboard;
}

// --- LÓGICA DE DADOS PRINCIPAL ---
async function atualizarDashboard() {
    try {
        const mes = document.getElementById('mesGlobal').value;
        const { data: { session } } = await s_client.auth.getSession();
        const meta = session.user.user_metadata;

        lucide.createIcons();

        let idsParaBuscar = [session.user.id];
        if (meta.tipo_uso === 'casal' && meta.parceiro_id) {
            idsParaBuscar.push(meta.parceiro_id);
        }

        const { data: todosDados, error } = await s_client
            .from('Lançamentos')
            .select('*')
            .in('user_id', idsParaBuscar);

        if (error) throw error;

        let gnh = 0, gst = 0, reservas = {};
        const icones = { 'Alimentação': '🍔', 'Casa': '🏠', 'Lazer': '🎉', 'Transporte': '🚗', 'Roupas': '👕', 'Viagem': '✈️', 'Fatura': '🧾', 'Material de trabalho': '💼', 'Igreja': '⛪', 'Drogaria': '💊' };

        // 1. Processamento de valores gerais (Renda e Reservas)
        todosDados.forEach(i => {
            const v = parseFloat(i.valor) || 0;
            if (i.tipo === 'reserva') reservas[i.descricao] = (reservas[i.descricao] || 0) + v;
            if (i.mes === mes) {
                if (i.tipo === 'renda') gnh += v;
                else if (i.tipo === 'gasto') gst += v;
            }
        });

        // Substitua a parte onde filtra e ordena listaGastos por isso:
        const listaGastos = todosDados
            .filter(i => i.tipo === 'gasto' && i.mes === mes)
            .sort((a, b) => {
                // Ordena pela data escolhida (g.data). Se não tiver, usa created_at.
                const dataA = new Date(a.data || a.created_at);
                const dataB = new Date(b.data || b.created_at);
                return dataB - dataA; // Mais recentes primeiro
            });

        // 3. Executar Análise Inteligente (Abas/Insights)
        calcularAnalises(listaGastos, meta);

        // 4. Atualizar Resumo Financeiro
        document.getElementById('saldoTotal').innerText = formatarMoeda(gnh - gst);
        document.getElementById('resumoGanhos').innerText = formatarMoeda(gnh);
        document.getElementById('resumoGastos').innerText = formatarMoeda(gst);

        const subtitulo = document.getElementById('subtituloAura');
        if (subtitulo) subtitulo.innerText = "Resumo atualizado com sucesso ✨";

        // 5. Renderizar Reservas
        const containerReservas = document.getElementById('listaReservas');
        const tempReserva = document.getElementById('temp-reserva');
        if (containerReservas && tempReserva) {
            containerReservas.innerHTML = "";
            Object.entries(reservas).forEach(([nome, total]) => {
                const clone = tempReserva.content.cloneNode(true);
                clone.querySelector('.reserva-nome').innerText = nome;
                clone.querySelector('.reserva-valor-num').innerText = formatarMoeda(total);
                clone.querySelector('button').onclick = () => excluirAcao(nome, 'reserva');
                containerReservas.appendChild(clone);
            });
        }

        // 6. Renderizar Histórico (Com lógica de Badge Solo/Casal)
        // ... dentro de atualizarDashboard, parte 6 ...
        const tabelaBody = document.getElementById('tabelaGastosBody');
        const tempLinha = document.getElementById('temp-linha-gasto');

        if (tabelaBody && tempLinha) {
            tabelaBody.innerHTML = "";

            listaGastos.forEach(g => {
                const clone = tempLinha.content.cloneNode(true);

                // MUDANÇA AQUI: Prioriza o campo 'data' que você salvou
                const dataRef = g.data || g.created_at;

                // Tratamento para não bugar o dia (TZ)
                let dataObj = g.data ? new Date(dataRef + 'T12:00:00') : new Date(dataRef);

                const dia = dataObj.getDate().toString().padStart(2, '0');
                clone.querySelector('.extrato-dia').innerText = dia;
                // Textos principais
                clone.querySelector('.td-principal').innerText = g.descricao || 'Sem descrição';
                clone.querySelector('.td-sub').innerText = g.pagamento || 'Outros';

                // Valor com cor dinâmica
                const elValor = clone.querySelector('.td-valor-gasto');
                elValor.innerText = formatarMoeda(g.valor);
                // Se quiser diferenciar ganhos de gastos visualmente:
                // elValor.style.color = g.tipo === 'renda' ? '#22c55e' : '#f8fafc';

                // Categoria
                const badgeCat = clone.querySelector('.badge-cat-pura');
                badgeCat.innerText = `${icones[g.categoria] || '💸'} ${g.categoria}`;

                // Lógica de Usuário (Casal)
                const badgeUser = clone.querySelector('.badge-user-pura');
                if (meta.tipo_uso === 'casal' && g.responsavel) {
                    badgeUser.innerText = g.responsavel.split(' ')[0]; // Pega só primeiro nome
                } else {
                    badgeUser.remove();
                }

                // Ação de deletar
                clone.querySelector('.btn-delete-small').onclick = () => excluirAcao(g.id, 'item');

                tabelaBody.appendChild(clone);
            });
        }

    } catch (err) {
        console.error("Erro no Dashboard:", err);
    }
}

// --- SISTEMA DE ANÁLISE (INSIGHTS) ---
let analiseDados = {
    categoria: { nome: "Nenhuma", valor: 0 },
    pagamento: { nome: "Nenhum", valor: 0 },
    quem: { nome: "Ninguém", valor: 0 }
};

function calcularAnalises(listaGastos, meta) {
    const section = document.querySelector('.insights-section');
    if (!listaGastos || listaGastos.length === 0) {
        if (section) section.style.display = 'none';
        return;
    }
    if (section) section.style.display = 'block';

    const totais = { cat: {}, pag: {}, user: {} };

    listaGastos.forEach(g => {
        const v = parseFloat(g.valor) || 0;
        if (g.categoria) totais.cat[g.categoria] = (totais.cat[g.categoria] || 0) + v;
        if (g.pagamento) totais.pag[g.pagamento] = (totais.pag[g.pagamento] || 0) + v;
        if (g.responsavel) totais.user[g.responsavel] = (totais.user[g.responsavel] || 0) + v;
    });

    const pegarMaior = (obj) => {
        const entries = Object.entries(obj);
        return entries.length > 0 ? entries.sort((a, b) => b[1] - a[1])[0] : ["---", 0];
    };

    const maiorCat = pegarMaior(totais.cat);
    const maiorPag = pegarMaior(totais.pag);
    const maiorUser = pegarMaior(totais.user);

    analiseDados.categoria = { nome: maiorCat[0], valor: maiorCat[1] };
    analiseDados.pagamento = { nome: maiorPag[0], valor: maiorPag[1] };
    analiseDados.quem = { nome: maiorUser[0], valor: maiorUser[1] };

    // Controle do botão Responsável (Solo vs Casal)
    const btnQuem = document.getElementById('btn-insight-quem');
    if (btnQuem) btnQuem.style.display = (meta.tipo_uso === 'casal') ? 'block' : 'none';

    mostrarInsight('categoria');
}

window.mostrarInsight = (tipo, event) => {
    // 1. Remove a classe 'active' de TODOS os botões de aba
    const botoes = document.querySelectorAll('.tab-btn');
    botoes.forEach(btn => btn.classList.remove('active'));

    // 2. Lógica para aplicar a classe 'active' no botão correto
    if (event && event.currentTarget) {
        // Se veio de um clique direto
        event.currentTarget.classList.add('active');
    } else {
        // Se foi chamado automaticamente (ex: ao carregar a página)
        // Procura o botão que tem o onclick relacionado ao tipo
        const btnAutomatico = Array.from(botoes).find(btn =>
            btn.getAttribute('onclick')?.includes(`'${tipo}'`)
        );
        if (btnAutomatico) btnAutomatico.classList.add('active');
    }

    // 3. Atualiza os textos do card
    const dado = analiseDados[tipo] || { nome: "---", valor: 0 };
    const labels = {
        categoria: "Maior gasto por categoria",
        pagamento: "Forma de pagamento mais usada",
        quem: "Quem mais gastou no mês"
    };

    const elLabel = document.getElementById('insight-label');
    const elValue = document.getElementById('insight-value');
    const elDetail = document.getElementById('insight-detail');

    if (elLabel) elLabel.innerText = labels[tipo];
    if (elValue) elValue.innerText = dado.nome;
    if (elDetail) elDetail.innerText = `Total: ${formatarMoeda(dado.valor)}`;
};

// --- ENVIO E EXCLUSÃO ---
async function enviar(tipo) {
    const btnId = `btnSalvar${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`;
    const btn = document.getElementById(btnId);
    if (!btn || btn.disabled) return;

    try {
        const { data: { session } } = await s_client.auth.getSession();
        const meta = session.user.user_metadata;
        const mesAtual = document.getElementById('mesGlobal').value;

        // 1. Criamos o objeto base com o que é comum a todos
        let payload = {
            user_id: session.user.id,
            tipo: tipo,
            mes: mesAtual
        };

        // 2. Preenchemos os campos específicos baseados no tipo
        if (tipo === 'gasto') {
            const dataEscolha = document.getElementById('dataGasto').value;
            payload.valor = parseFloat(document.getElementById('valGasto').value);
            payload.descricao = document.getElementById('descGasto').value;
            payload.categoria = document.getElementById('catGasto').value;
            payload.pagamento = document.getElementById('pagGasto').value;
            payload.data = dataEscolha; // Campo de data customizada
            payload.responsavel = document.querySelector('input[name="quemGastou"]:checked')?.value === 'partner'
                ? meta.parceiro_nome : meta.display_name;
        }
        else if (tipo === 'renda') {
            payload.valor = parseFloat(document.getElementById('valRenda').value);
            payload.categoria = document.getElementById('catRenda').value;
            payload.descricao = "Entrada";
            // Para renda, usamos a data de hoje como padrão se não houver campo
            payload.data = new Date().toISOString().split('T')[0];
        }
        else if (tipo === 'reserva') {
            payload.valor = parseFloat(document.getElementById('valReserva').value);
            payload.descricao = document.getElementById('descReserva').value;
            payload.categoria = "Investimento";
            payload.data = new Date().toISOString().split('T')[0];
        }

        // Validação simples
        if (!payload.valor || isNaN(payload.valor)) {
            return alert("Por favor, insira um valor válido.");
        }

        btn.disabled = true;

        // 3. Envio para o Supabase
        const { error } = await s_client.from('Lançamentos').insert([payload]);

        if (error) throw error;

        // Sucesso: Fecha modal e limpa campos
        fecharModal(`modal${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`);

        // Limpar inputs específicos
        if (tipo === 'gasto') {
            document.getElementById('valGasto').value = "";
            document.getElementById('descGasto').value = "";
        }

        // Atualiza a tela para mostrar o novo gasto
        await atualizarDashboard();

    } catch (err) {
        console.error("Erro detalhado:", err);
        alert("Erro ao salvar: " + err.message);
    } finally {
        btn.disabled = false;
    }
}

window.excluirAcao = async (idOuNome, acao) => {
    if (!confirm("Confirmar exclusão?")) return;
    try {
        let query = s_client.from('Lançamentos').delete();
        if (acao === 'item') query = query.eq('id', idOuNome);
        else query = query.eq('tipo', 'reserva').eq('descricao', idOuNome);

        const { error } = await query;
        if (error) throw error;
        await atualizarDashboard();
    } catch (err) {
        alert("Erro ao excluir: " + err.message);
    }
};

window.navegar = (pagina) => {
    // 1. Atualiza visual dos botões
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('active');
        if (btn.innerText.toLowerCase().includes(pagina)) btn.classList.add('active');
    });

    // 2. Lógica de troca de telas (Exemplo simples)
    // Você pode colocar cada parte do seu HTML dentro de uma <section id="tela-inicio"> etc.
    const telas = ['init', 'extract', 'reserve', 'perfil'];
    telas.forEach(t => {
        const el = document.getElementById(`screen-${t}`);
        if (el) el.style.display = (t === pagina) ? 'block' : 'none';
    });

    console.log(`Navegando para: ${pagina}`);
};

// Ajuste na função toggleFab para fechar ao clicar fora
window.toggleFab = () => {
    const options = document.getElementById('fabOptions');
    const btn = document.querySelector('.fab-main');
    if (options.style.display === 'flex') {
        options.style.display = 'none';
        btn.style.transform = 'rotate(0deg)';
    } else {
        options.style.display = 'flex';
        btn.style.transform = 'rotate(45deg)';
    }
};
window.abrirModal = function (id) {
    document.getElementById(id).style.display = 'flex';
    // Adicione isso à sua função abrirModal('modalGasto')
    const inputData = document.getElementById('dataGasto');
    if (!inputData.value) { // Só preenche se estiver vazio
        const hoje = new Date().toISOString().split('T')[0];
        inputData.value = hoje;
    }
}
window.fecharModal = (id) => document.getElementById(id).style.display = 'none';

// Exportações
window.enviar = enviar;
window.excluirAcao = excluirAcao;
window.abrirModal = abrirModal;
window.fecharModal = fecharModal;