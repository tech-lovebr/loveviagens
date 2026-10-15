/* ==========================================================================
   LOVE VIAGENS — Checkout: trocar saldo Love por um pacote
   Pacote real → RPC loveviagens_trocar() (debita a carteira certa, cria a
   reserva e soma a vaga vendida, tudo numa transação no banco).
   Pacote "demo-…" → simulação guardada só neste navegador.
   ========================================================================== */

(async () => {
  const conta = await LV.exigirLogin();
  if (!conta) return;

  const p = await LV.pacote(LV.param('id'));
  const root = document.getElementById('checkout-root');
  if (!p) {
    root.innerHTML = '<div class="empty" style="margin:3rem 0">Pacote não encontrado. <a href="/">Voltar para a vitrine</a></div>';
    return;
  }
  if (LV.vagasRestantes(p) === 0) {
    root.innerHTML = `<div class="empty" style="margin:3rem 0">Este pacote está esgotado. <a href="/">Ver outros pacotes</a></div>`;
    return;
  }

  const preco = Number(p.preco);
  const saldo = conta.saldoOk ? Math.max(conta.saldo, 0) : 0;
  const maxSaldo = Math.min(saldo, preco);
  let usar = maxSaldo;

  root.innerHTML = `
    <div class="page-head"><h1>Trocar saldo por viagem</h1></div>
    <div class="checkout-layout">
      <div>
        <div class="card">
          <div class="card-head"><h3>1. Pacote escolhido</h3></div>
          <div class="card-body resumo-pacote">
            <img src="${LV.escape(p.imagem_url || '')}" alt="" onerror="this.style.visibility='hidden'">
            <div class="grow">
              <div class="strong">${LV.escape(p.titulo)}</div>
              <div class="muted small">${LV.escape(p.destino || '')} · ${LV.escape(LV.periodo(p))}</div>
            </div>
            <div class="strong">${LV.moeda(preco)}</div>
          </div>
        </div>

        <div class="card" style="margin-top:1.25rem">
          <div class="card-head"><h3>2. Quanto do saldo Love usar</h3><span class="badge badge-primary">${LV.escape((LV.TIPOS_CONTA[conta.tipo] || {}).rotulo || '')}</span></div>
          <div class="card-body">
            ${conta.tipo === 'google' ? `<div class="alert alert-warning" style="margin-bottom:1rem">Esta conta Google não está ligada a uma conta Love, então não há saldo para usar. Entre com a sua conta Love para trocar o saldo dos presentes.</div>` : ''}
            ${conta.tipo !== 'google' && !conta.saldoOk ? `<div class="alert alert-warning" style="margin-bottom:1rem">Não foi possível ler o seu saldo agora.</div>` : ''}
            ${conta.saldoOk && saldo === 0 ? `<div class="alert alert-info" style="margin-bottom:1rem">Seu saldo Love está zerado. Você ainda pode reservar pagando o valor total à parte.</div>` : ''}
            <div class="info-rows" style="margin-top:0">
              <div><span>Saldo disponível</span><span class="strong">${LV.moeda(saldo)}</span></div>
              <div><span>Valor do pacote</span><span class="strong">${LV.moeda(preco)}</span></div>
            </div>
            <label class="field" style="margin-top:0.5rem">
              <span class="field-label">Usar do saldo</span>
              <input class="range" type="range" id="range-saldo" min="0" max="${maxSaldo}" step="1" value="${usar}" ${maxSaldo === 0 ? 'disabled' : ''}>
              <input class="field-input" type="number" id="input-saldo" min="0" max="${maxSaldo}" step="0.01" value="${usar.toFixed(2)}" ${maxSaldo === 0 ? 'disabled' : ''}>
              <span class="field-hint">Você pode usar até ${LV.moeda(maxSaldo)} neste pacote.</span>
            </label>
          </div>
        </div>

        <div class="card" style="margin-top:1.25rem" id="card-restante" ${preco - usar <= 0 ? 'hidden' : ''}>
          <div class="card-head"><h3>3. Como pagar o restante</h3></div>
          <div class="card-body">
            <div class="radio-list">
              <label><input type="radio" name="pagamento" value="pix" checked> Pix (código enviado por e-mail após a reserva)</label>
              <label><input type="radio" name="pagamento" value="cartao"> Cartão de crédito${p.parcelas > 1 ? ` em até ${p.parcelas}x` : ''}</label>
            </div>
            <p class="muted small" style="margin:0.75rem 0 0">Nesta versão inicial o pagamento do restante fica pendente e a equipe Love entra em contato para concluir.</p>
          </div>
        </div>
      </div>

      <aside class="sticky">
        <div class="card">
          <div class="card-head"><h3>Resumo</h3></div>
          <div class="card-body">
            <div class="totais">
              <div><span>Pacote</span><span>${LV.moeda(preco)}</span></div>
              <div><span>Saldo Love usado</span><span id="res-saldo">− ${LV.moeda(usar)}</span></div>
              <div class="total"><span>Restante a pagar</span><span id="res-restante">${LV.moeda(preco - usar)}</span></div>
            </div>
            <div class="divider"></div>
            <button class="btn btn-primary btn-lg btn-block" id="btn-confirmar">Confirmar troca</button>
            <p class="muted small" style="margin:0.75rem 0 0">Ao confirmar, o valor escolhido sai do seu saldo Love e a reserva aparece em Minha conta.</p>
            ${LV.ehDemo(p) ? '<div class="alert alert-warning" style="margin-top:0.75rem">Pacote de demonstração: a troca será simulada e não mexe no seu saldo real.</div>' : ''}
            <div id="checkout-erro" class="alert alert-danger" style="margin-top:0.75rem" hidden></div>
          </div>
        </div>
      </aside>
    </div>`;

  const range = document.getElementById('range-saldo');
  const input = document.getElementById('input-saldo');
  const resSaldo = document.getElementById('res-saldo');
  const resRestante = document.getElementById('res-restante');
  const cardRestante = document.getElementById('card-restante');
  const btn = document.getElementById('btn-confirmar');
  const erro = document.getElementById('checkout-erro');

  function atualizar(v) {
    usar = Math.min(Math.max(Number(v) || 0, 0), maxSaldo);
    usar = Math.round(usar * 100) / 100;
    range.value = usar;
    if (document.activeElement !== input) input.value = usar.toFixed(2);
    resSaldo.textContent = '− ' + LV.moeda(usar);
    resRestante.textContent = LV.moeda(preco - usar);
    cardRestante.hidden = preco - usar <= 0;
  }
  range.addEventListener('input', () => atualizar(range.value));
  input.addEventListener('input', () => atualizar(input.value));
  input.addEventListener('blur', () => { input.value = usar.toFixed(2); });

  btn.addEventListener('click', async () => {
    erro.hidden = true;
    const restante = Math.round((preco - usar) * 100) / 100;
    const pagamento = (document.querySelector('input[name="pagamento"]:checked') || {}).value || null;
    btn.disabled = true;
    btn.textContent = 'Confirmando…';

    try {
      let reserva;
      if (LV.ehDemo(p)) {
        reserva = {
          id: 'demo-' + Date.now(), pacote_id: p.id, titulo: p.titulo, destino: p.destino,
          preco, valor_saldo: usar, valor_restante: restante, pagamento_restante: restante > 0 ? pagamento : null,
          status: restante > 0 ? 'pendente_pagamento' : 'confirmada', created_at: new Date().toISOString()
        };
        LV.salvarReservaDemo(reserva);
      } else {
        const { data, error } = await supabaseClient.rpc('loveviagens_trocar', {
          p_pacote_id: p.id, p_usar_saldo: usar, p_pagamento_restante: restante > 0 ? pagamento : null
        });
        if (error) throw error;
        reserva = data;
      }
      sucesso(reserva);
    } catch (e) {
      const msg = /function .*loveviagens_trocar/i.test(e.message || '')
        ? 'A função de troca ainda não existe no Supabase. Rode supabase/001_loveviagens.sql no projeto da Love.'
        : (e.message || 'Não foi possível concluir a troca.');
      erro.textContent = msg;
      erro.hidden = false;
      btn.disabled = false;
      btn.textContent = 'Confirmar troca';
    }
  });

  function sucesso(r) {
    LV._conta = null; // força recarregar o saldo no header
    root.innerHTML = `
      <div class="page-head"><h1>Troca confirmada</h1></div>
      <div class="card" style="max-width:640px;margin-bottom:3rem">
        <div class="card-body">
          <div class="alert alert-success" style="margin-bottom:1rem">${r.status === 'pendente_pagamento' ? 'Reserva registrada. Falta só o pagamento do restante.' : 'Sua viagem está reservada!'}</div>
          <div class="info-rows" style="margin-top:0">
            <div><span>Pacote</span><span class="strong">${LV.escape(r.titulo || p.titulo)}</span></div>
            <div><span>Saldo Love usado</span><span class="strong">${LV.moeda(r.valor_saldo)}</span></div>
            <div><span>Restante a pagar</span><span class="strong">${LV.moeda(r.valor_restante)}</span></div>
            <div><span>Status</span><span class="strong">${r.status === 'pendente_pagamento' ? 'Aguardando pagamento do restante' : 'Confirmada'}</span></div>
          </div>
          ${String(r.id).startsWith('demo-') ? '<p class="muted small">Esta foi uma simulação com um pacote de demonstração; nada foi debitado do seu saldo real.</p>' : ''}
          <div style="display:flex;gap:0.75rem;margin-top:1rem">
            <a class="btn btn-primary" href="/minha-conta">Ver em Minha conta</a>
            <a class="btn btn-outline" href="/">Voltar à vitrine</a>
          </div>
        </div>
      </div>`;
    LV.montarCasca();
  }
})();
