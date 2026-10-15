/* ==========================================================================
   LOVE VIAGENS — Minha conta: tipo da conta, saldo, reservas e extrato
   ========================================================================== */

(async () => {
  const conta = await LV.exigirLogin();
  if (!conta) return;

  const tipo = LV.TIPOS_CONTA[conta.tipo] || LV.TIPOS_CONTA.google;
  document.getElementById('conta-nome').textContent = conta.nome;
  document.getElementById('conta-email').textContent = conta.email || '';
  document.getElementById('conta-tipo').innerHTML =
    `<span class="badge ${conta.tipo === 'google' ? 'badge-neutral' : 'badge-primary'}">${tipo.rotulo}</span> <span class="muted small">${tipo.detalhe}</span>`;
  document.getElementById('btn-sair').addEventListener('click', LV.sair);

  const avatarEl = document.getElementById('conta-avatar');
  avatarEl.innerHTML = conta.avatar
    ? `<img src="${LV.escape(conta.avatar)}" alt="" referrerpolicy="no-referrer">`
    : (conta.nome || '?').trim().charAt(0).toUpperCase();

  // Saldo
  document.getElementById('kpi-saldo').textContent = conta.saldoOk ? LV.moeda(conta.saldo) : '—';
  const avisoSaldo = document.getElementById('aviso-saldo');
  if (conta.tipo === 'google') {
    avisoSaldo.innerHTML = 'Esta conta Google ainda não está ligada a uma conta Love. Para usar o saldo dos seus presentes, entre com a mesma conta que você usa em <a href="https://love.com.br" target="_blank" rel="noopener">love.com.br</a> ou no Hub B2B.';
    avisoSaldo.hidden = false;
  } else if (!conta.saldoOk) {
    avisoSaldo.textContent = 'Não foi possível ler o saldo agora. Rode a migration supabase/001_loveviagens.sql no projeto Supabase da Love ou tente de novo mais tarde.';
    avisoSaldo.hidden = false;
  }

  const creditos = conta.transacoes.filter(t => t.type === 'credit').reduce((s, t) => s + Number(t.amount || 0), 0);
  const debitos = conta.transacoes.filter(t => t.type === 'debit').reduce((s, t) => s + Number(t.amount || 0), 0);
  document.getElementById('kpi-recebido').textContent = LV.moeda(creditos);
  document.getElementById('kpi-usado').textContent = LV.moeda(debitos);

  // Reservas: as reais (tabela viagens_reservas) + as simuladas deste navegador
  let reservas = [];
  try {
    const { data, error } = await supabaseClient.from('viagens_reservas').select('*').eq('user_id', conta.id).order('created_at', { ascending: false });
    if (!error && data) reservas = data;
  } catch (e) {}
  const demo = LV.reservasDemo().map(r => ({ ...r, simulada: true }));
  reservas = [...reservas, ...demo].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const listaReservas = document.getElementById('lista-reservas');
  if (!reservas.length) {
    listaReservas.innerHTML = '<div class="empty" style="margin:1.25rem">Você ainda não trocou saldo por nenhuma viagem. <a href="/#pacotes">Ver pacotes</a></div>';
  } else {
    listaReservas.innerHTML = reservas.map(r => `
      <div class="list-item">
        <div class="grow">
          <div class="title">${LV.escape(r.titulo)} ${r.simulada ? '<span class="badge badge-warning">simulação</span>' : ''}</div>
          <div class="sub">${LV.escape(r.destino || '')} · ${LV.data(r.created_at)} · ${LV.escape(statusReserva(r.status))}</div>
        </div>
        <div style="text-align:right">
          <div class="amount">${LV.moeda(r.valor_saldo)} <span class="muted small">em saldo</span></div>
          ${Number(r.valor_restante) > 0 ? `<div class="sub">+ ${LV.moeda(r.valor_restante)} a pagar</div>` : ''}
        </div>
      </div>`).join('');
  }

  // Extrato
  const listaExtrato = document.getElementById('lista-extrato');
  const tx = conta.transacoes.slice(0, 12);
  if (!tx.length) {
    listaExtrato.innerHTML = `<div class="empty" style="margin:1.25rem">${conta.saldoOk ? 'Nenhuma movimentação na carteira ainda.' : 'Extrato indisponível.'}</div>`;
  } else {
    listaExtrato.innerHTML = tx.map(t => `
      <div class="list-item">
        <div class="grow">
          <div class="title">${LV.escape(t.description || (t.type === 'credit' ? 'Crédito' : 'Débito'))}</div>
          <div class="sub">${LV.data(t.created_at)}</div>
        </div>
        <div class="amount ${t.type}">${t.type === 'credit' ? '+' : '−'} ${LV.moeda(t.amount)}</div>
      </div>`).join('');
  }

  function statusReserva(s) {
    return { confirmada: 'Confirmada', pendente_pagamento: 'Aguardando pagamento do restante', cancelada: 'Cancelada' }[s] || s || 'Confirmada';
  }
})();
