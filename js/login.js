/* ==========================================================================
   LOVE VIAGENS — Login: Google ou conta Love (e-mail e senha)
   O Auth é o mesmo da Love, então a conta Love do anfitrião (Index) ou do
   fornecedor (B2B) entra aqui sem cadastro novo.
   ========================================================================== */

(async () => {
  const next = LV.param('next') || '/minha-conta';
  const form = document.getElementById('form-love');
  const erro = document.getElementById('login-erro');
  const btnGoogle = document.getElementById('btn-google');
  const btnEntrar = document.getElementById('btn-entrar');

  // Já logado: segue direto.
  const conta = await LV.conta();
  if (conta) { window.location.replace(next); return; }

  function mostrarErro(msg) { erro.textContent = msg; erro.hidden = !msg; }

  btnGoogle.addEventListener('click', async () => {
    mostrarErro('');
    btnGoogle.disabled = true;
    const { error } = await entrarComGoogle(next);
    btnGoogle.disabled = false;
    if (error) mostrarErro('Não foi possível entrar com o Google. Tente de novo.');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    mostrarErro('');
    const email = form.email.value.trim();
    const senha = form.senha.value;
    if (!email || !senha) return mostrarErro('Informe o e-mail e a senha da sua conta Love.');

    btnEntrar.disabled = true;
    btnEntrar.textContent = 'Entrando…';
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password: senha });
    btnEntrar.disabled = false;
    btnEntrar.textContent = 'Entrar com a conta Love';

    if (error) {
      const msg = /invalid login/i.test(error.message) ? 'E-mail ou senha incorretos.' :
        /email not confirmed/i.test(error.message) ? 'Confirme o e-mail da sua conta Love antes de entrar.' :
        'Não foi possível entrar. Tente de novo.';
      return mostrarErro(msg);
    }
    window.location.href = next;
  });
})();
