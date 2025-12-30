#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Sistema de exportação de dados para CSV e PDF"""

import csv
import io
import os
from datetime import datetime
from typing import Dict, List, Any, Optional
import pandas as pd
from fpdf import FPDF
import json

class DataExporter:
    def __init__(self):
        self.export_dir = "exports"
        if not os.path.exists(self.export_dir):
            os.makedirs(self.export_dir)
    
    def export_market_data_csv(self, symbol: str, market_data: Dict[str, Any], 
                              indicators: Dict[str, Any] = None) -> str:
        """Exporta dados de mercado para CSV."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{symbol}_market_data_{timestamp}.csv"
        filepath = os.path.join(self.export_dir, filename)
        
        # Preparar dados para CSV
        csv_data = {
            "timestamp": datetime.now().isoformat(),
            "symbol": symbol,
            "price": market_data.get('price', 0),
            "variation_24h": market_data.get('variacao_preco', 0),
            "volume_ratio": market_data.get('volume_ratio', 0),
            "rsi": market_data.get('rsi', 0),
            "volatility": market_data.get('volatilidade', 0),
            "ema8": market_data.get('ema8', 0),
            "ema21": market_data.get('ema21', 0),
            "sma200": market_data.get('sma200', 0),
            "support": market_data.get('suporte', 0),
            "resistance": market_data.get('resistencia', 0),
            "trend_short": market_data.get('tendencia_curta', ''),
            "trend_long": market_data.get('tendencia_longa', ''),
            "rupture": market_data.get('rupture', False),
            "rupture_percentage": market_data.get('percentual_ruptura', 0),
            "buy_signal": market_data.get('sinal_compra', False),
            "sell_signal": market_data.get('sinal_venda', False)
        }
        
        # Adicionar indicadores avançados se disponíveis
        if indicators:
            csv_data.update({
                "bollinger_upper": indicators.get('bollinger', {}).get('upper', 0),
                "bollinger_middle": indicators.get('bollinger', {}).get('middle', 0),
                "bollinger_lower": indicators.get('bollinger', {}).get('lower', 0),
                "bollinger_width": indicators.get('bollinger', {}).get('width', 0),
                "stochastic_k": indicators.get('stochastic', {}).get('k', 0),
                "stochastic_d": indicators.get('stochastic', {}).get('d', 0),
                "williams_r": indicators.get('williams_r', {}).get('value', 0),
                "atr": indicators.get('atr', {}).get('atr', 0),
                "atr_percent": indicators.get('atr', {}).get('atr_percent', 0),
                "cci": indicators.get('cci', {}).get('value', 0),
                "obv": indicators.get('obv', {}).get('obv', 0),
                "adx": indicators.get('adx', {}).get('adx', 0)
            })
        
        # Escrever CSV
        with open(filepath, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=csv_data.keys())
            writer.writeheader()
            writer.writerow(csv_data)
        
        return filepath
    
    def export_candles_csv(self, symbol: str, candles: List[Dict], 
                          interval: str = "1m") -> str:
        """Exporta dados de candles para CSV."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{symbol}_candles_{interval}_{timestamp}.csv"
        filepath = os.path.join(self.export_dir, filename)
        
        if not candles:
            return None
        
        # Escrever CSV
        with open(filepath, 'w', newline='', encoding='utf-8') as csvfile:
            fieldnames = ['timestamp', 'open', 'high', 'low', 'close', 'volume']
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            
            for candle in candles:
                writer.writerow({
                    'timestamp': datetime.fromtimestamp(candle['time']).isoformat(),
                    'open': candle['open'],
                    'high': candle['high'],
                    'low': candle['low'],
                    'close': candle['close'],
                    'volume': candle.get('volume', 0)
                })
        
        return filepath
    
    def export_derivatives_csv(self, symbol: str, derivatives_data: Dict[str, Any]) -> str:
        """Exporta dados de derivativos para CSV."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{symbol}_derivatives_{timestamp}.csv"
        filepath = os.path.join(self.export_dir, filename)
        
        # Preparar dados
        csv_data = {
            "timestamp": datetime.now().isoformat(),
            "symbol": symbol,
            "funding_zscore": derivatives_data.get('funding', {}).get('zscore', 0),
            "oi_delta_pct": derivatives_data.get('oi', {}).get('delta_pct', 0),
            "lsr_accounts": derivatives_data.get('lsr', {}).get('accounts', 0),
            "lsr_volume": derivatives_data.get('lsr', {}).get('volume', 0),
            "liquidations_count": len(derivatives_data.get('liquidations', {}).get('series', []))
        }
        
        # Escrever CSV
        with open(filepath, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=csv_data.keys())
            writer.writeheader()
            writer.writerow(csv_data)
        
        return filepath
    
    def export_alerts_csv(self, alerts: List[Dict]) -> str:
        """Exporta alertas para CSV."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"alerts_{timestamp}.csv"
        filepath = os.path.join(self.export_dir, filename)
        
        if not alerts:
            return None
        
        # Escrever CSV
        with open(filepath, 'w', newline='', encoding='utf-8') as csvfile:
            fieldnames = ['alert_id', 'symbol', 'alert_type', 'message', 'threshold', 
                         'current_value', 'triggered_at', 'trigger_count']
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            
            for alert in alerts:
                writer.writerow({
                    'alert_id': alert.get('alert_id', ''),
                    'symbol': alert.get('symbol', ''),
                    'alert_type': alert.get('alert_type', ''),
                    'message': alert.get('message', ''),
                    'threshold': alert.get('threshold', 0),
                    'current_value': alert.get('current_value', 0),
                    'triggered_at': alert.get('triggered_at', ''),
                    'trigger_count': alert.get('trigger_count', 0)
                })
        
        return filepath
    
    def export_market_report_pdf(self, symbol: str, market_data: Dict[str, Any], 
                                indicators: Dict[str, Any] = None,
                                derivatives_data: Dict[str, Any] = None) -> str:
        """Exporta relatório completo de mercado para PDF."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{symbol}_market_report_{timestamp}.pdf"
        filepath = os.path.join(self.export_dir, filename)
        
        # Criar PDF
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Arial", size=12)
        
        # Título
        pdf.cell(200, 10, txt=f"SNE Radar - Relatório de Mercado: {symbol}", 
                ln=1, align="C")
        pdf.cell(200, 10, txt=f"Gerado em: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}", 
                ln=1, align="C")
        pdf.ln(10)
        
        # Dados básicos
        pdf.set_font("Arial", size=10, style="B")
        pdf.cell(200, 10, txt="DADOS BÁSICOS", ln=1)
        pdf.set_font("Arial", size=9)
        
        basic_data = [
            ("Preço Atual", f"${market_data.get('price', 0):.2f}"),
            ("Variação 24h", f"{market_data.get('variacao_preco', 0):.2f}%"),
            ("Volume Ratio", f"{market_data.get('volume_ratio', 0):.2f}x"),
            ("RSI", f"{market_data.get('rsi', 0):.1f}"),
            ("Volatilidade", f"{market_data.get('volatilidade', 0):.2f}%"),
            ("Tendência Curta", market_data.get('tendencia_curta', 'N/A')),
            ("Tendência Longa", market_data.get('tendencia_longa', 'N/A'))
        ]
        
        for label, value in basic_data:
            pdf.cell(100, 8, txt=f"{label}:", ln=0)
            pdf.cell(100, 8, txt=str(value), ln=1)
        
        pdf.ln(5)
        
        # Médias móveis
        pdf.set_font("Arial", size=10, style="B")
        pdf.cell(200, 10, txt="MÉDIAS MÓVEIS", ln=1)
        pdf.set_font("Arial", size=9)
        
        ma_data = [
            ("EMA 8", f"${market_data.get('ema8', 0):.2f}"),
            ("EMA 21", f"${market_data.get('ema21', 0):.2f}"),
            ("SMA 200", f"${market_data.get('sma200', 0):.2f}"),
            ("Suporte", f"${market_data.get('suporte', 0):.2f}"),
            ("Resistência", f"${market_data.get('resistencia', 0):.2f}")
        ]
        
        for label, value in ma_data:
            pdf.cell(100, 8, txt=f"{label}:", ln=0)
            pdf.cell(100, 8, txt=str(value), ln=1)
        
        pdf.ln(5)
        
        # Indicadores avançados
        if indicators:
            pdf.set_font("Arial", size=10, style="B")
            pdf.cell(200, 10, txt="INDICADORES AVANÇADOS", ln=1)
            pdf.set_font("Arial", size=9)
            
            # Bollinger Bands
            bb = indicators.get('bollinger', {})
            pdf.cell(200, 8, txt="Bollinger Bands:", ln=1)
            pdf.cell(100, 6, txt=f"  Superior: ${bb.get('upper', 0):.2f}", ln=0)
            pdf.cell(100, 6, txt=f"Média: ${bb.get('middle', 0):.2f}", ln=1)
            pdf.cell(100, 6, txt=f"  Inferior: ${bb.get('lower', 0):.2f}", ln=0)
            pdf.cell(100, 6, txt=f"Largura: {bb.get('width', 0):.2f}%", ln=1)
            
            # Stochastic
            stoch = indicators.get('stochastic', {})
            pdf.cell(200, 8, txt="Stochastic:", ln=1)
            pdf.cell(100, 6, txt=f"  %K: {stoch.get('k', 0):.1f}", ln=0)
            pdf.cell(100, 6, txt=f"%D: {stoch.get('d', 0):.1f}", ln=1)
            
            # ADX
            adx = indicators.get('adx', {})
            pdf.cell(200, 8, txt="ADX:", ln=1)
            pdf.cell(100, 6, txt=f"  ADX: {adx.get('adx', 0):.1f}", ln=0)
            pdf.cell(100, 6, txt=f"Tendência: {adx.get('trend', 'N/A')}", ln=1)
            
            pdf.ln(5)
        
        # Derivativos
        if derivatives_data:
            pdf.set_font("Arial", size=10, style="B")
            pdf.cell(200, 10, txt="DERIVATIVOS", ln=1)
            pdf.set_font("Arial", size=9)
            
            funding = derivatives_data.get('funding', {})
            oi = derivatives_data.get('oi', {})
            lsr = derivatives_data.get('lsr', {})
            
            pdf.cell(100, 8, txt=f"Funding Z-Score: {funding.get('zscore', 0):.2f}", ln=1)
            pdf.cell(100, 8, txt=f"OI Delta: {oi.get('delta_pct', 0):.2f}%", ln=1)
            pdf.cell(100, 8, txt=f"LSR Accounts: {lsr.get('accounts', 0):.2f}", ln=1)
            pdf.cell(100, 8, txt=f"LSR Volume: {lsr.get('volume', 0):.2f}", ln=1)
        
        # Salvar PDF
        pdf.output(filepath)
        return filepath
    
    def get_export_list(self) -> List[Dict[str, str]]:
        """Retorna lista de arquivos exportados."""
        exports = []
        if os.path.exists(self.export_dir):
            for filename in os.listdir(self.export_dir):
                filepath = os.path.join(self.export_dir, filename)
                if os.path.isfile(filepath):
                    stat = os.stat(filepath)
                    exports.append({
                        "filename": filename,
                        "filepath": filepath,
                        "size": stat.st_size,
                        "created": datetime.fromtimestamp(stat.st_ctime).isoformat()
                    })
        
        # Ordenar por data de criação (mais recentes primeiro)
        exports.sort(key=lambda x: x['created'], reverse=True)
        return exports
    
    def delete_export(self, filename: str) -> bool:
        """Remove um arquivo de exportação."""
        filepath = os.path.join(self.export_dir, filename)
        if os.path.exists(filepath):
            os.remove(filepath)
            return True
        return False

# Instância global do exportador
data_exporter = DataExporter()

