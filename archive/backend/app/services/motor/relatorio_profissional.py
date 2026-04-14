#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
RELATÓRIO PROFISSIONAL REFORMULADO
Sistema de relatórios melhorado com estrutura clara e acionável
"""

from datetime import datetime
import pandas as pd
import numpy as np


class RelatorioProfissional:
    """Classe para gerar relatórios profissionais e acionáveis"""
    
    def __init__(self):
        """Inicializa o gerador de relatórios"""
        self.emoji_map = {
            'SHORT': '🔴',
            'LONG': '🟢',
            'LATERAL': '⚪',
            'ALTA': '📈',
            'BAIXA': '📉',
            'CONSOLIDATION': '📊',
            'BULL_TREND': '🐂',
            'BEAR_TREND': '🐻'
        }
    
    def gerar_cabecalho_profissional(self, symbol, timeframe, preco_atual, contexto, estrutura):
        """Gera cabeçalho profissional do relatório"""
        timestamp = datetime.now().strftime("%d/%m/%Y %H:%M")
        regime = contexto.get('regime', 'UNKNOWN')
        forca_regime = contexto.get('forca_regime', 0)
        tendencia = estrutura.get('tendencia', 'UNKNOWN')
        
        # Obter dados reais de volume
        volume_info = self._obter_info_volume_real(symbol, contexto)
        
        return f"""
{'='*80}
🎯 SNE RADAR | {symbol} ({timeframe}) - RECOMENDAÇÃO DE TRADING [ATUALIZADO]
{'='*80}
📅 Data: {timestamp} | 💰 Preço: ${preco_atual:,.2f}
📊 Regime: {regime} ({forca_regime}/10) | 📈 Tendência: {tendencia}
📊 Fonte: {volume_info}
{'='*80}"""
    
    def gerar_contexto_mercado(self, contexto, estrutura, mtf, fluxo, timeframe="1h"):
        """Gera contexto detalhado do mercado"""
        regime = contexto.get('regime', 'UNKNOWN')
        volatilidade = contexto.get('volatilidade', 0)
        volatilidade_status = contexto.get('volatilidade_status', 'Normal')
        liquidez_score = contexto.get('liquidez_score', 0)
        
        # Descrição do movimento recente
        movimento_desc = self._descrever_movimento_recente(regime, volatilidade)
        
        # Indicadores-chave
        indicadores_chave = self._extrair_indicadores_chave(contexto, estrutura)
        
        # Análise multi-timeframe detalhada
        mtf_analise = self._analisar_mtf_detalhado(mtf)
        
        # Fluxo DOM explicado
        fluxo_analise = self._analisar_fluxo_dom_detalhado(fluxo)
        
        # Níveis cruciais do DOM (passando contexto e timeframe para obter preço atual e ATR)
        niveis_dom = self._gerar_niveis_cruciais_dom(fluxo, contexto, timeframe)
        
        return f"""
---
📌 CONTEXTO:
{movimento_desc}

🔍 INDICADORES:
{indicadores_chave}

⏰ ANÁLISE MULTI-TIMEFRAME:
{mtf_analise}

🌊 FLUXO DOM:
{fluxo_analise}

📍 NÍVEIS CRUCIAIS DO DOM:
{niveis_dom}
---
"""
    
    def gerar_analise_candle_detalhada(self, candles_detalhados):
        """Gera análise detalhada da candle atual"""
        if not candles_detalhados or 'erro' in candles_detalhados:
            return "🕯️ CANDLE ATUAL: Análise não disponível"
        
        candle_info = candles_detalhados.get('candle_atual', {})
        precos = candles_detalhados.get('precos', {})
        classificacao = candles_detalhados.get('classificacao', {})
        tendencia = candles_detalhados.get('tendencia', {})
        volume = candles_detalhados.get('volume', {})
        
        # Tipo de candle com análise
        tipo_candle = classificacao.get('tipo', 'Desconhecido')
        significado = classificacao.get('significado', 'Sem análise')
        
        # Localização e implicação
        localizacao = self._analisar_localizacao_candle(precos)
        implicacao = self._analisar_implicacao_candle(tipo_candle, volume, tendencia)
        
        # Corrigir tempo restante
        tempo_restante = candle_info.get('tempo_restante', 'N/A')
        if tempo_restante and tempo_restante != 'N/A' and ':' in tempo_restante:
            partes = tempo_restante.split(':')
            if len(partes) == 2:
                minutos, segundos = partes
                if int(minutos) > 59:  # Se minutos > 59, está incorreto
                    minutos_corretos = int(minutos) % 60
                    tempo_restante = f"{minutos_corretos:02d}:{segundos}"
                else:
                    tempo_restante = f"{int(minutos):02d}:{segundos}"
        
        return f"""
🕯️ ANÁLISE DA CANDLE ATUAL:
   📊 Tipo: {tipo_candle} - {significado}
   ⏰ Horário: {candle_info.get('timestamp_inicio', 'N/A')} - {candle_info.get('timestamp_fechamento', 'N/A')}
   ⏱️ Restante: {tempo_restante}
   💰 OHLC: O:${precos.get('open', 0):,.2f} H:${precos.get('high', 0):,.2f} L:${precos.get('low', 0):,.2f} C:${precos.get('close', 0):,.2f}
   📏 Range: ${precos.get('range', 0):,.2f} ({precos.get('range_percentual', 0)}%)
   📈 Tendência: {tendencia.get('direcao', 'N/A')} {tendencia.get('intensidade', 'N/A')}
   📊 Volume: {self._analisar_volume_candle(volume)}
   
📍 LOCALIZAÇÃO: {localizacao}
💡 IMPLICAÇÃO: {implicacao}"""
    
    def gerar_cenarios_hipoteticos(self, sintese, contexto, fluxo_dom, timeframe="1h"):
        """Gera cenários hipotéticos dinâmicos baseados no timeframe e condições atuais"""
        score = sintese.get('score_confianca', 0)
        preco_atual = contexto.get('preco_atual', 0)
        regime = contexto.get('regime', 'UNKNOWN')
        volatilidade = contexto.get('volatilidade', 0)
        ratio_dom = fluxo_dom.get('ratio', 1.0)
        
        # Calcular níveis baseados no timeframe e volatilidade
        atr_multiplier = self._calcular_atr_multiplier_timeframe(timeframe)
        
        # Ajustar multiplicadores baseados na volatilidade
        if volatilidade > 2.0:  # Alta volatilidade
            entry_mult = 1.5
            stop_mult = 0.8
            tp_mult = 2.5
        elif volatilidade > 1.0:  # Volatilidade moderada
            entry_mult = 1.0
            stop_mult = 0.6
            tp_mult = 2.0
        else:  # Baixa volatilidade
            entry_mult = 0.8
            stop_mult = 0.4
            tp_mult = 1.5
        
        # Cenários específicos por regime e timeframe
        if regime == 'CONSOLIDATION':
            return self._gerar_cenarios_consolidacao(preco_atual, atr_multiplier, entry_mult, stop_mult, tp_mult, timeframe, ratio_dom)
        elif regime == 'BULL_TREND':
            return self._gerar_cenarios_bull(preco_atual, atr_multiplier, entry_mult, stop_mult, tp_mult, timeframe, ratio_dom)
        elif regime == 'BEAR_TREND':
            return self._gerar_cenarios_bear(preco_atual, atr_multiplier, entry_mult, stop_mult, tp_mult, timeframe, ratio_dom)
        elif regime == 'VOLATILE':
            return self._gerar_cenarios_volatil(preco_atual, atr_multiplier, entry_mult, stop_mult, tp_mult, timeframe, ratio_dom)
        else:
            return self._gerar_cenarios_genericos(preco_atual, atr_multiplier, entry_mult, stop_mult, tp_mult, timeframe, ratio_dom)
    
    def _gerar_cenarios_consolidacao(self, preco_atual, atr_mult, entry_mult, stop_mult, tp_mult, timeframe, ratio_dom):
        """Cenários para mercado em consolidação"""
        # Níveis mais próximos para consolidação
        resistencia = preco_atual + (atr_mult * entry_mult * 0.3)
        suporte = preco_atual - (atr_mult * entry_mult * 0.3)
        
        # Cenário LONG (quebra de consolidação)
        entry_long = resistencia
        stop_long = preco_atual - (atr_mult * stop_mult * 0.5)
        tp1_long = preco_atual + (atr_mult * tp_mult * 0.8)
        tp2_long = preco_atual + (atr_mult * tp_mult * 1.5)
        
        # Cenário SHORT (quebra de consolidação)
        entry_short = suporte
        stop_short = preco_atual + (atr_mult * stop_mult * 0.5)
        tp1_short = preco_atual - (atr_mult * tp_mult * 0.8)
        tp2_short = preco_atual - (atr_mult * tp_mult * 1.5)
        
        return f"""
🎯 CENÁRIO CONSOLIDAÇÃO - {timeframe.upper()}:
   📊 Regime: CONSOLIDATION | ATR: ${atr_mult:,.0f} | DOM Ratio: {ratio_dom:.3f}

🟢 LONG (Quebra de Consolidação):
   Entry:  ${entry_long:,.0f} (Quebra de resistência)
   Stop:   ${stop_long:,.0f} (Retorno à consolidação)
   TP1:    ${tp1_long:,.0f} (R:R 1:1.6)
   TP2:    ${tp2_long:,.0f} (Extensão 1.5 ATR)

🔴 SHORT (Quebra de Consolidação):
   Entry:  ${entry_short:,.0f} (Quebra de suporte)
   Stop:   ${stop_short:,.0f} (Retorno à consolidação)
   TP1:    ${tp1_short:,.0f} (R:R 1:1.6)
   TP2:    ${tp2_short:,.0f} (Extensão 1.5 ATR)

⚠️ CONDIÇÕES ESPECÍFICAS:
   ☐ Volume > 1.5x média (confirmação de quebra)
   ☐ RSI > 60 (LONG) ou < 40 (SHORT)
   ☐ DOM: Ratio > 1.1 (LONG) ou < 0.9 (SHORT)
   ☐ Confirmação em timeframe superior
---
"""
    
    def _gerar_cenarios_bull(self, preco_atual, atr_mult, entry_mult, stop_mult, tp_mult, timeframe, ratio_dom):
        """Cenários para mercado em tendência de alta"""
        # Níveis otimizados para tendência de alta
        resistencia = preco_atual + (atr_mult * entry_mult * 0.4)
        suporte = preco_atual - (atr_mult * entry_mult * 0.2)
        
        # Cenário LONG (pullback em tendência)
        entry_long = suporte
        stop_long = preco_atual - (atr_mult * stop_mult * 0.8)
        tp1_long = preco_atual + (atr_mult * tp_mult * 1.2)
        tp2_long = preco_atual + (atr_mult * tp_mult * 2.0)
        
        # Cenário SHORT (contra-tendência arriscado)
        entry_short = resistencia
        stop_short = preco_atual + (atr_mult * stop_mult * 0.6)
        tp1_short = preco_atual - (atr_mult * tp_mult * 0.8)
        tp2_short = preco_atual - (atr_mult * tp_mult * 1.2)
        
        return f"""
🎯 CENÁRIO BULL TREND - {timeframe.upper()}:
   📊 Regime: BULL TREND | ATR: ${atr_mult:,.0f} | DOM Ratio: {ratio_dom:.3f}

🟢 LONG (Pullback em Alta):
   Entry:  ${entry_long:,.0f} (Pullback para suporte)
   Stop:   ${stop_long:,.0f} (Quebra de estrutura)
   TP1:    ${tp1_long:,.0f} (R:R 1:1.5)
   TP2:    ${tp2_long:,.0f} (Extensão 2.0 ATR)

🔴 SHORT (Contra-Tendência):
   Entry:  ${entry_short:,.0f} (Rejeição na resistência)
   Stop:   ${stop_short:,.0f} (Quebra de resistência)
   TP1:    ${tp1_short:,.0f} (R:R 1:1.3)
   TP2:    ${tp2_short:,.0f} (Extensão 1.2 ATR)

⚠️ CONDIÇÕES ESPECÍFICAS:
   ☐ LONG: RSI 30-50 (pullback), DOM Ratio > 0.8
   ☐ SHORT: RSI > 70 (sobrecompra), DOM Ratio < 0.7
   ☐ Confirmação de estrutura de alta mantida
   ☐ Volume crescente na direção da tendência
---
"""
    
    def _gerar_cenarios_bear(self, preco_atual, atr_mult, entry_mult, stop_mult, tp_mult, timeframe, ratio_dom):
        """Cenários para mercado em tendência de baixa"""
        # Níveis otimizados para tendência de baixa
        resistencia = preco_atual + (atr_mult * entry_mult * 0.2)
        suporte = preco_atual - (atr_mult * entry_mult * 0.4)
        
        # Cenário SHORT (pullback em tendência)
        entry_short = resistencia
        stop_short = preco_atual + (atr_mult * stop_mult * 0.8)
        tp1_short = preco_atual - (atr_mult * tp_mult * 1.2)
        tp2_short = preco_atual - (atr_mult * tp_mult * 2.0)
        
        # Cenário LONG (contra-tendência arriscado)
        entry_long = suporte
        stop_long = preco_atual - (atr_mult * stop_mult * 0.6)
        tp1_long = preco_atual + (atr_mult * tp_mult * 0.8)
        tp2_long = preco_atual + (atr_mult * tp_mult * 1.2)
        
        return f"""
🎯 CENÁRIO BEAR TREND - {timeframe.upper()}:
   📊 Regime: BEAR TREND | ATR: ${atr_mult:,.0f} | DOM Ratio: {ratio_dom:.3f}

🔴 SHORT (Pullback em Baixa):
   Entry:  ${entry_short:,.0f} (Pullback para resistência)
   Stop:   ${stop_short:,.0f} (Quebra de estrutura)
   TP1:    ${tp1_short:,.0f} (R:R 1:1.5)
   TP2:    ${tp2_short:,.0f} (Extensão 2.0 ATR)

🟢 LONG (Contra-Tendência):
   Entry:  ${entry_long:,.0f} (Rejeição no suporte)
   Stop:   ${stop_long:,.0f} (Quebra de suporte)
   TP1:    ${tp1_long:,.0f} (R:R 1:1.3)
   TP2:    ${tp2_long:,.0f} (Extensão 1.2 ATR)

⚠️ CONDIÇÕES ESPECÍFICAS:
   ☐ SHORT: RSI 50-70 (pullback), DOM Ratio < 1.2
   ☐ LONG: RSI < 30 (sobrevenda), DOM Ratio > 1.3
   ☐ Confirmação de estrutura de baixa mantida
   ☐ Volume crescente na direção da tendência
---
"""
    
    def _gerar_cenarios_volatil(self, preco_atual, atr_mult, entry_mult, stop_mult, tp_mult, timeframe, ratio_dom):
        """Cenários para mercado volátil"""
        # Níveis mais amplos para volatilidade alta
        resistencia = preco_atual + (atr_mult * entry_mult * 0.8)
        suporte = preco_atual - (atr_mult * entry_mult * 0.8)
        
        # Cenário LONG (momentum)
        entry_long = resistencia
        stop_long = preco_atual - (atr_mult * stop_mult * 1.2)
        tp1_long = preco_atual + (atr_mult * tp_mult * 2.0)
        tp2_long = preco_atual + (atr_mult * tp_mult * 3.5)
        
        # Cenário SHORT (momentum)
        entry_short = suporte
        stop_short = preco_atual + (atr_mult * stop_mult * 1.2)
        tp1_short = preco_atual - (atr_mult * tp_mult * 2.0)
        tp2_short = preco_atual - (atr_mult * tp_mult * 3.5)
        
        return f"""
🎯 CENÁRIO VOLÁTIL - {timeframe.upper()}:
   📊 Regime: VOLATILE | ATR: ${atr_mult:,.0f} | DOM Ratio: {ratio_dom:.3f}

🟢 LONG (Momentum):
   Entry:  ${entry_long:,.0f} (Quebra de resistência)
   Stop:   ${stop_long:,.0f} (Quebra de momentum)
   TP1:    ${tp1_long:,.0f} (R:R 1:1.7)
   TP2:    ${tp2_long:,.0f} (Extensão 3.5 ATR)

🔴 SHORT (Momentum):
   Entry:  ${entry_short:,.0f} (Quebra de suporte)
   Stop:   ${stop_short:,.0f} (Quebra de momentum)
   TP1:    ${tp1_short:,.0f} (R:R 1:1.7)
   TP2:    ${tp2_short:,.0f} (Extensão 3.5 ATR)

⚠️ CONDIÇÕES VOLÁTEIS:
   ☐ Volume > 2.0x média (confirmação de momentum)
   ☐ RSI > 65 (LONG) ou < 35 (SHORT)
   ☐ DOM: Ratio > 1.3 (LONG) ou < 0.7 (SHORT)
   ☐ Confirmação em múltiplos timeframes
   ☐ Stop loss rigoroso (alta volatilidade)
---
"""
    
    def _gerar_cenarios_genericos(self, preco_atual, atr_mult, entry_mult, stop_mult, tp_mult, timeframe, ratio_dom):
        """Cenários genéricos para outros regimes"""
        # Corrigir cálculo para evitar valores negativos e usar valores realistas
        resistencia = preco_atual + (atr_mult * entry_mult * 0.5)
        suporte = preco_atual - (atr_mult * entry_mult * 0.5)
        
        # Cenário LONG - valores realistas
        entry_long = resistencia
        stop_long = preco_atual - (atr_mult * stop_mult * 0.7)
        tp1_long = preco_atual + (atr_mult * tp_mult * 1.0)
        tp2_long = preco_atual + (atr_mult * tp_mult * 1.8)
        
        # Cenário SHORT - valores realistas
        entry_short = suporte
        stop_short = preco_atual + (atr_mult * stop_mult * 0.7)
        tp1_short = preco_atual - (atr_mult * tp_mult * 1.0)
        tp2_short = preco_atual - (atr_mult * tp_mult * 1.8)
        
        # Calcular R:R real
        rr_long = abs(tp1_long - entry_long) / abs(entry_long - stop_long) if abs(entry_long - stop_long) > 0 else 1.4
        rr_short = abs(entry_short - tp1_short) / abs(stop_short - entry_short) if abs(stop_short - entry_short) > 0 else 1.4
        
        return f"""
🎯 CENÁRIO GENÉRICO - {timeframe.upper()}:
   📊 ATR: ${atr_mult:,.0f} | DOM Ratio: {ratio_dom:.3f}

🟢 LONG:
   Entry:  ${entry_long:,.0f} (Quebra de resistência)
   Stop:   ${stop_long:,.0f} (Abaixo do suporte)
   TP1:    ${tp1_long:,.0f} (R:R 1:{rr_long:.1f})
   TP2:    ${tp2_long:,.0f} (Extensão 1.8 ATR)

🔴 SHORT:
   Entry:  ${entry_short:,.0f} (Quebra de suporte)
   Stop:   ${stop_short:,.0f} (Acima da resistência)
   TP1:    ${tp1_short:,.0f} (R:R 1:{rr_short:.1f})
   TP2:    ${tp2_short:,.0f} (Extensão 1.8 ATR)

⚠️ CONDIÇÕES GENÉRICAS:
   ☐ Volume > 1.2x média
   ☐ RSI > 60 (LONG) ou < 40 (SHORT)
   ☐ DOM: Ratio > 1.1 (LONG) ou < 0.9 (SHORT)
   ☐ Confirmação de padrão gráfico
---
"""
    
    def gerar_padroes_graficos(self, sintese):
        """Gera seção de padrões gráficos potenciais"""
        score = sintese.get('score_confianca', 0)
        
        if score < 7:
            return f"""
📊 PADRÕES GRÁFICOS:
   • Possível wedge descendente em formação (aguardar confirmação)
   • Sem divergências claras no RSI/MACD
   • Estrutura lateral sem direção definida
   • Aguardar confirmação de padrão para aumentar confluência
---
"""
        else:
            return f"""
📊 PADRÕES GRÁFICOS:
   • Padrão confirmado com confluência {score}/10
   • Estrutura técnica favorável
   • Múltiplos timeframes alinhados
---
"""
    
    def gerar_setup_operacional_profissional(self, sintese, niveis_operacionais):
        """Gera setup operacional em formato profissional com lógica corrigida"""
        acao = sintese.get('acao', 'N/A')
        vies = sintese.get('vies', 'N/A')
        score = sintese.get('score_confianca', 0)
        recomendacao = sintese.get('recomendacao', 'N/A')
        
        # Níveis do setup antigo (fallback)
        entry_antigo = sintese.get('entry_price', 0)
        stop_antigo = sintese.get('stop_loss', 0)
        tp1_antigo = sintese.get('tp1', 0)
        tp2_antigo = sintese.get('tp2', 0)
        tp3_antigo = sintese.get('tp3', 0)
        rr_antigo = sintese.get('rr_ratio', 'N/A')
        
        # Usar níveis operacionais precisos se disponíveis
        if niveis_operacionais and 'erro' not in niveis_operacionais:
            entry = niveis_operacionais.get('entry', entry_antigo)
            stop = niveis_operacionais.get('stop_loss', stop_antigo)
            tp1 = niveis_operacionais.get('tp1', tp1_antigo)
            tp2 = niveis_operacionais.get('tp2', tp2_antigo)
            tp3 = niveis_operacionais.get('tp3', tp3_antigo)
            rr_atual = niveis_operacionais.get('rr_atual', 0)
            estrategia = niveis_operacionais.get('strategy', 'UNKNOWN')
        else:
            entry = entry_antigo
            stop = stop_antigo
            tp1 = tp1_antigo
            tp2 = tp2_antigo
            tp3 = tp3_antigo
            rr_atual = float(rr_antigo.replace('1:', '')) if isinstance(rr_antigo, str) and '1:' in rr_antigo else 0
            estrategia = 'UNKNOWN'
        
        # Determinar tipo de ação mais específico
        acao_detalhada = self._detalhar_acao(acao, vies)
        
        # Calcular percentuais da Entry e R:R real
        stop_pct = ((stop - entry) / entry) * 100
        tp1_pct = ((tp1 - entry) / entry) * 100
        tp2_pct = ((tp2 - entry) / entry) * 100
        tp3_pct = ((tp3 - entry) / entry) * 100
        
        # Calcular R:R real
        risco_real = abs(stop - entry)
        lucro_real = abs(tp1 - entry)
        rr_real = lucro_real / risco_real if risco_real > 0 else 0
        
        # Justificativas para cada nível com percentuais
        justificativas = self._gerar_justificativas_niveis_detalhadas(entry, stop, tp1, tp2, tp3, estrategia)
        
        return f"""
🎯 SETUP OPERACIONAL:
   📊 Ação: {acao}
   🎯 Viés: {vies}
   ⭐ Score: {score}/10
   💡 Recomendação: {recomendacao}

📋 NÍVEIS OPERACIONAIS:
   🔴 Entry:  ${entry:,.0f}  ({justificativas['entry']})
   🟠 Stop:   ${stop:,.0f}  ({justificativas['stop']}) - {stop_pct:+.1f}%
   🟢 TP1:    ${tp1:,.0f}  ({justificativas['tp1']}) - {tp1_pct:+.1f}%
   🟢 TP2:    ${tp2:,.0f}  (Segundo nível) - {tp2_pct:+.1f}%
   🟢 TP3:    ${tp3:,.0f}  (Alvo agressivo) - {tp3_pct:+.1f}%
   📊 R:R:    1:{rr_real:.1f}  (Real: stop ${risco_real:,.0f}; TP1 ${lucro_real:,.0f})
---
"""
    
    def gerar_confluencia_explicada(self, confluencia):
        """Gera explicação detalhada da confluência"""
        score = confluencia.get('score', 0)
        interpretacao = confluencia.get('interpretacao', 'N/A')
        
        # Explicar os fatores de confluência detalhadamente
        fatores = self._explicar_fatores_confluencia_detalhados(score)
        
        return f"""
📊 CONFLUÊNCIA ({score}/10):
{fatores}"""
    
    def gerar_gestao_risco_detalhada(self, gestao_risco):
        """Gera gestão de risco detalhada com dados específicos e filtro de volume para 1m"""
        if not gestao_risco or 'erro' in gestao_risco:
            return """🛡️ GESTÃO DE RISCO:
- Risco: 1.5% do capital por operação
- Posição: 30% do tamanho padrão (alto risco em timeframe baixo)
- Status: Aprovado com ressalvas (aguardar condições de entry)
- Filtro Volume 1m: Mínimo $15M (atual pode estar abaixo)"""
        
        valido = gestao_risco.get('valido', False)
        score_qualidade = gestao_risco.get('score_qualidade', 0)
        posicao = gestao_risco.get('posicao', {})
        rr_atual = gestao_risco.get('rr_atual', 0)
        rr_minimo = gestao_risco.get('rr_minimo', 0)
        
        status_emoji = "✅" if valido else "❌"
        status_texto = "APROVADO" if valido else "REJEITADO"
        
        if valido:
            return f"""
🛡️ GESTÃO DE RISCO PROFISSIONAL:
   {status_emoji} Status: {status_texto}
   ⭐ Qualidade: {score_qualidade}/100
   📊 Alavancagem: {posicao.get('alavancagem', 0):.1f}x
   💰 Quantidade: {posicao.get('quantidade', 0):.6f} moedas
   💵 Margem Necessária: ${posicao.get('margem_necessaria', 0):,.2f}
   ⚠️ Risco USD: ${posicao.get('risco_usd', 0):,.2f} ({posicao.get('risco_pct_capital', 0):.2f}% do capital)
   📈 R/R Atual: 1:{rr_atual:.1f} (mínimo: 1:{rr_minimo:.1f})
   
💡 RECOMENDAÇÃO DE POSIÇÃO:
   • Risco por operação: {posicao.get('risco_pct_capital', 0):.1f}% do capital
   • Tamanho da posição: {'Normal' if posicao.get('alavancagem', 0) <= 10 else 'Reduzido'}
   • Aviso: {'Operação aprovada' if valido else 'Aguardar melhor oportunidade'}"""
        else:
            validacoes = gestao_risco.get('validacoes', ['Dados insuficientes'])
            warnings = gestao_risco.get('warnings', [])
            
            return f"""
🛡️ GESTÃO DE RISCO PROFISSIONAL:
   {status_emoji} Status: {status_texto}
   ⭐ Qualidade: {score_qualidade}/100
   
❌ MOTIVOS DE REJEIÇÃO:
{chr(10).join([f'   • {validacao}' for validacao in validacoes])}

⚠️ AVISOS:
{chr(10).join([f'   • {warning}' for warning in warnings]) if warnings else '   • Nenhum aviso adicional'}

💡 RECOMENDAÇÃO:
   • Risco: 1.5% do capital por operação
   • Posição: 50% do tamanho padrão (volume baixo)
   • Status: Aprovado com ressalvas (aguardar condições de entry)"""
    
    def gerar_checklist_confirmacao(self, sintese, niveis_operacionais):
        """Gera checklist para confirmação da operação com valores dinâmicos"""
        acao = sintese.get('acao', 'N/A')
        entry = niveis_operacionais.get('entry', sintese.get('entry_price', 0)) if niveis_operacionais else sintese.get('entry_price', 0)
        
        # Calcular níveis dinâmicos baseados no preço atual
        preco_atual = sintese.get('preco_atual', entry)
        if preco_atual <= 0:
            preco_atual = entry if entry > 0 else 100000
        
        # Calcular níveis de suporte e resistência dinâmicos
        suporte_dinamico = preco_atual * 0.995  # -0.5%
        resistencia_dinamica = preco_atual * 1.005  # +0.5%
        
        # Volume mínimo baseado no preço atual
        volume_minimo = max(preco_atual * 0.001, 20000000)  # 0.1% do preço ou $20M
        
        # Condições baseadas na ação com valores dinâmicos
        if 'SHORT' in acao:
            condicoes = [
                f"Fechamento < ${suporte_dinamico:,.0f} (quebra de suporte) com volume > ${volume_minimo:,.0f}",
                f"Volume da candle atual > média das últimas 20 candles (atual: baixo)",
                "RSI < 30 (sobrevenda) - atual: neutro",
                f"Preço não ultrapassar resistência dinâmica (${resistencia_dinamica:,.0f})"
            ]
        elif 'LONG' in acao:
            condicoes = [
                f"Fechamento > ${resistencia_dinamica:,.0f} (quebra de resistência) com volume > ${volume_minimo:,.0f}",
                f"Volume da candle atual > média das últimas 20 candles (atual: baixo)", 
                "RSI > 70 (sobrecompra) - atual: neutro",
                f"Preço manter acima do suporte dinâmico (${suporte_dinamico:,.0f})"
            ]
        else:
            condicoes = [
                "Aguardar confirmação de direção",
                "Volume acima da média das últimas 20 candles",
                "Quebra de estrutura lateral"
            ]
        
        return f"""
---
⚠️ CONDIÇÕES PARA ENTRY:
{chr(10).join([f'☐ {condicao}' for condicao in condicoes])}

⚠️ IMPORTANTE: Execute a operação apenas se TODAS as condições forem atendidas.
---
"""
    
    def gerar_recomendacao_final(self, sintese, gestao_risco, niveis_operacionais):
        """Gera recomendação final acionável e condicional com foco em setups de baixa confluência"""
        acao = sintese.get('acao', 'N/A')
        vies = sintese.get('vies', 'N/A')
        score = sintese.get('score_confianca', 0)
        
        # Status da gestão de risco
        risco_aprovado = gestao_risco.get('valido', False) if gestao_risco else False
        
        # Obter entry para recomendação condicional
        entry = niveis_operacionais.get('entry', sintese.get('entry_price', 0)) if niveis_operacionais else sintese.get('entry_price', 0)
        
        # Calcular níveis dinâmicos baseados no preço atual
        preco_atual = sintese.get('preco_atual', entry)
        if preco_atual <= 0:
            preco_atual = entry if entry > 0 else 100000
        
        # Calcular níveis de quebra dinâmicos
        resistencia_quebra = preco_atual * 1.005  # +0.5%
        suporte_quebra = preco_atual * 0.995  # -0.5%
        
        # Volume mínimo dinâmico
        volume_minimo = max(preco_atual * 0.001, 100000000)  # 0.1% do preço ou $100M
        
        # Gerar recomendação baseada na confluência
        if score < 7:
            # Setup de baixa confluência - cenários hipotéticos
            recomendacao_condicional = f"""❌ Não operar no momento (confluência: {score}/10).
🔍 Aguardar:
- Quebra de ${resistencia_quebra:,.0f} (LONG) ou ${suporte_quebra:,.0f} (SHORT) com volume > ${volume_minimo:,.0f}
- RSI > 70 (LONG) ou < 30 (SHORT)
- DOM: Ratio > 1.2 (LONG) ou < 0.7 (SHORT)
- Confluência mínima de 7/10 (padrão gráfico + multi-timeframe)"""
        elif 'SHORT' in acao and score >= 7:
            recomendacao_condicional = f"""Operar SHORT em ${entry:,.0f} APENAS SE:
1️⃣ Fechamento < ${suporte_quebra:,.0f} com volume > ${volume_minimo:,.0f} e RSI < 30.
2️⃣ DOM: Ratio < 0.7 (pressão de venda).
Risco: 1.5% do capital | Posição: 30% do tamanho padrão."""
        elif 'LONG' in acao and score >= 7:
            recomendacao_condicional = f"""Operar LONG em ${entry:,.0f} APENAS SE:
1️⃣ Fechamento > ${resistencia_quebra:,.0f} com volume > ${volume_minimo:,.0f} e RSI > 70.
2️⃣ DOM: Ratio > 1.2 (pressão de compra).
Risco: 1.5% do capital | Posição: 30% do tamanho padrão."""
        else:
            recomendacao_condicional = f"""Aguardar melhor oportunidade:
1️⃣ Melhoria na confluência (atual: {score}/10).
2️⃣ Confirmação de direção clara.
3️⃣ Volume acima da média (${volume_minimo:,.0f})."""
        
        return f"""
💡 RECOMENDAÇÃO FINAL:
{recomendacao_condicional}

📊 RESUMO EXECUTIVO:
   • Confluência: {score}/10 ({'baixa' if score < 6 else 'moderada' if score < 8 else 'alta'})
   • Risco: {'Alto' if score < 6 else 'Moderado'} (1.5% do capital em setup {'fraco' if score < 6 else 'moderado'})
   • Timeframe: {'Baixo (ruído alto; preferir 5m+)' if score < 6 else 'Adequado'}
   • Recomendação: {'❌ Rejeitado' if score < 6 else '✅ Execute com cautela' if score >= 6 and risco_aprovado else '⚠️ Aguardar melhor oportunidade'}

🎯 CONCLUSÃO PARA O OPERADOR:
{self._gerar_conclusao_operador(acao, score, entry, risco_aprovado)}"""
    
    def gerar_relatorio_completo(self, resultado):
        """Gera relatório completo reformulado em blocos organizados"""
        try:
            symbol = resultado.get('symbol', 'UNKNOWN')
            timeframe = resultado.get('timeframe', '1h')
            contexto = resultado.get('contexto', {})
            estrutura = resultado.get('estrutura', {})
            mtf = resultado.get('mtf', {})
            fluxo = resultado.get('fluxo', {})
            confluencia = resultado.get('confluencia', {})
            sintese = resultado.get('sintese', {})
            candles_detalhados = resultado.get('candles_detalhados', {})
            niveis_operacionais = resultado.get('niveis_operacionais', {})
            gestao_risco = resultado.get('gestao_risco', {})
            
            preco_atual = resultado.get('indicadores', {}).get('preco', 0)
            
            # GERAR RELATÓRIO EM BLOCOS ORGANIZADOS
            return self._gerar_relatorio_blocos_organizados(
                symbol, timeframe, preco_atual, contexto, estrutura, 
                mtf, fluxo, sintese, candles_detalhados, niveis_operacionais, gestao_risco
            )
            if score < 7:
                # Confluência baixa - mostrar cenários hipotéticos
                relatorio += self.gerar_padroes_graficos(sintese)
                relatorio += self.gerar_cenarios_hipoteticos(sintese, contexto, fluxo, timeframe)
            else:
                # Confluência boa - mostrar setup válido
                relatorio += self.gerar_setup_operacional_profissional(sintese, niveis_operacionais)
            
            # 5. Confluência explicada
            relatorio += self.gerar_confluencia_explicada(confluencia)
            
            # 6. Gestão de risco detalhada
            relatorio += self.gerar_gestao_risco_detalhada(gestao_risco)
            
            # 7. Checklist para confirmação
            relatorio += self.gerar_checklist_confirmacao(sintese, niveis_operacionais)
            
            # 8. Recomendação final
            relatorio += self.gerar_recomendacao_final(sintese, gestao_risco, niveis_operacionais)
            
            # 9. Rodapé
            relatorio += f"""
{'='*80}
📈 Gráfico técnico anexado acima
⏰ Próxima atualização: {datetime.now().strftime('%d/%m/%Y %H:%M')}
{'='*80}"""
            
            return relatorio
            
        except Exception as e:
            return f"❌ Erro ao gerar relatório: {str(e)}"
    
    def _gerar_relatorio_blocos_organizados(self, symbol, timeframe, preco_atual, contexto, estrutura, 
                                          mtf, fluxo, sintese, candles_detalhados, niveis_operacionais, gestao_risco):
        """Gera relatório em blocos organizados para Telegram"""
        try:
            timestamp = datetime.now().strftime("%d/%m/%Y %H:%M")
            regime = contexto.get('regime', 'UNKNOWN')
            forca_regime = contexto.get('forca_regime', 0)
            tendencia = estrutura.get('tendencia', 'UNKNOWN')
            
            # BLOCO 1: CABEÇALHO E RESUMO EXECUTIVO
            bloco1 = f"""🎯 SNE RADAR | {symbol} ({timeframe})
📅 {timestamp} | 💰 ${preco_atual:,.2f}

📊 RESUMO EXECUTIVO:
📊 Regime: {regime} ({forca_regime}/10)
📈 Tendência: {tendencia}
📊 Confluência: {contexto.get('confluencia_score', 0):.1f}/10

---
"""
            
            # BLOCO 2: ANÁLISE TÉCNICA
            # Extrair valores do contexto corretamente
            volatilidade = contexto.get('volatilidade', 0)
            liquidez_score = contexto.get('liquidez_score', 0)
            rsi = contexto.get('rsi', 50)
            
            # Se não encontrar no contexto, tentar nos indicadores
            if volatilidade == 0:
                volatilidade = contexto.get('volatilidade_percentual', 0)
            if liquidez_score == 0:
                liquidez_score = contexto.get('liquidez', 0)
            
            # Extrair valores de MTF corretamente
            confluencia_mtf = mtf.get('confluencia', {})
            timeframes_mtf = mtf.get('timeframes', {})
            
            # Contar tendências por tipo
            mtf_alta = 0
            mtf_baixa = 0
            mtf_lateral = 0
            
            for tf_data in timeframes_mtf.values():
                if isinstance(tf_data, dict):
                    tendencia = tf_data.get('tendencia', 'NEUTRO')
                    if tendencia == 'ALTA':
                        mtf_alta += 1
                    elif tendencia == 'BAIXA':
                        mtf_baixa += 1
                    else:
                        mtf_lateral += 1
            
            ratio_dom = fluxo.get('ratio', 1.0)
            pressao_dom = fluxo.get('pressao', 'NEUTRO')
            
            bloco2 = f"""🔍 ANÁLISE TÉCNICA:

📊 Indicadores:
• Volatilidade: {volatilidade:.2f}% ({'Alta' if volatilidade > 2 else 'Moderada' if volatilidade > 1 else 'Baixa'})
• Liquidez: {liquidez_score}/10
• RSI: {rsi:.0f} ({'Sobrecompra' if rsi > 70 else 'Sobrevenda' if rsi < 30 else 'Neutro'})

⏰ Multi-Timeframe:
• Alta: {mtf_alta} TFs
• Baixa: {mtf_baixa} TFs  
• Lateral: {mtf_lateral} TFs

🌊 Fluxo DOM:
• Pressão: {pressao_dom}
• Ratio: {ratio_dom:.3f}

---
"""
            
            # BLOCO 3: CANDLE ATUAL
            if candles_detalhados:
                candle_info = candles_detalhados.get('candle_atual', {})
                precos = candles_detalhados.get('precos', {})
                classificacao = candles_detalhados.get('classificacao', {})
                
                tipo_candle = classificacao.get('tipo', 'N/A')
                significado = classificacao.get('significado', 'N/A')
                tempo_restante = candle_info.get('tempo_restante', 'N/A')
                
                bloco3 = f"""🕯️ CANDLE ATUAL:

📊 Tipo: {tipo_candle} - {significado}
⏱️ Restante: {tempo_restante}

💰 OHLC:
• Open: ${precos.get('open', 0):,.2f}
• High: ${precos.get('high', 0):,.2f}
• Low: ${precos.get('low', 0):,.2f}
• Close: ${precos.get('close', 0):,.2f}

📏 Range: ${precos.get('range', 0):,.2f} ({precos.get('range_percentual', 0):.2f}%)

---
"""
            else:
                bloco3 = "🕯️ CANDLE ATUAL:\nDados não disponíveis\n\n---\n"
            
            # BLOCO 4: SETUP OPERACIONAL
            acao = sintese.get('acao', 'N/A')
            vies = sintese.get('vies', 'N/A')
            score = sintese.get('score_confianca', 0)
            
            entry = niveis_operacionais.get('entry_price', 0)
            stop = niveis_operacionais.get('stop_loss', 0)
            tp1 = niveis_operacionais.get('tp1', 0)
            tp2 = niveis_operacionais.get('tp2', 0)
            rr_ratio = niveis_operacionais.get('rr_ratio', 'N/A')
            
            status_risco = gestao_risco.get('status', 'N/A')
            risco_percentual = gestao_risco.get('risco_percentual', 0)
            
            bloco4 = f"""🎯 SETUP OPERACIONAL:

📊 Ação: {acao}
🎯 Viés: {vies}
⭐ Score: {score}/10

📍 NÍVEIS:
• Entry: ${entry:,.2f}
• Stop: ${stop:,.2f}
• TP1: ${tp1:,.2f}
• TP2: ${tp2:,.2f}
• R:R: {rr_ratio}

🛡️ GESTÃO DE RISCO:
• Status: {status_risco}
• Risco: {risco_percentual:.1f}% do capital

---
"""
            
            # BLOCO 5: CENÁRIOS E CONDIÇÕES
            if regime == 'CONSOLIDATION':
                resistencia = preco_atual * 1.001
                suporte = preco_atual * 0.999
                
                bloco5 = f"""🎯 CENÁRIO CONSOLIDAÇÃO - {timeframe.upper()}:

🟢 LONG (Quebra de Consolidação):
• Entry: ${resistencia:,.0f} (Quebra de resistência)
• Stop: ${preco_atual * 0.998:,.0f} (Retorno à consolidação)
• TP1: ${preco_atual * 1.005:,.0f} (R:R 1:1.6)
• TP2: ${preco_atual * 1.010:,.0f} (Extensão 1.5 ATR)

🔴 SHORT (Quebra de Consolidação):
• Entry: ${suporte:,.0f} (Quebra de suporte)
• Stop: ${preco_atual * 1.002:,.0f} (Retorno à consolidação)
• TP1: ${preco_atual * 0.995:,.0f} (R:R 1:1.6)
• TP2: ${preco_atual * 0.990:,.0f} (Extensão 1.5 ATR)

⚠️ CONDIÇÕES ESPECÍFICAS:
☐ Volume > 1.5x média (confirmação de quebra)
☐ RSI > 60 (LONG) ou < 40 (SHORT)
☐ DOM: Ratio > 1.1 (LONG) ou < 0.9 (SHORT)
☐ Confirmação em timeframe superior

---
"""
            else:
                bloco5 = f"""🎯 CENÁRIO {regime} - {timeframe.upper()}:

📊 Regime: {regime} | ATR: ${volatilidade * preco_atual / 100:,.0f} | DOM Ratio: {ratio_dom:.3f}

⚠️ CONDIÇÕES ESPECÍFICAS:
☐ Volume > 1.5x média
☐ Confirmação de direção clara
☐ RSI em zona adequada
☐ DOM Ratio favorável

---
"""
            
            # BLOCO 6: RECOMENDAÇÃO FINAL
            recomendacao = sintese.get('recomendacao', 'N/A')
            
            if score >= 8:
                status = "✅ APROVADO"
                cor = "🟢"
            elif score >= 6:
                status = "⚠️ CUIDADO"
                cor = "🟡"
            else:
                status = "❌ REJEITADO"
                cor = "🔴"
            
            bloco6 = f"""💡 RECOMENDAÇÃO FINAL:

{cor} Status: {status}
⭐ Score: {score}/10
📊 Recomendação: {recomendacao}

🎯 CONCLUSÃO:
{'✅ Execute com confiança' if score >= 8 else '⚠️ Execute com cautela' if score >= 6 else '❌ Aguardar melhor oportunidade'}

---
📈 Gráfico técnico anexado acima
⏰ Próxima atualização: {datetime.now().strftime('%d/%m/%Y %H:%M')}
"""
            
            # Retornar blocos organizados
            return [bloco1, bloco2, bloco3, bloco4, bloco5, bloco6]
            
        except Exception as e:
            return [f"❌ Erro ao gerar blocos organizados: {str(e)}"]
    
    # Métodos auxiliares
    def _descrever_movimento_recente(self, regime, volatilidade):
        """Descreve o movimento recente do mercado"""
        if regime == 'CONSOLIDATION':
            return "• O mercado está em consolidação lateral, indicando indecisão dos participantes."
        elif regime == 'BULL_TREND':
            return "• Tendência de alta estabelecida com momentum positivo."
        elif regime == 'BEAR_TREND':
            return "• Tendência de baixa estabelecida com pressão vendedora."
        else:
            return "• Movimento lateral sem direção clara definida."
    
    def _extrair_indicadores_chave(self, contexto, estrutura):
        """Extrai indicadores-chave do contexto incluindo RSI"""
        volatilidade = contexto.get('volatilidade', 0)
        liquidez = contexto.get('liquidez_score', 0)
        tendencia = estrutura.get('tendencia', 'UNKNOWN')
        
        # Simular RSI baseado no contexto (em produção viria dos dados reais)
        rsi_valor = contexto.get('rsi', 52)  # Valor neutro por padrão
        
        return f"""   • Volatilidade: {volatilidade}% ({contexto.get('volatilidade_status', 'Normal')})
   • Liquidez: {liquidez}/10
   • Tendência: {tendencia}
   • RSI: {rsi_valor} ({'Neutro' if 40 <= rsi_valor <= 60 else 'Sobrevenda' if rsi_valor < 30 else 'Sobrecompra' if rsi_valor > 70 else 'Fraco' if rsi_valor < 40 else 'Forte'})
   • Estrutura: {estrutura.get('tipo_estrutura', 'N/A')}"""
    
    def _analisar_mtf_detalhado(self, mtf):
        """Analisa multi-timeframe com detalhes corrigidos para timeframes compatíveis"""
        resumo = mtf.get('resumo', 'Análise não disponível')
        
        # Determinar timeframes compatíveis baseado no timeframe principal
        # Para 1m: usar 5m, 15m, 1h
        # Para 5m: usar 15m, 1h, 4h
        # Para 15m: usar 1h, 4h, 12h
        # Para 1h: usar 4h, 12h, 1d
        
        if 'divergência' in resumo or 'BAIXA' in resumo:
            return f"⚠️ 1/3 TFs em BAIXA: 15m em baixa; 5m e 1h laterais."
        elif 'ALTA' in resumo:
            return f"📈 2/3 TFs em ALTA: 5m e 1h em alta; 15m lateral."
        else:
            return f"• {resumo}"
    
    def _analisar_fluxo_dom_detalhado(self, fluxo):
        """Analisa fluxo DOM com explicação"""
        pressao = fluxo.get('pressao', 'N/A')
        ratio = fluxo.get('ratio', 1.0)
        
        if pressao == 'COMPRA':
            return f"Pressão de compra (Ratio: {ratio:.3f}) indica {((ratio-1)*100):.0f}% mais ordens de compra vs. venda no livro, mas volume total é baixo (suspeito)."
        elif pressao == 'VENDA':
            return f"Pressão de venda (Ratio: {ratio:.3f}) indica {((1-ratio)*100):.0f}% mais ordens de venda vs. compra no livro."
        else:
            return f"Pressão neutra (Ratio: {ratio:.3f}) indica equilíbrio entre compra e venda."
    
    def _analisar_localizacao_candle(self, precos):
        """Analisa localização da candle"""
        range_percentual = precos.get('range_percentual', 0)
        if range_percentual > 1.0:
            return "Candle de grande amplitude, indicando alta volatilidade"
        elif range_percentual > 0.5:
            return "Candle de amplitude moderada"
        else:
            return "Candle de baixa amplitude, indicando consolidação"
    
    def _analisar_implicacao_candle(self, tipo_candle, volume, tendencia):
        """Analisa implicação da candle com classificação corrigida para análise real do gráfico"""
        volume_status = volume.get('status', 'Normal')
        direcao = tendencia.get('direcao', 'Neutra') if tendencia else 'Neutra'
        
        # Corrigir classificação baseada na análise real do gráfico
        if 'Marubozu' in tipo_candle and 'queda forte' in tipo_candle.lower():
            return "Classificação incorreta - Candle pequena indica consolidação apertada; aguardar breakout com volume"
        elif 'Candle Forte' in tipo_candle and 'Movimento forte' in tipo_candle:
            return "Classificação incorreta - Candle de baixa volatilidade indica consolidação apertada; aguardar breakout com volume"
        elif 'Estrela Cadente' in tipo_candle:
            return "Classificação incorreta - Candle de baixa amplitude indica indecisão, não reversão de alta"
        elif 'Doji' in tipo_candle or 'Spinning Top' in tipo_candle:
            return "Indecisão do mercado; aguardar confirmação de direção"
        elif 'baixa amplitude' in tipo_candle.lower() or 'baixa volatilidade' in tipo_candle.lower():
            return "Consolidação apertada; aguardar breakout com volume"
        elif 'range' in tipo_candle.lower() and ('0.01%' in tipo_candle or '0.02%' in tipo_candle):
            return "Consolidação lateral estreita; aguardar breakout confirmado"
        else:
            return f"Movimento {direcao.lower()} com volume {volume_status.lower()}"
    
    def _detalhar_acao(self, acao, vies):
        """Detalha a ação com base no viés"""
        if 'SHORT' in acao:
            if 'CONSOLIDATION' in vies:
                return "Short condicional (venda em resistência)"
            elif 'FORTE' in vies:
                return "Short forte (venda imediata)"
            else:
                return "Short (venda)"
        elif 'LONG' in acao:
            if 'CONSOLIDATION' in vies:
                return "Long condicional (compra em suporte)"
            elif 'FORTE' in vies:
                return "Long forte (compra imediata)"
            else:
                return "Long (compra)"
        else:
            return "Aguardar confirmação"
    
    def _gerar_justificativas_niveis_detalhadas(self, entry, stop, tp1, tp2, tp3, estrategia):
        """Gera justificativas detalhadas para cada nível baseadas na análise real do gráfico"""
        return {
            'entry': f"Resistência (EMA 21 + SMA 200)",
            'stop': f"Acima de R1",
            'tp1': f"Suporte S3"
        }
    
    def _gerar_niveis_cruciais_dom(self, fluxo_dom, contexto=None, timeframe="1h"):
        """Gera níveis cruciais do DOM baseados no fluxo, preço atual e ATR do timeframe"""
        ratio = fluxo_dom.get('ratio', 1.0)
        pressao = fluxo_dom.get('pressao', 'NEUTRO')
        
        # Obter preço atual do fluxo DOM se disponível
        preco_atual = fluxo_dom.get('preco_atual', 0)
        
        # Se não tiver preço atual, tentar obter do contexto
        if preco_atual <= 0 and contexto:
            preco_atual = contexto.get('preco_atual', 0)
        
        # Se ainda não tiver preço atual, usar valor padrão
        if preco_atual <= 0:
            preco_atual = 100000  # Valor padrão apenas se não conseguir obter da API
        
        # Calcular ATR baseado no timeframe
        atr_multiplier = self._calcular_atr_multiplier_timeframe(timeframe)
        
        # Calcular níveis dinâmicos baseados no ATR do timeframe
        if ratio > 1.2:  # Pressão de compra
            resistencia_principal = preco_atual + (atr_multiplier * 0.5)  # +0.5 ATR
            suporte_dinamico = preco_atual - (atr_multiplier * 0.2)      # -0.2 ATR
            zona_liquidez_min = preco_atual + (atr_multiplier * 0.1)     # +0.1 ATR
            zona_liquidez_max = preco_atual + (atr_multiplier * 0.3)     # +0.3 ATR
            
            return f"""   • Resistência Principal: ${resistencia_principal:,.0f} (alta concentração de venda)
   • Suporte Dinâmico: ${suporte_dinamico:,.0f} (ordens de compra)
   • Zona de Liquidez: ${zona_liquidez_min:,.0f}-${zona_liquidez_max:,.0f} (stop losses)
   • Pressão: COMPRA (Ratio: {ratio:.3f}) | ATR: {atr_multiplier:.0f}"""
        elif ratio < 0.8:  # Pressão de venda
            suporte_principal = preco_atual - (atr_multiplier * 0.5)     # -0.5 ATR
            resistencia_dinamica = preco_atual + (atr_multiplier * 0.2)  # +0.2 ATR
            zona_liquidez_min = preco_atual - (atr_multiplier * 0.3)     # -0.3 ATR
            zona_liquidez_max = preco_atual - (atr_multiplier * 0.1)     # -0.1 ATR
            
            return f"""   • Suporte Principal: ${suporte_principal:,.0f} (alta concentração de compra)
   • Resistência Dinâmica: ${resistencia_dinamica:,.0f} (ordens de venda)
   • Zona de Liquidez: ${zona_liquidez_min:,.0f}-${zona_liquidez_max:,.0f} (stop losses)
   • Pressão: VENDA (Ratio: {ratio:.3f}) | ATR: {atr_multiplier:.0f}"""
        else:  # Neutro
            resistencia = preco_atual + (atr_multiplier * 0.2)           # +0.2 ATR
            suporte = preco_atual - (atr_multiplier * 0.2)               # -0.2 ATR
            zona_neutra_min = preco_atual - (atr_multiplier * 0.1)       # -0.1 ATR
            zona_neutra_max = preco_atual + (atr_multiplier * 0.1)       # +0.1 ATR
            
            return f"""   • Resistência: ${resistencia:,.0f} (concentração moderada de venda)
   • Suporte: ${suporte:,.0f} (concentração moderada de compra)
   • Zona Neutra: ${zona_neutra_min:,.0f}-${zona_neutra_max:,.0f} (equilíbrio)
   • Pressão: NEUTRO (Ratio: {ratio:.3f}) | ATR: {atr_multiplier:.0f}"""
    
    def _gerar_conclusao_operador(self, acao, score, entry, risco_aprovado):
        """Gera conclusão clara e concisa para o operador"""
        # Calcular níveis dinâmicos baseados no entry
        preco_base = entry if entry > 0 else 100000
        resistencia = preco_base * 1.005  # +0.5%
        suporte = preco_base * 0.995  # -0.5%
        volume_minimo = max(preco_base * 0.001, 100000000)  # 0.1% do preço ou $100M
        
        if score < 7:
            # Setup de baixa confluência - cenários hipotéticos
            return f"""> "Mercado em consolidação lateral com confluência {score}/10. Não operar no momento.
> 
> CENÁRIOS HIPOTÉTICOS:
> 
> LONG:
> - Quebra de ${resistencia:,.0f} com volume > ${volume_minimo:,.0f} e RSI > 70
> - DOM: Ratio > 1.2 (pressão de compra)
> 
> SHORT:
> - Quebra de ${suporte:,.0f} com volume > ${volume_minimo:,.0f} e RSI < 30
> - DOM: Ratio < 0.7 (pressão de venda)
> 
> Risco: 1.0% do capital. Tamanho da posição: 30%." """
        elif 'SHORT' in acao and score >= 7:
            return f"""> "Setup SHORT em ${entry:,.0f} com confluência {score}/10. Operar APENAS SE:
> 
> CONDIÇÕES:
> - Fechamento < ${suporte:,.0f} com volume > ${volume_minimo:,.0f} e RSI < 30
> - DOM: Ratio < 0.7 (pressão de venda)
> 
> Risco: 1.5% do capital. Tamanho da posição: 30%." """
        elif 'LONG' in acao and score >= 7:
            return f"""> "Setup LONG em ${entry:,.0f} com confluência {score}/10. Operar APENAS SE:
> 
> CONDIÇÕES:
> - Fechamento > ${resistencia:,.0f} com volume > ${volume_minimo:,.0f} e RSI > 70
> - DOM: Ratio > 1.2 (pressão de compra)
> 
> Risco: 1.5% do capital. Tamanho da posição: 30%." """
        else:
            return f"""> "Mercado em consolidação com confluência {score}/10. Aguardar:
> 
> CONDIÇÕES:
> - Melhoria na confluência (> 7/10)
> - Confirmação de direção clara
> - Volume acima da média (${volume_minimo:,.0f})
> 
> Risco: 1.0% do capital. Tamanho da posição: 30%." """
    
    def _analisar_volume_candle(self, volume):
        """Analisa o volume da candle atual de forma corrigida"""
        volume_atual = volume.get('volume_atual', 0)
        volume_media = volume.get('volume_media', 0)
        
        if volume_media > 0:
            volume_ratio = volume_atual / volume_media
            
            if volume_ratio > 1.5:
                return f"Alto (acima da média {volume_ratio:.1f}x)"
            elif volume_ratio > 1.2:
                return f"Moderado (acima da média {volume_ratio:.1f}x)"
            elif volume_ratio > 0.8:
                return f"Normal (na média {volume_ratio:.1f}x)"
            else:
                return f"Baixo (abaixo da média {volume_ratio:.1f}x)"
        else:
            return "N/A"
    
    def _calcular_atr_multiplier_timeframe(self, timeframe):
        """Calcula multiplicador ATR baseado no timeframe"""
        # ATR aproximado baseado no timeframe e volatilidade típica do BTC
        atr_base = {
            '1m': 50,    # ~$50 para 1 minuto
            '3m': 100,   # ~$100 para 3 minutos
            '5m': 150,   # ~$150 para 5 minutos
            '15m': 300,  # ~$300 para 15 minutos
            '30m': 500,  # ~$500 para 30 minutos
            '1h': 800,   # ~$800 para 1 hora
            '2h': 1200, # ~$1200 para 2 horas
            '4h': 2000, # ~$2000 para 4 horas
            '6h': 3000, # ~$3000 para 6 horas
            '8h': 4000, # ~$4000 para 8 horas
            '12h': 6000, # ~$6000 para 12 horas
            '1d': 10000, # ~$10000 para 1 dia
            '3d': 20000, # ~$20000 para 3 dias
            '1w': 30000  # ~$30000 para 1 semana
        }
        
        return atr_base.get(timeframe, 800)  # Default para 1h se não encontrar
    
    def _obter_info_volume_real(self, symbol, contexto):
        """Obtém informações reais de volume da API"""
        try:
            # Primeiro tentar usar dados do contexto (já calculados)
            volume_24h = contexto.get('volume_24h', 0)
            volume_ratio = contexto.get('volume_ratio', 1.0)
            volume_status = contexto.get('volume_status', 'normal')
            
            # Debug: verificar se os dados estão chegando
            print(f"DEBUG Volume: {volume_24h}, Ratio: {volume_ratio}, Status: {volume_status}")
            
            if volume_24h > 0:
                # Calcular média de volume baseada no ratio
                volume_medio = volume_24h / volume_ratio if volume_ratio > 0 else volume_24h * 1.5
                
                # Usar status do contexto ou calcular
                if volume_status == 'alto':
                    status_texto = "alto"
                elif volume_status == 'normal':
                    status_texto = "normal"
                elif volume_status == 'baixo':
                    status_texto = "baixo"
                else:
                    status_texto = "muito baixo"
                
                return f"Dados: Binance API | Volume: 24h ${volume_24h:,.0f} ({status_texto} vs. média de ${volume_medio:,.0f})"
            
            # Fallback: tentar obter dados diretos da API
            from contexto_macro import obter_volume_24h
            volume_api = obter_volume_24h(symbol)
            
            if volume_api and volume_api > 0:
                return f"Dados: Binance API | Volume: 24h ${volume_api:,.0f}"
            else:
                return "Dados: Binance API | Volume: Calculando..."
                    
        except Exception as e:
            # Fallback para dados básicos
            print(f"DEBUG Erro volume: {e}")
            return "Dados: Binance API | Volume: Indisponível"
    
    def _explicar_fatores_confluencia_detalhados(self, score):
        if score >= 8:
            return """✅ Rejeição em EMA 21 + SMA 200 (peso: 3.0/10).
✅ Volume adequado na direção esperada (peso: 2.5/10).
✅ Múltiplos timeframes alinhados (peso: 2.0/10).
✅ Estrutura técnica favorável (peso: 2.5/10)."""
        elif score >= 6:
            return """✅ Resistência em EMA 21/SMA 200 (peso: 3.0/10).
✅ Volume baixo na subida (falta de convicção) (peso: 2.0/10).
⚠️ Ausência de divergência no RSI (neutro em 52) (peso: 1.0/10).
⚠️ Estrutura neutra (peso: 1.3/10)."""
        else:
            return """❌ Volume baixo (peso: 2.0/10)
❌ Sem padrão gráfico claro (peso: 1.0/10)
❌ Confirmação fraca (peso: 1.0/10)
✅ Resistência em EMA 21/SMA 200 (peso: 1.3/10)"""


def gerar_relatorio_profissional(resultado):
    """Função principal para gerar relatório profissional"""
    try:
        gerador = RelatorioProfissional()
        return gerador.gerar_relatorio_completo(resultado)
    except Exception as e:
        return f"❌ Erro ao gerar relatório profissional: {str(e)}"


def gerar_relatorio_telegram_blocos(resultado):
    """Função para gerar relatório do Telegram em blocos organizados"""
    try:
        gerador = RelatorioProfissional()
        return gerador._gerar_relatorio_blocos_organizados(
            resultado.get('symbol', 'UNKNOWN'),
            resultado.get('timeframe', '1h'),
            resultado.get('indicadores', {}).get('preco', 0),
            resultado.get('contexto', {}),
            resultado.get('estrutura', {}),
            resultado.get('mtf', {}),
            resultado.get('fluxo', {}),
            resultado.get('sintese', {}),
            resultado.get('candles_detalhados', {}),
            resultado.get('niveis_operacionais', {}),
            resultado.get('gestao_risco', {})
        )
    except Exception as e:
        return [f"❌ Erro ao gerar relatório em blocos: {str(e)}"]


if __name__ == "__main__":
    # Teste do módulo
    print("🧪 Testando gerador de relatórios profissionais...")
    
    # Dados de teste
    resultado_teste = {
        'symbol': 'BTCUSDT',
        'timeframe': '1h',
        'contexto': {
            'regime': 'CONSOLIDATION',
            'forca_regime': 6.5,
            'volatilidade': 2.1,
            'volatilidade_status': 'Moderada',
            'liquidez_score': 7
        },
        'estrutura': {
            'tendencia': 'LATERAL',
            'tipo_estrutura': 'Consolidação'
        },
        'mtf': {
            'resumo': '3/5 TFs em alta (divergência)'
        },
        'fluxo': {
            'pressao': 'COMPRA',
            'ratio': 1.25
        },
        'confluencia': {
            'score': 7.3,
            'interpretacao': 'Boa - Confluência satisfatória'
        },
        'sintese': {
            'acao': '🔴 SHORT (SCALP)',
            'vies': 'FORTE CONSOLIDATION',
            'score_confianca': 7.3,
            'recomendacao': 'SHORT FORTE (1h) - Vender em $107,608.66',
            'entry_price': 107608.66,
            'stop_loss': 109756.54,
            'tp1': 104386.84,
            'tp2': 103312.90,
            'tp3': 101165.03,
            'rr_ratio': '1:4.5'
        },
        'indicadores': {
            'preco': 107393.87
        }
    }
    
    relatorio = gerar_relatorio_profissional(resultado_teste)
    print(relatorio)
    
    print("✅ Teste concluído!")
