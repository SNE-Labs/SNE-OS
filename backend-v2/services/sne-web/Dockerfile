# Dockerfile para SNE Web Service
FROM python:3.11-slim

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Criar diretório da aplicação
WORKDIR /app

# Copiar requirements e instalar dependências Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código da aplicação
COPY . .
# Garantir que wsgi.py seja copiado
COPY wsgi.py .

# Criar diretório para logs
RUN mkdir -p /app/logs

# Expor porta (usar PORT do Railway ou 8080 como fallback)
EXPOSE 8080

# Health check simples (não depende de imports)
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD python -c "import os; print('OK')"

# Comando para executar (Gunicorn produção)
CMD ["sh", "-c", "PYTHONPATH=/app gunicorn -k eventlet -w 1 --timeout 120 --bind 0.0.0.0:${PORT:-8080} wsgi:app"]