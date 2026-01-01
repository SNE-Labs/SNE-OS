"""
Motor de Análise SNE - Adaptado para Cloud Run
Wrapper para motor_renan.py com adaptações para ambiente cloud
"""

import sys
import os
import logging
import json
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime, date

# Adicionar diretório raiz ao path para importar módulos do SNE
ROOT_DIR = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(ROOT_DIR))

logger = logging.getLogger(__name__)

def make_json_serializable(obj):
    """
    Converte objetos não serializáveis para tipos JSON válidos
    """
    if isinstance(obj, (np.integer, np.int64, np.int32)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float64, np.float32)):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, pd.DataFrame):
        return obj.to_dict(orient='records')
    elif isinstance(obj, pd.Series):
        return obj.to_dict()
    elif isinstance(obj, (datetime, date)):
        return obj.isoformat()
    elif isinstance(obj, bool):
        return bool(obj)  # Garantir que é bool Python nativo
    elif isinstance(obj, dict):
        return {key: make_json_serializable(value) for key, value in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [make_json_serializable(item) for item in obj]
    elif pd.isna(obj):
        return None
    else:
        # Tentar converter para string se não for um tipo básico
        try:
            json.dumps(obj)
            return obj
        except (TypeError, ValueError):
            return str(obj)

def analisar_par(symbol: str = "BTCUSDT", timeframe: str = "1h") -> dict:
    """
    Analisa um par de trading usando o motor SNE completo
    
    Args:
        symbol: Par de trading (ex: BTCUSDT)
        timeframe: Timeframe (ex: 1h, 15m)
    
    Returns:
        dict: Resultado da análise completa
    """
    try:
        # Importar motor_renan
        from motor_renan import analise_completa
        
        logger.info(f"Analisando {symbol} no timeframe {timeframe}")
        
        # Executar análise completa
        resultado = analise_completa(symbol, timeframe)
        
        # Verificar se houve erro
        if 'erro' in resultado:
            logger.error(f"Erro na análise: {resultado['erro']}")
            return {
                'status': 'error',
                'error': resultado['erro'],
                'symbol': symbol,
                'timeframe': timeframe
            }
        
        # Extrair informações principais para resposta simplificada
        sintese = resultado.get('sintese', {})
        confluencia = resultado.get('confluencia', {})
        niveis = resultado.get('niveis_operacionais', {})
        
        # Formatar resposta para API (convertendo valores não serializáveis)
        response = {
            'status': 'ok',
            'symbol': symbol,
            'timeframe': timeframe,
            'analysis': {
                'confluence_score': make_json_serializable(confluencia.get('score', 0)),
                'bias': sintese.get('bias', 'NEUTRAL'),
                'recommendation': sintese.get('recomendacao', 'HOLD'),
                'entry': make_json_serializable(niveis.get('entry_price', 0)),
                'stop_loss': make_json_serializable(niveis.get('stop_loss', 0)),
                'take_profit': make_json_serializable(niveis.get('tp1', 0)),
                'rr_ratio': make_json_serializable(niveis.get('rr_ratio', 'N/A'))
            }
        }
        
        # Incluir análise completa (convertendo valores não serializáveis)
        # Limitar profundidade para evitar respostas muito grandes
        try:
            response['full_analysis'] = make_json_serializable(resultado)
        except Exception as e:
            logger.warning(f"Erro ao serializar análise completa: {e}")
            response['full_analysis'] = {
                'sintese': make_json_serializable(sintese),
                'confluencia': make_json_serializable(confluencia),
                'niveis_operacionais': make_json_serializable(niveis)
            }
        
        return response
        
    except ImportError as e:
        logger.error(f"Erro ao importar módulos: {e}")
        return {
            'status': 'error',
            'error': f'Módulos não encontrados: {str(e)}',
            'symbol': symbol,
            'timeframe': timeframe
        }
    except Exception as e:
        logger.error(f"Erro na análise: {e}", exc_info=True)
        return {
            'status': 'error',
            'error': str(e),
            'symbol': symbol,
            'timeframe': timeframe
        }

def obter_sinal(symbol: str = "BTCUSDT", timeframe: str = "15m") -> dict:
    """
    Obtém sinal de trading para um par
    
    Args:
        symbol: Par de trading
        timeframe: Timeframe
    
    Returns:
        dict: Sinal de trading
    """
    try:
        resultado = analisar_par(symbol, timeframe)
        
        if resultado.get('status') != 'ok':
            return resultado
        
        analysis = resultado.get('analysis', {})
        sintese = resultado.get('full_analysis', {}).get('sintese', {})
        
        return {
            'status': 'ok',
            'signal': {
                'symbol': symbol,
                'timeframe': timeframe,
                'type': analysis.get('recommendation', 'HOLD'),
                'confidence': analysis.get('confluence_score', 0) / 10.0,  # Normalizar para 0-1
                'timestamp': sintese.get('timestamp', ''),
                'entry': analysis.get('entry', 0),
                'stop_loss': analysis.get('stop_loss', 0),
                'take_profit': analysis.get('take_profit', 0)
            }
        }
    except Exception as e:
        logger.error(f"Erro ao obter sinal: {e}", exc_info=True)
        return {
            'status': 'error',
            'error': str(e)
        }

