#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Módulo de Indicadores Técnicos Avançados
Calcula todos os indicadores necessários para análise técnica profissional
Inclui: Osciladores, Momentum, Volatilidade, Volume, Padrões Gráficos
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional
import warnings
warnings.filterwarnings('ignore')


def calcular_indicadores_simples(closes):
    """
    Calcula indicadores básicos a partir de uma lista de preços de fechamento
    Retorna: EMA8, EMA21, RSI, BB_Upper, BB_Lower
    """
    if isinstance(closes, list):
        closes = pd.Series(closes)
    
    # EMAs
    ema8 = closes.ewm(span=8, adjust=False).mean().iloc[-1]
    ema21 = closes.ewm(span=21, adjust=False).mean().iloc[-1]
    
    # RSI
    delta = closes.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / loss
    rsi_series = 100 - (100 / (1 + rs))
    rsi = rsi_series.iloc[-1]
    
    # Bollinger Bands
    bb_mid = closes.rolling(window=20).mean().iloc[-1]
    bb_std = closes.rolling(window=20).std().iloc[-1]
    bb_upper = bb_mid + (bb_std * 2)
    bb_lower = bb_mid - (bb_std * 2)
    
    return ema8, ema21, rsi, bb_upper, bb_lower


def calcular_indicadores(df):
    """
    Calcula todos os indicadores em um DataFrame
    Adiciona colunas ao DataFrame original com tratamento de erro robusto
    """
    try:
        # Verificar se há dados suficientes
        if df is None or df.empty:
            print("⚠️ DataFrame vazio ou None")
            return df
        
        if len(df) < 50:  # Mínimo para indicadores confiáveis
            print(f"⚠️ Dados insuficientes ({len(df)} candles). Mínimo recomendado: 50")
            # Calcular apenas indicadores básicos
            return calcular_indicadores_basicos(df)
        
        # Verificar se as colunas necessárias existem
        required_cols = ['open', 'high', 'low', 'close', 'volume']
        missing_cols = [col for col in required_cols if col not in df.columns]
        if missing_cols:
            print(f"⚠️ Colunas faltando: {missing_cols}")
            return df
        
        # EMAs
        df['EMA8'] = df['close'].ewm(span=8, adjust=False).mean()
        df['EMA21'] = df['close'].ewm(span=21, adjust=False).mean()
        df['EMA50'] = df['close'].ewm(span=50, adjust=False).mean()
        df['EMA200'] = df['close'].ewm(span=200, adjust=False).mean()
        
        # SMAs
        df['SMA20'] = df['close'].rolling(window=20).mean()
        df['SMA50'] = df['close'].rolling(window=50).mean()
        df['SMA200'] = df['close'].rolling(window=200).mean()
        
        # RSI
        delta = df['close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        df['RSI'] = 100 - (100 / (1 + rs))
        
        # MACD
        exp1 = df['close'].ewm(span=12, adjust=False).mean()
        exp2 = df['close'].ewm(span=26, adjust=False).mean()
        df['MACD'] = exp1 - exp2
        df['MACD_Signal'] = df['MACD'].ewm(span=9, adjust=False).mean()
        df['MACD_Hist'] = df['MACD'] - df['MACD_Signal']
        
        # Bollinger Bands
        df['BB_Mid'] = df['close'].rolling(window=20).mean()
        bb_std = df['close'].rolling(window=20).std()
        df['BB_Upper'] = df['BB_Mid'] + (bb_std * 2)
        df['BB_Lower'] = df['BB_Mid'] - (bb_std * 2)
        df['BB_Width'] = df['BB_Upper'] - df['BB_Lower']
        
        # Stochastic
        low_14 = df['low'].rolling(window=14).min()
        high_14 = df['high'].rolling(window=14).max()
        df['Stoch_K'] = 100 * (df['close'] - low_14) / (high_14 - low_14)
        df['Stoch_D'] = df['Stoch_K'].rolling(window=3).mean()
        
        # ATR (Average True Range)
        df['TR'] = np.maximum(
            df['high'] - df['low'],
            np.maximum(
                abs(df['high'] - df['close'].shift(1)),
                abs(df['low'] - df['close'].shift(1))
            )
        )
        df['ATR'] = df['TR'].rolling(window=14).mean()
        
        # Volume MA
        df['Volume_MA'] = df['volume'].rolling(window=20).mean()
        
        print(f"✅ Indicadores calculados com sucesso para {len(df)} candles")
        return df
        
    except Exception as e:
        print(f"❌ Erro ao calcular indicadores: {e}")
        print("🔄 Tentando calcular indicadores básicos...")
        return calcular_indicadores_basicos(df)


def calcular_indicadores_basicos(df):
    """Calcula apenas indicadores essenciais quando há problemas"""
    try:
        if df is None or df.empty:
            return df
        
        # Apenas indicadores básicos
        df['EMA8'] = df['close'].ewm(span=8, adjust=False).mean()
        df['EMA21'] = df['close'].ewm(span=21, adjust=False).mean()
        
        # RSI básico
        delta = df['close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        df['RSI'] = 100 - (100 / (1 + rs))
        
        # Bollinger Bands básico
        df['BB_Mid'] = df['close'].rolling(window=20).mean()
        bb_std = df['close'].rolling(window=20).std()
        df['BB_Upper'] = df['BB_Mid'] + (bb_std * 2)
        df['BB_Lower'] = df['BB_Mid'] - (bb_std * 2)
        
        print("✅ Indicadores básicos calculados")
        return df
        
    except Exception as e:
        print(f"❌ Erro ao calcular indicadores básicos: {e}")
        return df


def detectar_padroes_candlestick(df):
    """
    Detecta padrões de candlestick básicos
    """
    padroes = []
    
    if len(df) < 3:
        return padroes
    
    # Última vela
    ultima = df.iloc[-1]
    penultima = df.iloc[-2]
    
    # Doji
    corpo = abs(ultima['close'] - ultima['open'])
    sombra_total = ultima['high'] - ultima['low']
    if corpo < sombra_total * 0.1:
        padroes.append('DOJI')
    
    # Martelo / Estrela Cadente
    sombra_inferior = min(ultima['open'], ultima['close']) - ultima['low']
    sombra_superior = ultima['high'] - max(ultima['open'], ultima['close'])
    
    if sombra_inferior > corpo * 2 and sombra_superior < corpo * 0.3:
        padroes.append('MARTELO')
    elif sombra_superior > corpo * 2 and sombra_inferior < corpo * 0.3:
        padroes.append('ESTRELA_CADENTE')
    
    # Engolfo
    if ultima['close'] > ultima['open'] and penultima['close'] < penultima['open']:
        if ultima['open'] <= penultima['close'] and ultima['close'] >= penultima['open']:
            padroes.append('ENGOLFO_ALTA')
    elif ultima['close'] < ultima['open'] and penultima['close'] > penultima['open']:
        if ultima['open'] >= penultima['close'] and ultima['close'] <= penultima['open']:
            padroes.append('ENGOLFO_BAIXA')
    
    return padroes

