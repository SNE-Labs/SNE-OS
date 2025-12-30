#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ESTRUTURA DE MERCADO
Analisa Higher Highs, Higher Lows, Suportes e Resistências
"""

import pandas as pd
import numpy as np
from scipy.signal import find_peaks


def analisar_estrutura(dados):
    """
    Analisa estrutura completa do mercado
    
    Args:
        dados: DataFrame com OHLCV
    
    Returns:
        dict com estrutura de mercado
    """
    try:
        # Identificar topos e fundos
        topos, fundos = identificar_topos_fundos(dados)
        
        # Classificar tendência
        tendencia, tipo_estrutura = classificar_tendencia(topos, fundos, dados)
        
        # Suportes e resistências
        suportes, resistencias = detectar_sr_levels(dados, topos, fundos)
        
        # Análise de price action
        price_action = analisar_price_action(dados)
        
        return {
            'tendencia': tendencia,
            'tipo_estrutura': tipo_estrutura,
            'topos': topos,
            'fundos': fundos,
            'suportes': suportes,
            'resistencias': resistencias,
            'price_action': price_action
        }
    
    except Exception as e:
        return {'erro': str(e)}


def identificar_topos_fundos(dados, distance=5):
    """Identifica topos e fundos significativos"""
    try:
        highs = dados['high'].values
        lows = dados['low'].values
        
        # Encontrar picos (topos)
        peaks_idx, _ = find_peaks(highs, distance=distance)
        topos = [{'indice': int(i), 'preco': float(highs[i])} for i in peaks_idx[-10:]]
        
        # Encontrar vales (fundos)
        valleys_idx, _ = find_peaks(-lows, distance=distance)
        fundos = [{'indice': int(i), 'preco': float(lows[i])} for i in valleys_idx[-10:]]
        
        return topos, fundos
    
    except:
        return [], []


def classificar_tendencia(topos, fundos, dados):
    """Classifica tendência baseado em HH/HL ou LH/LL"""
    try:
        if len(topos) < 2 or len(fundos) < 2:
            return "INDEFINIDA", "Dados insuficientes"
        
        # Últimos 3 topos e fundos
        ultimos_topos = sorted(topos, key=lambda x: x['indice'])[-3:]
        ultimos_fundos = sorted(fundos, key=lambda x: x['indice'])[-3:]
        
        # Verificar Higher Highs
        topos_ascendentes = all(
            ultimos_topos[i]['preco'] < ultimos_topos[i+1]['preco']
            for i in range(len(ultimos_topos)-1)
        )
        
        # Verificar Higher Lows
        fundos_ascendentes = all(
            ultimos_fundos[i]['preco'] < ultimos_fundos[i+1]['preco']
            for i in range(len(ultimos_fundos)-1)
        )
        
        # Verificar Lower Highs
        topos_descendentes = all(
            ultimos_topos[i]['preco'] > ultimos_topos[i+1]['preco']
            for i in range(len(ultimos_topos)-1)
        )
        
        # Verificar Lower Lows
        fundos_descendentes = all(
            ultimos_fundos[i]['preco'] > ultimos_fundos[i+1]['preco']
            for i in range(len(ultimos_fundos)-1)
        )
        
        # Classificar
        if topos_ascendentes and fundos_ascendentes:
            return "ALTA", "Higher Highs + Higher Lows"
        elif topos_descendentes and fundos_descendentes:
            return "BAIXA", "Lower Highs + Lower Lows"
        elif topos_ascendentes and not fundos_ascendentes:
            return "ALTA", "Topos ascendentes (estrutura fraca)"
        elif topos_descendentes and not fundos_descendentes:
            return "BAIXA", "Topos descendentes (estrutura fraca)"
        else:
            return "LATERAL", "Sem estrutura clara"
    
    except:
        return "INDEFINIDA", "Erro na análise"


def detectar_sr_levels(dados, topos, fundos):
    """Detecta níveis de suporte e resistência"""
    try:
        preco_atual = dados['close'].iloc[-1]
        
        # Agrupar topos próximos (resistências)
        resistencias = []
        if topos:
            precos_topos = [t['preco'] for t in topos]
            resistencias = agrupar_niveis(precos_topos, preco_atual, tipo='resistencia')
        
        # Agrupar fundos próximos (suportes)
        suportes = []
        if fundos:
            precos_fundos = [f['preco'] for f in fundos]
            suportes = agrupar_niveis(precos_fundos, preco_atual, tipo='suporte')
        
        return suportes, resistencias
    
    except:
        return [], []


def agrupar_niveis(precos, preco_atual, tipo='suporte', tolerancia=0.005):
    """Agrupa níveis próximos"""
    try:
        if not precos:
            return []
        
        # Filtrar por tipo
        if tipo == 'resistencia':
            precos = [p for p in precos if p > preco_atual]
        else:
            precos = [p for p in precos if p < preco_atual]
        
        if not precos:
            return []
        
        # Agrupar níveis próximos
        niveis = []
        precos_sorted = sorted(precos)
        
        grupo_atual = [precos_sorted[0]]
        for preco in precos_sorted[1:]:
            if abs(preco - grupo_atual[-1]) / grupo_atual[-1] < tolerancia:
                grupo_atual.append(preco)
            else:
                # Finalizar grupo
                nivel_medio = np.mean(grupo_atual)
                forca = len(grupo_atual)
                niveis.append({
                    'preco': round(nivel_medio, 2),
                    'forca': forca,
                    'toques': forca,
                    'distancia_pct': round(abs(nivel_medio - preco_atual) / preco_atual * 100, 2)
                })
                grupo_atual = [preco]
        
        # Último grupo
        if grupo_atual:
            nivel_medio = np.mean(grupo_atual)
            forca = len(grupo_atual)
            niveis.append({
                'preco': round(nivel_medio, 2),
                'forca': forca,
                'toques': forca,
                'distancia_pct': round(abs(nivel_medio - preco_atual) / preco_atual * 100, 2)
            })
        
        # Ordenar por força
        niveis.sort(key=lambda x: x['forca'], reverse=True)
        
        return niveis[:5]  # Top 5
    
    except:
        return []


def analisar_price_action(dados):
    """Analisa price action recente"""
    try:
        ultimos_10 = dados.tail(10)
        
        # Última vela
        ultima_vela = dados.iloc[-1]
        corpo = abs(ultima_vela['close'] - ultima_vela['open'])
        sombra_superior = ultima_vela['high'] - max(ultima_vela['close'], ultima_vela['open'])
        sombra_inferior = min(ultima_vela['close'], ultima_vela['open']) - ultima_vela['low']
        range_vela = ultima_vela['high'] - ultima_vela['low']
        
        # Evitar divisão por zero
        if range_vela == 0 or range_vela < 0.0001:
            return {
                'tipo_vela': "Doji",
                'corpo_pct': 0.0,
                'sombra_superior_pct': 0.0,
                'sombra_inferior_pct': 0.0,
                'momentum': "Neutro"
            }
        
        # Classificar vela
        corpo_pct = corpo / range_vela
        if corpo_pct > 0.7:
            tipo_vela = "Forte" if ultima_vela['close'] > ultima_vela['open'] else "Queda Forte"
        elif corpo_pct < 0.3:
            tipo_vela = "Indecisão (Doji-like)"
        else:
            tipo_vela = "Normal"
        
        # Momentum
        momentum = "Positivo" if ultima_vela['close'] > dados['close'].iloc[-5] else "Negativo"
        
        return {
            'tipo_vela': tipo_vela,
            'corpo_pct': round(corpo_pct * 100, 1),
            'sombra_superior_pct': round((sombra_superior / range_vela) * 100, 1),
            'sombra_inferior_pct': round((sombra_inferior / range_vela) * 100, 1),
            'momentum': momentum
        }
    
    except:
        return {}


if __name__ == "__main__":
    import requests
    
    url = "https://api.binance.com/api/v3/klines"
    params = {"symbol": "BTCUSDT", "interval": "1h", "limit": 200}
    response = requests.get(url, params=params, timeout=10)
    
    if response.status_code == 200:
        data = response.json()
        df = pd.DataFrame(data, columns=[
            'timestamp', 'open', 'high', 'low', 'close', 'volume',
            'close_time', 'quote_volume', 'trades', 'taker_buy_base',
            'taker_buy_quote', 'ignore'
        ])
        df = df[['open', 'high', 'low', 'close']].astype(float)
        
        estrutura = analisar_estrutura(df)
        
        print("="*60)
        print("ESTRUTURA DE MERCADO")
        print("="*60)
        print(f"Tendência: {estrutura['tendencia']}")
        print(f"Tipo: {estrutura['tipo_estrutura']}")
        print(f"\nResistências: {len(estrutura['resistencias'])}")
        for r in estrutura['resistencias'][:3]:
            print(f"  ${r['preco']:,.2f} (Força: {r['forca']}, Dist: {r['distancia_pct']}%)")
        print(f"\nSuportes: {len(estrutura['suportes'])}")
        for s in estrutura['suportes'][:3]:
            print(f"  ${s['preco']:,.2f} (Força: {s['forca']}, Dist: {s['distancia_pct']}%)")


