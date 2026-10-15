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

/* --------------------------------------------------------------------------
   Entrar com o Google em janelinha (pop-up), como na Love.
   No computador abre a tela do Google numa janela pequena; a volta cai em
   /auth-popup.html, que avisa esta aba e fecha. No celular, ou se o navegador
   bloquear o pop-up, a página inteira vai para o Google e volta para /.
   Lembrete: a URL de retorno (ex.: http://localhost:8091/auth-popup.html e
   https://loveviagens.com.br/auth-popup.html) precisa estar na lista de
   Redirect URLs do Supabase (Authentication → URL Configuration).
   -------------------------------------------------------------------------- */
const JANELA_GOOGLE = 'loveviagens-google-login';

async function entrarComGoogle(destinoAposLogin) {
  const destino = destinoAposLogin || '/minha-conta';
  const opcoesBase = {
    redirectTo: `${window.location.origin}${destino}`,
    queryParams: { prompt: 'select_account' }
  };
  const ehCelular = window.matchMedia('(max-width: 767px)').matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (ehCelular) return supabaseClient.auth.signInWithOAuth({ provider: 'google', options: opcoesBase });

  const { data, error } = await supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: { ...opcoesBase, redirectTo: `${window.location.origin}/auth-popup.html`, skipBrowserRedirect: true }
  });
  if (error || !data || !data.url) return supabaseClient.auth.signInWithOAuth({ provider: 'google', options: opcoesBase });

  const largura = 500, altura = 640;
  const esquerda = Math.round(window.screenX + (window.outerWidth - largura) / 2);
  const topo = Math.round(window.screenY + (window.outerHeight - altura) / 2.5);
  const janela = window.open(data.url, JANELA_GOOGLE, `width=${largura},height=${altura},left=${esquerda},top=${topo},menubar=no,toolbar=no,location=yes,status=no`);
  if (!janela) return supabaseClient.auth.signInWithOAuth({ provider: 'google', options: opcoesBase });
  janela.focus();

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
    // Se a pessoa fechar a janelinha sem terminar, confere a sessão e segue.
    const vigia = setInterval(async () => {
      if (!janela.closed) return;
      const { data } = await supabaseClient.auth.getSession();
      terminar(!!(data && data.session));
    }, 500);
  });
}
