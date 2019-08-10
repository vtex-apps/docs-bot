import {
  json
} from 'co-body'

const ANSWER_LATER_PATTERN = '[x] I'

export const handleEvent = async (ctx: Context, next: () => Promise < any > ) => {
  const {
    header: {
      'x-github-event': event,
    },
  } = ctx
  const body = await json(ctx.req)

  const {
    action,
  } = body

  console.log(action, event)

  if (event === 'pull_request' && action === 'opened') {
    handleNewPullRequest(body, ctx.clients.github)
  } else if (event === 'issue_comment' && action === 'edited') {
    handleCommentEdit(body, ctx.clients.github)
  } else if (event === 'integration_installation_repositories' && action === 'added' ) {
    handleNewRepo(body, ctx.clients.github)
  }

  ctx.status = 200
  ctx.body = 'ok'

  await next()

}

const handleNewRepo = async (
  reqBody: any,
  gitClient: any
): Promise < boolean > => {
  const {
    sender: {
      login: userLogin,
    },
    repositories_added,
  } = reqBody

  const {
    full_name: repoName,
  } = repositories_added[0]

  const docIssue = await gitClient.createNewIssue(
    'vtex-apps/io-documentation',
    `New repo created: ${repoName}`,
    `@${userLogin} just created a new repo: [${repoName}](https://github.com/${repoName})\n` +
    `Might be good to check if it's an app that should be added to **IODocs components** and if this repo has a **/docs** folder`,
    ['new-repo'])

  console.log(docIssue)
  return true
}

const handleNewPullRequest = async (
  reqBody: any,
  gitClient: any
): Promise < boolean > => {
  const {
    pull_request: {
      number: prNumber,
    },
    repository: {
      full_name: repoName,
    },
  } = reqBody

  gitClient.writeComment(
    repoName,
    prNumber,
    'Beep boop :robot: Did you remember to update this app\'s docs?\n' +
    '- [ ] Yes, I did! :tada::tada::tada:\n' +
    '- [ ] There\'s nothing new to document :thinking:\n' +
    '- [ ] I\'ll do it later :disappointed:')

  return true
}

const handleCommentEdit = async (
  reqBody: any,
  gitClient: any
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

  if (commentOwner !== 'vtex-io-docs-bot[bot]' || !body.includes(ANSWER_LATER_PATTERN)) {
    console.log('returning')
    return true
  }

  const docIssue = await gitClient.createNewIssue(
    'vtex-apps/io-documentation',
    `Upcoming docs in ${repoName}`,
    `@${editor} is going to update soon a new feature/enhancement on [${repoName}](${repoUrl})\n` +
    `For more information go to:\n` +
    `[${issueTitle}](${issueUrl})`,
    ['upcoming-docs'])

  await gitClient.writeComment(
    repoName,
    prNumber,
    `Beep boop :robot: That\'s ok, I created an [issue](${docIssue.html_url}) for this so we don\'t forget`)

  const readme = await gitClient.getFileContents(
    repoName,
    '/docs/README.md'
  )

  console.log(readme)

  return true
}
