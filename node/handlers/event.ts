import {
  json
} from 'co-body'
import Github from '../clients/github'

const ANSWER_LATER_PATTERN = '[x] I'
let appPem: any = null

export async function handleEvent (ctx: Context, next: () => Promise < any > ) {
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
    appPem = (await ctx.clients.vbase.getJSON(
      'docs-bot', 'configs'
    ) as {pem: string}).pem
  }

  ctx.clients.github.setAppPEM(appPem)

  if (event === 'pull_request' && action === 'opened') {
    handleNewPullRequest(body, ctx.clients.github)
  } else if (event === 'issue_comment' && action === 'edited') {
    handleCommentEdit(body, ctx.clients.github)
  }

  ctx.status = 200
  ctx.body = 'ok'

  await next()
}

// const handleNewRepo = async (
//   reqBody: any,
//   gitClient: Github
// ): Promise < boolean > => {
//   const {
//     sender: {
//       login: userLogin,
//     },
//     repositories_added,
//   } = reqBody

//   const {
//     full_name: repoName,
//   } = repositories_added[0]

//   const docIssue = await gitClient.createNewIssue(
//     'vtex-apps/io-documentation',
//     `New repo created: ${repoName}`,
//     `@${userLogin} just created a new repo: [${repoName}](https://github.com/${repoName})\n` +
//     `Might be good to check if it's an app that should be added to **IODocs components** and if this repo has a **/docs** folder`,
//     ['new-repo'])

//   console.log(docIssue)
//   return true
// }

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

  const changedDocs = checkDocsChanges(await gitClient.getPRFileChanges(repoName, prNumber))

  if (!changedDocs) {
    gitClient.writeComment(
      repoName,
      prNumber,
      'Beep boop :robot:\n\n I noticed you didn\'t make any changes on the documentation\n' +
      '- [ ] There\'s nothing new to document :thinking:\n' +
      '- [ ] I\'ll do it later :disappointed:')

    await gitClient.createCommitStatus(
      repoName,
      'Forgot to select the reason for not updating docs',
      'vtex-io/docs-outdated-select',
      'failure',
      sha
    )
  }

  else {
    gitClient.writeComment(
      repoName,
      prNumber,
      'Beep boop :robot:\n\n Thank you so much for keeping our documentation up-to-date :heart:')
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
      title: issueTitle,
      html_url: issueUrl,
    },
    sender: {
      login: editor,
    },
    repository: {
      full_name: repoName,
      html_url: repoUrl,
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
    'Forgot to select the reason for not updating docs',
    'vtex-io/docs-outdated-select',
    'success',
    sha
  )

  if (!body.includes(ANSWER_LATER_PATTERN)) {
    return true
  }

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

  return true
}

const checkDocsChanges = (fileChanges: any) : boolean => {
  for (const {filename} of fileChanges) {
    if (filename.includes('docs/')) {
      return true
    }
  }
  return false
}
