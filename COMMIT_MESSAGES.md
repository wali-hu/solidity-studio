# Suggested commit messages (use when you push)

Commit in this order, or squash into one as you prefer.

---

**Option A: Single commit (recommended)**

```
feat: add token-to-token swap (path tokenIn -> WETH -> tokenOut)

- Contract: swapExactTokensForTokens in router interface, TokenSwappedForToken event, swapTokenForToken()
- Tests: 4 new cases (zero amount, invalid tokenIn/tokenOut, same token)
- Script: interact-token-to-token.ts (TOKEN_IN, TOKEN_OUT, TOKEN_AMOUNT)
- API: POST /api/v1/swap/token-to-token
- Postman: Token to Token Swap request + TOKEN_IN/TOKEN_OUT variables
- .env.example: TOKEN_IN, TOKEN_OUT, TOKEN_AMOUNT (Sepolia token addresses)
```

---

**Option B: One commit per step**

1. Contract only:
   ```
   feat(contract): add swapTokenForToken for token-to-token swaps via WETH
   ```

2. Tests only:
   ```
   test: add token-to-token swap validation tests
   ```

3. Script only:
   ```
   chore(scripts): add interact-token-to-token.ts for token-to-token swap
   ```

4. API + Postman + .env.example:
   ```
   feat(api): add token-to-token swap endpoint and Postman + env vars
   ```

---

Delete this file after you push if you don't want it in the repo.
