/* ==========================================================================
   LOVE VIAGENS — Página do pacote
   ========================================================================== */

(async () => {
  const id = LV.param('id');
  const root = document.getElementById('pacote-root');
  const p = await LV.pacote(id);

  if (!p) {
    root.innerHTML = '<div class="empty" style="margin:3rem 0">Pacote não encontrado. <a href="/">Voltar para a vitrine</a></div>';
    return;
  }
  document.title = `${p.titulo} — Love Viagens`;

  const restantes = LV.vagasRestantes(p);
  const esgotado = restantes === 0;
  const inclui = Array.isArray(p.inclui) ? p.inclui : [];
  const conta = await LV.conta();
  const saldo = conta && conta.saldoOk ? conta.saldo : null;
  const cobre = saldo !== null ? Math.min(saldo, Number(p.preco)) : null;

  root.innerHTML = `
    <div class="breadcrumb"><a href="/">Pacotes</a> › ${LV.escape(LV.TIPOS_VIAGEM[p.tipo] || p.tipo)} › ${LV.escape(p.titulo)}</div>
    <div class="pacote-layout">
      <div>
        <div class="pacote-hero"><img src="${LV.escape(p.imagem_url || '')}" alt="" onerror="this.style.display='none'"></div>
        <span class="pacote-destino">${LV.escape(p.destino || '')}</span>
        <h1 style="font-size:2rem">${LV.escape(p.titulo)}</h1>
        <p class="muted">${LV.escape(LV.TIPOS_VIAGEM[p.tipo] || p.tipo)} · ${LV.escape(LV.periodo(p))}${restantes !== null ? ` · ${esgotado ? 'Esgotado' : restantes + ' vagas disponíveis'}` : ''}</p>
        <p style="font-size:1.0625rem">${LV.escape(p.descricao || '')}</p>

        ${inclui.length ? `
        <div class="card" style="margin-top:1.5rem">
          <div class="card-head"><h3>O que está incluso</h3></div>
          <div class="card-body"><ul class="inclui-list">${inclui.map(i => `<li>${LV.escape(i)}</li>`).join('')}</ul></div>
        </div>` : ''}

        <div class="card" style="margin-top:1.25rem">
          <div class="card-head"><h3>Como pagar com o saldo Love</h3></div>
          <div class="card-body">
            <p>Todo valor que você recebeu de presentes na Love fica disponível como saldo. Aqui você escolhe quanto desse saldo quer usar neste pacote. Se o saldo não cobrir tudo, a diferença pode ser paga à parte.</p>
            <p class="muted small" style="margin:0">A reserva é confirmada na hora e aparece em Minha conta, junto com o extrato da carteira.</p>
          </div>
        </div>
      </div>

      <aside class="sticky">
        <div class="card preco-box">
          <div class="card-body">
            ${p.preco_de ? `<div class="de">De <s>${LV.moeda(p.preco_de)}</s></div>` : ''}
            <div class="valor">${LV.moeda(p.preco)}</div>
            <div class="parcelas">${p.parcelas > 1 ? `ou ${p.parcelas}x de ${LV.moeda(p.preco / p.parcelas)} sem juros` : 'por pessoa / pacote'}</div>

            <div class="info-rows">
              <div><span>Duração</span><span class="strong">${LV.escape(LV.periodo(p))}</span></div>
              ${restantes !== null ? `<div><span>Vagas</span><span class="strong">${esgotado ? 'Esgotado' : restantes + ' de ' + p.vagas}</span></div>` : ''}
              <div><span>Tipo</span><span class="strong">${LV.escape(LV.TIPOS_VIAGEM[p.tipo] || p.tipo)}</span></div>
            </div>

            <div class="divider"></div>

            ${conta ? `
              <div class="info-rows" style="margin-top:0">
                <div><span>Seu saldo Love</span><span class="strong">${saldo !== null ? LV.moeda(saldo) : '—'}</span></div>
                ${cobre !== null ? `<div><span>Cobre deste pacote</span><span class="strong">${LV.moeda(cobre)}</span></div>` : ''}
                ${cobre !== null && cobre < p.preco ? `<div><span>Ficaria faltando</span><span class="strong">${LV.moeda(p.preco - cobre)}</span></div>` : ''}
              </div>
              <a class="btn btn-primary btn-lg btn-block" href="/checkout?id=${encodeURIComponent(p.id)}" ${esgotado ? 'aria-disabled="true" style="pointer-events:none;opacity:.55"' : ''}>${esgotado ? 'Esgotado' : 'Trocar saldo por esta viagem'}</a>
            ` : `
              <a class="btn btn-primary btn-lg btn-block" href="/login?next=${encodeURIComponent('/checkout?id=' + p.id)}" ${esgotado ? 'aria-disabled="true" style="pointer-events:none;opacity:.55"' : ''}>${esgotado ? 'Esgotado' : 'Entrar e usar meu saldo'}</a>
              <p class="muted small" style="margin:0.75rem 0 0;text-align:center">Entre com o Google ou com a sua conta Love para ver o saldo disponível.</p>
            `}
            ${LV.ehDemo(p) ? '<p class="small muted" style="margin:0.75rem 0 0">Pacote de demonstração: a reserva será simulada.</p>' : ''}
          </div>
        </div>
      </aside>
    </div>`;
})();
