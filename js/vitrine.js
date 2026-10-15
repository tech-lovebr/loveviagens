/* ==========================================================================
   LOVE VIAGENS — Vitrine pública (home)
   ========================================================================== */

(async () => {
  const pacotes = await LV.pacotes();

  // Destaques no topo
  const destaquesEl = document.getElementById('destaques-grid');
  const destaques = pacotes.filter(p => p.destaque).slice(0, 3);
  destaquesEl.innerHTML = destaques.map(LV.cardPacote).join('');
  document.getElementById('sec-destaques').hidden = !destaques.length;

  const vitrine = await LV.montarVitrine({ grid: 'pacotes-grid', chips: 'chips-tipo', busca: 'busca', contador: 'contador', aviso: 'aviso-demo' });

  const buscaHero = document.getElementById('busca-hero');
  document.getElementById('form-busca-hero').addEventListener('submit', e => {
    e.preventDefault();
    vitrine.setBusca(buscaHero.value);
    document.getElementById('pacotes').scrollIntoView({ behavior: 'smooth' });
  });
})();
