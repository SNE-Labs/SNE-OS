"""
Motor Service - Wrapper para integrar motor_renan com endpoints
"""
import logging
import json
import numpy as np
import pandas as pd
from datetime import datetime, date
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

def make_json_serializable(obj):
    """
    Converte objetos não serializáveis para tipos JSON válidos
    Compatível com motor_renan.py
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
        return bool(obj)
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

def analyze(symbol: str = "BTCUSDT", timeframe: str = "1h") -> Dict[str, Any]:
    """
    Executa análise completa usando motor_renan
    
    Args:
        symbol: Par de trading (ex: BTCUSDT)
        timeframe: Intervalo (1h, 4h, 1d)
    
    Returns:
        Dict com análise completa serializada para JSON
    """
    try:
        # ✅ Importar motor_renan do pacote app.services.motor
        from app.services.motor.motor_renan import analise_completa
        
        logger.info(f"🔬 Executando análise completa: {symbol} {timeframe}")
        
        # Executar análise
        resultado = analise_completa(symbol, timeframe)
        
        # Verificar se houve erro
        if 'erro' in resultado:
            logger.error(f"❌ Erro na análise: {resultado['erro']}")
            return {
                "status": "error",
                "error": resultado['erro'],
                "symbol": symbol,
                "timeframe": timeframe
            }
        
        # Serializar resultado para JSON
        resultado_serializado = make_json_serializable(resultado)
        
        logger.info(f"✅ Análise completa executada com sucesso")
        
        return resultado_serializado
        
    except ImportError as e:
        logger.error(f"❌ Erro ao importar motor_renan: {e}")
        logger.error("⚠️ Certifique-se de que os arquivos do motor foram copiados para app/services/motor/")
        return {
            "status": "error",
            "error": f"Motor de análise não disponível: {str(e)}",
            "symbol": symbol,
            "timeframe": timeframe
        }
    except Exception as e:
        logger.error(f"❌ Erro na análise: {e}", exc_info=True)
        return {
            "status": "error",
            "error": str(e),
            "symbol": symbol,
            "timeframe": timeframe
        }

def extract_signal(resultado: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extrai sinal simplificado do resultado da análise
    
    Args:
        resultado: Resultado de analyze()
    
    Returns:
        Dict com sinal simplificado (BUY/SELL/NEUTRAL)
    """
    try:
        sintese = resultado.get('sintese', {})
        indicadores = resultado.get('indicadores', {})
        contexto = resultado.get('contexto', {})
        
        # Extrair preço atual
        preco_atual = (
            indicadores.get('preco') or 
            contexto.get('preco_atual') or 
            sintese.get('entry_price') or 
            None
        )
        
        # Determinar sinal
        acao = sintese.get('acao', '')
        recomendacao = sintese.get('recomendacao', '')
        
        sinal = 'NEUTRAL'
        if 'LONG' in str(acao).upper() or 'LONG' in str(recomendacao).upper():
            sinal = 'BUY'
        elif 'SHORT' in str(acao).upper() or 'SHORT' in str(recomendacao).upper():
            sinal = 'SELL'
        
        # Extrair score
        score = sintese.get('score_combinado') or sintese.get('score_confianca', 0)
        
        # Extrair níveis
        entry = sintese.get('entry_price')
        stop_loss = sintese.get('stop_loss')
        take_profit = sintese.get('tp2') or sintese.get('tp1')
        
        return {
            "status": "ok",
            "symbol": resultado.get('symbol', 'BTCUSDT'),
            "timeframe": resultado.get('timeframe', '1h'),
            "signal": sinal,
            "score": float(score) if score else 0.0,
            "confidence": min(int(score * 10), 100) if score else 0,
            "entry": float(entry) if entry else None,
            "stop_loss": float(stop_loss) if stop_loss else None,
            "take_profit": float(take_profit) if take_profit else None,
            "timestamp": int(datetime.now().timestamp())
        }
        
    except Exception as e:
        logger.error(f"❌ Erro ao extrair sinal: {e}", exc_info=True)
        return {
            "status": "error",
            "error": str(e)
        }

