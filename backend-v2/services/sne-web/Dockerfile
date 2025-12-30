FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy SNE modules (from services/sne-web directory where they were copied)
# Essential modules for motor_renan.py
COPY motor_renan.py ./
COPY contexto_global.py ./
COPY estrutura_mercado.py ./
COPY multi_timeframe.py ./
COPY confluencia.py ./
COPY fluxo_ativo.py ./
COPY catalogo_magnetico.py ./
COPY padroes_graficos.py ./
COPY indicadores.py ./
COPY indicadores_avancados.py ./
COPY analise_candles_detalhada.py ./
COPY gestao_risco_profissional.py ./
COPY relatorio_profissional.py ./
COPY calcular_suportes_resistencias.py ./
COPY niveis_operacionais.py ./

# Copy application code
COPY app/ ./app/

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8080/health')"

# Expose port
EXPOSE 8080

# Run with Gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "2", "--worker-class", "gevent", "--worker-connections", "1000", "--timeout", "120", "app.main:app"]

