## Fix: Safe exclude/include behavior for ReflectiveToken

Summary
- Problem: Calling `excludeFromFee(address, true)` on an address that already held tokens left the address with `tOwned == 0` and the token balance represented only in `_rOwned` (reflection storage). After exclusion, `balanceOf()` read `_tOwned` and thus returned 0, making tokens appear inaccessible.

Fix implemented
- `excludeFromFee(account, true)` now:
  - Converts the account's reflected balance (`_rOwned[account]`) into token balance (`_tOwned[account]`) using `tokenFromReflection`, and stores the original `_rOwned` value in `_rOwnedWhenExcluded[account]`.
  - Removes the reflected balance from `_rOwned` and adjusts `_rTotal` accordingly.
- `excludeFromFee(account, false)` now:
  - Restores the original reflected balance from `_rOwnedWhenExcluded[account]` (if present) back into `_rOwned` and `_rTotal` for exact restoration; otherwise it falls back to calculating a reflection amount using the current rate.
- Added events: `AccountExcludedFromFees` and `AccountIncludedInFees` for auditability.
- Added unit tests covering exclude/include and transfer behavior.

Why this is safe
- Restoring stored `_rOwned` ensures `exclude -> include` is a lossless roundtrip even with rate changes.
- The change is covered by unit tests and does not change public interfaces other than adding events.

Usage notes
- If you find an address with `isExcluded == true` and `tOwned == 0` but `rOwned > 0`, re-include it as owner by calling `excludeFromFee(address, false)` or run the included `check-token-balances.ts` script to detect and report such addresses.

Tests
- New tests: `test/excludeFromFee.test.ts` verify correct behavior and transfers.

