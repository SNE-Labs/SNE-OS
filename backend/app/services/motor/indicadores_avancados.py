#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Módulo de Indicadores Técnicos Avançados
Expande o sistema atual com os melhores modelos de análise técnica
Inclui: Osciladores, Momentum, Volatilidade, Volume, Padrões Gráficos
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional
import warnings
warnings.filterwarnings('ignore')

# ✅ Importar funções básicas do módulo original (import relativo)
from .indicadores import calcular_indicadores, detectar_padroes_candlestick


# ============================================================================
# INDICADORES AVANÇADOS - OSCILADORES E MOMENTUM
# ============================================================================

def calcular_williams_r(df, periodo=14):
    """Calcula Williams %R - Oscilador de momentum"""
    try:
        high_max = df['high'].rolling(window=periodo).max()
        low_min = df['low'].rolling(window=periodo).min()
        df['Williams_R'] = ((high_max - df['close']) / (high_max - low_min)) * -100
        return df
    except Exception as e:
        print(f"❌ Erro ao calcular Williams %R: {e}")
        return df


def calcular_cci(df, periodo=20):
    """Calcula Commodity Channel Index (CCI)"""
    try:
        # Typical Price
        tp = (df['high'] + df['low'] + df['close']) / 3
        
        # Simple Moving Average of TP
        sma_tp = tp.rolling(window=periodo).mean()
        
        # Mean Deviation
        md = tp.rolling(window=periodo).apply(lambda x: np.mean(np.abs(x - x.mean())))
        
        # CCI
        df['CCI'] = (tp - sma_tp) / (0.015 * md)
        return df
    except Exception as e:
        print(f"❌ Erro ao calcular CCI: {e}")
        return df


def calcular_mfi(df, periodo=14):
    """Calcula Money Flow Index (MFI) - RSI baseado em volume"""
    try:
        # Typical Price
        tp = (df['high'] + df['low'] + df['close']) / 3
        
        # Raw Money Flow
        rmf = tp * df['volume']
        
        # Positive and Negative Money Flow
        tp_diff = tp.diff()
        
        positive_mf = rmf.where(tp_diff > 0, 0).rolling(window=periodo).sum()
        negative_mf = rmf.where(tp_diff < 0, 0).rolling(window=periodo).sum()
        
        # Money Flow Ratio
        mfr = positive_mf / negative_mf
        
        # MFI
        df['MFI'] = 100 - (100 / (1 + mfr))
        return df
    except Exception as e:
        print(f"❌ Erro ao calcular MFI: {e}")
        return df


def calcular_adx(df, periodo=14):
    """Calcula Average Directional Index (ADX)"""
    try:
        # True Range
        tr = np.maximum(
            df['high'] - df['low'],
            np.maximum(
                abs(df['high'] - df['close'].shift(1)),
                abs(df['low'] - df['close'].shift(1))
            )
        )
        
        # Directional Movement
        dm_plus = np.where(
            (df['high'].diff() > df['low'].diff().abs()) & (df['high'].diff() > 0),
            df['high'].diff(), 0
        )
        dm_minus = np.where(
            (df['low'].diff().abs() > df['high'].diff()) & (df['low'].diff() < 0),
            df['low'].diff().abs(), 0
        )
        
        # Smoothed values
        atr = tr.rolling(window=periodo).mean()
        di_plus = 100 * (pd.Series(dm_plus).rolling(window=periodo).mean() / atr)
        di_minus = 100 * (pd.Series(dm_minus).rolling(window=periodo).mean() / atr)
        
        # ADX
        dx = 100 * abs(di_plus - di_minus) / (di_plus + di_minus)
        df['ADX'] = dx.rolling(window=periodo).mean()
        df['DI_Plus'] = di_plus
        df['DI_Minus'] = di_minus
        
        return df
    except Exception as e:
        print(f"❌ Erro ao calcular ADX: {e}")
        return df


def calcular_parabolic_sar(df, af=0.02, max_af=0.2):
    """Calcula Parabolic SAR"""
    try:
        high = df['high'].values
        low = df['low'].values
        close = df['close'].values
        
        sar = np.zeros(len(df))
        trend = np.zeros(len(df))
        af_current = af
        
        # Inicialização
        sar[0] = low[0]
        trend[0] = 1  # 1 = uptrend, -1 = downtrend
        
        for i in range(1, len(df)):
            if trend[i-1] == 1:  # Uptrend
                sar[i] = sar[i-1] + af_current * (high[i-1] - sar[i-1])
                
                # Verificar reversão
                if low[i] <= sar[i]:
                    trend[i] = -1
                    sar[i] = high[i-1]
                    af_current = af
                else:
                    trend[i] = 1
                    if high[i] > high[i-1]:
                        af_current = min(af_current + af, max_af)
            else:  # Downtrend
                sar[i] = sar[i-1] + af_current * (low[i-1] - sar[i-1])
                
                # Verificar reversão
                if high[i] >= sar[i]:
                    trend[i] = 1
                    sar[i] = low[i-1]
                    af_current = af
                else:
                    trend[i] = -1
                    if low[i] < low[i-1]:
                        af_current = min(af_current + af, max_af)
        
        df['PSAR'] = sar
        df['PSAR_Trend'] = trend
        return df
    except Exception as e:
        print(f"❌ Erro ao calcular Parabolic SAR: {e}")
        return df


# ============================================================================
# INDICADORES DE VOLUME
# ============================================================================

def calcular_obv(df):
    """Calcula On Balance Volume (OBV)"""
    try:
        obv = np.zeros(len(df))
        obv[0] = df['volume'].iloc[0]
        
        for i in range(1, len(df)):
            if df['close'].iloc[i] > df['close'].iloc[i-1]:
                obv[i] = obv[i-1] + df['volume'].iloc[i]
            elif df['close'].iloc[i] < df['close'].iloc[i-1]:
                obv[i] = obv[i-1] - df['volume'].iloc[i]
            else:
                obv[i] = obv[i-1]
        
        df['OBV'] = obv
        return df
    except Exception as e:
        print(f"❌ Erro ao calcular OBV: {e}")
        return df


def calcular_volume_profile(df, bins=20):
    """Calcula Volume Profile simplificado"""
    try:
        # Dividir preços em bins
        price_min = df['low'].min()
        price_max = df['high'].max()
        bin_size = (price_max - price_min) / bins
        
        # Calcular volume por bin
        volume_profile = np.zeros(bins)
        bin_prices = np.zeros(bins)
        
        for i in range(bins):
            bin_start = price_min + i * bin_size
            bin_end = price_min + (i + 1) * bin_size
            bin_prices[i] = (bin_start + bin_end) / 2
            
            # Volume neste range de preço
            mask = (df['low'] >= bin_start) & (df['high'] <= bin_end)
            volume_profile[i] = df[mask]['volume'].sum()
        
        # Encontrar POC (Point of Control)
        poc_index = np.argmax(volume_profile)
        poc_price = bin_prices[poc_index]
        
        # Value Area (70% do volume)
        sorted_indices = np.argsort(volume_profile)[::-1]
        cumulative_volume = 0
        total_volume = np.sum(volume_profile)
        value_area_indices = []
        
        for idx in sorted_indices:
            cumulative_volume += volume_profile[idx]
            value_area_indices.append(idx)
            if cumulative_volume >= 0.7 * total_volume:
                break
        
        val_prices = bin_prices[value_area_indices]
        val_low = np.min(val_prices)
        val_high = np.max(val_prices)
        
        df['Volume_Profile_POC'] = poc_price
        df['Volume_Profile_VAL'] = val_low
        df['Volume_Profile_VAH'] = val_high
        
        return df
    except Exception as e:
        print(f"❌ Erro ao calcular Volume Profile: {e}")
        return df


# ============================================================================
# INDICADORES DE VOLATILIDADE AVANÇADOS
# ============================================================================

def calcular_keltner_channels(df, periodo=20, multiplicador=2):
    """Calcula Keltner Channels"""
    try:
        # EMA central
        df['KC_Mid'] = df['close'].ewm(span=periodo).mean()
        
        # ATR para bandas
        tr = np.maximum(
            df['high'] - df['low'],
            np.maximum(
                abs(df['high'] - df['close'].shift(1)),
                abs(df['low'] - df['close'].shift(1))
            )
        )
        atr = pd.Series(tr).rolling(window=periodo).mean()
        
        # Bandas
        df['KC_Upper'] = df['KC_Mid'] + (multiplicador * atr)
        df['KC_Lower'] = df['KC_Mid'] - (multiplicador * atr)
        
        return df
    except Exception as e:
        print(f"❌ Erro ao calcular Keltner Channels: {e}")
        return df


def calcular_donchian_channels(df, periodo=20):
    """Calcula Donchian Channels"""
    try:
        df['DC_Upper'] = df['high'].rolling(window=periodo).max()
        df['DC_Lower'] = df['low'].rolling(window=periodo).min()
        df['DC_Mid'] = (df['DC_Upper'] + df['DC_Lower']) / 2
        
        return df
    except Exception as e:
        print(f"❌ Erro ao calcular Donchian Channels: {e}")
        return df


# ============================================================================
# PADRÕES GRÁFICOS AVANÇADOS
# ============================================================================

def detectar_head_shoulders(df, lookback=20):
    """Detecta padrão Head and Shoulders"""
    try:
        if len(df) < lookback:
            return []
        
        padroes = []
        recent_data = df.tail(lookback)
        
        # Encontrar picos
        from scipy.signal import find_peaks
        highs = recent_data['high'].values
        peaks, _ = find_peaks(highs, distance=3, prominence=highs.std() * 0.5)
        
        if len(peaks) >= 3:
            # Verificar se os últimos 3 picos formam Head and Shoulders
            last_peaks = peaks[-3:]
            peak_values = highs[last_peaks]
            
            # Head deve ser o maior
            head_idx = np.argmax(peak_values)
            head_value = peak_values[head_idx]
            
            # Shoulders devem ser menores e similares
            shoulders = np.delete(peak_values, head_idx)
            
            if (head_value > shoulders[0] * 1.02 and 
                head_value > shoulders[1] * 1.02 and
                abs(shoulders[0] - shoulders[1]) / max(shoulders) < 0.05):
                padroes.append('HEAD_SHOULDERS')
        
        return padroes
    except Exception as e:
        print(f"❌ Erro ao detectar Head and Shoulders: {e}")
        return []


def detectar_triangles(df, lookback=30):
    """Detecta padrões de triângulos"""
    try:
        if len(df) < lookback:
            return []
        
        padroes = []
        recent_data = df.tail(lookback)
        
        # Encontrar máximos e mínimos
        from scipy.signal import find_peaks, find_peaks
        
        highs = recent_data['high'].values
        lows = recent_data['low'].values
        
        peaks, _ = find_peaks(highs, distance=3)
        troughs, _ = find_peaks(-lows, distance=3)
        
        if len(peaks) >= 2 and len(troughs) >= 2:
            # Verificar tendência dos máximos e mínimos
            recent_peaks = peaks[-2:]
            recent_troughs = troughs[-2:]
            
            peak_values = highs[recent_peaks]
            trough_values = lows[recent_troughs]
            
            # Triângulo Ascendente: máximos horizontais, mínimos ascendentes
            if (abs(peak_values[1] - peak_values[0]) / peak_values[0] < 0.02 and
                trough_values[1] > trough_values[0]):
                padroes.append('TRIANGULO_ASCENDENTE')
            
            # Triângulo Descendente: mínimos horizontais, máximos descendentes
            elif (abs(trough_values[1] - trough_values[0]) / trough_values[0] < 0.02 and
                  peak_values[1] < peak_values[0]):
                padroes.append('TRIANGULO_DESCENDENTE')
            
            # Triângulo Simétrico: ambos convergem
            elif (peak_values[1] < peak_values[0] and trough_values[1] > trough_values[0]):
                padroes.append('TRIANGULO_SIMETRICO')
        
        return padroes
    except Exception as e:
        print(f"❌ Erro ao detectar triângulos: {e}")
        return []


def detectar_flags_pennants(df, lookback=20):
    """Detecta padrões de Flags e Pennants"""
    try:
        if len(df) < lookback:
            return []
        
        padroes = []
        recent_data = df.tail(lookback)
        
        # Verificar se há uma tendência forte seguida de consolidação
        first_half = recent_data.head(lookback // 2)
        second_half = recent_data.tail(lookback // 2)
        
        # Calcular direção da primeira metade
        first_trend = (first_half['close'].iloc[-1] - first_half['close'].iloc[0]) / first_half['close'].iloc[0]
        
        # Calcular volatilidade da segunda metade
        second_volatility = second_half['high'].max() - second_half['low'].min()
        second_range = second_half['close'].max() - second_half['close'].min()
        
        # Flag: consolidação paralela após tendência
        if abs(first_trend) > 0.05 and second_range / second_half['close'].mean() < 0.03:
            if first_trend > 0:
                padroes.append('FLAG_ALTA')
            else:
                padroes.append('FLAG_BAIXA')
        
        # Pennant: consolidação convergente após tendência
        elif abs(first_trend) > 0.05 and second_volatility / second_half['close'].mean() < 0.05:
            padroes.append('PENNANT')
        
        return padroes
    except Exception as e:
        print(f"❌ Erro ao detectar flags/pennants: {e}")
        return []


# ============================================================================
# FUNÇÃO PRINCIPAL - CALCULAR TODOS OS INDICADORES AVANÇADOS
# ============================================================================

def calcular_indicadores_avancados(df):
    """
    Calcula todos os indicadores avançados
    Expande o sistema atual com os melhores modelos de análise técnica
    """
    try:
        print("🚀 Calculando indicadores avançados...")
        
        # Verificar dados
        if df is None or df.empty or len(df) < 50:
            print("⚠️ Dados insuficientes para indicadores avançados")
            return calcular_indicadores(df)
        
        # Indicadores básicos (manter existentes)
        df = calcular_indicadores(df)
        
        # OSCILADORES E MOMENTUM
        df = calcular_williams_r(df)
        df = calcular_cci(df)
        df = calcular_mfi(df)
        df = calcular_adx(df)
        df = calcular_parabolic_sar(df)
        
        # INDICADORES DE VOLUME
        df = calcular_obv(df)
        df = calcular_volume_profile(df)
        
        # INDICADORES DE VOLATILIDADE
        df = calcular_keltner_channels(df)
        df = calcular_donchian_channels(df)
        
        # PADRÕES GRÁFICOS AVANÇADOS
        padroes_avancados = []
        padroes_avancados.extend(detectar_head_shoulders(df))
        padroes_avancados.extend(detectar_triangles(df))
        padroes_avancados.extend(detectar_flags_pennants(df))
        
        # Adicionar padrões ao DataFrame
        df['Padroes_Avancados'] = ', '.join(padroes_avancados) if padroes_avancados else 'Nenhum'
        
        print(f"✅ Indicadores avançados calculados com sucesso!")
        print(f"📊 Padrões detectados: {padroes_avancados}")
        
        return df
        
    except Exception as e:
        print(f"❌ Erro ao calcular indicadores avançados: {e}")
        print("🔄 Retornando indicadores básicos...")
        return calcular_indicadores(df)


# ============================================================================
# FUNÇÕES DE ANÁLISE E SINAIS
# ============================================================================

def analisar_confluencia_indicadores(df):
    """Analisa confluência entre múltiplos indicadores"""
    try:
        if df.empty or len(df) < 2:
            return {"confluencia_score": 0, "sinal": "NEUTRO", "detalhes": []}
        
        ultimo = df.iloc[-1]
        sinais = []
        
        # RSI
        if ultimo['RSI'] > 70:
            sinais.append(('RSI', 'SOBRECOMPRA', -1))
        elif ultimo['RSI'] < 30:
            sinais.append(('RSI', 'SOBREVENDA', 1))
        else:
            sinais.append(('RSI', 'NEUTRO', 0))
        
        # MACD
        if ultimo['MACD'] > ultimo['MACD_Signal'] and ultimo['MACD_Hist'] > 0:
            sinais.append(('MACD', 'ALTA', 1))
        elif ultimo['MACD'] < ultimo['MACD_Signal'] and ultimo['MACD_Hist'] < 0:
            sinais.append(('MACD', 'BAIXA', -1))
        else:
            sinais.append(('MACD', 'NEUTRO', 0))
        
        # Bollinger Bands
        if ultimo['close'] > ultimo['BB_Upper']:
            sinais.append(('BB', 'SOBRECOMPRA', -1))
        elif ultimo['close'] < ultimo['BB_Lower']:
            sinais.append(('BB', 'SOBREVENDA', 1))
        else:
            sinais.append(('BB', 'NEUTRO', 0))
        
        # Williams %R
        if 'Williams_R' in ultimo and ultimo['Williams_R'] > -20:
            sinais.append(('Williams_R', 'SOBRECOMPRA', -1))
        elif 'Williams_R' in ultimo and ultimo['Williams_R'] < -80:
            sinais.append(('Williams_R', 'SOBREVENDA', 1))
        else:
            sinais.append(('Williams_R', 'NEUTRO', 0))
        
        # CCI
        if 'CCI' in ultimo and ultimo['CCI'] > 100:
            sinais.append(('CCI', 'SOBRECOMPRA', -1))
        elif 'CCI' in ultimo and ultimo['CCI'] < -100:
            sinais.append(('CCI', 'SOBREVENDA', 1))
        else:
            sinais.append(('CCI', 'NEUTRO', 0))
        
        # Calcular score de confluência
        score_total = sum(sinal[2] for sinal in sinais)
        score_maximo = len(sinais)
        confluencia_score = (score_total / score_maximo) * 10 if score_maximo > 0 else 0
        
        # Determinar sinal geral
        if confluencia_score >= 6:
            sinal_geral = "COMPRA_FORTE"
        elif confluencia_score >= 3:
            sinal_geral = "COMPRA"
        elif confluencia_score <= -6:
            sinal_geral = "VENDA_FORTE"
        elif confluencia_score <= -3:
            sinal_geral = "VENDA"
        else:
            sinal_geral = "NEUTRO"
        
        return {
            "confluencia_score": confluencia_score,
            "sinal": sinal_geral,
            "detalhes": sinais,
            "total_indicadores": len(sinais)
        }
        
    except Exception as e:
        print(f"❌ Erro ao analisar confluência: {e}")
        return {"confluencia_score": 0, "sinal": "ERRO", "detalhes": []}


def gerar_sinal_completo(df):
    """Gera sinal completo baseado em todos os indicadores"""
    try:
        # Calcular indicadores avançados
        df_completo = calcular_indicadores_avancados(df.copy())
        
        # Análise de confluência
        confluencia = analisar_confluencia_indicadores(df_completo)
        
        # Padrões de candlestick
        padroes_candlestick = detectar_padroes_candlestick(df_completo)
        
        # Padrões avançados
        padroes_avancados = df_completo['Padroes_Avancados'].iloc[-1] if 'Padroes_Avancados' in df_completo.columns else "Nenhum"
        
        # Últimos valores
        ultimo = df_completo.iloc[-1]
        
        return {
            "timestamp": df_completo.index[-1],
            "preco_atual": ultimo['close'],
            "confluencia": confluencia,
            "padroes_candlestick": padroes_candlestick,
            "padroes_avancados": padroes_avancados,
            "indicadores_chave": {
                "RSI": ultimo['RSI'],
                "MACD": ultimo['MACD'],
                "MACD_Signal": ultimo['MACD_Signal'],
                "BB_Position": (ultimo['close'] - ultimo['BB_Lower']) / (ultimo['BB_Upper'] - ultimo['BB_Lower']),
                "ATR": ultimo['ATR'],
                "Volume_Ratio": ultimo['volume'] / ultimo['Volume_MA'] if ultimo['Volume_MA'] > 0 else 1
            },
            "recomendacao": confluencia['sinal'],
            "confianca": abs(confluencia['confluencia_score']) / 10
        }
        
    except Exception as e:
        print(f"❌ Erro ao gerar sinal completo: {e}")
        return None


# ============================================================================
# FUNÇÃO DE TESTE
# ============================================================================

def testar_indicadores_avancados():
    """Função para testar os indicadores avançados"""
    print("🧪 Testando indicadores avançados...")
    
    # Criar dados de teste
    np.random.seed(42)
    dates = pd.date_range('2024-01-01', periods=100, freq='1H')
    
    # Simular dados de preço
    base_price = 50000
    price_changes = np.random.normal(0, 0.02, 100)
    prices = [base_price]
    
    for change in price_changes[1:]:
        prices.append(prices[-1] * (1 + change))
    
    df = pd.DataFrame({
        'open': prices,
        'high': [p * (1 + abs(np.random.normal(0, 0.01))) for p in prices],
        'low': [p * (1 - abs(np.random.normal(0, 0.01))) for p in prices],
        'close': prices,
        'volume': np.random.randint(1000, 10000, 100)
    }, index=dates)
    
    # Ajustar high/low para serem consistentes
    df['high'] = df[['open', 'high', 'close']].max(axis=1)
    df['low'] = df[['open', 'low', 'close']].min(axis=1)
    
    print(f"📊 Dados de teste criados: {len(df)} candles")
    print(f"💰 Preço inicial: ${df['close'].iloc[0]:,.2f}")
    print(f"💰 Preço final: ${df['close'].iloc[-1]:,.2f}")
    
    # Testar indicadores avançados
    df_avancado = calcular_indicadores_avancados(df)
    
    # Testar análise de confluência
    confluencia = analisar_confluencia_indicadores(df_avancado)
    
    # Testar sinal completo
    sinal_completo = gerar_sinal_completo(df)
    
    print("\n🎯 RESULTADOS DOS TESTES:")
    print(f"📈 Score de Confluência: {confluencia['confluencia_score']:.2f}/10")
    print(f"🎯 Sinal: {confluencia['sinal']}")
    print(f"📊 Total de Indicadores: {confluencia['total_indicadores']}")
    
    if sinal_completo:
        print(f"💰 Preço Atual: ${sinal_completo['preco_atual']:,.2f}")
        print(f"🎯 Recomendação: {sinal_completo['recomendacao']}")
        print(f"🎲 Confiança: {sinal_completo['confianca']:.1%}")
        print(f"📊 Padrões Candlestick: {sinal_completo['padroes_candlestick']}")
        print(f"📈 Padrões Avançados: {sinal_completo['padroes_avancados']}")
    
    print("\n✅ Teste concluído com sucesso!")
    return df_avancado, confluencia, sinal_completo


if __name__ == "__main__":
    # Executar teste quando executado diretamente
    testar_indicadores_avancados()










