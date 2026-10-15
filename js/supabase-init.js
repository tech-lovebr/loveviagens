/* ==========================================================================
   LOVE VIAGENS — Cliente Supabase
   Mesmo projeto Supabase da plataforma Love (love.com.br / B2B / Admin):
   assim a pessoa entra aqui com a conta Love que já tem, e o saldo mostrado
   é o mesmo da Carteira (Index) ou da carteira do fornecedor (B2B).
   Depende do script global do Supabase (UMD) carregado antes deste arquivo.
   ========================================================================== */

const SUPABASE_URL = 'https://krpgtixwmxwhtjchcufl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtycGd0aXh3bXh3aHRqY2hjdWZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxNzI5ODgsImV4cCI6MjEwNTc0ODk4OH0.6ZwpEz-m-qWM_bPW8_Fucvv2EWkdMBkmH2BVgPdMfuQ';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Onde está a Love: em localhost, o servidor da Love (porta 8090); em
// produção, love.com.br. A tela de login da Love (entrar-viagens.html) mora lá.
const LOVE_ORIGIN = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)
  ? 'http://localhost:8090'
  : 'https://love.com.br';

const ehCelular = () => window.matchMedia('(max-width: 767px)').matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

function abrirJanelinha(url, nome) {
  const largura = 500, altura = 640;
  const esquerda = Math.round(window.screenX + (window.outerWidth - largura) / 2);
  const topo = Math.round(window.screenY + (window.outerHeight - altura) / 2.5);
  const janela = window.open(url, nome, `width=${largura},height=${altura},left=${esquerda},top=${topo},menubar=no,toolbar=no,location=yes,status=no`);
  if (janela) janela.focus();
  return janela;
}

/* --------------------------------------------------------------------------
   Entrar com a conta Love: abre a tela de login da própria Love numa
   janelinha. A pessoa entra lá (ou só confirma, se já estiver logada na
   Love) e a Love devolve a sessão por postMessage; aqui gravamos a sessão
   no supabase-js e seguimos para o destino. No celular, ou com pop-up
   bloqueado, a página inteira vai para a Love e volta por /auth-love.html.
   -------------------------------------------------------------------------- */
async function entrarComLove(destinoAposLogin) {
  const destino = destinoAposLogin || '/app';
  const base = `${LOVE_ORIGIN}/entrar-viagens.html?origin=${encodeURIComponent(window.location.origin)}`;
  const porRedirect = () => {
    const volta = `${window.location.origin}/auth-love.html?next=${encodeURIComponent(destino)}`;
    window.location.href = `${base}&redirect=${encodeURIComponent(volta)}`;
    return new Promise(() => {});
  };
  if (ehCelular()) return porRedirect();

  const janela = abrirJanelinha(base, 'loveviagens-love-login');
  if (!janela) return porRedirect();

  return new Promise(resolve => {
    let terminou = false;
    const terminar = async (sessao) => {
      if (terminou) return;
      terminou = true;
      window.removeEventListener('message', aoReceber);
      clearInterval(vigia);
      if (sessao) {
        const { error } = await supabaseClient.auth.setSession({ access_token: sessao.access_token, refresh_token: sessao.refresh_token });
        if (!error) { window.location.href = destino; return resolve({ error: null }); }
      }
      resolve({ error: new Error('Login com a conta Love não concluído') });
    };
    const aoReceber = (e) => {
      if (e.origin !== LOVE_ORIGIN || !e.data || e.data.tipo !== 'love-login') return;
      terminar(e.data);
    };
    window.addEventListener('message', aoReceber);
    // Fechou a janelinha sem terminar: encerra sem erro visível.
    const vigia = setInterval(() => { if (janela.closed) terminar(null); }, 500);
  });
}

/* --------------------------------------------------------------------------
   Entrar com o Google em janelinha (pop-up), como na Love.
   A volta do Google cai em /auth-popup.html, que avisa esta aba e fecha. No
   celular, ou se o navegador bloquear o pop-up, a página inteira vai para o
   Google e volta para o destino.
   Lembrete: a URL de retorno (ex.: http://localhost:8091/auth-popup.html e
   https://loveviagens.com.br/auth-popup.html) precisa estar na lista de
   Redirect URLs do Supabase (Authentication → URL Configuration).
   -------------------------------------------------------------------------- */
async function entrarComGoogle(destinoAposLogin) {
  const destino = destinoAposLogin || '/app';
  const opcoesBase = {
    redirectTo: `${window.location.origin}${destino}`,
    queryParams: { prompt: 'select_account' }
  };
  if (ehCelular()) return supabaseClient.auth.signInWithOAuth({ provider: 'google', options: opcoesBase });

  const { data, error } = await supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: { ...opcoesBase, redirectTo: `${window.location.origin}/auth-popup.html`, skipBrowserRedirect: true }
  });
  if (error || !data || !data.url) return supabaseClient.auth.signInWithOAuth({ provider: 'google', options: opcoesBase });

  const janela = abrirJanelinha(data.url, 'loveviagens-google-login');
  if (!janela) return supabaseClient.auth.signInWithOAuth({ provider: 'google', options: opcoesBase });

  return new Promise(resolve => {
    let terminou = false;
    const terminar = (ok) => {
      if (terminou) return;
      terminou = true;
      window.removeEventListener('message', aoReceber);
      clearInterval(vigia);
      if (ok) window.location.href = destino;
      resolve({ error: ok ? null : new Error('Login com o Google não concluído') });
    };
    const aoReceber = (e) => {
      if (e.origin !== window.location.origin || !e.data || e.data.tipo !== 'loveviagens-google-login') return;
      terminar(e.data.resultado === 'ok');
    };
    window.addEventListener('message', aoReceber);
    const vigia = setInterval(async () => {
      if (!janela.closed) return;
      const { data } = await supabaseClient.auth.getSession();
      terminar(!!(data && data.session));
    }, 500);
  });
}
