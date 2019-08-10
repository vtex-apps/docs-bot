import {
  ExternalClient,
  InstanceOptions,
  IOContext,
  IOResponse
} from '@vtex/api'
import * as jwt from 'jsonwebtoken'

export default class Github extends ExternalClient {
  private PEM =
    `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEAs//bNxmiFQ78HKHUrDaVN9gGc/5jDYgfPkE80SSHUR9F1rG6
Cx6gRBTLaCXTXKyFv+UeOodfEe4jp/d7dkn4ICNENNq//OmInwZe5/YmPSTu18dL
jj/I+48gEcq/i/S9D/D/IKnqmJdF3v3yUdE5Sx4KI5xnlcPNMdbJaIXKL3eUB8Cs
taDSbqOABdUJVvvtapVz8enLPxPkOLh9x8rtkZy0rP60mQ0M4Ihm5oQoWJGq7YYO
LLrr0RUBV2l1/EIHj+CMiCh2uzyKQxDAkz6saLqLoG/TiLd1RX3J2/ILMGsA21qq
zloA7uFPPqXm7OxBdN/zC9548BJMYKYoaFfwYwIDAQABAoIBAAjdpVKFdLJM1qYi
YnNJDPh/L3IvKXnVJpTOacxzXCbmv23fuyYpEAPKcmpi0pJR/RSCmIaRfGFJtX/k
dLRS2GHc2tMvox0184DBs5MBUMjaNNlz+4i6I5AgcJfvwJeIKnfKiwZ02BVD/jEJ
mRHmmEfW5vDyFzgNOOInjiwTyu2jhQF8+V/Dg3iBEFOfxQofx5BPN70YHvoVlRk4
lBkzaAaVKebDJb0GKbelz3HaWdmmlnxTjILCFrGfxr9Jmm2zsQUMfZpr+gF8+Svc
2/m1vLJxo9E2Yvpu2e7iRLQN3Ktd1RS7C1tBVJVP9kL8Of1zWfZxWzBO/jdNs/Xd
EJIMqMECgYEA3yCTM0uq4nelBY2f0lg7yowCdLZvdB7vUpG7tnM5XGWo/xoevelz
v1JcZEmNSzUIcQ0N0NoLnWeVl4q/GEXjSHKnaipOfAvGf2kmNSja5WB2z0uyOlQ8
J4TTinsEtBm4SKgGpxcPhv3oB7cNnPEH0B6S21TE7y7P1jtd+zOIuQkCgYEAzoSu
W4lLpgzXE6JkHIPrdkrYJeixiB7UYEKcjha/yNhtfCl5JKt7lWvy+1f79oRBNJH0
NTWceZPPUwiX1LoCN+r7YeXQvu5aO6MxTGbDtJ5xjcpBjHN21WMRYNH5BSW5+u57
BrSy2x6cXdGgxtZafycWt8gOjWElpwhVTpXIVQsCgYBfi/N848opcFKaLitiR6ZS
9eGXWQghEZ4qHX3kgzLs/huAIg9IA9As/XfS+iwnKG6U+qIP7U9L+C921VM/ca4C
OBa4v6UcOW6m4MAbw4L49nXqDuAjWi7oPVjY1BUPinP/qPQwWQ+tHs1dgGWz7wMJ
fA4nHgW25rTZaFK2XzsNAQKBgD/JN1lKdLUa7itAUw+Dp2xn/Y7n6j2S2CHLMTOp
zx6nylk5LhOna4phRzFeoZIok0M7eWQd5PCgOL76vnqT4S+IQpCgPPNcBz64Tve8
HeJhtc0HlWteFmweJzXyZKm0V1cr5Y/SrBOFxuIrZy9C8byoRBoLjoMYaFrI9iBJ
nxC1AoGBAMK0VFV0+NtQm1qY71XXNhVmWvHX28/XIyjh0cULVKa54hqSHzwFCE0C
g9DsaiwvD7dMI8/i5ZzNE0HZFlgw+g8WMtjjJXuIBXolZ19WGxUIOLyf/lVy/Nqh
QgBi9RnxgZrhrit1RNrEcAwiarOl+K1QoDoGq87izHol0WQ2YeLM
-----END RSA PRIVATE KEY-----
`
  private installationID = 1428901
  private clientID = 38075

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

  public async getFileContents(repo: string, filePath: string): Promise < string > {
    return atob(await this.http.get(
      `/repos/${repo}/contents${filePath}`, {
        metric: 'read-file',
      }))
  }

  private async getAccessToken(installation: number): Promise < string > {
    const headers = {
      'Accept': 'application/vnd.github.machine-man-preview+json',
      'Authorization': `Bearer ${this.generateJwtToken()}`,
      'Content-Type': 'application/json'
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
