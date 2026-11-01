// ============================================================
// Comunicação com as APIs de LLM.
// Autor: Vitor Mazzonetto
// A chave é recebida em memória (campo da página) e enviada
// apenas no cabeçalho da requisição.
// ============================================================

import { PROVEDORES, montarPromptSistema } from "./config.js";

export class ErroApi extends Error {
  constructor(mensagem, tipo) {
    super(mensagem);
    this.name = "ErroApi";
    this.tipo = tipo;
  }
}

/**
 * Monta as mensagens enviadas ao modelo, incluindo as últimas
 * trocas da sessão para dar continuidade à conversa.
 */
export function montarMensagens(historico, pergunta) {
  const mensagens = [];
  const ultimosItens = historico.slice(-3);

  for (let i = 0; i < ultimosItens.length; i++) {
    mensagens.push({ papel: "user", texto: ultimosItens[i].pergunta });
    mensagens.push({ papel: "assistant", texto: ultimosItens[i].resposta });
  }

  mensagens.push({ papel: "user", texto: pergunta });
  return mensagens;
}

/** Texto completo enviado ao modelo, usado na estimativa de tokens. */
export function montarTextoEnviado(mensagens) {
  const partes = [montarPromptSistema()];
  for (let i = 0; i < mensagens.length; i++) {
    partes.push(mensagens[i].texto);
  }
  return partes.join("\n");
}

/** Remove a chave de qualquer mensagem de erro exibida ao usuário. */
function ocultarChave(texto, chave) {
  if (!texto || !chave) return texto;
  return texto.split(chave).join("[chave ocultada]");
}

/** Faz a requisição e converte falhas de rede/HTTP em ErroApi. */
async function requisitar(url, opcoes, chave) {
  let resposta;

  try {
    resposta = await fetch(url, opcoes);
  } catch (erro) {
    throw new ErroApi(
      "Não foi possível conectar ao serviço. Verifique sua internet e tente novamente.",
      "rede"
    );
  }

  if (!resposta.ok) {
    let detalhe = "";

    try {
      const dados = await resposta.json();
      if (dados && dados.error && typeof dados.error.message === "string") {
        detalhe = dados.error.message;
      }
    } catch (erro) {
      detalhe = "";
    }

    detalhe = ocultarChave(detalhe, chave);

    if (resposta.status === 401 || resposta.status === 403) {
      throw new ErroApi(
        "Chave de API inválida ou sem permissão. Confira a chave e o provedor selecionado.",
        "chave"
      );
    }

    if (resposta.status === 429) {
      throw new ErroApi(
        "Limite de uso ou cota excedida. Aguarde alguns instantes e tente novamente.",
        "limite"
      );
    }

    if (resposta.status === 404) {
      throw new ErroApi(
        "O modelo selecionado não está disponível. Tentando outro modelo.",
        "modelo"
      );
    }

    if (resposta.status >= 500) {
      throw new ErroApi(
        "O serviço do provedor está instável. Tente novamente em alguns instantes.",
        "servidor"
      );
    }

    const complemento = detalhe ? ` Detalhe: ${detalhe}` : "";
    throw new ErroApi(
      `A API retornou um erro (código ${resposta.status}).${complemento}`,
      "api"
    );
  }

  try {
    return await resposta.json();
  } catch (erro) {
    throw new ErroApi(
      "A resposta da API veio em formato inesperado. Tente novamente.",
      "formato"
    );
  }
}

async function chamarGemini({ chave, modelo, mensagens }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    modelo
  )}:generateContent`;

  const corpo = {
    systemInstruction: { parts: [{ text: montarPromptSistema() }] },
    contents: mensagens.map((m) => ({
      role: m.papel === "assistant" ? "model" : "user",
      parts: [{ text: m.texto }],
    })),
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 600,
    },
  };

  const dados = await requisitar(
    url,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": chave,
      },
      body: JSON.stringify(corpo),
    },
    chave
  );

  if (!dados || !Array.isArray(dados.candidates)) {
    throw new ErroApi(
      "A resposta da API veio em formato inesperado. Tente novamente.",
      "formato"
    );
  }

  let texto = "";

  try {
    const partes = dados.candidates[0]?.content?.parts;
    texto = Array.isArray(partes)
      ? partes
          // Modelos Gemma podem devolver o raciocínio em uma parte com thought=true.
          .filter((parte) => !parte.thought)
          .map((parte) => parte.text || "")
          .join("")
          .trim()
      : "";
  } catch (erro) {
    throw new ErroApi(
      "A resposta da API veio em formato inesperado. Tente novamente.",
      "formato"
    );
  }

  if (!texto) {
    throw new ErroApi(
      "A API não retornou texto. A pergunta pode ter sido bloqueada pelos filtros do provedor.",
      "vazia"
    );
  }

  const uso = dados?.usageMetadata || {};

  return {
    texto,
    modeloUsado: modelo,
    uso: {
      entrada: Number(uso.promptTokenCount) || 0,
      saida: Number(uso.candidatesTokenCount) || 0,
      total: Number(uso.totalTokenCount) || 0,
    },
  };
}

async function chamarOpenAICompativel({ chave, modelo, url, mensagens }) {
  const corpo = {
    model: modelo,
    messages: [
      { role: "system", content: montarPromptSistema() },
      ...mensagens.map((m) => ({ role: m.papel, content: m.texto })),
    ],
    temperature: 0.3,
    max_tokens: 600,
  };

  const dados = await requisitar(
    url,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${chave}`,
      },
      body: JSON.stringify(corpo),
    },
    chave
  );

  if (!dados || !Array.isArray(dados.choices)) {
    throw new ErroApi(
      "A resposta da API veio em formato inesperado. Tente novamente.",
      "formato"
    );
  }

  let texto = "";

  try {
    texto = (dados.choices[0]?.message?.content || "").trim();
  } catch (erro) {
    throw new ErroApi(
      "A resposta da API veio em formato inesperado. Tente novamente.",
      "formato"
    );
  }

  if (!texto) {
    throw new ErroApi(
      "A API não retornou texto. A pergunta pode ter sido bloqueada pelos filtros do provedor.",
      "vazia"
    );
  }

  const uso = dados?.usage || {};

  return {
    texto,
    modeloUsado: modelo,
    uso: {
      entrada: Number(uso.prompt_tokens) || 0,
      saida: Number(uso.completion_tokens) || 0,
      total: Number(uso.total_tokens) || 0,
    },
  };
}

function obterNomeDoModelo(config, modelo) {
  const lista = config.modelos || [];

  for (let i = 0; i < lista.length; i++) {
    if (lista[i].id === modelo) return lista[i].nome;
  }

  return modelo;
}

function montarListaDeModelos(config, modeloPreferido) {
  const ids = [modeloPreferido];

  if (Array.isArray(config.modelos)) {
    for (let i = 0; i < config.modelos.length; i++) {
      ids.push(config.modelos[i].id);
    }
  } else {
    ids.push(config.modelo);
  }

  const lista = [];
  for (let i = 0; i < ids.length; i++) {
    if (ids[i] && lista.indexOf(ids[i]) === -1) lista.push(ids[i]);
  }

  return lista;
}

// Falhas em que vale a pena tentar outro modelo Gemini.
const ERROS_COM_FALLBACK = ["limite", "servidor", "modelo", "vazia"];

/**
 * Envia a pergunta ao provedor escolhido.
 * No Gemini, tenta o modelo selecionado e, se ele falhar, os demais
 * modelos da lista (Gemma e Gemini Flash Lite) como fallback.
 * Devolve o texto, os tokens reais, o modelo usado e o texto enviado.
 */
export async function perguntarAoModelo({
  provedor,
  chave,
  modelo,
  pergunta,
  historico,
}) {
  const config = PROVEDORES[provedor];

  if (!config) {
    throw new ErroApi("Provedor de IA inválido.", "config");
  }

  const chaveLimpa = typeof chave === "string" ? chave.trim() : "";

  if (!chaveLimpa) {
    throw new ErroApi(
      "Informe a chave da API antes de enviar a pergunta.",
      "chave"
    );
  }

  const mensagens = montarMensagens(historico || [], pergunta);
  const textoEnviado = montarTextoEnviado(mensagens);
  const modeloPreferido =
    typeof modelo === "string" && modelo.trim() ? modelo.trim() : config.modelo;

  let resultado = null;

  if (provedor === "gemini") {
    const lista = montarListaDeModelos(config, modeloPreferido);
    let ultimoErro = null;

    for (let i = 0; i < lista.length; i++) {
      try {
        resultado = await chamarGemini({
          chave: chaveLimpa,
          modelo: lista[i],
          mensagens,
        });
        break;
      } catch (erro) {
        const podeTentarOutro =
          erro instanceof ErroApi &&
          ERROS_COM_FALLBACK.indexOf(erro.tipo) !== -1;

        if (!podeTentarOutro) throw erro;
        ultimoErro = erro;
      }
    }

    if (!resultado) {
      throw new ErroApi(
        `Nenhum modelo Gemini respondeu. ${
          ultimoErro ? ultimoErro.message : "Tente novamente."
        }`,
        ultimoErro ? ultimoErro.tipo : "modelo"
      );
    }
  } else {
    const url =
      provedor === "openai"
        ? "https://api.openai.com/v1/chat/completions"
        : "https://api.groq.com/openai/v1/chat/completions";

    resultado = await chamarOpenAICompativel({
      chave: chaveLimpa,
      modelo: modeloPreferido,
      url,
      mensagens,
    });
  }

  return {
    ...resultado,
    modeloNome: obterNomeDoModelo(config, resultado.modeloUsado),
    textoEnviado,
  };
}
