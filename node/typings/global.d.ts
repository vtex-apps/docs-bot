interface GithubAuthHeader {
  Authorization: string,
  'X-Vtex-Use-Https': string
}

interface DocsBotConfigs {
  pem: string,
  reposWithoutReadMe: string[]
}
