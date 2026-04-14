#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CONTEXTO GLOBAL
Analisa regime de mercado, volatilidade, volume e sessão
"""

import pandas as pd
import numpy as np
from datetime import datetime
import pytz


def analisar_contexto(dados):
    """
    Analisa contexto global do mercado
    
    Args:
        dados: DataFrame com OHLCV
    
    Returns:
        dict com contexto completo
    """
    try:
        # Regime de mercado
        regime, forca_regime = identificar_regime(dados)
        
        # Volatilidade
        volatilidade = calcular_volatilidade(dados)
        volatilidade_status = classificar_volatilidade(volatilidade)
        
        # Volume
        volume_24h = dados['volume'].iloc[-24:].sum() if len(dados) >= 24 else dados['volume'].sum()
        volume_medio = dados['volume'].rolling(20).mean().iloc[-1]
        volume_ratio = dados['volume'].iloc[-1] / volume_medio if volume_medio > 0 else 1.0
        volume_status = classificar_volume(volume_ratio)
        
        # Garantir que volume_24h não seja zero
        if volume_24h == 0 or pd.isna(volume_24h):
            volume_24h = dados['volume'].sum()  # Soma total disponível
        
        # Sessão ativa
        sessao, participacao = sessao_ativa()
        
        # Horário ideal
        horario_ideal = verificar_horario_ideal()
        
        # Liquidez score
        liquidez_score = calcular_liquidez_score(volume_ratio, sessao)
        
        # Preço atual
        preco_atual = dados['close'].iloc[-1]
        
        return {
            'regime': regime,
            'forca_regime': forca_regime,
            'volatilidade': volatilidade,
            'volatilidade_status': volatilidade_status,
            'volume_24h': volume_24h,
            'volume_ratio': volume_ratio,
            'volume_status': volume_status,
            'sessao': sessao,
            'participacao_sessao': participacao,
            'horario_ideal': horario_ideal,
            'liquidez_score': liquidez_score,
            'preco_atual': preco_atual
        }
    
    except Exception as e:
        return {
            'regime': 'INDEFINIDO',
            'erro': str(e)
        }


def identificar_regime(dados):
    """Identifica regime de mercado"""
    try:
        # EMAs
        ema8 = dados['EMA8'].iloc[-1]
        ema21 = dados['EMA21'].iloc[-1]
        ema50 = dados['SMA50'].iloc[-1] if 'SMA50' in dados.columns else ema21
        
        # Gap entre EMAs
        gap_8_21 = abs(ema8 - ema21) / ema21 * 100
        gap_8_50 = abs(ema8 - ema50) / ema50 * 100
        
        # Volatilidade
        volatilidade = dados['close'].pct_change().std() * 100
        
        # Determinar regime
        if ema8 > ema21 > ema50 and gap_8_21 > 0.5:
            regime = 'BULL_TREND'
            forca = min(10, gap_8_21 * 20)
        elif ema8 < ema21 < ema50 and gap_8_21 > 0.5:
            regime = 'BEAR_TREND'
            forca = min(10, gap_8_21 * 20)
        elif volatilidade > 3.0:
            regime = 'VOLATILE'
            forca = min(10, volatilidade)
        elif gap_8_21 < 0.3:
            regime = 'CONSOLIDATION'
            forca = 10 - (gap_8_21 * 30)
        else:
            regime = 'SIDEWAYS'
            forca = 5.0
        
        return regime, round(forca, 1)
    
    except:
        return 'INDEFINIDO', 0.0


def calcular_volatilidade(dados):
    """Calcula volatilidade em %"""
    try:
        # ATR em %
        atr = dados['close'].diff().abs().rolling(14).mean().iloc[-1]
        volatilidade = (atr / dados['close'].iloc[-1]) * 100
        
        # Também calcular por retornos
        vol_retornos = dados['close'].pct_change().std() * 100
        
        # Média das duas
        return round((volatilidade + vol_retornos) / 2, 2)
    except:
        return 0.0


def classificar_volatilidade(volatilidade):
    """Classifica nível de volatilidade"""
    if volatilidade > 3.5:
        return "Muito Alta"
    elif volatilidade > 2.5:
        return "Alta"
    elif volatilidade > 1.5:
        return "Normal"
    elif volatilidade > 0.8:
        return "Baixa"
    else:
        return "Muito Baixa"


def classificar_volume(volume_ratio):
    """Classifica volume"""
    if volume_ratio > 2.0:
        return "Muito Alto"
    elif volume_ratio > 1.5:
        return "Alto"
    elif volume_ratio > 0.8:
        return "Normal"
    elif volume_ratio > 0.5:
        return "Baixo"
    else:
        return "Muito Baixo"


def sessao_ativa():
    """Identifica sessão de trading ativa"""
    try:
        agora = datetime.now(pytz.UTC)
        hora = agora.hour
        
        # Sessões de trading
        if 0 <= hora < 8:
            return "Asiática", "Baixa (20%)"
        elif 8 <= hora < 16:
            return "Londres", "Alta (45%)"
        elif 16 <= hora < 20:
            return "Nova York", "Média (30%)"
        else:
            return "Overnight", "Baixa (5%)"
    except:
        return "Indefinida", "N/A"


def verificar_horario_ideal():
    """Verifica se é horário ideal para trading"""
    try:
        agora = datetime.now(pytz.UTC)
        hora = agora.hour
        
        # Londres (melhor liquidez)
        if 8 <= hora < 16:
            return True
        else:
            return False
    except:
        return False


def calcular_liquidez_score(volume_ratio, sessao):
    """Calcula score de liquidez 0-10"""
    try:
        score = 0
        
        # Volume
        if volume_ratio > 2.0:
            score += 4
        elif volume_ratio > 1.5:
            score += 3
        elif volume_ratio > 1.0:
            score += 2
        else:
            score += 1
        
        # Sessão
        if sessao == "Londres":
            score += 4
        elif sessao == "Nova York":
            score += 3
        elif sessao == "Asiática":
            score += 2
        else:
            score += 1
        
        # Horário
        if verificar_horario_ideal():
            score += 2
        
        return min(10, score)
    except:
        return 5.0


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
        df = df[['close', 'volume']].astype(float)
        
        from indicadores import calcular_indicadores
        df = calcular_indicadores(df)
        
        contexto = analisar_contexto(df)
        
        print("="*60)
        print("CONTEXTO GLOBAL")
        print("="*60)
        print(f"Regime: {contexto['regime']} ({contexto['forca_regime']}/10)")
        print(f"Volatilidade: {contexto['volatilidade']}% ({contexto['volatilidade_status']})")
        print(f"Volume Ratio: {contexto['volume_ratio']:.2f}x ({contexto['volume_status']})")
        print(f"Sessão: {contexto['sessao']} ({contexto['participacao_sessao']})")
        print(f"Horário Ideal: {'✅ SIM' if contexto['horario_ideal'] else '❌ NÃO'}")
        print(f"Liquidez Score: {contexto['liquidez_score']}/10")


