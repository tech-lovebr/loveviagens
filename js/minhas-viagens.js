/* ==========================================================================
   LOVE VIAGENS — Minhas viagens: próximas e passadas
   ========================================================================== */

(async () => {
  const conta = await LV.exigirLogin();
  if (!conta) return;

  const todas = await LV.reservas();
  const grupos = {
    proximas: todas.filter(r => !r.passada && r.status !== 'cancelada'),
    passadas: todas.filter(r => r.passada || r.status === 'cancelada')
  };
  document.getElementById('count-proximas').textContent = grupos.proximas.length || '';
  document.getElementById('count-passadas').textContent = grupos.passadas.length || '';

  const lista = document.getElementById('lista');
  const vazio = {
    proximas: 'Nenhuma viagem marcada. <a href="/viagens">Escolha um pacote</a> e troque pelo seu saldo Love.',
    passadas: 'Nenhuma viagem passada ainda.'
  };
  function render(aba) {
    const itens = grupos[aba];
    lista.innerHTML = itens.length ? itens.map(LV.cardReserva).join('') : `<div class="empty">${vazio[aba]}</div>`;
  }

  const tabs = document.getElementById('tabs');
  tabs.addEventListener('click', e => {
    const btn = e.target.closest('.tab');
    if (!btn) return;
    tabs.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === btn));
    render(btn.dataset.aba);
  });
  render('proximas');
})();
