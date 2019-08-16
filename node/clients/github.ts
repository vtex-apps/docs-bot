import {
  ExternalClient,
  InstanceOptions,
  IOContext,
  IOResponse
} from '@vtex/api'
import * as jwt from 'jsonwebtoken'

export default class Github extends ExternalClient {
  private PEM =
    ``
  private installationID = 1428901
  private clientID = 38075
  private comitter = {
    'email': 'docsbot@vtex.com',
    'name': 'docs-bot',
  }

  constructor(
    context: IOContext,
    options ? : InstanceOptions) {
    super('https://api.github.com/', context, options)
  }

  public async getPRComments(repo: string, prId: string): Promise < string > {
    return this.http.get(`repos/${repo}/issues/${prId}/comments`, {
      metric: 'get-pr-comments',
    })
  }

  public async writeComment(repo: string, prId: string, body: string): Promise < string > {
    return this.http.post(
      `/repos/${repo}/issues/${prId}/comments`, {
        body,
      }, {
        headers: {
          'Authorization': `token ${await this.getAccessToken(this.installationID)}`,
        },
        metric: 'write-pr-comments',
      })
  }

  public async createNewIssue(repo: string, title: string, body: string, labels ? : [string]): Promise < IOResponse < string >> {
    return this.http.post(
      `/repos/${repo}/issues`, {
        body,
        labels,
        title,
      }, {
        headers: {
          'Authorization': `token ${await this.getAccessToken(this.installationID)}`,
        },
        metric: 'create-issue',
      })
  }

  public async getFileContents(repo: string, filePath: string): Promise < any > {
    const obj = await this.http.get(
      `/repos/${repo}/contents${filePath}`,
      {
        metric: 'read-file',
      }
    )

    console.log(obj)
    const {content, sha} = obj
    console.log(`/repos/${repo}/contents${filePath}`)

    return {
      content: Buffer.from(content, 'base64').toString(),
      sha,
    }
  }

  public async updateFileContents(repo: string, filePath: string, commitMessage: string, content:string, sha:string) {
    console.log(Buffer.from(content, 'binary').toString('base64'))
    console.log(`/repos/${repo}/contents${filePath}`)
    console.log(await this.getAccessToken(this.installationID))
    console.log(sha)
    await this.http.put(
      `/repos/${repo}/contents${filePath}`,
      {
        committer: this.comitter,
        content: Buffer.from(content, 'binary').toString('base64'),
        message: commitMessage,
        sha,
      },
      {
        headers: {
          'Authorization': `token ${await this.getAccessToken(this.installationID)}`,
        },
        metric: 'write-pr-comments',
      }
    )
  }

  private async getAccessToken(installation: number): Promise < string > {
    const headers = {
      'Accept': 'application/vnd.github.machine-man-preview+json',
      'Authorization': `Bearer ${this.generateJwtToken()}`,
      'Content-Type': 'application/json',
    }

    const {
      token,
    } = await this.http.post(`app/installations/${installation}/access_tokens`, {}, {
      headers,
      metric: 'get-access-token',
    })

    return token
  }

  private generateJwtToken(): string {
    const currentTime = new Date().getTime()

    return jwt.sign({
        exp: Math.floor(currentTime / 1000) + 300,
        iat: Math.floor(currentTime / 1000),
        iss: this.clientID,
      },
      this.PEM, {
        algorithm: 'RS256',
      }
    )
  }

}
