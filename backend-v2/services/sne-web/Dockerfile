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

# Criar diretório para logs
RUN mkdir -p /app/logs

# Expor porta (usar PORT do Railway ou 8080 como fallback)
EXPOSE 8080

# Health check removido temporariamente para debug

# Comando para executar (usar abordagem do commit funcional)
CMD sh -c "echo 'Starting Railway deployment...' && ls -la && python app.py"