# Configuração de Banco de Dados

Este projeto suporta **PostgreSQL** e **MySQL**. O tipo de banco é detectado automaticamente pela URL de conexão.

## Configuração via Variável de Ambiente

A conexão com o banco de dados é configurada através da variável de ambiente `DATABASE_URL`.

### PostgreSQL

```bash
DATABASE_URL=postgresql://username:password@localhost:5432/controle_ponto
```

**Ou com a sintaxe alternativa:**

```bash
DATABASE_URL=postgres://username:password@localhost:5432/controle_ponto
```

### MySQL

```bash
DATABASE_URL=mysql://username:password@localhost:3306/controle_ponto
```

## Configuração no Manus

Para configurar a variável `DATABASE_URL` no seu projeto Manus:

1. Acesse a página de **Settings** do seu projeto
2. Vá para a seção **Secrets**
3. Adicione a variável `DATABASE_URL` com a URL de conexão apropriada

Ou use o comando:

```bash
webdev_request_secrets
```

## Instalação de Dependências

As dependências necessárias já estão instaladas:

- **PostgreSQL**: `pg` e `postgres` (para postgres-js)
- **MySQL**: `mysql2`
- **Drizzle ORM**: `drizzle-orm` (suporta ambos)

## Detecção Automática de Tipo de Banco

O projeto detecta automaticamente o tipo de banco pela URL:

- Se a URL começar com `postgresql://` ou `postgres://` → PostgreSQL
- Caso contrário → MySQL

## Migrações de Schema

Para gerar e aplicar migrações:

```bash
# Gerar migration SQL
pnpm drizzle-kit generate

# Aplicar migrations
pnpm drizzle-kit migrate
```

O Drizzle Kit detectará automaticamente o tipo de banco pela `DATABASE_URL`.

## Exemplo de Configuração Completa

### Desenvolvimento Local com PostgreSQL

```bash
# .env (local)
DATABASE_URL=postgresql://postgres:password@localhost:5432/controle_ponto

# Criar banco de dados
createdb controle_ponto

# Executar migrações
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

### Produção com PostgreSQL (Manus)

1. Crie um banco PostgreSQL (ex: Supabase, Railway, etc.)
2. Copie a URL de conexão
3. Adicione via `webdev_request_secrets` com a chave `DATABASE_URL`

## Troubleshooting

**Erro: "Cannot find package 'postgres'"**
- Execute: `pnpm add postgres`

**Erro: "Cannot find package 'mysql2'"**
- Execute: `pnpm add mysql2`

**Erro: "DATABASE_URL is required"**
- Certifique-se de que a variável de ambiente está configurada corretamente
- No Manus, verifique em Settings → Secrets

## Suporte a Múltiplos Bancos

O código está preparado para suportar ambos os bancos simultaneamente. A detecção ocorre em:

- `drizzle.config.ts` - Configuração do Drizzle Kit
- `server/db.ts` - Inicialização da conexão e operações de upsert

Não é necessário alterar código para trocar entre PostgreSQL e MySQL - apenas mude a `DATABASE_URL`.
