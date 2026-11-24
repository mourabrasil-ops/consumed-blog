# Blog da Consumed Clínica de Olhos

Repositório público com os artigos **aprovados pelo diretor técnico** para o blog do site
https://consumedolhos.com.br.

- `rascunhos/` — artigos aguardando aprovação (não são publicados).
- `aprovados/` — artigos aprovados. O site lê `aprovados/index.json` de hora em hora e publica
  automaticamente cada artigo listado com `"status": "publicar"`.
- Para tirar um artigo do ar: mudar o `status` dele no índice para `"retirar"`.

Formato de cada artigo (`aprovados/<slug>.json`): `titulo`, `resumo`, `conteudo_html`,
`referencias_html`, `aprovado_por`, `aprovado_em`.
