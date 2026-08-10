# 🏗️ Architecture

## Stack

### Frontend
- Angular
- Three.js
- WebSocket

### Backend
- Spring Boot
- Spring WebSocket
- Spring Data JPA

### Data
- PostgreSQL
- Redis — only if needed

### AI
- LLM provider through a dedicated AI service

### Infrastructure
- Docker
- GitHub Actions

---

## High-Level Architecture

```text
                    ┌─────────────────┐
                    │     Angular     │
                    │    + Three.js   │
                    └────────┬────────┘
                             │
                       REST / WebSocket
                             │
                    ┌────────▼────────┐
                    │   Spring Boot   │
                    └────────┬────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
    Chat Service        AI Service        Mood Service
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
                    ┌────────▼────────┐
                    │   PostgreSQL    │
                    └─────────────────┘
```

Redis can be added later for caching, shared real-time state or scaling.

---

## Frontend Responsibilities

Angular handles:

- UI
- navigation
- chat
- authentication
- WebSocket communication
- real-time events

Three.js handles:

- Solar System rendering
- planets
- camera
- animations
- visual effects
- mood reactions

The frontend should not be responsible for authoritative business logic.

---

## Backend Responsibilities

Spring Boot handles:

- authentication
- users
- conversations
- messages
- Planet AI interactions
- memory
- mood processing
- real-time events
- persistence
- authorization

The backend is the source of truth.

---

## Communication

### REST

Used for:

- authentication
- loading data
- conversation history
- user profiles
- non-real-time operations

### WebSocket

Used for:

- messages
- AI responses
- typing indicators
- user presence
- mood changes
- planet events

---

## AI Architecture

AI calls go through a dedicated service.

```text
Chat Service
     │
     ▼
 AI Service
     │
     ▼
LLM Provider
```

The rest of the application should not depend directly on a specific AI provider.

---

## Mood Architecture

Mood processing happens on the backend.

```text
Message
   │
   ▼
Mood Service
   │
   ▼
Conversation Mood
   │
   ▼
Planet Mood
   │
   ▼
WebSocket Event
   │
   ▼
Angular / Three.js
```

The client displays the mood but does not determine the official state.

---

## Persistent Data

PostgreSQL stores:

- users
- planets
- conversations
- messages
- relationships
- memories

Temporary real-time state can live in application memory initially.

Redis can be introduced later if needed.

---

## Architecture Principles

### Keep it modular

Each feature should have a clear responsibility.

### Avoid premature microservices

No microservices unless there is an actual reason for them.

### Keep AI replaceable

The AI provider should be replaceable without rewriting the application.

### Backend is the source of truth

Important state should not be controlled exclusively by the client.