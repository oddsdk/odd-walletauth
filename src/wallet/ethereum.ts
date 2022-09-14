import type { ProviderRpcError } from "eip1193-provider"
import type { Implementation, InitArgs } from "./types"

import * as nacl from "tweetnacl"
import * as secp from "@noble/secp256k1"
import * as uint8arrays from "uint8arrays"
import { keccak_256 } from "@noble/hashes/sha3"
import Provider from "eip1193-provider"

import { hasProp, isString, isStringArray } from "../common"


// ⛰


type Signature = {
  r: Uint8Array
  s: Uint8Array

  recoveryParam: number
  v: number

  compact: Uint8Array
  full: Uint8Array
}


export const MSG_TO_SIGN = uint8arrays.fromString("Hi there, would you like to sign this so we can generate a DID for you?", "utf8")
export const SECP_PREFIX = new Uint8Array([ 0xe7, 0x01 ])



// 🌸


let didBindEvents = false
let globCurrentAccount: string | null = null
let globPublicEncryptionKey: Uint8Array | null = null
let globPublicSignatureKey: Uint8Array | null = null
const globSignature: { [key: string]: Uint8Array } = {}
let provider: Provider | null = hasProp(self, "ethereum") ? self.ethereum as Provider : null



// 🚀


export function setProvider(p: Provider): void {
  provider = p
  didBindEvents = false
}



// 💎 ~ IMPLEMENTATION


export async function decrypt(encryptedMessage: Uint8Array): Promise<Uint8Array> {
  const ethereum = await load()
  const account = await address()

  return ethereum
    .request({ method: "eth_decrypt", params: [ uint8arrays.toString(encryptedMessage, "utf8"), account ] })
    .then(getResult)
    .then(resp => {
      try {
        return isString(resp) ? JSON.parse(resp).data : resp
      } catch (_e) {
        return resp
      }
    })
    .then(resp => {
      if (isString(resp)) return resp
      else throw new Error("Expected to decrypt a string")
    })
    .then(resp => uint8arrays.fromString(resp, "base64pad"))
}


export async function did(): Promise<string> {
  const key = await publicSignatureKey()
  const arr = uint8arrays.concat([ SECP_PREFIX, key ])

  return `did:key:z${uint8arrays.toString(arr, "base58btc")}`
}


export async function encrypt(data: Uint8Array): Promise<Uint8Array> {
  const encryptionPublicKey = await publicEncryptionKey()

  // Generate ephemeral keypair
  const ephemeralKeyPair = nacl.box.keyPair()
  const nonce = nacl.randomBytes(nacl.box.nonceLength)

  // Data padding
  // const dataUtf8 = uint8arrays.toString(data, "base64pad")
  // const dataLength = uint8arrays.fromString(JSON.stringify({ data: dataUtf8, padding: '' }), "utf8").length
  // const modVal = dataLength % (2 ** 11)
  // const padLength = modVal > 0 ? (2 ** 11) - modVal - 16 : 0
  // const padding = '0'.repeat(padLength)
  // const dataWithPadding = uint8arrays.fromString(JSON.stringify({ data: dataUtf8, padding }), "utf8")

  // Encrypt
  const encryptedMessage = nacl.box(
    uint8arrays.fromString(uint8arrays.toString(data, "base64pad"), "utf8"),
    nonce,
    encryptionPublicKey,
    ephemeralKeyPair.secretKey,
  )

  // The RPC method `eth_decrypt` needs an object with these exact props,
  // hence the `JSON.stringify`.
  return uint8arrays.fromString(
    JSON.stringify({
      version: "x25519-xsalsa20-poly1305",
      nonce: uint8arrays.toString(nonce, "base64pad"),
      ephemPublicKey: uint8arrays.toString(ephemeralKeyPair.publicKey, "base64pad"),
      ciphertext: uint8arrays.toString(encryptedMessage, "base64pad"),
    }),
    "utf8"
  )
}


export async function init({ onAccountChange, onDisconnect }: InitArgs): Promise<void> {
  if (didBindEvents) return

  const ethereum = await load()

  // accountsChanged is called when the account connected to the app changes - this includes when
  // an additional account is connected, as well as when the connected account is disconnected,
  // which will return an empty accounts array
  ethereum.on("accountsChanged", async (accounts: string[]) => {
    if (accounts.length) {
      // MetaMask can sometimes trigger accountsChanged when first connecting to an account, so we need to
      // ensure it is actually being triggered by a new account change to avoid extra signatures
      if (globCurrentAccount !== accounts[0]) {
        handleAccountsChanged(accounts)
        await onAccountChange()
      }
    } else {
      // disconnected
      await disconnect({ onDisconnect })
    }
  })

  // The MetaMask provider emits this event if it becomes unable to submit RPC requests to any chain.
  // In general, this will only happen due to network connectivity issues or some unforeseen error.
  ethereum.on("disconnect", async () => {
    await disconnect({ onDisconnect })
  })

  didBindEvents = true
}


async function disconnect({
  onDisconnect,
}: {
  onDisconnect: () => Promise<unknown>
}): Promise<void> {
  globCurrentAccount = null
  await onDisconnect()
}


export async function sign(data: Uint8Array): Promise<Uint8Array> {
  const key = `${globCurrentAccount}-${data.toString()}`
  if (globSignature[key]) return globSignature[key]

  const provider = await load()

  const signature = await provider.request({
    method: "personal_sign", params: [
      uint8ArrayToEthereumHex(data),
      await address(),
    ]
  })
    .then(getResult)
    .then(res => {
      if (isString(res)) return res
      else throw new Error("Expected the result of `sign` to be a hexadecimal string")
    })
    .then(uint8ArrayFromEthereumHex)

  globSignature[key] = signature

  return signature
}


export function username(): Promise<string> {
  return address()
}


export async function verifySignedMessage(
  { signature, message, publicKey }:
    { signature: Uint8Array; message: Uint8Array; publicKey?: Uint8Array }
): Promise<boolean> {
  return secp.verify(
    deconstructSignature(signature).full,
    hashMessage(message),
    publicKey || await publicSignatureKey()
  )
}



// ⚙️ ~ PARTS


export async function address(): Promise<string> {
  if (globCurrentAccount) return globCurrentAccount

  const ethereum = await load()

  await ethereum
    .request({ method: "eth_requestAccounts" })
    .then(getResult)
    .then(handleAccountsChanged)
    .catch((err: ProviderRpcError) => {
      // Some unexpected error.
      // For backwards compatibility reasons, if no accounts are available,
      // eth_accounts will return an empty array.
      console.error(err)
    })

  if (!globCurrentAccount) {
    throw new Error("Failed to retrieve Ethereum account")
  }

  return globCurrentAccount
}


export function load(): Promise<Provider> {
  if (!provider) throw new Error("Provider was not set yet")
  return Promise.resolve(provider)
}


export async function publicEncryptionKey(): Promise<Uint8Array> {
  if (globPublicEncryptionKey) return globPublicEncryptionKey

  const ethereum = await load()
  const account = await address()

  const key: unknown = await ethereum
    .request({ method: "eth_getEncryptionPublicKey", params: [ account ] })
    .then(getResult)
    .catch((error: ProviderRpcError) => {
      if (error.code === 4001) {
        // EIP-1193 userRejectedRequest error
        console.error("We can't encrypt anything without the key.")
      } else {
        console.error(error)
      }
    })

  if (typeof key !== "string") {
    throw new Error("Expected ethereumPublicKey to be a string")
  }

  globPublicEncryptionKey = uint8arrays.fromString(key, "base64pad")
  return globPublicEncryptionKey
}


export async function publicSignatureKey(): Promise<Uint8Array> {
  if (globPublicSignatureKey) return globPublicSignatureKey

  const signature = await sign(MSG_TO_SIGN)
  const signatureParts = deconstructSignature(signature)

  globPublicSignatureKey = secp.recoverPublicKey(
    hashMessage(MSG_TO_SIGN),
    signatureParts.full,
    signatureParts.recoveryParam
  )

  return globPublicSignatureKey
}



// 🛠


export function deconstructSignature(signature: Uint8Array): Signature {
  const { ...values } = splitSignature(signature)

  return {
    ...values,
    full: uint8arrays.concat([ values.r, values.s ])
  }
}


export function getResult(a: unknown): unknown {
  return hasProp(a, "result") ? a.result : a
}


export function hashMessage(message: Uint8Array): Uint8Array {
  return keccak_256(
    uint8arrays.concat([ signedMessagePrefix(message), message ])
  )
}


export function signedMessagePrefix(message: Uint8Array): Uint8Array {
  return uint8arrays.fromString(
    `\x19Ethereum Signed Message:\n${message.length}`,
    "utf8"
  )
}


/**
 * Extracted from ethers.js
 * https://github.com/ethers-io/ethers.js/blob/e19290305080ebdfa2cb2ab2719cb53fee5a6cc7/packages/bytes/src.ts/index.ts#L333
 */
export function splitSignature(signature: Uint8Array) {
  let r, s, v

  // Get the r, s and v
  if (signature.length === 64) {
    // EIP-2098; pull the v from the top bit of s and clear it
    v = 27 + (signature[ 32 ] >> 7)
    signature[ 32 ] &= 0x7f

    r = signature.slice(0, 32)
    s = signature.slice(32, 64)

  } else if (signature.length === 65) {
    r = signature.slice(0, 32)
    s = signature.slice(32, 64)
    v = signature[ 64 ]

  } else {
    throw new Error("Invalid signature length, must be 64 or 65 bytes")

  }

  // Allow a recid to be used as the v
  if (v < 27) {
    if (v === 0 || v === 1) {
      v += 27
    } else {
      throw new Error(`Invalid v byte: ${v}`)
    }
  }

  // Compute recoveryParam from v
  const recoveryParam = 1 - (v % 2)

  // Compute _vs from recoveryParam and s
  if (recoveryParam) { signature[ 32 ] |= 0x80 }
  const yParityAndS = signature.slice(32, 64)
  const compact = uint8arrays.concat([ r, yParityAndS ])

  // Fin
  return { r, s, v, recoveryParam, compact }
}


export function uint8ArrayFromEthereumHex(data: string): Uint8Array {
  return uint8arrays.fromString(data.substring(2), "hex")
}


export function uint8ArrayToEthereumHex(data: Uint8Array): string {
  return "0x" + uint8arrays.toString(data, "hex")
}



// 🔬


export async function verifyPublicKey(): Promise<boolean> {
  return verifySignedMessage({
    signature: await sign(MSG_TO_SIGN),
    message: MSG_TO_SIGN,
    publicKey: await publicSignatureKey(),
  })
}



// ㊙️


function handleAccountsChanged(accounts: unknown) {
  if (isStringArray(accounts)) {
    if (!accounts[ 0 ]) {
      console.warn("Please connect to Ethereum/Metamask.")
    } else if (accounts[ 0 ] !== globCurrentAccount) {
      globCurrentAccount = accounts[ 0 ]
    }
  }
}



// 🛳


export const implementation: Implementation = {
  decrypt,
  encrypt,
  did,
  init,
  sign,
  ucanAlgorithm: "ES256K",
  username,
  verifySignedMessage,
}


export const ETHEREUM_IMPLEMENTATION = implementation
