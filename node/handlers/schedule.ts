import {
  getAppConfigs,
  updateConfigs
} from '../utils/utils'

const VTEX_APPS_ORG = 'vtex-apps'
let appPem: string = ''

export async function handleSchedule(ctx: Context, next: () => Promise < any > ) {
  ctx.set('cache-control', 'no-cache,no-store')

  noReadMeAppsJob(ctx)

  ctx.status = 200
  ctx.body = {message: 'started checking apps\' docs'}

  await next()
}

const noReadMeAppsJob = async (ctx: Context) => {
  const {
    pem,
    reposWithoutReadMe,
  } = await getAppConfigs(ctx)
  const gitHub = ctx.clients.github

  if (!appPem) {
    appPem = pem
  }

  await gitHub.setAppPEM(appPem)

  const repos = await ctx.clients.github.getOrgRepos(VTEX_APPS_ORG)

  for (const {full_name: repo, html_url: repoUrl} of repos) {
    try {
      await gitHub.getFileContents(repo, '/docs/README.md')
    } catch (e) {
      if (reposWithoutReadMe.includes(repo)) {
        continue
      }

      await gitHub.createNewIssue(
        'vtex-apps/io-documentation',
        `${repo} has no documentation yet`,
        `[${repo}](${repoUrl}) hasn\'t created any README file yet or is not using Docs Builder`,
        ['no-documentation']
      )

      reposWithoutReadMe.push(repo)
    }
  }

  await updateConfigs(ctx, {
    reposWithoutReadMe,
  })
}
