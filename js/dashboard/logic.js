// js/dashboard/logic.js
// == FUNÇÕES RESPONSÁVEIS POR CÁLCULOS OU LÓGICAS FINANCEIRAS ==
// ==============================================================

// --- CALCULA OS DADOS FINANCEIROS E FAZ UM RESUMO ---

export function calcularResumoMensal(todosDados, mesSelecionado) {
    let totalGanhos = 0;
    let totalGastos = 0;
    let reservas = {};

    todosDados.forEach(item => {
        const valor = parseFloat(item.valor) || 0;

        // Reservas (Independente do mês, somamos o total acumulado)
        if (item.tipo === 'reserva') {
            reservas[item.descricao] = (reservas[item.descricao] || 0) + valor;
        }

        // Filtro por Mês (Ganhos e Gastos)
        if (item.mes === mesSelecionado) {
            if (item.tipo === 'renda') {
                totalGanhos += valor;
            } else if (item.tipo === 'gasto') {
                totalGastos += valor;
            }
        }
    });

    return {
        ganhos: totalGanhos,
        gastos: totalGastos,
        saldo: totalGanhos - totalGastos,
        reservas: reservas
    };
}

// --- ANALISA OS DADOS E BUSCA OS MAIORES ---

export function calcularAnalises(listaGastos) {
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

    return {
        categoria: { nome: maiorCat[0], valor: maiorCat[1] },
        pagamento: { nome: maiorPag[0], valor: maiorPag[1] },
        quem: { nome: maiorUser[0], valor: maiorUser[1] }
    };
}