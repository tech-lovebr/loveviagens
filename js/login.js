/* ==========================================================================
   LOVE VIAGENS — Login: conta Love (janelinha da Love) ou Google
   ========================================================================== */

(async () => {
  const next = LV.param('next') || '/app';
  const erro = document.getElementById('login-erro');
  const btnLove = document.getElementById('btn-love');
  const btnGoogle = document.getElementById('btn-google');

  // Já logado: segue direto.
  const conta = await LV.conta();
  if (conta) { window.location.replace(next); return; }

  function mostrarErro(msg) { erro.textContent = msg; erro.hidden = !msg; }

  btnLove.addEventListener('click', async () => {
    mostrarErro('');
    btnLove.disabled = true;
    const { error } = await entrarComLove(next);
    btnLove.disabled = false;
    if (error) mostrarErro('O login com a conta Love não foi concluído. Tente de novo.');
  });

  btnGoogle.addEventListener('click', async () => {
    mostrarErro('');
    btnGoogle.disabled = true;
    const { error } = await entrarComGoogle(next);
    btnGoogle.disabled = false;
    if (error) mostrarErro('Não foi possível entrar com o Google. Tente de novo.');
  });
})();
