const path = require('path');
const helper = require('../helper.js');

const jsGitService = {
  loadRepo(folder) {
    const repo = {};
    // Mixin the base DB operations using local git database on disk.
    // eslint-disable-next-line global-require
    require('git-node-fs/mixins/fs-db')(repo, path.join(folder, '.git'));
    // Mixin the walker helpers.
    // eslint-disable-next-line global-require
    require('js-git/mixins/walkers')(repo);

    return repo;
  },
  getHeadCommit(folder, remote) {
    const repo = this.loadRepo(folder);
    // Look up the hash that master currently points to.
    // HEAD for local head
    // refs/remotes/origin/HEAD for remote head
    const ref = remote ? `refs/remotes/${remote}/HEAD` : 'HEAD';
    return this.getLastCommitByRef(repo, ref);
  },

  getLastCommit(folder, branch, remote) {
    const repo = this.loadRepo(folder);
    const ref = remote ? `refs/remotes/origin/${branch}` : `refs/heads/${branch}`;
    return this.getLastCommitByRef(repo, ref);
  },

  async getLastCommitByRef(repo, ref) {
    const commitHash = await helper.fromCallback((callback) => repo.readRef(ref, callback));
    if (!commitHash) {
      return null;
    }

    const logStream = await helper.fromCallback((callback) => (
      repo.logWalk(commitHash.replace(/ref: /g, ''), callback)
    ));
    if (!logStream) {
      return null;
    }
    return helper.fromCallback((callback) => logStream.read(callback));
  },

  getCommitByHash(repo, hash) {
    return helper.fromCallback((callback) => repo.loadAs('commit', hash, callback));
  },

  async getCommitHistory(folder, n, branch, remote) {
    const commitHistory = [];

    const repo = this.loadRepo(folder);

    // HEAD for local head
    // refs/remotes/origin/HEAD for remote head
    // refs/heads/my-branch for local branch
    // refs/remotes/origin/my-branch for remote branch
    let ref;
    if (branch === 'HEAD') {
      ref = remote ? `refs/remotes/${remote}/HEAD` : 'HEAD';
    } else {
      ref = remote ? `refs/remotes/origin/${branch}` : `refs/heads/${branch}`;
    }

    const lastCommit = await this.getLastCommitByRef(repo, ref);

    if (!lastCommit) {
      return commitHistory;
    }

    commitHistory.push(lastCommit);

    let count = 1;
    // last parent is the parent in the 'git log' meaning
    let parentCommitHash = helper.last(lastCommit.parents);
    while (count < n && parentCommitHash) {
      // eslint-disable-next-line no-await-in-loop
      const commit = await this.getCommitByHash(repo, parentCommitHash);
      if (commit) {
        // add hash back to commit as not a property when loaded by hash
        commit.hash = parentCommitHash;
        count += 1;
        commitHistory.push(commit);
        parentCommitHash = helper.last(commit.parents);
      } else {
        parentCommitHash = null;
      }
    }
    return commitHistory;
  },

  getRefHash(folder, branch, remote) {
    const repo = this.loadRepo(folder);
    return helper.fromCallback((callback) => repo.readRef(`refs/remotes/${remote}/${branch}`, callback));
  },
};

module.exports = jsGitService;
