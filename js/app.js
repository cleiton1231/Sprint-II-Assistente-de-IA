// ============================================================
// Interface da aplicação: eventos, estado e renderização.
// Autor: Vitor Mazzonetto
// ============================================================

import { PROVEDORES, TERMOS_CHAVE } from "./config.js";
import { perguntarAoModelo, ErroApi } from "./api.js";
import {
  estimarTokens,
  calcularErroPercentual,
  contarPalavras,
  contarFrases,
  encontrarTermosChave,
  calcularDiversidadeLexical,
  calcularFlesch,
} from "./metrics.js";

const CHAVE_STORAGE = "ecomail:chave:";

const elementos = {
  selectProvedor: document.querySelector("#selectProvedor"),
  selectModelo: document.querySelector("#selectModelo"),
  inputChave: document.querySelector("#inputChave"),
  btnSalvarChave: document.querySelector("#btnSalvarChave"),
  ajudaChave: document.querySelector("#ajudaChave"),
  formPergunta: document.querySelector("#formPergunta"),
  inputPergunta: document.querySelector("#inputPergunta"),
  contadorCaracteres: document.querySelector("#contadorCaracteres"),
  btnEnviar: document.querySelector("#btnEnviar"),
  status: document.querySelector("#status"),
  resposta: document.querySelector("#resposta"),
  textoResposta: document.querySelector("#textoResposta"),
  listaHistorico: document.querySelector("#listaHistorico"),
  painelMetricas: document.querySelector("#painelMetricas"),
  resumoSessao: document.querySelector("#resumoSessao"),
  btnNovaConversa: document.querySelector("#btnNovaConversa"),
};

const estado = {
  provedor: "gemini",
  historico: [],
  carregando: false,
  sessao: 0,
};

// ------------------------------------------------------------
// Utilidades de interface
// ------------------------------------------------------------

function criar(tag, classe, texto) {
  const elemento = document.createElement(tag);
  if (classe) elemento.className = classe;
  if (texto !== undefined && texto !== null) {
    elemento.textContent = String(texto);
  }
  return elemento;
}

function formatarNumero(valor) {
  return new Intl.NumberFormat("pt-BR").format(valor);
}

function formatarDecimal(valor) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
  }).format(valor);
}

function formatarPercentual(valor) {
  return `${new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(valor)}%`;
}

function totalDeTokens(uso) {
  if (!uso) return 0;
  return uso.total > 0 ? uso.total : uso.entrada + uso.saida;
}

function mostrarStatus(mensagem, tipo) {
  elementos.status.textContent = mensagem;
  elementos.status.className = `status ${tipo || "info"}`;
}

// ------------------------------------------------------------
// Chave de API (mantida apenas nesta aba do navegador)
// ------------------------------------------------------------

function carregarChave(provedor) {
  try {
    return sessionStorage.getItem(CHAVE_STORAGE + provedor) || "";
  } catch (erro) {
    return "";
  }
}

function salvarChave(provedor, chave) {
  try {
    if (chave) {
      sessionStorage.setItem(CHAVE_STORAGE + provedor, chave);
    } else {
      sessionStorage.removeItem(CHAVE_STORAGE + provedor);
    }
  } catch (erro) {
    // Se o armazenamento estiver bloqueado, a chave continua só em memória.
  }
}

// Carrega a chave de js/env.js (arquivo local, fora do git) na primeira visita.
function carregarChaveDoEnv() {
  const chaveEnv = window.ENV && window.ENV.GEMINI_API_KEY;
  if (!chaveEnv) return;

  const chaveLimpa = chaveEnv.trim();
  if (!chaveLimpa) return;

  if (!carregarChave("gemini")) {
    salvarChave("gemini", chaveLimpa);
  }

  if (estado.provedor === "gemini" && !elementos.inputChave.value) {
    elementos.inputChave.value = chaveLimpa;
  }
}

// ------------------------------------------------------------
// Provedor e chave
// ------------------------------------------------------------

function preencherProvedores() {
  const ids = Object.keys(PROVEDORES);

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const config = PROVEDORES[id];
    const opcao = document.createElement("option");
    opcao.value = id;
    opcao.textContent = config.nome;
    elementos.selectProvedor.append(opcao);
  }
}

function preencherModelos(config) {
  elementos.selectModelo.textContent = "";

  const lista =
    Array.isArray(config.modelos) && config.modelos.length > 0
      ? config.modelos
      : [{ id: config.modelo, nome: config.modelo }];

  for (let i = 0; i < lista.length; i++) {
    const opcao = document.createElement("option");
    opcao.value = lista[i].id;
    opcao.textContent = lista[i].nome;
    elementos.selectModelo.append(opcao);
  }

  elementos.selectModelo.value = config.modelo;
}

function atualizarProvedor() {
  estado.provedor = elementos.selectProvedor.value;
  const config = PROVEDORES[estado.provedor];

  preencherModelos(config);
  elementos.inputChave.value = carregarChave(estado.provedor);
  elementos.ajudaChave.textContent = "";

  const link = criar("a", "", config.chaveUrl);
  link.href = config.chaveUrl;
  link.target = "_blank";
  link.rel = "noopener noreferrer";

  elementos.ajudaChave.append(
    document.createTextNode("Obtenha sua chave em "),
    link,
    document.createTextNode(
      ". Ela fica apenas nesta aba do navegador e não é gravada no código."
    )
  );
}

function aoSalvarChave() {
  const chave = elementos.inputChave.value.trim();

  if (!chave) {
    salvarChave(estado.provedor, "");
    mostrarStatus("Chave removida desta aba.", "info");
    return;
  }

  salvarChave(estado.provedor, chave);
  mostrarStatus("Chave salva apenas nesta aba do navegador.", "sucesso");
}

// ------------------------------------------------------------
// Envio da pergunta
// ------------------------------------------------------------

function validarPergunta(pergunta) {
  if (pergunta.length === 0) {
    return "Digite uma pergunta antes de enviar.";
  }
  if (pergunta.length < 5) {
    return "Digite uma pergunta com pelo menos 5 caracteres.";
  }
  if (pergunta.length > 500) {
    return "A pergunta deve ter no máximo 500 caracteres.";
  }
  return "";
}

function definirCarregando(carregando) {
  estado.carregando = carregando;
  elementos.btnEnviar.disabled = carregando;
  elementos.btnEnviar.textContent = carregando ? "Consultando..." : "Perguntar";
  elementos.inputPergunta.disabled = carregando;
  elementos.inputChave.disabled = carregando;
  elementos.btnSalvarChave.disabled = carregando;
  elementos.selectProvedor.disabled = carregando;
  elementos.selectModelo.disabled = carregando;
  elementos.btnNovaConversa.disabled = carregando;
  elementos.formPergunta.setAttribute("aria-busy", String(carregando));
}

async function aoEnviar(evento) {
  evento.preventDefault();

  if (estado.carregando) return;

  const pergunta = elementos.inputPergunta.value.trim();
  const erroValidacao = validarPergunta(pergunta);

  if (erroValidacao) {
    mostrarStatus(erroValidacao, "erro");
    elementos.inputPergunta.focus();
    return;
  }

  const chave = elementos.inputChave.value.trim();

  if (!chave) {
    mostrarStatus("Informe a chave da API antes de enviar.", "erro");
    elementos.inputChave.focus();
    return;
  }

  const sessaoAtual = estado.sessao;
  const modelo = elementos.selectModelo.value;

  definirCarregando(true);
  mostrarStatus("Consultando o assistente...", "info");

  const inicio = Date.now();

  try {
    const resultado = await perguntarAoModelo({
      provedor: estado.provedor,
      chave,
      modelo,
      pergunta,
      historico: estado.historico,
    });

    // Se a sessão foi limpa enquanto a API respondia, descarta o resultado.
    if (sessaoAtual !== estado.sessao) {
      return;
    }

    const duracao = Date.now() - inicio;

    estado.historico.push({
      pergunta,
      resposta: resultado.texto,
      modeloNome: resultado.modeloNome,
      uso: resultado.uso,
      duracao,
      data: new Date(),
    });

    exibirResposta(resultado.texto);
    exibirMetricas(pergunta, resultado);
    renderizarHistorico();
    atualizarResumoSessao();

    elementos.inputPergunta.value = "";
    atualizarContador();
    mostrarStatus(`Resposta recebida (${resultado.modeloNome}).`, "sucesso");
  } catch (erro) {
    if (erro instanceof ErroApi) {
      mostrarStatus(erro.message, "erro");
    } else {
      mostrarStatus(
        "Ocorreu um erro inesperado ao consultar a API. Tente novamente.",
        "erro"
      );
    }
  } finally {
    definirCarregando(false);
  }
}

// ------------------------------------------------------------
// Exibição da resposta e do histórico
// ------------------------------------------------------------

function exibirResposta(texto) {
  elementos.textoResposta.textContent = texto;
  elementos.resposta.hidden = false;
}

function renderizarHistorico() {
  elementos.listaHistorico.textContent = "";

  if (estado.historico.length === 0) {
    elementos.listaHistorico.append(
      criar("p", "vazio", "Nenhuma pergunta ainda.")
    );
    return;
  }

  for (let i = estado.historico.length - 1; i >= 0; i--) {
    const item = estado.historico[i];
    const bloco = criar("article", "item-historico");
    const meta = criar("div", "item-meta");

    const rotuloModelo = item.modeloNome ? `${item.modeloNome} · ` : "";

    meta.append(
      criar("span", "item-numero", `#${i + 1}`),
      criar(
        "span",
        "",
        `${rotuloModelo}${item.data.toLocaleTimeString("pt-BR")}`
      )
    );

    bloco.append(
      meta,
      criar("p", "item-pergunta", item.pergunta),
      criar("p", "item-resposta", item.resposta)
    );

    if (item.uso) {
      const tokens = totalDeTokens(item.uso);

      bloco.append(
        criar(
          "p",
          "item-uso",
          `${formatarNumero(tokens)} tokens · ${formatarNumero(item.duracao)} ms`
        )
      );
    }

    elementos.listaHistorico.append(bloco);
  }
}

function atualizarResumoSessao() {
  let tokens = 0;

  for (let i = 0; i < estado.historico.length; i++) {
    tokens += totalDeTokens(estado.historico[i].uso);
  }

  const perguntas = estado.historico.length;
  const rotulo = perguntas === 1 ? "pergunta" : "perguntas";

  elementos.resumoSessao.textContent = `Sessão: ${formatarNumero(
    perguntas
  )} ${rotulo} · ${formatarNumero(tokens)} tokens reais`;
}

// ------------------------------------------------------------
// Painel de métricas
// ------------------------------------------------------------

function criarCartao(codigo, titulo, valor, detalhes) {
  const cartao = criar("article", "metrica");
  const topo = criar("div", "metrica-topo");

  topo.append(
    criar("span", "metrica-codigo", codigo),
    criar("h3", "metrica-titulo", titulo)
  );

  cartao.append(topo, criar("p", "metrica-valor", valor));

  if (detalhes && detalhes.length > 0) {
    const lista = criar("dl", "metrica-detalhes");

    for (let i = 0; i < detalhes.length; i++) {
      const linha = criar("div", "metrica-detalhe");
      linha.append(
        criar("dt", "", detalhes[i][0]),
        criar("dd", "", detalhes[i][1])
      );
      lista.append(linha);
    }

    cartao.append(lista);
  }

  return cartao;
}

function criarCartaoTokens(estimativaEntrada, estimativaSaida, uso) {
  const cartao = criar("article", "metrica");
  const topo = criar("div", "metrica-topo");

  topo.append(
    criar("span", "metrica-codigo", "M1"),
    criar("h3", "metrica-titulo", "Tokens (entrada / saída)")
  );
  cartao.append(topo);

  const tabela = criar("table", "tabela-tokens");
  const cabecalho = criar("thead");
  const linhaCabecalho = criar("tr");
  const titulos = ["", "Estimado", "Real (API)", "Erro"];

  for (let i = 0; i < titulos.length; i++) {
    linhaCabecalho.append(criar("th", "", titulos[i]));
  }

  cabecalho.append(linhaCabecalho);
  tabela.append(cabecalho);

  const linhas = [
    { rotulo: "Entrada", estimado: estimativaEntrada, real: uso.entrada },
    { rotulo: "Saída", estimado: estimativaSaida, real: uso.saida },
  ];

  const corpo = criar("tbody");

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    const tr = criar("tr");
    const erro = calcularErroPercentual(linha.estimado, linha.real);

    tr.append(
      criar("th", "", linha.rotulo),
      criar("td", "", formatarNumero(linha.estimado)),
      criar("td", "", linha.real > 0 ? formatarNumero(linha.real) : "n/d"),
      criar("td", "", erro === null ? "n/d" : formatarPercentual(erro))
    );

    corpo.append(tr);
  }

  tabela.append(corpo);
  cartao.append(
    tabela,
    criar(
      "p",
      "metrica-rodape",
      "Estimativa: caracteres ÷ 4. Real: campo usage da API."
    )
  );

  return cartao;
}

function criarCartaoTermos(termos) {
  const cartao = criar("article", "metrica");
  const topo = criar("div", "metrica-topo");

  topo.append(
    criar("span", "metrica-codigo", "M4"),
    criar("h3", "metrica-titulo", "Termos-chave do projeto")
  );

  cartao.append(
    topo,
    criar(
      "p",
      "metrica-valor",
      `${termos.quantidade} de ${termos.totalTermos}`
    )
  );

  if (termos.quantidade > 0) {
    const chips = criar("div", "chips");

    for (let i = 0; i < termos.encontrados.length; i++) {
      chips.append(criar("span", "chip", termos.encontrados[i]));
    }

    cartao.append(chips);
  } else {
    cartao.append(
      criar(
        "p",
        "metrica-rodape",
        "Nenhum termo do projeto apareceu na resposta."
      )
    );
  }

  return cartao;
}

function exibirMetricas(pergunta, resultado) {
  const estimativaEntrada = estimarTokens(resultado.textoEnviado);
  const estimativaSaida = estimarTokens(resultado.texto);
  const palavrasPergunta = contarPalavras(pergunta);
  const palavrasResposta = contarPalavras(resultado.texto);
  const frases = contarFrases(resultado.texto);
  const termos = encontrarTermosChave(resultado.texto, TERMOS_CHAVE);
  const diversidade = calcularDiversidadeLexical(resultado.texto);
  const flesch = calcularFlesch(resultado.texto);

  elementos.painelMetricas.textContent = "";

  elementos.painelMetricas.append(
    criarCartaoTokens(estimativaEntrada, estimativaSaida, resultado.uso),
    criarCartao(
      "M2",
      "Palavras da resposta",
      `${formatarNumero(palavrasResposta)} palavras`,
      [["Pergunta", formatarNumero(palavrasPergunta)]]
    ),
    criarCartao(
      "M3",
      "Frases da resposta",
      `${formatarNumero(frases)} ${frases === 1 ? "frase" : "frases"}`,
      [["Critério", "blocos de . ! ?"]]
    ),
    criarCartaoTermos(termos),
    criarCartao(
      "M5",
      "Diversidade lexical",
      formatarPercentual(diversidade.percentual),
      [
        ["Palavras distintas", formatarNumero(diversidade.palavrasDistintas)],
        ["Total de palavras", formatarNumero(diversidade.totalPalavras)],
        ["Nível", "intermediário"],
      ]
    ),
    criarCartao(
      "M6",
      "Índice de Flesch (PT)",
      formatarDecimal(flesch.indice),
      [
        ["Classificação", flesch.classificacao],
        [
          "Palavras / frases usadas / sílabas",
          `${formatarNumero(flesch.palavras)} / ${formatarNumero(
            flesch.frasesConsideradas
          )} / ${formatarNumero(flesch.silabas)}`,
        ],
        ["Frases detectadas", formatarNumero(flesch.frases)],
        ["Nível", "desafio"],
      ]
    )
  );
}

// ------------------------------------------------------------
// Contador e nova conversa
// ------------------------------------------------------------

function atualizarContador() {
  const total = elementos.inputPergunta.value.length;
  const maximo = elementos.inputPergunta.maxLength;

  elementos.contadorCaracteres.textContent = `${total}/${maximo}`;
}

function novaConversa() {
  if (
    estado.historico.length > 0 &&
    !confirm("Limpar o histórico e as métricas desta sessão?")
  ) {
    return;
  }

  estado.historico = [];
  estado.sessao++;
  elementos.textoResposta.textContent = "";
  elementos.resposta.hidden = true;
  elementos.painelMetricas.textContent = "";
  elementos.painelMetricas.append(
    criar("p", "vazio", "As métricas aparecem após a primeira resposta.")
  );

  renderizarHistorico();
  atualizarResumoSessao();
  mostrarStatus("Nova conversa iniciada.", "info");
  elementos.inputPergunta.focus();
}

// ------------------------------------------------------------
// Inicialização
// ------------------------------------------------------------

function iniciar() {
  preencherProvedores();
  elementos.selectProvedor.value = "gemini";
  atualizarProvedor();
  carregarChaveDoEnv();
  renderizarHistorico();
  atualizarResumoSessao();
  atualizarContador();

  elementos.selectProvedor.addEventListener("change", atualizarProvedor);
  elementos.btnSalvarChave.addEventListener("click", aoSalvarChave);

  elementos.inputChave.addEventListener("keydown", (evento) => {
    if (evento.key === "Enter") {
      evento.preventDefault();
      aoSalvarChave();
    }
  });

  elementos.formPergunta.addEventListener("submit", aoEnviar);
  elementos.inputPergunta.addEventListener("input", atualizarContador);
  elementos.btnNovaConversa.addEventListener("click", novaConversa);
}

iniciar();
