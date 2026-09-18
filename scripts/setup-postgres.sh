#!/bin/bash
set -e

echo "Configurando PostgreSQL para EasyFood..."

sudo systemctl start postgresql

sudo -u postgres psql << 'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'easyfood') THEN
    CREATE USER easyfood WITH PASSWORD 'easyfood';
  END IF;
END
$$;

SELECT 'CREATE DATABASE easyfood OWNER easyfood'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'easyfood')\gexec

GRANT ALL PRIVILEGES ON DATABASE easyfood TO easyfood;
SQL

sudo -u postgres psql -d easyfood << 'SQL'
GRANT ALL ON SCHEMA public TO easyfood;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO easyfood;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO easyfood;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO easyfood;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO easyfood;
SQL

echo ""
echo "PostgreSQL pronto."
echo "Depois rode: npm start"
