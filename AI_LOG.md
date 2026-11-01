# Registro de uso de IA — Sprint II

**Aluno:** Vitor Mazzonetto
**Trabalho:** EcoMail — Assistente de IA (Sprint II)
**Data:** novembro de 2026

## Ferramentas

- **OpenCode** com o modelo **DeepSeek V4.1 Flash**.
- Subagentes para revisão de design, remoção de redundância e README.
- Navegador integrado para o teste ao vivo e a captura de tela.
- Node/jsdom e WeasyPrint usados apenas em testes e na geração do PDF, fora da
  aplicação entregue.

## Uso por etapa

| Etapa | Apoio da IA |
| --- | --- |
| Contexto e prompt | Leitura do IS Canvas do EcoMail no `EcoMail-1.pptx` e redação do contexto e das regras de escopo. |
| Interface | Estrutura HTML, CSS responsivo, estados de erro/sucesso e acessibilidade. |
| API e modelos | Chamadas ao Gemini, OpenAI e Groq, leitura do `usage`, seleção de modelos e fallback. |
| Métricas | Funções M1–M6, incluindo normalização, frases, sílabas e Flesch. |
| Segurança | Campo de chave, `sessionStorage`, envio por cabeçalho e limpeza de erros. |
| Testes | Casos de métricas, API simulada, interface e teste ao vivo com Gemma 4 26B. |
| Documentação | README, slides em HTML/PDF e este registro. |

## Prompts representativos

1. “Implemente a Sprint II em HTML + JavaScript puro, com contexto do EcoMail,
   prompt restritivo, histórico, validação, erros e painel de métricas.”
2. “Crie as métricas M1–M4 e duas escolhidas em funções puras, sem bibliotecas.
   Pelo menos uma deve percorrer a string caractere a caractere.”
3. “Adicione Gemma 4 26B, Gemma 4 31B e Gemini 3.5/3.1 Flash Lite com fallback
   automático e descarte as partes de raciocínio (`thought`).”
4. “Audite a segurança: chave fora do repositório, XSS, prompt injection, erros
   e conteúdo do zip/PDF. Relate achados e mitigações.”

## Auditoria de segurança

**Escopo:** código, histórico git, árvore remota, zip de entrega, PDF e captura
de tela. Data: 01/11/2026.

| Verificação | Resultado |
| --- | --- |
| Chave no código/repo (fora de `js/env.js`) | Nenhuma ocorrência |
| Chave no histórico git | Nenhuma ocorrência |
| Chave no `origin/main` | `js/env.js` não está versionado |
| Chave no zip | `js/env.js` excluído |
| Chave no texto do PDF | Nenhuma ocorrência |
| Chave na captura | Campo mascarado (`type="password"`) |
| `js/env.js` ignorado | Confirmado por `git check-ignore` |

**Mitigações verificadas:**

- A chave fica em `js/env.js`, ignorado pelo git, e pode ser digitada no campo
  da página; não está no HTML, no CSS nem nos arquivos versionados.
- Envio no cabeçalho (`x-goog-api-key` ou `Authorization: Bearer`), nunca na URL.
- Mensagens de erro do provedor são limpas antes de aparecer na página.
- Resposta e histórico usam `textContent`/`createElement`, sem `innerHTML`.
- O prompt restringe o escopo e recusa instruções para ignorar regras; a saída do
  modelo é tratada como texto não confiável.
- Sem bibliotecas de terceiros na aplicação; o PDF usa WeasyPrint apenas fora da
  entrega.

**Riscos residuais (documentados):**

- A chave fica no `sessionStorage` da aba durante a demo; quem tiver acesso ao
  navegador consegue lê-la. É o trade-off de uma aplicação estática sem backend.
- `js/env.js` é servido pelo servidor local enquanto a página está aberta; não
  publique esse arquivo em um site público.
- A chave foi compartilhada no chat durante o desenvolvimento; **revogue/gera
  outra depois da apresentação**.

**Resultado:** nenhum achado crítico ou alto. Dois riscos médios inerentes à
aplicação estática (chave no navegador e env local) foram documentados e
mitigados; nenhum achado baixo pendente.

## O que revisar antes da apresentação

- Conferir o contexto do EcoMail com o `EcoMail-1.pptx`.
- Saber explicar as funções de `js/metrics.js` e o fallback de modelos.
- Repetir a demo com Gemma 4 26B e, se a API falhar, mostrar a mensagem de erro.

## Declaração

Este registro reflete o uso real das ferramentas durante o desenvolvimento.
O código foi revisado e adaptado para o EcoMail; o aluno é responsável por
explicar e alterar o que for solicitado na apresentação.
