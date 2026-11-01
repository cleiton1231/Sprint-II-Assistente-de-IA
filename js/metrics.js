// ============================================================
// Métricas calculadas em JavaScript puro.
// Cada métrica é uma função independente que recebe o texto e
// devolve o valor calculado. Nenhuma biblioteca externa.
// Autor: Vitor Mazzonetto
// ============================================================

// ------------------------------------------------------------
// Normalização (apoio para as demais métricas)
// Nível: intermediário
// Autor: Vitor Mazzonetto
// Remove acentos, pontuação e espaços repetidos, usando um laço
// caractere a caractere.
// ------------------------------------------------------------
export function normalizarTexto(texto) {
  if (typeof texto !== "string") return "";

  const comAcento = "áàâãäéèêëíìîïóòôõöúùûüç";
  const semAcento = "aaaaaeeeeiiiiooooouuuuc";

  let minusculo = "";
  for (let i = 0; i < texto.length; i++) {
    minusculo += texto[i].toLowerCase();
  }

  let semAcentos = "";
  for (let i = 0; i < minusculo.length; i++) {
    const caractere = minusculo[i];
    const posicao = comAcento.indexOf(caractere);
    semAcentos += posicao === -1 ? caractere : semAcento[posicao];
  }

  let limpo = "";
  for (let i = 0; i < semAcentos.length; i++) {
    const c = semAcentos[i];
    const ehLetra = c >= "a" && c <= "z";
    const ehNumero = c >= "0" && c <= "9";
    const ehEspaco = c === " " || c === "\n" || c === "\t" || c === "\r";
    limpo += ehLetra || ehNumero || ehEspaco ? c : " ";
  }

  return limpo.replace(/\s+/g, " ").trim();
}

// ------------------------------------------------------------
// M1 (obrigatória) — estimativa de tokens
// Regra simples: 1 token ≈ 4 caracteres.
// Autor: Vitor Mazzonetto
// ------------------------------------------------------------
export function estimarTokens(texto) {
  if (typeof texto !== "string") return 0;
  return Math.ceil(texto.length / 4);
}

// ------------------------------------------------------------
// M1 (obrigatória) — erro percentual da estimativa
// Retorna null quando não há valor real (a API não informou usage).
// Autor: Vitor Mazzonetto
// ------------------------------------------------------------
export function calcularErroPercentual(estimado, real) {
  if (!Number.isFinite(estimado) || !Number.isFinite(real) || real <= 0) {
    return null;
  }
  return (Math.abs(estimado - real) / real) * 100;
}

// ------------------------------------------------------------
// M2 (obrigatória) — número de palavras
// Trata espaços repetidos e quebras de linha.
// Autor: Vitor Mazzonetto
// ------------------------------------------------------------
export function contarPalavras(texto) {
  if (typeof texto !== "string") return 0;
  const limpo = texto.replace(/\s+/g, " ").trim();
  if (limpo === "") return 0;
  return limpo.split(" ").length;
}

// ------------------------------------------------------------
// M3 (obrigatória) — número de frases
// Conta blocos de pontuação final (. ! ?), percorrendo a string
// caractere a caractere. "..." conta como uma frase e números
// decimais (3.5) não contam.
// Autor: Vitor Mazzonetto
// ------------------------------------------------------------
export function contarFrases(texto) {
  if (typeof texto !== "string") return 0;

  let total = 0;
  let dentroDePontuacao = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    const ehPontuacao = c === "." || c === "!" || c === "?";

    if (ehPontuacao) {
      const anterior = texto[i - 1];
      const proximo = texto[i + 1];
      const ehDecimal =
        c === "." &&
        anterior >= "0" &&
        anterior <= "9" &&
        proximo >= "0" &&
        proximo <= "9";

      if (!ehDecimal && !dentroDePontuacao) total++;
      dentroDePontuacao = true;
    } else {
      dentroDePontuacao = false;
    }
  }

  return total;
}

// ------------------------------------------------------------
// Apoio à M4 — compara uma palavra da resposta com um termo,
// aceitando singular e plural simples.
// Autor: Vitor Mazzonetto
// ------------------------------------------------------------
function palavraCorresponde(palavra, termo) {
  if (palavra === termo) return true;
  if (palavra === `${termo}s` || palavra === `${termo}es`) return true;

  // Plural de palavras terminadas em -ão: classificação -> classificações.
  if (termo.endsWith("ao") && palavra === `${termo.slice(0, -2)}oes`) {
    return true;
  }

  // Plural de palavras terminadas em -m: mensagem -> mensagens.
  if (termo.endsWith("m") && palavra === `${termo.slice(0, -1)}ns`) {
    return true;
  }

  return false;
}

// ------------------------------------------------------------
// Apoio à M4 — procura uma sequência de palavras no texto.
// Evita falsos positivos de substring em termos compostos.
// Autor: Vitor Mazzonetto
// ------------------------------------------------------------
function contemTermo(palavrasDoTexto, partesDoTermo) {
  if (partesDoTermo.length === 0 || partesDoTermo.length > palavrasDoTexto.length) {
    return false;
  }

  for (let i = 0; i <= palavrasDoTexto.length - partesDoTermo.length; i++) {
    let corresponde = true;

    for (let j = 0; j < partesDoTermo.length; j++) {
      if (!palavraCorresponde(palavrasDoTexto[i + j], partesDoTermo[j])) {
        corresponde = false;
        break;
      }
    }

    if (corresponde) return true;
  }

  return false;
}

// ------------------------------------------------------------
// M4 (obrigatória) — termos-chave do projeto
// Retorna quantos e quais termos aparecem na resposta.
// Autor: Vitor Mazzonetto
// ------------------------------------------------------------
export function encontrarTermosChave(texto, termos) {
  const encontrados = [];
  const lista = Array.isArray(termos) ? termos : [];

  if (typeof texto !== "string") {
    return { encontrados, quantidade: 0, totalTermos: lista.length };
  }

  const textoNormalizado = normalizarTexto(texto);
  const palavrasDoTexto = textoNormalizado.split(" ").filter(Boolean);

  for (let i = 0; i < lista.length; i++) {
    const termoNormalizado = normalizarTexto(lista[i]);
    if (termoNormalizado === "") continue;

    const partes = termoNormalizado.split(" ");
    const apareceu = contemTermo(palavrasDoTexto, partes);

    if (apareceu) encontrados.push(lista[i]);
  }

  return {
    encontrados,
    quantidade: encontrados.length,
    totalTermos: lista.length,
  };
}

// ------------------------------------------------------------
// Métrica escolhida M5 (intermediário) — diversidade lexical
// Palavras distintas ÷ total de palavras.
// Autor: Vitor Mazzonetto
// ------------------------------------------------------------
export function calcularDiversidadeLexical(texto) {
  const normalizado = normalizarTexto(texto);
  if (normalizado === "") {
    return { totalPalavras: 0, palavrasDistintas: 0, percentual: 0 };
  }

  const palavras = normalizado.split(" ").filter(Boolean);
  const distintas = new Set(palavras);

  return {
    totalPalavras: palavras.length,
    palavrasDistintas: distintas.size,
    percentual: (distintas.size / palavras.length) * 100,
  };
}

// ------------------------------------------------------------
// Apoio à M6 — contagem aproximada de sílabas
// Percorre a string caractere a caractere e conta cada grupo de
// vogais consecutivas como uma sílaba.
// Autor: Vitor Mazzonetto
// ------------------------------------------------------------
export function contarSilabas(texto) {
  if (typeof texto !== "string") return 0;

  const vogais = "aeiouáàâãäéèêëíìîïóòôõöúùûü";
  const minusculo = texto.toLowerCase();

  let silabas = 0;
  let dentroDeVogal = false;

  for (let i = 0; i < minusculo.length; i++) {
    const c = minusculo[i];
    const ehVogal = vogais.indexOf(c) !== -1;

    if (ehVogal) {
      if (!dentroDeVogal) silabas++;
      dentroDeVogal = true;
    } else {
      dentroDeVogal = false;
    }
  }

  return silabas;
}

// ------------------------------------------------------------
// Apoio à M6 — classificação do índice de Flesch
// Autor: Vitor Mazzonetto
// ------------------------------------------------------------
export function classificarFlesch(indice) {
  if (indice >= 75) return "fácil";
  if (indice >= 50) return "médio";
  return "difícil";
}

// ------------------------------------------------------------
// Métrica escolhida M6 (desafio) — índice de Flesch adaptado
// ao português:
// 248,835 − 1,015 × (palavras/frases) − 84,6 × (sílabas/palavras)
// Autor: Vitor Mazzonetto
// ------------------------------------------------------------
export function calcularFlesch(texto) {
  const palavras = contarPalavras(texto);
  const frases = contarFrases(texto);
  const silabas = contarSilabas(texto);

  if (palavras === 0) {
    return {
      indice: 0,
      classificacao: "sem texto",
      palavras: 0,
      frases: 0,
      frasesConsideradas: 0,
      silabas: 0,
    };
  }

  // Evita divisão por zero em respostas sem pontuação final.
  const frasesConsideradas = Math.max(1, frases);
  const indice =
    248.835 -
    1.015 * (palavras / frasesConsideradas) -
    84.6 * (silabas / palavras);
  const indiceArredondado = Math.round(indice * 10) / 10;

  return {
    indice: indiceArredondado,
    classificacao: classificarFlesch(indiceArredondado),
    palavras,
    frases,
    frasesConsideradas,
    silabas,
  };
}
