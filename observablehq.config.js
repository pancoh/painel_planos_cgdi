export default {
  title: "Painel de Planos de Mobilidade Urbana",
  root: "src",
  output: "dist",
  theme: "air",
  sidebar: false,
  toc: false,
  pager: false,
  search: true,
  globalStylesheets: [],
  pages: [
    { name: "Brasil", path: "/" },
    { name: "Regiões", path: "/regioes" },
    { name: "Estados", path: "/estados" },
    { name: "Municípios", path: "/municipios" },
  ],
  head: `
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Serif:wght@500;600;700&display=swap" rel="stylesheet">
    <link rel="icon" href="/favicon.png" type="image/png">
    <link rel="apple-touch-icon" href="/favicon.png">
    <link rel="stylesheet" href="/theme.css">
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        var path = window.location.pathname.replace(/\/$/, '') || '/';
        path = path.replace(/\/index(\.html)?$/, '') || '/';
        var links = document.querySelectorAll('.site-nav a');
        for (var i = 0; i < links.length; i++) {
          var href = links[i].getAttribute('href').replace(/\/$/, '') || '/';
          if (path === href || path === href + '.html') {
            links[i].setAttribute('aria-current', 'page');
          }
        }
      });
    </script>
  `,
  header: `
    <div class="site-shell">
      <div class="site-topbar">
        <div class="brand-lockup">
          <a class="brand-home" href="/" aria-label="Página inicial do Painel de Planos de Mobilidade Urbana">
            <div class="brand-text">
              <span class="brand-kicker">Ministério das Cidades</span>
              <span class="brand-title">Planos de Mobilidade Urbana</span>
            </div>
          </a>
        </div>
        <nav class="site-nav" aria-label="Navegação principal">
          <a href="/">Brasil</a>
          <a href="/regioes">Regiões</a>
          <a href="/estados">Estados</a>
          <a href="/municipios">Municípios</a>
        </nav>
      </div>
    </div>
  `,
  footer: `
    <div class="site-shell footer-shell">
      <hr class="page-note-divider" style="margin-top:0">
      <div class="footer-content">
        <div class="footer-info">
          <p>Painel para acompanhamento da situação dos Planos de Mobilidade Urbana no Brasil.</p>
          <p>Fonte: Secretaria Nacional de Mobilidade Urbana</p>
        </div>
        <img class="footer-logo" src="/logos/logo_mcid.png" alt="Logo do Ministério das Cidades">
      </div>
    </div>
  `,
};
