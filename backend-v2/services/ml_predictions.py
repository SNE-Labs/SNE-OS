#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Sistema de Machine Learning para predições de preço"""

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional, Any
from datetime import datetime, timedelta
import pickle
import os
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import warnings
warnings.filterwarnings('ignore')

class MLPredictor:
    def __init__(self, model_dir: str = "ml_models"):
        self.model_dir = model_dir
        if not os.path.exists(model_dir):
            os.makedirs(model_dir)
        
        self.models = {}
        self.scalers = {}
        self.feature_importance = {}
        self.model_performance = {}
        
        # Configurações dos modelos
        self.model_configs = {
            'random_forest': {
                'model': RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1),
                'features': ['rsi', 'macd', 'bb_position', 'volume_ratio', 'price_change_1h', 'price_change_4h']
            },
            'gradient_boosting': {
                'model': GradientBoostingRegressor(n_estimators=100, random_state=42),
                'features': ['rsi', 'macd', 'bb_position', 'volume_ratio', 'price_change_1h', 'price_change_4h']
            },
            'linear_regression': {
                'model': LinearRegression(),
                'features': ['rsi', 'macd', 'bb_position', 'volume_ratio', 'price_change_1h', 'price_change_4h']
            },
            'ridge_regression': {
                'model': Ridge(alpha=1.0),
                'features': ['rsi', 'macd', 'bb_position', 'volume_ratio', 'price_change_1h', 'price_change_4h']
            }
        }
    
    def create_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Cria features para o modelo de ML."""
        if df.empty or len(df) < 50:
            return pd.DataFrame()
        
        features_df = df.copy()
        
        # Features básicas
        features_df['price_change_1h'] = df['close'].pct_change(periods=1) * 100
        features_df['price_change_4h'] = df['close'].pct_change(periods=4) * 100
        features_df['price_change_24h'] = df['close'].pct_change(periods=24) * 100
        
        # Médias móveis
        features_df['ema_8'] = df['close'].ewm(span=8).mean()
        features_df['ema_21'] = df['close'].ewm(span=21).mean()
        features_df['sma_50'] = df['close'].rolling(window=50).mean()
        
        # RSI
        delta = df['close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        features_df['rsi'] = 100 - (100 / (1 + rs))
        
        # MACD
        ema_12 = df['close'].ewm(span=12).mean()
        ema_26 = df['close'].ewm(span=26).mean()
        features_df['macd'] = ema_12 - ema_26
        features_df['macd_signal'] = features_df['macd'].ewm(span=9).mean()
        features_df['macd_histogram'] = features_df['macd'] - features_df['macd_signal']
        
        # Bollinger Bands
        bb_middle = df['close'].rolling(window=20).mean()
        bb_std = df['close'].rolling(window=20).std()
        bb_upper = bb_middle + (bb_std * 2)
        bb_lower = bb_middle - (bb_std * 2)
        features_df['bb_position'] = (df['close'] - bb_lower) / (bb_upper - bb_lower)
        features_df['bb_width'] = (bb_upper - bb_lower) / bb_middle * 100
        
        # Volume features
        features_df['volume_ratio'] = df['volume'] / df['volume'].rolling(window=20).mean()
        features_df['volume_price_trend'] = df['volume'] * df['close'].pct_change()
        
        # Volatilidade
        features_df['volatility'] = df['close'].rolling(window=20).std() / df['close'].rolling(window=20).mean() * 100
        
        # ATR
        high_low = df['high'] - df['low']
        high_close = np.abs(df['high'] - df['close'].shift())
        low_close = np.abs(df['low'] - df['close'].shift())
        true_range = np.maximum(high_low, np.maximum(high_close, low_close))
        features_df['atr'] = true_range.rolling(window=14).mean()
        
        # Features de tempo
        features_df['hour'] = pd.to_datetime(df.index).hour
        features_df['day_of_week'] = pd.to_datetime(df.index).dayofweek
        features_df['is_weekend'] = features_df['day_of_week'].isin([5, 6]).astype(int)
        
        # Remover NaN
        features_df = features_df.dropna()
        
        return features_df
    
    def prepare_training_data(self, df: pd.DataFrame, target_horizon: int = 1) -> Tuple[np.ndarray, np.ndarray]:
        """Prepara dados para treinamento."""
        features_df = self.create_features(df)
        
        if features_df.empty:
            return np.array([]), np.array([])
        
        # Selecionar features
        feature_columns = []
        for model_name, config in self.model_configs.items():
            feature_columns.extend(config['features'])
        
        feature_columns = list(set(feature_columns))  # Remove duplicatas
        
        # Verificar se todas as features existem
        available_features = [col for col in feature_columns if col in features_df.columns]
        
        if len(available_features) < 3:
            return np.array([]), np.array([])
        
        X = features_df[available_features].values
        
        # Target: preço futuro
        y = features_df['close'].shift(-target_horizon).values
        
        # Remover NaN do target
        valid_indices = ~np.isnan(y)
        X = X[valid_indices]
        y = y[valid_indices]
        
        return X, y
    
    def train_models(self, df: pd.DataFrame, target_horizon: int = 1) -> Dict[str, Any]:
        """Treina todos os modelos."""
        X, y = self.prepare_training_data(df, target_horizon)
        
        if len(X) < 100:  # Mínimo de dados para treinamento
            return {"error": "Dados insuficientes para treinamento"}
        
        # Dividir dados
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, shuffle=False
        )
        
        results = {}
        
        for model_name, config in self.model_configs.items():
            try:
                # Selecionar features específicas do modelo
                feature_columns = []
                for model_name_check, model_config in self.model_configs.items():
                    if model_name_check == model_name:
                        feature_columns.extend(model_config['features'])
                
                # Verificar features disponíveis
                available_features = [col for col in feature_columns if col in df.columns]
                
                if len(available_features) < 2:
                    continue
                
                # Treinar modelo
                model = config['model']
                model.fit(X_train, y_train)
                
                # Fazer predições
                y_pred = model.predict(X_test)
                
                # Calcular métricas
                mse = mean_squared_error(y_test, y_pred)
                mae = mean_absolute_error(y_test, y_pred)
                r2 = r2_score(y_test, y_pred)
                
                # Salvar modelo
                model_path = os.path.join(self.model_dir, f"{model_name}_model.pkl")
                with open(model_path, 'wb') as f:
                    pickle.dump(model, f)
                
                # Feature importance (se disponível)
                importance = None
                if hasattr(model, 'feature_importances_'):
                    importance = dict(zip(available_features, model.feature_importances_))
                
                results[model_name] = {
                    "mse": mse,
                    "mae": mae,
                    "r2": r2,
                    "feature_importance": importance,
                    "model_path": model_path,
                    "features_used": available_features
                }
                
                self.models[model_name] = model
                self.model_performance[model_name] = results[model_name]
                
            except Exception as e:
                results[model_name] = {"error": str(e)}
        
        return results
    
    def predict_price(self, df: pd.DataFrame, model_name: str = "random_forest", 
                     horizon: int = 1) -> Dict[str, Any]:
        """Faz predição de preço usando modelo treinado."""
        if model_name not in self.models:
            # Tentar carregar modelo salvo
            model_path = os.path.join(self.model_dir, f"{model_name}_model.pkl")
            if os.path.exists(model_path):
                with open(model_path, 'rb') as f:
                    self.models[model_name] = pickle.load(f)
            else:
                return {"error": f"Modelo {model_name} não encontrado"}
        
        # Criar features
        features_df = self.create_features(df)
        if features_df.empty:
            return {"error": "Não foi possível criar features"}
        
        # Selecionar features do modelo
        config = self.model_configs.get(model_name, {})
        feature_columns = config.get('features', [])
        available_features = [col for col in feature_columns if col in features_df.columns]
        
        if len(available_features) < 2:
            return {"error": "Features insuficientes para predição"}
        
        # Preparar dados para predição
        X = features_df[available_features].iloc[-1:].values
        
        # Fazer predição
        model = self.models[model_name]
        prediction = model.predict(X)[0]
        
        # Calcular confiança baseada na performance do modelo
        confidence = self.model_performance.get(model_name, {}).get('r2', 0.5)
        confidence = max(0.1, min(0.9, confidence))  # Limitar entre 0.1 e 0.9
        
        # Calcular direção
        current_price = df['close'].iloc[-1]
        direction = "up" if prediction > current_price else "down"
        change_percent = ((prediction - current_price) / current_price) * 100
        
        return {
            "current_price": current_price,
            "predicted_price": prediction,
            "direction": direction,
            "change_percent": change_percent,
            "confidence": confidence,
            "model_used": model_name,
            "horizon": horizon,
            "timestamp": datetime.now().isoformat()
        }
    
    def ensemble_prediction(self, df: pd.DataFrame, horizon: int = 1) -> Dict[str, Any]:
        """Faz predição usando ensemble de modelos."""
        predictions = {}
        weights = {}
        
        # Coletar predições de todos os modelos disponíveis
        for model_name in self.model_configs.keys():
            pred_result = self.predict_price(df, model_name, horizon)
            if "error" not in pred_result:
                predictions[model_name] = pred_result
                # Peso baseado na performance (R²)
                r2 = self.model_performance.get(model_name, {}).get('r2', 0.5)
                weights[model_name] = max(0.1, r2)
        
        if not predictions:
            return {"error": "Nenhum modelo disponível para predição"}
        
        # Calcular predição ponderada
        total_weight = sum(weights.values())
        weighted_prediction = sum(
            pred["predicted_price"] * weights[model_name] 
            for model_name, pred in predictions.items()
        ) / total_weight
        
        # Calcular confiança média
        avg_confidence = sum(
            pred["confidence"] * weights[model_name] 
            for model_name, pred in predictions.items()
        ) / total_weight
        
        current_price = df['close'].iloc[-1]
        direction = "up" if weighted_prediction > current_price else "down"
        change_percent = ((weighted_prediction - current_price) / current_price) * 100
        
        return {
            "current_price": current_price,
            "predicted_price": weighted_prediction,
            "direction": direction,
            "change_percent": change_percent,
            "confidence": avg_confidence,
            "model_type": "ensemble",
            "models_used": list(predictions.keys()),
            "individual_predictions": predictions,
            "horizon": horizon,
            "timestamp": datetime.now().isoformat()
        }
    
    def get_model_performance(self) -> Dict[str, Any]:
        """Retorna performance de todos os modelos."""
        return self.model_performance
    
    def retrain_models(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Retreina todos os modelos com novos dados."""
        return self.train_models(df)

# Instância global do preditor
ml_predictor = MLPredictor()

def train_ml_models(df: pd.DataFrame) -> Dict[str, Any]:
    """Função para treinar modelos de ML."""
    return ml_predictor.train_models(df)

def predict_price_ml(df: pd.DataFrame, model_name: str = "random_forest", 
                    horizon: int = 1) -> Dict[str, Any]:
    """Função para predição de preço."""
    return ml_predictor.predict_price(df, model_name, horizon)

def ensemble_predict(df: pd.DataFrame, horizon: int = 1) -> Dict[str, Any]:
    """Função para predição ensemble."""
    return ml_predictor.ensemble_prediction(df, horizon)

def get_ml_performance() -> Dict[str, Any]:
    """Função para obter performance dos modelos."""
    return ml_predictor.get_model_performance()



