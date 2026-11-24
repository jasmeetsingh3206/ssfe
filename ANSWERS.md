# Answers

## Q1. B-104 after import

**Matched:** L-1 (CH-11), L-2 (CH-12), L-3 (CH-21, reversal), L-4 (CH-21), L-5 (CH-31, via original code 88307), L-8 (CH-51).

**Unmatched:**
- L-6: two charges fit (CH-41 and CH-42), not exactly one.
- L-7: no charge for claim C-999.
- L-9: invalid. Billed 40.00 ≠ paid 25.00 + adjustments 10.00.

**Totals:** Matched $230.00, Unmatched $275.00.

**Not ready to post:** 3 lines are unmatched, and the totals are $275.00 short of $505.00.

## Q2. Rounding

| Case | Shares |
|---|---|
| (a) L-6, 200.00 across CH-41, CH-42 | CH-41 100.00, CH-42 100.00 |
| (b) 100.01 across CH-1 (60.00), CH-2 (40.00) | CH-1 60.01, CH-2 40.00 |
| (c) 100.00 across three charges of 33.33 | CH-1 33.34, CH-2 33.33, CH-3 33.33 |
| (d) −100.01 across CH-1, CH-2 | CH-1 −60.01, CH-2 −40.00 |

(b) rounds down to 60.00 and 40.00, and the leftover cent goes to the largest charge. In (c) all three are equal, so the leftover cent goes to the lowest id. (d) is (b) with the sign applied.

## Q3. Two users on L-6

Both start with L-6 Unmatched, version 1.

1. A splits L-6. A's row shows the split straight away. The server saves it as version 2, and A's row takes the server copy.
2. B clicks Suspense. B's row shows Suspense straight away. B's request still says version 1, so the server answers 409 with A's line (version 2).
3. B's row goes back to Unmatched. B sees "L-6 was changed by someone else", with B's change ("Move to Suspense") next to the server's line ("Matched: CH-41 $100.00, CH-42 $100.00").
4. B chooses:
   - **Take theirs:** B's row shows A's split. Nothing is sent.
   - **Keep mine:** Suspense is sent again with version 2 and saved as version 3. A sees this after a reload, or gets the same 409 if A edits L-6.

## Q4. Keeping the preview and the server in step

- Keep the rule's examples in one shared test file. Both the front-end tests and the .NET tests check against it, so a rule change has to update both sides or the build fails.
- Better still: add a server "preview" endpoint and show its numbers in the dialog, so there is only one implementation.
- The UI already replaces the preview with the server's saved result, so any difference is corrected as soon as the save returns.
