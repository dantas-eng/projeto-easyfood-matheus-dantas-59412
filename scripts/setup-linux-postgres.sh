#!/bin/bash
set -e
echo "Verificando PostgreSQL..."
command -v psql >/dev/null || { echo "Instale: sudo apt install postgresql postgresql-contrib"; exit 1; }
sudo systemctl start postgresql
psql --version
pg_isready
echo "Criando banco easyfood..."
sudo -u postgres psql << 'SQL'
SELECT 'CREATE DATABASE easyfood'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'easyfood')\gexec
SQL
sudo -u postgres psql -c "\l" | grep easyfood
echo "Pronto. Ajuste DATABASE_URL no .env se a senha do postgres for diferente."
