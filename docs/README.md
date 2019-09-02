
# Docs Bot
 
A Github bot to enhance documentation tracking and awareness

## Responsibilities 

Docs Bot currently has two responsibilities:

1. Checks PRs for any file changes on `docs/` folder and, in case none are present, requests an explanation for not updating the documentation. If no answer is selected, the PR will get a `failed` status. There are three possible answers:
  - **Nothing new:** if the PR is a bugfix or an slight enhancement, might be the case that no extra documentation is needed, Docs Bot will understand that as a success
  - **Do it later:** sometimes the PR is an urgency and the timing for documenting is not good, this will create an issue on the central VTEX IO documentation repository [(IO Documentation)](https://github.com/vtex-apps/io-documentation). Besides that, the Docs Bot will make push the `docs/README.md` file, marking the PR as an **upcoming documentation**.
  - **Just did it:** it might also be the case that the dev forgot the documentation and later on added to the PR in another commit, that's also a success for the Docs Bot 

2. Checks weekly all repos in [VTEX Apps Organization](https://github.com/vtex-apps) looking for the ones that didn't implement the [Docs Builder](https://github.com/vtex-apps/io-documentation#Docs-Builder) and creates an issue for each one of them on [(IO Documentation)](https://github.com/vtex-apps/io-documentation). 

## Troubleshoot

- I updated the `README.md` but the bot tells me no changes on documentation where made

  Docs Bot doesn't check root `README.md`, instead it checks the one located in `docs/README.md`, to understand why this is important, please refer to: [(IO Documentation)](https://github.com/vtex-apps/io-documentation).
