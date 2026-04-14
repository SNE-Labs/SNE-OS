#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GESTÃO DE RISCO PROFISSIONAL INTEGRADA
Sistema avançado de gestão de risco com alavancagem proporcional
"""

from datetime import datetime
import math
# ✅ Import relativo do pacote
from .niveis_operacionais import NiveisOperacionais


class GestaoRiscoProfissional:
    """
    Gestão de risco profissional que considera:
    - Capital base ($10)
    - Alavancagem proporcional ao timeframe
    - R:R seguro e proporcional
    - Volatilidade e qualidade do setup
    """
    
    def __init__(self, capital_base=10.0):
        self.capital_base = capital_base
        self.niveis_calc = NiveisOperacionais()
        
        # Configurações por timeframe
        self.configuracoes_tf = {
            '1m': {'alavancagem_max': 100, 'rr_minimo': 1.5, 'risco_max': 0.5},
            '5m': {'alavancagem_max': 50, 'rr_minimo': 1.8, 'risco_max': 0.8},
            '15m': {'alavancagem_max': 25, 'rr_minimo': 2.0, 'risco_max': 1.0},
            '30m': {'alavancagem_max': 15, 'rr_minimo': 2.2, 'risco_max': 1.2},
            '1h': {'alavancagem_max': 10, 'rr_minimo': 2.5, 'risco_max': 1.5},
            '4h': {'alavancagem_max': 5, 'rr_minimo': 3.0, 'risco_max': 2.0},
            '8h': {'alavancagem_max': 3, 'rr_minimo': 3.5, 'risco_max': 2.5},
            '1d': {'alavancagem_max': 2, 'rr_minimo': 4.0, 'risco_max': 3.0},
            '1w': {'alavancagem_max': 1, 'rr_minimo': 5.0, 'risco_max': 4.0}
        }
    
    def calcular_alavancagem_ideal(self, timeframe, volatilidade, score_confluencia):
        """
        Calcula alavancagem ideal baseada em:
        - Timeframe (menor TF = maior alavancagem possível)
        - Volatilidade (maior volat = menor alavancagem)
        - Score de confluência (maior score = maior alavancagem)
        
        Args:
            timeframe: Timeframe do trade
            volatilidade: Volatilidade atual (%)
            score_confluencia: Score de confluência (0-10)
        
        Returns:
            float: Alavancagem ideal calculada
        """
        if timeframe not in self.configuracoes_tf:
            timeframe = '1h'  # Fallback
        
        config = self.configuracoes_tf[timeframe]
        alavancagem_base = config['alavancagem_max']
        
        # Fator de volatilidade (0.3 a 1.0)
        # Volatilidade alta = menor alavancagem
        if volatilidade > 5.0:
            fator_volatilidade = 0.3
        elif volatilidade > 3.0:
            fator_volatilidade = 0.5
        elif volatilidade > 2.0:
            fator_volatilidade = 0.7
        elif volatilidade > 1.0:
            fator_volatilidade = 0.9
        else:
            fator_volatilidade = 1.0
        
        # Fator de confluência (0.2 a 1.0)
        # Score baixo = menor alavancagem
        if score_confluencia >= 8:
            fator_confluencia = 1.0
        elif score_confluencia >= 6:
            fator_confluencia = 0.8
        elif score_confluencia >= 4:
            fator_confluencia = 0.6
        else:
            fator_confluencia = 0.2
        
        # Alavancagem final
        alavancagem_ideal = alavancagem_base * fator_volatilidade * fator_confluencia
        
        # Garantir limites mínimos e máximos
        alavancagem_ideal = max(1.0, min(alavancagem_ideal, config['alavancagem_max']))
        
        return round(alavancagem_ideal, 1)
    
    def calcular_posicao_com_alavancagem(self, entry, sl, timeframe, volatilidade, score_confluencia):
        """
        Calcula tamanho da posição considerando alavancagem ideal
        
        Args:
            entry: Preço de entrada
            sl: Stop loss
            timeframe: Timeframe do trade
            volatilidade: Volatilidade atual (%)
            score_confluencia: Score de confluência (0-10)
        
        Returns:
            dict: Informações detalhadas da posição
        """
        # Calcular alavancagem ideal
        alavancagem = self.calcular_alavancagem_ideal(timeframe, volatilidade, score_confluencia)
        
        # Risco máximo em USD (baseado no timeframe)
        config = self.configuracoes_tf[timeframe]
        risco_max_usd = self.capital_base * (config['risco_max'] / 100)
        
        # Distância do stop em USD
        distancia_stop = abs(entry - sl)
        
        # Quantidade de moedas (sem alavancagem)
        quantidade_base = risco_max_usd / distancia_stop
        
        # Valor da posição com alavancagem
        valor_posicao_alavancada = quantidade_base * entry * alavancagem
        
        # Risco real (considerando alavancagem)
        risco_real_usd = quantidade_base * distancia_stop
        
        # Margem necessária (sem alavancagem)
        margem_necessaria = quantidade_base * entry
        
        return {
            'quantidade': round(quantidade_base, 6),
            'alavancagem': alavancagem,
            'valor_posicao': round(valor_posicao_alavancada, 2),
            'margem_necessaria': round(margem_necessaria, 2),
            'risco_usd': round(risco_real_usd, 2),
            'risco_pct_capital': round((risco_real_usd / self.capital_base) * 100, 2),
            'exposicao_total': round(valor_posicao_alavancada, 2),
            'risco_max_config': config['risco_max']
        }
    
    def calcular_rr_proporcional(self, timeframe, volatilidade, score_confluencia):
        """
        Calcula R:R mínimo baseado no timeframe e qualidade do setup
        
        Args:
            timeframe: Timeframe do trade
            volatilidade: Volatilidade atual (%)
            score_confluencia: Score de confluência (0-10)
        
        Returns:
            float: R:R mínimo necessário
        """
        if timeframe not in self.configuracoes_tf:
            timeframe = '1h'  # Fallback
        
        config = self.configuracoes_tf[timeframe]
        rr_base = config['rr_minimo']
        
        # Ajustar R:R baseado na volatilidade
        if volatilidade > 4.0:
            rr_ajustado = rr_base * 1.3  # Maior R:R para volatilidade muito alta
        elif volatilidade > 3.0:
            rr_ajustado = rr_base * 1.2  # Maior R:R para volatilidade alta
        elif volatilidade > 2.0:
            rr_ajustado = rr_base * 1.1  # Ligeiramente maior R:R
        elif volatilidade < 1.0:
            rr_ajustado = rr_base * 0.9  # Menor R:R para volatilidade baixa
        else:
            rr_ajustado = rr_base
        
        # Ajustar baseado na confluência
        if score_confluencia >= 8:
            rr_ajustado *= 0.9  # Pode aceitar R:R menor com alta confluência
        elif score_confluencia >= 6:
            rr_ajustado *= 1.0  # R:R padrão
        elif score_confluencia >= 4:
            rr_ajustado *= 1.2  # Precisa de R:R maior
        else:
            rr_ajustado *= 1.4  # Precisa de R:R muito maior com baixa confluência
        
        return max(round(rr_ajustado, 1), 1.2)  # R:R mínimo absoluto
    
    def validar_setup_completo(self, entry, tp_list, sl, timeframe, volatilidade, score_confluencia):
        """
        Valida setup considerando todos os fatores de risco
        
        Args:
            entry: Preço de entrada
            tp_list: Lista de take profits [tp1, tp2, tp3]
            sl: Stop loss
            timeframe: Timeframe do trade
            volatilidade: Volatilidade atual (%)
            score_confluencia: Score de confluência (0-10)
        
        Returns:
            dict: Resultado da validação completa
        """
        if timeframe not in self.configuracoes_tf:
            timeframe = '1h'  # Fallback
        
        # Calcular R:R atual
        ganho_tp1 = abs(tp_list[0] - entry)
        perda_sl = abs(entry - sl)
        rr_atual = ganho_tp1 / perda_sl if perda_sl > 0 else 0
        
        # R:R mínimo necessário
        rr_minimo = self.calcular_rr_proporcional(timeframe, volatilidade, score_confluencia)
        
        # Calcular posição
        posicao = self.calcular_posicao_com_alavancagem(entry, sl, timeframe, volatilidade, score_confluencia)
        
        # Validações
        validacoes = []
        warnings = []
        
        # Validação de R:R
        if rr_atual < rr_minimo:
            validacoes.append(f"R/R {rr_atual:.2f} < mínimo {rr_minimo:.2f}")
        elif rr_atual < rr_minimo * 1.1:
            warnings.append(f"R/R {rr_atual:.2f} próximo do mínimo {rr_minimo:.2f}")
        
        # Validação de risco
        if posicao['risco_pct_capital'] > self.configuracoes_tf[timeframe]['risco_max']:
            validacoes.append(f"Risco {posicao['risco_pct_capital']:.1f}% > máximo {self.configuracoes_tf[timeframe]['risco_max']}%")
        elif posicao['risco_pct_capital'] > self.configuracoes_tf[timeframe]['risco_max'] * 0.8:
            warnings.append(f"Risco {posicao['risco_pct_capital']:.1f}% próximo do máximo")
        
        # Validação de alavancagem
        if posicao['alavancagem'] > self.configuracoes_tf[timeframe]['alavancagem_max']:
            validacoes.append(f"Alavancagem {posicao['alavancagem']:.1f}x > máximo {self.configuracoes_tf[timeframe]['alavancagem_max']}x")
        
        # Validação de margem
        if posicao['margem_necessaria'] > self.capital_base:
            validacoes.append(f"Margem ${posicao['margem_necessaria']:.2f} > capital ${self.capital_base:.2f}")
        
        return {
            'valido': len(validacoes) == 0,
            'validacoes': validacoes,
            'warnings': warnings,
            'posicao': posicao,
            'rr_atual': round(rr_atual, 2),
            'rr_minimo': rr_minimo,
            'score_qualidade': self._calcular_score_qualidade(rr_atual, rr_minimo, posicao, score_confluencia)
        }
    
    def _calcular_score_qualidade(self, rr_atual, rr_minimo, posicao, score_confluencia):
        """
        Calcula score de qualidade do setup (0-100)
        """
        score = 0
        
        # Score baseado no R:R
        rr_score = min(50, (rr_atual / rr_minimo) * 30)
        score += rr_score
        
        # Score baseado na confluência
        score += score_confluencia * 5
        
        # Score baseado no risco
        risco_pct = posicao['risco_pct_capital']
        if risco_pct <= 1.0:
            score += 20
        elif risco_pct <= 2.0:
            score += 15
        elif risco_pct <= 3.0:
            score += 10
        else:
            score += 5
        
        return min(round(score, 1), 100)
    
    def gerar_relatorio_risco(self, setup_validado, timeframe, symbol):
        """
        Gera relatório detalhado de gestão de risco
        
        Args:
            setup_validado: Resultado da validação completa
            timeframe: Timeframe do trade
            symbol: Símbolo do ativo
        
        Returns:
            str: Relatório formatado
        """
        posicao = setup_validado['posicao']
        config = self.configuracoes_tf[timeframe]
        
        # Status do setup
        if setup_validado['valido']:
            status_emoji = "✅"
            status_text = "APROVADO"
        else:
            status_emoji = "❌"
            status_text = "REJEITADO"
        
        # Score de qualidade
        score_qualidade = setup_validado['score_qualidade']
        if score_qualidade >= 80:
            qualidade_text = "EXCELENTE"
        elif score_qualidade >= 60:
            qualidade_text = "BOA"
        elif score_qualidade >= 40:
            qualidade_text = "REGULAR"
        else:
            qualidade_text = "BAIXA"
        
        relatorio = f"""
🛡️ <b>GESTÃO DE RISCO PROFISSIONAL</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 <b>SETUP:</b> {symbol} | {timeframe}
{status_emoji} <b>Status:</b> {status_text}
⭐ <b>Qualidade:</b> {score_qualidade}/100 ({qualidade_text})

💰 <b>CAPITAL E POSIÇÃO:</b>
   Capital Base: ${self.capital_base:,.2f}
   Quantidade: {posicao['quantidade']:.6f} moedas
   Alavancagem: {posicao['alavancagem']:.1f}x
   Margem Necessária: ${posicao['margem_necessaria']:,.2f}
   Valor Posição: ${posicao['valor_posicao']:,.2f}
   Exposição Total: ${posicao['exposicao_total']:,.2f}

⚠️ <b>RISCO:</b>
   Risco USD: ${posicao['risco_usd']:,.2f}
   Risco % Capital: {posicao['risco_pct_capital']:.2f}%
   Risco Máx Config: {posicao['risco_max_config']:.1f}%
   R/R Atual: 1:{setup_validado['rr_atual']:.1f}
   R/R Mínimo: 1:{setup_validado['rr_minimo']:.1f}

📊 <b>CONFIGURAÇÃO TIMEFRAME:</b>
   TF: {timeframe}
   Alavancagem Máx: {config['alavancagem_max']}x
   Risco Máx: {config['risco_max']}%
   R/R Mínimo: 1:{config['rr_minimo']:.1f}
"""
        
        # Adicionar warnings se houver
        if setup_validado['warnings']:
            relatorio += f"\n⚠️ <b>AVISOS:</b>\n"
            for warning in setup_validado['warnings']:
                relatorio += f"   • {warning}\n"
        
        # Adicionar motivos de rejeição se houver
        if not setup_validado['valido']:
            relatorio += f"\n❌ <b>MOTIVOS DE REJEIÇÃO:</b>\n"
            for motivo in setup_validado['validacoes']:
                relatorio += f"   • {motivo}\n"
        
        # Recomendações
        relatorio += f"\n💡 <b>RECOMENDAÇÕES:</b>\n"
        if setup_validado['valido']:
            if score_qualidade >= 80:
                relatorio += f"   • Setup de alta qualidade - Pode operar com confiança\n"
            elif score_qualidade >= 60:
                relatorio += f"   • Setup bom - Operar com cautela\n"
            else:
                relatorio += f"   • Setup regular - Considerar reduzir tamanho da posição\n"
        else:
            relatorio += f"   • Ajustar níveis para atender critérios de risco\n"
            relatorio += f"   • Considerar timeframe diferente\n"
            relatorio += f"   • Aguardar melhor oportunidade\n"
        
        return relatorio
    
    def _criar_dataframe_basico(self, dados_dict):
        """Cria DataFrame básico a partir de dict de dados"""
        import pandas as pd
        import numpy as np
        
        try:
            # Extrair preço atual
            preco_atual = dados_dict.get('preco_atual', 100000)
            
            # Criar dados básicos para DataFrame
            data = {
                'open': [preco_atual * 0.999],
                'high': [preco_atual * 1.001],
                'low': [preco_atual * 0.998],
                'close': [preco_atual],
                'volume': [dados_dict.get('volume', 1000000)]
            }
            
            return pd.DataFrame(data)
            
        except Exception as e:
            print(f"⚠️ Erro ao criar DataFrame básico: {e}")
            # Fallback com dados mínimos
            return pd.DataFrame({
                'open': [100000],
                'high': [100100],
                'low': [99900],
                'close': [100000],
                'volume': [1000000]
            })
    
    def calcular_gestao_risco_com_niveis(self, dados, contexto, estrutura, timeframe, direcao='SHORT'):
        """
        Calcula gestão de risco profissional com níveis operacionais precisos
        
        Args:
            dados: Dados de mercado (DataFrame ou dict)
            contexto: Contexto de mercado
            estrutura: Estrutura de mercado
            timeframe: Timeframe da operação
            direcao: Direção da operação (SHORT/LONG)
        
        Returns:
            dict: Gestão de risco integrada com níveis operacionais
        """
        try:
            # Verificar se dados é DataFrame ou dict
            if isinstance(dados, dict):
                # Se for dict, extrair DataFrame se disponível
                if 'dados' in dados and hasattr(dados['dados'], 'columns'):
                    df_dados = dados['dados']
                else:
                    # Criar DataFrame básico a partir do dict
                    df_dados = self._criar_dataframe_basico(dados)
            else:
                df_dados = dados
            
            # Calcular níveis operacionais precisos
            niveis = self.niveis_calc.calcular_niveis_operacionais(
                df_dados, contexto, estrutura, timeframe, direcao
            )
            
            if 'erro' in niveis:
                return {'erro': niveis['erro']}
            
            # Calcular gestão de risco baseada nos níveis
            entry = niveis['entry']
            stop_loss = niveis['stop_loss']
            tp1 = niveis['tp1']
            
            # Calcular volatilidade e confluência
            volatilidade = contexto.get('volatilidade', 2.0)
            score_confluencia = contexto.get('score_confluencia', 5.0)
            
            # Calcular alavancagem ideal
            alavancagem_ideal = self.calcular_alavancagem_ideal(timeframe, volatilidade, score_confluencia)
            
            # Calcular position sizing
            posicao = self.calcular_posicao_com_alavancagem(entry, stop_loss, timeframe, volatilidade, score_confluencia)
            
            # Calcular R:R proporcional
            rr_minimo = self.calcular_rr_proporcional(timeframe, volatilidade, score_confluencia)
            
            # Validar setup completo
            setup_validado = self.validar_setup_completo(entry, [tp1], stop_loss, timeframe, volatilidade, score_confluencia)
            
            # Integrar níveis com gestão de risco
            resultado = {
                'niveis_operacionais': niveis,
                'gestao_risco': setup_validado,
                'integracao': {
                    'valido': setup_validado.get('valido', False),
                    'score_qualidade': setup_validado.get('score_qualidade', 0),
                    'rr_atual': niveis.get('rr_atual', 0),
                    'rr_minimo': rr_minimo,
                    'alavancagem': alavancagem_ideal,
                    'timeframe': timeframe,
                    'direcao': direcao,
                    'estrategia': niveis.get('strategy', 'unknown')
                }
            }
            
            return resultado
            
        except Exception as e:
            return {'erro': f'Erro ao calcular gestão de risco com níveis: {str(e)}'}
    
    def formatar_relatorio_completo(self, resultado):
        """
        Formata relatório completo com níveis operacionais e gestão de risco
        
        Args:
            resultado: Resultado da gestão de risco com níveis
        
        Returns:
            str: Relatório formatado
        """
        try:
            if 'erro' in resultado:
                return f"❌ Erro: {resultado['erro']}"
            
            niveis = resultado.get('niveis_operacionais', {})
            gestao = resultado.get('gestao_risco', {})
            integracao = resultado.get('integracao', {})
            
            # Formatar níveis operacionais
            relatorio = f"""
💰 NÍVEIS OPERACIONAIS PRECISOS ({niveis.get('strategy', 'UNKNOWN').upper()}):
   Preço Atual:  ${niveis.get('preco_atual', 0):,.2f}
   Entry:        ${niveis.get('entry', 0):,.2f} (S/R + Confirmação)
   Stop Loss:    ${niveis.get('stop_loss', 0):,.2f} (ATR {niveis.get('atr_multiplier', 0):.1f}x)
   TP1:          ${niveis.get('tp1', 0):,.2f} (S/R Próximo)
   TP2:          ${niveis.get('tp2', 0):,.2f} (S/R Distante)
   TP3:          ${niveis.get('tp3', 0):,.2f} (S/R Principal)
   
📊 VALIDAÇÃO TÉCNICA:
   ATR:          ${niveis.get('atr', 0):,.2f} ({niveis.get('atr_percentual', 0):.2f}%)
   R/R Atual:    1:{niveis.get('rr_atual', 0):.1f}
   Distância SL: ${niveis.get('distancia_sl', 0):,.2f} ({niveis.get('distancia_sl_percentual', 0):.2f}%)
   Distância TP1: ${niveis.get('distancia_tp1', 0):,.2f} ({niveis.get('distancia_tp1_percentual', 0):.2f}%)
   Estratégia:   {niveis.get('strategy', 'unknown').upper()}
"""
            
            # Adicionar gestão de risco
            if gestao.get('valido'):
                posicao = gestao.get('posicao', {})
                relatorio += f"""
🛡️ GESTÃO DE RISCO PROFISSIONAL:
   Status: ✅ APROVADO
   Qualidade: {gestao.get('score_qualidade', 0)}/100
   Alavancagem: {posicao.get('alavancagem', 0):.1f}x
   Quantidade: {posicao.get('quantidade', 0):.6f} moedas
   Margem: ${posicao.get('margem_necessaria', 0):,.2f}
   Risco: ${posicao.get('risco_usd', 0):,.2f} ({posicao.get('risco_pct_capital', 0):.2f}%)
   R/R: 1:{integracao.get('rr_atual', 0):.1f} (mín: 1:{integracao.get('rr_minimo', 0):.1f})
"""
            else:
                validacoes = gestao.get('validacoes', ['Dados insuficientes'])
                relatorio += f"""
🛡️ GESTÃO DE RISCO PROFISSIONAL:
   Status: ❌ REJEITADO
   Motivos: {', '.join(validacoes)}
"""
                
                if gestao.get('warnings'):
                    warnings = ', '.join(gestao['warnings'])
                    relatorio += f"   Avisos: {warnings}\n"
            
            return relatorio
            
        except Exception as e:
            return f"❌ Erro ao formatar relatório: {str(e)}"
        """
        Integra gestão de risco profissional no motor atual
        
        Args:
            sintese_atual: Síntese atual do motor_renan
            contexto: Contexto de mercado
            confluencia: Dados de confluência
            timeframe: Timeframe do trade
        
        Returns:
            dict: Síntese atualizada com gestão de risco
        """
        # Extrair dados necessários
        entry = sintese_atual.get('entry_price')
        tp_list = [
            sintese_atual.get('tp1'),
            sintese_atual.get('tp2'),
            sintese_atual.get('tp3')
        ]
        sl = sintese_atual.get('stop_loss')
        volatilidade = contexto.get('volatilidade', 2.0)
        score_confluencia = confluencia.get('score', 5.0)
        
        # Verificar se temos dados suficientes
        if not all([entry, sl, tp_list[0]]):
            # Manter síntese original se dados incompletos
            sintese_atual['gestao_risco'] = {
                'valido': False,
                'motivo': 'Dados insuficientes para cálculo de risco',
                'relatorio': '❌ Dados de entrada, stop loss ou take profit não disponíveis'
            }
            return sintese_atual
        
        # Validar setup completo
        setup_validado = self.validar_setup_completo(
            entry, tp_list, sl, timeframe, volatilidade, score_confluencia
        )
        
        # Gerar relatório
        symbol = sintese_atual.get('symbol', 'UNKNOWN')
        relatorio = self.gerar_relatorio_risco(setup_validado, timeframe, symbol)
        
        # Atualizar síntese com dados de risco
        sintese_atual['gestao_risco'] = {
            'valido': setup_validado['valido'],
            'posicao': setup_validado['posicao'],
            'rr_atual': setup_validado['rr_atual'],
            'rr_minimo': setup_validado['rr_minimo'],
            'score_qualidade': setup_validado['score_qualidade'],
            'validacoes': setup_validado['validacoes'],
            'warnings': setup_validado['warnings'],
            'relatorio': relatorio
        }
        
        return sintese_atual


# ========================================
# EXEMPLO DE USO
# ========================================

if __name__ == "__main__":
    # Criar sistema de risco profissional
    gestao = GestaoRiscoProfissional(capital_base=10.0)
    
    # Exemplo: Setup LONG BTCUSDT 30m
    entry = 106000
    tp_list = [106500, 107000, 107500]
    sl = 105500
    timeframe = "30m"
    volatilidade = 1.8
    score_confluencia = 7.5
    
    print("=" * 80)
    print("🛡️ TESTE GESTÃO DE RISCO PROFISSIONAL")
    print("=" * 80)
    
    # Validar setup
    setup_validado = gestao.validar_setup_completo(
        entry, tp_list, sl, timeframe, volatilidade, score_confluencia
    )
    
    # Gerar relatório
    relatorio = gestao.gerar_relatorio_risco(setup_validado, timeframe, "BTCUSDT")
    print(relatorio)
    
    print("\n" + "=" * 80)
    print("📊 DADOS TÉCNICOS:")
    print("=" * 80)
    
    posicao = setup_validado['posicao']
    print(f"Alavancagem Calculada: {posicao['alavancagem']:.1f}x")
    print(f"Quantidade: {posicao['quantidade']:.6f} BTC")
    print(f"Margem Necessária: ${posicao['margem_necessaria']:.2f}")
    print(f"Valor Posição: ${posicao['valor_posicao']:.2f}")
    print(f"Risco Real: ${posicao['risco_usd']:.2f} ({posicao['risco_pct_capital']:.2f}%)")
    print(f"R/R Atual: 1:{setup_validado['rr_atual']:.1f}")
    print(f"R/R Mínimo: 1:{setup_validado['rr_minimo']:.1f}")
    print(f"Score Qualidade: {setup_validado['score_qualidade']}/100")

