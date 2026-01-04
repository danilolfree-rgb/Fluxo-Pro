
export function renderModalRegister() {
    const html = `
        <div id="modalPerfil" class="custom-modal">
        <div class="custom-modal-content">
            <div class="logo-login logo-modal">AURA</div>
            <h4>Configure seu Perfil</h4>
            <p class="subtitle-modal">Como você deseja utilizar a plataforma?</p>

            <div class="modal-body-form">
                <label class="title-labels-login">Modo de Uso</label>
                <select id="tipoUso" class="form-control mb-3" onchange="toggleCamposCasal()">
                    <option value="individual">Individual (Só eu)</option>
                    <option value="casal">Em Casal (Nós dois)</option>
                </select>

                <div class="modal-grid">
                    <div>
                        <label class="title-labels-login">Seu Nome</label>
                        <input type="text" id="nomeUser" class="form-control" placeholder="Ex: Lucas">
                    </div>
                    <div>
                        <label class="title-labels-login label-caps">Gênero</label>
                        <select id="generoUser" class="form-control">
                            <option value="m">Masc.</option>
                            <option value="f">Fem.</option>
                        </select>
                    </div>
                </div>

                <div id="sessaoCasal" class="sessao-casal-pura">
                    <div class="modal-grid">
                        <div>
                            <label class="title-labels-login">Nome do Parceiro</label>
                            <input type="text" id="nomeParceiro" class="form-control" placeholder="Ex: Ana">
                        </div>
                        <div>
                            <label class="title-labels-login">Gênero</label>
                            <select id="generoParceiro" class="form-control">
                                <option value="f">Fem.</option>
                                <option value="m">Masc.</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div class="modal-footer-grid">
                <button class="btn-voltar" onclick="closeModal()">Voltar</button>
                <button class="btn-login main-btn" onclick="finishRegister()">FINALIZAR</button>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
}