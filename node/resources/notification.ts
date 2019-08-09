export class Notification {
  constructor(
    private message: string,
    private title: string,
    private labels: [string],
    private user: string) {
  }

  public trigger(): boolean {
    return true
  }
}
