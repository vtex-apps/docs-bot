import {
  ExternalClient,
  InstanceOptions,
  IOContext
} from '@vtex/api'
import * as jwt from 'jsonwebtoken'

export default class Github extends ExternalClient {
  private PEM: string = ''

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

  public setAppPEM(pem: string): void {
    this.PEM = pem
  }

  public async getPR(repo: string, prId: string): Promise < any > {
    return this.http.get(`repos/${repo}/pulls/${prId}`, {
      metric: 'get-pr',
    })
  }

  public async getPRComments(repo: string, prId: string): Promise < any > {
    return this.http.get(`repos/${repo}/issues/${prId}/comments`, {
      metric: 'get-pr-comments',
    })
  }

  public async createCommitStatus(
    repo: string,
    description: string,
    context: string,
    state: 'error' | 'failure' | 'pending' | 'success',
    sha: string
  ): Promise < any > {
    console.log(`repos/${repo}/statuses/${sha}`)
    return this.http.post(`repos/${repo}/statuses/${sha}`, {
      context,
      description,
      state,
    }, {
      headers: {
        'Authorization': `token ${await this.getAccessToken(this.installationID)}`,
      },
    })
  }

  public async writeComment(repo: string, prId: string, body: string): Promise < any > {
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

  public async createNewIssue(repo: string, title: string, body: string, labels ? : [string]): Promise < any> {
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
    const {content, sha} = await this.http.get(
      `/repos/${repo}/contents${filePath}`,
      {
        metric: 'read-file',
      }
    )

    return {
      content: Buffer.from(content, 'base64').toString(),
      sha,
    }
  }

  public async getPRFileChanges(repo: string, pr: string): Promise <any> {
    return this.http.get(
      `/repos/${repo}/pulls/${pr}/files`,
      {
        metric: 'get-pr-files',
      }
    )
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
      'Content-Type': 'application/json',
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
