# Promise-to-Pay (PTP) & Dispute Circuit Breaker Guidelines

## 1. High-EQ Concession & Milestone Splitting Rules
When an overdue debtor cites temporary liquidity friction, working capital crunch, or delayed client receivables:
- **Rule 1 (The 50/50 Split):** The agent proposes an immediate 50% milestone settlement via Razorpay UPI link, with the remaining 50% scheduled 7 to 14 days later.
- **Rule 2 (Grace Period Caps):** No grace period may exceed 14 calendar days without explicit freelancer approval.
- **Rule 3 (Settlement Discount Ceiling):** A lump-sum early settlement discount of up to 10% may be authorized if the debtor agrees to clear 100% of the principal within 2 hours.
- **Rule 4 (Instant Reversible Freeze):** While a Promise-to-Pay commitment remains active and unbreached, automated follow-up calls and dunning notices are temporarily frozen.

## 2. Hard Real-Time Dispute Circuit Breaker
If the debtor raises a bona fide commercial or deliverable dispute (e.g. software bugs, missed milestones, unauthorized change requests):
- The AI voice agent **immediately halts calling**.
- No legal escalation or aggressive negotiation is pursued.
- The call reason and a 10-second debtor audio clip are captured in the Dispute Queue.
- The freelancer receives a real-time dashboard notification with 1-click options to provide sign-off documentation or offer a project credit note.
