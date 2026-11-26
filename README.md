# Blog da Consumed Clínica de Olhos

Repositório público com os artigos **aprovados pelo diretor técnico** para o blog do site
https://consumedolhos.com.br.

- `rascunhos/` — artigos aguardando aprovação (não são publicados).
- `aprovados/` — artigos aprovados. O site lê `aprovados/index.json` de hora em hora e publica
  automaticamente cada artigo listado com `"status": "publicar"`.
- Para tirar um artigo do ar: mudar o `status` dele no índice para `"retirar"`.

Formato de cada artigo (`aprovados/<slug>.json`): `titulo`, `resumo`, `conteudo_html`,
`referencias_html`, `aprovado_por`, `aprovado_em`.

## Alterações do site (sem Chrome)

O arquivo `site/alteracoes.json` é lido pelo site a cada 15 minutos (ou na hora, abrindo
`https://consumedolhos.com.br/wp-json/consumed/v1/alteracoes?sync=1`).
Cada item é aplicado uma única vez e guarda backup para poder desfazer:

```json
{"id": "2026-11-26-whats", "tipo": "substituir", "pagina": "todas", "de": "texto antigo", "para": "texto novo"}
{"id": "2026-11-26-css",   "tipo": "css", "css": ".botao{color:red}"}
{"id": "2026-11-27-volta", "tipo": "desfazer", "alvo": "2026-11-26-whats"}
```
