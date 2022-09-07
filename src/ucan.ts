import * as uint8arrays from "uint8arrays"

import { encodeHeader, encodePayload } from "webnative/ucan/index.js"
import { Resource, Ucan } from "webnative/ucan/types.js"

import * as wallet from "./wallet"


/**
 * Create a UCAN signed by your wallet.
 * This assumes a SECP256K1 signature.
 * Behaves the same as the ucan.build() function from webnative.
 */
export async function build({
  audience,
  issuer,
  lifetimeInSeconds = 90,
  potency,
  proof,
  resource
}: {
  audience: string
  issuer: string
  lifetimeInSeconds?: number
  potency?: string
  proof?: string
  resource?: Resource
}): Promise<Ucan> {
  const currentTimeInSeconds = Math.floor(Date.now() / 1000)

  const header = {
    alg: "ES256K",
    typ: "JWT",
    uav: "1.0.0"
  }

  const payload = {
    aud: audience,
    exp: currentTimeInSeconds + lifetimeInSeconds,
    fct: [],
    iss: issuer,
    nbf: currentTimeInSeconds - 90,
    prf: proof || null,
    ptc: potency || null,
    rsc: resource || "*",
  }

  const encodedHeader = encodeHeader(header)
  const encodedPayload = encodePayload(payload)
  const signature = uint8arrays.toString(
    await wallet.sign(
      uint8arrays.fromString(
        `${encodedHeader}.${encodedPayload}`,
        "utf8"
      )
    ),
    "base64url"
  )

  return {
    header,
    payload,
    signature
  }
}



/**
 * Verify a ES256K UCAN signature.
 */
export function verifyUcanSignature(ucan: Ucan): Promise<boolean> {
  const message = uint8arrays.fromString(
    `${encodeHeader(ucan.header)}.${encodePayload(ucan.payload)}`,
    "utf8"
  )

  const signature = uint8arrays.fromString(
    ucan.signature || "",
    "base64url"
  )

  return wallet.verifySignedMessage({
    signature: signature,
    message,
  })
}
