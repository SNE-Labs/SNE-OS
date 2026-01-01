#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Sistema de alertas baseado em thresholds"""

import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum

class AlertType(Enum):
    PRICE = "price"
    VOLUME = "volume"
    RSI = "rsi"
    FUNDING = "funding"
    OI = "open_interest"
    LIQUIDATION = "liquidation"
    CUSTOM = "custom"

class AlertCondition(Enum):
    ABOVE = "above"
    BELOW = "below"
    CROSSES_ABOVE = "crosses_above"
    CROSSES_BELOW = "crosses_below"
    PERCENTAGE_CHANGE = "percentage_change"

@dataclass
class Alert:
    id: str
    user_id: int
    symbol: str
    alert_type: AlertType
    condition: AlertCondition
    threshold: float
    message: str
    is_active: bool = True
    created_at: datetime = None
    triggered_at: Optional[datetime] = None
    trigger_count: int = 0
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now()

class AlertManager:
    def __init__(self):
        self.alerts: Dict[str, Alert] = {}
        self.triggered_alerts: List[Dict] = []
        self.last_values: Dict[str, Dict] = {}  # Para detectar cruzamentos
    
    def create_alert(self, user_id: int, symbol: str, alert_type: AlertType, 
                    condition: AlertCondition, threshold: float, message: str) -> str:
        """Cria um novo alerta."""
        alert_id = f"{user_id}_{symbol}_{alert_type.value}_{int(time.time())}"
        
        alert = Alert(
            id=alert_id,
            user_id=user_id,
            symbol=symbol,
            alert_type=alert_type,
            condition=condition,
            threshold=threshold,
            message=message
        )
        
        self.alerts[alert_id] = alert
        return alert_id
    
    def check_alerts(self, symbol: str, market_data: Dict[str, Any]) -> List[Dict]:
        """Verifica se algum alerta deve ser disparado."""
        triggered = []
        current_time = datetime.now()
        
        # Obter valores atuais
        current_values = self._extract_values(market_data)
        previous_values = self.last_values.get(symbol, {})
        
        # Verificar cada alerta ativo para este símbolo
        for alert_id, alert in self.alerts.items():
            if not alert.is_active or alert.symbol != symbol:
                continue
            
            if self._should_trigger(alert, current_values, previous_values):
                # Disparar alerta
                alert.triggered_at = current_time
                alert.trigger_count += 1
                
                triggered_alert = {
                    "alert_id": alert_id,
                    "user_id": alert.user_id,
                    "symbol": symbol,
                    "alert_type": alert.alert_type.value,
                    "message": alert.message,
                    "threshold": alert.threshold,
                    "current_value": current_values.get(alert.alert_type.value, 0),
                    "triggered_at": current_time.isoformat(),
                    "trigger_count": alert.trigger_count
                }
                
                triggered.append(triggered_alert)
                self.triggered_alerts.append(triggered_alert)
        
        # Atualizar valores anteriores
        self.last_values[symbol] = current_values
        
        return triggered
    
    def _extract_values(self, market_data: Dict[str, Any]) -> Dict[str, float]:
        """Extrai valores relevantes dos dados de mercado."""
        values = {}
        
        # Preço
        if 'price' in market_data:
            values['price'] = float(market_data['price'])
        
        # Volume
        if 'volume_ratio' in market_data:
            values['volume'] = float(market_data['volume_ratio'])
        
        # RSI
        if 'rsi' in market_data:
            values['rsi'] = float(market_data['rsi'])
        
        # Funding (se disponível)
        if 'funding_rate' in market_data:
            values['funding'] = float(market_data['funding_rate'])
        
        # Open Interest (se disponível)
        if 'open_interest' in market_data:
            values['open_interest'] = float(market_data['open_interest'])
        
        return values
    
    def _should_trigger(self, alert: Alert, current_values: Dict[str, float], 
                       previous_values: Dict[str, float]) -> bool:
        """Determina se um alerta deve ser disparado."""
        current_value = current_values.get(alert.alert_type.value)
        previous_value = previous_values.get(alert.alert_type.value)
        
        if current_value is None:
            return False
        
        if alert.condition == AlertCondition.ABOVE:
            return current_value > alert.threshold
        
        elif alert.condition == AlertCondition.BELOW:
            return current_value < alert.threshold
        
        elif alert.condition == AlertCondition.CROSSES_ABOVE:
            return (previous_value is not None and 
                   previous_value <= alert.threshold and 
                   current_value > alert.threshold)
        
        elif alert.condition == AlertCondition.CROSSES_BELOW:
            return (previous_value is not None and 
                   previous_value >= alert.threshold and 
                   current_value < alert.threshold)
        
        elif alert.condition == AlertCondition.PERCENTAGE_CHANGE:
            if previous_value is None or previous_value == 0:
                return False
            change_percent = ((current_value - previous_value) / previous_value) * 100
            return abs(change_percent) >= alert.threshold
        
        return False
    
    def get_user_alerts(self, user_id: int) -> List[Alert]:
        """Retorna alertas de um usuário específico."""
        return [alert for alert in self.alerts.values() if alert.user_id == user_id]
    
    def deactivate_alert(self, alert_id: str) -> bool:
        """Desativa um alerta."""
        if alert_id in self.alerts:
            self.alerts[alert_id].is_active = False
            return True
        return False
    
    def delete_alert(self, alert_id: str) -> bool:
        """Remove um alerta."""
        if alert_id in self.alerts:
            del self.alerts[alert_id]
            return True
        return False
    
    def get_triggered_alerts(self, user_id: Optional[int] = None, 
                           limit: int = 50) -> List[Dict]:
        """Retorna alertas disparados recentemente."""
        alerts = self.triggered_alerts
        
        if user_id is not None:
            alerts = [a for a in alerts if a['user_id'] == user_id]
        
        # Ordenar por timestamp (mais recentes primeiro)
        alerts.sort(key=lambda x: x['triggered_at'], reverse=True)
        
        return alerts[:limit]
    
    def cleanup_old_alerts(self, days: int = 30):
        """Remove alertas antigos e disparados."""
        cutoff_date = datetime.now() - timedelta(days=days)
        
        # Remover alertas disparados antigos
        self.triggered_alerts = [
            a for a in self.triggered_alerts 
            if datetime.fromisoformat(a['triggered_at']) > cutoff_date
        ]
        
        # Remover alertas inativos antigos
        to_remove = []
        for alert_id, alert in self.alerts.items():
            if (not alert.is_active and 
                alert.created_at < cutoff_date and 
                alert.trigger_count > 0):
                to_remove.append(alert_id)
        
        for alert_id in to_remove:
            del self.alerts[alert_id]

# Instância global do gerenciador de alertas
alert_manager = AlertManager()

def create_price_alert(user_id: int, symbol: str, condition: str, 
                      threshold: float, message: str) -> str:
    """Cria um alerta de preço."""
    condition_enum = AlertCondition(condition)
    return alert_manager.create_alert(
        user_id, symbol, AlertType.PRICE, condition_enum, threshold, message
    )

def create_rsi_alert(user_id: int, symbol: str, condition: str, 
                    threshold: float, message: str) -> str:
    """Cria um alerta de RSI."""
    condition_enum = AlertCondition(condition)
    return alert_manager.create_alert(
        user_id, symbol, AlertType.RSI, condition_enum, threshold, message
    )

def create_volume_alert(user_id: int, symbol: str, condition: str, 
                       threshold: float, message: str) -> str:
    """Cria um alerta de volume."""
    condition_enum = AlertCondition(condition)
    return alert_manager.create_alert(
        user_id, symbol, AlertType.VOLUME, condition_enum, threshold, message
    )

def check_market_alerts(symbol: str, market_data: Dict[str, Any]) -> List[Dict]:
    """Verifica alertas para dados de mercado."""
    return alert_manager.check_alerts(symbol, market_data)

