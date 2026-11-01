# AGENTS.md

Trabalho da Sprint II: assistente de IA em página única, em **HTML + JavaScript puro**, que responde dúvidas sobre o sistema da Sprint I, acompanhado de um painel de métricas calculado por funções de string escritas à mão. A aplicação já está implementada; não há build, gerenciador de pacotes nem executor de testes no repositório. Não adicione um.

## Estado atual

- Implementado: `index.html`, `styles.css`, `js/config.js`, `js/api.js`, `js/metrics.js`, `js/app.js`, `js/env.example.js`, `apresentacao.html`, `README.md`, `AI_LOG.md`.
- Métricas: M1–M4 obrigatórias, M5 (diversidade lexical, intermediário) e M6 (Flesch PT, desafio). Trabalho **individual** de `Vitor Mazzonetto`; todas as métricas são dele.
- **Contexto:** `js/config.js` contém o **EcoMail**, montado a partir do IS Canvas da Sprint I (`EcoMail-1.pptx`, fora do repositório). Confirme os detalhes com o PPTX antes de tratar como definitivo. `TERMOS_CHAVE` já está ajustado ao EcoMail.
- **Modelos:** seletor Gemini com Gemma 4 26B (padrão), Gemma 4 31B, Gemini 3.5 Flash Lite e Gemini 3.1 Flash Lite. `js/api.js` tenta os demais automaticamente em 429, 5xx, 404 ou resposta vazia. Gemma devolve o raciocínio em uma parte com `thought: true`; ela é descartada.
- Testes de métricas/API/UI foram feitos com Node e jsdom **fora do repositório**. Se precisar repetir, use `/tmp/opencode`; não crie `package.json` nem `node_modules` na entrega.
- Teste ao vivo com a chave do AI Studio já foi feito com Gemma 4 26B; a captura está em `assets/aplicacao-slide.png`.
- A chave fica em `js/env.js`, que é ignorado pelo git; `js/env.example.js` é o template. Nunca versione `js/env.js` nem o inclua no zip.

## Executar / verificar

- Sirva por HTTP; `file://` pode quebrar `fetch` (CORS) e módulos ES:
  `python3 -m http.server 8000` e abra `http://localhost:8000`.
- Não há testes automatizados. Valide as métricas colando as funções puras de `js/metrics.js` no console do DevTools com um exemplo conhecido e conferindo com uma contagem manual.
- Checklist manual antes de considerar pronto: pergunta vazia/curta bloqueada, pergunta fora do escopo recusada, chave inválida, limite excedido, sem conexão, histórico mantido, métricas recalculadas a cada resposta.

## Restrições avaliadas — não viole

- **Sem bibliotecas ou frameworks**, inclusive para as métricas. Nada de npm, bundler ou bibliotecas auxiliares via CDN.
- **Nunca escreva a chave de API** no código, no HTML, em comentários, em um `.env` versionado ou no zip de entrega. A página deve ter um campo para a chave; mantenha-a apenas em memória (ou `sessionStorage`) e envie em cabeçalho, não na query string. Oculte-a de mensagens de erro e logs do console.
- **Cada métrica é uma função própria** `nome(texto)` que retorna o valor calculado. Nada de cálculo de métrica embutido no código de renderização/DOM.
- **Pelo menos uma métrica de cada aluno deve percorrer a string caractere a caractere** com um laço `for` explícito — sem atalho de `split`/regex nessa métrica.
- **Comente o autor** acima de cada função de métrica (`// Autor: ...`) e mantenha a divisão de métricas por aluno, já que a nota é individual.
- **Regra de dupla (não se aplica):** a entrega é individual. Se isso mudar, cada integrante implementa 2 métricas escolhidas diferentes e pelo menos uma intermediária/desafio.
- **M1 deve exibir três valores** lado a lado: tokens estimados (caracteres ÷ 4), tokens reais vindos da API e o erro percentual. Mostre `n/d` em vez de inventar um valor real quando a resposta não tiver `usage`.
- **M4** precisa de uma lista explícita de termos do projeto no código; exiba a quantidade e quais termos apareceram.
- **O registro de uso de IA é um entregável** (`AI_LOG.md`): anote ferramentas usadas, em quais partes ajudaram e prompts representativos. Acrescente ao arquivo quando a sessão adicionar código relevante.
- O aluno precisa explicar cada linha ao vivo na demonstração de 5 minutos. Prefira funções pequenas e legíveis a truques de uma linha ou abstração prematura.

## Comportamento esperado

- Textos de interface, prompts e comentários em **pt-BR**, por exemplo `calcularPalavras`, `contarFrases`.
- Envie o contexto do projeto + instruções de escopo a cada pergunta; o modelo deve dizer que a pergunta está fora do escopo em vez de responder genericamente.
- Valide a entrada com `trim()` e um comprimento mínimo; desabilite o botão de envio enquanto a requisição estiver em andamento.
- Exiba a resposta na página e mantenha um histórico da sessão com pares pergunta/resposta.
- Diferencie pelo menos: chave ausente/inválida (401/403), limite excedido (429), falha de rede e resposta malformada. Nunca mostre o blob de erro bruto do provedor como única mensagem.
- Renderize texto do modelo e do usuário com `textContent`/`createElement`, não `innerHTML` — a resposta é entrada não confiável.

## Observações por provedor

- Gemini: tokens reais em `usageMetadata.promptTokenCount` / `candidatesTokenCount`; envie a chave no cabeçalho `x-goog-api-key`.
- OpenAI / Groq: tokens reais em `usage.prompt_tokens` / `completion_tokens`; `Authorization: Bearer`.
- O erro percentual deve proteger contra divisão por zero ou por token real ausente.

## Não existem artefatos da Sprint I aqui

O IS Canvas completo está em `EcoMail-1.pptx`, no diretório de Downloads do usuário, fora deste repositório. O `CONTEXTO_PROJETO` em `js/config.js` foi montado a partir dele. Se o PPTX não estiver disponível, peça o Canvas/PDF ao usuário antes de inventar detalhes; não crie números, prazos ou funcionalidades.

## Estrutura atual

- `index.html` — campo da chave, formulário de pergunta, resposta, histórico, painel de métricas
- `styles.css`
- `js/config.js` — contexto do projeto, prompt de sistema, termos e provedores
- `js/api.js` — `fetch`, leitura do JSON de resposta, normalização de erros
- `js/metrics.js` — apenas funções puras de métrica, sem DOM e sem dependências
- `js/app.js` — eventos, estado, renderização
- `apresentacao.html` — deck navegável; `AI_LOG.md` — registro de IA; `js/env.example.js` — template da chave local

Manter `js/metrics.js` sem dependências é o que permite testar no console e alterar métricas durante a demonstração.
