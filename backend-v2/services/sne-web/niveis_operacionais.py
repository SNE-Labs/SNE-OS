#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
NÍVEIS OPERACIONAIS PRECISOS
Calcula níveis de entrada, stop loss e take profits usando S/R e ATR
"""

import pandas as pd
import numpy as np
from datetime import datetime


class NiveisOperacionais:
    """Classe para calcular níveis operacionais precisos"""
    
    def __init__(self):
        """Inicializa configurações por timeframe"""
        self.configuracoes_tf = {
            '1m': {
                'atr_multiplier': 1.5,    # Multiplicador ATR para stop
                'tp_levels': 3,           # Número de take profits
                'min_rr': 1.5,           # R:R mínimo
                'confirmation_pips': 5,   # Pips para confirmação
                'strategy': 'scalping'
            },
            '5m': {
                'atr_multiplier': 2.0,
                'tp_levels': 3,
                'min_rr': 1.8,
                'confirmation_pips': 10,
                'strategy': 'scalping'
            },
            '15m': {
                'atr_multiplier': 2.5,
                'tp_levels': 3,
                'min_rr': 2.0,
                'confirmation_pips': 15,
                'strategy': 'day_trade'
            },
            '30m': {
                'atr_multiplier': 3.0,
                'tp_levels': 3,
                'min_rr': 2.2,
                'confirmation_pips': 20,
                'strategy': 'day_trade'
            },
            '1h': {
                'atr_multiplier': 3.5,
                'tp_levels': 3,
                'min_rr': 2.5,
                'confirmation_pips': 30,
                'strategy': 'swing'
            },
            '4h': {
                'atr_multiplier': 4.0,
                'tp_levels': 3,
                'min_rr': 3.0,
                'confirmation_pips': 50,
                'strategy': 'swing'
            },
            '1d': {
                'atr_multiplier': 5.0,
                'tp_levels': 3,
                'min_rr': 4.0,
                'confirmation_pips': 100,
                'strategy': 'position'
            }
        }
    
    def calcular_atr(self, df, period=14):
        """Calcula ATR (Average True Range)"""
        try:
            high = df['high']
            low = df['low']
            close = df['close']
            
            # True Range
            tr1 = high - low
            tr2 = abs(high - close.shift(1))
            tr3 = abs(low - close.shift(1))
            
            tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
            atr = tr.rolling(window=period).mean()
            
            return atr.iloc[-1] if not atr.empty else 0
            
        except Exception as e:
            print(f"Erro ao calcular ATR: {e}")
            return 0
    
    def identificar_sr_niveis(self, df, lookback=20):
        """Identifica níveis de suporte e resistência"""
        try:
            highs = df['high'].rolling(window=lookback, center=True).max()
            lows = df['low'].rolling(window=lookback, center=True).min()
            
            # Identificar máximos e mínimos locais
            resistance_levels = []
            support_levels = []
            
            for i in range(lookback, len(df) - lookback):
                if df['high'].iloc[i] == highs.iloc[i]:
                    resistance_levels.append(df['high'].iloc[i])
                if df['low'].iloc[i] == lows.iloc[i]:
                    support_levels.append(df['low'].iloc[i])
            
            # Ordenar e pegar os mais relevantes
            resistance_levels = sorted(resistance_levels, reverse=True)[:5]
            support_levels = sorted(support_levels)[:5]
            
            return {
                'resistance': resistance_levels,
                'support': support_levels
            }
            
        except Exception as e:
            print(f"Erro ao identificar S/R: {e}")
            return {'resistance': [], 'support': []}
    
    def calcular_niveis_operacionais(self, dados, contexto, estrutura, timeframe, direcao='SHORT'):
        """Calcula níveis operacionais precisos"""
        try:
            if not dados or 'dados' not in dados:
                return {'erro': 'Dados insuficientes'}
            
            df = dados['dados']
            if df.empty:
                return {'erro': 'DataFrame vazio'}
            
            config = self.configuracoes_tf.get(timeframe, self.configuracoes_tf['1h'])
            
            # Usar preço_atual passado como parâmetro se disponível, senão usar último candle
            if 'preco_atual' in dados:
                preco_atual = dados['preco_atual']
            else:
                preco_atual = df['close'].iloc[-1]
            
            # Calcular ATR
            atr = self.calcular_atr(df)
            
            # Identificar S/R
            sr_niveis = self.identificar_sr_niveis(df)
            
            # Calcular níveis baseados na direção
            if direcao.upper() == 'SHORT':
                niveis = self._calcular_niveis_short(preco_atual, atr, sr_niveis, config)
            else:
                niveis = self._calcular_niveis_long(preco_atual, atr, sr_niveis, config)
            
            # Adicionar informações técnicas primeiro
            niveis.update({
                'atr': atr,
                'atr_percentual': (atr / preco_atual) * 100,
                'strategy': config['strategy'],
                'timeframe': timeframe,
                'direcao': direcao.upper(),
                'preco_atual': preco_atual,
                'sr_niveis': sr_niveis
            })
            
            # Validar R:R mínimo (após adicionar direcao)
            niveis = self._validar_rr_minimo(niveis, config['min_rr'])
            
            return niveis
            
        except Exception as e:
            return {'erro': f'Erro ao calcular níveis: {str(e)}'}
    
    def _calcular_niveis_short(self, preco_atual, atr, sr_niveis, config):
        """Calcula níveis para operação SHORT"""
        try:
            # Entry: Resistência mais próxima ou preço atual + confirmação
            resistance_levels = sr_niveis['resistance']
            entry_candidates = [r for r in resistance_levels if r > preco_atual]
            
            if entry_candidates:
                entry = min(entry_candidates)  # Resistência mais próxima
            else:
                # Se não há resistência próxima, usar ATR
                entry = preco_atual + (atr * 0.5)
            
            # Stop Loss: Entry + (ATR * multiplicador)
            stop_loss = entry + (atr * config['atr_multiplier'])
            
            # Take Profits: Suportes abaixo do preço atual
            support_levels = sr_niveis['support']
            tp_candidates = [s for s in support_levels if s < preco_atual]
            
            # Ordenar suportes do mais próximo ao mais distante
            tp_candidates = sorted(tp_candidates, reverse=True)
            
            # Calcular TPs - SEMPRE usar cálculo baseado em ATR para garantir lógica correta
            tps = []
            for i in range(config['tp_levels']):
                # Para SHORT: TPs devem estar ABAIXO do entry
                distancia_tp = abs(entry - stop_loss) * (i + 1) * 0.5
                tp_calculado = entry - distancia_tp
                
                # Se há suportes válidos abaixo do entry, usar o mais próximo
                if i < len(tp_candidates) and tp_candidates[i] < entry:
                    # Usar o suporte se estiver abaixo do entry
                    tps.append(tp_candidates[i])
                else:
                    # Usar cálculo baseado em ATR
                    tps.append(tp_calculado)
            
            # Calcular R:R
            distancia_sl = stop_loss - entry
            distancia_tp1 = entry - tps[0] if tps else 0
            rr_atual = distancia_tp1 / distancia_sl if distancia_sl > 0 else 0
            
            return {
                'entry': entry,
                'stop_loss': stop_loss,
                'tp1': tps[0] if len(tps) > 0 else entry - (atr * 2),
                'tp2': tps[1] if len(tps) > 1 else entry - (atr * 3),
                'tp3': tps[2] if len(tps) > 2 else entry - (atr * 4),
                'rr_atual': rr_atual,
                'distancia_sl': distancia_sl,
                'distancia_tp1': distancia_tp1,
                'distancia_sl_percentual': (distancia_sl / entry) * 100,
                'distancia_tp1_percentual': (distancia_tp1 / entry) * 100
            }
            
        except Exception as e:
            return {'erro': f'Erro ao calcular níveis SHORT: {str(e)}'}
    
    def _calcular_niveis_long(self, preco_atual, atr, sr_niveis, config):
        """Calcula níveis para operação LONG"""
        try:
            # Entry: Suporte mais próximo ou preço atual - confirmação
            support_levels = sr_niveis['support']
            entry_candidates = [s for s in support_levels if s < preco_atual]
            
            if entry_candidates:
                entry = max(entry_candidates)  # Suporte mais próximo
            else:
                # Se não há suporte próximo, usar ATR
                entry = preco_atual - (atr * 0.5)
            
            # Stop Loss: Entry - (ATR * multiplicador)
            stop_loss = entry - (atr * config['atr_multiplier'])
            
            # Take Profits: Resistências acima do preço atual
            resistance_levels = sr_niveis['resistance']
            tp_candidates = [r for r in resistance_levels if r > preco_atual]
            
            # Ordenar resistências do mais próximo ao mais distante
            tp_candidates = sorted(tp_candidates)
            
            # Calcular TPs - SEMPRE usar cálculo baseado em ATR para garantir lógica correta
            tps = []
            for i in range(config['tp_levels']):
                # Para LONG: TPs devem estar ACIMA do entry
                distancia_tp = abs(stop_loss - entry) * (i + 1) * 0.5
                tp_calculado = entry + distancia_tp
                
                # Se há resistências válidas acima do entry, usar a mais próxima
                if i < len(tp_candidates) and tp_candidates[i] > entry:
                    # Usar a resistência se estiver acima do entry
                    tps.append(tp_candidates[i])
                else:
                    # Usar cálculo baseado em ATR
                    tps.append(tp_calculado)
            
            # Calcular R:R
            distancia_sl = entry - stop_loss
            distancia_tp1 = tps[0] - entry if tps else 0
            rr_atual = distancia_tp1 / distancia_sl if distancia_sl > 0 else 0
            
            return {
                'entry': entry,
                'stop_loss': stop_loss,
                'tp1': tps[0] if len(tps) > 0 else entry + (atr * 2),
                'tp2': tps[1] if len(tps) > 1 else entry + (atr * 3),
                'tp3': tps[2] if len(tps) > 2 else entry + (atr * 4),
                'rr_atual': rr_atual,
                'distancia_sl': distancia_sl,
                'distancia_tp1': distancia_tp1,
                'distancia_sl_percentual': (distancia_sl / entry) * 100,
                'distancia_tp1_percentual': (distancia_tp1 / entry) * 100
            }
            
        except Exception as e:
            return {'erro': f'Erro ao calcular níveis LONG: {str(e)}'}
    
    def _validar_rr_minimo(self, niveis, rr_minimo):
        """Valida e ajusta R:R se necessário"""
        try:
            if niveis.get('rr_atual', 0) < rr_minimo:
                # Ajustar TP1 para atingir R:R mínimo
                distancia_sl = niveis['distancia_sl']
                nova_distancia_tp = distancia_sl * rr_minimo
                
                if niveis['direcao'] == 'SHORT':
                    niveis['tp1'] = niveis['entry'] - nova_distancia_tp
                else:
                    niveis['tp1'] = niveis['entry'] + nova_distancia_tp
                
                niveis['rr_atual'] = rr_minimo
                niveis['distancia_tp1'] = nova_distancia_tp
                niveis['distancia_tp1_percentual'] = (nova_distancia_tp / niveis['entry']) * 100
                niveis['rr_ajustado'] = True
            
            return niveis
            
        except Exception as e:
            print(f"Erro ao validar R:R: {e}")
            return niveis
    
    def integrar_com_gestao_risco(self, niveis, gestao_risco):
        """Integra níveis operacionais com gestão de risco"""
        try:
            if 'erro' in niveis or 'erro' in gestao_risco:
                return niveis
            
            # Adicionar informações de gestão de risco aos níveis
            niveis['gestao_risco'] = gestao_risco
            
            # Validar se os níveis são compatíveis com a gestão de risco
            if gestao_risco.get('valido', False):
                posicao = gestao_risco.get('posicao', {})
                niveis['position_sizing'] = {
                    'quantidade': posicao.get('quantidade', 0),
                    'margem_necessaria': posicao.get('margem_necessaria', 0),
                    'risco_usd': posicao.get('risco_usd', 0),
                    'alavancagem': posicao.get('alavancagem', 0)
                }
            
            return niveis
            
        except Exception as e:
            print(f"Erro ao integrar com gestão de risco: {e}")
            return niveis
    
    def formatar_niveis_relatorio(self, niveis):
        """Formata níveis para exibição em relatório"""
        try:
            if 'erro' in niveis:
                return f"❌ Erro: {niveis['erro']}"
            
            formato = f"""
💰 NÍVEIS OPERACIONAIS PRECISOS ({niveis['strategy'].upper()}):
   Preço Atual:  ${niveis['preco_atual']:,.2f}
   Entry:        ${niveis['entry']:,.2f} (S/R + Confirmação)
   Stop Loss:    ${niveis['stop_loss']:,.2f} (ATR {niveis['atr_multiplier']:.1f}x)
   TP1:          ${niveis['tp1']:,.2f} (S/R Próximo)
   TP2:          ${niveis['tp2']:,.2f} (S/R Distante)
   TP3:          ${niveis['tp3']:,.2f} (S/R Principal)
   
📊 VALIDAÇÃO TÉCNICA:
   ATR:          ${niveis['atr']:,.2f} ({niveis['atr_percentual']:.2f}%)
   R/R Atual:    1:{niveis['rr_atual']:.1f}
   Distância SL: ${niveis['distancia_sl']:,.2f} ({niveis['distancia_sl_percentual']:.2f}%)
   Distância TP1: ${niveis['distancia_tp1']:,.2f} ({niveis['distancia_tp1_percentual']:.2f}%)
   Estratégia:   {niveis['strategy'].upper()}
"""
            
            # Adicionar informações de gestão de risco se disponível
            if 'gestao_risco' in niveis:
                gr = niveis['gestao_risco']
                if gr.get('valido'):
                    posicao = gr.get('posicao', {})
                    formato += f"""
🛡️ GESTÃO DE RISCO INTEGRADA:
   Status: ✅ APROVADO
   Alavancagem: {posicao.get('alavancagem', 0):.1f}x
   Quantidade: {posicao.get('quantidade', 0):.6f} moedas
   Margem: ${posicao.get('margem_necessaria', 0):,.2f}
   Risco: ${posicao.get('risco_usd', 0):,.2f} ({posicao.get('risco_pct_capital', 0):.2f}%)
"""
                else:
                    formato += f"""
🛡️ GESTÃO DE RISCO INTEGRADA:
   Status: ❌ REJEITADO
   Motivos: {', '.join(gr.get('validacoes', ['Dados insuficientes']))}
"""
            
            return formato
            
        except Exception as e:
            return f"❌ Erro ao formatar níveis: {str(e)}"


def calcular_niveis_operacionais_completos(dados, contexto, estrutura, timeframe, direcao='SHORT'):
    """Função principal para calcular níveis operacionais completos"""
    try:
        niveis_calc = NiveisOperacionais()
        niveis = niveis_calc.calcular_niveis_operacionais(dados, contexto, estrutura, timeframe, direcao)
        
        return niveis
        
    except Exception as e:
        return {'erro': f'Erro ao calcular níveis operacionais: {str(e)}'}


if __name__ == "__main__":
    # Teste do módulo
    print("🧪 Testando módulo de níveis operacionais...")
    
    # Criar dados de teste
    dados_teste = {
        'dados': pd.DataFrame({
            'open': [100, 101, 102, 103, 104],
            'high': [101, 102, 103, 104, 105],
            'low': [99, 100, 101, 102, 103],
            'close': [100.5, 101.5, 102.5, 103.5, 104.5]
        })
    }
    
    contexto_teste = {'volatilidade': 2.0}
    estrutura_teste = {'tendencia': 'ALTA'}
    
    # Testar cálculo
    niveis = calcular_niveis_operacionais_completos(dados_teste, contexto_teste, estrutura_teste, '1h', 'SHORT')
    
    if 'erro' not in niveis:
        print("✅ Níveis calculados com sucesso!")
        print(f"Entry: ${niveis['entry']:.2f}")
        print(f"Stop: ${niveis['stop_loss']:.2f}")
        print(f"TP1: ${niveis['tp1']:.2f}")
        print(f"R/R: 1:{niveis['rr_atual']:.1f}")
    else:
        print(f"❌ Erro: {niveis['erro']}")
    
    print("✅ Teste concluído!")
