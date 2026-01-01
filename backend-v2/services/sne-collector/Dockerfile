# Dockerfile para SNE Data Collector
FROM python:3.11-slim

# Criar diretório da aplicação
WORKDIR /app

# Copiar requirements e instalar
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código
COPY app.py .

# Comando para executar (gunicorn produção)
CMD ["sh", "-c", "gunicorn -b 0.0.0.0:${PORT:-8080} app:app"]
