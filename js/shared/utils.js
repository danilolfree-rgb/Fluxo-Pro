// js/shared/utils.js
// = FUNÇÕES QUE NÃO DEPENDEM DE BANCO OU CÁLCULO =
// ================================================

// --- FORMATA OS NÚMEROS PARA REAL BR ---

export const formatarMoeda = (v) => {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// --- FORMATA A DATA PARA NÃO DAR ERRO NO FUSO HORÁRIO ---

export const prepararData = (dataCustom, createdAt) => {
    const dataRef = dataCustom || createdAt;
    // O 'T12:00:00' evita que o navegador mude o dia sozinho
    let dataObj = dataCustom ? new Date(dataRef + 'T12:00:00') : new Date(dataRef);
    
    return {
        dia: dataObj.getDate().toString().padStart(2, '0'),
        mes: (dataObj.getMonth() + 1).toString().padStart(2, '0'),
        ano: dataObj.getFullYear()
    };
};

// --- TEXTOS E ICONES DO SELECT DE DESCRIÇÃO ---

export const CATEGORIAS_CONFIG = {
    'Alimentação': { icon: '🍔', label: 'Alimentação' },
    'Casa': { icon: '🏠', label: 'Casa / Aluguel' },
    'Lazer': { icon: '🎉', label: 'Lazer / Viagem' },
    'Transporte': { icon: '🚗', label: 'Transporte / Combustível' },
    'Roupas': { icon: '👕', label: 'Roupas / Acessórios' },
    'Fatura': { icon: '🧾', label: 'Cartão de Crédito / Fatura' },
    'Trabalho': { icon: '💼', label: 'Material de Trabalho' },
    'Igreja': { icon: '⛪', label: 'Igreja / Doações' },
    'Saúde': { icon: '💊', label: 'Farmácia / Drogaria' },
    'Outros': { icon: '💸', label: 'Outros' }
};