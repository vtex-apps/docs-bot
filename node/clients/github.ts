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

  private routes = {
    contents: (repo: string, filePath: string): string => `${this.routes.repo(repo)}/contents${filePath}`,
    issue: (repo: string, issueNumber: string): string => `${this.routes.issues(repo)}/${issueNumber}`,
    issueComments: (repo: string, issueNumber: string): string => `${this.routes.issue(repo, issueNumber)}/comments`,
    issues: (repo: string): string => `${this.routes.repo(repo)}/issues`,
    orgRepos: (org: string): string => `orgs/${org}/repos`,
    pull: (repo: string, prNumber: string): string => `${this.routes.pulls(repo)}/${prNumber}`,
    pullFiles: (repo: string, prNumber: string): string => `${this.routes.pull(repo, prNumber)}/files`,
    pulls: (repo: string): string => `${this.routes.repo(repo)}/pulls`,
    repo: (repo: string): string => `repos/${repo}`,
    statuses: (repo: string, sha: string): string => `${this.routes.repo(repo)}/statuses/${sha}`,
  }
  constructor(
    context: IOContext,
    options ? : InstanceOptions) {
    super('http://api.github.com/', context, options)
  }

  public setAppPEM(pem: string): void {
    this.PEM = pem
  }

  public async getOrgRepos (org: string): Promise<any> {
    let repos: any[] = []
    let page = 0
    let last = false

    while (!last) {
      const {data: pageRepos, headers} = await this.http.getRaw(this.routes.orgRepos(org), {
        headers: await this.getAuthHeader(),
        metric: 'get-org-repos',
        params: {
          page,
          per_page: 100,
        },
      })

      repos = repos.concat(pageRepos)
      page++
      last = !headers.link.includes('next')
    }

    return repos
  }

  public async getPR(repo: string, prId: string): Promise < any > {
    return this.http.get(this.routes.pull(repo, prId), {
      headers: await this.getAuthHeader(),
      metric: 'get-pr',
    })
  }

  public async getPRComments(repo: string, prId: string): Promise < any > {
    return this.http.get(this.routes.issueComments(repo, prId), {
      headers: await this.getAuthHeader(),
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
    return this.http.post(this.routes.statuses(repo, sha), {
      context,
      description,
      state,
    }, {
      headers: await this.getAuthHeader(),
      metric: 'create-commit-status',
    })
  }

  public async writeComment(repo: string, prId: string, body: string): Promise < any > {
    return this.http.post(
      this.routes.issueComments(repo, prId), {
        body,
      }, {
        headers: await this.getAuthHeader(),
        metric: 'write-pr-comments',
      })
  }

  public async createNewIssue(repo: string, title: string, body: string, labels ? : [string]): Promise < any> {
    return this.http.post(
      this.routes.issues(repo), {
        body,
        labels,
        title,
      }, {
        headers: await this.getAuthHeader(),
        metric: 'create-issue',
      })
  }

  public async getFileContents(repo: string, filePath: string): Promise < any > {
    const {content, sha} = await this.http.get(
      this.routes.contents(repo, filePath),
      {
        headers: await this.getAuthHeader(),
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
      this.routes.pullFiles(repo, pr),
      {
        headers: await this.getAuthHeader(),
        metric: 'get-pr-files',
      }
    )
  }

  public async updateFileContents(repo: string, filePath: string, commitMessage: string, content:string, sha:string) {
    await this.http.put(
      this.routes.contents(repo, filePath),
      {
        committer: this.comitter,
        content: Buffer.from(content, 'binary').toString('base64'),
        message: commitMessage,
        sha,
      },
      {
        headers: await this.getAuthHeader(),
        metric: 'write-pr-comments',
      }
    )
  }

  private async getAccessToken(installation: number): Promise < string > {
    const headers = {
      'Accept': 'application/vnd.github.machine-man-preview+json',
      'Authorization': `Bearer ${this.generateJwtToken()}`,
      'Content-Type': 'application/json',
      'X-Vtex-Use-Https': 'true',
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

  private async getAuthHeader():  Promise <GithubAuthHeader>{
    return {
      'Authorization': `token ${await this.getAccessToken(this.installationID)}`,
      'X-Vtex-Use-Https': 'true',
    }
  }
}
