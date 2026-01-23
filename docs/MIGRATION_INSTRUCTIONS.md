# Migration / Remediation Instructions: Re-include excluded airdrop addresses

If an airdrop address was excluded after receiving tokens and its visible `balanceOf` reads 0, perform the following steps to restore the visible balance.

Options

1) If you have direct owner control (EOA or multisig with direct call rights)
- As owner, call `excludeFromFee(airdropAddress, false)` on the token contract.
- This will restore the previous reflected `_rOwned` value (if present) and make `balanceOf()` return the correct token amount again.

2) If the owner is a timelock / multisig that requires queuing
- Prepare the calldata for `excludeFromFee(airdropAddress, false)`.
- Example script: `scripts/remediation/queueIncludeAirdrop.ts` creates the calldata and prints an example timelock `queueTransaction` call. Use it like:
  - npx hardhat run --network mainnet scripts/remediation/queueIncludeAirdrop.ts -- <airdropAddress> --timelock <timelockAddress>
- Once queued, wait for timelock delay to pass, then execute the queued transaction.

Notes and caveats
- The fix preserves exact reflected balances by using stored `_rOwnedWhenExcluded` values where possible. This ensures a lossless roundtrip for exclude/include even when the reflection rate changes.
- The operation is safe but requires owner/timelock permissions. Do not attempt to call it from an address without the appropriate role.
- After inclusion, confirm the `AccountIncludedInFees` event is emitted and `balanceOf(airdropAddress)` returns the expected value.

Diagnostics
- Use `scripts/check-token-balances.ts` (updated) to detect excluded addresses that still hold reflected balances. The script prints a warning message when it finds such addresses.

Audit
- This change is covered by unit tests in `test/excludeFromFee.test.ts`. Consider running a full test suite and a focused review before deploying the updated contract to production.
