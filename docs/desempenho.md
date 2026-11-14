# Relatório de Desempenho e Observabilidade

## 1. Objetivos de Desempenho (SLOs)
- **Disponibilidade:** 99.9% para endpoints de leitura e criação de pedidos.
- **Latência (p95):** < 200ms para `POST /orders`, `GET /orders/:id` e `GET /health`.
- **Taxa de Erro:** < 1% em testes de carga smoke.

## 2. Estratégia de Teste de Carga
O script [smoke.js](file:///tests/load/smoke.js) utiliza **k6** para validar o fluxo ponta a ponta sob carga leve contínua:
- **VUs (Virtual Users):** 5 usuários virtuais simultâneos
- **Duração:** 15 segundos
- **Cenário executado por iteração:**
  1. `GET /health`
  2. `POST /orders` (criação de pedido com 1 item)
  3. `GET /orders/:id` (consulta do pedido recém-criado)

### Como executar o teste de carga
```bash
# Suba a aplicação (Docker Compose ou local)
docker compose up --build -d

# Execute o smoke test com k6
k6 run tests/load/smoke.js
```

## 3. Métricas Coletadas (`/metrics`)
A aplicação expõe métricas no formato Prometheus via `prom-client`:
- `orders_api_*`: métricas padrão do runtime Node.js (CPU, memória, event loop lag, GC).
- `http_requests_total`: contador de requisições por `method`, `route` e `status_code`.
- `http_request_duration_seconds`: histograma de latência HTTP (buckets de `5ms` a `2.5s`).
- `orders_created_total`: total de pedidos criados.
- `orders_status_updated_total`: total de transições de status por estado destino.

## 4. Otimizações Implementadas
- **Pool de conexões PostgreSQL (`pg.Pool`):** máximo de 10 conexões reutilizáveis, evitando overhead de handshake por requisição.
- **Índices no banco (`init.sql`):** índices em `customer_id`, `status` e `created_at DESC` para acelerar consultas e listagens.
- **Build Docker Multi-stage:** imagem final baseada em `node:20-alpine` contendo apenas dependências de produção e código compilado (`dist/`).
