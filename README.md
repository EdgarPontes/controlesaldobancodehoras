# Controle de Saldo de Banco de Horas

Sistema de controle de ponto e banco de horas com interface web.

## 🚀 Executando com Docker

### Pré-requisitos

- Docker 20.10+
- Docker Compose 1.29+

### Instalação

1. **Clone o repositório**
```bash
git clone <seu-repositorio>
cd controlesaldobancodehoras
```

2. **Configure as variáveis de ambiente**
```bash
# Copie o arquivo de exemplo
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:
```env
# Banco de dados (externo ou local)
DATABASE_URL=postgresql://usuario:senha@localhost:5432/controle_ponto

# JWT Secret (gere uma chave segura)
JWT_SECRET=sua_chave_secreta_aqui_mude_isso

# Porta
PORT=3000
```

3. **Build e start**
```bash
# Build da imagem
docker compose build

# Iniciar em modo detached
docker compose up -d

# Ver logs
docker compose logs -f

# Parar os serviços
docker compose down
```

### Acessando a Aplicação

- **Frontend:** http://localhost:3000
- **API:** http://localhost:3000/api/trpc

### Primeiro Acesso

Na primeira vez que acessar a aplicação, você pode se registrar criando uma conta. Após o registro, você será redirecionado para o dashboard.

## 🛠️ Tecnologias

- **Frontend:** React + TypeScript + Tailwind CSS
- **Backend:** Node.js + Express + tRPC
- **Banco de Dados:** PostgreSQL + Drizzle ORM
- **Autenticação:** JWT

## 📁 Estrutura do Projeto

```
.
├── client/                 # Frontend (React)
│   ├── src/
│   │   ├── components/     # Componentes reutilizáveis
│   │   ├── pages/          # Páginas da aplicação
│   │   ├── lib/            # Configurações (tRPC, etc)
│   │   └── _core/          # Hooks e lógica compartilhada
│   └── public/             # Arquivos públicos
├── server/                 # Backend (Node.js + Express)
│   ├── _core/              # Configurações e middlewares
│   ├── db.ts               # Funções de banco de dados
│   ├── routers.ts          # Rotas tRPC
│   ├── auth.ts             # Autenticação
│   ├── importService.ts    # Importação de Excel
│   └── timeCalculations.ts # Cálculos de horário
├── drizzle/                # Migrations e schema do banco
├── shared/                 # Código compartilhado entre client e server
├── Dockerfile              # Multi-stage build para produção
├── docker-compose.yml      # Orquestração de containers
└── package.json
```

## 🔧 Scripts Disponíveis

```bash
# Desenvolvimento (Linux/Mac)
pnpm dev

# Build para produção
pnpm build

# Executar em produção
pnpm start

# Executar migrations
pnpm db:push

# Formatação
pnpm format

# Testes
pnpm test
```

## 🔐 Variáveis de Ambiente

| Variável | Descrição | Obrigatória | Padrão |
|----------|-----------|-------------|--------|
| `DATABASE_URL` | URL de conexão com o banco de dados | Sim | - |
| `JWT_SECRET` | Chave secreta para JWT | Sim | - |
| `NODE_ENV` | Ambiente (production/development) | Não | `production` |
| `PORT` | Porta do servidor | Não | `3000` |
| `POSTGRES_USER` | Usuário PostgreSQL (docker-compose) | Não | `postgres` |
| `POSTGRES_PASSWORD` | Senha PostgreSQL (docker-compose) | Não | `postgres` |
| `POSTGRES_DB` | Nome do banco PostgreSQL (docker-compose) | Não | `controle_ponto` |

## 📊 Banco de Dados

### Migration Inicial

Em desenvolvimento, as migrations são executadas automaticamente. Para atualizar o schema:

```bash
pnpm db:push
```

## 🚀 Deploy em Produção

### Build e Deploy Manual

```bash
# Build da imagem
docker compose build

# Iniciar serviços
docker compose up -d

# Verificar status
docker compose ps

# Ver logs
docker compose logs -f app
```

### Variáveis de Ambiente em Produção

Certifique-se de configurar corretamente:
- `DATABASE_URL` - Use o banco de dados de produção
- `JWT_SECRET` - Use uma chave forte e segura
- `NODE_ENV=production`

## 🐛 Troubleshooting

### Erro de conexão com banco de dados
- Verifique se o banco de dados está acessível pela URL informada
- Verifique as credenciais no arquivo `.env`

### Erro 500 na inicialização
- Verifique os logs: `docker compose logs app`
- Certifique-se que o banco está pronto antes de acessar a aplicação (aguarde ~30s após o start)

### Porta já em uso
- Altere a porta no `docker-compose.yml` ou libere a porta 3000

## 📝 Licença

MIT