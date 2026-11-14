# Uso de Inteligência Artificial no Desenvolvimento

## 1. Ferramenta e Papel da IA
Durante o desenvolvimento da **Orders API**, foi utilizado um assistente de engenharia de software baseado em IA como ferramenta de apoio à produtividade, seguindo revisão humana e validação automatizada rigorosa.

## 2. Onde a IA foi utilizada
- **Estruturação inicial (Scaffolding):** geração da árvore de diretórios, configurações de TypeScript (`strict`), Vitest, ESLint, Dockerfile multi-stage e `docker-compose.yml`.
- **Implementação de boilerplate e adaptadores:** estruturação das rotas Fastify, schemas OpenAPI, repositório PostgreSQL parametrizado e configuração de observabilidade (`pino` e `prom-client`).
- **Testes automatizados:** criação de cenários unitários da entidade `Order` (invariantes e máquina de estados) e testes de integração HTTP com `supertest`.
- **Documentação:** rascunho inicial de ADR, especificação `openapi.yaml` e guia de desempenho.

## 3. Validação e Controle de Qualidade
Todo código gerado ou sugerido por IA passou pelas seguintes barreiras de verificação:
1. Análise estática com `eslint` e checagem de tipos com `tsc --noEmit` em modo `strict`.
2. Execução completa da suíte de testes unitários e de integração (`vitest run --coverage`) com limiares mínimos de cobertura.
3. Revisão arquitetural para garantir isolamento do domínio (`src/domain` sem dependências de infraestrutura).
4. Verificação de segurança: uso exclusivo de queries parametrizadas (`$1`, `$2`, ...) no PostgreSQL e redação de headers sensíveis nos logs `pino`.
