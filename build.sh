#!/bin/bash
# Script de build para Vercel
set -e  # Exit on error

# Verificar se o diretório frontend existe
if [ ! -d "frontend" ]; then
  echo "❌ Diretório 'frontend' não encontrado!"
  echo "📋 Conteúdo do diretório atual:"
  ls -la
  exit 1
fi

# Entrar no diretório frontend
cd frontend

# Instalar dependências
echo "📦 Instalando dependências..."
npm install

# Build
echo "🔨 Executando build..."
npm run build

echo "✅ Build concluído!"

