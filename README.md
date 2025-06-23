# like-pumpfun

Create, buy, and sell tokens on pump.fun (V1) easily

```
npm i like-pumpfun
```

Need support? Join the community: https://lucasbarrena.com

## Usage

Both `like-pumpfun` and `like-pumpswap` have similar API on purpose for easyness.

They have different math and instructions underneath.

<details>
<summary>Full example for buying and selling</summary>

Get mint reserves, estimate the swap, create instructions, sign, and send.

```js
const Pumpfun = require('like-pumpfun')
const SOL = require('like-solana')

const rpc = new SOL.RPC()
const pumpfun = new Pumpfun(rpc)

main()

async function main () {
  const mint = 'ExpuTKRK7sqfekMU74wUQM5SZf4WooyWEKabRwa126TG'
  const recentBlockhash = (await rpc.getLatestBlockhash()).blockhash
  const user = new SOL.Keypair('<secret key...>')

  // Buy 0.1 SOL of tokens with 3% slippage
  const reserves = await pumpfun.getReserves(mint)
  const swapBuy = pumpfun.quoteToBase(0.1, reserves, 0.03)
  const ixBuy = pumpfun.buy(mint, swapBuy.baseAmountOut, swapBuy.quoteInMax, user.publicKey, reserves)
  const txBuy = SOL.sign(ixBuy, { unitPrice: 0.0001, signers: [user], recentBlockhash })

  console.log('Buy signature:', SOL.signature(txBuy))

  await rpc.sendTransaction(txBuy)

  // ... (could wait for confirmation)
  await new Promise(resolve => setTimeout(resolve, 5000))

  // Sell the tokens we bought with 3% slippage
  const reserves2 = await pumpfun.getReserves(mint)
  const swapSell = pumpfun.baseToQuote(swapBuy.baseAmountOut, reserves2, 0.03)
  const ixSell = pumpfun.sell(mint, swapSell.baseAmountIn, swapSell.quoteOutMin, user.publicKey, reserves)
  const txSell = SOL.sign(ixSell, { unitPrice: 0.0001, signers: [user], recentBlockhash })

  console.log('Sell signature:', SOL.signature(txSell))

  await rpc.sendTransaction(txSell)

  // ...
}
```
</details>

<details>
<summary>Create a token</summary>

```js
// ... (like the code from before)
const fs = require('fs')

const mintKeyPair = new SOL.Keypair()
const mint = mintKeyPair.publicKey

const info = {
  name: '1337',
  symbol: '1337',
  description: '',
  image: fs.readFileSync('./logo.png'),
  website: '',
  telegram: '',
  twitter: ''
}

const uri = await pumpfun.createMetadata(info)
const ixCreate = pumpfun.create({ info, uri, mint }, user.publicKey)

// (Buying is optional)
const reserves = Pumpfun.initialReserves({ creator: user.publicKey })
const swapBuy = pumpfun.quoteToBase(0.1, reserves)
const ixBuy = pumpfun.buy(mint, swapBuy.baseAmountOut, swapBuy.quoteInMax, user.publicKey, reserves)

const txCreate = SOL.sign([...ixCreate, ...ixBuy], { unitPrice: 0.0001, signers: [user, mintKeyPair], recentBlockhash })

console.log('Mint', mint.toBase58())
console.log('Create hash', SOL.signature(txCreate))

await rpc.sendTransaction(txCreate)
```
</details>

## API

#### `pumpfun = new Pumpfun(rpc)`

Create a new Pumpfun instance.

A `solana-rpc` instance must be provided.

#### `reserves = await pumpfun.getReserves(mint)`

Fetch the bonding curve as reserves.

Returns:

```js
{
  virtualTokenReserves: BigInt,
  virtualSolReserves: BigInt,
  realTokenReserves: BigInt,
  realSolReserves: BigInt,
  tokenTotalSupply: BigInt,
  complete: Boolean,
  creator: String // Base58 public key
}
```

## Buy

#### `swap = pumpfun.quoteToBase(quoteAmountIn, reserves[, slippage, options])`

Buy estimation on how many tokens you will receive based on quote (SOL).

Slippage is zero by default, you expect to receive what you estimated or more.

```js
// 0.5 SOL to TOKENS at 3% slippage (Auto-converted to BigInt)
const swapBuy = pumpfun.quoteToBase(0.5, reserves, 0.03)

// BigInt(0.5 * 1e9) to TOKENS (Nine decimals)
const swapBuy = pumpfun.quoteToBase(500000000n, reserves, 0.03)
```

Options:

```js
{
  sync: Boolean // For multiple continuous swaps
}
```

Returns:

```js
{
  baseAmountOut: BigInt,
  quoteAmountIn: BigInt,
  userQuoteAmountIn: BigInt,
  quoteInMax: BigInt
}
```

#### `ix = pumpfun.buy(mint, baseAmountOut, quoteInMax, userPublicKey, reserves)`

Create buy instructions.

Note: Reserves here specifically only needs `{ creator }`.

## Sell

#### `swap = pumpfun.baseToQuote(baseAmountIn, reserves[, slippage, options])`

Sell estimation on how much SOL you will receive based on base (tokens).

Slippage is zero by default, you expect to receive what you estimated or more.

```js
// 350000000 TOKENS to SOL at 3% slippage (Auto-converted to BigInt)
const swapSell = pumpfun.baseToQuote(350000000, reserves, 0.03)

// BigInt(350000000 * 1e6) to TOKENS (Six decimals)
const swapSell = pumpfun.baseToQuote(350000000000000n, reserves, 0.03)
```

Options:

```js
{
  sync: Boolean // For multiple continuous swaps
}
```

Returns:

```js
{
  baseAmountIn: BigInt,
  quoteAmountOut: BigInt,
  userQuoteAmountOut: BigInt,
  quoteOutMin: BigInt
}
```

#### `ix = pumpfun.sell(mint, baseAmountIn, quoteOutMin, userPublicKey, reserves)`

Create sell instructions.

Note: Reserves here specifically only needs `{ creator }`.

## Create

#### `uri = await pumpfun.createMetadata(options)`

Create an IPFS link to the metadata.

Options:

```js
{
  name: String,
  symbol: String,
  image: Buffer,
  description: String, // Optional
  website: String, // Optional
  telegram: String, // Optional
  twitter: String // Optional
}
```

#### `ix = pumpfun.create(options, userPublicKey)`

Create instructions for making a token.

Options:

```js
{
  mint: String, // Public key of the token
  name: String, // You would use the same from the metadata
  symbol: String, // Same
  uri: String // metadataUri (IPFS)
}
```

## API (static)

#### `reserves = Pumpfun.initialReserves(options)`

Creates the initial reserves for a new token.

Options:

```js
{
  creator: String
}
```

Returns:

```js
{
  virtualTokenReserves: 1073000000000000n,
  virtualSolReserves: 30000000000n,
  realTokenReserves: 793100000000000n,
  realSolReserves: 0n,
  tokenTotalSupply: 1000000000000000n,
  complete: false,
  creator: String // From the options
}
```

#### `Pumpfun.PROGRAM_ID`

Indicates the program ID: `6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P`

#### `progress = Pumpfun.progress(reserves)`

Calculates the bonding curve completion in the floating range from 0 to 1.

#### `marketCap = Pumpfun.marketCap(reserves)`

Calculates the market capitalization of the token.

#### `price = Pumpfun.price(reserves)`

Calculates the price of 1 token in SOL (lamport units).

#### `bondingCurve = Pumpfun.getBondingCurve(mint)`

Returns the bonding curve address based on the mint public key.

#### `metadataAddress = Pumpfun.getMetadataAddress(mint)`

Returns the Metaplex / Metadata address based on the mint public key.

#### `config = Pumpfun.global()`

Returns the global config (authorities, fees, reserves, etcetera).

## License

MIT
