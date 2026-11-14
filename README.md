# Orders API — Gestão de Pedidos

API REST de Gestão de Pedidos desenvolvida em **Node.js 20 + TypeScript (strict)** seguindo os requisitos do **Projeto B (Nível Simples)** do curso **Full Cycle — Engenharia de Software**.

## Stack Tecnológica
- **Runtime & Linguagem:** Node.js 20, TypeScript (`strict`)
- **Framework HTTP:** Fastify
- **Banco de Dados:** PostgreSQL (`pg`) com pool de conexões e repositório em memória para testes
- **Observabilidade:** `pino` (logs estruturados em JSON) e `prom-client` (métricas Prometheus)
- **Testes & Qualidade:** Vitest, `@vitest/coverage-v8`, Supertest, ESLint, k6 (smoke test)
- **Infraestrutura & CI:** Docker (multi-stage), Docker Compose e GitHub Actions

## Arquitetura
O projeto segue separação em camadas inspirada em Clean Architecture:
- `src/domain/`: Entidade `Order` (regras de negócio, cálculo de total e máquina de estados) e interface `OrderRepository`.
- `src/usecases/`: Casos de uso (`CreateOrderUseCase`, `GetOrderUseCase`, `ListOrdersUseCase`, `UpdateOrderStatusUseCase`).
- `src/infra/`: Adaptadores de banco de dados (`PostgresOrderRepository`, `InMemoryOrderRepository`), servidor HTTP Fastify (`app.ts`, `routes.ts`) e observabilidade (`logger.ts`, `metrics.ts`).

## Como Executar

### 1. Com Docker Compose (1 comando — recomendado)
Sobe a API e o banco PostgreSQL 16 (já inicializado com `init.sql`):
```bash
docker compose up --build -d
```
Para encerrar e remover volumes:
```bash
docker compose down -v
```

### 2. Execução Local (sem Docker)
Copie o arquivo de variáveis de ambiente e instale as dependências:
```bash
cp .env.example .env
npm install
```
Para rodar em modo desenvolvimento usando repositório em memória (sem precisar de PostgreSQL local):
```bash
# Linux/macOS
USE_IN_MEMORY=true npm run dev

# PowerShell (Windows)
$env:USE_IN_MEMORY="true"; npm run dev
```

## Endpoints Disponíveis

| Método | Rota | Descrição |
| --- | --- | --- |
| `POST` | `/orders` | Cria um novo pedido (`PENDING`) |
| `GET` | `/orders` | Lista todos os pedidos |
| `GET` | `/orders/:id` | Busca um pedido por ID |
| `PATCH` | `/orders/:id/status` | Atualiza o status (`PAID`, `SHIPPED`, `DELIVERED`, `CANCELLED`) |
| `GET` | `/health` | Healthcheck da aplicação e do banco |
| `GET` | `/metrics` | Métricas no formato Prometheus |

### Exemplo rápido (`curl`)
```bash
# Criar pedido
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{"customerId":"cust-001","items":[{"productId":"sku-100","quantity":2,"unitPrice":49.9}]}'

# Healthcheck
curl http://localhost:3000/health
```

## Testes, Lint e Build
```bash
npm run lint           # Verificação ESLint
npm run typecheck      # Checagem de tipos TypeScript (strict)
npm run test:coverage  # Testes unitários + integração com cobertura
npm run build          # Compilação para dist/
```

## Documentação Adicional
- [Especificação OpenAPI](docs/openapi.yaml)
- [ADR 0001 — Decisões Arquiteturais](docs/adr/0001-decisao.md)
- [Relatório de Desempenho e Observabilidade](docs/desempenho.md)
- [Uso de IA no Desenvolvimento](docs/ia.md)
