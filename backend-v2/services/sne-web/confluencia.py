#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CONFLUÊNCIA
Calcula score de confluência entre camadas
"""


def calcular_confluencia(mtf, fluxo, zonas, sentiment):
    """
    Calcula score de confluência (0-10)

    Args:
        mtf: Análise multi-timeframe
        fluxo: Análise de fluxo
        zonas: Zonas magnéticas
        sentiment: Sentimento

    Returns:
        dict com score e detalhes
    """

    # DEBUG: Log para identificar o problema
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"DEBUG calcular_confluencia: mtf type={type(mtf)}")
    if isinstance(mtf, dict) and 'confluencia' in mtf:
        logger.info(f"DEBUG mtf['confluencia'] type={type(mtf['confluencia'])} value={mtf['confluencia']}")

    score = 0
    validacoes = []
    
    # 1. Multi-Timeframe (peso 3)
    if isinstance(mtf, dict) and 'confluencia' in mtf:
        conf = mtf.get('confluencia', 0)

        if isinstance(conf, dict):
            mtf_score = conf.get('score', 0)
        elif isinstance(conf, (int, float)):
            mtf_score = conf
        else:
            mtf_score = 0

        score += (mtf_score / 10) * 3
        validacoes.append({
            'camada': 'Multi-Timeframe',
            'contribuicao': (mtf_score / 10) * 3,
            'status': '✅' if mtf_score >= 7 else '⚠️'
        })
    
    # 2. Fluxo DOM (peso 2.5)
    if fluxo and 'pressao' in fluxo:
        if fluxo['pressao'] in ['COMPRA', 'VENDA']:
            score += 2.5
            validacoes.append({'camada': 'Fluxo DOM', 'contribuicao': 2.5, 'status': '✅'})
        else:
            score += 1
            validacoes.append({'camada': 'Fluxo DOM', 'contribuicao': 1, 'status': '⚠️'})
    
    # 3. Zonas Magnéticas (peso 2)
    if zonas and 'zona_proxima' in zonas:
        # Verificar se distancia_pct existe antes de acessá-la
        distancia_pct = zonas.get('distancia_pct', None)
        if distancia_pct is not None and distancia_pct < 1:
            score += 2
            validacoes.append({'camada': 'Zonas Magnéticas', 'contribuicao': 2, 'status': '✅'})
        else:
            score += 0.5
            validacoes.append({'camada': 'Zonas Magnéticas', 'contribuicao': 0.5, 'status': '⚠️'})
    
    # 4. Sentiment (peso 1.5)
    if sentiment and 'fear_greed' in sentiment:
        fg_valor = sentiment['fear_greed'].get('valor', 50)
        if 40 <= fg_valor <= 80:  # Sweet spot
            score += 1.5
            validacoes.append({'camada': 'Sentiment', 'contribuicao': 1.5, 'status': '✅'})
        else:
            score += 0.5
            validacoes.append({'camada': 'Sentiment', 'contribuicao': 0.5, 'status': '⚠️'})
    
    # 5. Volume (peso 1)
    score += 1  # Base
    validacoes.append({'camada': 'Volume', 'contribuicao': 1, 'status': '✅'})
    
    return {
        'score': round(min(10, score), 1),
        'validacoes': validacoes,
        'interpretacao': interpretar_confluencia(score)
    }


def interpretar_confluencia(score):
    """Interpreta o score de confluência"""
    if score >= 8:
        return "Excelente - Alta confluência"
    elif score >= 6:
        return "Boa - Confluência satisfatória"
    elif score >= 4:
        return "Moderada - Confirmação parcial"
    else:
        return "Fraca - Baixa confluência"





