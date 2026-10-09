<proposed_plan>
# Per-key rate limiting for the public API

## Summary
Add a token-bucket rate limiter in front of the public API, keyed by API key, with headers that tell clients how much budget is left.

## Key Changes
- New middleware `src/middleware/rateLimit.ts` mounted before the router in `src/server.ts`.
- Bucket state lives behind a small `RateStore` interface; Option A: in-process LRU store; Option B: Redis store shared by all instances. Recommended: Option B.
- Responses include `X-RateLimit-Remaining` and `Retry-After` on 429.
- Should limits be configured per plan tier or per individual key?
- Burst size is TBD: 2x or 5x the per-second rate, pick one before rollout.

## Test Plan
- Unit tests for bucket refill math with a fake clock.
- 429 path returns `Retry-After` and does not call the handler.
- Load test: 1,000 requests across 10 keys, no cross-key leakage.

## Assumptions
- Internal health checks (`/healthz`) are exempt.
- Clock skew between instances is under 1 second.
</proposed_plan>
