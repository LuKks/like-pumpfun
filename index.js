const PublicKey = require('solana-public-key')
const Borsh = require('borsh-encoding')
const TransactionInstruction = require('solana-transaction-instruction')
const TokenProgram = require('solana-token-program')

const SYSTEM_PROGRAM_ID = new PublicKey('11111111111111111111111111111111')
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
const SYSVAR_RENT_PUBKEY = new PublicKey('SysvarRent111111111111111111111111111111111')

const PUMP_PROGRAM = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P')
const PUMP_EVENT_AUTHORITY = new PublicKey('Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1')
const PUMP_FEE_RECEIPT = new PublicKey('CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM')
const PUMP_FEE_PROGRAM_ID = new PublicKey('pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ')
const PUMP_BUYBACK_FEE_RECIPIENTS = [
  '5YxQFdt3Tr9zJLvkFccqXVUwhdTWJQc1fFg2YPbxvxeD',
  '9M4giFFMxmFGXtc3feFzRai56WbBqehoSeRE5GK7gf7',
  'GXPFM2caqTtQYC2cJ5yJRi9VDkpsYZXzYdwYpGnLmtDL',
  '3BpXnfJaUTiwXnJNe7Ej1rcbzqTTQUvLShZaWazebsVR',
  '5cjcW9wExnJJiqgLjq7DEG75Pm6JBgE1hNv4B2vHXUW6',
  'EHAAiTxcdDwQ3U4bU6YcMsQGaekdzLS3B5SmYo46kJtL',
  '5eHhjP8JaYkz83CWwvGU2uMUXefd3AazWGx4gpcuEEYD',
  'A7hAgCzFw14fejgCp387JUJRMNyz4j89JKnhtKU8piqW'
]

const METAPLEX_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')

const IDL_PUMP_FUN = require('./idl.json')

module.exports = class Pumpfun {
  constructor (rpc, opts = {}) {
    this.rpc = rpc

    // TODO: Use structs to optimize size
    this.borsh = new Borsh(IDL_PUMP_FUN)
    this.global = Pumpfun.global()
    this.feeConfig = null

    this.programId = opts.programId || PUMP_PROGRAM

    this.opened = false
    this.opening = this.ready()
    this.opening.then(() => {
      this.opened = true
    })
    this.opening.catch(noop)
  }

  static PROGRAM_ID = PUMP_PROGRAM
  static IDL = IDL_PUMP_FUN

  static getBondingCurve (mint) {
    return getBondingCurve(new PublicKey(mint))
  }

  static getAssociatedBondingCurve (mint, bondingCurve) {
    return getAssociatedBondingCurve(new PublicKey(mint), new PublicKey(bondingCurve))
  }

  static getMetadataAddress (mint) {
    return getMetadataAddress(new PublicKey(mint))
  }

  static progress (reserves) {
    const initialRealTokenReserves = 793100000000000n
    const tokensSold = initialRealTokenReserves - reserves.real_token_reserves
    const ratio = (tokensSold * 1_000_000_000n) / initialRealTokenReserves

    return Number(ratio) / Number(1_000_000_000n)
  }

  static marketCap (reserves) {
    return getMarketCap(reserves)
  }

  static price (reserves) {
    if (reserves.virtual_token_reserves === 0n) {
      return 0n
    }

    return (reserves.virtual_sol_reserves * 1_000_000_000n) / reserves.virtual_token_reserves
  }

  static global () {
    return {
      initialized: true,
      authority: 'FFWtrEQ4B4PKQoVuHYzZq8FabGkVatYzDpEVHsK5rrhF',
      fee_recipient: '62qc2CNXwrYqQScmEdiZFFAnJR262PxWEuNQtxfafNgV',
      initial_virtual_token_reserves: 1073000000000000n,
      initial_virtual_sol_reserves: 30000000000n,
      initial_real_token_reserves: 793100000000000n,
      token_total_supply: 1000000000000000n,
      fee_basis_points: 95n,
      withdraw_authority: '39azUYFWPz3VHgKCf3VChUwbpURdCHRxjWVowf5jUJjg',
      enable_migrate: true,
      pool_migration_fee: 15000001n,
      creator_fee_basis_points: 30n,
      fee_recipients: [
        '7VtfL8fvgNfhz17qKRMjzQEXgbdpnHHHQRh54R9jP2RJ',
        '7hTckgnGnLQR6sdH7YkqFTAA7VwTfYFaZ6EhEsU3saCX',
        '9rPYyANsfQZw3DnDmKE3YCQF5E8oD89UXoHn9JFEhJUz',
        'AVmoTthdrX6tKt4nDjco2D775W2YK3sDhxPcMmzUAmTY',
        'CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM',
        'FWsW1xNtWscwNmKv6wVsU1iTzRN6wmmk3MjxRP5tT7hz',
        'G5UZAVbAf46s7cKWoyKu8kYTip9DGTpbLZ2qa9Aq69dP'
      ],
      set_creator_authority: '39azUYFWPz3VHgKCf3VChUwbpURdCHRxjWVowf5jUJjg',
      admin_set_creator_authority: 'UqN2p5bAzBqYdHXcgB6WLtuVrdvmy9JSAtgqZb3CMKw'
    }
  }

  static initialReserves (opts = {}) {
    const config = Pumpfun.global()

    return {
      virtual_token_reserves: config.initial_virtual_token_reserves,
      virtual_sol_reserves: config.initial_virtual_sol_reserves,
      real_token_reserves: config.initial_real_token_reserves,
      real_sol_reserves: 0n,
      token_total_supply: config.token_total_supply,
      complete: false,
      creator: opts.creator || null
    }
  }

  static vault (creator) {
    return getCreatorVault(creator).toString()
  }

  async ready () {
    if (this.opening) return this.opening

    if (!this.global) {
      this.global = await this.fetchGlobalAccount()
    }

    if (!this.feeConfig && this.rpc && this.rpc.getAccountInfo) {
      this.feeConfig = await this.fetchFeeConfig()
    }
  }

  async fetchGlobalAccount () {
    const [globalAccountPDA] = PublicKey.findProgramAddressSync([Buffer.from('global')], PUMP_PROGRAM)
    const tokenAccount = await this.rpc.getAccountInfo(globalAccountPDA)

    const globalAccount = this.borsh.decode(tokenAccount.data, ['types', 'Global'])

    return globalAccount
  }

  async fetchFeeConfig () {
    const accountInfo = await this.rpc.getAccountInfo(getFeeConfig())

    if (!accountInfo) {
      return null
    }

    return decodeFeeConfig(accountInfo.data)
  }

  async createMetadata (info) {
    const body = new FormData()
    const blob = new Blob([info.image], { type: 'image/png' })

    body.append('file', blob, 'image-' + Date.now() + '.png')
    body.append('name', info.name)
    body.append('symbol', info.symbol)
    body.append('description', info.description || '')
    body.append('twitter', info.twitter || '')
    body.append('telegram', info.telegram || '')
    body.append('website', info.website || '')
    body.append('showName', info.showName !== false)

    const response = await fetch('https://pump.fun/api/ipfs', { method: 'POST', body })

    if (!response.ok) {
      throw new Error('IPFS creation failed')
    }

    const data = await response.json()

    return data.metadataUri
  }

  create (input, user) {
    const mint = new PublicKey(input.mint)

    const metadataAddress = getMetadataAddress(mint)
    const bondingCurveAddress = getBondingCurve(mint)
    const associatedBondingCurve = getAssociatedBondingCurve(mint, bondingCurveAddress)

    const [mintAuthority] = PublicKey.findProgramAddressSync([Buffer.from('mint-authority')], PUMP_PROGRAM)
    const [globalAddress] = PublicKey.findProgramAddressSync([Buffer.from('global')], PUMP_PROGRAM)

    // TODO: Borsh needs auto-encoding for args
    const data = Buffer.concat([
      Borsh.discriminator('global', 'create'),
      borshEncodeString(input.info ? input.info.name : input.name),
      borshEncodeString(input.info ? input.info.symbol : input.symbol),
      borshEncodeString(input.uri),
      user.toBuffer()
    ])

    return [new TransactionInstruction({
      programId: PUMP_PROGRAM,
      // TODO: Use the IDL to create the keys based on "instructions->create"
      keys: [
        { pubkey: mint, isSigner: true, isWritable: true },
        { pubkey: mintAuthority, isSigner: false, isWritable: false },
        { pubkey: bondingCurveAddress, isSigner: false, isWritable: true },
        { pubkey: associatedBondingCurve, isSigner: false, isWritable: true },
        { pubkey: globalAddress, isSigner: false, isWritable: false },
        { pubkey: METAPLEX_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: metadataAddress, isSigner: false, isWritable: true },
        { pubkey: user, isSigner: true, isWritable: true },
        { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
        { pubkey: PUMP_EVENT_AUTHORITY, isSigner: false, isWritable: false },
        { pubkey: PUMP_PROGRAM, isSigner: false, isWritable: false }
      ],
      data
    })]
  }

  async getReserves (mint) {
    const bondingCurveAddress = getBondingCurve(new PublicKey(mint))
    const accountInfo = await this.rpc.getAccountInfo(bondingCurveAddress)

    if (!accountInfo) {
      throw new Error('Bonding curve not found')
    }

    const bondingCurve = this.borsh.decode(accountInfo.data, ['types', 'BondingCurve'])

    return bondingCurve
  }

  quoteToBase (quoteAmountIn, reserves, slippage, opts = {}) {
    if (!this.global) throw new Error('GlobalAccount is required')
    if (reserves.complete) throw new Error('Curve is complete')

    quoteAmountIn = normalizeQuoteAmount(quoteAmountIn)

    if (quoteAmountIn <= 0n) {
      return {
        baseAmountOut: 0n,
        quoteAmountIn: 0n,
        userQuoteAmountIn: 0n,
        quoteInMax: 0n
      }
    }

    const n = reserves.virtual_sol_reserves * reserves.virtual_token_reserves
    const i = reserves.virtual_sol_reserves + quoteAmountIn
    const r = n / i + 1n
    const s = reserves.virtual_token_reserves - r

    const baseAmountOut = s < reserves.real_token_reserves ? s : reserves.real_token_reserves

    const fee = (quoteAmountIn * getFeeBasisPoints(this.global, this.feeConfig, reserves)) / 10000n
    const userQuoteAmountIn = quoteAmountIn + fee
    const quoteInMax = calculateSlippage(userQuoteAmountIn, normalizeSlippage(slippage || 0n))

    const swap = {
      baseAmountOut,
      quoteAmountIn,
      userQuoteAmountIn,
      quoteInMax
    }

    if (opts.sync) {
      this.sync(swap, reserves)
    }

    return swap
  }

  baseToQuote (baseAmountIn, reserves, slippage, opts = {}) {
    if (!this.global) throw new Error('GlobalAccount is required')
    if (reserves.complete) throw new Error('Curve is complete')

    baseAmountIn = normalizeBaseAmount(baseAmountIn)

    if (baseAmountIn <= 0n) {
      return {
        baseAmountIn: 0n,
        quoteAmountOut: 0n,
        userQuoteAmountOut: 0n,
        quoteOutMin: 0n
      }
    }

    const n = (baseAmountIn * reserves.virtual_sol_reserves) / (reserves.virtual_token_reserves + baseAmountIn)
    const feeBasisPoints = getFeeBasisPoints(this.global, this.feeConfig, reserves)
    const a = ((10_000n - feeBasisPoints) * 1_000_000_000n) / 10_000n

    const quoteAmountOut = n
    const userQuoteAmountOut = (n * a) / 1_000_000_000n
    const quoteOutMin = calculateSlippage(userQuoteAmountOut, (normalizeSlippage(slippage || 0n)) * -1n)

    const swap = {
      baseAmountIn,
      quoteAmountOut,
      userQuoteAmountOut,
      quoteOutMin
    }

    if (opts.sync) {
      this.sync(swap, reserves)
    }

    return swap
  }

  baseToQuoteIn (baseAmountOut, reserves, slippage, opts = {}) {
    if (!this.global) throw new Error('GlobalAccount is required')
    if (reserves.complete) throw new Error('Curve is complete')

    baseAmountOut = normalizeBaseAmount(baseAmountOut)

    if (baseAmountOut <= 0n) {
      return {
        baseAmountOut: 0n,
        quoteAmountIn: 0n,
        userQuoteAmountIn: 0n,
        quoteInMax: 0n
      }
    }

    if (baseAmountOut >= reserves.virtual_token_reserves) {
      throw new Error('Not enough tokens in the pool')
    }

    const quoteAmountIn = (reserves.virtual_sol_reserves * baseAmountOut) / (reserves.virtual_token_reserves - baseAmountOut)

    const fee = (quoteAmountIn * getFeeBasisPoints(this.global, this.feeConfig, reserves)) / 10000n
    const userQuoteAmountIn = quoteAmountIn + fee
    const quoteInMax = calculateSlippage(userQuoteAmountIn, normalizeSlippage(slippage || 0n))

    const swap = {
      baseAmountOut,
      quoteAmountIn,
      userQuoteAmountIn,
      quoteInMax
    }

    if (opts.sync) {
      this.sync(swap, reserves)
    }

    return swap
  }

  getQuoteInMax (quoteAmountIn, slippage) {
    quoteAmountIn = normalizeQuoteAmount(quoteAmountIn)

    const amountInMax = calculateSlippage(quoteAmountIn, normalizeSlippage(slippage || 0n))

    return amountInMax
  }

  getQuoteOutMin (quoteAmountOut, slippage) {
    quoteAmountOut = normalizeQuoteAmount(quoteAmountOut)

    const amountOutMin = calculateSlippage(quoteAmountOut, normalizeSlippage(slippage || 0n) * -1n)

    return amountOutMin
  }

  sync (swap, reserves) {
    return Pumpfun.sync(swap, reserves)
  }

  unsync (swap, reserves) {
    return Pumpfun.unsync(swap, reserves)
  }

  static sync (swap, reserves) {
    if (swap.sol_amount || swap.token_amount || swap.sol_amount === 0n || swap.token_amount === 0n) {
      const trade = swap

      // Buy (SOL -> TOKEN)
      if (trade.is_buy) {
        reserves.real_token_reserves -= trade.token_amount
        reserves.real_sol_reserves += trade.sol_amount

        reserves.virtual_token_reserves -= trade.token_amount
        reserves.virtual_sol_reserves += trade.sol_amount
      }

      // Sell (TOKEN -> SOL)
      if (!trade.is_buy) {
        reserves.real_token_reserves += trade.token_amount
        reserves.real_sol_reserves -= trade.sol_amount

        reserves.virtual_token_reserves += trade.token_amount
        reserves.virtual_sol_reserves -= trade.sol_amount
      }

      return
    }

    if (!swap.baseAmountOut && !swap.baseAmountIn) throw new Error('Required baseAmountOut or baseAmountIn')
    if (swap.baseAmountOut && swap.baseAmountIn) throw new Error('Cannot pass two swaps in one')

    // Buy (SOL -> TOKEN)
    if (swap.baseAmountOut) {
      reserves.real_token_reserves -= swap.baseAmountOut
      reserves.real_sol_reserves += swap.quoteAmountIn

      reserves.virtual_token_reserves -= swap.baseAmountOut
      reserves.virtual_sol_reserves += swap.quoteAmountIn
    }

    // Sell (TOKEN -> SOL)
    if (swap.baseAmountIn) {
      reserves.real_token_reserves += swap.baseAmountIn
      reserves.real_sol_reserves -= swap.quoteAmountOut

      reserves.virtual_token_reserves += swap.baseAmountIn
      reserves.virtual_sol_reserves -= swap.quoteAmountOut
    }
  }

  static unsync (swap, reserves) {
    if (swap.sol_amount || swap.token_amount || swap.sol_amount === 0n || swap.token_amount === 0n) {
      const trade = swap

      // Buy (SOL -> TOKEN)
      if (trade.is_buy) {
        reserves.real_token_reserves += trade.token_amount
        reserves.real_sol_reserves -= trade.sol_amount

        reserves.virtual_token_reserves += trade.token_amount
        reserves.virtual_sol_reserves -= trade.sol_amount
      }

      // Sell (TOKEN -> SOL)
      if (!trade.is_buy) {
        reserves.real_token_reserves -= trade.token_amount
        reserves.real_sol_reserves += trade.sol_amount

        reserves.virtual_token_reserves -= trade.token_amount
        reserves.virtual_sol_reserves += trade.sol_amount
      }

      return
    }

    if (!swap.baseAmountOut && !swap.baseAmountIn) throw new Error('Required baseAmountOut or baseAmountIn')
    if (swap.baseAmountOut && swap.baseAmountIn) throw new Error('Cannot pass two swaps in one')

    // Buy (SOL -> TOKEN)
    if (swap.baseAmountOut) {
      reserves.real_token_reserves += swap.baseAmountOut
      reserves.real_sol_reserves -= swap.quoteAmountIn

      reserves.virtual_token_reserves += swap.baseAmountOut
      reserves.virtual_sol_reserves -= swap.quoteAmountIn
    }

    // Sell (TOKEN -> SOL)
    if (swap.baseAmountIn) {
      reserves.real_token_reserves -= swap.baseAmountIn
      reserves.real_sol_reserves += swap.quoteAmountOut

      reserves.virtual_token_reserves -= swap.baseAmountIn
      reserves.virtual_sol_reserves += swap.quoteAmountOut
    }
  }

  buy (mint, baseOut, quoteInMax, user, reserves, opts = {}) {
    mint = new PublicKey(mint)
    user = new PublicKey(user)

    baseOut = normalizeBaseAmount(baseOut)
    quoteInMax = normalizeQuoteAmount(quoteInMax)

    const bondingCurveAddress = getBondingCurve(mint)
    const associatedBondingCurve = getAssociatedBondingCurve(mint, bondingCurveAddress)
    const bondingCurveV2Address = getBondingCurveV2(mint)
    const buybackFeeRecipient = getBuybackFeeRecipient()
    const associatedUser = TokenProgram.getAssociatedTokenAddressSync(mint, user, false)

    const globalVolumeAccumulator = getGlobalVolumeAccumulator()
    const userVolumeAccumulator = getUserVolumeAccumulator(user)
    const trackVolume = opts.trackVolume !== false

    const instructions = []

    // TODO: Close? Maybe a method to recall the SOL
    instructions.push(TokenProgram.createAssociatedTokenAccountIdempotentInstruction(user, associatedUser, user, mint))

    const globalAddress = PublicKey.findProgramAddressSync([Buffer.from('global')], PUMP_PROGRAM)[0]

    // Optional hook for external encoding
    let data = !this._encode ? null : this._encode('buy', { baseOut, quoteInMax, trackVolume })

    if (!data) {
      // TODO: Borsh needs auto-encoding for args
      data = Buffer.concat([
        Borsh.discriminator('global', 'buy'),
        Buffer.alloc(8),
        Buffer.alloc(8),
        borshEncodeOptionBool(trackVolume)
      ])
      data.writeBigUInt64LE(baseOut, 8)
      data.writeBigUInt64LE(quoteInMax, 16)
    }

    instructions.push(new TransactionInstruction({
      programId: this.programId,
      // TODO: Use the IDL to create the keys based on "instructions->buy"
      keys: [
        { pubkey: globalAddress, isSigner: false, isWritable: false },
        { pubkey: PUMP_FEE_RECEIPT, isSigner: false, isWritable: true },
        { pubkey: mint, isSigner: false, isWritable: false },
        { pubkey: bondingCurveAddress, isSigner: false, isWritable: true },
        { pubkey: associatedBondingCurve, isSigner: false, isWritable: true },
        { pubkey: associatedUser, isSigner: false, isWritable: true },
        { pubkey: user, isSigner: true, isWritable: true },
        { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: getCreatorVault(reserves.creator), isSigner: false, isWritable: true },
        { pubkey: PUMP_EVENT_AUTHORITY, isSigner: false, isWritable: false },
        { pubkey: PUMP_PROGRAM, isSigner: false, isWritable: false },
        { pubkey: globalVolumeAccumulator, isSigner: false, isWritable: true },
        { pubkey: userVolumeAccumulator, isSigner: false, isWritable: true },
        { pubkey: getFeeConfig(), isSigner: false, isWritable: false },
        { pubkey: PUMP_FEE_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: bondingCurveV2Address, isSigner: false, isWritable: false },
        { pubkey: buybackFeeRecipient, isSigner: false, isWritable: true }
      ],
      data
    }))

    return instructions
  }

  sell (mint, baseIn, quoteOutMin, user, reserves) {
    mint = new PublicKey(mint)
    user = new PublicKey(user)

    const bondingCurveAddress = getBondingCurve(mint)
    const associatedBondingCurve = getAssociatedBondingCurve(mint, bondingCurveAddress)
    const bondingCurveV2Address = getBondingCurveV2(mint)
    const buybackFeeRecipient = getBuybackFeeRecipient()
    const associatedUser = TokenProgram.getAssociatedTokenAddressSync(mint, user, false)

    const instructions = []

    // TODO
    instructions.push(TokenProgram.createAssociatedTokenAccountIdempotentInstruction(user, associatedUser, user, mint))

    const globalAddress = PublicKey.findProgramAddressSync([Buffer.from('global')], PUMP_PROGRAM)[0]

    // TODO: Borsh needs auto-encoding for args
    const data = Buffer.concat([
      Borsh.discriminator('global', 'sell'),
      Buffer.alloc(8),
      Buffer.alloc(8)
    ])
    data.writeBigUInt64LE(baseIn, 8)
    data.writeBigUInt64LE(quoteOutMin, 16)

    instructions.push(new TransactionInstruction({
      programId: this.programId,
      // TODO: Use the IDL to create the keys based on "instructions->sell"
      keys: [
        { pubkey: globalAddress, isSigner: false, isWritable: false },
        { pubkey: PUMP_FEE_RECEIPT, isSigner: false, isWritable: true },
        { pubkey: mint, isSigner: false, isWritable: false },
        { pubkey: bondingCurveAddress, isSigner: false, isWritable: true },
        { pubkey: associatedBondingCurve, isSigner: false, isWritable: true },
        { pubkey: associatedUser, isSigner: false, isWritable: true },
        { pubkey: user, isSigner: true, isWritable: true },
        { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: getCreatorVault(reserves.creator), isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: PUMP_EVENT_AUTHORITY, isSigner: false, isWritable: false },
        { pubkey: PUMP_PROGRAM, isSigner: false, isWritable: false },
        { pubkey: getFeeConfig(), isSigner: false, isWritable: false },
        { pubkey: PUMP_FEE_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: bondingCurveV2Address, isSigner: false, isWritable: false },
        { pubkey: buybackFeeRecipient, isSigner: false, isWritable: true }
      ],
      data
    }))

    return instructions
  }

  collect (creator) {
    creator = new PublicKey(creator)

    const creatorVault = getCreatorVault(creator)

    const data = Buffer.concat([
      Borsh.discriminator('global', 'collect_creator_fee')
    ])

    return [new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: creator, isSigner: false, isWritable: true },
        { pubkey: creatorVault, isSigner: false, isWritable: true },
        { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: PUMP_EVENT_AUTHORITY, isSigner: false, isWritable: false },
        { pubkey: PUMP_PROGRAM, isSigner: false, isWritable: false }
      ],
      data
    })]
  }

  async getCreatorVaultBalance (creator) {
    const creatorVault = getCreatorVault(creator)
    const accountInfo = await this.rpc.getAccountInfo(creatorVault)

    if (accountInfo === null) {
      return 0n
    }

    const rentExemptionLamports = await this.rpc.request('getMinimumBalanceForRentExemption', [accountInfo.data.length])

    const balance = BigInt(accountInfo.lamports)
    const rentExemption = BigInt(rentExemptionLamports)

    if (balance < rentExemption) {
      return 0n
    }

    return balance - rentExemption
  }
}

function getMetadataAddress (mint) {
  const [metadata] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      METAPLEX_PROGRAM_ID.toBuffer(),
      mint.toBuffer()
    ],
    METAPLEX_PROGRAM_ID
  )

  return metadata
}

function getBondingCurve (mint) {
  const [bondingCurve] = PublicKey.findProgramAddressSync(
    [Buffer.from('bonding-curve'), new PublicKey(mint).toBuffer()],
    PUMP_PROGRAM
  )

  return bondingCurve
}

function getBondingCurveV2 (mint) {
  const [bondingCurve] = PublicKey.findProgramAddressSync(
    [Buffer.from('bonding-curve-v2'), new PublicKey(mint).toBuffer()],
    PUMP_PROGRAM
  )

  return bondingCurve
}

function getAssociatedBondingCurve (mint, bondingCurve) {
  const associatedBondingCurve = TokenProgram.getAssociatedTokenAddressSync(mint, bondingCurve, true)

  return associatedBondingCurve
}

function getCreatorVault (creator) {
  const [creatorVault] = PublicKey.findProgramAddressSync(
    [Buffer.from('creator-vault'), new PublicKey(creator).toBuffer()],
    PUMP_PROGRAM
  )

  return creatorVault
}

function getGlobalVolumeAccumulator () {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('global_volume_accumulator')],
    PUMP_PROGRAM
  )

  return pda
}

function getUserVolumeAccumulator (user) {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('user_volume_accumulator'), new PublicKey(user).toBuffer()],
    PUMP_PROGRAM
  )

  return pda
}

function getFeeConfig () {
  const [pda] = PublicKey.findProgramAddressSync([
    Buffer.from('fee_config'),
    Buffer.from([1, 86, 224, 246, 147, 102, 90, 207, 68, 219, 21, 104, 191, 23, 91, 170, 81, 137, 203, 151, 245, 210, 255, 59, 101, 93, 43, 182, 253, 109, 24, 176])
  ], PUMP_FEE_PROGRAM_ID)

  return pda
}

function getBuybackFeeRecipient () {
  const index = Math.floor(Math.random() * PUMP_BUYBACK_FEE_RECIPIENTS.length)

  return new PublicKey(PUMP_BUYBACK_FEE_RECIPIENTS[index])
}

function decodeFeeConfig (data) {
  if (Array.isArray(data)) data = Buffer.from(data[0], data[1] || 'base64')
  if (typeof data === 'string') data = Buffer.from(data, 'base64')

  const discriminator = Borsh.discriminator('account', 'FeeConfig')

  if (!data.slice(0, 8).equals(discriminator)) {
    throw new Error('FeeConfig discriminator mismatch')
  }

  let offset = 8
  const bump = data.readUInt8(offset)
  offset += 1

  const admin = new PublicKey(data.slice(offset, offset + 32)).toString()
  offset += 32

  const flatFees = readFees(data, offset)
  offset = flatFees.offset

  const feeTierCount = data.readUInt32LE(offset)
  offset += 4

  const feeTiers = []

  for (let i = 0; i < feeTierCount; i++) {
    const marketCapLamportsThreshold = readU128LE(data, offset)
    offset += 16

    const fees = readFees(data, offset)
    offset = fees.offset

    feeTiers.push({
      market_cap_lamports_threshold: marketCapLamportsThreshold,
      fees: fees.value
    })
  }

  return {
    bump,
    admin,
    flat_fees: flatFees.value,
    fee_tiers: feeTiers
  }
}

function getFeeBasisPoints (global, feeConfig, reserves) {
  if (!feeConfig) {
    return global.fee_basis_points + global.creator_fee_basis_points
  }

  const marketCap = getMarketCap(reserves)
  const fees = calculateFeeTier(feeConfig.fee_tiers, marketCap)

  return fees.protocol_fee_bps + fees.creator_fee_bps
}

function calculateFeeTier (feeTiers, marketCap) {
  const firstTier = feeTiers[0]

  if (marketCap < firstTier.market_cap_lamports_threshold) {
    return firstTier.fees
  }

  for (const tier of feeTiers.slice().reverse()) {
    if (marketCap >= tier.market_cap_lamports_threshold) {
      return tier.fees
    }
  }

  return firstTier.fees
}

function getMarketCap (reserves) {
  if (reserves.virtual_token_reserves === 0n) {
    return 0n
  }

  const tokenTotalSupply = reserves.token_total_supply || 1000000000000000n

  return (tokenTotalSupply * reserves.virtual_sol_reserves) / reserves.virtual_token_reserves
}

function readFees (data, offset) {
  const value = {
    lp_fee_bps: data.readBigUInt64LE(offset),
    protocol_fee_bps: data.readBigUInt64LE(offset + 8),
    creator_fee_bps: data.readBigUInt64LE(offset + 16)
  }

  return { value, offset: offset + 24 }
}

function readU128LE (data, offset) {
  const low = data.readBigUInt64LE(offset)
  const high = data.readBigUInt64LE(offset + 8)

  return (high << 64n) + low
}

function noop () {}

function normalizeSlippage (slippage) {
  if (typeof slippage === 'number') return BigInt(Math.floor(slippage * 10_000))
  if (typeof slippage !== 'bigint') slippage = BigInt(slippage)
  return slippage
}

function calculateSlippage (value, slippage) {
  const precision = 1_000_000_000n // 1e9
  const factor = (10_000n + (slippage || 0n)) * precision / 10_000n
  const max = (value * factor) / precision

  return max
}

function normalizeBaseAmount (baseAmountOut) {
  // Say base is TOKEN always (with 6 decimals)
  if (typeof baseAmountOut === 'number') baseAmountOut = BigInt((baseAmountOut * 1e6).toFixed(0))
  if (typeof baseAmountOut !== 'bigint') baseAmountOut = BigInt(baseAmountOut)
  return baseAmountOut
}

function normalizeQuoteAmount (quoteAmountIn) {
  // Say quote is SOL always (with 9 decimals)
  if (typeof quoteAmountIn === 'number') return BigInt((quoteAmountIn * 1e9).toFixed(0))
  if (typeof quoteAmountIn !== 'bigint') return BigInt(quoteAmountIn)
  return quoteAmountIn
}

function borshEncodeString (str) {
  const length = Buffer.alloc(4)
  const value = Buffer.from(str, 'utf8')

  length.writeUInt32LE(value.length, 0)

  return Buffer.concat([length, value])
}

function borshEncodeOptionBool (value) {
  if (value === undefined || value === null) {
    return Buffer.from([0])
  }

  return Buffer.from([1, value ? 1 : 0])
}
