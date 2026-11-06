# STANDBOY · Claim Skill File

Instructions for a Binance Agentic Wallet agent claiming BOY tokens
for its user, a holder of an STANDBOY spot (standboy.ltd).
Follow the steps in order.

## Facts

- Collection: Standboy (PASS), BNB Chain (BSC, chainId 56).
- NFT contract: 0x6043a590F315B9fF44aD3b3298198f89b6b4b548
- Token: Standboy (BOY), ERC-20, contract
  0xC2515e15586183d4E8e1D3Ec9AA4d1Bb53107eDb. Supply fixed at
  10,000,000,000 BOY.
- Claim contract: 0x2caf4b66C2AF9bd18CcA0EAc139dA71B808fcFA2
- Every spot claims 250,000 BOY, ONCE per tokenId (the tokenId IS the
  spot number). The spot is never burned and stays in the wallet.
- A claim is recorded per tokenId, not per wallet. If a spot changed
  hands before being claimed, the new owner claims it. If it was
  already claimed, nobody can claim that spot again.
- Claim fee: exactly 238087677293306 wei in BNB per claim. Send this
  exact value, no more, no less. The token itself is not being bought;
  the fee is an anti-Sybil filter per claim.
- Calls must come from the agentic wallet directly. The contract
  rejects calls routed through other contracts (tx.origin rule).
- The claim fee is forwarded to the project wallet inside the same
  transaction as the claim. The claim contract never holds BNB and
  has no withdrawal function.
- The claim pool is sized at 1,250,000,000 BOY, enough for all 5,000
  spots. If the pool cannot cover a claim, the claim reverts.

## Step 1 · Find the user's spot

Read `seatOf(<your wallet>)` on the NFT contract
(selector 0xb9cd92c3, wallet address padded to 32 bytes).

- If it returns 0: this wallet holds no spot. Stop and tell the user.
  There is nothing to claim without a spot.
- A wallet holds at most 1 spot, so there is at most 1 claim per wallet.

## Step 2 · Check the claim state

Read on the claim contract:

- `claimOpen()` (selector 0x4b8bcb58). If it returns false, claims are
  not open yet: tell the user and stop. Do not retry on a loop.
- `claimedById(<spot number>)` (selector 0x4c80ee12, spot number padded
  to 32 bytes). If it returns true, this spot was already claimed:
  tell the user and stop.

## Step 3 · Claim

Call the claim contract with:

- to: 0x2caf4b66C2AF9bd18CcA0EAc139dA71B808fcFA2
- data: 0x379607f5 followed by the spot number padded to 32 bytes
  (claim(uint256))
- value: 238087677293306 (the exact claim fee in wei)

Preview the call first. Execute only on a clean preview. If the
preview fails, report which check failed (see below) instead of
retrying.

## Step 4 · Report

After a confirmed claim, report to the user:

- "Spot Nº <spot number padded to 4 digits> claimed: 250,000 BOY."
- The BOY balance of the wallet, read with `balanceOf(<your wallet>)`
  (selector 0x70a08231) on the token contract.

## If a claim fails

- ClaimClosed: claims are not open yet.
- WrongFee: the value sent was not exactly 238087677293306 wei.
- AlreadyClaimed: this spot was already claimed, by this wallet
  or a previous owner.
- NotHolder: the wallet does not hold that spot at claim time.
- ContractCallsNotAllowed: the call was routed through another
  contract. Call the claim contract directly from the agentic wallet.

Never invent a claim result. Read claimedById and the token balance
after a confirmed transaction.
