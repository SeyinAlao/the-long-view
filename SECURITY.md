# Security Policy

The Long View is a pre-release, personal project. There is no bug bounty and
no production deployment holding real user funds or brokerage access.

## Reporting a vulnerability

If you find a security issue (auth bypass, data exposure, injection, or a way
to bypass thesis immutability), please open a private report rather than a
public issue:

- Email: seyinalao@gmail.com
- Include: a description of the issue, steps to reproduce, and the affected
  endpoint or component.

You should get an acknowledgement within a few days. This is a solo project,
so response times will vary.

## Scope

In scope: the NestJS API, the Next.js frontend, and the Prisma schema in this
repository.

Out of scope: third-party services this project may later integrate with
(market data providers, hosting providers), which have their own security
policies.
