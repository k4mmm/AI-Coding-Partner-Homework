# Architecture

High-level design of the Support Ticket System.

## Overview

Components:
- Express API: handles HTTP requests and error responses
- Tickets Router: REST endpoints, filtering, and orchestration
- Ticket Model: validation via Joi
- Import Service: CSV/JSON/XML parsing and normalization
- Classification Service: rule-based categorization and priority
- In-memory Store: tickets and decision logs (replaceable with DB)

## Diagram

```mermaid
flowchart LR
  Client --> Middleware[JSON Middleware]
  Middleware --> Router[Tickets Router]
  Router --> Model[Ticket Model]
  Router --> Import[Import Service]
  Router --> Classify[Classification Service]
  Router --> Store[(In-memory Store)]
  Classify --> Logs[(Decision Logs)]
```

## Data Flow (Auto-Classification)

```mermaid
sequenceDiagram
  participant C as Client
  participant R as Router
  participant M as Model
  participant S as Service
  participant DB as Store
  C->>R: POST /tickets?auto_classify=true
  R->>M: Validate input
  M-->>R: Valid ticket
  R->>S: classifyTicket(ticket)
  S-->>R: decision + updated ticket
  R->>DB: createTicket(updated)
  DB-->>R: OK
  R-->>C: 201 Created (ticket)
```

## Design Decisions & Trade-offs
- In-memory store: rapid iteration; production usage would swap with persistent DB
- Rule-based classification: deterministic, transparent, no external ML dependency
- Import via raw content: simplifies testing without multipart handling
- Validation via Joi: clear constraints and error messages

## Security Considerations
- Input validation on all endpoints
- Reject malformed files with detailed errors
- No file system writes during API operations
- Avoids executing user-supplied code

## Performance Considerations
- In-memory operations are fast; filters are O(n) over dataset
- CSV/JSON/XML parsing uses efficient libraries
- Simple thresholds validated via performance tests

---
Authored using AI model: Llama (Technical Leads)
