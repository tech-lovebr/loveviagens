/* ==========================================================================
   LOVE VIAGENS — Minha conta: tipo da conta, saldo e extrato
   ========================================================================== */

(async () => {
  const conta = await LV.exigirLogin();
  if (!conta) return;

  const tipo = LV.TIPOS_CONTA[conta.tipo] || LV.TIPOS_CONTA.google;
  document.getElementById('conta-nome').textContent = conta.nome;
  document.getElementById('conta-email').textContent = conta.email || '';
  document.getElementById('conta-tipo').innerHTML =
    `<span class="badge ${conta.tipo === 'google' ? 'badge-neutral' : 'badge-primary'}">${tipo.rotulo}</span> <span class="muted small">${tipo.detalhe}</span>`;
  document.getElementById('info-tipo').textContent = tipo.rotulo;
  document.getElementById('info-email').textContent = conta.email || '—';

  const avatarEl = document.getElementById('conta-avatar');
  avatarEl.innerHTML = conta.avatar
    ? `<img src="${LV.escape(conta.avatar)}" alt="" referrerpolicy="no-referrer">`
    : LV.iniciais(conta.nome);

  // Saldo
  document.getElementById('kpi-saldo').textContent = conta.saldoOk ? LV.moeda(conta.saldo) : '—';
  const avisoSaldo = document.getElementById('aviso-saldo');
  if (conta.tipo === 'google') {
    avisoSaldo.innerHTML = 'Esta conta Google ainda não está ligada a uma conta Love. Para usar o saldo dos seus presentes, entre com a sua conta Love em <a href="/login">Entrar</a>.';
    avisoSaldo.hidden = false;
  } else if (!conta.saldoOk) {
    avisoSaldo.textContent = 'Não foi possível ler o saldo agora. Tente de novo em instantes.';
    avisoSaldo.hidden = false;
  }

  const creditos = conta.transacoes.filter(t => t.type === 'credit').reduce((s, t) => s + Number(t.amount || 0), 0);
  const debitos = conta.transacoes.filter(t => t.type === 'debit').reduce((s, t) => s + Number(t.amount || 0), 0);
  document.getElementById('kpi-recebido').textContent = LV.moeda(creditos);
  document.getElementById('kpi-usado').textContent = LV.moeda(debitos);

  const reservas = await LV.reservas();
  document.getElementById('info-reservas').textContent = String(reservas.length);

  // Extrato
  const listaExtrato = document.getElementById('lista-extrato');
  const tx = conta.transacoes.slice(0, 20);
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
})();
