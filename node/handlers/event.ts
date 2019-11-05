import {
  json
} from 'co-body'
import Github from '../clients/github'
import { getAppConfigs } from '../utils/utils'

const ANSWER_LATER_PATTERN = '[x] I\'ll do it later'
let appPem: any = null

export async function handleEvent(ctx: Context, next: () => Promise < any > ) {
  const {
    header: {
      'x-github-event': event,
    },
  } = ctx

  const body = await json(ctx.req)

  const {
    action,
  } = body

  if (!appPem) {
    appPem = (await getAppConfigs(ctx)).pem
  }

  ctx.set('cache-control', 'no-cache,no-store')

  ctx.clients.github.setAppPEM(appPem)

  ctx.vtex.logger.info({
    body: {
      action,
      event_type: event,
    },
    subject: 'github event',
  })

  if (event === 'pull_request') {
    if (action === 'closed') {
      ctx.vtex.logger.info({subject: 'pr closed', ...body})
      handleClosedPullRequest(body, ctx.clients.github)
    } else if (action === 'opened') {
      ctx.vtex.logger.info({subject: 'pr opened', ...body})
      handleNewPullRequest(body, ctx.clients.github)
    } else if (action === 'synchronize') {
      ctx.vtex.logger.info({subject: 'pr synchronized', ...body})
      handleSyncPullRequest(body, ctx.clients.github)
    }
  } else if (event === 'issue_comment' && action === 'edited') {
    ctx.vtex.logger.info({subject: 'comment edited', ...body})
    handleCommentEdit(body, ctx.clients.github)
  }

  ctx.status = 200
  ctx.body = 'ok'

  await next()
}

const handleSyncPullRequest = async (
  reqBody: any,
  gitClient: Github
): Promise < void > => {
  const {
    pull_request: {
      number: prNumber,
      head: {
        sha,
      },
    },
    repository: {
      full_name: repoName,
    },
  } = reqBody

  const changedDocs = checkDocsChanges(await gitClient.getPRFileChanges(repoName, prNumber))

  if (changedDocs) {
    await gitClient.createCommitStatus(
      repoName,
      'Docs in track',
      'vtex-io/docs-outdated-select',
      'success',
      sha
    )
  }
}

const handleClosedPullRequest = async (
  reqBody: any,
  gitClient: Github
): Promise < void > => {
  const {
    number: prNumber,
    pull_request: {
      title: prTitle,
      html_url: prUrl,
      merged,
      user: {
        login: prOwnerLogin,
      },
    },
    repository: {
      full_name: repoName,
      html_url: repoUrl,
    },
  } = reqBody

  if (!merged) {
    return
  }

  const comments = await gitClient.getPRComments(repoName, prNumber)

  for (const comment of comments) {
    const {
      user: {
        login,
      },
      body,
    } = comment

    if (login !== 'vtex-io-docs-bot[bot]') {
      continue
    }

    if (body.includes(ANSWER_LATER_PATTERN)) {
      await createUpcomingDocumentation(
        prTitle,
        prUrl,
        repoName,
        repoUrl,
        prOwnerLogin,
        prNumber,
        gitClient
      )

      return
    }
  }
}

const handleNewPullRequest = async (
  reqBody: any,
  gitClient: Github
): Promise < boolean > => {
  const {
    pull_request: {
      number: prNumber,
      head: {
        sha,
      },
    },
    repository: {
      full_name: repoName,
    },
  } = reqBody

  try {
    await gitClient.getFileContents(repoName, '/docs/README.md')
  } catch (e) {
    await gitClient.writeComment(
      repoName,
      prNumber,
      'Beep boop :robot:\n\n' +
      'I noticed you\'re not using the Docs Builder properly yet, '+
      'if you need help to set that up please go to [IO Documentation](https://github.com/vtex-apps/io-documentation)'
    )

    return true
  }

  const changedDocs = checkDocsChanges(await gitClient.getPRFileChanges(repoName, prNumber))

  if (!changedDocs) {
    await gitClient.writeComment(
      repoName,
      prNumber,
      'Beep boop :robot:\n\n' +
      'I noticed you didn\'t make any changes at the `docs/` folder\n' +
      '- [ ] There\'s nothing new to document :thinking:\n' +
      '- [ ] I\'ll do it later :disappointed:\n' +
      '\nIn order to keep track, I\'ll create an issue if you decide now is not a good time\n\n' +
      '- [ ] I just updated :tada::tada:')

    await gitClient.createCommitStatus(
      repoName,
      'Forgot to select the reason for not updating docs',
      'vtex-io/docs-outdated-select',
      'failure',
      sha
    )
  } else {
    await gitClient.writeComment(
      repoName,
      prNumber,
      'Beep boop :robot:\n\n Thank you so much for keeping our documentation up-to-date :heart:')

    await gitClient.createCommitStatus(
      repoName,
      'Docs in track',
      'vtex-io/docs-outdated-select',
      'success',
      sha
    )
  }

  return true
}

const handleCommentEdit = async (
  reqBody: any,
  gitClient: Github
): Promise < boolean > => {
  const {
    issue: {
      number: prNumber,
    },
    repository: {
      full_name: repoName,
    },
    comment: {
      user: {
        login: commentOwner,
      },
      body,
    },
  } = reqBody

  if (commentOwner !== 'vtex-io-docs-bot[bot]') {
    return true
  }

  const {
    head: {
      sha,
    },
  } = await gitClient.getPR(repoName, prNumber)

  await gitClient.createCommitStatus(
    repoName,
    'Justified docs update absence',
    'vtex-io/docs-outdated-select',
    'success',
    sha
  )

  if (!body.includes(ANSWER_LATER_PATTERN)) {
    return true
  }

  return true
}

const checkDocsChanges = (fileChanges: any): boolean => {
  for (const {
      filename,
    } of fileChanges) {
    if (filename.includes('docs/')) {
      return true
    }
  }
  return false
}

const createUpcomingDocumentation = async (
  issueTitle: string,
  issueUrl: string,
  repoName: string,
  repoUrl: string,
  editor: string,
  prNumber: string,
  gitClient: Github
): Promise < void > => {
  const issueLinkLabel = `[${issueTitle}](${issueUrl})`

  const docIssue = await gitClient.createNewIssue(
    'vtex-apps/io-documentation',
    `Upcoming docs in ${repoName}`,
    `@${editor} is going to update soon a new feature/enhancement on [${repoName}](${repoUrl})\n` +
    `For more information go to:\n` +
    issueLinkLabel,
    ['upcoming-docs'])

  await gitClient.writeComment(
    repoName,
    prNumber,
    `Beep boop :robot: That\'s ok, I created an [issue](${docIssue.html_url}) for this so we don\'t forget`)

  const readme = await gitClient.getFileContents(
    repoName,
    '/docs/README.md'
  )

  let updateContent = readme.content

  updateContent +=
    `${!updateContent.includes('Upcoming documentation') ? `\n\n**Upcoming documentation:**\n` : ''}` +
    `\n - ${issueLinkLabel}`

  await gitClient.updateFileContents(
    repoName,
    '/docs/README.md',
    'Upcoming docs',
    updateContent,
    readme.sha
  )
}
