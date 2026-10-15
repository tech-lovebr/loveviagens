/* ==========================================================================
   LOVE VIAGENS — Vitrine (home)
   ========================================================================== */

(async () => {
  const grid = document.getElementById('pacotes-grid');
  const destaquesEl = document.getElementById('destaques-grid');
  const chips = document.getElementById('chips-tipo');
  const busca = document.getElementById('busca');
  const buscaHero = document.getElementById('busca-hero');
  const aviso = document.getElementById('aviso-demo');
  const contador = document.getElementById('contador');

  let tipoAtivo = '';
  const pacotes = await LV.pacotes();
  if (LV._demo && aviso) aviso.hidden = false;

  // Destaques no topo
  const destaques = pacotes.filter(p => p.destaque).slice(0, 3);
  if (destaquesEl) {
    destaquesEl.innerHTML = destaques.length ? destaques.map(LV.cardPacote).join('') : '';
    document.getElementById('sec-destaques').hidden = !destaques.length;
  }

  function filtrar() {
    const termo = (busca.value || '').trim().toLowerCase();
    return pacotes.filter(p => {
      if (tipoAtivo && p.tipo !== tipoAtivo) return false;
      if (!termo) return true;
      return [p.titulo, p.destino, p.descricao].some(v => String(v || '').toLowerCase().includes(termo));
    });
  }

  function render() {
    const lista = filtrar();
    if (contador) contador.textContent = `${lista.length} ${lista.length === 1 ? 'pacote' : 'pacotes'}`;
    if (!lista.length) {
      grid.innerHTML = '<div class="empty">Nenhum pacote encontrado. Tente outro destino ou limpe o filtro.</div>';
      return;
    }
    grid.innerHTML = lista.map(LV.cardPacote).join('');
  }

  // Chips por tipo (só os tipos que existem na lista)
  const tiposPresentes = [...new Set(pacotes.map(p => p.tipo))];
  chips.innerHTML = ['', ...tiposPresentes].map(t =>
    `<button class="chip ${t === tipoAtivo ? 'active' : ''}" data-tipo="${t}">${t ? LV.TIPOS_VIAGEM[t] || t : 'Todos'}</button>`
  ).join('');
  chips.addEventListener('click', e => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    tipoAtivo = btn.dataset.tipo;
    chips.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c === btn));
    render();
  });

  busca.addEventListener('input', render);
  if (buscaHero) {
    document.getElementById('form-busca-hero').addEventListener('submit', e => {
      e.preventDefault();
      busca.value = buscaHero.value;
      render();
      document.getElementById('pacotes').scrollIntoView({ behavior: 'smooth' });
    });
  }

  render();
})();
