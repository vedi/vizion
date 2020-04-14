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
  getHeadCommit(folder, remote, cb) {
    if (cb === undefined) {
      cb = remote;
      remote = null;
    }

    const repo = this.loadRepo(folder);

    // Look up the hash that master currently points to.
    // HEAD for local head
    // refs/remotes/origin/HEAD for remote head
    const ref = remote ? `refs/remotes/${remote}/HEAD` : 'HEAD';
    this.getLastCommitByRef(repo, ref, cb);
  },

  getLastCommit(folder, branch, remote, cb) {
    if (cb === undefined) {
      cb = remote;
      remote = null;
    }

    const repo = this.loadRepo(folder);

    const ref = remote ? `refs/remotes/origin/${branch}` : `refs/heads/${branch}`;

    this.getLastCommitByRef(repo, ref, cb);
  },

  getLastCommitByRef(repo, ref, cb) {
    repo.readRef(ref, (err, commitHash) => {
      if (err) {
        return cb(err);
      }
      if (!commitHash) {
        return cb(null);
      }

      return repo.logWalk(commitHash.replace(/ref: /g, ''), (err, logStream) => {
        if (err) {
          return cb(err);
        }
        if (!logStream) {
          return cb(null);
        }

        return logStream.read((err, commit) => (err ? cb(err) : cb(null, commit)));
      });
    });
  },

  getCommitByHash(repo, hash, cb) {
    repo.loadAs('commit', hash, (err, commit) => (err ? cb(err) : cb(null, commit)));
  },

  getCommitHistory(folder, n, branch, remote, cb) {
    const commitHistory = [];

    if (cb === undefined) {
      cb = remote;
      remote = null;
    }

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

    this.getLastCommitByRef(repo, ref, async (err, commit) => {
      if (err) {
        return cb(err);
      }
      if (!commit) {
        return cb(null, commitHistory);
      }

      commitHistory.push(commit);

      let count = 1;
      // last parent is the parent in the 'git log' meaning
      let parentCommitHash = helper.last(commit.parents);
      try {
        while (count < n && parentCommitHash) {
          // eslint-disable-next-line no-await-in-loop,no-async-promise-executor,no-loop-func
          await new Promise(async (resolve, reject) => {
            this.getCommitByHash(repo, parentCommitHash, (err, commit) => {
              if (err) {
                return reject(err);
              }
              if (!commit) {
                parentCommitHash = null;
                return resolve();
              }

              // add hash back to commit as not a property when loaded by hash
              commit.hash = parentCommitHash;

              count += 1;
              commitHistory.push(commit);
              parentCommitHash = helper.last(commit.parents);
              return resolve();
            });
          });
        }
        return cb(null, commitHistory);
      } catch (err) {
        return cb(err);
      }
    });
  },

  getRefHash(folder, branch, remote, cb) {
    const repo = this.loadRepo(folder);
    repo.readRef(`refs/remotes/${remote}/${branch}`, cb);
  },
};

module.exports = jsGitService;
