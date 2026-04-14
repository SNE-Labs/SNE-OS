#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PADRÕES GRÁFICOS
Detecta padrões técnicos e divergências
"""

import pandas as pd
import numpy as np
from scipy.signal import find_peaks


def detectar_padroes(dados):
    """Detecta padrões gráficos"""
    padroes = {
        'divergencias': detectar_divergencias(dados),
        'candlestick': padroes_candlestick(dados),
        'chartpatterns': padroes_chart(dados),
        'fibonacci': niveis_fibonacci(dados),
        'wedges': detectar_wedges(dados)  # ← NOVA FUNÇÃO
    }
    return padroes


def detectar_divergencias(dados):
    """Detecta divergências RSI/MACD"""
    try:
        # RSI
        delta = dados['close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(14).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        
        # Últimos 20 períodos
        preco_recente = dados['close'].tail(20).values
        rsi_recente = rsi.tail(20).values
        
        # Divergência de alta
        if preco_recente[-1] < preco_recente[-10] and rsi_recente[-1] > rsi_recente[-10]:
            return {'tipo': 'ALTA', 'detectada': True, 'descricao': 'RSI divergente positivo'}
        # Divergência de baixa
        elif preco_recente[-1] > preco_recente[-10] and rsi_recente[-1] < rsi_recente[-10]:
            return {'tipo': 'BAIXA', 'detectada': True, 'descricao': 'RSI divergente negativo'}
        else:
            return {'tipo': None, 'detectada': False, 'descricao': 'Sem divergência'}
    except:
        return {'tipo': None, 'detectada': False}


def padroes_candlestick(dados):
    """Padrões de candlestick"""
    try:
        ultima = dados.iloc[-1]
        penultima = dados.iloc[-2]
        
        corpo = abs(ultima['close'] - ultima['open'])
        range_vela = ultima['high'] - ultima['low']
        
        # Doji
        if corpo / range_vela < 0.1:
            return {'padrao': 'Doji', 'significado': 'Indecisão'}
        # Martelo/Estrela cadente
        elif corpo / range_vela < 0.3:
            return {'padrao': 'Martelo/Estrela', 'significado': 'Possível reversão'}
        # Engolfo
        elif abs(ultima['close'] - penultima['close']) > abs(penultima['close'] - penultima['open']) * 1.5:
            return {'padrao': 'Engolfo', 'significado': 'Reversão forte'}
        else:
            return {'padrao': 'Normal', 'significado': 'Sem padrão especial'}
    except:
        return {'padrao': 'Indefinido'}


def padroes_chart(dados):
    """Padrões de gráfico"""
    try:
        ultimos_20 = dados.tail(20)
        highs = ultimos_20['high'].values
        lows = ultimos_20['low'].values
        
        # Triângulo ascendente
        if max(highs[-5:]) == max(highs) and min(lows[-5:]) > min(lows[:-5]):
            return {'padrao': 'Triângulo Ascendente', 'viés': 'Bullish'}
        # Triângulo descendente
        elif min(lows[-5:]) == min(lows) and max(highs[-5:]) < max(highs[:-5]):
            return {'padrao': 'Triângulo Descendente', 'viés': 'Bearish'}
        # Flag
        elif len(highs) > 10:
            return {'padrao': 'Possível Flag', 'viés': 'Continuação'}
        else:
            return {'padrao': 'Sem padrão claro', 'viés': 'Neutro'}
    except:
        return {'padrao': 'Indefinido'}


def niveis_fibonacci(dados):
    """Calcula níveis de Fibonacci"""
    try:
        high = dados['high'].max()
        low = dados['low'].min()
        diff = high - low
        
        return {
            '0.236': round(high - 0.236 * diff, 2),
            '0.382': round(high - 0.382 * diff, 2),
            '0.500': round(high - 0.500 * diff, 2),
            '0.618': round(high - 0.618 * diff, 2),
            '1.272': round(high + 0.272 * diff, 2),
            '1.618': round(high + 0.618 * diff, 2)
        }
    except:
        return {}


def detectar_wedges(df, periodo_minimo=30, periodo_maximo=100, tolerancia=0.02, 
                   min_touches=3, min_angle=10, max_angle=45, min_distance_pct=1.0):
    """
    Detecta padrões de Wedge (Cunha) no gráfico com parâmetros otimizados
    
    Args:
        df: DataFrame com OHLCV
        periodo_minimo: Mínimo de períodos para formar wedge (30)
        periodo_maximo: Máximo de períodos para análise (100)
        tolerancia: Tolerância para convergência das linhas (2%)
        min_touches: Número mínimo de toques nas linhas (3-4)
        min_angle: Ângulo mínimo de convergência em graus (10°)
        max_angle: Ângulo máximo de convergência em graus (45°)
        min_distance_pct: Distância mínima entre linhas em % do preço (1%)
    
    Returns:
        Dict com informações do wedge detectado
    """
    try:
        # Usar últimos períodos para análise
        dados = df.tail(periodo_maximo)
        
        if len(dados) < periodo_minimo:
            return {'wedge_detectado': False, 'motivo': 'Dados insuficientes'}
        
        # Encontrar topos e fundos
        highs = dados['high'].values
        lows = dados['low'].values
        
        # Detectar picos e vales usando scipy com parâmetros otimizados
        # Encontrar topos (peaks) - mais rigoroso
        peaks, _ = find_peaks(highs, distance=5, prominence=np.std(highs)*0.7)
        
        # Encontrar fundos (valleys) - mais rigoroso
        valleys, _ = find_peaks(-lows, distance=5, prominence=np.std(lows)*0.7)
        
        # Validar número mínimo de toques
        if len(peaks) < min_touches or len(valleys) < min_touches:
            return {'wedge_detectado': False, 'motivo': f'Poucos pontos de referência (min {min_touches})'}
        
        # Pegar os últimos 2 topos e fundos
        ultimos_tops = peaks[-2:] if len(peaks) >= 2 else peaks
        ultimos_fundos = valleys[-2:] if len(valleys) >= 2 else valleys
        
        # Coordenadas dos pontos
        tops_x = ultimos_tops
        tops_y = highs[ultimos_tops]
        fundos_x = ultimos_fundos
        fundos_y = lows[ultimos_fundos]
        
        # Calcular inclinações das linhas de tendência
        # Linha de resistência (conecta topos)
        if len(tops_x) >= 2:
            inclinacao_resistencia = (tops_y[1] - tops_y[0]) / (tops_x[1] - tops_x[0])
        else:
            inclinacao_resistencia = 0
            
        # Linha de suporte (conecta fundos)
        if len(fundos_x) >= 2:
            inclinacao_suporte = (fundos_y[1] - fundos_y[0]) / (fundos_x[1] - fundos_x[0])
        else:
            inclinacao_suporte = 0
        
        # Validar distância mínima entre linhas
        preco_medio = dados['close'].mean()
        distancia_minima = preco_medio * (min_distance_pct / 100)
        
        # Calcular ângulo de convergência em graus
        import math
        angulo_resistencia = math.degrees(math.atan(inclinacao_resistencia))
        angulo_suporte = math.degrees(math.atan(inclinacao_suporte))
        angulo_convergencia = abs(angulo_resistencia - angulo_suporte)
        
        # Validar ângulo de convergência
        if angulo_convergencia < min_angle or angulo_convergencia > max_angle:
            return {'wedge_detectado': False, 'motivo': f'Ângulo inválido: {angulo_convergencia:.1f}° (deve estar entre {min_angle}°-{max_angle}°)'}
        
        # Detectar tipo de wedge
        wedge_info = {}
        
        # RISING WEDGE (Cunha Ascendente)
        # Resistência sobe mais rápido que suporte
        if (inclinacao_resistencia > inclinacao_suporte and 
            inclinacao_resistencia > 0 and inclinacao_suporte > 0):
            
            # Verificar convergência
            convergencia = abs(inclinacao_resistencia - inclinacao_suporte)
            if convergencia > tolerancia:
                
                # Calcular ponto de convergência
                ponto_convergencia = calcular_ponto_convergencia(
                    tops_x, tops_y, fundos_x, fundos_y
                )
                
                # Calcular altura do padrão
                altura_wedge = max(tops_y) - min(fundos_y)
                
                # Calcular volume médio durante formação
                volume_medio = dados['volume'].mean()
                
                wedge_info = {
                    'wedge_detectado': True,
                    'tipo': 'RISING_WEDGE',
                    'nome': 'Cunha Ascendente',
                    'inclinacao_resistencia': inclinacao_resistencia,
                    'inclinacao_suporte': inclinacao_suporte,
                    'convergencia': convergencia,
                    'angulo_convergencia': angulo_convergencia,
                    'ponto_convergencia': ponto_convergencia,
                    'altura_wedge': altura_wedge,
                    'volume_medio': volume_medio,
                    'preco_atual': dados['close'].iloc[-1],
                    'probabilidade_reversao': calcular_probabilidade_reversao(dados, 'RISING_WEDGE'),
                    'alvo_teorico': calcular_alvo_wedge(dados, 'RISING_WEDGE', altura_wedge),
                    'stop_loss': calcular_stop_loss_wedge(dados, 'RISING_WEDGE'),
                    'confianca': calcular_confianca_wedge(dados, convergencia, volume_medio),
                    # Pontos para traçado visual
                    'pontos_resistencia': {'x': tops_x, 'y': tops_y},
                    'pontos_suporte': {'x': fundos_x, 'y': fundos_y},
                    'num_touches_resistencia': len(tops_x),
                    'num_touches_suporte': len(fundos_x)
                }
        
        # FALLING WEDGE (Cunha Descendente)
        # Suporte desce mais rápido que resistência
        elif (inclinacao_suporte < inclinacao_resistencia and 
              inclinacao_resistencia < 0 and inclinacao_suporte < 0):
            
            convergencia = abs(inclinacao_resistencia - inclinacao_suporte)
            if convergencia > tolerancia:
                
                ponto_convergencia = calcular_ponto_convergencia(
                    tops_x, tops_y, fundos_x, fundos_y
                )
                
                altura_wedge = max(tops_y) - min(fundos_y)
                volume_medio = dados['volume'].mean()
                
                wedge_info = {
                    'wedge_detectado': True,
                    'tipo': 'FALLING_WEDGE',
                    'nome': 'Cunha Descendente',
                    'inclinacao_resistencia': inclinacao_resistencia,
                    'inclinacao_suporte': inclinacao_suporte,
                    'convergencia': convergencia,
                    'angulo_convergencia': angulo_convergencia,
                    'ponto_convergencia': ponto_convergencia,
                    'altura_wedge': altura_wedge,
                    'volume_medio': volume_medio,
                    'preco_atual': dados['close'].iloc[-1],
                    'probabilidade_reversao': calcular_probabilidade_reversao(dados, 'FALLING_WEDGE'),
                    'alvo_teorico': calcular_alvo_wedge(dados, 'FALLING_WEDGE', altura_wedge),
                    'stop_loss': calcular_stop_loss_wedge(dados, 'FALLING_WEDGE'),
                    'confianca': calcular_confianca_wedge(dados, convergencia, volume_medio),
                    # Pontos para traçado visual
                    'pontos_resistencia': {'x': tops_x, 'y': tops_y},
                    'pontos_suporte': {'x': fundos_x, 'y': fundos_y},
                    'num_touches_resistencia': len(tops_x),
                    'num_touches_suporte': len(fundos_x)
                }
        
        if not wedge_info:
            return {'wedge_detectado': False, 'motivo': 'Não é um padrão wedge válido'}
            
        return wedge_info
        
    except Exception as e:
        return {'wedge_detectado': False, 'motivo': f'Erro na análise: {str(e)}'}


def calcular_ponto_convergencia(tops_x, tops_y, fundos_x, fundos_y):
    """Calcula onde as linhas de tendência convergem"""
    try:
        # Usar os últimos pontos para calcular convergência
        if len(tops_x) >= 2 and len(fundos_x) >= 2:
            # Linha de resistência: y = ax + b
            a1 = (tops_y[1] - tops_y[0]) / (tops_x[1] - tops_x[0])
            b1 = tops_y[0] - a1 * tops_x[0]
            
            # Linha de suporte: y = cx + d
            a2 = (fundos_y[1] - fundos_y[0]) / (fundos_x[1] - fundos_x[0])
            b2 = fundos_y[0] - a2 * fundos_x[0]
            
            # Ponto de interseção
            if abs(a1 - a2) > 1e-10:  # Evitar divisão por zero
                x_convergencia = (b2 - b1) / (a1 - a2)
                y_convergencia = a1 * x_convergencia + b1
                
                return {
                    'x': x_convergencia,
                    'y': y_convergencia,
                    'periodos_futuros': max(0, x_convergencia - len(tops_x))
                }
        
        return None
    except:
        return None


def calcular_probabilidade_reversao(df, tipo_wedge):
    """Calcula probabilidade de reversão baseada em indicadores"""
    try:
        # RSI
        delta = df['close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(14).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        rsi_atual = rsi.iloc[-1]
        
        # MACD
        ema12 = df['close'].ewm(span=12).mean()
        ema26 = df['close'].ewm(span=26).mean()
        macd = ema12 - ema26
        macd_atual = macd.iloc[-1]
        
        # Volume
        volume_medio = df['volume'].rolling(20).mean()
        volume_atual = df['volume'].iloc[-1]
        volume_ratio = volume_atual / volume_medio.iloc[-1] if volume_medio.iloc[-1] > 0 else 1
        
        probabilidade = 50  # Base
        
        if tipo_wedge == 'RISING_WEDGE':
            # Rising wedge geralmente é bearish
            if rsi_atual > 70:  # Sobrecompra
                probabilidade += 20
            if macd_atual < 0:  # MACD negativo
                probabilidade += 15
            if volume_ratio > 1.5:  # Volume alto
                probabilidade += 10
                
        elif tipo_wedge == 'FALLING_WEDGE':
            # Falling wedge geralmente é bullish
            if rsi_atual < 30:  # Sobrevenda
                probabilidade += 20
            if macd_atual > 0:  # MACD positivo
                probabilidade += 15
            if volume_ratio > 1.5:  # Volume alto
                probabilidade += 10
        
        return min(95, max(5, probabilidade))
        
    except:
        return 50


def calcular_alvo_wedge(df, tipo_wedge, altura_wedge):
    """Calcula alvo teórico do wedge"""
    try:
        preco_atual = df['close'].iloc[-1]
        
        if tipo_wedge == 'RISING_WEDGE':
            # Bearish - alvo para baixo
            alvo = preco_atual - altura_wedge
            return {
                'direcao': 'BAIXA',
                'preco': alvo,
                'distancia': altura_wedge,
                'percentual': (altura_wedge / preco_atual) * 100
            }
        elif tipo_wedge == 'FALLING_WEDGE':
            # Bullish - alvo para cima
            alvo = preco_atual + altura_wedge
            return {
                'direcao': 'ALTA',
                'preco': alvo,
                'distancia': altura_wedge,
                'percentual': (altura_wedge / preco_atual) * 100
            }
        
        return None
    except:
        return None


def calcular_stop_loss_wedge(df, tipo_wedge):
    """Calcula stop loss baseado no wedge"""
    try:
        preco_atual = df['close'].iloc[-1]
        atr = calcular_atr(df, 14)
        
        if tipo_wedge == 'RISING_WEDGE':
            # Stop acima da resistência
            stop = preco_atual + (atr * 1.5)
            return {
                'tipo': 'STOP_ACIMA',
                'preco': stop,
                'distancia': stop - preco_atual,
                'percentual': ((stop - preco_atual) / preco_atual) * 100
            }
        elif tipo_wedge == 'FALLING_WEDGE':
            # Stop abaixo do suporte
            stop = preco_atual - (atr * 1.5)
            return {
                'tipo': 'STOP_ABAIXO',
                'preco': stop,
                'distancia': preco_atual - stop,
                'percentual': ((preco_atual - stop) / preco_atual) * 100
            }
        
        return None
    except:
        return None


def calcular_confianca_wedge(df, convergencia, volume_medio):
    """Calcula nível de confiança do padrão"""
    try:
        confianca = 50  # Base
        
        # Convergência forte aumenta confiança
        if convergencia > 0.05:
            confianca += 20
        elif convergencia > 0.03:
            confianca += 15
        elif convergencia > 0.02:
            confianca += 10
        
        # Volume adequado aumenta confiança
        volume_atual = df['volume'].iloc[-1]
        if volume_atual > volume_medio * 1.2:
            confianca += 15
        elif volume_atual > volume_medio:
            confianca += 10
        
        # Padrão bem formado (múltiplos topos/fundos)
        highs = df['high'].values
        lows = df['low'].values
        
        peaks = find_peaks(highs, distance=3)[0]
        valleys = find_peaks(-lows, distance=3)[0]
        
        if len(peaks) >= 3 and len(valleys) >= 3:
            confianca += 15
        
        return min(95, max(25, confianca))
        
    except:
        return 50


def verificar_confirmacao_quebra(df, wedges):
    """
    Verifica se houve confirmação de quebra do wedge
    
    Args:
        df: DataFrame com dados OHLCV
        wedges: Dict com informações do wedge
    
    Returns:
        Dict com status da quebra
    """
    try:
        if not wedges.get('wedge_detectado', False):
            return {'quebrado': False, 'motivo': 'Nenhum wedge detectado'}
        
        # Últimos 3 candles para análise
        ultimos_candles = df.tail(3)
        
        # Calcular volume médio dos últimos 14 períodos
        volume_medio_14 = df['volume'].tail(14).mean()
        
        # Verificar quebra baseada no tipo de wedge
        if wedges['tipo'] == 'RISING_WEDGE':
            # Rising wedge quebra quando fecha abaixo do suporte
            suporte_atual = ultimos_candles['low'].min()
            fechamento_atual = ultimos_candles['close'].iloc[-1]
            
            if fechamento_atual < suporte_atual:
                # Verificar volume na quebra
                volume_quebra = ultimos_candles['volume'].iloc[-1]
                volume_confirma = volume_quebra > volume_medio_14
                
                return {
                    'quebrado': True,
                    'tipo_quebra': 'BEARISH',
                    'preco_quebra': fechamento_atual,
                    'volume_confirma': volume_confirma,
                    'volume_ratio': volume_quebra / volume_medio_14,
                    'descricao': 'Fechamento abaixo do suporte'
                }
        
        elif wedges['tipo'] == 'FALLING_WEDGE':
            # Falling wedge quebra quando fecha acima da resistência
            resistencia_atual = ultimos_candles['high'].max()
            fechamento_atual = ultimos_candles['close'].iloc[-1]
            
            if fechamento_atual > resistencia_atual:
                # Verificar volume na quebra
                volume_quebra = ultimos_candles['volume'].iloc[-1]
                volume_confirma = volume_quebra > volume_medio_14
                
                return {
                    'quebrado': True,
                    'tipo_quebra': 'BULLISH',
                    'preco_quebra': fechamento_atual,
                    'volume_confirma': volume_confirma,
                    'volume_ratio': volume_quebra / volume_medio_14,
                    'descricao': 'Fechamento acima da resistência'
                }
        
        return {
            'quebrado': False,
            'motivo': 'Aguardando confirmação de quebra',
            'volume_medio_14': volume_medio_14
        }
        
    except Exception as e:
        return {'quebrado': False, 'motivo': f'Erro na verificação: {e}'}


def calcular_atr(df, periodo=14):
    """Calcula Average True Range"""
    try:
        high = df['high']
        low = df['low']
        close = df['close']
        
        tr1 = high - low
        tr2 = abs(high - close.shift(1))
        tr3 = abs(low - close.shift(1))
        
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        atr = tr.rolling(periodo).mean()
        
        return atr.iloc[-1]
    except:
        return 0
