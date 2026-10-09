I explored `src/mail/` and the scheduler. Here is the plan.

<proposed_plan>
# Send later for drafts

## Summary
Let users schedule a draft to be sent at a chosen time. Scheduled drafts are stored server-side and sent by the existing job runner, so closing the app does not cancel them.

## Key Changes
- Add `scheduled_at` to the drafts table and expose it on `PATCH /drafts/:id` (`src/api/drafts.ts`).
- New job `send-scheduled-drafts` in `src/jobs/sendScheduled.ts`, polled every minute by the job runner.
- Composer gets a "Send later" menu next to Send (`src/ui/composer/SendButton.tsx`).

## Decisions
- D1: Where is the schedule stored?
  - Option A: column on the drafts table (Recommended)
  - Option B: separate `scheduled_sends` table
  - Affects: `src/db/migrations/**`, `src/api/drafts.ts`
- D2: What happens if sending fails at the scheduled time?
  - Retry 3 times with backoff, then mark as failed (Recommended)
  - Mark as failed immediately and notify the user
  - Affects: `src/jobs/sendScheduled.ts`
- D3: Maximum schedule horizon?
  - 30 days
  - 1 year
  - Recommended: 30 days
- D4: Time zone for the picker: use the user's profile time zone or the device time zone?
  - Affects: `src/ui/composer/**`

## Test Plan
- Unit: job picks only drafts with `scheduled_at <= now` and not yet sent.
- Integration: schedule, restart the job runner, draft still sends once.
- UI: menu hidden when the draft has no recipients.

## Assumptions
- Drafts without recipients cannot be scheduled.
- Default horizon is 30 days unless D3 says otherwise.
</proposed_plan>
