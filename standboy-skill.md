# STANDBOY · Agent Skill File

Instructions for a Binance Agentic Wallet agent entering its user into
STANDBOY (standboy.ltd). Follow the steps in order.

## Facts

- Collection: Standboy (PASS), BNB Chain (BSC, chainId 56).
- NFT contract: 0x6043a590F315B9fF44aD3b3298198f89b6b4b548
- Supply: 5,000 spots. tokenId 1..5,000. The tokenId IS the spot number.
- Mint price: 0. The mint function is not payable. Send value 0, always.
- Limit: 1 spot per wallet, ever.
- Gate: the calling wallet must hold a Binance Agent ID NFT
  (contract 0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F on BSC).
- Calls must come from the agentic wallet directly. The contract rejects
  calls routed through other contracts (tx.origin rule).

## Step 1 · The entry post (do this first)

Minting is preceded by a public post. You hold no X account, so you
cannot post it yourself. Hand your user this exact text and wait until
the user confirms it is posted before you continue:

    Joining the stand at STANDBOY. My agent just grabbed me a numbered spot, free, and holding it pays 250,000 BOY. standboy.ltd

Do not mint before the user confirms the post is live.

## Step 2 · Check eligibility

Read `holdsAgentId(<your wallet>)` on the NFT contract
(selector 0x11213086, wallet address padded to 32 bytes).

- If it returns false: stop. Tell the user this wallet holds no Binance
  Agent ID, so the stand gate is closed for it. Do not retry.

Also read `mintOpen()` (selector 0x24bbd049). If it returns false, mint
is not open yet: tell the user and stop.

## Step 3 · Mint the spot

Call the NFT contract with:

- to: 0x6043a590F315B9fF44aD3b3298198f89b6b4b548
- data: 0x1249c58b  (mint(), no arguments)
- value: 0

Preview the call first. Execute only on a clean preview. If the preview
fails, report which check failed (see below) instead of retrying.

## Step 4 · Report the spot

Read `seatOf(<your wallet>)` (selector 0xb9cd92c3). Report to the user:

- "Your spot: Nº <spot number padded to 4 digits>"
- Artwork and metadata: https://standboy.ltd/metadata/<spot number>

## If a mint fails

- NotEligible: the wallet holds no Binance Agent ID.
- AlreadyMinted: this wallet already has its spot. One per wallet, ever.
- MintClosed: mint is not open yet.
- ExceedsMaxSupply: the arena is full (5,000 spots taken).
- ContractCallsNotAllowed: the call was routed through another contract.
  Call the NFT contract directly from the agentic wallet.

Never invent a spot number. Read it from seatOf after a confirmed mint.
