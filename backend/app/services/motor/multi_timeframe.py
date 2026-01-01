#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MULTI-TIMEFRAME ANALYSIS
Análise automatizada em múltiplos timeframes
"""

import requests
import pandas as pd


def analise_multitf(symbol='BTCUSDT', timeframes=['1m', '5m', '15m', '1h', '4h']):
    """
    Análise em múltiplos timeframes
    
    Args:
        symbol: Par a analisar
        timeframes: Lista de TFs
    
    Returns:
        dict com análise por TF
    """
    resultados = {}
    
    for tf in timeframes:
        dados = buscar_dados_tf(symbol, tf)
        if dados is not None:
            analise = analisar_tf(dados, tf)
            resultados[tf] = analise
    
    # Confluência entre timeframes
    confluencia = calcular_confluencia_mtf(resultados)
    
    return {
        'timeframes': resultados,
        'confluencia': confluencia,
        'resumo': gerar_resumo_mtf(resultados)
    }


def buscar_dados_tf(symbol, interval, limit=100):
    """Busca dados de um timeframe"""
    try:
        url = "https://api.binance.com/api/v3/klines"
        params = {"symbol": symbol, "interval": interval, "limit": limit}
        response = requests.get(url, params=params, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            df = pd.DataFrame(data, columns=[
                'timestamp', 'open', 'high', 'low', 'close', 'volume',
                'close_time', 'quote_volume', 'trades', 'taker_buy_base',
                'taker_buy_quote', 'ignore'
            ])
            df = df[['close', 'volume']].astype(float)
            return df
        return None
    except:
        return None


def analisar_tf(dados, tf):
    """Analisa um timeframe específico"""
    try:
        # Calcular EMAs
        ema8 = dados['close'].ewm(span=8, adjust=False).mean().iloc[-1]
        ema21 = dados['close'].ewm(span=21, adjust=False).mean().iloc[-1]
        
        # Calcular RSI
        delta = dados['close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        rsi = (100 - (100 / (1 + rs))).iloc[-1]
        
        # MACD
        exp1 = dados['close'].ewm(span=12, adjust=False).mean()
        exp2 = dados['close'].ewm(span=26, adjust=False).mean()
        macd = (exp1 - exp2).iloc[-1]
        signal = (exp1 - exp2).ewm(span=9, adjust=False).mean().iloc[-1]
        
        # Status
        if ema8 > ema21:
            tendencia = "ALTA"
            status = "✓ Bullish"
        elif ema8 < ema21:
            tendencia = "BAIXA"
            status = "✗ Bearish"
        else:
            tendencia = "NEUTRO"
            status = "~ Lateral"
        
        # Força
        gap = abs(ema8 - ema21) / ema21 * 100
        forca = min(10, gap * 20)
        
        return {
            'timeframe': tf,
            'ema8': round(ema8, 2),
            'ema21': round(ema21, 2),
            'rsi': round(rsi, 1),
            'macd': round(macd, 2),
            'signal': round(signal, 2),
            'tendencia': tendencia,
            'status': status,
            'forca': round(forca, 1)
        }
    
    except:
        return {
            'timeframe': tf,
            'erro': 'Falha na análise'
        }


def calcular_confluencia_mtf(resultados):
    """Calcula confluência entre timeframes"""
    try:
        if not resultados:
            return 0
        
        # Contar tendências
        altas = sum(1 for r in resultados.values() if r.get('tendencia') == 'ALTA')
        baixas = sum(1 for r in resultados.values() if r.get('tendencia') == 'BAIXA')
        total = len(resultados)
        
        # Score de confluência
        if altas > baixas:
            confluencia = (altas / total) * 10
            direcao = "ALTA"
        elif baixas > altas:
            confluencia = (baixas / total) * 10
            direcao = "BAIXA"
        else:
            confluencia = 5
            direcao = "NEUTRO"
        
        return {
            'score': round(confluencia, 1),
            'direcao': direcao,
            'confirmacoes': max(altas, baixas),
            'total_tfs': total
        }
    
    except:
        return {'score': 0, 'direcao': 'INDEFINIDO'}


def gerar_resumo_mtf(resultados):
    """Gera resumo da análise multi-TF"""
    try:
        if not resultados:
            return "Sem dados"
        
        # Verificar alinhamento
        tendencias = [r.get('tendencia') for r in resultados.values() if 'tendencia' in r]
        
        if all(t == 'ALTA' for t in tendencias):
            return f"✅ Todos {len(tendencias)} TFs confirmam ALTA"
        elif all(t == 'BAIXA' for t in tendencias):
            return f"✅ Todos {len(tendencias)} TFs confirmam BAIXA"
        else:
            altas = tendencias.count('ALTA')
            baixas = tendencias.count('BAIXA')
            if altas > baixas:
                return f"⚠️ {altas}/{len(tendencias)} TFs em ALTA (divergência)"
            elif baixas > altas:
                return f"⚠️ {baixas}/{len(tendencias)} TFs em BAIXA (divergência)"
            else:
                return f"❌ Timeframes divergentes (sem consenso)"
    
    except:
        return "Erro no resumo"


if __name__ == "__main__":
    resultado = analise_multitf('BTCUSDT')
    
    print("="*60)
    print("ANÁLISE MULTI-TIMEFRAME")
    print("="*60)
    
    for tf, analise in resultado['timeframes'].items():
        print(f"\n{tf}:")
        print(f"  EMA8: {analise['ema8']} | EMA21: {analise['ema21']}")
        print(f"  RSI: {analise['rsi']} | Tendência: {analise['tendencia']}")
        print(f"  Status: {analise['status']} | Força: {analise['forca']}/10")
    
    print(f"\nCONFLUÊNCIA:")
    print(f"  Score: {resultado['confluencia']['score']}/10")
    print(f"  Direção: {resultado['confluencia']['direcao']}")
    print(f"  Confirmações: {resultado['confluencia']['confirmacoes']}/{resultado['confluencia']['total_tfs']}")
    print(f"\n  {resultado['resumo']}")





