#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FLUXO ATIVO - Análise de Liquidez e DOM
"""

import requests


class FluxoAtivo:
    """Classe para análise de fluxo de liquidez e order book"""
    
    def __init__(self):
        self.base_url = "https://api.binance.com/api/v3"
    
    def obter_depth(self, symbol: str, limit: int = 5000):
        """Obtém order book depth da Binance"""
        try:
            url = f"{self.base_url}/depth"
            params = {"symbol": symbol, "limit": limit}
            response = requests.get(url, params=params, timeout=5)
            
            if response.status_code == 200:
                return response.json()
            return None
        except:
            return None
    
    def calcular_pressao_liquidez(self, symbol: str):
        """Calcula pressão de compra/venda no order book"""
        try:
            depth = self.obter_depth(symbol, limit=1000)
            
            if not depth:
                return {
                    'bid_density': 0,
                    'ask_density': 0,
                    'ratio': 1.0,
                    'pressao': 'NEUTRO',
                    'score': 0,
                    'preco_atual': 0
                }
            
            # Calcular densidade de bids e asks
            bid_density = sum([float(b[1]) for b in depth['bids']])
            ask_density = sum([float(a[1]) for a in depth['asks']])
            
            # Obter preço atual (média entre melhor bid e ask)
            best_bid = float(depth['bids'][0][0]) if depth['bids'] else 0
            best_ask = float(depth['asks'][0][0]) if depth['asks'] else 0
            preco_atual = (best_bid + best_ask) / 2 if best_bid > 0 and best_ask > 0 else 0
            
            # Evitar divisão por zero
            if ask_density == 0:
                ratio = 2.0
            else:
                ratio = bid_density / ask_density
            
            # Classificar pressão
            if ratio > 1.2:
                pressao = 'COMPRA'
                score = min(10, (ratio - 1) * 10)
            elif ratio < 0.8:
                pressao = 'VENDA'
                score = min(10, (1 - ratio) * 10)
            else:
                pressao = 'NEUTRO'
                score = 5
            
            return {
                'bid_density': bid_density,
                'ask_density': ask_density,
                'ratio': ratio,
                'pressao': pressao,
                'score': score,
                'preco_atual': preco_atual
            }
        
        except Exception as e:
            return {
                'bid_density': 0,
                'ask_density': 0,
                'ratio': 1.0,
                'pressao': 'NEUTRO',
                'score': 0,
                'preco_atual': 0,
                'erro': str(e)
            }
    
    def ajustar_sinal_por_fluxo(self, sinal: dict, symbol: str):
        """Ajusta sinal baseado no fluxo de liquidez"""
        try:
            fluxo = self.calcular_pressao_liquidez(symbol)
            
            # Ajustar confiança baseado no fluxo
            if sinal.get('direcao') == 'COMPRA' and fluxo['pressao'] == 'COMPRA':
                sinal['confianca'] = min(100, sinal.get('confianca', 50) + 15)
                sinal['comentario_fluxo'] = 'Fluxo de compra confirma sinal'
            elif sinal.get('direcao') == 'VENDA' and fluxo['pressao'] == 'VENDA':
                sinal['confianca'] = min(100, sinal.get('confianca', 50) + 15)
                sinal['comentario_fluxo'] = 'Fluxo de venda confirma sinal'
            elif sinal.get('direcao') == 'COMPRA' and fluxo['pressao'] == 'VENDA':
                sinal['confianca'] = max(0, sinal.get('confianca', 50) - 20)
                sinal['comentario_fluxo'] = 'Fluxo contrário - cautela'
            elif sinal.get('direcao') == 'VENDA' and fluxo['pressao'] == 'COMPRA':
                sinal['confianca'] = max(0, sinal.get('confianca', 50) - 20)
                sinal['comentario_fluxo'] = 'Fluxo contrário - cautela'
            else:
                sinal['comentario_fluxo'] = 'Fluxo neutro'
            
            sinal['fluxo_liquidez'] = fluxo
            
            return sinal
        
        except:
            return sinal


# Instância global para uso direto
fluxo_ativo = FluxoAtivo()


def analisar_fluxo_liquidez(symbol: str):
    """Função wrapper para análise rápida de fluxo"""
    return fluxo_ativo.calcular_pressao_liquidez(symbol)


if __name__ == "__main__":
    # Teste
    resultado = analisar_fluxo_liquidez("BTCUSDT")
    print(f"Pressão: {resultado['pressao']}")
    print(f"Ratio: {resultado['ratio']:.2f}")
    print(f"Score: {resultado['score']:.1f}")
