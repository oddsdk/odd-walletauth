import * as storage from "webnative/storage/index.js"
import * as wn from "webnative"
import { useEffect, useState } from "react"
import { useAccount } from "wagmi"
import Provider from "eip1193-provider"

import Header from "./components/Header"
import SignMessage from "./components/SignMessage"

import * as ethereum from "../ethereum.js"
import * as webnative from "../webnative.js"


const App = () => {
  const [ provider, setProvider ] = useState(null)
  const [ didSetup, setDidSetup ] = useState(false)
  const account = useAccount()
  const { isConnected } = account

  useEffect(() => {
    async function getProvider() {
      return account.connector
        ? await account.connector.getProvider()
        : null
    }

    if (isConnected) {
      getProvider().then(p => { if (p) setProvider(p) })
    } else {
      setProvider(null)
    }
  }, [ isConnected, account.connector ])

  useEffect(() => {
    async function setup(prov: Provider) {
      console.log("💎 Setting up")
      ethereum.setProvider(prov)

      setDidSetup(true)

      wn.setup.debug({ enabled: true })
      wn.setup.endpoints({
        api: "https://runfission.net",
        lobby: "https://auth.runfission.net",
        user: "fissionuser.net"
      })

      const fs = await webnative.login()
      if (!fs) throw new Error("Was not able to load the filesystem")

      console.log(await fs.ls(wn.path.directory(wn.path.Branch.Private)))
    }

    async function teardown() {
      console.log("💥 Tearing down")
      await storage.removeItem("readKey")
      await storage.removeItem("ucan")
      await wn.leave({ withoutRedirect: true })
    }

    if (provider) setup(provider)
    else if (didSetup) teardown()
  }, [ provider ])

  return (
    <div>
      <Header />

      {provider && <SignMessage />}
    </div>
  )
}

export default App;
