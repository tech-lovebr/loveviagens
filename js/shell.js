/* ==========================================================================
   LOVE VIAGENS — Casca comum (header, footer, sessão, saldo, pacotes, vitrine)
   Carregado em todas as páginas depois de supabase-init.js e data.js.
   Expõe window.LV com utilitários usados pelos scripts de cada página.
   ========================================================================== */

const TIPOS_VIAGEM = {
  lua_de_mel: 'Lua de mel',
  destination_wedding: 'Destination wedding',
  experiencia: 'Experiência',
  outro: 'Outro'
};

const TIPOS_CONTA = {
  index: { rotulo: 'Conta Love', detalhe: 'Anfitrião · love.com.br' },
  b2b: { rotulo: 'Conta Love B2B', detalhe: 'Fornecedor · Hub B2B' },
  google: { rotulo: 'Conta Google', detalhe: 'Ainda não ligada a uma conta Love' }
};

const LV = {
  TIPOS_VIAGEM,
  TIPOS_CONTA,
  _conta: null,
  _pacotes: null,
  _demo: false,

  /* ---------- Formatação ---------- */
  moeda(v) {
    return 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },
  numero(v) { return Number(v || 0).toLocaleString('pt-BR'); },
  data(iso) {
    if (!iso) return '';
    const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
    return d.toLocaleDateString('pt-BR');
  },
  dataLonga(iso) {
    if (!iso) return '';
    const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
    return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  },
  escape(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },
  periodo(p) {
    if (p.data_inicio && p.data_fim) return `${LV.data(p.data_inicio)} → ${LV.data(p.data_fim)}`;
    if (p.data_inicio) return `a partir de ${LV.data(p.data_inicio)}`;
    if (p.duracao_noites) return `${LV.numero(p.duracao_noites)} noites`;
    return 'Datas flexíveis';
  },
  vagasRestantes(p) {
    if (!p.vagas) return null;
    return Math.max((p.vagas || 0) - (p.vagas_vendidas || 0), 0);
  },
  param(nome) { return new URLSearchParams(window.location.search).get(nome); },
  primeiroNome(nome) { return String(nome || '').trim().split(/\s+/)[0] || ''; },
  iniciais(nome) {
    const letras = String(nome || '').trim().split(/\s+/).map(p => p.charAt(0)).filter(Boolean).slice(0, 2).join('');
    return letras.toUpperCase() || '?';
  },

  toast(msg, ms = 3200) {
    document.querySelectorAll('.toast').forEach(t => t.remove());
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), ms);
  },

  /* ---------- Sessão e conta ----------
     Descobre o tipo da conta pelo id do usuário no Auth (compartilhado com
     a Love): linha em `clientes` → Index (anfitrião); linha em
     `fornecedores` → B2B; nenhuma → entrou só com o Google.
     O saldo vem da RPC loveviagens_conta() (supabase/001_loveviagens.sql);
     se a RPC ainda não existir, soma as transações da carteira direto. */
  async conta(forcar = false) {
    if (LV._conta && !forcar) return LV._conta;
    const { data } = await supabaseClient.auth.getSession();
    const session = data && data.session;
    if (!session) { LV._conta = null; return null; }

    const user = session.user;
    const meta = user.user_metadata || {};
    const conta = {
      session, user,
      id: user.id,
      email: user.email,
      tipo: 'google',
      nome: meta.full_name || meta.name || (user.email || '').split('@')[0],
      avatar: meta.avatar_url || meta.picture || null,
      saldo: 0,
      saldoOk: false,
      transacoes: []
    };

    let rpc = null;
    try {
      const { data: r, error } = await supabaseClient.rpc('loveviagens_conta');
      if (!error && r) rpc = r;
    } catch (e) { /* RPC ainda não criada */ }

    if (rpc) {
      conta.tipo = rpc.tipo || 'google';
      if (rpc.nome) conta.nome = rpc.nome;
      if (rpc.avatar_url) conta.avatar = rpc.avatar_url;
      conta.saldo = Number(rpc.saldo || 0);
      conta.saldoOk = true;
      conta.transacoes = rpc.transacoes || [];
    } else {
      const { data: cliente } = await supabaseClient.from('clientes').select('*').eq('id', user.id).maybeSingle();
      if (cliente) {
        conta.tipo = 'index';
        conta.nome = cliente.full_name || [cliente.first_name, cliente.last_name].filter(Boolean).join(' ') || cliente.couple_name || conta.nome;
        conta.avatar = cliente.avatar_url || conta.avatar;
        const { data: tx, error } = await supabaseClient.from('cliente_wallet_transactions')
          .select('type, amount, description, created_at').eq('cliente_id', user.id).order('created_at', { ascending: false });
        if (!error) { conta.transacoes = tx || []; conta.saldoOk = true; }
      } else {
        const { data: forn } = await supabaseClient.from('fornecedores').select('*').eq('id', user.id).maybeSingle();
        if (forn) {
          conta.tipo = 'b2b';
          conta.nome = forn.company_name || conta.nome;
          conta.avatar = forn.avatar_url || conta.avatar;
          const { data: tx, error } = await supabaseClient.from('wallet_transactions')
            .select('type, amount, description, created_at').eq('fornecedor_id', user.id).order('created_at', { ascending: false });
          if (!error) { conta.transacoes = tx || []; conta.saldoOk = true; }
        }
      }
      conta.saldo = conta.transacoes.reduce((t, x) => t + (x.type === 'credit' ? 1 : -1) * Number(x.amount || 0), 0);
    }

    LV._conta = conta;
    return conta;
  },

  async sair() {
    await supabaseClient.auth.signOut();
    LV._conta = null;
    window.location.href = '/';
  },

  async exigirLogin() {
    const conta = await LV.conta();
    if (conta) return conta;
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.replace(`/login?next=${next}`);
    return null;
  },

  /* ---------- Pacotes ---------- */
  async pacotes() {
    if (LV._pacotes) return LV._pacotes;
    let lista = [];
    try {
      const { data, error } = await supabaseClient.from('viagens_pacotes').select('*').eq('ativo', true).order('posicao', { ascending: true });
      if (!error && data) lista = data;
    } catch (e) { /* sem acesso: cai na demonstração */ }
    if (!lista.length) { lista = PACOTES_DEMO.slice(); LV._demo = true; }
    lista.sort((a, b) => (b.destaque === true) - (a.destaque === true) || (a.posicao || 0) - (b.posicao || 0));
    LV._pacotes = lista;
    return lista;
  },
  async pacote(id) {
    if (!id) return null;
    if (id.startsWith('demo-')) return PACOTES_DEMO.find(p => p.id === id) || null;
    const { data } = await supabaseClient.from('viagens_pacotes').select('*').eq('id', id).maybeSingle();
    return data || null;
  },
  ehDemo(p) { return !!p && String(p.id).startsWith('demo-'); },

  /* ---------- Reservas ----------
     Reais (tabela viagens_reservas) + simuladas deste navegador (pacotes demo). */
  async reservas() {
    const conta = await LV.conta();
    if (!conta) return [];
    let lista = [];
    try {
      const { data, error } = await supabaseClient.from('viagens_reservas')
        .select('*, pacote:viagens_pacotes(imagem_url, data_inicio, data_fim, duracao_noites, tipo)')
        .eq('user_id', conta.id).order('created_at', { ascending: false });
      if (!error && data) lista = data;
    } catch (e) {}
    const demo = LV.reservasDemo().map(r => ({ ...r, simulada: true, pacote: PACOTES_DEMO.find(p => p.id === r.pacote_id) || null }));
    return [...lista, ...demo].map(r => {
      const inicio = r.data_inicio || (r.pacote && r.pacote.data_inicio) || null;
      const fim = r.data_fim || (r.pacote && r.pacote.data_fim) || inicio;
      const hoje = new Date().toISOString().slice(0, 10);
      const passada = !!fim && fim < hoje;
      return { ...r, inicio, fim, passada, imagem: r.pacote && r.pacote.imagem_url };
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },
  reservasDemo() {
    try { return JSON.parse(localStorage.getItem('lv_reservas_demo') || '[]'); } catch (e) { return []; }
  },
  salvarReservaDemo(r) {
    const lista = LV.reservasDemo();
    lista.unshift(r);
    try { localStorage.setItem('lv_reservas_demo', JSON.stringify(lista)); } catch (e) {}
  },
  statusReserva(s) {
    return { confirmada: 'Confirmada', pendente_pagamento: 'Aguardando pagamento do restante', cancelada: 'Cancelada' }[s] || s || 'Confirmada';
  },

  /* ---------- Cartões ---------- */
  cardPacote(p) {
    const restantes = LV.vagasRestantes(p);
    const esgotado = restantes === 0;
    return `
      <a class="card pacote-card" href="/pacote?id=${encodeURIComponent(p.id)}">
        <div class="pacote-media">
          <img src="${LV.escape(p.imagem_url || '')}" alt="" loading="lazy" onerror="this.style.display='none'">
          ${p.destaque ? '<span class="badge badge-primary">Destaque</span>' : ''}
        </div>
        <div class="pacote-body">
          <span class="pacote-destino">${LV.escape(p.destino || TIPOS_VIAGEM[p.tipo] || '')}</span>
          <span class="pacote-titulo">${LV.escape(p.titulo)}</span>
          <span class="pacote-meta">${LV.escape(TIPOS_VIAGEM[p.tipo] || p.tipo)} · ${LV.escape(LV.periodo(p))}${restantes !== null ? ` · ${esgotado ? 'Esgotado' : restantes + ' vagas'}` : ''}</span>
          <div class="pacote-preco">
            <strong>${LV.moeda(p.preco)}</strong>
            ${p.preco_de ? `<s>${LV.moeda(p.preco_de)}</s>` : ''}
            ${p.parcelas > 1 ? `<small>ou ${p.parcelas}x de ${LV.moeda(p.preco / p.parcelas)}</small>` : ''}
          </div>
        </div>
      </a>`;
  },

  cardReserva(r) {
    const status = r.status === 'cancelada' ? 'badge-danger' : r.status === 'pendente_pagamento' ? 'badge-warning' : 'badge-success';
    return `
      <div class="card reserva-card">
        <div class="reserva-media">${r.imagem ? `<img src="${LV.escape(r.imagem)}" alt="" loading="lazy" onerror="this.style.display='none'">` : ''}</div>
        <div class="reserva-body">
          <div class="reserva-top">
            <div>
              <span class="pacote-destino">${LV.escape(r.destino || '')}</span>
              <div class="pacote-titulo">${LV.escape(r.titulo)}</div>
            </div>
            <span class="badge ${status}">${LV.escape(LV.statusReserva(r.status))}</span>
          </div>
          <div class="pacote-meta">
            ${r.inicio ? `${LV.dataLonga(r.inicio)}${r.fim && r.fim !== r.inicio ? ' até ' + LV.dataLonga(r.fim) : ''}` : 'Datas a combinar'}
            · reservada em ${LV.data(r.created_at)}
            ${r.simulada ? ' · <span class="badge badge-warning">simulação</span>' : ''}
          </div>
          <div class="reserva-valores">
            <span><small>Saldo Love usado</small><strong>${LV.moeda(r.valor_saldo)}</strong></span>
            ${Number(r.valor_restante) > 0 ? `<span><small>Restante a pagar</small><strong>${LV.moeda(r.valor_restante)}</strong></span>` : ''}
            <span><small>Valor do pacote</small><strong>${LV.moeda(r.preco)}</strong></span>
          </div>
        </div>
      </div>`;
  },

  /* ---------- Vitrine reutilizável (home pública, início logado, Viagens) ----------
     opts: { grid, chips, busca, contador, aviso, limite, buscaExtra } (ids) */
  async montarVitrine(opts) {
    const grid = document.getElementById(opts.grid);
    const chips = opts.chips && document.getElementById(opts.chips);
    const busca = opts.busca && document.getElementById(opts.busca);
    const contador = opts.contador && document.getElementById(opts.contador);
    const aviso = opts.aviso && document.getElementById(opts.aviso);
    let tipoAtivo = '';

    const pacotes = await LV.pacotes();
    if (LV._demo && aviso) aviso.hidden = false;

    const filtrar = () => {
      const termo = ((busca && busca.value) || '').trim().toLowerCase();
      return pacotes.filter(p => {
        if (tipoAtivo && p.tipo !== tipoAtivo) return false;
        if (!termo) return true;
        return [p.titulo, p.destino, p.descricao].some(v => String(v || '').toLowerCase().includes(termo));
      });
    };
    const render = () => {
      let lista = filtrar();
      if (contador) contador.textContent = `${lista.length} ${lista.length === 1 ? 'pacote' : 'pacotes'}`;
      if (opts.limite) lista = lista.slice(0, opts.limite);
      grid.innerHTML = lista.length ? lista.map(LV.cardPacote).join('')
        : '<div class="empty">Nenhum pacote encontrado. Tente outro destino ou limpe o filtro.</div>';
    };

    if (chips) {
      const tipos = [...new Set(pacotes.map(p => p.tipo))];
      chips.innerHTML = ['', ...tipos].map(t =>
        `<button class="chip ${t === tipoAtivo ? 'active' : ''}" data-tipo="${t}">${t ? LV.TIPOS_VIAGEM[t] || t : 'Todos'}</button>`).join('');
      chips.addEventListener('click', e => {
        const btn = e.target.closest('.chip');
        if (!btn) return;
        tipoAtivo = btn.dataset.tipo;
        chips.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c === btn));
        render();
      });
    }
    if (busca) busca.addEventListener('input', render);
    render();
    return { render, setBusca(v) { if (busca) { busca.value = v; render(); } } };
  },

  /* ---------- Header e footer ----------
     Deslogado: Pacotes · Como funciona · Dúvidas · Entrar.
     Logado: Início · Viagens · Minhas viagens · saldo · avatar com menu
     (Minha conta, Como funciona, Dúvidas, Sair). */
  async montarCasca() {
    const header = document.getElementById('topbar');
    const footer = document.getElementById('footer');
    const pagina = document.body.dataset.page || '';
    const ativo = p => (p === pagina ? 'active' : '');

    if (header) {
      header.innerHTML = `
        <div class="container topbar-inner">
          <a class="topbar-logo" href="/">
            <img src="/assets/logo.png" alt="Love">
            <span>Love <small>Viagens</small></span>
          </a>
          <nav class="topbar-nav" id="topbar-nav">
            <a href="/viagens" class="${ativo('viagens')}">Pacotes</a>
            <a href="/#como-funciona">Como funciona</a>
            <a href="/#duvidas">Dúvidas</a>
          </nav>
          <div class="topbar-actions" id="topbar-actions">
            <a class="btn btn-ghost" href="/login">Entrar</a>
            <a class="btn btn-primary" href="/login">Usar meu saldo Love</a>
          </div>
        </div>`;
    }

    if (footer) {
      footer.innerHTML = `
        <div class="container footer-inner">
          <div>
            <strong class="strong">Love Viagens</strong> · loveviagens.com.br<br>
            <span class="small">Parte da plataforma Love. O saldo que você recebe de presentes vira viagem.</span>
          </div>
          <div class="footer-links">
            <a href="https://love.com.br" target="_blank" rel="noopener">love.com.br</a>
            <a href="/#duvidas">Dúvidas</a>
            <a href="/#como-funciona">Como funciona</a>
          </div>
        </div>`;
    }

    const conta = await LV.conta();
    if (!conta || !header) return;

    // Home pública com sessão: vai para o início da área logada.
    if (pagina === 'vitrine' && !window.location.hash) { window.location.replace('/app'); return; }

    const nav = document.getElementById('topbar-nav');
    const acoes = document.getElementById('topbar-actions');
    nav.innerHTML = `
      <a href="/app" class="${ativo('app')}">Início</a>
      <a href="/viagens" class="${ativo('viagens')}">Viagens</a>
      <a href="/minhas-viagens" class="${ativo('minhas-viagens')}">Minhas viagens</a>`;
    const tipo = LV.TIPOS_CONTA[conta.tipo] || LV.TIPOS_CONTA.google;
    acoes.innerHTML = `
      <a class="saldo-pill" href="/minha-conta" title="Saldo disponível para trocar por viagens">
        <small>Saldo</small> ${conta.saldoOk ? LV.moeda(conta.saldo) : '—'}
      </a>
      <div class="menu-wrap">
        <button class="avatar avatar-btn" id="btn-menu" type="button" aria-haspopup="true" aria-expanded="false" title="${LV.escape(conta.nome)}">
          ${conta.avatar ? `<img src="${LV.escape(conta.avatar)}" alt="" referrerpolicy="no-referrer">` : LV.iniciais(conta.nome)}
        </button>
        <div class="menu" id="menu-perfil" hidden>
          <div class="menu-head">
            <div class="strong">${LV.escape(conta.nome)}</div>
            <div class="small muted">${LV.escape(conta.email || '')}</div>
            <span class="badge ${conta.tipo === 'google' ? 'badge-neutral' : 'badge-primary'}" style="margin-top:.375rem">${tipo.rotulo}</span>
          </div>
          <a class="menu-item" href="/minha-conta">Minha conta</a>
          <a class="menu-item" href="/minhas-viagens">Minhas viagens</a>
          <div class="menu-sep"></div>
          <a class="menu-item" href="/#como-funciona">Como funciona</a>
          <a class="menu-item" href="/#duvidas">Dúvidas</a>
          <div class="menu-sep"></div>
          <button class="menu-item" type="button" id="btn-sair">Sair</button>
        </div>
      </div>`;

    const btn = document.getElementById('btn-menu');
    const menu = document.getElementById('menu-perfil');
    const fechar = () => { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.hidden = !menu.hidden;
      btn.setAttribute('aria-expanded', String(!menu.hidden));
    });
    document.addEventListener('click', (e) => { if (!menu.hidden && !menu.contains(e.target)) fechar(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fechar(); });
    document.getElementById('btn-sair').addEventListener('click', LV.sair);
  }
};

window.LV = LV;
document.addEventListener('DOMContentLoaded', () => { LV.montarCasca(); });
