#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ANÁLISE DETALHADA DE CANDLES
Módulo para análise completa dos candles atuais com informações detalhadas
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import pytz


def analisar_candle_atual(df, timeframe="1h"):
    """
    Análise detalhada do candle atual
    
    Args:
        df: DataFrame com dados OHLCV
        timeframe: Timeframe analisado
    
    Returns:
        dict com análise completa do candle atual
    """
    try:
        if df.empty or len(df) < 2:
            return {'erro': 'Dados insuficientes'}
        
        # Último candle (atual)
        candle_atual = df.iloc[-1]
        candle_anterior = df.iloc[-2]
        
        # Informações básicas do candle
        open_price = candle_atual['open']
        high_price = candle_atual['high']
        low_price = candle_atual['low']
        close_price = candle_atual['close']
        volume = candle_atual['volume']
        
        # Timestamps
        timestamp_inicio = candle_atual.name if hasattr(candle_atual, 'name') else df.index[-1]
        
        # Converter para datetime se necessário
        if isinstance(timestamp_inicio, pd.Timestamp):
            timestamp_inicio_dt = timestamp_inicio.to_pydatetime()
        elif isinstance(timestamp_inicio, (int, float)):
            # Se for timestamp Unix (em segundos ou milissegundos)
            if timestamp_inicio > 1e10:  # Milissegundos
                timestamp_inicio_dt = datetime.fromtimestamp(timestamp_inicio / 1000)
            elif timestamp_inicio > 1e9:  # Segundos
                timestamp_inicio_dt = datetime.fromtimestamp(timestamp_inicio)
            else:
                # Timestamp muito pequeno, usar agora
                timestamp_inicio_dt = datetime.now()
        else:
            # Tentar converter diretamente
            try:
                timestamp_inicio_dt = pd.to_datetime(timestamp_inicio).to_pydatetime()
            except:
                # Fallback para agora
                timestamp_inicio_dt = datetime.now()
        
        timestamp_fechamento = timestamp_inicio_dt + timedelta(minutes=_timeframe_to_minutes(timeframe))
        
        # Converter para timezone brasileiro
        br_tz = pytz.timezone("America/Sao_Paulo")
        timestamp_inicio_br = timestamp_inicio_dt.replace(tzinfo=br_tz)
        timestamp_fechamento_br = timestamp_fechamento.replace(tzinfo=br_tz)
        
        # Análise do range
        range_candle = high_price - low_price
        range_percentual = (range_candle / open_price) * 100
        
        # Análise do corpo
        corpo_candle = abs(close_price - open_price)
        corpo_percentual = (corpo_candle / open_price) * 100
        
        # Análise das sombras
        sombra_superior = high_price - max(open_price, close_price)
        sombra_inferior = min(open_price, close_price) - low_price
        
        # Percentuais das sombras
        sombra_superior_pct = (sombra_superior / range_candle) * 100 if range_candle > 0 else 0
        sombra_inferior_pct = (sombra_inferior / range_candle) * 100 if range_candle > 0 else 0
        
        # Classificação do candle
        tipo_candle = _classificar_candle(open_price, high_price, low_price, close_price, range_candle)
        
        # Tendência do candle
        tendencia_candle = _analisar_tendencia_candle(candle_atual, candle_anterior)
        
        # Volume analysis
        volume_anterior = candle_anterior['volume']
        volume_ratio = volume / volume_anterior if volume_anterior > 0 else 1
        
        # Volume médio (últimas 20 velas)
        volume_medio = df['volume'].tail(20).mean()
        volume_vs_medio = volume / volume_medio if volume_medio > 0 else 1
        
        # Análise de força
        forca_candle = _calcular_forca_candle(corpo_percentual, range_percentual, volume_vs_medio)
        
        # Análise de momentum
        momentum_candle = _calcular_momentum_candle(df)
        
        # Análise de volatilidade
        volatilidade_candle = _calcular_volatilidade_candle(df)
        
        # Análise de posição relativa
        posicao_relativa = _analisar_posicao_relativa(df, close_price)
        
        # Análise de padrões
        padroes_candle = _detectar_padroes_candle(df)
        
        # Análise de tempo
        tempo_restante = _calcular_tempo_restante(timestamp_inicio_br, timeframe)
        
        return {
            'candle_atual': {
                'timestamp_inicio': timestamp_inicio_br.strftime('%d/%m/%Y %H:%M:%S'),
                'timestamp_fechamento': timestamp_fechamento_br.strftime('%d/%m/%Y %H:%M:%S'),
                'tempo_restante': tempo_restante,
                'timeframe': timeframe
            },
            'precos': {
                'open': open_price,
                'high': high_price,
                'low': low_price,
                'close': close_price,
                'range': range_candle,
                'range_percentual': round(range_percentual, 2),
                'corpo': corpo_candle,
                'corpo_percentual': round(corpo_percentual, 2)
            },
            'sombras': {
                'superior': sombra_superior,
                'inferior': sombra_inferior,
                'superior_pct': round(sombra_superior_pct, 1),
                'inferior_pct': round(sombra_inferior_pct, 1)
            },
            'classificacao': {
                'tipo': tipo_candle['tipo'],
                'descricao': tipo_candle['descricao'],
                'significado': tipo_candle['significado'],
                'forca': tipo_candle['forca']
            },
            'tendencia': tendencia_candle,
            'volume': {
                'atual': volume,
                'anterior': volume_anterior,
                'ratio_vs_anterior': round(volume_ratio, 2),
                'medio_20': volume_medio,
                'ratio_vs_medio': round(volume_vs_medio, 2),
                'status': _classificar_volume(volume_vs_medio)
            },
            'analise_tecnica': {
                'forca_candle': forca_candle,
                'momentum': momentum_candle,
                'volatilidade': volatilidade_candle,
                'posicao_relativa': posicao_relativa
            },
            'padroes': padroes_candle,
            'resumo': _gerar_resumo_candle(tipo_candle, tendencia_candle, forca_candle, volume_vs_medio)
        }
        
    except Exception as e:
        return {'erro': f'Erro na análise: {str(e)}'}


def _timeframe_to_minutes(timeframe):
    """Converte timeframe para minutos"""
    timeframe_map = {
        '1m': 1, '3m': 3, '5m': 5, '15m': 15, '30m': 30,
        '1h': 60, '2h': 120, '4h': 240, '6h': 360, '8h': 480,
        '12h': 720, '1d': 1440, '3d': 4320, '1w': 10080, '1M': 43200
    }
    return timeframe_map.get(timeframe, 60)


def _classificar_candle(open_price, high_price, low_price, close_price, range_candle):
    """Classifica o tipo de candle"""
    
    # Evitar divisão por zero
    if range_candle == 0 or range_candle < 0.0001:
        return {
            'tipo': 'Doji',
            'descricao': 'Doji Perfeito',
            'significado': 'Indecisão total do mercado',
            'forca': 'Neutra'
        }
    
    corpo = abs(close_price - open_price)
    corpo_pct = (corpo / range_candle) * 100
    
    # Determinar se é alta ou baixa
    is_alta = close_price > open_price
    
    # Classificação por tamanho do corpo
    if corpo_pct > 80:
        tipo = 'Marubozu'
        descricao = 'Marubozu de Alta' if is_alta else 'Marubozu de Baixa'
        significado = 'Movimento muito forte' if is_alta else 'Queda muito forte'
        forca = 'Muito Forte'
    elif corpo_pct > 60:
        tipo = 'Candle Forte'
        descricao = 'Candle Forte de Alta' if is_alta else 'Candle Forte de Baixa'
        significado = 'Movimento forte' if is_alta else 'Queda forte'
        forca = 'Forte'
    elif corpo_pct > 40:
        tipo = 'Candle Normal'
        descricao = 'Candle Normal de Alta' if is_alta else 'Candle Normal de Baixa'
        significado = 'Movimento moderado' if is_alta else 'Queda moderada'
        forca = 'Moderada'
    elif corpo_pct > 20:
        tipo = 'Candle Fraco'
        descricao = 'Candle Fraco de Alta' if is_alta else 'Candle Fraco de Baixa'
        significado = 'Movimento fraco' if is_alta else 'Queda fraca'
        forca = 'Fraca'
    else:
        tipo = 'Doji'
        descricao = 'Doji'
        significado = 'Indecisão do mercado'
        forca = 'Neutra'
    
    # Análise de sombras para refinamento
    sombra_superior = high_price - max(open_price, close_price)
    sombra_inferior = min(open_price, close_price) - low_price
    
    # Martelo/Estrela Cadente
    if sombra_inferior > corpo * 2 and sombra_superior < corpo * 0.3:
        if is_alta:
            tipo = 'Martelo'
            descricao = 'Martelo'
            significado = 'Possível reversão de alta'
            forca = 'Reversão'
        else:
            tipo = 'Martelo Invertido'
            descricao = 'Martelo Invertido'
            significado = 'Possível continuação de baixa'
            forca = 'Reversão'
    
    elif sombra_superior > corpo * 2 and sombra_inferior < corpo * 0.3:
        if is_alta:
            tipo = 'Estrela Cadente'
            descricao = 'Estrela Cadente'
            significado = 'Possível reversão de baixa'
            forca = 'Reversão'
        else:
            tipo = 'Estrela Cadente Invertida'
            descricao = 'Estrela Cadente Invertida'
            significado = 'Possível continuação de alta'
            forca = 'Reversão'
    
    return {
        'tipo': tipo,
        'descricao': descricao,
        'significado': significado,
        'forca': forca
    }


def _analisar_tendencia_candle(candle_atual, candle_anterior):
    """Analisa a tendência do candle atual"""
    
    # Comparação com candle anterior
    variacao_vs_anterior = ((candle_atual['close'] - candle_anterior['close']) / candle_anterior['close']) * 100
    
    # Análise de fechamento
    fechamento_vs_abertura = ((candle_atual['close'] - candle_atual['open']) / candle_atual['open']) * 100
    
    # Análise de máxima e mínima
    maxima_vs_fechamento = ((candle_atual['high'] - candle_atual['close']) / candle_atual['close']) * 100
    minima_vs_fechamento = ((candle_atual['close'] - candle_atual['low']) / candle_atual['close']) * 100
    
    # Determinar tendência
    if abs(fechamento_vs_abertura) > 0.1:  # Movimento significativo
        if fechamento_vs_abertura > 0:
            tendencia = 'Alta'
            intensidade = 'Forte' if fechamento_vs_abertura > 1 else 'Moderada'
        else:
            tendencia = 'Baixa'
            intensidade = 'Forte' if fechamento_vs_abertura < -1 else 'Moderada'
    else:
        tendencia = 'Lateral'
        intensidade = 'Neutra'
    
    # Análise de rejeição
    rejeicao_superior = maxima_vs_fechamento > 0.5
    rejeicao_inferior = minima_vs_fechamento > 0.5
    
    return {
        'direcao': tendencia,
        'intensidade': intensidade,
        'variacao_vs_anterior': round(variacao_vs_anterior, 2),
        'fechamento_vs_abertura': round(fechamento_vs_abertura, 2),
        'rejeicao_superior': rejeicao_superior,
        'rejeicao_inferior': rejeicao_inferior,
        'descricao': f'{tendencia} {intensidade}'
    }


def _calcular_forca_candle(corpo_percentual, range_percentual, volume_ratio):
    """Calcula a força do candle"""
    
    score = 0
    
    # Força do corpo (0-40 pontos)
    if corpo_percentual > 2:
        score += 40
    elif corpo_percentual > 1:
        score += 30
    elif corpo_percentual > 0.5:
        score += 20
    elif corpo_percentual > 0.1:
        score += 10
    
    # Força do range (0-30 pontos)
    if range_percentual > 3:
        score += 30
    elif range_percentual > 2:
        score += 25
    elif range_percentual > 1:
        score += 20
    elif range_percentual > 0.5:
        score += 15
    elif range_percentual > 0.1:
        score += 10
    
    # Força do volume (0-30 pontos)
    if volume_ratio > 2:
        score += 30
    elif volume_ratio > 1.5:
        score += 25
    elif volume_ratio > 1.2:
        score += 20
    elif volume_ratio > 1:
        score += 15
    elif volume_ratio > 0.8:
        score += 10
    
    # Classificar força
    if score >= 80:
        return {'score': score, 'classificacao': 'Muito Forte', 'cor': '🟢'}
    elif score >= 60:
        return {'score': score, 'classificacao': 'Forte', 'cor': '🟢'}
    elif score >= 40:
        return {'score': score, 'classificacao': 'Moderada', 'cor': '🟡'}
    elif score >= 20:
        return {'score': score, 'classificacao': 'Fraca', 'cor': '🟠'}
    else:
        return {'score': score, 'classificacao': 'Muito Fraca', 'cor': '🔴'}


def _calcular_momentum_candle(df):
    """Calcula o momentum do candle atual"""
    
    if len(df) < 5:
        return {'valor': 0, 'classificacao': 'Indefinido'}
    
    # Momentum de 5 candles
    momentum_5 = ((df['close'].iloc[-1] / df['close'].iloc[-5]) - 1) * 100
    
    # Momentum de 3 candles
    momentum_3 = ((df['close'].iloc[-1] / df['close'].iloc[-3]) - 1) * 100
    
    # Momentum de 1 candle
    momentum_1 = ((df['close'].iloc[-1] / df['close'].iloc[-2]) - 1) * 100
    
    # Momentum médio ponderado
    momentum_ponderado = (momentum_1 * 0.5) + (momentum_3 * 0.3) + (momentum_5 * 0.2)
    
    # Classificar momentum
    if abs(momentum_ponderado) > 2:
        classificacao = 'Muito Forte'
    elif abs(momentum_ponderado) > 1:
        classificacao = 'Forte'
    elif abs(momentum_ponderado) > 0.5:
        classificacao = 'Moderado'
    elif abs(momentum_ponderado) > 0.1:
        classificacao = 'Fraco'
    else:
        classificacao = 'Neutro'
    
    return {
        'valor': round(momentum_ponderado, 2),
        'classificacao': classificacao,
        'direcao': 'Alta' if momentum_ponderado > 0 else 'Baixa' if momentum_ponderado < 0 else 'Neutro',
        'momentum_1': round(momentum_1, 2),
        'momentum_3': round(momentum_3, 2),
        'momentum_5': round(momentum_5, 2)
    }


def _calcular_volatilidade_candle(df):
    """Calcula a volatilidade do candle atual"""
    
    if len(df) < 20:
        return {'valor': 0, 'classificacao': 'Indefinido'}
    
    # Volatilidade atual (range do candle)
    range_atual = df['high'].iloc[-1] - df['low'].iloc[-1]
    volatilidade_atual = (range_atual / df['close'].iloc[-1]) * 100
    
    # Volatilidade média (últimos 20 candles)
    ranges_20 = df['high'].tail(20) - df['low'].tail(20)
    volatilidade_media = (ranges_20 / df['close'].tail(20)).mean() * 100
    
    # Ratio de volatilidade
    ratio_volatilidade = volatilidade_atual / volatilidade_media if volatilidade_media > 0 else 1
    
    # Classificar volatilidade
    if ratio_volatilidade > 2:
        classificacao = 'Muito Alta'
    elif ratio_volatilidade > 1.5:
        classificacao = 'Alta'
    elif ratio_volatilidade > 0.8:
        classificacao = 'Normal'
    elif ratio_volatilidade > 0.5:
        classificacao = 'Baixa'
    else:
        classificacao = 'Muito Baixa'
    
    return {
        'valor': round(volatilidade_atual, 2),
        'classificacao': classificacao,
        'ratio_vs_media': round(ratio_volatilidade, 2),
        'media_20': round(volatilidade_media, 2)
    }


def _analisar_posicao_relativa(df, close_price):
    """Analisa a posição relativa do preço atual"""
    
    if len(df) < 20:
        return {'posicao': 'Indefinido'}
    
    # Últimos 20 candles
    ultimos_20 = df.tail(20)
    
    # Posição relativa
    max_20 = ultimos_20['high'].max()
    min_20 = ultimos_20['low'].min()
    
    if max_20 == min_20:
        posicao_pct = 50
    else:
        posicao_pct = ((close_price - min_20) / (max_20 - min_20)) * 100
    
    # Classificar posição
    if posicao_pct > 80:
        posicao = 'Máxima'
        cor = '🔴'
    elif posicao_pct > 60:
        posicao = 'Alta'
        cor = '🟠'
    elif posicao_pct > 40:
        posicao = 'Média'
        cor = '🟡'
    elif posicao_pct > 20:
        posicao = 'Baixa'
        cor = '🟢'
    else:
        posicao = 'Mínima'
        cor = '🔵'
    
    return {
        'posicao': posicao,
        'percentual': round(posicao_pct, 1),
        'cor': cor,
        'max_20': max_20,
        'min_20': min_20,
        'distancia_max': round(((max_20 - close_price) / close_price) * 100, 2),
        'distancia_min': round(((close_price - min_20) / close_price) * 100, 2)
    }


def _detectar_padroes_candle(df):
    """Detecta padrões nos últimos candles"""
    
    if len(df) < 3:
        return {'padroes': [], 'descricao': 'Dados insuficientes'}
    
    padroes = []
    
    # Últimos 3 candles
    c1 = df.iloc[-3]  # Mais antigo
    c2 = df.iloc[-2]  # Meio
    c3 = df.iloc[-1]  # Mais recente
    
    # Engolfo
    if c3['close'] > c3['open'] and c2['close'] < c2['open']:  # C3 alta, C2 baixa
        if c3['open'] <= c2['close'] and c3['close'] >= c2['open']:
            padroes.append({
                'nome': 'Engolfo de Alta',
                'tipo': 'Reversão',
                'confianca': 'Alta',
                'descricao': 'Candle atual engole completamente o anterior'
            })
    
    elif c3['close'] < c3['open'] and c2['close'] > c2['open']:  # C3 baixa, C2 alta
        if c3['open'] >= c2['close'] and c3['close'] <= c2['open']:
            padroes.append({
                'nome': 'Engolfo de Baixa',
                'tipo': 'Reversão',
                'confianca': 'Alta',
                'descricao': 'Candle atual engole completamente o anterior'
            })
    
    # Harami
    if c2['close'] > c2['open'] and c3['close'] < c3['open']:  # C2 alta, C3 baixa
        if c3['open'] > c2['close'] and c3['close'] < c2['open']:
            padroes.append({
                'nome': 'Harami de Baixa',
                'tipo': 'Reversão',
                'confianca': 'Média',
                'descricao': 'Candle pequeno dentro do anterior'
            })
    
    elif c2['close'] < c2['open'] and c3['close'] > c3['open']:  # C2 baixa, C3 alta
        if c3['open'] < c2['close'] and c3['close'] > c2['open']:
            padroes.append({
                'nome': 'Harami de Alta',
                'tipo': 'Reversão',
                'confianca': 'Média',
                'descricao': 'Candle pequeno dentro do anterior'
            })
    
    # Sequência de alta/baixa
    if c1['close'] < c2['close'] < c3['close']:
        padroes.append({
            'nome': 'Sequência de Alta',
            'tipo': 'Continuação',
            'confianca': 'Alta',
            'descricao': 'Três candles consecutivos de alta'
        })
    
    elif c1['close'] > c2['close'] > c3['close']:
        padroes.append({
            'nome': 'Sequência de Baixa',
            'tipo': 'Continuação',
            'confianca': 'Alta',
            'descricao': 'Três candles consecutivos de baixa'
        })
    
    return {
        'padroes': padroes,
        'total': len(padroes),
        'descricao': f'{len(padroes)} padrão(ões) detectado(s)' if padroes else 'Nenhum padrão detectado'
    }


def _classificar_volume(volume_ratio):
    """Classifica o volume"""
    if volume_ratio > 2:
        return 'Muito Alto'
    elif volume_ratio > 1.5:
        return 'Alto'
    elif volume_ratio > 1.2:
        return 'Acima da Média'
    elif volume_ratio > 0.8:
        return 'Normal'
    elif volume_ratio > 0.5:
        return 'Baixo'
    else:
        return 'Muito Baixo'


def _calcular_tempo_restante(timestamp_inicio, timeframe):
    """Calcula tempo restante para fechamento do candle"""
    try:
        minutos_timeframe = _timeframe_to_minutes(timeframe)
        
        # Garantir que timestamp_inicio está em timezone brasileiro
        if timestamp_inicio.tzinfo is None:
            br_tz = pytz.timezone("America/Sao_Paulo")
            timestamp_inicio = br_tz.localize(timestamp_inicio)
        
        # Calcular timestamp de fechamento
        timestamp_fechamento = timestamp_inicio + timedelta(minutes=minutos_timeframe)
        
        # Obter hora atual em timezone brasileiro
        agora = datetime.now(pytz.timezone("America/Sao_Paulo"))
        
        # Calcular tempo restante
        tempo_restante = timestamp_fechamento - agora
        
        # Verificar se o candle já fechou
        if tempo_restante.total_seconds() <= 0:
            return "Fechado"
        
        # Calcular minutos e segundos restantes
        total_segundos = int(tempo_restante.total_seconds())
        minutos_restantes = total_segundos // 60
        segundos_restantes = total_segundos % 60
        
        # Limitar ao máximo do timeframe (não pode ser maior que o timeframe)
        if minutos_restantes > minutos_timeframe:
            minutos_restantes = minutos_timeframe
            segundos_restantes = 0
        
        return f"{minutos_restantes:02d}:{segundos_restantes:02d}"
        
    except Exception as e:
        print(f"⚠️ Erro ao calcular tempo restante: {e}")
        return "N/A"


def _gerar_resumo_candle(tipo_candle, tendencia, forca_candle, volume_ratio):
    """Gera resumo do candle"""
    
    resumo = f"{tipo_candle['tipo']} - {tendencia['direcao']} {tendencia['intensidade']}"
    
    if forca_candle['score'] > 60:
        resumo += f" | {forca_candle['classificacao']}"
    
    if volume_ratio > 1.5:
        resumo += " | Volume Alto"
    elif volume_ratio < 0.7:
        resumo += " | Volume Baixo"
    
    return resumo


if __name__ == "__main__":
    # Teste com dados simulados
    import requests
    
    url = "https://api.binance.com/api/v3/klines"
    params = {"symbol": "BTCUSDT", "interval": "1h", "limit": 100}
    response = requests.get(url, params=params, timeout=10)
    
    if response.status_code == 200:
        data = response.json()
        df = pd.DataFrame(data, columns=[
            'timestamp', 'open', 'high', 'low', 'close', 'volume',
            'close_time', 'quote_volume', 'trades', 'taker_buy_base',
            'taker_buy_quote', 'ignore'
        ])
        df = df[['open', 'high', 'low', 'close', 'volume']].astype(float)
        df.index = pd.to_datetime([datetime.fromtimestamp(int(ts)/1000) for ts in data], unit='s')
        
        analise = analisar_candle_atual(df, "1h")
        
        print("="*60)
        print("ANÁLISE DETALHADA DO CANDLE ATUAL")
        print("="*60)
        
        if 'erro' not in analise:
            candle = analise['candle_atual']
            precos = analise['precos']
            classificacao = analise['classificacao']
            
            print(f"⏰ Horário: {candle['timestamp_inicio']} - {candle['timestamp_fechamento']}")
            print(f"⏱️ Tempo Restante: {candle['tempo_restante']}")
            print(f"📊 Timeframe: {candle['timeframe']}")
            
            print(f"\n💰 Preços:")
            print(f"   Open:  ${precos['open']:,.2f}")
            print(f"   High:  ${precos['high']:,.2f}")
            print(f"   Low:   ${precos['low']:,.2f}")
            print(f"   Close: ${precos['close']:,.2f}")
            print(f"   Range: ${precos['range']:,.2f} ({precos['range_percentual']}%)")
            
            print(f"\n📈 Classificação:")
            print(f"   Tipo: {classificacao['tipo']}")
            print(f"   Descrição: {classificacao['descricao']}")
            print(f"   Significado: {classificacao['significado']}")
            print(f"   Força: {classificacao['forca']}")
            
            print(f"\n📊 Resumo: {analise['resumo']}")
        else:
            print(f"❌ {analise['erro']}")
