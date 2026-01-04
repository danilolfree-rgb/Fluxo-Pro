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

// --- LÓGICA DE DADOS ---
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

        // 1. Processamento de valores
        todosDados.forEach(i => {
            const v = parseFloat(i.valor) || 0;
            if (i.tipo === 'reserva') reservas[i.descricao] = (reservas[i.descricao] || 0) + v;
            if (i.mes === mes) {
                if (i.tipo === 'renda') gnh += v;
                else if (i.tipo === 'gasto') gst += v;
            }
        });

        // 2. Atualiza UI Principal
        document.getElementById('saldoTotal').innerText = formatarMoeda(gnh - gst);
        document.getElementById('resumoGanhos').innerText = formatarMoeda(gnh);
        document.getElementById('resumoGastos').innerText = formatarMoeda(gst);
        const subtitulo = document.getElementById('subtituloAura');
        if (subtitulo) subtitulo.innerText = "Resumo atualizado com sucesso ✨";

        // 3. Renderiza Reservas
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

        // 4. Renderiza Histórico (Moderno/Mobile)
        const tabelaBody = document.getElementById('tabelaGastosBody');
        const tempLinha = document.getElementById('temp-linha-gasto');
        if (tabelaBody && tempLinha) {
            tabelaBody.innerHTML = "";
            const listaGastos = todosDados
                .filter(i => i.tipo === 'gasto' && i.mes === mes)
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            listaGastos.forEach(g => {
                const clone = tempLinha.content.cloneNode(true);
                // Usamos a classe do novo template (extrato-dia em vez de td-dia)
                const dia = new Date(g.created_at).getDate().toString().padStart(2, '0');

                const elDia = clone.querySelector('.extrato-dia') || clone.querySelector('.td-dia');
                if (elDia) elDia.innerText = dia;

                clone.querySelector('.td-principal').innerText = g.descricao || 'Gasto';
                clone.querySelector('.td-sub').innerText = g.pagamento || 'Débito';
                clone.querySelector('.badge-cat-pura').innerText = `${icones[g.categoria] || '💸'} ${g.categoria}`;

                const badgeUser = clone.querySelector('.badge-user-pura');
                if (g.responsavel && badgeUser) {
                    // 1. Abreviar para 3 letras maiúsculas
                    const nomeAbreviado = g.responsavel.substring(0, 3).toUpperCase();
                    badgeUser.innerText = nomeAbreviado;

                    // 2. Lógica de Cores por Gênero
                    // Verificamos se o responsável é o usuário atual ou o parceiro para definir a cor
                    const meuNome = meta.display_name;
                    const meuGenero = meta.genero; // 'm' ou 'f'

                    let corBadge = "rgba(100, 116, 139, 0.2)"; // Cor padrão (cinza)
                    let textoBadge = "#94a3b8";

                    // Se o gasto for meu, uso meu gênero. Se for do parceiro, inverto o gênero.
                    let generoResponsavel = meuGenero;
                    if (g.responsavel !== meuNome) {
                        generoResponsavel = (meuGenero === 'm') ? 'f' : 'm';
                    }

                    if (generoResponsavel === 'm') {
                        corBadge = "rgba(0, 123, 255, 0.2)"; // Azul sutil
                        textoBadge = "#0d6efd";
                    } else if (generoResponsavel === 'f') {
                        corBadge = "rgba(255, 20, 147, 0.2)"; // Rosa sutil
                        textoBadge = "#ff1493";
                    }

                    badgeUser.style.backgroundColor = corBadge;
                    badgeUser.style.color = textoBadge;
                    badgeUser.style.border = `1px solid ${textoBadge}44`; // Borda suave com 44 de opacidade
                } else if (badgeUser) {
                    badgeUser.remove();
                }
                tabelaBody.appendChild(clone);
            });
        }

    } catch (err) {
        console.error("Erro no Dashboard:", err);
    }
}

// --- MODAIS E ENVIO (Igual ao seu) ---
window.abrirModal = (id) => document.getElementById(id).style.display = 'flex';
window.fecharModal = (id) => document.getElementById(id).style.display = 'none';

async function enviar(tipo) {
    const btn = document.getElementById(`btnSalvar${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`);
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
        if (!payload.valor) return alert("Insira um valor");

        btn.disabled = true;
        const { error } = await s_client.from('Lançamentos').insert([payload]);
        if (error) throw error;

        fecharModal(`modal${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`);
        atualizarDashboard();

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
    let query = s_client.from('Lançamentos').delete();
    if (acao === 'item') query = query.eq('id', idOuNome);
    else query = query.eq('tipo', 'reserva').eq('descricao', idOuNome);

    const { error } = await query;
    if (!error) atualizarDashboard();
};

// Exportações
window.enviar = enviar;
window.excluirAcao = excluirAcao;
window.abrirModal = abrirModal;
window.fecharModal = fecharModal;