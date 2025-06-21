const test = require('brittle')
const SOL = require('like-solana')
const Image = require('like-image')
const dotenv = require('dotenv')
const Pumpfun = require('./index.js')

dotenv.config({ path: require('os').homedir() + '/.env' })

test('basic', async function (t) {
  const user = new SOL.Keypair(process.env.WALLET_SECRET_KEY)

  const rpc = new SOL.RPC({ commitment: 'processed' })
  const pump = new Pumpfun(rpc)

  await pump.ready()

  const recentBlockhash = (await rpc.getLatestBlockhash()).blockhash

  const mintKeyPair = new SOL.Keypair()
  const mint = mintKeyPair.publicKey

  const info = {
    name: '1337',
    symbol: '1337',
    description: '',
    image: Image.random(),
    website: '',
    telegram: '',
    twitter: ''
  }

  const uri = await pump.createMetadata(info)

  t.comment('(Metadata)', uri)

  const ixCreate = pump.create({ info, uri, mint }, user.publicKey)

  const reserves = Pumpfun.initialReserves({ creator: user.publicKey })

  const swapBuy = pump.quoteToBase(0.001, reserves, 0n, { sync: true })
  const ixBuy = pump.buy(mint, swapBuy.baseAmountOut, swapBuy.quoteInMax, user.publicKey, reserves)

  t.comment('Buy', swapBuy)
  t.comment('Buy reserves', reserves)

  const tx1 = SOL.sign([...ixCreate, ...ixBuy], { unitPrice: 0.0001, signers: [user, mintKeyPair], recentBlockhash })

  t.comment('Create hash', SOL.signature(tx1))
  t.comment('Mint', mint.toBase58())

  await rpc.sendTransaction(tx1)

  await new Promise(resolve => setTimeout(resolve, 2000))

  const swapSell = pump.baseToQuote(swapBuy.baseAmountOut, reserves, 3000n)
  const ixSell = pump.sell(mint, swapSell.baseAmountIn, swapSell.quoteOutMin, user.publicKey, reserves)

  const tx2 = SOL.sign(ixSell, { unitPrice: 0.0001, signers: [user], recentBlockhash })

  await rpc.sendTransaction(tx2)
})

test('basic', { timeout: 60000 }, async function (t) {
  const user = new SOL.Keypair(process.env.WALLET_SECRET_KEY)
  const user2 = new SOL.Keypair(process.env.WALLET2_SECRET_KEY)

  const rpc = new SOL.RPC({ commitment: 'processed' })
  const pump = new Pumpfun(rpc)

  await pump.ready()

  const recentBlockhash = (await rpc.getLatestBlockhash()).blockhash

  const mint = 'ExpuTKRK7sqfekMU74wUQM5SZf4WooyWEKabRwa126TG'

  const reserves = await pump.getReserves(mint)

  const swapBuy = pump.quoteToBase(0.001, reserves, 0n)

  t.comment('Buy', swapBuy)

  pump.sync(swapBuy, reserves)

  t.comment('Buy reserves', reserves)

  const ixBuy = pump.buy(mint, swapBuy.baseAmountOut, swapBuy.quoteInMax, user.publicKey, reserves)

  const tx1 = SOL.sign(ixBuy, { payer: user2.publicKey, unitPrice: 0.0001, signers: [user, user2], recentBlockhash })

  t.comment('Buy hash', SOL.signature(tx1))

  await rpc.sendTransaction(tx1)

  await new Promise(resolve => setTimeout(resolve, 15000))

  t.alike(await pump.getReserves(mint), reserves)

  const swapSell = pump.baseToQuote(swapBuy.baseAmountOut, reserves, 0n)

  t.comment('Sell', swapSell)

  pump.sync(swapSell, reserves)

  t.comment('Sell reserves', reserves)

  const ixSell = pump.sell(mint, swapSell.baseAmountIn, swapSell.quoteOutMin, user.publicKey, reserves)

  const tx2 = SOL.sign(ixSell, { payer: user2.publicKey, unitPrice: 0.0001, signers: [user, user2], recentBlockhash })

  t.comment('Sell hash', SOL.signature(tx2))

  await rpc.sendTransaction(tx2)

  await new Promise(resolve => setTimeout(resolve, 15000))

  t.alike(await pump.getReserves(mint), reserves)
})

test('offline swaps', async function (t) {
  const user = new SOL.Keypair(process.env.WALLET_SECRET_KEY)

  const rpc = new SOL.RPC({ commitment: 'processed' })
  const pump = new Pumpfun(rpc)

  await pump.ready()

  const recentBlockhash = (await rpc.getLatestBlockhash()).blockhash

  const mint = 'ExpuTKRK7sqfekMU74wUQM5SZf4WooyWEKabRwa126TG'
  const reserves = await pump.getReserves(mint)

  const swapBuy = pump.quoteToBase(0.001, reserves, 0n, { sync: true })
  const swapSell = pump.baseToQuote(swapBuy.baseAmountOut, reserves, 0n, { sync: true })

  t.comment('Buy1', swapBuy)
  t.comment('Sell', swapSell)

  const ixBuy = pump.buy(mint, swapBuy.baseAmountOut, swapBuy.quoteInMax, user.publicKey, reserves)
  const ixSell = pump.sell(mint, swapSell.baseAmountIn, swapSell.quoteOutMin, user.publicKey, reserves)

  const tx1 = SOL.sign(ixBuy, { unitPrice: 0.0001, signers: [user], recentBlockhash })
  const tx2 = SOL.sign(ixSell, { unitPrice: 0.0001, signers: [user], recentBlockhash })

  t.comment('Buy hash', SOL.signature(tx1))
  t.comment('Sell hash', SOL.signature(tx2))

  await rpc.sendTransaction(tx1)
  await new Promise(resolve => setTimeout(resolve, 2000))
  await rpc.sendTransaction(tx2)

  await new Promise(resolve => setTimeout(resolve, 15000))

  t.alike(await pump.getReserves(mint), reserves)
})

test.skip('progress', async function (t) {
  const rpc = new SOL.RPC({ commitment: 'processed' })
  const pump = new Pumpfun(rpc)

  await pump.ready()

  const mint = '8c2veet9vkEeMtxYqGP5SJdvhyziy1vmo3Wccavc1uxv'
  const reserves = await pump.getReserves(mint)

  const completion = Pumpfun.progress(reserves)

  t.comment('Progress', completion)
})

test.skip('market cap', async function (t) {
  const rpc = new SOL.RPC({ commitment: 'processed' })
  const pump = new Pumpfun(rpc)

  await pump.ready()

  const mint = 'FexgytTYsaLsSRxVv8VP5CYixmKxqmiAXR6cHwQKpump'
  const reserves = await pump.getReserves(mint)

  const mcap = Pumpfun.marketCap(reserves)

  t.comment('Market capital', mcap)
})

test.skip('price', async function (t) {
  const rpc = new SOL.RPC({ commitment: 'processed' })
  const pump = new Pumpfun(rpc)

  await pump.ready()

  const mint = 'HrrvL1UG6Dox9KF1NyJtxmww5UJanijwxrrg44NoWV1Q'
  const reserves = await pump.getReserves(mint)

  const price = Pumpfun.price(reserves)

  t.comment('Price', price)
})
