# Registro de uso de IA — Sprint II

**Aluno(a):** Vitor Mazzonetto
**Trabalho:** Assistente de IA do projeto EcoMail — Sprint II
**Data:** novembro de 2026

## Ferramentas utilizadas

- **OpenCode** (agente de código) com o modelo **DeepSeek V4.1 Flash**.
- **Subagente revisor** do OpenCode, configurado apenas com os critérios da
  rubrica, para auditar o código e apontar o que faltava.
- **Navegador integrado do OpenCode** para testar a aplicação com a chave real e
  capturar a tela usada nos slides.
- Nenhuma biblioteca externa foi usada na aplicação. O `jsdom` foi usado apenas
  em testes locais, fora da pasta entregue.

## Para que a IA foi usada

| Parte | Como a IA ajudou |
| --- | --- |
| Estrutura HTML/CSS | Layout das colunas, formulário, cartões de métricas, responsividade e estados de erro. |
| Contexto e prompt | Leitura do IS Canvas do EcoMail no `EcoMail-1.pptx` e redação do contexto e das regras de escopo enviadas ao LLM. |
| Integração com APIs | Chamadas ao Gemini, OpenAI e Groq, leitura do JSON, normalização do campo `usage`, seleção de modelos Gemma/Gemini e fallback automático. |
| Métricas | Implementação das funções de M1 a M6, incluindo normalização, contagem de frases, sílabas e Flesch. |
| Tratamento de erros | Mensagens para chave inválida, limite excedido, falha de rede e JSON inesperado. |
| Segurança | Campo de chave na página, uso de `sessionStorage` e envio por cabeçalho. |
| Testes | Casos de teste das métricas e da interface fora do navegador. |
| Teste ao vivo | Chamadas reais ao Google AI Studio com Gemma 4 26B, Gemma 4 31B e Gemini 3.5/3.1 Flash Lite; conferência do free tier e captura de tela. |
| Documentação | README, roteiro de slides e este registro. |

No teste ao vivo, o Gemma 4 26B respondeu corretamente às perguntas dentro e fora
do escopo. O Gemma 4 31B teve um erro 500 transitório em uma das tentativas e o
fallback foi acionado. A API não informa o plano contratado, mas as cotas exibidas
no AI Studio (0/30 e 0/15) são compatíveis com o free tier.

O código foi produzido com apoio intenso de IA nesta etapa. **Antes da entrega e
da apresentação, o aluno deve revisar cada função, adaptar o contexto ao sistema
real da Sprint I e ser capaz de explicar e alterar o código ao vivo.**

## Exemplos de prompts utilizados

1. **Pedido geral**
   > Implemente a Sprint II em HTML + JavaScript puro: assistente que responde
   > dúvidas sobre o sistema da Sprint I usando uma API de LLM, com contexto,
   > prompt restritivo, histórico, validação, tratamento de erros e painel de
   > métricas calculadas em funções próprias.

2. **Métricas**
   > Crie as métricas M1 a M4 e mais duas escolhidas (uma intermediária e uma
   > de desafio) em funções puras `nome(texto)`, sem bibliotecas. Pelo menos uma
   > deve percorrer a string caractere a caractere. Comente o autor de cada uma.

3. **Revisão**
   > Audite o código contra os critérios da rubrica da Sprint II. Aponte
   > arquivo e linha, o que está incorreto ou ausente e como corrigir. Não
   > altere os arquivos.

4. **Teste**
   > Escreva casos de teste para as funções de métrica com espaços repetidos,
   > quebras de linha, acentos, reticências, decimais e respostas sem `usage`.

## Pontos que preciso saber explicar

Preencha esta coluna depois de estudar o código:

| Função | O que preciso explicar | Revisei? |
| --- | --- | --- |
| `normalizarTexto` | Laço caractere a caractere, remoção de acentos e pontuação | ☐ |
| `estimarTokens` | Por que caracteres ÷ 4 é apenas uma estimativa | ☐ |
| `calcularErroPercentual` | Fórmula e proteção contra divisão por zero | ☐ |
| `contarPalavras` | Tratamento de espaços repetidos e quebras de linha | ☐ |
| `contarFrases` | Por que `...` conta uma vez e `3.5` não conta | ☐ |
| `encontrarTermosChave` | Normalização, singular/plural e lista de termos | ☐ |
| `calcularDiversidadeLexical` | `Set`, palavras distintas ÷ total | ☐ |
| `contarSilabas` | Grupos de vogais e limitações da aproximação | ☐ |
| `calcularFlesch` | Fórmula, divisão por frases e classificação | ☐ |
| `perguntarAoModelo` | Formatos de requisição e resposta de cada provedor | ☐ |
| `chamarGemini` | Filtro de `thought: true` e leitura de `usageMetadata` | ☐ |
| Fallback | Ordem dos modelos e erros que disparam nova tentativa | ☐ |
| `requisitar` | Erros 401/403, 429, 5xx, rede e JSON inválido | ☐ |
| Chave | Por que não pode ficar no código e como o `sessionStorage` ajuda | ☐ |

## O que ainda depende do aluno

- Conferir o contexto do EcoMail em `js/config.js` com o PPTX original e
  corrigir qualquer detalhe que esteja diferente.
- **Entrega individual confirmada:** todas as métricas e comentários são de
  Vitor Mazzonetto; não há divisão de métricas.
- Revisar as funções da tabela acima e marcar o que já sabe explicar.
- Repetir o teste ao vivo na apresentação. O teste com Gemma 4 26B já foi
  realizado; as capturas estão em `assets/`.

## Declaração

Este registro foi preenchido como parte da entrega. As ferramentas e os prompts
acima refletem o uso real durante o desenvolvimento. O aluno é responsável por
compreender o código entregue e por conseguir explicá-lo e alterá-lo na
apresentação.
