import { Components, Configuration, namespaceToString, Program } from "webnative"

import * as Crypto from "webnative/components/crypto/implementation.js"
import * as Manners from "webnative/components/manners/implementation.js"

import * as Session from "webnative/session.js"
import * as Webnative from "webnative"

import * as BaseCrypto from "./components/crypto/implementation/base.js"
import * as BaseManners from "./components/manners/implementation/base.js"
import * as EthereumWallet from "./wallet/implementation/ethereum.js"
import * as Wallet from "./wallet/implementation.js"

import { did } from "./wallet/common.js"



// 🛳


export const components = {
  crypto(settings: Configuration & {
    wallet: Wallet.Implementation
  }): Promise<Crypto.Implementation> {
    return BaseCrypto.implementation(settings.wallet, {
      storeName: namespaceToString(settings.namespace),
      exchangeKeyName: "exchange-key",
      writeKeyName: "write-key"
    })
  },

  manners(settings: Configuration & {
    crypto: Crypto.Implementation
    wallet: Wallet.Implementation
  }): Promise<Manners.Implementation> {
    return BaseManners.implementation(
      settings.wallet,
      { configuration: settings }
    )
  }
}



// 🚀


export type Options = {
  onAccountChange?: (program: Program) => unknown
  onDisconnect?: () => unknown

  wallet?: Wallet.Implementation
}


/**
 * 🚀 Build a webnative-walletauth program.
 *
 * Contrary to a regular webnative program,
 * this'll create an account for you automatically.
 * It also does session management for you.
 *
 * You may pass in a custom `wallet` implementation
 * if you'd like to use another wallet than the built-in
 * Ethereum one.
 *
 * See webnative's `program` function documentation for more info.
 */
export async function program(settings: Options & Partial<Components> & Configuration): Promise<Program> {
  const wallet = settings.wallet || EthereumWallet.implementation
  const walletCrypto = await components.crypto({ ...settings, wallet })

  const defaultCrypto = await Webnative.defaultCryptoComponent(settings.namespace)
  const manners = await components.manners({ ...settings, wallet, crypto: defaultCrypto })

  // Create Webnative Program
  const webnativeProgram = await Webnative.program({
    ...settings,

    crypto: defaultCrypto,
    manners,
  })

  // Destroy existing session if wallet account changed
  const authStrategy = webnativeProgram.auth
  const username = await wallet.username()
  const isNewUser = await authStrategy.isUsernameAvailable(username)

  let session = webnativeProgram.session
  if (session && (isNewUser || username !== session.username)) {
    await session.destroy()
    session = null
  }

  // Initialise wallet
  // > Destroy existing session when account changes or disconnects.
  // > Will create a new Program on account change.
  await wallet.init({
    onAccountChange: async () => (await authStrategy.session())?.destroy()
      .then(() => program(settings))
      .then(a => settings?.onAccountChange ? settings.onAccountChange(a) : a),

    onDisconnect: async () => (await authStrategy.session())?.destroy()
      .then(() => settings?.onDisconnect ? settings.onDisconnect() : undefined),
  })

  // Make a new account if necessary, otherwise provide a session.
  // Afterwards, create a session.
  if (!session) {
    if (isNewUser) {
      const { success } = await authStrategy.register({ username })
      if (!success) throw new Error("Failed to register user")
    } else {
      await Session.provide(
        webnativeProgram.components.storage,
        { type: authStrategy.implementation.type, username }
      )
    }

    // Create an account UCAN
    const accountUcan = await Webnative.ucan.build({
      dependencies: { crypto: walletCrypto },
      potency: "APPEND",
      resource: "*",
      lifetimeInSeconds: 60 * 60 * 24 * 30 * 12 * 1000, // 1000 years

      audience: await Webnative.did.ucan(defaultCrypto),
      issuer: await did(walletCrypto, wallet),
    })

    webnativeProgram.components.storage.setItem(
      webnativeProgram.components.storage.KEYS.ACCOUNT_UCAN,
      Webnative.ucan.encode(accountUcan)
    )

    // Create session
    session = await authStrategy.session()
    webnativeProgram.session = session
  }

  // Fin
  return webnativeProgram
}