# EcoMail — Assistente de IA (Sprint II)

Página única em **HTML + JavaScript puro** que responde dúvidas sobre o
**EcoMail** (Sprint I). O app envia o contexto do projeto ao LLM e calcula um
painel de métricas, sem bibliotecas, build ou npm.

## Como rodar

```bash
python3 -m http.server 8000
```

Abra <http://localhost:8000>; os slides ficam em
<http://localhost:8000/apresentacao.html>. Use HTTP, pois em `file://` o `fetch`
e os módulos ES falham.

## Chave da API

Obtenha a chave no [Google AI Studio](https://aistudio.google.com/app/apikey):

1. **Na página:** cole no campo **Chave da API** e clique em **Salvar**. Ela fica
   no `sessionStorage` da aba.
2. **Em `js/env.js`:** copie `js/env.example.js` para `js/env.js`, preencha
   `GEMINI_API_KEY` e recarregue a página.

`js/env.js` está no `.gitignore` e não deve ser commitado nem incluído no zip.

## Modelos

| Modelo | ID | Uso |
| --- | --- | --- |
| Gemma 4 26B | `gemma-4-26b-a4b-it` | padrão |
| Gemma 4 31B | `gemma-4-31b-it` | fallback |
| Gemini 3.5 Flash Lite | `gemini-3.5-flash-lite` | fallback |
| Gemini 3.1 Flash Lite | `gemini-3.1-flash-lite` | fallback |

Em 429 (limite), 5xx, 404 ou resposta vazia, o app tenta os demais modelos
automaticamente. A parte de raciocínio do Gemma (`thought: true`) é descartada.
Há também OpenAI (`gpt-4o-mini`) e Groq (`llama-3.3-70b-versatile`) em
`js/config.js` (`PROVEDORES`). A demo usa Gemini; OpenAI e Groq são chamados
direto do navegador e podem falhar por CORS em alguns ambientes.

## Métricas

| Código | Métrica | Nível | Função |
| --- | --- | --- | --- |
| M1 | Tokens estimados × reais + erro | obrigatória | `estimarTokens`, `calcularErroPercentual` |
| M2 | Palavras da pergunta e da resposta | obrigatória | `contarPalavras` |
| M3 | Frases da resposta (`.`, `!`, `?`) | obrigatória | `contarFrases` |
| M4 | Termos-chave do projeto encontrados | obrigatória | `encontrarTermosChave` |
| M5 | Diversidade lexical | intermediário | `calcularDiversidadeLexical` |
| M6 | Índice de Flesch adaptado ao português | desafio | `calcularFlesch`, `contarSilabas` |

- **M1:** estimativa `Math.ceil(caracteres / 4)`; tokens reais vêm de
  `usageMetadata` (Gemini) ou `usage` (OpenAI/Groq); sem esse dado, erro `n/d`.
- **M3:** `...` conta uma frase e `3.5` não conta.
- **M6:** `248,835 − 1,015 × (palavras/frases) − 84,6 × (sílabas/palavras)`;
  sílabas são grupos de vogais; sem pontuação, usa 1 frase.
- `contarFrases` e `contarSilabas` percorrem a string caractere a caractere.

## Estrutura

```
index.html            Página, formulário, resposta, histórico e painel
styles.css            Estilos e layout responsivo
apresentacao.html     Slides navegáveis
apresentacao.pdf      Slides em PDF
assets/               Captura de tela usada nos slides
js/config.js          Contexto, prompt, termos e provedores
js/api.js             Chamadas às APIs, JSON, erros e fallback
js/metrics.js         Funções puras das métricas
js/app.js             Eventos, estado da sessão e renderização
js/env.example.js     Modelo do arquivo local de chave
js/env.js             Chave local (ignorado pelo git, não versionado)
AI_LOG.md             Registro de uso de IA
```

## Segurança

- A chave não aparece nos arquivos versionados; localmente fica em `js/env.js`
  (ignorado pelo git) ou no campo da página. É enviada em cabeçalho
  (`x-goog-api-key` ou `Authorization: Bearer`), nunca na URL.
- Erros do provedor são limpos antes de aparecer na página; resposta e histórico
  usam `textContent`, não `innerHTML`.

## Entrega

Inclua no zip o código **sem `js/env.js`**, os slides e o `AI_LOG.md`:

```bash
zip -r ecomail-sprint2.zip index.html styles.css js assets README.md AI_LOG.md apresentacao.html apresentacao.pdf -x "js/env.js"
```

## Autoria

Trabalho individual de **Vitor Mazzonetto**.
