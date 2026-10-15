/* ==========================================================================
   LOVE VIAGENS — Início da área logada: saldo, próximas viagens e vitrine
   ========================================================================== */

(async () => {
  const conta = await LV.exigirLogin();
  if (!conta) return;

  const nome = LV.primeiroNome(conta.nome);
  document.getElementById('saudacao').textContent = nome ? `Olá, ${nome}` : 'Olá';
  document.getElementById('kpi-saldo').textContent = conta.saldoOk ? LV.moeda(conta.saldo) : '—';

  const aviso = document.getElementById('aviso-saldo');
  if (conta.tipo === 'google') {
    aviso.innerHTML = 'Esta conta Google ainda não está ligada a uma conta Love. Para usar o saldo dos seus presentes, entre com a sua conta Love em <a href="/login">Entrar</a>.';
    aviso.hidden = false;
  } else if (!conta.saldoOk) {
    aviso.textContent = 'Não foi possível ler o saldo agora. Tente de novo em instantes.';
    aviso.hidden = false;
  }

  // Próximas viagens (até 3)
  const lista = document.getElementById('lista-proximas');
  const reservas = (await LV.reservas()).filter(r => !r.passada && r.status !== 'cancelada').slice(0, 3);
  lista.innerHTML = reservas.length ? reservas.map(r => `
      <a class="list-item" href="/minhas-viagens">
        <div class="grow">
          <div class="title">${LV.escape(r.titulo)} ${r.simulada ? '<span class="badge badge-warning">simulação</span>' : ''}</div>
          <div class="sub">${LV.escape(r.destino || '')} · ${r.inicio ? LV.dataLonga(r.inicio) : 'datas a combinar'} · ${LV.escape(LV.statusReserva(r.status))}</div>
        </div>
        <div class="amount">${LV.moeda(r.valor_saldo)}</div>
      </a>`).join('')
    : '<div class="empty" style="margin:1.25rem">Nenhuma viagem reservada ainda. Escolha um pacote abaixo e troque pelo seu saldo.</div>';

  // Vitrine (até 6 na home; a lista completa fica em /viagens)
  LV.montarVitrine({ grid: 'pacotes-grid', chips: 'chips-tipo', busca: 'busca', contador: 'contador', aviso: 'aviso-demo', limite: 6 });
})();
