# 001 — Modular monolith, not microservices

## Decision

Use a modular monolith: one NestJS application with clearly separated
modules (auth, users, securities, market-data, theses, counter-theses,
comments, reactions, watchlists, track-record, leaderboard, notifications,
admin), not separate services.

## Why

The product is small and needs clear module boundaries so the codebase
stays navigable as it grows, without the operational overhead of service
discovery, inter-service networking, distributed deployment, or the
failure modes that come with them. Those concerns (section 26 of the spec
marks Kubernetes, Kafka, gRPC, service discovery, and distributed tracing
as explicitly [SKIP] for this project) aren't justified at this scale.

## Status

Accepted. Revisit only if a specific module's load or team ownership
genuinely requires splitting it out — not preemptively.
