/* ==========================================================================
   LOVE VIAGENS — Casca comum (header, footer, sessão, saldo, pacotes)
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
  escape(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },
  periodo(p) {
    if (p.data_inicio && p.data_fim) return `${LV.data(p.data_inicio)} → ${LV.data(p.data_fim)}`;
    if (p.duracao_noites) return `${LV.numero(p.duracao_noites)} noites`;
    return 'Datas flexíveis';
  },
  vagasRestantes(p) {
    if (!p.vagas) return null;
    return Math.max((p.vagas || 0) - (p.vagas_vendidas || 0), 0);
  },
  param(nome) { return new URLSearchParams(window.location.search).get(nome); },

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
      // Caminho sem a RPC: lê as tabelas da Love diretamente (RLS do dono).
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

  /* ---------- Reservas de demonstração (ficam só neste navegador) ---------- */
  reservasDemo() {
    try { return JSON.parse(localStorage.getItem('lv_reservas_demo') || '[]'); } catch (e) { return []; }
  },
  salvarReservaDemo(r) {
    const lista = LV.reservasDemo();
    lista.unshift(r);
    try { localStorage.setItem('lv_reservas_demo', JSON.stringify(lista)); } catch (e) {}
  },

  /* ---------- Cartão de pacote (vitrine) ---------- */
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

  /* ---------- Header e footer ---------- */
  async montarCasca() {
    const header = document.getElementById('topbar');
    const footer = document.getElementById('footer');
    const pagina = document.body.dataset.page || '';

    if (header) {
      header.innerHTML = `
        <div class="container topbar-inner">
          <a class="topbar-logo" href="/">
            <img src="/assets/logo.png" alt="Love">
            <span>Love <small>Viagens</small></span>
          </a>
          <nav class="topbar-nav">
            <a href="/#pacotes" class="${pagina === 'vitrine' ? 'active' : ''}">Pacotes</a>
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

    // Estado logado no header (não trava a página enquanto carrega).
    const acoes = document.getElementById('topbar-actions');
    if (!acoes) return;
    const conta = await LV.conta();
    if (!conta) return;
    const inicial = (conta.nome || '?').trim().charAt(0).toUpperCase();
    acoes.innerHTML = `
      <a class="saldo-pill" href="/minha-conta" title="Saldo disponível para trocar por viagens">
        <small>Saldo</small> ${conta.saldoOk ? LV.moeda(conta.saldo) : '—'}
      </a>
      <a class="avatar" href="/minha-conta" title="${LV.escape(conta.nome)}">
        ${conta.avatar ? `<img src="${LV.escape(conta.avatar)}" alt="" referrerpolicy="no-referrer">` : inicial}
      </a>`;
  }
};

window.LV = LV;
document.addEventListener('DOMContentLoaded', () => { LV.montarCasca(); });
