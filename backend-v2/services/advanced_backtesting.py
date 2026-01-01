#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Sistema avançado de backtesting com múltiplas estratégias"""

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional, Any, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import json

class OrderType(Enum):
    MARKET = "market"
    LIMIT = "limit"
    STOP = "stop"
    STOP_LIMIT = "stop_limit"

class OrderSide(Enum):
    BUY = "buy"
    SELL = "sell"

class OrderStatus(Enum):
    PENDING = "pending"
    FILLED = "filled"
    CANCELLED = "cancelled"
    REJECTED = "rejected"

@dataclass
class Order:
    id: str
    symbol: str
    side: OrderSide
    order_type: OrderType
    quantity: float
    price: Optional[float] = None
    stop_price: Optional[float] = None
    timestamp: datetime = None
    status: OrderStatus = OrderStatus.PENDING
    filled_price: Optional[float] = None
    filled_quantity: float = 0.0
    commission: float = 0.0
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()

@dataclass
class Trade:
    id: str
    symbol: str
    side: OrderSide
    quantity: float
    price: float
    timestamp: datetime
    commission: float = 0.0
    pnl: float = 0.0

@dataclass
class Position:
    symbol: str
    quantity: float = 0.0
    avg_price: float = 0.0
    unrealized_pnl: float = 0.0
    realized_pnl: float = 0.0
    total_commission: float = 0.0

class BacktestEngine:
    def __init__(self, initial_capital: float = 10000, commission_rate: float = 0.001):
        self.initial_capital = initial_capital
        self.commission_rate = commission_rate
        self.capital = initial_capital
        self.positions: Dict[str, Position] = {}
        self.orders: List[Order] = []
        self.trades: List[Trade] = []
        self.equity_curve: List[Dict] = []
        self.current_timestamp: Optional[datetime] = None
        
        # Métricas
        self.total_trades = 0
        self.winning_trades = 0
        self.losing_trades = 0
        self.max_drawdown = 0.0
        self.sharpe_ratio = 0.0
        self.profit_factor = 0.0
        
    def reset(self):
        """Reseta o engine para novo backtest."""
        self.capital = self.initial_capital
        self.positions.clear()
        self.orders.clear()
        self.trades.clear()
        self.equity_curve.clear()
        self.current_timestamp = None
        self.total_trades = 0
        self.winning_trades = 0
        self.losing_trades = 0
        self.max_drawdown = 0.0
        self.sharpe_ratio = 0.0
        self.profit_factor = 0.0
    
    def create_order(self, symbol: str, side: OrderSide, order_type: OrderType, 
                    quantity: float, price: Optional[float] = None, 
                    stop_price: Optional[float] = None) -> Order:
        """Cria uma nova ordem."""
        order_id = f"{symbol}_{side.value}_{len(self.orders)}_{int(datetime.now().timestamp())}"
        
        order = Order(
            id=order_id,
            symbol=symbol,
            side=side,
            order_type=order_type,
            quantity=quantity,
            price=price,
            stop_price=stop_price,
            timestamp=self.current_timestamp or datetime.now()
        )
        
        self.orders.append(order)
        return order
    
    def execute_order(self, order: Order, current_price: float) -> bool:
        """Executa uma ordem."""
        if order.status != OrderStatus.PENDING:
            return False
        
        # Verificar se há capital suficiente para compra
        if order.side == OrderSide.BUY:
            required_capital = order.quantity * current_price * (1 + self.commission_rate)
            if required_capital > self.capital:
                order.status = OrderStatus.REJECTED
                return False
        
        # Verificar se há posição suficiente para venda
        if order.side == OrderSide.SELL:
            position = self.positions.get(order.symbol, Position(order.symbol))
            if order.quantity > position.quantity:
                order.status = OrderStatus.REJECTED
                return False
        
        # Executar ordem
        commission = order.quantity * current_price * self.commission_rate
        
        if order.side == OrderSide.BUY:
            self.capital -= (order.quantity * current_price + commission)
            if order.symbol not in self.positions:
                self.positions[order.symbol] = Position(order.symbol)
            
            position = self.positions[order.symbol]
            total_cost = (position.quantity * position.avg_price) + (order.quantity * current_price)
            total_quantity = position.quantity + order.quantity
            position.avg_price = total_cost / total_quantity if total_quantity > 0 else 0
            position.quantity += order.quantity
            position.total_commission += commission
            
        else:  # SELL
            self.capital += (order.quantity * current_price - commission)
            position = self.positions[order.symbol]
            
            # Calcular PnL realizado
            pnl = order.quantity * (current_price - position.avg_price)
            position.realized_pnl += pnl
            position.quantity -= order.quantity
            position.total_commission += commission
            
            # Atualizar estatísticas
            self.total_trades += 1
            if pnl > 0:
                self.winning_trades += 1
            else:
                self.losing_trades += 1
        
        # Criar trade
        trade = Trade(
            id=f"trade_{len(self.trades)}_{int(datetime.now().timestamp())}",
            symbol=order.symbol,
            side=order.side,
            quantity=order.quantity,
            price=current_price,
            timestamp=order.timestamp,
            commission=commission,
            pnl=pnl if order.side == OrderSide.SELL else 0
        )
        
        self.trades.append(trade)
        
        # Atualizar ordem
        order.status = OrderStatus.FILLED
        order.filled_price = current_price
        order.filled_quantity = order.quantity
        order.commission = commission
        
        return True
    
    def update_positions(self, current_prices: Dict[str, float]):
        """Atualiza PnL não realizado das posições."""
        for symbol, position in self.positions.items():
            if symbol in current_prices and position.quantity > 0:
                current_price = current_prices[symbol]
                position.unrealized_pnl = position.quantity * (current_price - position.avg_price)
    
    def calculate_equity(self, current_prices: Dict[str, float]) -> float:
        """Calcula equity total."""
        total_equity = self.capital
        
        for symbol, position in self.positions.items():
            if symbol in current_prices and position.quantity > 0:
                current_price = current_prices[symbol]
                total_equity += position.quantity * current_price
        
        return total_equity
    
    def update_equity_curve(self, current_prices: Dict[str, float]):
        """Atualiza curva de equity."""
        self.update_positions(current_prices)
        equity = self.calculate_equity(current_prices)
        
        self.equity_curve.append({
            "timestamp": self.current_timestamp,
            "equity": equity,
            "capital": self.capital,
            "unrealized_pnl": sum(pos.unrealized_pnl for pos in self.positions.values()),
            "realized_pnl": sum(pos.realized_pnl for pos in self.positions.values())
        })
    
    def calculate_metrics(self) -> Dict[str, Any]:
        """Calcula métricas de performance."""
        if not self.equity_curve:
            return {}
        
        equity_df = pd.DataFrame(self.equity_curve)
        equity_df['returns'] = equity_df['equity'].pct_change()
        
        # Retorno total
        total_return = (equity_df['equity'].iloc[-1] - self.initial_capital) / self.initial_capital * 100
        
        # Retorno anualizado
        days = (equity_df['timestamp'].iloc[-1] - equity_df['timestamp'].iloc[0]).days
        annualized_return = (1 + total_return/100) ** (365/days) - 1 if days > 0 else 0
        
        # Volatilidade
        volatility = equity_df['returns'].std() * np.sqrt(252) if len(equity_df) > 1 else 0
        
        # Sharpe Ratio
        risk_free_rate = 0.02  # 2% anual
        sharpe_ratio = (annualized_return - risk_free_rate) / volatility if volatility > 0 else 0
        
        # Drawdown
        equity_df['cummax'] = equity_df['equity'].cummax()
        equity_df['drawdown'] = (equity_df['equity'] - equity_df['cummax']) / equity_df['cummax']
        max_drawdown = equity_df['drawdown'].min() * 100
        
        # Win Rate
        win_rate = (self.winning_trades / self.total_trades * 100) if self.total_trades > 0 else 0
        
        # Profit Factor
        winning_pnl = sum(trade.pnl for trade in self.trades if trade.pnl > 0)
        losing_pnl = abs(sum(trade.pnl for trade in self.trades if trade.pnl < 0))
        profit_factor = winning_pnl / losing_pnl if losing_pnl > 0 else float('inf')
        
        return {
            "total_return": total_return,
            "annualized_return": annualized_return * 100,
            "volatility": volatility * 100,
            "sharpe_ratio": sharpe_ratio,
            "max_drawdown": max_drawdown,
            "win_rate": win_rate,
            "profit_factor": profit_factor,
            "total_trades": self.total_trades,
            "winning_trades": self.winning_trades,
            "losing_trades": self.losing_trades,
            "final_equity": equity_df['equity'].iloc[-1],
            "total_commission": sum(trade.commission for trade in self.trades)
        }

class Strategy:
    def __init__(self, name: str):
        self.name = name
        self.parameters = {}
    
    def set_parameter(self, key: str, value: Any):
        """Define parâmetro da estratégia."""
        self.parameters[key] = value
    
    def generate_signals(self, df: pd.DataFrame, current_index: int) -> Dict[str, Any]:
        """Gera sinais de compra/venda. Deve ser implementado pelas subclasses."""
        raise NotImplementedError

class MovingAverageCrossover(Strategy):
    def __init__(self, fast_period: int = 10, slow_period: int = 20):
        super().__init__("Moving Average Crossover")
        self.set_parameter("fast_period", fast_period)
        self.set_parameter("slow_period", slow_period)
    
    def generate_signals(self, df: pd.DataFrame, current_index: int) -> Dict[str, Any]:
        if current_index < self.parameters["slow_period"]:
            return {"signal": "hold", "strength": 0}
        
        fast_ma = df['close'].rolling(window=self.parameters["fast_period"]).mean()
        slow_ma = df['close'].rolling(window=self.parameters["slow_period"]).mean()
        
        current_fast = fast_ma.iloc[current_index]
        current_slow = slow_ma.iloc[current_index]
        prev_fast = fast_ma.iloc[current_index - 1]
        prev_slow = slow_ma.iloc[current_index - 1]
        
        # Crossover
        if prev_fast <= prev_slow and current_fast > current_slow:
            return {"signal": "buy", "strength": 1.0}
        elif prev_fast >= prev_slow and current_fast < current_slow:
            return {"signal": "sell", "strength": 1.0}
        
        return {"signal": "hold", "strength": 0}

class RSIStrategy(Strategy):
    def __init__(self, rsi_period: int = 14, oversold: float = 30, overbought: float = 70):
        super().__init__("RSI Strategy")
        self.set_parameter("rsi_period", rsi_period)
        self.set_parameter("oversold", oversold)
        self.set_parameter("overbought", overbought)
    
    def generate_signals(self, df: pd.DataFrame, current_index: int) -> Dict[str, Any]:
        if current_index < self.parameters["rsi_period"]:
            return {"signal": "hold", "strength": 0}
        
        # Calcular RSI
        delta = df['close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=self.parameters["rsi_period"]).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=self.parameters["rsi_period"]).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        
        current_rsi = rsi.iloc[current_index]
        
        if current_rsi < self.parameters["oversold"]:
            return {"signal": "buy", "strength": (self.parameters["oversold"] - current_rsi) / self.parameters["oversold"]}
        elif current_rsi > self.parameters["overbought"]:
            return {"signal": "sell", "strength": (current_rsi - self.parameters["overbought"]) / (100 - self.parameters["overbought"])}
        
        return {"signal": "hold", "strength": 0}

class BollingerBandsStrategy(Strategy):
    def __init__(self, period: int = 20, std_dev: float = 2):
        super().__init__("Bollinger Bands Strategy")
        self.set_parameter("period", period)
        self.set_parameter("std_dev", std_dev)
    
    def generate_signals(self, df: pd.DataFrame, current_index: int) -> Dict[str, Any]:
        if current_index < self.parameters["period"]:
            return {"signal": "hold", "strength": 0}
        
        # Calcular Bollinger Bands
        sma = df['close'].rolling(window=self.parameters["period"]).mean()
        std = df['close'].rolling(window=self.parameters["period"]).std()
        upper_band = sma + (std * self.parameters["std_dev"])
        lower_band = sma - (std * self.parameters["std_dev"])
        
        current_price = df['close'].iloc[current_index]
        current_upper = upper_band.iloc[current_index]
        current_lower = lower_band.iloc[current_index]
        current_sma = sma.iloc[current_index]
        
        # Sinais
        if current_price <= current_lower:
            return {"signal": "buy", "strength": (current_lower - current_price) / current_lower}
        elif current_price >= current_upper:
            return {"signal": "sell", "strength": (current_price - current_upper) / current_upper}
        
        return {"signal": "hold", "strength": 0}

class BacktestRunner:
    def __init__(self, engine: BacktestEngine):
        self.engine = engine
        self.strategies: List[Strategy] = []
    
    def add_strategy(self, strategy: Strategy):
        """Adiciona estratégia ao backtest."""
        self.strategies.append(strategy)
    
    def run_backtest(self, df: pd.DataFrame, symbol: str = "BTCUSDT", 
                    position_size: float = 0.1) -> Dict[str, Any]:
        """Executa backtest com todas as estratégias."""
        self.engine.reset()
        
        for i in range(1, len(df)):
            self.engine.current_timestamp = df.index[i]
            current_price = df['close'].iloc[i]
            current_prices = {symbol: current_price}
            
            # Gerar sinais de todas as estratégias
            all_signals = []
            for strategy in self.strategies:
                signal = strategy.generate_signals(df, i)
                if signal["signal"] != "hold":
                    all_signals.append({
                        "strategy": strategy.name,
                        "signal": signal["signal"],
                        "strength": signal["strength"]
                    })
            
            # Executar ordens baseadas nos sinais
            if all_signals:
                # Estratégia de votação (maioria decide)
                buy_signals = [s for s in all_signals if s["signal"] == "buy"]
                sell_signals = [s for s in all_signals if s["signal"] == "sell"]
                
                if len(buy_signals) > len(sell_signals):
                    # Sinal de compra
                    position_value = self.engine.capital * position_size
                    quantity = position_value / current_price
                    
                    order = self.engine.create_order(
                        symbol=symbol,
                        side=OrderSide.BUY,
                        order_type=OrderType.MARKET,
                        quantity=quantity
                    )
                    self.engine.execute_order(order, current_price)
                
                elif len(sell_signals) > len(buy_signals):
                    # Sinal de venda
                    position = self.engine.positions.get(symbol, Position(symbol))
                    if position.quantity > 0:
                        order = self.engine.create_order(
                            symbol=symbol,
                            side=OrderSide.SELL,
                            order_type=OrderType.MARKET,
                            quantity=position.quantity
                        )
                        self.engine.execute_order(order, current_price)
            
            # Atualizar curva de equity
            self.engine.update_equity_curve(current_prices)
        
        # Calcular métricas finais
        metrics = self.engine.calculate_metrics()
        
        return {
            "strategy_names": [s.name for s in self.strategies],
            "metrics": metrics,
            "equity_curve": self.engine.equity_curve,
            "trades": [
                {
                    "id": trade.id,
                    "symbol": trade.symbol,
                    "side": trade.side.value,
                    "quantity": trade.quantity,
                    "price": trade.price,
                    "timestamp": trade.timestamp.isoformat(),
                    "pnl": trade.pnl,
                    "commission": trade.commission
                }
                for trade in self.engine.trades
            ],
            "final_positions": {
                symbol: {
                    "quantity": pos.quantity,
                    "avg_price": pos.avg_price,
                    "unrealized_pnl": pos.unrealized_pnl,
                    "realized_pnl": pos.realized_pnl
                }
                for symbol, pos in self.engine.positions.items()
            }
        }

# Funções de conveniência
def run_single_strategy_backtest(df: pd.DataFrame, strategy: Strategy, 
                                initial_capital: float = 10000, 
                                symbol: str = "BTCUSDT") -> Dict[str, Any]:
    """Executa backtest com uma única estratégia."""
    engine = BacktestEngine(initial_capital)
    runner = BacktestRunner(engine)
    runner.add_strategy(strategy)
    return runner.run_backtest(df, symbol)

def run_multi_strategy_backtest(df: pd.DataFrame, strategies: List[Strategy], 
                               initial_capital: float = 10000, 
                               symbol: str = "BTCUSDT") -> Dict[str, Any]:
    """Executa backtest com múltiplas estratégias."""
    engine = BacktestEngine(initial_capital)
    runner = BacktestRunner(engine)
    
    for strategy in strategies:
        runner.add_strategy(strategy)
    
    return runner.run_backtest(df, symbol)

def optimize_strategy_parameters(df: pd.DataFrame, strategy_class, 
                                param_ranges: Dict[str, List], 
                                initial_capital: float = 10000) -> Dict[str, Any]:
    """Otimiza parâmetros de uma estratégia."""
    best_result = None
    best_params = None
    best_return = -float('inf')
    
    # Gerar todas as combinações de parâmetros
    import itertools
    
    param_names = list(param_ranges.keys())
    param_values = list(param_ranges.values())
    
    for param_combination in itertools.product(*param_values):
        params = dict(zip(param_names, param_combination))
        
        # Criar estratégia com parâmetros
        strategy = strategy_class(**params)
        
        # Executar backtest
        result = run_single_strategy_backtest(df, strategy, initial_capital)
        
        if result["metrics"]["total_return"] > best_return:
            best_return = result["metrics"]["total_return"]
            best_result = result
            best_params = params
    
    return {
        "best_params": best_params,
        "best_return": best_return,
        "best_result": best_result
    }



