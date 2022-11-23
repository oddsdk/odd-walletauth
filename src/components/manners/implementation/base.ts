import * as Crypto from "webnative/components/crypto/implementation.js"
import * as Manners from "webnative/components/manners/implementation.js"

import * as FileSystem from "webnative/fs/types.js"
import * as FileSystemProtocol from "webnative/fs/protocol/basic.js"
import * as Path from "webnative/path/index.js"
import * as RootKey from "webnative/common/root-key.js"
import * as WebnativeManners from "webnative/components/manners/implementation/base.js"

import { PublicFile } from "webnative/fs/v1/PublicFile.js"
import { PublicTree } from "webnative/fs/v1/PublicTree.js"
import { CID, decodeCID } from "webnative/common/cid.js"

import * as Wallet from "../../../wallet/implementation.js"


// 🏔


export const READ_KEY_PATH = Path.file(Path.Branch.Public, ".well-known", "read-key")


export type Dependents = {
  crypto: Crypto.Implementation
}



// 🛳


export async function implementation(
  dependents: Dependents,
  wallet: Wallet.Implementation,
  opts: Manners.ImplementationOptions
): Promise<Manners.Implementation> {
  const base = WebnativeManners.implementation(opts)

  return {
    ...base,

    fileSystem: {
      ...base.fileSystem,
      hooks: {
        ...base.fileSystem.hooks,

        afterLoadNew: async (fs: FileSystem.API, ...args) => {
          const readKey = await RootKey.retrieve({
            crypto: dependents.crypto,
            accountDID: fs.account.rootDID,
          })

          await fs.write(
            READ_KEY_PATH,
            await wallet.encrypt(readKey)
          )

          return base.fileSystem.hooks.afterLoadNew(fs, ...args)
        },
        beforeLoadExisting: async (dataRoot: CID, account: FileSystem.AssociatedIdentity, dataFlowComponents: Manners.DataFlowComponents) => {
          if (await RootKey.exists({ crypto: dependents.crypto, accountDID: account.rootDID }) === true) return

          const { depot, reference } = dataFlowComponents
          const publicCid = decodeCID((await FileSystemProtocol.getSimpleLinks(depot, dataRoot)).public.cid)
          const publicTree = await PublicTree.fromCID(depot, reference, publicCid)
          const unwrappedPath = Path.unwrap(READ_KEY_PATH)
          const publicPath = unwrappedPath.slice(1)
          const readKeyChild = await publicTree.get(publicPath)

          if (!readKeyChild) {
            throw new Error(`Expected an encrypted read key at: ${Path.log(publicPath)}`)
          }

          if (!PublicFile.instanceOf(readKeyChild)) {
            throw new Error(`Did not expect a tree at: ${Path.log(publicPath)}`)
          }

          const encryptedRootKey = readKeyChild.content
          const rootKey = await wallet.decrypt(encryptedRootKey)

          RootKey.store({
            crypto: dependents.crypto,
            accountDID: account.rootDID,
            readKey: rootKey
          })
        },
      }
    }
  }
}