# Diretrizes do Projeto Love Viagens

Mesmas regras visuais da plataforma Love (ver `AGENTS.md` do repositório Love). Resumo:

## Paleta
- **Primária**: `#183b54` (hover `#122c3f`) — token `--primary-color`
- **Secundária**: `#27394f` (hover `#1d2b3c`) — token `--secondary-color`

## Identidade sem cara de Tailwind
- Tipografia **Inter** em tudo, inclusive títulos.
- Bordas finas (`1px solid #E4E4E7`) no lugar de sombras; sombra só em overlays.
- Cantos: 8px em botões, campos e etiquetas (`--radius-control`); 10px em cards e modais (`--radius-card`).
- Hover sem zoom e sem trocar fundo por cinza: botão claro mantém fundo branco e escurece borda e texto para `#181D24`.
- Foco sem anel/glow: só a borda escurece.
- Margem lateral uniforme: `.container` com `2rem` de respiro.

## Arquitetura
- HTML + CSS + JS puro, sem build. `server.js` serve a pasta na porta 8091.
- Supabase compartilhado com a Love (`js/supabase-init.js`). Não criar outro projeto Supabase.
- Toda página carrega `supabase-init.js`, `data.js` e `shell.js`; o resto fica em um script por página em `js/`.
- Tipos de conta: `index` (anfitrião, tabela `clientes`), `b2b` (fornecedor, tabela `fornecedores`), `google` (entrou só com Google, sem saldo).
- Textos em português do Brasil.
