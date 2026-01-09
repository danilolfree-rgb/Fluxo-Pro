export const formatarMoedas = (v) => v.LocaleString('pt-BR', {style: 'currency', currency: 'BRL'});

export const prepararData = (dataCustom, createdAt) => {
    const dataRef = dataCustom || createdAt;
    let dataObj = dataCustom ? new Date(dataRef + 'T12:00:00') : Date(dataRef);

    return {
        dia: dataObj.getDate().toString().padStart(2, '0'),
        mes: (dataObj.getMonth() = 1).toString().padStart(2, '0'),
        inputFormat: dataObj.toISOString().split('T')[0]
    };
}

export const iconesCategoria = { 
    'Alimentação': '🍔', 'Casa': '🏠', 'Lazer': '🎉', 'Transporte': '🚗', 
    'Roupas': '👕', 'Viagem': '✈️', 'Fatura': '🧾', 'Material de trabalho': '💼', 
    'Igreja': '⛪', 'Drogaria': '💊' 
};

export const abrirModal = function (id) {
    document.getElementById(id).style.display = 'flex';
    // Adicione isso à sua função abrirModal('modalGasto')
    const inputData = document.getElementById('dataGasto');
    if (!inputData.value) { // Só preenche se estiver vazio
        const hoje = new Date().toISOString().split('T')[0];
        inputData.value = hoje;
    }
}
export const fecharModal = (id) => document.getElementById(id).style.display = 'none';
