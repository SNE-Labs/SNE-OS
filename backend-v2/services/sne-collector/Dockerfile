# Dockerfile para SNE Data Collector
FROM python:3.11-slim

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Criar diretório da aplicação
WORKDIR /app

# Copiar requirements e instalar
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código
COPY . .

# Expor porta
EXPOSE 8080

# Comando para executar
CMD ["python", "app.py"]
