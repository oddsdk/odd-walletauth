import { Crypto, Manners, Storage, Components, Configuration, namespace, Program } from "webnative"

import * as Session from "webnative/session"
import * as Webnative from "webnative"

import * as BaseCrypto from "./components/crypto/implementation/base.js"
import * as BaseManners from "./components/manners/implementation/base.js"
import * as EthereumWallet from "./wallet/implementation/ethereum.js"
import * as Wallet from "./wallet/implementation.js"

import { did } from "./wallet/common.js"


// 🛳


export const components = {
  crypto(settings: Configuration & {
    storage: Storage.Implementation
    wallet: Wallet.Implementation
  }): Promise<Crypto.Implementation> {
    return BaseCrypto.implementation(settings.storage, settings.wallet, {
      storeName: namespace(settings),
      exchangeKeyName: "exchange-key",
      writeKeyName: "write-key"
    })
  },

  manners(settings: Configuration & {
    storage: Storage.Implementation
    wallet: Wallet.Implementation
  }): Promise<Manners.Implementation> {
    return BaseManners.implementation(
      settings.storage,
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
 * See [webnative's `program`](https://webnative.fission.app/functions/program-1.html) function documentation for more info.
 */
export async function program(settings: Options & Partial<Components> & Configuration): Promise<Program> {
  const defaultCrypto = settings.crypto || await Webnative.defaultCryptoComponent(settings)
  const storage = settings.storage || Webnative.defaultStorageComponent(settings)

  const wallet = settings.wallet || EthereumWallet.implementation
  const walletCrypto = await components.crypto({ ...settings, wallet, storage })
  const manners = await components.manners({ ...settings, wallet, storage })

  // Create Webnative `Program`s
  const webnativeProgram = await Webnative.program({
    ...settings,
    crypto: defaultCrypto,
    manners,
  })

  // Destroy existing session if wallet account changed
  const username = await wallet.username()
  const isNewUser = await webnativeProgram.auth.isUsernameAvailable(username)

  let session = webnativeProgram.session
  if (session && (isNewUser || username !== session.username)) {
    await session.destroy()
    session = null
  }

  // Initialise wallet
  // > Destroy existing session when account changes or disconnects.
  // > Will create a new Program on account change.
  await wallet.init(storage, {
    onAccountChange: () => logErrorAndRethrow(async () => {
      // Destroy the user's current session when the wallet account changes
      const session = await webnativeProgram.auth.session()
      await session?.destroy()

      // If the user has passed in a callback function, use it
      const p = await program(settings)

      if (settings?.onAccountChange instanceof Function) {
        return settings.onAccountChange(p)
      }

      // Otherwise, return the program
      return p
    }),

    onDisconnect: () => logErrorAndRethrow(async () => {
      // Destroy the user's current session when the wallet account disconnects
      const session = await webnativeProgram.auth.session()
      await session?.destroy()

      // If the user has passed in a callback function, use it
      if (settings?.onDisconnect instanceof Function) {
        return settings.onDisconnect()
      }
    })
  })

  // Make a new account if necessary, otherwise provide a session.
  // Afterwards, create a session.
  if (!session) {
    // Create an account UCAN
    const accountUcan = await Webnative.ucan.build({
      dependencies: { crypto: walletCrypto },
      potency: "APPEND",
      resource: "*",
      lifetimeInSeconds: 60 * 60 * 24 * 30 * 12 * 1000, // 1000 years

      audience: await Webnative.did.ucan(defaultCrypto),
      issuer: await did(walletCrypto, storage, wallet),
    })

    await webnativeProgram.components.storage.setItem(
      webnativeProgram.components.storage.KEYS.ACCOUNT_UCAN,
      Webnative.ucan.encode(accountUcan)
    )

    // Register or authenticate
    if (isNewUser) {
      const registrationProgram = await Webnative.program({
        ...settings,
        crypto: walletCrypto,
        manners,
      })

      const { success } = await registrationProgram.auth.register({ username })
      if (!success) throw new Error("Failed to register user")
    } else {
      await Session.provide(
        webnativeProgram.components.storage,
        { type: webnativeProgram.auth.implementation.type, username }
      )
    }

    // Create session
    session = await webnativeProgram.auth.session()
    webnativeProgram.session = session
  }

  // Fin
  return webnativeProgram
}



// 🛠


function logErrorAndRethrow<T>(promiseFn: () => Promise<T>): Promise<T> {
  return promiseFn().catch(err => {
    console.error(err)
    throw new Error(err)
  })
}