#!/bin/bash
# Script de build para Vercel
cd frontend || exit 1
npm install
npm run build

