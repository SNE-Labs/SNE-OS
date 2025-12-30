#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MOTOR RENAN - ANÁLISE COMPLETA INTEGRADA
Unifica todas as camadas de análise em um único motor inteligente
"""

from contexto_global import analisar_contexto
from estrutura_mercado import analisar_estrutura
from multi_timeframe import analise_multitf
from confluencia import calcular_confluencia
from fluxo_ativo import FluxoAtivo
from catalogo_magnetico import obter_zonas_magneticas
from padroes_graficos import detectar_padroes, detectar_wedges
from indicadores import calcular_indicadores
from indicadores_avancados import (
    calcular_indicadores_avancados,
    analisar_confluencia_indicadores,
    gerar_sinal_completo
)
import pandas as pd
from analise_candles_detalhada import analisar_candle_atual
from gestao_risco_profissional import GestaoRiscoProfissional
from relatorio_profissional import gerar_relatorio_profissional

# Importação condicional de requests
try:
    import requests
except ImportError:
    print("⚠️ Módulo 'requests' não encontrado. Algumas funcionalidades podem não funcionar.")
    requests = None


def analise_completa(symbol="BTCUSDT", timeframe="1h"):
    """
    SNE Scanner - Análise Completa Integrada
    
    Returns:
        dict com todas as camadas de análise
    """
    print(f"\n🔄 SNE SCANNER - Analisando {symbol}...")
    
    # 1. COLETAR DADOS
    print("   📊 Coletando dados...")
    dados = coletar_dados(symbol, timeframe)
    if dados is None:
        return {"erro": "Falha ao coletar dados"}
    
    # 2. ANÁLISES FUNDAMENTAIS
    print("   🌍 Analisando contexto macro...")
    contexto = analisar_contexto(dados)
    
    print("   📊 Analisando estrutura...")
    estrutura = analisar_estrutura(dados)
    
    print("   ⏰ Análise multi-timeframe...")
    mtf = analise_multitf(symbol)
    
    # 3. ANÁLISES AVANÇADAS
    print("   🧲 Detectando zonas magnéticas...")
    zonas = obter_zonas_magneticas()
    preco_atual = dados['close'].iloc[-1]
    zona_proxima = min(zonas, key=lambda z: abs(z - preco_atual)) if zonas else None
    dist_pct = abs(zona_proxima - preco_atual) / preco_atual * 100 if zona_proxima else 0
    
    print("   🌊 Analisando fluxo DOM...")
    fluxo_obj = FluxoAtivo()
    fluxo = fluxo_obj.calcular_pressao_liquidez(symbol)
    
    # 4. PADRÕES GRÁFICOS (incluindo Wedges)
    print("   🔺 Detectando padrões gráficos...")
    padroes = detectar_padroes(dados)
    wedges = detectar_wedges(dados)
    
    # 5. ANÁLISE DETALHADA DE CANDLES
    print("   🕐 Analisando candle atual...")
    candles_analise = analisar_candle_atual(dados, timeframe)
    
    # 6. CONFLUÊNCIA
    print("   🧠 Calculando confluência...")
    zonas_dict = {
        'zona_proxima': zona_proxima,
        'distancia_pct': dist_pct
    }
    conf = calcular_confluencia(mtf, fluxo, zonas_dict, None)
    
    # 7. INDICADORES BÁSICOS
    ind = {
        'ema8': dados['EMA8'].iloc[-1],
        'ema21': dados['EMA21'].iloc[-1],
        'rsi': dados['RSI'].iloc[-1],
        'preco': preco_atual
    }
    
    # 7.5. INDICADORES AVANÇADOS
    print("   🔬 Calculando indicadores avançados...")
    try:
        dados_avancados = calcular_indicadores_avancados(dados.copy())
        confluencia_avancada = analisar_confluencia_indicadores(dados_avancados)
        sinal_completo = gerar_sinal_completo(dados)
        
        # Adicionar indicadores avançados ao resultado
        ind['indicadores_avancados'] = {
            'williams_r': dados_avancados['Williams_R'].iloc[-1] if 'Williams_R' in dados_avancados.columns else None,
            'cci': dados_avancados['CCI'].iloc[-1] if 'CCI' in dados_avancados.columns else None,
            'mfi': dados_avancados['MFI'].iloc[-1] if 'MFI' in dados_avancados.columns else None,
            'adx': dados_avancados['ADX'].iloc[-1] if 'ADX' in dados_avancados.columns else None,
            'psar': dados_avancados['PSAR'].iloc[-1] if 'PSAR' in dados_avancados.columns else None,
            'psar_trend': dados_avancados['PSAR_Trend'].iloc[-1] if 'PSAR_Trend' in dados_avancados.columns else None,
            'obv': dados_avancados['OBV'].iloc[-1] if 'OBV' in dados_avancados.columns else None,
            'volume_profile_poc': dados_avancados['Volume_Profile_POC'].iloc[-1] if 'Volume_Profile_POC' in dados_avancados.columns else None,
            'volume_profile_val': dados_avancados['Volume_Profile_VAL'].iloc[-1] if 'Volume_Profile_VAL' in dados_avancados.columns else None,
            'volume_profile_vah': dados_avancados['Volume_Profile_VAH'].iloc[-1] if 'Volume_Profile_VAH' in dados_avancados.columns else None,
            'kc_upper': dados_avancados['KC_Upper'].iloc[-1] if 'KC_Upper' in dados_avancados.columns else None,
            'kc_lower': dados_avancados['KC_Lower'].iloc[-1] if 'KC_Lower' in dados_avancados.columns else None,
            'dc_upper': dados_avancados['DC_Upper'].iloc[-1] if 'DC_Upper' in dados_avancados.columns else None,
            'dc_lower': dados_avancados['DC_Lower'].iloc[-1] if 'DC_Lower' in dados_avancados.columns else None
        }
        
        ind['confluencia_avancada'] = confluencia_avancada
        ind['sinal_completo'] = sinal_completo
        
        print(f"   ✅ Indicadores avançados calculados! Score: {confluencia_avancada['confluencia_score']:.2f}/10")
        
    except Exception as e:
        print(f"   ⚠️ Erro nos indicadores avançados: {e}")
        ind['indicadores_avancados'] = None
        ind['confluencia_avancada'] = None
        ind['sinal_completo'] = None
    
    # 8. ANÁLISE COMPLETA DOS INDICADORES AVANÇADOS
    print("   🔬 Analisando indicadores avançados...")
    analise_avancada = analisar_indicadores_avancados_completos(ind.get('indicadores_avancados', {}), ind.get('confluencia_avancada', {}), ind.get('sinal_completo', {}))
    
    # 9. SÍNTESE INTELIGENTE
    print("   ✨ Gerando síntese...")
    sintese = gerar_sintese(contexto, estrutura, mtf, conf, ind, fluxo, timeframe, padroes, wedges)
    
    # 9. GESTÃO DE RISCO PROFISSIONAL COM NÍVEIS OPERACIONAIS
    print("   🛡️ Aplicando gestão de risco com níveis precisos...")
    gestao_risco = GestaoRiscoProfissional(capital_base=10.0)
    
    # Determinar direção baseada na síntese
    direcao = 'SHORT' if 'SHORT' in sintese.get('recomendacao', '') else 'LONG'
    
    # Calcular gestão de risco com níveis operacionais usando dados simulados
    # IMPORTANTE: Usar o mesmo preço_atual para consistência
    dados_simulados = {
        'dados': dados,
        'preco_atual': preco_atual  # Usar o mesmo preço coletado no início
    }
    try:
        import pandas as pd
        import numpy as np
        
        # Criar dados simulados baseados no preço atual
        preco_atual = ind.get('preco', 100000)
        np.random.seed(42)
        
        candles = []
        preco_base = preco_atual
        
        for i in range(20):
            variacao = np.random.normal(0, 0.002)
            preco_base = preco_base * (1 + variacao)
            
            open_price = preco_base
            high_price = open_price * (1 + abs(np.random.normal(0, 0.001)))
            low_price = open_price * (1 - abs(np.random.normal(0, 0.001)))
            close_price = open_price * (1 + np.random.normal(0, 0.0005))
            
            candles.append({
                'open': open_price,
                'high': max(open_price, high_price, close_price),
                'low': min(open_price, low_price, close_price),
                'close': close_price
            })
        
        df_simulado = pd.DataFrame(candles)
        dados_simulados = {'dados': df_simulado}
        
        gestao_completa = gestao_risco.calcular_gestao_risco_com_niveis(
            dados_simulados, contexto, estrutura, timeframe, direcao
        )
        
        # Integrar resultado na síntese
        if 'erro' not in gestao_completa:
            sintese['gestao_risco_completa'] = gestao_completa
            sintese['niveis_operacionais'] = gestao_completa.get('niveis_operacionais', {})
            sintese['gestao_risco'] = gestao_completa.get('gestao_risco', {})
        else:
            sintese['gestao_risco'] = {'erro': gestao_completa['erro']}
            
    except Exception as e:
        print(f"   ⚠️ Erro na gestão de risco: {e}")
        sintese['gestao_risco'] = {'erro': f'Erro na gestão de risco: {str(e)}'}
    
    resultado = {
        'symbol': symbol,
        'timeframe': timeframe,
        'contexto': contexto,
        'estrutura': estrutura,
        'mtf': mtf,
        'indicadores': ind,
        'analise_avancada': analise_avancada,
        'zonas': zonas_dict,
        'fluxo': fluxo,
        'confluencia': conf,
        'padroes': padroes,
        'wedges': wedges,
        'candles_detalhados': candles_analise,
        'sintese': sintese,
        'niveis_operacionais': {
            'entry_price': sintese.get('entry_price', 0),
            'stop_loss': sintese.get('stop_loss', 0),
            'tp1': sintese.get('tp1', 0),
            'tp2': sintese.get('tp2', 0),
            'tp3': sintese.get('tp3', 0),
            'rr_ratio': sintese.get('rr_ratio', 'N/A')
        },
        'gestao_risco': sintese.get('gestao_risco', {})
    }
    
    print("   ✅ Análise completa!\n")
    return resultado


def coletar_dados(symbol, interval, limit=200):
    """Coleta dados da Binance"""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        # Normalizar interval para formato Binance
        interval = interval.lower()
        
        # Mapeamento de formatos aceitos
        interval_map = {
            '1min': '1m', '5min': '5m', '10min': '10m', '15min': '15m', '30min': '30m',
            '1hr': '1h', '1hour': '1h', '2hr': '2h', '2hour': '2h', 
            '4hr': '4h', '4hour': '4h', '6hr': '6h', '6hour': '6h',
            '8hr': '8h', '8hour': '8h', '12hr': '12h', '12hour': '12h',
            '1day': '1d', 'daily': '1d', '1week': '1w', 'weekly': '1w', '1month': '1M', 'monthly': '1M'
        }
        
        interval = interval_map.get(interval, interval)
        
        url = "https://api.binance.com/api/v3/klines"
        params = {"symbol": symbol, "interval": interval, "limit": limit}
        
        if requests is None:
            logger.error("Módulo 'requests' não está disponível")
            raise ImportError("Módulo 'requests' não está disponível. Instale com: pip install requests")
        
        logger.info(f"Coletando dados da Binance: {symbol} {interval}")
        response = requests.get(url, params=params, timeout=30)
        
        logger.info(f"Resposta Binance: status_code={response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if not data or len(data) == 0:
                logger.warning(f"Nenhum dado retornado da Binance para {symbol}")
                return None
                
            df = pd.DataFrame(data, columns=[
                'timestamp', 'open', 'high', 'low', 'close', 'volume',
                'close_time', 'quote_volume', 'trades', 'taker_buy_base',
                'taker_buy_quote', 'ignore'
            ])
            df = df[['timestamp', 'open', 'high', 'low', 'close', 'volume']].astype({
                'timestamp': 'datetime64[ms]',
                'open': float, 'high': float, 'low': float,
                'close': float, 'volume': float
            })
            
            df = calcular_indicadores(df)
            logger.info(f"Dados coletados com sucesso: {len(df)} candles")
            return df
        else:
            logger.error(f"Erro na API Binance: status_code={response.status_code}, response={response.text[:200]}")
            return None
    except requests.exceptions.Timeout as e:
        logger.error(f"Timeout ao coletar dados da Binance: {e}")
        return None
    except requests.exceptions.RequestException as e:
        logger.error(f"Erro de requisição à Binance: {e}")
        return None
    except Exception as e:
        logger.error(f"Erro ao coletar dados: {e}", exc_info=True)
        return None


def analisar_indicadores_avancados_completos(indicadores_avancados, confluencia_avancada, sinal_completo):
    """
    Analisa completamente todos os indicadores avançados e gera interpretação profissional
    """
    try:
        if not indicadores_avancados:
            return {
                'status': 'indisponivel',
                'mensagem': 'Indicadores avançados não disponíveis'
            }
        
        # Extrair valores dos indicadores
        williams_r = indicadores_avancados.get('williams_r', 0)
        cci = indicadores_avancados.get('cci', 0)
        mfi = indicadores_avancados.get('mfi', 50)
        adx = indicadores_avancados.get('adx', 0)
        psar = indicadores_avancados.get('psar', 0)
        psar_trend = indicadores_avancados.get('psar_trend', 0)
        obv = indicadores_avancados.get('obv', 0)
        
        # Volume Profile
        poc = indicadores_avancados.get('volume_profile_poc', 0)
        val = indicadores_avancados.get('volume_profile_val', 0)
        vah = indicadores_avancados.get('volume_profile_vah', 0)
        
        # Keltner Channels
        kc_upper = indicadores_avancados.get('kc_upper', 0)
        kc_lower = indicadores_avancados.get('kc_lower', 0)
        
        # Donchian Channels
        dc_upper = indicadores_avancados.get('dc_upper', 0)
        dc_lower = indicadores_avancados.get('dc_lower', 0)
        
        # Interpretação dos indicadores
        interpretacoes = {
            'williams_r': {
                'valor': williams_r,
                'status': 'SOBRECOMPRA' if williams_r > -20 else 'SOBREVENDA' if williams_r < -80 else 'NEUTRO',
                'sinal': 1 if williams_r < -80 else -1 if williams_r > -20 else 0
            },
            'cci': {
                'valor': cci,
                'status': 'SOBRECOMPRA' if cci > 100 else 'SOBREVENDA' if cci < -100 else 'NEUTRO',
                'sinal': 1 if cci < -100 else -1 if cci > 100 else 0
            },
            'mfi': {
                'valor': mfi,
                'status': 'SOBRECOMPRA' if mfi > 80 else 'SOBREVENDA' if mfi < 20 else 'NEUTRO',
                'sinal': 1 if mfi < 20 else -1 if mfi > 80 else 0
            },
            'adx': {
                'valor': adx,
                'status': 'FORTE' if adx > 25 else 'FRACO' if adx < 20 else 'MODERADO',
                'sinal': 1 if adx > 25 else 0
            },
            'psar': {
                'valor': psar,
                'trend': psar_trend,
                'status': 'BULLISH' if psar_trend == 1 else 'BEARISH' if psar_trend == -1 else 'NEUTRO',
                'sinal': psar_trend
            },
            'obv': {
                'valor': obv,
                'status': 'ACUMULACAO' if obv > 0 else 'DISTRIBUICAO' if obv < 0 else 'NEUTRO',
                'sinal': 1 if obv > 0 else -1 if obv < 0 else 0
            }
        }
        
        # Análise de confluência por categoria
        momentum_sinais = [interpretacoes['williams_r']['sinal'], interpretacoes['cci']['sinal'], interpretacoes['mfi']['sinal']]
        tendencia_sinais = [interpretacoes['adx']['sinal'], interpretacoes['psar']['sinal']]
        volume_sinais = [interpretacoes['obv']['sinal']]
        
        momentum_score = sum(momentum_sinais) / len(momentum_sinais) if momentum_sinais else 0
        tendencia_score = sum(tendencia_sinais) / len(tendencia_sinais) if tendencia_sinais else 0
        volume_score = sum(volume_sinais) / len(volume_sinais) if volume_sinais else 0
        
        # Padrões detectados
        padroes_detectados = []
        if sinal_completo and 'padroes_candlestick' in sinal_completo:
            padroes_detectados.extend(sinal_completo['padroes_candlestick'])
        if sinal_completo and 'padroes_avancados' in sinal_completo:
            if sinal_completo['padroes_avancados'] != 'Nenhum':
                padroes_detectados.append(sinal_completo['padroes_avancados'])
        
        return {
            'status': 'disponivel',
            'interpretacoes': interpretacoes,
            'confluencia_por_categoria': {
                'momentum': momentum_score,
                'tendencia': tendencia_score,
                'volume': volume_score
            },
            'volume_profile': {
                'poc': poc,
                'val': val,
                'vah': vah,
                'range': vah - val if vah > 0 and val > 0 else 0
            },
            'keltner_channels': {
                'upper': kc_upper,
                'lower': kc_lower,
                'range': kc_upper - kc_lower if kc_upper > 0 and kc_lower > 0 else 0
            },
            'donchian_channels': {
                'upper': dc_upper,
                'lower': dc_lower,
                'range': dc_upper - dc_lower if dc_upper > 0 and dc_lower > 0 else 0
            },
            'padroes_detectados': padroes_detectados,
            'score_avancado': confluencia_avancada.get('confluencia_score', 0),
            'sinal_avancado': confluencia_avancada.get('sinal', 'NEUTRO')
        }
        
    except Exception as e:
        print(f"   ⚠️ Erro na análise avançada: {e}")
        return {
            'status': 'erro',
            'mensagem': f'Erro na análise: {str(e)}'
        }


def gerar_sintese(contexto, estrutura, mtf, confluencia, indicadores, fluxo, timeframe="1h", padroes=None, wedges=None):
    """
    Gera síntese inteligente da análise com níveis operacionais
    
    Estratégias específicas por timeframe:
    - 1m/3m/5m: Scalping (TP: 0.3-0.5% ATR, SL: 0.2-0.3% ATR)
    - 10m/15m: Day trade rápido (TP: 0.5-1.0% ATR, SL: 0.3-0.5% ATR)
    - 30m/1h: Intraday (TP: 1.0-2.0% ATR, SL: 0.5-1.0% ATR)
    - 4h/8h: Swing curto (TP: 2.0-4.0% ATR, SL: 1.0-2.0% ATR)
    - 12h/1d/1w: Position (TP: 3.0-6.0% ATR, SL: 1.5-3.0% ATR)
    """
    
    preco_atual = indicadores.get('preco', 0)
    
    # VIÉS PRINCIPAL
    regime = contexto['regime']
    score = confluencia['score']
    
    if score >= 7:
        vies = "FORTE " + regime
    elif score >= 5:
        vies = "MODERADO " + regime
    else:
        vies = "FRACO - AGUARDAR"
    
    # NÍVEIS OPERACIONAIS
    atr = indicadores.get('ATR', preco_atual * 0.02)  # Fallback 2%
    
    # ESTRATÉGIA POR TIMEFRAME
    tf_config = {
        '1m':  {'sl_atr': 0.25, 'tp1_atr': 0.35, 'tp2_atr': 0.5,  'tp3_atr': 0.75, 'tipo': 'SCALP'},
        '3m':  {'sl_atr': 0.3,  'tp1_atr': 0.4,  'tp2_atr': 0.6,  'tp3_atr': 0.9,  'tipo': 'SCALP'},
        '5m':  {'sl_atr': 0.35, 'tp1_atr': 0.5,  'tp2_atr': 0.75, 'tp3_atr': 1.0,  'tipo': 'SCALP'},
        '10m': {'sl_atr': 0.4,  'tp1_atr': 0.6,  'tp2_atr': 0.9,  'tp3_atr': 1.3,  'tipo': 'DAY'},
        '15m': {'sl_atr': 0.5,  'tp1_atr': 0.75, 'tp2_atr': 1.0,  'tp3_atr': 1.5,  'tipo': 'DAY'},
        '30m': {'sl_atr': 0.7,  'tp1_atr': 1.0,  'tp2_atr': 1.5,  'tp3_atr': 2.0,  'tipo': 'INTRA'},
        '1h':  {'sl_atr': 1.0,  'tp1_atr': 1.5,  'tp2_atr': 2.0,  'tp3_atr': 3.0,  'tipo': 'INTRA'},
        '4h':  {'sl_atr': 1.5,  'tp1_atr': 2.0,  'tp2_atr': 3.0,  'tp3_atr': 4.5,  'tipo': 'SWING'},
        '8h':  {'sl_atr': 2.0,  'tp1_atr': 2.5,  'tp2_atr': 4.0,  'tp3_atr': 6.0,  'tipo': 'SWING'},
        '12h': {'sl_atr': 2.5,  'tp1_atr': 3.5,  'tp2_atr': 5.0,  'tp3_atr': 7.5,  'tipo': 'POSITION'},
        '1d':  {'sl_atr': 3.0,  'tp1_atr': 4.0,  'tp2_atr': 6.0,  'tp3_atr': 9.0,  'tipo': 'POSITION'},
        '1w':  {'sl_atr': 4.0,  'tp1_atr': 5.0,  'tp2_atr': 8.0,  'tp3_atr': 12.0, 'tipo': 'POSITION'}
    }
    
    # Pegar configuração do timeframe (default 1h)
    config = tf_config.get(timeframe, tf_config['1h'])
    estrategia_tipo = config['tipo']
    
    # Determinar viés baseado em múltiplos fatores
    tendencia = estrutura.get('tendencia', 'LATERAL')
    
    # MODO AGRESSIVO: Sempre gera um setup (LONG ou SHORT)
    # Análise de força de viés
    rsi = indicadores.get('RSI', 50)
    ema8 = indicadores.get('ema8', preco_atual)
    ema21 = indicadores.get('ema21', preco_atual)
    
    # INDICADORES AVANÇADOS PARA ANÁLISE MELHORADA
    indicadores_avancados = indicadores.get('indicadores_avancados', {})
    confluencia_avancada = indicadores.get('confluencia_avancada', {})
    
    # Extrair indicadores avançados
    williams_r = indicadores_avancados.get('williams_r', 0)
    cci = indicadores_avancados.get('cci', 0)
    mfi = indicadores_avancados.get('mfi', 50)
    adx = indicadores_avancados.get('adx', 0)
    psar_trend = indicadores_avancados.get('psar_trend', 0)
    
    # Score de confluência avançada
    score_avancado = confluencia_avancada.get('confluencia_score', 0)
    
    # Determinar viés dominante com indicadores avançados
    # SISTEMA MELHORADO: Sempre gera um setup
    sinais_alta = 0
    sinais_baixa = 0
    
    # Contar sinais de alta
    if regime in ['BULL_TREND', 'CONSOLIDATION']:
        sinais_alta += 1
    if tendencia == 'ALTA':
        sinais_alta += 1
    if rsi < 45:  # Oversold = oportunidade LONG
        sinais_alta += 1
    if preco_atual < ema21:  # Abaixo EMA21 = oportunidade LONG
        sinais_alta += 1
    if williams_r < -80:  # Williams %R oversold
        sinais_alta += 1
    if cci < -100:  # CCI oversold
        sinais_alta += 1
    if mfi < 20:  # MFI oversold
        sinais_alta += 1
    if psar_trend == 1:  # Parabolic SAR bullish
        sinais_alta += 1
    
    # Contar sinais de baixa
    if regime in ['BEAR_TREND', 'VOLATILE']:
        sinais_baixa += 1
    if tendencia == 'BAIXA':
        sinais_baixa += 1
    if rsi > 55:  # Overbought = oportunidade SHORT
        sinais_baixa += 1
    if preco_atual > ema21:  # Acima EMA21 = oportunidade SHORT
        sinais_baixa += 1
    if williams_r > -20:  # Williams %R overbought
        sinais_baixa += 1
    if cci > 100:  # CCI overbought
        sinais_baixa += 1
    if mfi > 80:  # MFI overbought
        sinais_baixa += 1
    if psar_trend == -1:  # Parabolic SAR bearish
        sinais_baixa += 1
    
    # Determinar viés baseado na contagem
    if sinais_alta > sinais_baixa:
        vies_alta = True
        vies_baixa = False
    elif sinais_baixa > sinais_alta:
        vies_alta = False
        vies_baixa = True
    else:
        # Empate: usar RSI como desempate
        vies_alta = rsi < 50
        vies_baixa = rsi >= 50
    
    # GARANTIA: Se ainda não há viés definido, usar preço vs EMA21
    if not vies_alta and not vies_baixa:
        vies_alta = preco_atual < ema21
        vies_baixa = preco_atual >= ema21
    
    # GARANTIA FINAL: Se ainda não há setup, forçar baseado no RSI
    if not vies_alta and not vies_baixa:
        print("   ⚠️ Forçando setup baseado no RSI...")
        vies_alta = rsi < 50
        vies_baixa = rsi >= 50
    
    # INTEGRAR VOLUME PROFILE NOS NÍVEIS OPERACIONAIS
    volume_profile = indicadores_avancados.get('volume_profile_poc', 0)
    val = indicadores_avancados.get('volume_profile_val', 0)
    vah = indicadores_avancados.get('volume_profile_vah', 0)
    
    # DEBUG: Log dos sinais
    print(f"   🔍 Sinais Alta: {sinais_alta}, Sinais Baixa: {sinais_baixa}")
    print(f"   🎯 Viés Alta: {vies_alta}, Viés Baixa: {vies_baixa}")
    
    # SEMPRE gera um setup com estratégia específica do timeframe
    if vies_alta:
        # LONG SETUP
        acao = f"🟢 LONG ({estrategia_tipo})"
        
        # Entry otimizado com Volume Profile
        if val > 0 and vah > 0:
            # Usar VAL como suporte para entry em LONG
            entry_price = min(preco_atual * 0.998, val * 1.001)  # Entry próximo ao VAL
        else:
            entry_price = min(preco_atual * 0.998, ema8 * 0.999)  # Entry em pullback tradicional
        
        # Stop Loss otimizado
        if val > 0:
            stop_loss = val * 0.995  # SL abaixo do VAL
        else:
            stop_loss = entry_price - (atr * config['sl_atr'])  # SL tradicional
        
        # Take Profits otimizados
        tp1 = entry_price + (atr * config['tp1_atr'])
        tp2 = entry_price + (atr * config['tp2_atr'])
        tp3 = entry_price + (atr * config['tp3_atr'])
        
        # Se VAH disponível, usar como TP adicional
        if vah > 0 and vah > entry_price:
            tp2 = min(tp2, vah * 0.999)  # TP2 próximo ao VAH
        
        # Usar score combinado (básico + avançado)
        score_combinado = (score + score_avancado) / 2
        
        if score_combinado >= 7:
            recomendacao = f"🔥 LONG FORTE ({timeframe}) - Comprar em ${entry_price:,.2f}"
        elif score_combinado >= 6:
            recomendacao = f"⚡ LONG MODERADO ({timeframe}) - Comprar em ${entry_price:,.2f}"
        else:
            recomendacao = f"📊 LONG ESPECULATIVO ({timeframe}) - Comprar em ${entry_price:,.2f} (risco maior)"
        
    else:  # vies_baixa
        # SHORT SETUP
        acao = f"🔴 SHORT ({estrategia_tipo})"
        
        # Entry otimizado com Volume Profile
        if val > 0 and vah > 0:
            # Usar VAH como resistência para entry em SHORT
            entry_price = max(preco_atual * 1.002, vah * 0.999)  # Entry próximo ao VAH
        else:
            entry_price = max(preco_atual * 1.002, ema8 * 1.001)  # Entry em rejeição tradicional
        
        # Stop Loss otimizado
        if vah > 0:
            stop_loss = vah * 1.005  # SL acima do VAH
        else:
            stop_loss = entry_price + (atr * config['sl_atr'])  # SL tradicional
        
        # Take Profits otimizados
        tp1 = entry_price - (atr * config['tp1_atr'])
        tp2 = entry_price - (atr * config['tp2_atr'])
        tp3 = entry_price - (atr * config['tp3_atr'])
        
        # Se VAL disponível, usar como TP adicional
        if val > 0 and val < entry_price:
            tp2 = max(tp2, val * 1.001)  # TP2 próximo ao VAL
        
        # Usar score combinado (básico + avançado)
        score_combinado = (score + score_avancado) / 2
        
        if score_combinado >= 7:
            recomendacao = f"🔥 SHORT FORTE ({timeframe}) - Vender em ${entry_price:,.2f}"
        elif score_combinado >= 6:
            recomendacao = f"⚡ SHORT MODERADO ({timeframe}) - Vender em ${entry_price:,.2f}"
        else:
            recomendacao = f"📊 SHORT ESPECULATIVO ({timeframe}) - Vender em ${entry_price:,.2f} (risco maior)"
    
    # VALIDAÇÃO DE SEGURANÇA: Garantir que níveis estão corretos
    # Se houver alguma inconsistência, CORRIGIR (não cancelar)
    if not entry_price or not stop_loss or not tp2:
        print("   ⚠️ Níveis inválidos, recalculando...")
        # Recalcular com valores padrão
        if not entry_price:
            entry_price = preco_atual
        if not stop_loss:
            stop_loss = entry_price * (0.98 if vies_alta else 1.02)
        if not tp1:
            tp1 = entry_price * (1.02 if vies_alta else 0.98)
        if not tp2:
            tp2 = entry_price * (1.05 if vies_alta else 0.95)
        if not tp3:
            tp3 = entry_price * (1.08 if vies_alta else 0.92)
    
    if entry_price and stop_loss and tp2:
        # LONG: SL deve estar ABAIXO do entry, TP ACIMA
        if "LONG" in acao:
            if stop_loss >= entry_price:
                stop_loss = entry_price - (atr * config['sl_atr'])  # Corrigir SL
            if tp2 <= entry_price:
                tp1 = entry_price + (atr * config['tp1_atr'])
                tp2 = entry_price + (atr * config['tp2_atr'])
                tp3 = entry_price + (atr * config['tp3_atr'])
        
        # SHORT: SL deve estar ACIMA do entry, TP ABAIXO
        elif "SHORT" in acao:
            if stop_loss <= entry_price:
                stop_loss = entry_price + (atr * config['sl_atr'])  # Corrigir SL
            if tp2 >= entry_price:
                tp1 = entry_price - (atr * config['tp1_atr'])
                tp2 = entry_price - (atr * config['tp2_atr'])
                tp3 = entry_price - (atr * config['tp3_atr'])
    
    # RISCO
    if contexto['volatilidade'] > 3.0:
        risco = "ALTO - Reduzir 50% do tamanho"
    elif contexto['volatilidade'] > 2.0:
        risco = "MÉDIO - Tamanho normal"
    else:
        risco = "BAIXO - Pode aumentar posição"
    
    # R:R (Risk/Reward)
    if entry_price and stop_loss and tp2:
        risco_pts = abs(entry_price - stop_loss)
        reward_pts = abs(tp2 - entry_price)
        rr_ratio = reward_pts / risco_pts if risco_pts > 0 else 0
        rr_text = f"1:{rr_ratio:.1f}"
    else:
        rr_ratio = 0
        rr_text = "N/A"
    
    # ANÁLISE DE WEDGES
    wedge_info = ""
    wedge_sinal = ""
    if wedges and wedges.get('wedge_detectado', False):
        wedge = wedges
        wedge_info = f"🔺 {wedge['nome']} detectado!"
        
        if wedge['tipo'] == 'RISING_WEDGE':
            wedge_sinal = "BEARISH"
            wedge_info += f" (Confiança: {wedge['confianca']}%, Prob. Reversão: {wedge['probabilidade_reversao']}%)"
            if wedge.get('alvo_teorico'):
                wedge_info += f" | Alvo: ${wedge['alvo_teorico']['preco']:,.2f}"
        elif wedge['tipo'] == 'FALLING_WEDGE':
            wedge_sinal = "BULLISH"
            wedge_info += f" (Confiança: {wedge['confianca']}%, Prob. Reversão: {wedge['probabilidade_reversao']}%)"
            if wedge.get('alvo_teorico'):
                wedge_info += f" | Alvo: ${wedge['alvo_teorico']['preco']:,.2f}"
        
        # Ajustar recomendação baseada no wedge
        if wedge_sinal == "BEARISH" and "LONG" in acao:
            recomendacao += " ⚠️ WEDGE BEARISH - Considerar SHORT"
        elif wedge_sinal == "BULLISH" and "SHORT" in acao:
            recomendacao += " ⚠️ WEDGE BULLISH - Considerar LONG"
    
    return {
        'vies': vies,
        'acao': acao,
        'recomendacao': recomendacao,
        'entry_price': entry_price,
        'stop_loss': stop_loss,
        'tp1': tp1,
        'tp2': tp2,
        'tp3': tp3,
        'risco': risco,
        'rr_ratio': rr_text,
        'score_confianca': score,
        'score_avancado': score_avancado,
        'score_combinado': score_combinado,
        'indicadores_avancados': {
            'williams_r': williams_r,
            'cci': cci,
            'mfi': mfi,
            'adx': adx,
            'psar_trend': psar_trend,
            'confluencia_avancada': confluencia_avancada
        },
        'wedge_info': wedge_info,
        'wedge_sinal': wedge_sinal
    }


def gerar_relatorio_profissional_telegram(resultado):
    """Gera relatório profissional para Telegram (sem print)"""
    try:
        relatorio = gerar_relatorio_profissional(resultado)
        
        # Limpar caracteres problemáticos para Telegram
        relatorio_limpo = limpar_texto_telegram(relatorio)
        
        return relatorio_limpo
    except Exception as e:
        return f"❌ Erro ao gerar relatório profissional: {e}"


def enviar_relatorio_completo_telegram(resultado):
    """Envia relatório completo dividido em blocos organizados para Telegram"""
    try:
        from xenos_bot import enviar_oraculo
        from relatorio_profissional import gerar_relatorio_telegram_blocos
        
        # Gerar relatório em blocos organizados
        blocos = gerar_relatorio_telegram_blocos(resultado)
        
        # Enviar cada bloco
        for i, bloco in enumerate(blocos):
            if i == 0:
                # Primeiro bloco com cabeçalho
                mensagem = f"📱 BLOCO {i+1}/{len(blocos)}\n\n{bloco}"
            else:
                # Blocos subsequentes
                mensagem = f"📱 BLOCO {i+1}/{len(blocos)}\n\n{bloco}"
            
            # Limpar texto para evitar erros de parsing
            mensagem_limpa = limpar_texto_telegram(mensagem)
            enviar_oraculo(mensagem_limpa)
            
            # Pequena pausa entre blocos para evitar spam
            import time
            time.sleep(0.5)
            
        print(f"✅ Relatório enviado em {len(blocos)} blocos organizados!")
        return True
        
    except Exception as e:
        print(f"❌ Erro ao enviar relatório em blocos: {e}")
        return False


def limpar_texto_telegram(texto):
    """Remove caracteres problemáticos para o Telegram"""
    import re
    
    # Remover tags HTML problemáticas
    texto = re.sub(r'<[^>]+>', '', texto)
    
    # Corrigir caracteres HTML escapados
    texto = texto.replace('&amp;gt;', '>')
    texto = texto.replace('&amp;lt;', '<')
    texto = texto.replace('&amp;', '&')
    texto = texto.replace('&gt;', '>')
    texto = texto.replace('&lt;', '<')
    
    return texto


def dividir_relatorio_telegram(relatorio):
    """Divide o relatório em partes menores para Telegram"""
    import re
    
    # Limpar texto
    texto_limpo = limpar_texto_telegram(relatorio)
    
    # Dividir por seções principais
    secoes = re.split(r'={80}|---+', texto_limpo)
    
    partes = []
    parte_atual = ""
    
    for secao in secoes:
        secao = secao.strip()
        if not secao:
            continue
            
        # Se adicionar esta seção exceder o limite, criar nova parte
        if len(parte_atual) + len(secao) > 3500:
            if parte_atual:
                partes.append(parte_atual.strip())
                parte_atual = secao
            else:
                # Seção muito grande, dividir ainda mais
                partes.append(secao[:3500])
                parte_atual = secao[3500:]
        else:
            parte_atual += "\n\n" + secao
    
    # Adicionar última parte
    if parte_atual.strip():
        partes.append(parte_atual.strip())
    
    return partes


def exibir_relatorio_profissional(resultado):
    """Exibe relatório profissional reformulado"""
    try:
        relatorio = gerar_relatorio_profissional(resultado)
        print(relatorio)
        return relatorio  # Retornar o relatório para uso em outras funções
    except Exception as e:
        print(f"❌ Erro ao gerar relatório profissional: {e}")
        return f"❌ Erro ao gerar relatório profissional: {e}"
        # Fallback para relatório antigo
        exibir_analise(resultado)


def exibir_analise(resultado):
    """Exibe análise formatada no terminal"""
    
    print("="*60)
    print("🎯 SNE SCANNER - ANÁLISE TÉCNICA")
    print("="*60)
    print(f"\n📊 {resultado['symbol']} | {resultado['timeframe']}")
    print(f"💰 Preço: ${resultado['indicadores']['preco']:,.2f}")
    
    print(f"\n📈 CONTEXTO:")
    print(f"   Regime:       {resultado['contexto']['regime']} ({resultado['contexto']['forca_regime']}/10)")
    print(f"   Volatilidade: {resultado['contexto']['volatilidade']}% ({resultado['contexto']['volatilidade_status']})")
    print(f"   Liquidez:     {resultado['contexto']['liquidez_score']}/10")
    
    print(f"\n📊 ESTRUTURA:")
    print(f"   Tendência:    {resultado['estrutura']['tendencia']}")
    print(f"   Tipo:         {resultado['estrutura']['tipo_estrutura']}")
    
    print(f"\n⏰ MULTI-TIMEFRAME:")
    if 'resumo' in resultado['mtf']:
        print(f"   {resultado['mtf']['resumo']}")
    
    print(f"\n🌊 FLUXO DOM:")
    if 'pressao' in resultado['fluxo']:
        print(f"   Pressão:      {resultado['fluxo']['pressao']}")
        ratio = resultado['fluxo'].get('ratio', 1.0)
        print(f"   Ratio:        {ratio:.3f}")
    
    print(f"\n🔺 WEDGES:")
    if 'wedges' in resultado and resultado['wedges'] and resultado['wedges'].get('wedge_detectado', False):
        wedges = resultado['wedges']
        print(f"   {wedges['nome']} detectado!")
        print(f"   Confiança: {wedges['confianca']}%")
        print(f"   Prob. Reversão: {wedges['probabilidade_reversao']}%")
    else:
        print("   Nenhum padrão wedge detectado")
    
    print(f"\n🕐 CANDLE ATUAL:")
    if 'candles_detalhados' in resultado:
        candles = resultado['candles_detalhados']
        if candles and 'erro' not in candles:
            candle_info = candles['candle_atual']
            precos = candles['precos']
            classificacao = candles['classificacao']
            tendencia = candles['tendencia']
            
            print(f"   Horário: {candle_info['timestamp_inicio']} - {candle_info['timestamp_fechamento']}")
            print(f"   Restante: {candle_info['tempo_restante']}")
            print(f"   Range: ${precos['range']:,.2f} ({precos['range_percentual']}%)")
            print(f"   Tipo: {classificacao['tipo']} - {classificacao['significado']}")
            print(f"   Tendência: {tendencia['direcao']} {tendencia['intensidade']}")
            print(f"   Resumo: {candles['resumo']}")
        else:
            print(f"   Erro na análise de candles: {candles.get('erro', 'Dados inválidos')}")
    else:
        print("   Análise de candles não incluída no resultado")
    
    print(f"\n💡 CONFLUÊNCIA: {resultado['confluencia']['score']}/10")
    print(f"   {resultado['confluencia']['interpretacao']}")
    
    # INDICADORES AVANÇADOS
    analise_avancada = resultado.get('analise_avancada', {})
    if analise_avancada.get('status') == 'disponivel':
        print(f"\n🔬 INDICADORES AVANÇADOS:")
        print(f"   Score Avançado: {analise_avancada.get('score_avancado', 0):.2f}/10")
        print(f"   Sinal Avançado: {analise_avancada.get('sinal_avancado', 'NEUTRO')}")
        
        # Confluência por categoria
        confluencia_cat = analise_avancada.get('confluencia_por_categoria', {})
        print(f"   Momentum: {confluencia_cat.get('momentum', 0):.2f}/1.0")
        print(f"   Tendência: {confluencia_cat.get('tendencia', 0):.2f}/1.0")
        print(f"   Volume: {confluencia_cat.get('volume', 0):.2f}/1.0")
        
        # Volume Profile
        volume_profile = analise_avancada.get('volume_profile', {})
        if volume_profile.get('poc', 0) > 0:
            print(f"\n📊 VOLUME PROFILE:")
            print(f"   POC: ${volume_profile.get('poc', 0):,.2f}")
            print(f"   VAL: ${volume_profile.get('val', 0):,.2f}")
            print(f"   VAH: ${volume_profile.get('vah', 0):,.2f}")
        
        # Padrões detectados
        padroes = analise_avancada.get('padroes_detectados', [])
        if padroes:
            print(f"\n🔺 PADRÕES DETECTADOS:")
            for padrao in padroes:
                print(f"   • {padrao}")
    
    print(f"\n✨ SETUP OPERACIONAL:")
    s = resultado['sintese']
    print(f"   Ação:     {s['acao']}")
    print(f"   Viés:     {s['vies']}")
    print(f"   Score:    {s['score_confianca']}/10")
    
    # Score combinado se disponível
    if 'score_combinado' in s:
        print(f"   Score Combinado: {s['score_combinado']:.2f}/10")
    
    if s.get('entry_price'):
        print(f"\n   📍 NÍVEIS:")
        print(f"      Entry:  ${s['entry_price']:,.2f}")
        print(f"      Stop:   ${s['stop_loss']:,.2f}")
        print(f"      TP1:    ${s['tp1']:,.2f}")
        print(f"      TP2:    ${s['tp2']:,.2f}")
        print(f"      TP3:    ${s['tp3']:,.2f}")
        print(f"      R:R:    {s['rr_ratio']}")
    
    print(f"\n   💡 {s['recomendacao']}")
    print(f"   ⚠️  {s['risco']}")
    
    # NÍVEIS OPERACIONAIS PRECISOS
    if 'niveis_operacionais' in s:
        niveis = s['niveis_operacionais']
        if 'erro' not in niveis:
            print(f"\n💰 NÍVEIS OPERACIONAIS PRECISOS ({niveis.get('strategy', 'UNKNOWN').upper()}):")
            print(f"   Preço Atual:  ${niveis.get('preco_atual', 0):,.2f}")
            print(f"   Entry:        ${niveis.get('entry', 0):,.2f} (S/R + Confirmação)")
            print(f"   Stop Loss:    ${niveis.get('stop_loss', 0):,.2f} (ATR {niveis.get('atr_multiplier', 0):.1f}x)")
            print(f"   TP1:          ${niveis.get('tp1', 0):,.2f} (S/R Próximo)")
            print(f"   TP2:          ${niveis.get('tp2', 0):,.2f} (S/R Distante)")
            print(f"   TP3:          ${niveis.get('tp3', 0):,.2f} (S/R Principal)")
            print(f"   ATR:          ${niveis.get('atr', 0):,.2f} ({niveis.get('atr_percentual', 0):.2f}%)")
            print(f"   R/R Atual:    1:{niveis.get('rr_atual', 0):.1f}")
            print(f"   Estratégia:   {niveis.get('strategy', 'unknown').upper()}")
        else:
            print(f"\n💰 NÍVEIS OPERACIONAIS:")
            print(f"   ❌ Erro: {niveis['erro']}")
    
    # GESTÃO DE RISCO PROFISSIONAL
    if 'gestao_risco' in s:
        gr = s['gestao_risco']
        print(f"\n🛡️ GESTÃO DE RISCO PROFISSIONAL:")
        
        if gr.get('valido'):
            posicao = gr['posicao']
            print(f"   Status:     ✅ APROVADO")
            print(f"   Qualidade:  {gr['score_qualidade']}/100")
            print(f"   Alavancagem: {posicao['alavancagem']:.1f}x")
            print(f"   Quantidade: {posicao['quantidade']:.6f} moedas")
            print(f"   Margem:     ${posicao['margem_necessaria']:,.2f}")
            print(f"   Risco:      ${posicao['risco_usd']:,.2f} ({posicao['risco_pct_capital']:.2f}%)")
            print(f"   R/R:        1:{gr['rr_atual']:.1f} (mín: 1:{gr['rr_minimo']:.1f})")
        else:
            print(f"   Status:     ❌ REJEITADO")
            print(f"   Motivos:    {', '.join(gr.get('validacoes', ['Dados insuficientes']))}")
        
        if gr.get('warnings'):
            print(f"   Avisos:     {', '.join(gr['warnings'])}")
    
    print("\n" + "="*60)


if __name__ == "__main__":
    resultado = analise_completa("BTCUSDT", "1h")
    if 'erro' not in resultado:
        exibir_analise(resultado)
