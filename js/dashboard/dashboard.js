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

        // 2. Filtrar lista de gastos do mês atual
        const listaGastos = todosDados
            .filter(i => i.tipo === 'gasto' && i.mes === mes)
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

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
        const tabelaBody = document.getElementById('tabelaGastosBody');
        const tempLinha = document.getElementById('temp-linha-gasto');
        if (tabelaBody && tempLinha) {
            tabelaBody.innerHTML = "";
            listaGastos.forEach(g => {
                const clone = tempLinha.content.cloneNode(true);
                const dia = new Date(g.created_at).getDate().toString().padStart(2, '0');

                const elDia = clone.querySelector('.extrato-dia') || clone.querySelector('.td-dia');
                if (elDia) elDia.innerText = dia;

                clone.querySelector('.td-principal').innerText = g.descricao || 'Gasto';
                clone.querySelector('.td-sub').innerText = g.pagamento || 'Débito';
                clone.querySelector('.badge-cat-pura').innerText = `${icones[g.categoria] || '💸'} ${g.categoria}`;

                const badgeUser = clone.querySelector('.badge-user-pura');
                // Só mostra badge se for casal
                if (meta.tipo_uso === 'casal' && g.responsavel && badgeUser) {
                    const nomeAbreviado = g.responsavel.substring(0, 3).toUpperCase();
                    badgeUser.innerText = nomeAbreviado;
                    
                    const meuNome = meta.display_name;
                    const meuGenero = meta.genero;
                    let generoResponsavel = (g.responsavel === meuNome) ? meuGenero : (meuGenero === 'm' ? 'f' : 'm');

                    const cores = generoResponsavel === 'm' ? ["rgba(0, 123, 255, 0.2)", "#0d6efd"] : ["rgba(255, 20, 147, 0.2)", "#ff1493"];
                    badgeUser.style.backgroundColor = cores[0];
                    badgeUser.style.color = cores[1];
                    badgeUser.style.border = `1px solid ${cores[1]}44`;
                } else if (badgeUser) {
                    badgeUser.remove();
                }

                const btnExcluir = clone.querySelector('.btn-delete-small') || clone.querySelector('.btn-excluir-item');
                if (btnExcluir) btnExcluir.onclick = () => excluirAcao(g.id, 'item');

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

        const payload = {
            tipo,
            mes: document.getElementById('mesGlobal').value,
            user_id: session.user.id
        };

        const config = {
            gasto: () => ({
                valor: parseFloat(document.getElementById('valGasto').value),
                descricao: document.getElementById('descGasto').value,
                categoria: document.getElementById('catGasto').value,
                pagamento: document.getElementById('pagGasto').value,
                data: document.getElementById('dataGasto').value,
                responsavel: document.querySelector('input[name="quemGastou"]:checked')?.value === 'partner'
                    ? meta.parceiro_nome : meta.display_name
            }),
            renda: () => ({
                valor: parseFloat(document.getElementById('valRenda').value),
                categoria: document.getElementById('catRenda').value,
                descricao: "Entrada"
            }),
            reserva: () => ({
                valor: parseFloat(document.getElementById('valReserva').value),
                descricao: document.getElementById('descReserva').value,
                categoria: "Investimento"
            })
        };

        Object.assign(payload, config[tipo]());
        if (!payload.valor) return alert("Insira um valor válido");

        btn.disabled = true;
        const { error } = await s_client.from('Lançamentos').insert([payload]);
        if (error) throw error;

        fecharModal(`modal${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`);
        await atualizarDashboard();

        if (tipo === 'gasto') {
            document.getElementById('valGasto').value = "";
            document.getElementById('descGasto').value = "";
        }
    } catch (err) {
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
        if(btn.innerText.toLowerCase().includes(pagina)) btn.classList.add('active');
    });

    // 2. Lógica de troca de telas (Exemplo simples)
    // Você pode colocar cada parte do seu HTML dentro de uma <section id="tela-inicio"> etc.
    const telas = ['init', 'extract', 'reserve', 'perfil'];
    telas.forEach(t => {
        const el = document.getElementById(`screen-${t}`);
        if(el) el.style.display = (t === pagina) ? 'block' : 'none';
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
window.abrirModal = (id) => document.getElementById(id).style.display = 'flex';
window.fecharModal = (id) => document.getElementById(id).style.display = 'none';

// Exportações
window.enviar = enviar;
window.excluirAcao = excluirAcao;
window.abrirModal = abrirModal;
window.fecharModal = fecharModal;