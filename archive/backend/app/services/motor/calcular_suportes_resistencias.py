#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CÁLCULO DE SUPORTES E RESISTÊNCIAS
Identifica níveis chave de S/R usando múltiplos métodos
"""

import pandas as pd
import numpy as np


def calcular_range_atr(df, periodo=14):
    """
    Calcula o Average True Range (ATR) e métricas de range
    
    Args:
        df: DataFrame com OHLCV
        periodo: Período para cálculo do ATR
    
    Returns:
        dict com dados de range
    """
    try:
        # Calcular True Range
        df['prev_close'] = df['close'].shift(1)
        df['tr1'] = df['high'] - df['low']
        df['tr2'] = abs(df['high'] - df['prev_close'])
        df['tr3'] = abs(df['low'] - df['prev_close'])
        df['true_range'] = df[['tr1', 'tr2', 'tr3']].max(axis=1)
        
        # Calcular ATR
        df['atr'] = df['true_range'].rolling(window=periodo).mean()
        
        atr_atual = df['atr'].iloc[-1]
        preco_atual = df['close'].iloc[-1]
        
        # Range percentual
        range_percent = (atr_atual / preco_atual) * 100
        
        # Range diário atual
        range_dia = df['high'].iloc[-1] - df['low'].iloc[-1]
        range_dia_percent = (range_dia / preco_atual) * 100
        
        # Classificar volatilidade baseada no ATR
        atr_medio = df['atr'].tail(50).mean()
        
        if atr_atual > atr_medio * 1.5:
            volatilidade_status = "ALTA"
            cor_volatilidade = "🔴"
        elif atr_atual < atr_medio * 0.7:
            volatilidade_status = "BAIXA"
            cor_volatilidade = "🟢"
        else:
            volatilidade_status = "MÉDIA"
            cor_volatilidade = "🟡"
        
        # Calcular zonas de range (baseado no ATR)
        range_superior = preco_atual + atr_atual
        range_inferior = preco_atual - atr_atual
        
        return {
            'atr': atr_atual,
            'atr_percent': range_percent,
            'range_dia': range_dia,
            'range_dia_percent': range_dia_percent,
            'volatilidade_status': volatilidade_status,
            'cor_volatilidade': cor_volatilidade,
            'range_superior': range_superior,
            'range_inferior': range_inferior,
            'preco_atual': preco_atual
        }
    
    except Exception as e:
        print(f"Erro ao calcular range: {e}")
        return None


def calcular_suportes_resistencias(df, num_niveis=3):
    """
    Calcula suportes e resistências usando múltiplos métodos
    
    Args:
        df: DataFrame com OHLCV
        num_niveis: Número de níveis S/R a retornar
    
    Returns:
        dict com suportes e resistências
    """
    try:
        suportes = []
        resistencias = []
        
        # 1. Pivot Points (clássico)
        pivot = (df['high'].iloc[-1] + df['low'].iloc[-1] + df['close'].iloc[-1]) / 3
        
        r1 = 2 * pivot - df['low'].iloc[-1]
        r2 = pivot + (df['high'].iloc[-1] - df['low'].iloc[-1])
        r3 = r1 + (df['high'].iloc[-1] - df['low'].iloc[-1])
        
        s1 = 2 * pivot - df['high'].iloc[-1]
        s2 = pivot - (df['high'].iloc[-1] - df['low'].iloc[-1])
        s3 = s1 - (df['high'].iloc[-1] - df['low'].iloc[-1])
        
        resistencias.extend([r1, r2, r3])
        suportes.extend([s1, s2, s3])
        
        # 2. Máximas e mínimas locais (swing points)
        window = 20
        if len(df) >= window:
            # Encontrar máximas locais (resistências)
            for i in range(window, len(df) - window):
                if df['high'].iloc[i] == df['high'].iloc[i-window:i+window].max():
                    resistencias.append(df['high'].iloc[i])
            
            # Encontrar mínimas locais (suportes)
            for i in range(window, len(df) - window):
                if df['low'].iloc[i] == df['low'].iloc[i-window:i+window].min():
                    suportes.append(df['low'].iloc[i])
        
        # 3. Níveis psicológicos (números redondos)
        preco_atual = df['close'].iloc[-1]
        base = 1000 if preco_atual > 10000 else (100 if preco_atual > 1000 else 10)
        
        for i in range(-3, 4):
            nivel = round(preco_atual / base) * base + (i * base)
            if nivel > preco_atual:
                resistencias.append(nivel)
            elif nivel < preco_atual:
                suportes.append(nivel)
        
        # Remover duplicatas e ordenar
        suportes = sorted(list(set([s for s in suportes if s > 0])), reverse=True)
        resistencias = sorted(list(set([r for r in resistencias if r > 0])))
        
        # Filtrar por proximidade (remover níveis muito próximos)
        suportes_filtrados = filtrar_niveis_proximos(suportes, preco_atual, num_niveis, tipo='suporte')
        resistencias_filtradas = filtrar_niveis_proximos(resistencias, preco_atual, num_niveis, tipo='resistencia')
        
        return {
            'suportes': suportes_filtrados[:num_niveis],
            'resistencias': resistencias_filtradas[:num_niveis],
            'pivot': pivot,
            'preco_atual': preco_atual
        }
    
    except Exception as e:
        print(f"Erro ao calcular S/R: {e}")
        return {
            'suportes': [],
            'resistencias': [],
            'pivot': 0,
            'preco_atual': df['close'].iloc[-1] if len(df) > 0 else 0
        }


def filtrar_niveis_proximos(niveis, preco_atual, num_niveis, tipo='suporte'):
    """
    Filtra níveis muito próximos entre si
    
    Args:
        niveis: Lista de níveis
        preco_atual: Preço atual do ativo
        num_niveis: Número de níveis desejados
        tipo: 'suporte' ou 'resistencia'
    """
    if not niveis:
        return []
    
    # Calcular distância mínima (0.5% do preço)
    distancia_minima = preco_atual * 0.005
    
    niveis_filtrados = []
    
    if tipo == 'suporte':
        # Suportes: começar do mais próximo ao preço (de cima para baixo)
        niveis_ordenados = sorted([n for n in niveis if n < preco_atual], reverse=True)
    else:
        # Resistências: começar do mais próximo ao preço (de baixo para cima)
        niveis_ordenados = sorted([n for n in niveis if n > preco_atual])
    
    for nivel in niveis_ordenados:
        if not niveis_filtrados:
            niveis_filtrados.append(nivel)
        else:
            # Adicionar apenas se estiver longe o suficiente dos outros
            if all(abs(nivel - n) > distancia_minima for n in niveis_filtrados):
                niveis_filtrados.append(nivel)
        
        if len(niveis_filtrados) >= num_niveis:
            break
    
    return niveis_filtrados


def formatar_range_para_relatorio(range_data):
    """
    Formata dados de range para exibição em relatório
    """
    if not range_data:
        return ""
    
    texto = "\n📏 ANÁLISE DE RANGE (ATR):\n"
    texto += f"   {range_data['cor_volatilidade']} Volatilidade: {range_data['volatilidade_status']}\n"
    texto += f"   ATR(14): ${range_data['atr']:,.2f} ({range_data['atr_percent']:.2f}%)\n"
    texto += f"   Range Atual: ${range_data['range_dia']:,.2f} ({range_data['range_dia_percent']:.2f}%)\n\n"
    texto += f"   📍 ZONA DE RANGE:\n"
    texto += f"      Superior: ${range_data['range_superior']:,.2f}\n"
    texto += f"      Inferior: ${range_data['range_inferior']:,.2f}\n"
    
    return texto


def formatar_sr_para_relatorio(sr_data):
    """
    Formata dados de S/R para exibição em relatório
    """
    suportes = sr_data['suportes']
    resistencias = sr_data['resistencias']
    preco_atual = sr_data['preco_atual']
    
    texto = "\n📊 SUPORTES E RESISTÊNCIAS:\n"
    texto += f"   Preço Atual: ${preco_atual:,.2f}\n\n"
    
    if resistencias:
        texto += "   🔴 RESISTÊNCIAS:\n"
        for i, r in enumerate(resistencias, 1):
            distancia = ((r - preco_atual) / preco_atual) * 100
            texto += f"      R{i}: ${r:,.2f} (+{distancia:.2f}%)\n"
    
    if sr_data['pivot']:
        texto += f"\n   ⚪ PIVOT: ${sr_data['pivot']:,.2f}\n"
    
    if suportes:
        texto += "\n   🟢 SUPORTES:\n"
        for i, s in enumerate(suportes, 1):
            distancia = ((preco_atual - s) / preco_atual) * 100
            texto += f"      S{i}: ${s:,.2f} (-{distancia:.2f}%)\n"
    
    return texto


if __name__ == "__main__":
    # Teste rápido
    import requests
    
    # Obter dados de teste
    url = "https://api.binance.com/api/v3/klines"
    params = {"symbol": "BTCUSDT", "interval": "1h", "limit": 200}
    response = requests.get(url, params=params)
    
    if response.status_code == 200:
        data = response.json()
        df = pd.DataFrame(data, columns=[
            'timestamp', 'open', 'high', 'low', 'close', 'volume',
            'close_time', 'quote_volume', 'trades', 'taker_buy_base',
            'taker_buy_quote', 'ignore'
        ])
        df[['open', 'high', 'low', 'close']] = df[['open', 'high', 'low', 'close']].astype(float)
        
        sr = calcular_suportes_resistencias(df)
        print(formatar_sr_para_relatorio(sr))

