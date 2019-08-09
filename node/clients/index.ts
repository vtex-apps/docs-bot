import { IOClients } from '@vtex/api'

import Github from './github'

// Extend the default IOClients implementation with our own custom clients.
export class Clients extends IOClients {
  public get github() {
    return this.getOrSet('github', Github)
  }
}
