import * as auth from "webnative/auth/index.js"
import * as dataRoot from "webnative/data-root.js"
import * as did from "webnative/did/index.js"
import * as appState from "webnative/auth/state/app.js"
import * as cidLog from "webnative/common/cid-log.js"
import * as path from "webnative/path.js"
import * as storage from "webnative/storage/index.js"
import * as ucan from "webnative/ucan/index.js"
import * as ucanInternal from "webnative/ucan/internal.js"

import { AppState, InitialisationError, crypto, isSupported, loadFileSystem } from "webnative"
import { USERNAME_STORAGE_KEY, authenticatedUsername } from "webnative/common/index.js"

import { decodeCID } from "webnative/common/cid.js"
import { leave } from "webnative/auth.js"
import { isUsernameAvailable, storeFileSystemRootKey } from "webnative/lobby/index.js"
import { setImplementations } from "webnative/setup"

import { getSimpleLinks } from "webnative/fs/protocol/basic.js"
import { PublicFile } from "webnative/fs/v1/PublicFile.js"
import { PublicTree } from "webnative/fs/v1/PublicTree.js"
import FileSystem from "webnative/fs/filesystem.js"

import * as readKey from "./read-key.ts"
import * as walletUcan from "./ucan.ts"
import * as wallet from "./wallet.ts"

import { USE_WALLET_AUTH_IMPLEMENTATION } from "./auth/implementation.ts"
import { hasProp } from "./common.ts"



// ⛰


export const ROOT_PERMISSIONS = { fs: { private: [ path.root() ], public: [ path.root() ] } }
export const READ_KEY_PATH = path.file(path.Branch.Public, ".well-known", "read-key")



// 🚀



export async function app(options?: { resetWnfs?: boolean, useWnfs?: boolean }): Promise<AppState> {
  let fs

  options = options || {}

  const { resetWnfs = false, useWnfs = true } = options

  setImplementations(USE_WALLET_AUTH_IMPLEMENTATION)

  if (resetWnfs) await leave({ withoutRedirect: true })

  // Check if browser is supported
  if (hasProp(self, "isSecureContext") && self.isSecureContext === false) throw InitialisationError.InsecureContext
  if (await isSupported() === false) throw InitialisationError.UnsupportedBrowser

  const authedUsername = await authenticatedUsername()

  // Authenticate & create user if necessary
  const username = await wallet.username()
  const isNewUser = await isUsernameAvailable(username) === false

  if (!authedUsername) {
    if (isNewUser) {
      const { success } = await auth.register({ username })
      if (!success) throw new Error("Failed to create Fission user")
    }

    // Authenticate
    await storage.setItem(USERNAME_STORAGE_KEY, username)

    // Self-authorize a filesystem UCAN if needed
    if (useWnfs) {
      const u = ucan.encode(await walletUcan.build({
        issuer: await wallet.did(),
        audience: await did.ucan(),
        potency: "SUPER_USER",
        lifetimeInSeconds: 60 * 60 * 24 * 30 * 12 * 1000, // 1000 years
      }))

      await ucanInternal.store([ u ])
    }
  }

  if (useWnfs) {
    const dataPointer = isNewUser ? null : await dataRoot.lookup(username)

    if (!dataPointer || resetWnfs) {
      // New FS
      const rootKey = await crypto.aes.genKeyStr()

      fs = await FileSystem.empty({
        permissions: ROOT_PERMISSIONS,
        rootKey: rootKey,
      })

      await fs.write(
        READ_KEY_PATH,
        await readKey.encrypt(rootKey)
      )

      await fs.addPublicExchangeKey()
      await fs.mkdir(path.directory("private", "Apps"))
      await fs.mkdir(path.directory("private", "Audio"))
      await fs.mkdir(path.directory("private", "Documents"))
      await fs.mkdir(path.directory("private", "Photos"))
      await fs.mkdir(path.directory("private", "Video"))

      const rootCid = await fs.publish()

      await cidLog.clear()
      await cidLog.add(rootCid.toString())

    } else {
      // Existing FS
      const publicCid = decodeCID((await getSimpleLinks(dataPointer)).public.cid)
      const publicTree = await PublicTree.fromCID(publicCid)
      const unwrappedPath = path.unwrap(READ_KEY_PATH)
      const publicPath = unwrappedPath.slice(1)
      const readKeyChild = await publicTree.get(publicPath)

      if (!readKeyChild) {
        throw new Error(`Expected an encrypted read key at: ${path.log(publicPath)}`)
      }

      if (!PublicFile.instanceOf(readKeyChild)) {
        throw new Error(`Did not expect a tree at: ${path.log(publicPath)}`)
      }

      const encryptedRootKey = readKeyChild.content
      if (encryptedRootKey.constructor.name !== "Uint8Array") {
        throw new Error("The read key was not a Uint8Array as we expected")
      }

      const rootKey = await readKey.decrypt(encryptedRootKey as Uint8Array)

      storeFileSystemRootKey(rootKey)

      fs = await loadFileSystem(ROOT_PERMISSIONS, username, rootKey)

    }
  }

  return appState.scenarioAuthed(username, fs)
}
