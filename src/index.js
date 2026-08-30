const Core = require('@actions/core');
const Github = require('@actions/github');

const listToArray = (str) => {
  const arr = str.split(',');
  for (let i = 0; i < arr.length; i++) {
    arr[i] = arr[i].trim();
  }
  return arr.filter(Boolean);
};

const parseIssueNumbers = (str) => {
  if (!str || str.trim() === '') {
    return [];
  }

  return listToArray(str).map((value) => {
    const match = /^\d+$/.test(value);
    if (!match) {
      throw new Error(`Invalid related issue number: "${value}"`);
    }

    return Number(value);
  });
};

const addRelatedIssues = async ({ octokit, owner, repo, issueNodeId, relatedIssueNumbers }) => {
  if (!relatedIssueNumbers || relatedIssueNumbers.length === 0) {
    return;
  }

  for (const issueNumber of relatedIssueNumbers) {
    const relatedIssue = await octokit.rest.issues.get({
      owner,
      repo,
      issue_number: issueNumber
    });

    await octokit.graphql(
      `
        mutation CreateIssueRelation($issueId: ID!, $relatedIssueId: ID!) {
          createIssueRelation(input: { issueId: $issueId, relatedIssueId: $relatedIssueId }) {
            clientMutationId
          }
        }
      `,
      {
        issueId: issueNodeId,
        relatedIssueId: relatedIssue.data.node_id
      }
    );
  }
};

async function main() {
  try {
    const rtrue = { required: true };
    const token = Core.getInput('token', rtrue);
    Core.debug(`Using token: ${token}`);

    const repoContext = Github.context.repo;
    const owner = Core.getInput('owner') || repoContext.owner;
    const repo = Core.getInput('repo') || repoContext.repo;
    const title = Core.getInput('title', rtrue);
    Core.debug(`Using owner: ${owner}`);
    Core.debug(`Using repo: ${repo}`);
    Core.debug(`Using title: ${title}`);

    const body = Core.getInput('body');
    const milestone = Core.getInput('milestone');
    const labels = Core.getInput('labels');
    const assignees = Core.getInput('assignees');
    const related = Core.getInput('related');
    Core.debug(`Using body: """${body}"""`);
    Core.debug(`Using milestone: ${milestone}`);
    Core.debug(`Using labels: ${labels}`);
    Core.debug(`Using assignees: ${assignees}`);
    Core.debug(`Using related issues: ${related}`);

    const relatedIssueNumbers = parseIssueNumbers(related);
    const octokit = Github.getOctokit(token);
    const opts = Object.fromEntries(Object.entries({
      owner,
      repo,
      title,
      body: body == '' ? null : body,
      milestone: milestone == '' ? null : milestone,
      labels: labels ? listToArray(labels) : null,
      assignees: assignees ? listToArray(assignees) : null
    }).filter(([_, v]) => v != null));
    Core.debug(`Object for new issue: """${JSON.stringify(opts, null, 2)}"""`);

    const newIssue = await octokit.rest.issues.create({
      ...opts,
      headers: {
        'X-GitHub-Api-Version': '2026-03-10'
      }
    });

    await addRelatedIssues({
      octokit,
      owner,
      repo,
      issueNodeId: newIssue.data.node_id,
      relatedIssueNumbers
    });

    Core.info(`Created: ${newIssue.data.html_url}`);
    Core.setOutput('json', JSON.stringify(newIssue.data));
    Core.setOutput('number', newIssue.data.number);
    Core.setOutput('html_url', newIssue.data.html_url);
  } catch (err) {
    Core.error(err);
    Core.setFailed('Request to create new issue failed');
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  listToArray,
  parseIssueNumbers,
  addRelatedIssues,
  main
};
