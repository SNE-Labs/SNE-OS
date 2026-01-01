// ============================================
// SNE RADAR - SCORE DISPLAY UTILS v2.2
// Regras de exibição padronizadas para scores
// ============================================

/**
 * Formata score 0-100 para exibição
 * Regra: score > 0 ? "X/100" : "Dados insuficientes"
 *
 * @param score_0_100 - Score de 0 a 100
 * @returns String formatada para exibição
 */
export const formatScore = (score_0_100: number): string => {
  if (score_0_100 <= 0 || isNaN(score_0_100)) {
    return 'Dados insuficientes'
  }

  // Garante que está entre 0-100
  const clampedScore = Math.max(0, Math.min(100, Math.round(score_0_100)))
  return `${clampedScore}/100`
}

/**
 * Converte score 0-100 para nível descritivo
 * @param score_0_100 - Score de 0 a 100
 * @returns Nível descritivo
 */
export const getScoreLevel = (score_0_100: number): string => {
  if (score_0_100 <= 0 || isNaN(score_0_100)) {
    return 'Indefinido'
  }

  if (score_0_100 >= 80) return 'Excelente'
  if (score_0_100 >= 60) return 'Bom'
  if (score_0_100 >= 40) return 'Regular'
  if (score_0_100 >= 20) return 'Fraco'
  return 'Muito Fraco'
}

/**
 * Retorna classe CSS baseada no score
 * @param score_0_100 - Score de 0 a 100
 * @returns Classe CSS para styling
 */
export const getScoreClass = (score_0_100: number): string => {
  if (score_0_100 <= 0 || isNaN(score_0_100)) {
    return 'score-insufficient'
  }

  if (score_0_100 >= 80) return 'score-excellent'
  if (score_0_100 >= 60) return 'score-good'
  if (score_0_100 >= 40) return 'score-medium'
  if (score_0_100 >= 20) return 'score-low'
  return 'score-very-low'
}

/**
 * Calcula progresso visual (0-1) para barras de progresso
 * @param score_0_100 - Score de 0 a 100
 * @returns Valor entre 0 e 1
 */
export const getScoreProgress = (score_0_100: number): number => {
  if (score_0_100 <= 0 || isNaN(score_0_100)) {
    return 0
  }

  return Math.max(0, Math.min(1, score_0_100 / 100))
}

/**
 * Formatação completa para UI com nível e progresso
 * @param score_0_100 - Score de 0 a 100
 * @returns Objeto com todas as informações de exibição
 */
export const getScoreDisplayData = (score_0_100: number) => {
  return {
    display: formatScore(score_0_100),
    level: getScoreLevel(score_0_100),
    className: getScoreClass(score_0_100),
    progress: getScoreProgress(score_0_100),
    isValid: score_0_100 > 0 && !isNaN(score_0_100)
  }
}
