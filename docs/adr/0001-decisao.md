# ADR 0001: Arquitetura, Framework HTTP e Estratégia de Persistência para Orders API

## Status
Aceito

## Contexto
O Projeto B exige uma API REST de Gestão de Pedidos (`Orders API`) em Node.js 20 + TypeScript (`strict`), com foco em clareza arquitetural, alta testabilidade, observabilidade nativa (logs estruturados e métricas Prometheus) e execução simplificada com apenas um comando via Docker Compose.

## Decisões
1. **Arquitetura em Camadas / Clean Architecture Simplificada:**
   - `domain/`: Entidade `Order` com invariantes de negócio (cálculo de total, validação de itens e máquina de estados de transição de status) e interface `OrderRepository`.
   - `usecases/`: Casos de uso desacoplados de framework HTTP e banco de dados (`CreateOrderUseCase`, `GetOrderUseCase`, `ListOrdersUseCase`, `UpdateOrderStatusUseCase`).
   - `infra/`: Adaptadores concretos para Fastify (`http/`), PostgreSQL e repositório em memória (`database/`), além de `pino` e `prom-client` (`observability/`).

2. **Fastify como Framework HTTP:**
   - Escolhido pela baixa sobrecarga, validação nativa de schemas JSON (Ajv) e integração direta com `pino` para logs estruturados.

3. **PostgreSQL (`pg`) com Repositório Dual (`PostgresOrderRepository` e `InMemoryOrderRepository`):**
   - Produção e Docker Compose utilizam `PostgresOrderRepository` com queries parametrizadas e tabela inicializada via `init.sql`.
   - Testes automatizados e execuções rápidas locais utilizam `InMemoryOrderRepository`, permitindo testes determinísticos e rápidos sem dependência externa.

4. **Observabilidade com `pino` e `prom-client`:**
   - Logs em JSON estruturado com redação de headers sensíveis.
   - Endpoint `/metrics` expondo métricas padrão de processo Node.js e métricas customizadas (`http_requests_total`, `http_request_duration_seconds`, `orders_created_total`, `orders_status_updated_total`).

## Consequências
- **Positivas:** Domínio 100% isolado e testado unitariamente; testes de integração rápidos via `supertest`; fácil substituição de banco de dados; pipeline de CI enxuto e confiável.
- **Negativas / Trade-offs:** Necessidade de manter os schemas SQL (`init.sql`) e de validação HTTP sincronizados manualmente.
