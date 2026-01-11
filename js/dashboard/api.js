// js/dashboard/api.js
// = FUNÇÕES DE ALTERAÇÃO OU BUSCA DE DADOS DO BANCO DE DADOS =
// ============================================================

import { s_client } from '../../config.js';

export async function buscarDadosLancamentos(idsParaBuscar) {
    const { data, error } = await s_client
        .from('Lançamentos')
        .select('*')
        .in('user_id', idsParaBuscar);
    if (error) throw error;
    return data;
}

export async function salvarLancamentoBD(payload) {
    const { error } = await s_client.from('Lançamentos').insert([payload]);
    if (error) throw error;
    return true;
}

export async function excluirLancamentoBD(idOuNome, acao) {
    let query = s_client.from('Lançamentos').delete();
    if (acao === 'item') query = query.eq('id', idOuNome);
    else query = query.eq('tipo', 'reserva').eq('descricao', idOuNome);

    const { error } = await query;
    if (error) throw error;
    return true;
}