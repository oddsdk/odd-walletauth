/**
 * Error map for Webnative WalletAuth
 */
declare enum WalletAuthError {
  ExpectedPubKeyToBeString = "Expected ethereumPublicKey to be a string",
  ExpectedReadKeyToBeUint8Array = "The read key was not a Uint8Array as we expected",
  ExpectedStringToDecrypt = "Expected to decrypt a string",
  ExpectedSignToBeHexString = "Expected the result of `sign` to be a hexadecimal string",
  FailedAccountRetrieval = "Failed to retrieve Ethereum account",
  FailedToCreateUser = "Failed to create Fission user",
  InvalidSignatureLength = "Invalid signature length, must be 64 or 65 bytes",
  ProviderNotSet = "Provider was not set yet",
}

export default WalletAuthError
