const PublicKey = require('solana-public-key')
const Borsh = require('borsh-encoding')
const TransactionInstruction = require('solana-transaction-instruction')
const TokenProgram = require('solana-token-program')

const SYSTEM_PROGRAM_ID = new PublicKey('11111111111111111111111111111111')
const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb')
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')

const PUMP_PROGRAM = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P')
const MAYHEM_PROGRAM_ID = new PublicKey('MAyhSmzXzV1pTf7LsNkrNwkWKTo4ougAJ1PPg47MD4e')
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
const PUMP_ADDRESS_LOOKUP_TABLE = 'Hyif6eWb8x88RVrvjPfabsgRYnwkVnyByEXTVTXbUcyP'
const PUMP_LOOKUP_TABLE = getLookupTable()

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

  static ADDRESS_LOOKUP_TABLE = PUMP_ADDRESS_LOOKUP_TABLE
  static LOOKUP_TABLE = PUMP_LOOKUP_TABLE

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

    return (reserves.virtual_quote_reserves * 1_000_000_000n) / reserves.virtual_token_reserves
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
      creator_fee_basis_points: 5n,
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
      admin_set_creator_authority: 'UqN2p5bAzBqYdHXcgB6WLtuVrdvmy9JSAtgqZb3CMKw',
      create_v2_enabled: true,
      whitelist_pda: 'BwWK17cbHxwWBKZkUYvzxLcNQ1YVyaFezduWbtm2de6s',
      reserved_fee_recipient: 'GesfTA3X2arioaHp8bbKdjG9vJtskViWACZoYvxp4twS',
      mayhem_mode_enabled: true,
      reserved_fee_recipients: [
        '4budycTjhs9fD6xw62VBducVTNgMgJJ5BgtKq7mAZwn6',
        '8SBKzEQU4nLSzcwF4a74F2iaUDQyTfjGndn6qUWBnrpR',
        '4UQeTP1T39KZ9Sfxzo3WR5skgsaP6NZa87BAkuazLEKH',
        '8sNeir4QsLsJdYpc9RZacohhK1Y5FLU3nC5LXgYB4aa6',
        'Fh9HmeLNUMVCvejxCtCL2DbYaRyBFVJ5xrWkLnMH6fdk',
        '463MEnMeGyJekNZFQSTUABBEbLnvMTALbT6ZmsxAbAdq',
        '6AUH3WEHucYZyC61hqpqYUWVto5qA5hjHuNQ32GNnNxA'
      ],
      is_cashback_enabled: true,
      buyback_fee_recipients: [
        '5YxQFdt3Tr9zJLvkFccqXVUwhdTWJQc1fFg2YPbxvxeD',
        '9M4giFFMxmFGXtc3feFzRai56WbBqehoSeRE5GK7gf7',
        'GXPFM2caqTtQYC2cJ5yJRi9VDkpsYZXzYdwYpGnLmtDL',
        '3BpXnfJaUTiwXnJNe7Ej1rcbzqTTQUvLShZaWazebsVR',
        '5cjcW9wExnJJiqgLjq7DEG75Pm6JBgE1hNv4B2vHXUW6',
        'EHAAiTxcdDwQ3U4bU6YcMsQGaekdzLS3B5SmYo46kJtL',
        '5eHhjP8JaYkz83CWwvGU2uMUXefd3AazWGx4gpcuEEYD',
        'A7hAgCzFw14fejgCp387JUJRMNyz4j89JKnhtKU8piqW'
      ],
      buyback_basis_points: 5000n,
      initial_virtual_quote_reserves: 4292000000n,
      whitelisted_quote_mints: [
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
      ],
      creator_fee_configurable: true,
      max_configurable_creator_fee_bps: 300n,
      holder_reward_claim_authority: 'HckQ93Xqjjo8mwt5pNPWvyCTZXQZ858rvzmm7ZRrZg9t',
      is_holder_reward_enabled: true
    }
  }

  static initialReserves (opts = {}) {
    const config = Pumpfun.global()

    return {
      virtual_token_reserves: config.initial_virtual_token_reserves,
      virtual_quote_reserves: config.initial_virtual_sol_reserves,
      real_token_reserves: config.initial_real_token_reserves,
      real_quote_reserves: 0n,
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

  async ipfs () {
    const response = await fetch('https://pump.fun/api/ipfs-presign')
    const data = await response.json()

    if (!response.ok || !data.data) {
      throw new Error('IPFS presign failed')
    }

    return data.data
  }

  async uploadFile (uploadUrl, buffer, opts = {}) {
    const type = opts.type || 'image/png'
    const name = opts.name || (type === 'application/json' ? 'data.json' : 'image-' + Date.now() + '.png')

    const form = new FormData()

    form.append('file', new Blob([buffer], { type }), name)
    form.append('network', 'public')
    form.append('name', name)

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        source: 'sdk/file'
      },
      body: form
    })

    if (!response.ok) {
      throw new Error('Upload failed: ' + response.status)
    }

    const data = await response.json()

    return data.data
  }

  async createMetadata (info) {
    const imageUrl = await this.ipfs()
    const image = await this.uploadFile(imageUrl, info.image)

    const metadata = {
      name: info.name,
      symbol: info.symbol,
      description: info.description || '',
      image: 'https://ipfs.io/ipfs/' + image.cid,
      showName: info.showName !== false,
      createdOn: 'https://pump.fun'
    }

    if (info.twitter) metadata.twitter = info.twitter
    if (info.telegram) metadata.telegram = info.telegram
    if (info.website) metadata.website = info.website

    const jsonUrl = await this.ipfs()
    const json = await this.uploadFile(jsonUrl, Buffer.from(JSON.stringify(metadata)), { type: 'application/json' })

    return 'https://ipfs.io/ipfs/' + json.cid
  }

  create (input, user) {
    const mint = new PublicKey(input.mint)

    const bondingCurveAddress = getBondingCurve(mint)
    const associatedBondingCurve = getAssociatedBondingCurve(mint, bondingCurveAddress)

    const [mintAuthority] = PublicKey.findProgramAddressSync([Buffer.from('mint-authority')], PUMP_PROGRAM)
    const [globalAddress] = PublicKey.findProgramAddressSync([Buffer.from('global')], PUMP_PROGRAM)
    const globalParamsAddress = getGlobalParams()
    const solVaultAddress = getSolVault()
    const mayhemStateAddress = getMayhemState(mint)
    const mayhemTokenVault = getMayhemTokenVault(mint)

    // TODO: Borsh needs auto-encoding for args
    const data = Buffer.concat([
      Borsh.discriminator('global', 'create_v2'),
      borshEncodeString(input.info ? input.info.name : input.name),
      borshEncodeString(input.info ? input.info.symbol : input.symbol),
      borshEncodeString(input.uri),
      user.toBuffer(),
      Buffer.from([input.isMayhemMode ? 1 : 0]),
      borshEncodeOptionBool(input.isCashbackEnabled === true)
    ])

    return [new TransactionInstruction({
      programId: PUMP_PROGRAM,
      // TODO: Use the IDL to create the keys based on "instructions->create_v2"
      keys: [
        { pubkey: mint, isSigner: true, isWritable: true },
        { pubkey: mintAuthority, isSigner: false, isWritable: false },
        { pubkey: bondingCurveAddress, isSigner: false, isWritable: true },
        { pubkey: associatedBondingCurve, isSigner: false, isWritable: true },
        { pubkey: globalAddress, isSigner: false, isWritable: false },
        { pubkey: user, isSigner: true, isWritable: true },
        { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: MAYHEM_PROGRAM_ID, isSigner: false, isWritable: true },
        { pubkey: globalParamsAddress, isSigner: false, isWritable: false },
        { pubkey: solVaultAddress, isSigner: false, isWritable: true },
        { pubkey: mayhemStateAddress, isSigner: false, isWritable: true },
        { pubkey: mayhemTokenVault, isSigner: false, isWritable: true },
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

    const n = reserves.virtual_quote_reserves * reserves.virtual_token_reserves
    const i = reserves.virtual_quote_reserves + quoteAmountIn
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

    const n = (baseAmountIn * reserves.virtual_quote_reserves) / (reserves.virtual_token_reserves + baseAmountIn)
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

    const quoteAmountIn = (reserves.virtual_quote_reserves * baseAmountOut) / (reserves.virtual_token_reserves - baseAmountOut)

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
        reserves.real_quote_reserves += trade.sol_amount

        reserves.virtual_token_reserves -= trade.token_amount
        reserves.virtual_quote_reserves += trade.sol_amount
      }

      // Sell (TOKEN -> SOL)
      if (!trade.is_buy) {
        reserves.real_token_reserves += trade.token_amount
        reserves.real_quote_reserves -= trade.sol_amount

        reserves.virtual_token_reserves += trade.token_amount
        reserves.virtual_quote_reserves -= trade.sol_amount
      }

      return
    }

    if (!swap.baseAmountOut && !swap.baseAmountIn) throw new Error('Required baseAmountOut or baseAmountIn')
    if (swap.baseAmountOut && swap.baseAmountIn) throw new Error('Cannot pass two swaps in one')

    // Buy (SOL -> TOKEN)
    if (swap.baseAmountOut) {
      reserves.real_token_reserves -= swap.baseAmountOut
      reserves.real_quote_reserves += swap.quoteAmountIn

      reserves.virtual_token_reserves -= swap.baseAmountOut
      reserves.virtual_quote_reserves += swap.quoteAmountIn
    }

    // Sell (TOKEN -> SOL)
    if (swap.baseAmountIn) {
      reserves.real_token_reserves += swap.baseAmountIn
      reserves.real_quote_reserves -= swap.quoteAmountOut

      reserves.virtual_token_reserves += swap.baseAmountIn
      reserves.virtual_quote_reserves -= swap.quoteAmountOut
    }
  }

  static unsync (swap, reserves) {

    if (swap.sol_amount || swap.token_amount || swap.sol_amount === 0n || swap.token_amount === 0n) {
      const trade = swap

      // Buy (SOL -> TOKEN)
      if (trade.is_buy) {
        reserves.real_token_reserves += trade.token_amount
        reserves.real_quote_reserves -= trade.sol_amount

        reserves.virtual_token_reserves += trade.token_amount
        reserves.virtual_quote_reserves -= trade.sol_amount
      }

      // Sell (TOKEN -> SOL)
      if (!trade.is_buy) {
        reserves.real_token_reserves -= trade.token_amount
        reserves.real_quote_reserves += trade.sol_amount

        reserves.virtual_token_reserves -= trade.token_amount
        reserves.virtual_quote_reserves += trade.sol_amount
      }

      return
    }

    if (!swap.baseAmountOut && !swap.baseAmountIn) throw new Error('Required baseAmountOut or baseAmountIn')
    if (swap.baseAmountOut && swap.baseAmountIn) throw new Error('Cannot pass two swaps in one')

    // Buy (SOL -> TOKEN)
    if (swap.baseAmountOut) {
      reserves.real_token_reserves += swap.baseAmountOut
      reserves.real_quote_reserves -= swap.quoteAmountIn

      reserves.virtual_token_reserves += swap.baseAmountOut
      reserves.virtual_quote_reserves -= swap.quoteAmountIn
    }

    // Sell (TOKEN -> SOL)
    if (swap.baseAmountIn) {
      reserves.real_token_reserves -= swap.baseAmountIn
      reserves.real_quote_reserves += swap.quoteAmountOut

      reserves.virtual_token_reserves -= swap.baseAmountIn
      reserves.virtual_quote_reserves += swap.quoteAmountOut
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
    const associatedUser = TokenProgram.getAssociatedTokenAddressSync(mint, user, false, TOKEN_2022_PROGRAM_ID)

    const globalVolumeAccumulator = getGlobalVolumeAccumulator()
    const userVolumeAccumulator = getUserVolumeAccumulator(user)
    const trackVolume = opts.trackVolume !== false

    const instructions = []

    // TODO: Close? Maybe a method to recall the SOL
    instructions.push(TokenProgram.createAssociatedTokenAccountIdempotentInstruction(user, associatedUser, user, mint, TOKEN_2022_PROGRAM_ID))

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
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
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
    const associatedUser = TokenProgram.getAssociatedTokenAddressSync(mint, user, false, TOKEN_2022_PROGRAM_ID)

    const instructions = []

    // TODO
    instructions.push(TokenProgram.createAssociatedTokenAccountIdempotentInstruction(user, associatedUser, user, mint, TOKEN_2022_PROGRAM_ID))

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
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
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
  const associatedBondingCurve = TokenProgram.getAssociatedTokenAddressSync(mint, bondingCurve, true, TOKEN_2022_PROGRAM_ID)

  return associatedBondingCurve
}

function getGlobalParams () {
  const [globalParams] = PublicKey.findProgramAddressSync(
    [Buffer.from('global-params')],
    MAYHEM_PROGRAM_ID
  )

  return globalParams
}

function getSolVault () {
  const [solVault] = PublicKey.findProgramAddressSync(
    [Buffer.from('sol-vault')],
    MAYHEM_PROGRAM_ID
  )

  return solVault
}

function getMayhemState (mint) {
  const [mayhemState] = PublicKey.findProgramAddressSync(
    [Buffer.from('mayhem-state'), mint.toBuffer()],
    MAYHEM_PROGRAM_ID
  )

  return mayhemState
}

function getMayhemTokenVault (mint) {
  return TokenProgram.getAssociatedTokenAddressSync(mint, getSolVault(), true, TOKEN_2022_PROGRAM_ID)
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

  return (tokenTotalSupply * reserves.virtual_quote_reserves) / reserves.virtual_token_reserves
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
  return Buffer.from([value ? 1 : 0])
}

function getLookupTable () {
  return {
    key: new PublicKey('Hyif6eWb8x88RVrvjPfabsgRYnwkVnyByEXTVTXbUcyP'),
    state: {
      addresses: [
        new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P'),
        new PublicKey('4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf'),
        new PublicKey('39azUYFWPz3VHgKCf3VChUwbpURdCHRxjWVowf5jUJjg'),
        new PublicKey('Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1'),
        new PublicKey('Hq2wp8uJ9jCPsYgNHex8RtqdvMPfVGoYwjvF1ATiwn2Y'),
        new PublicKey('pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA'),
        new PublicKey('GS4CU59F31iL7aR2Q8zVS8DRrcRnXX1yjQ66TqNVQnaR'),
        new PublicKey('ADyA8hdefvWN2dbGGWFotbzWxrAvLW83WG6QCVXvJKqw'),
        new PublicKey('UqN2p5bAzBqYdHXcgB6WLtuVrdvmy9JSAtgqZb3CMKw'),
        new PublicKey('5PHirr8joyTMp9JMm6nW7hNDVyEYdkzDqazxPD7RaTjx'),
        new PublicKey('11111111111111111111111111111111'),
        new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'),
        new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
        new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'),
        new PublicKey('8Wf5TiAheLUqBrKXeYg2JtAFFMWtKdG2BSFgqUcPVwTt'),
        new PublicKey('pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ'),
        new PublicKey('MAyhSmzXzV1pTf7LsNkrNwkWKTo4ougAJ1PPg47MD4e'),
        new PublicKey('Gygj9QQby4j2jryqyqBHvLP7ctv2SaANgh4sCb69BUpA'),
        new PublicKey('13ec7XdrjF3h3YcqBTFDSReRcUFwbCnJaAQspM4j6DDJ'),
        new PublicKey('BwWK17cbHxwWBKZkUYvzxLcNQ1YVyaFezduWbtm2de6s'),
        new PublicKey('8FoNgzmjuSmiy86EPCWxvv1q7oJSu2WGA7wPymwki2LJ'),
        new PublicKey('62qc2CNXwrYqQScmEdiZFFAnJR262PxWEuNQtxfafNgV'),
        new PublicKey('7VtfL8fvgNfhz17qKRMjzQEXgbdpnHHHQRh54R9jP2RJ'),
        new PublicKey('7hTckgnGnLQR6sdH7YkqFTAA7VwTfYFaZ6EhEsU3saCX'),
        new PublicKey('9rPYyANsfQZw3DnDmKE3YCQF5E8oD89UXoHn9JFEhJUz'),
        new PublicKey('AVmoTthdrX6tKt4nDjco2D775W2YK3sDhxPcMmzUAmTY'),
        new PublicKey('CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM'),
        new PublicKey('FWsW1xNtWscwNmKv6wVsU1iTzRN6wmmk3MjxRP5tT7hz'),
        new PublicKey('G5UZAVbAf46s7cKWoyKu8kYTip9DGTpbLZ2qa9Aq69dP'),
        new PublicKey('5YxQFdt3Tr9zJLvkFccqXVUwhdTWJQc1fFg2YPbxvxeD'),
        new PublicKey('9M4giFFMxmFGXtc3feFzRai56WbBqehoSeRE5GK7gf7'),
        new PublicKey('GXPFM2caqTtQYC2cJ5yJRi9VDkpsYZXzYdwYpGnLmtDL'),
        new PublicKey('3BpXnfJaUTiwXnJNe7Ej1rcbzqTTQUvLShZaWazebsVR'),
        new PublicKey('5cjcW9wExnJJiqgLjq7DEG75Pm6JBgE1hNv4B2vHXUW6'),
        new PublicKey('EHAAiTxcdDwQ3U4bU6YcMsQGaekdzLS3B5SmYo46kJtL'),
        new PublicKey('5eHhjP8JaYkz83CWwvGU2uMUXefd3AazWGx4gpcuEEYD'),
        new PublicKey('A7hAgCzFw14fejgCp387JUJRMNyz4j89JKnhtKU8piqW'),
        new PublicKey('GesfTA3X2arioaHp8bbKdjG9vJtskViWACZoYvxp4twS'),
        new PublicKey('4budycTjhs9fD6xw62VBducVTNgMgJJ5BgtKq7mAZwn6'),
        new PublicKey('8SBKzEQU4nLSzcwF4a74F2iaUDQyTfjGndn6qUWBnrpR'),
        new PublicKey('4UQeTP1T39KZ9Sfxzo3WR5skgsaP6NZa87BAkuazLEKH'),
        new PublicKey('8sNeir4QsLsJdYpc9RZacohhK1Y5FLU3nC5LXgYB4aa6'),
        new PublicKey('Fh9HmeLNUMVCvejxCtCL2DbYaRyBFVJ5xrWkLnMH6fdk'),
        new PublicKey('463MEnMeGyJekNZFQSTUABBEbLnvMTALbT6ZmsxAbAdq'),
        new PublicKey('6AUH3WEHucYZyC61hqpqYUWVto5qA5hjHuNQ32GNnNxA'),
        new PublicKey('JCRGumoE9Qi5BBgULTgdgTLjSgkCMSbF62ZZfGs84JeU'),
        new PublicKey('94qWNrtmfn42h3ZjUZwWvK1MEo9uVmmrBPd2hpNjYDjb'),
        new PublicKey('BqcWAXkSdknwQxvqXYVGKtttZynYNHACPVJmTaoqgfv8'),
        new PublicKey('EX2aKevK74xvKhMXGMLRKRJdiya32PsQDVqvpFmqM5nn'),
        new PublicKey('7GFUN3bWzJMKMRZ34JLsvcqdssDbXnp589SiE33KVwcC'),
        new PublicKey('3beutiWC6iV5Hz2RC711oXTqWa93rHUwsS58xWBHyTd6'),
        new PublicKey('GcQg5EfxSLDXyXPEU5nEFqaKYHHFE6XusRWq4SvjjyYM'),
        new PublicKey('X5QPJcpph4mBAJDzc4hRziFftSbcygV59kRb2Fu6Je1'),
        new PublicKey('FC6zaBZjnJ1tF5nY4b2nrPgu62thjXdRkk2sEtjxU16E'),
        new PublicKey('EuwnCQdAw3QZyimtPpcJdPXriYVKtJoRUyVbN9q4zEYJ'),
        new PublicKey('Bvtgim23rfocUzxVX9j9QFxTbBnH8JZxnaGLCEkXvjKS'),
        new PublicKey('C5bwoYa7RD7Prc2u36idJ3hDjTvvoXPdBdx4iYeDVaQj'),
        new PublicKey('FWouMcev9dfqAGPF4zNJM7HBfWh3593kt7CZB2VT8fco'),
        new PublicKey('FGptqdxjahafaCzpZ1T6EDtCzYMv7Dyn5MgBLyB3VUFW'),
        new PublicKey('APnwGpYPQJqpndpjZFUFUrzsSU2sd2SG9qKtpXQgRimu'),
        new PublicKey('CvqM1WftUFK23mBn2j3XdGtJTfvmgpFT1yYcb9wW61Za'),
        new PublicKey('CGEWR6pxwgQvYKeX4pZDqpZtWYPvyTjiAsw86SNzJtGy'),
        new PublicKey('CN371Div8bqcEqq2grrGQfBX7geFLgHATEFMNLEuQs1U'),
        new PublicKey('9kLpkV5eGS4mF4pxQ1huRM23LjGtXwvxkzABvDUKrcVq'),
        new PublicKey('7xQYoUjUJF1Kg6WVczoTAkaNhn5syQYcbvjmFrhjWpx'),
        new PublicKey('2yC9PAQvtxFjdV2G79N7cGsFhitbNiEQmZ3Z6dmLWfQg'),
        new PublicKey('7Jtig7R2h4PUxPx6NaDrFw1tqvoo8XBvZJFt4bieiWt8'),
        new PublicKey('BWXT6RUhit9FfJQM3pBmqeFLPYmuxgmyhMGC5sGr8RbA'),
        new PublicKey('BMqY71czEnfwxTp7zTc3Wdkushpn8VfSJ6NGZX11djM1'),
        new PublicKey('69xfsNda5twoNVEZKFLgNzXo8Ar1icoWRQPJAA7DSKxP'),
        new PublicKey('HjQjngTDqoHE6aaGhUqfz9aQ7WZcBRjy5xB8PScLSr8i'),
        new PublicKey('6oCkp6gpyjxVTeL6ahMYcekN2x2pzt1KY8g2LqemaTNE'),
        new PublicKey('GsVBKjffkB769p9tHTZWoAX3r9T6dXoDTJr3f7XutJH7'),
        new PublicKey('GAFuhgcd328SkkBYHpfadzmef9hTGAFRCi9QoCnsZQug'),
        new PublicKey('DxvbV1rR2hmFJ2gYGXmz7jnMPsvf39M1BWd3Ejshd3Zj'),
        new PublicKey('9NFrxdnmedHKHs1tnhYm9G5XTJh7Lt7xN6uxgZzwQNM7'),
        new PublicKey('AktftA98kSWAxn6kVSoqBXBELUArjKu2H9WmKB48ULFY'),
        new PublicKey('H2CUXP4v2ZSWEFvnj9C6RbbD8cNNZPLK3H374nKARN1t'),
        new PublicKey('BhMknQ4j9RZUbJk6GS4QJh8MSKxcqZHS2x9MZh2AH9hA'),
        new PublicKey('6rVkF4HSgy1jrnC3HogfRgPHrq4CtLg5f11URpsC4i9D'),
        new PublicKey('9JR4rG7BK32TVENGAcKMseS7tdoz3Y5pXeSq234MEowH'),
        new PublicKey('9NW32ymMo8Qx6DTbgkxtnD8Dh9hssQYpcyY2Brdpg2hs'),
        new PublicKey('GYH1Gae1wJytMSvMvw8JVcv7nuAbxi8i9erNVbERnzXd'),
        new PublicKey('4EcDKGwpgYLVnMmjJCDrUN2DVLQKSpSKyMhqU1GbuMsv'),
        new PublicKey('5a8Gfgwx4hrCtYKgvjtX57FsirXPRN7Jzm9aXmn6hQs8'),
        new PublicKey('CA7v8gHfbquYXyDnDx6QxWW8hmL1H7X6Y2RYDrGLnuck'),
        new PublicKey('EZbmj4jpfk9GGgRNfzX3e13Zo4ZaNMHQ5UUmRVcZQyEF'),
        new PublicKey('5KUNmCZatysY7fxLtTgo2bpkqevPRZZG8fkrh3e1P89F'),
        new PublicKey('CASRL2zkwDnppxEFQ4LgdwgR9pdz5Q8R8nEMKVZ9QoLp'),
        new PublicKey('BJQ1HTx43bBDF1ba8GfZAfxSMZneTmQNr5m9yUfx6vAu'),
        new PublicKey('HPfEytxa5JGqmGiVwrSepAcNTkWboxvtQKbyWN9DNCoQ'),
        new PublicKey('qkYdTGRPHbWTWuBMz45bCiU6a23axRqf6sBHm9295WY'),
        new PublicKey('fewxWzSMHpHhDT9c5FysEXnHXtxvWVeHPvFVTyZdPwh'),
        new PublicKey('Gr5kHfDBd7GAdjK6Ct3EDC566XFPjCr3mLCkKVxJYrMD'),
        new PublicKey('C93K8DX4YsABYJtHX9awzgZW3LWzBqBVezEbbLJH4yet'),
        new PublicKey('41xY1DU1zzo893bEg2HzTFxPVVM84UvDCNsQm6aKRq8Z'),
        new PublicKey('EjPDJxzz876H53wdSpqLzHhYJAndnNUTH1DDZjeW9DYA'),
        new PublicKey('Bckr4rY4rUGvWtwqC9mnWN35LKzfPRcmsoMRYq6DFEjN'),
        new PublicKey('GYahGz4ts13NYJBJfwFfMsN7aWv6mcT5D5Jd9znx18QW'),
        new PublicKey('3KfQpgXBFPCULja9KiPdjWgAue96nJCGkaSm2TLYLjRd'),
        new PublicKey('9tvBjCQ4m3954ESgxW9PnBPvW8afHEjKpkNEAdfN2D8U'),
        new PublicKey('Gzc5K38syMVA8V7Q7czVJqQGxBiWhJ3iUqZdGGdSvqEP'),
        new PublicKey('BN4Mf4jpA9Mp7ZHz1ycxGbHE319Nvf9J9onzTGHArMbi'),
        new PublicKey('CoRuMWRuDAsjB5SDMmYEcDuyQyaH3L2vVFvwBy1FF8Kr'),
        new PublicKey('AupmCV3PGYcm5efdXS7Yd9TvvzfUP4wKabvmFoDe9LAf'),
        new PublicKey('DTybfXMCtn3zHchJ3y2XKmryYX6aPiVtmHsjeoyUwyiT'),
        new PublicKey('21L1QB6DJ9HBvePgwN6jFuK3UT9mq2SgTq1oJ7D6cNiV'),
        new PublicKey('EQkDDtyzVwY3RCBNJSd68F8c1WQP6njSbcPLpnYFoMxU'),
        new PublicKey('GkcEY35acFg4KFNKb4R4KRQvXwzKtNYaqc3GnaMce9aG'),
        new PublicKey('2i3uCDzDhr3pSvMPF5uBpUckLAv7XGdo2a8soiqNJMHk'),
        new PublicKey('A9KuWNQUZBT5ZTp3HB5tKxCkSwxjUrW5fFqvk6JcKyo6'),
        new PublicKey('SHDJe2sssE6pB5SLQdHfmdocjM3d7ZJGJthHvyxk2nC'),
        new PublicKey('BZeq7y8ajn5Pjpy5KjEhF6eBY2H9ippTpqCtQLQPsmJf'),
        new PublicKey('D3ANwvaijotpP2BZJTxHs7mdhKaNDZ8JgWAZRAGX5wva'),
        new PublicKey('8jGhhtRUTR8fv16phamd1ARrhu5CvDVev9Ra39xvz1Rd'),
        new PublicKey('ghSBUgyxyvyurm1vJBkU4rUyLJoUipCZhFeiBogKCSy'),
        new PublicKey('8i5djNGuUXSAqang3mcQMPfAg7ynPdLLyecDx1D393od'),
        new PublicKey('E1z4EHn9t2aMnupT5bMpKFS9qcnvbcdZWQjD1PfhaTFA'),
        new PublicKey('DWpvfqzGWuVy9jVSKSShdM2733nrEsnnhsUStYbkj6Nn'),
        new PublicKey('DeoTNj3a1WRSAJWgRrepxjytnMQEjB4Xm8ahK7YUrxgq'),
        new PublicKey('6AbEmk1erKwQiDT64jTfm7jXuwhQcQQcToLQAPZFcdi5'),
        new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
        new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'),
        new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'),
        new PublicKey('So11111111111111111111111111111111111111112'),
        new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
        new PublicKey('11111111111111111111111111111111'),
        new PublicKey('ADyA8hdefvWN2dbGGWFotbzWxrAvLW83WG6QCVXvJKqw'),
        new PublicKey('GS4CU59F31iL7aR2Q8zVS8DRrcRnXX1yjQ66TqNVQnaR'),
        new PublicKey('Hq2wp8uJ9jCPsYgNHex8RtqdvMPfVGoYwjvF1ATiwn2Y'),
        new PublicKey('C2aFPdENg4A2HQsmrd5rTw5TaYBX5Ku887cWjbFKtZpw'),
        new PublicKey('pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ'),
        new PublicKey('pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA'),
        new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P'),
        new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'),
        new PublicKey('5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1'),
        new PublicKey('58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2'),
        new PublicKey('8BnEgHoWFysVcuFFX7QztDmzuH8r5ZFvyP3sYwn1XTh6'),
        new PublicKey('srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX'),
        new PublicKey('DQyrAcCrDXQ7NeoqGgDCZwBvWDcYmFCjSb9JtteuvPpz'),
        new PublicKey('HLmqeL62xR1QoZ1HKKbXRrdN1p3phKpxRMb2VVopvBBz'),
        new PublicKey('LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj'),
        new PublicKey('CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK'),
        new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
        new PublicKey('USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB'),
        new PublicKey('G8LqPHYAMcwP14CDgk9XsV9VdwpsW3aJ59VubwnyrJVr'),
        new PublicKey('3h2e43PunVA5K34vwKCLHWhZF4aZpyaC9RmxvshGAQpL'),
        new PublicKey('CdpY42BTUgCmvACA8oHeCkvChKHyjqwtRbUAkpSj7xJW'),
        new PublicKey('3KxnkzueoZiayw5kAT6o4nzyoyPxkwMdxviv7wNgVvyc'),
        new PublicKey('vhnZNkREnWg8zRUHCi8oEuxdzHia65xDb1S7VRrQqeJ'),
        new PublicKey('EcV3jHJdUus9xJ67iQBgQggL7Q7UPDMEi7YSDBo7PE3r'),
        new PublicKey('D6QxXDt6hhcCpto4HiZKkN2YQ2iZRF5R7S3caCHpUsML'),
        new PublicKey('GmFrDZT2cdrqykgTikVdXbe8EtCgzUDM9VsDhQnwsUsG'),
        new PublicKey('AgenTMiC2hvxGebTsgmsD4HHBa8WEcqGFf87iwRRxLo7'),
        new PublicKey('ALeLWphFxNVNXpXFEC4Ssf2Jan1Wki72Us8tXMMrQuQZ'),
        new PublicKey('HcAR1LpgSGFxeLyb1vkhsCuN6AtxQsww3E2pMMXkwHqx'),
        new PublicKey('E9BzZER9vhBTPjBpT9QC1NaiinSXonZWgF89HkpKJxGF'),
        new PublicKey('FHpcNSe6tb2n15bAdq4BkeYWGyZKFD7yLYrH92ng7wCT'),
        new PublicKey('TSLvdd1pWpHVjahSpsvCXUbgwsL3JAcvokwaKt1eokM'),
        new PublicKey('ComputeBudget111111111111111111111111111111'),
        new PublicKey('jitodontfront111111111111111111nopainnogain'),
        new PublicKey('7xrjio4HMDaBCXCHdFoqBUvP3epvh7DKnECpmVBZ5ZW3'),
        new PublicKey('7Px7uigYSVP4mUyvxZ26GKvi3gtyVt7wWrhTKnZsD8HN'),
        new PublicKey('JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'),
        new PublicKey('D8cy77BBepLMngZx6ZukaTff5hCt1HrWyKk3Hnd9oitf'),
        new PublicKey('51jek4CRWUgd5m3XaQmt53RzyvFjn3LF3qEB35ZYpump'),
        new PublicKey('H2jHE8DpRadryv3rn2ycpa2jDnBDRFG4Lzw2DB2hKKTq'),
        new PublicKey('GXiV2QopYESCgVAVBQZkotmMTRNGCKQddfg8Uabz8L9c'),
        new PublicKey('9e2jSsXC8pfRWYm1no4pSyB8ZVNB7qcZ3nc7YhBQbmqK'),
        new PublicKey('HQkwugUSYotEAZAkoDabbdVueX6zZN5z5w7CDz2kq63P'),
        new PublicKey('4tkdCMeqgUfbEmctxBb7jPNjPqKWRM65qBMZNeXvDR6v'),
        new PublicKey('Fk8933ScEwzSjFqpXWMscRzNJaxRqmxYtL9WWRPULKTz'),
        new PublicKey('ARcBxLfVMQKv4Ww4ZxH4RM8kXLpLhCdXTy6NN7XaLEJ4'),
        new PublicKey('CExf3HJ6zpjg6vtwTFsxuiFzL2A9TsMc41HWmpkcRNZ'),
        new PublicKey('FVLkDcnQ1SfCHgb1SYJ9Nk9fTwJzVdXSF9NaXgYGSNQV'),
        new PublicKey('DCvwzHy9PgABoT6CiLwxr1PoeDUg5nveGJNzt7ZyeQVS'),
        new PublicKey('7xJypVHchuWQWyP3EPHCmyGZpuPsovuVuGDkSSrevifz'),
        new PublicKey('9Vz2khpbpqjffTKprxQe4uxnuvLFS3jsKV4Mnp53pzbX'),
        new PublicKey('FBduLUSCPrxpeoM9jUWnTtdXBSAw54r8Bj11qTZitfEE'),
        new PublicKey('6tT2L9L96HmTsbAe1JZm8DtTkmWAqaLigJkCVtSoZexo'),
        new PublicKey('8KJidaVpdw9UQwADmUxoCJ9igEzVq1dNHWDCkStzQ5rd'),
        new PublicKey('Hp6NgkHKaXDRcgYuA7Hno21CpNdugqUA7Z2G2CqYvhQu'),
        new PublicKey('AXDmeVPegFeAEReLbMZ1PqEDvS4wDUqkgjMoBuknWkGp')
      ]
    }
  }
}
