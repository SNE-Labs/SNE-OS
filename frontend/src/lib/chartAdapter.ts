// ============================================
// SNE RADAR - CHART ADAPTER v2.2
// Conversões entre dados da API e Lightweight Charts
// ============================================

import type { Time } from 'lightweight-charts'
import type { CandleData, LevelsData } from '../types/analysis'
import type { LightweightCandle, LightweightLevel, ChartAdapter } from '../types/chart'
import { safeToFixed } from './utils'

// ============================================
// CANDLE DATA CONVERSION
// ============================================

/**
 * Converte CandleData da API para LightweightCandle
 * @param candles - Array de candles da API
 * @returns Array formatado para Lightweight Charts
 */
export const adaptCandlesToLightweight = (candles: CandleData[]): LightweightCandle[] => {
  return candles.map((candle): LightweightCandle => ({
    time: (candle.timestamp / 1000) as Time, // Convert milliseconds to seconds
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume
  }))
}

/**
 * Valida e filtra candles inválidos
 * @param candles - Array de candles para validar
 * @returns Array de candles válidos
 */
export const validateCandles = (candles: CandleData[]): CandleData[] => {
  return candles.filter(candle => {
    const { timestamp, open, high, low, close } = candle

    // Check for valid numbers
    if (
      !timestamp || isNaN(timestamp) ||
      !open || isNaN(open) ||
      !high || isNaN(high) ||
      !low || isNaN(low) ||
      !close || isNaN(close)
    ) {
      console.warn('ChartAdapter: Invalid candle data', candle)
      return false
    }

    // Check logical constraints
    if (high < Math.max(open, close) || low > Math.min(open, close)) {
      console.warn('ChartAdapter: Illogical candle data', candle)
      return false
    }

    return true
  })
}

// ============================================
// LEVELS DATA CONVERSION
// ============================================

/**
 * Converte LevelsData da API para LightweightLevel arrays
 * @param levels - Dados de níveis da API
 * @returns Objeto com arrays de supports e resistances
 */
export const adaptLevelsToLightweight = (levels: LevelsData): {
  supports: LightweightLevel[]
  resistances: LightweightLevel[]
} => {
  const supports: LightweightLevel[] = levels.supports.map((level, index) => ({
    price: level.price,
    color: '#00C48C', // Green for supports
    lineWidth: level.strength === 3 ? 2 : level.strength === 2 ? 1 : 1,
    lineStyle: 0, // Solid
    axisLabelVisible: true,
    title: level.label || `S${level.strength}`
  }))

  const resistances: LightweightLevel[] = levels.resistances.map((level, index) => ({
    price: level.price,
    color: '#FF4D4F', // Red for resistances
    lineWidth: level.strength === 3 ? 2 : level.strength === 2 ? 1 : 1,
    lineStyle: 0, // Solid
    axisLabelVisible: true,
    title: level.label || `R${level.strength}`
  }))

  return { supports, resistances }
}

// ============================================
// PRICE LINE CONVERSION
// ============================================

/**
 * Cria linha de preço atual
 * @param price - Preço atual
 * @returns LightweightLevel para linha de preço
 */
export const adaptPriceToLightweight = (price: number): LightweightLevel => ({
  price,
  color: '#FF6A00', // Orange for current price
  lineWidth: 1,
  lineStyle: 2, // Dashed
  axisLabelVisible: true,
  title: `$${safeToFixed(price, 2)}`
})

// ============================================
// ADAPTER INTERFACE IMPLEMENTATION
// ============================================

export const chartAdapter: ChartAdapter = {
  adaptCandlesToLightweight,
  adaptLevelsToLightweight,
  adaptPriceToLightweight
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Agrupa candles por timeframe para otimização
 * @param candles - Candles para agrupar
 * @param groupSize - Tamanho do grupo
 * @returns Candles agrupados
 */
export const groupCandles = (candles: CandleData[], groupSize: number): CandleData[] => {
  if (groupSize <= 1) return candles

  const grouped: CandleData[] = []

  for (let i = 0; i < candles.length; i += groupSize) {
    const group = candles.slice(i, i + groupSize)
    if (group.length > 0) {
      grouped.push({
        timestamp: group[0].timestamp, // Use first timestamp
        open: group[0].open, // Use first open
        high: Math.max(...group.map(c => c.high)), // Max high
        low: Math.min(...group.map(c => c.low)), // Min low
        close: group[group.length - 1].close, // Last close
        volume: group.reduce((sum, c) => sum + (c.volume || 0), 0) // Sum volume
      })
    }
  }

  return grouped
}

/**
 * Calcula médias móveis simples para overlays
 * @param candles - Candles para calcular
 * @param period - Período da média
 * @returns Array de preços da média móvel
 */
export const calculateSMA = (candles: CandleData[], period: number): (number | null)[] => {
  const sma: (number | null)[] = []

  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      sma.push(null)
    } else {
      const slice = candles.slice(i - period + 1, i + 1)
      const average = slice.reduce((sum, c) => sum + c.close, 0) / period
      sma.push(average)
    }
  }

  return sma
}

/**
 * Detecta topos e fundos locais para levels automáticos
 * @param candles - Candles para análise
 * @param lookback - Períodos para olhar para trás/frente
 * @returns Níveis detectados automaticamente
 */
export const detectAutoLevels = (candles: CandleData[], lookback: number = 5): {
  supports: number[]
  resistances: number[]
} => {
  const supports: number[] = []
  const resistances: number[] = []

  for (let i = lookback; i < candles.length - lookback; i++) {
    const current = candles[i]
    const before = candles.slice(i - lookback, i)
    const after = candles.slice(i + 1, i + 1 + lookback)

    // Check if current is a local minimum (support)
    const isLocalMin = before.every(c => c.low >= current.low) &&
                      after.every(c => c.low >= current.low)

    // Check if current is a local maximum (resistance)
    const isLocalMax = before.every(c => c.high <= current.high) &&
                      after.every(c => c.high <= current.high)

    if (isLocalMin && !supports.includes(current.low)) {
      supports.push(current.low)
    }

    if (isLocalMax && !resistances.includes(current.high)) {
      resistances.push(current.high)
    }
  }

  // Sort and limit to top levels
  return {
    supports: supports.sort((a, b) => b - a).slice(0, 5), // Descending (higher supports first)
    resistances: resistances.sort((a, b) => a - b).slice(0, 5) // Ascending (lower resistances first)
  }
}
