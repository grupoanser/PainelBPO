function doLogin() {
  const email = document.getElementById('login-email')?.value.trim();
  const pass = document.getElementById('login-password')?.value;
  const err = document.getElementById('login-err');
  if (!email || !pass) { if (err) err.textContent = 'Preencha e-mail e senha.'; return; }
  if (err) err.textContent = 'Credenciais inválidas.';
}

function doLogout() {
  location.reload();
}
