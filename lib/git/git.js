const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');
const ini = require('ini');
const helper = require('../helper.js');
const cliCommand = require('../cliCommand.js');
const jsGitService = require('./js-git-service.js');

const TIMEOUT = 5000;
const MAXBUFFER = 1024 * 64; // 16KB

const git = {
  async parseGitConfig(folder) {
    return new Promise((resolve, reject) => {
      fs.readFile(path.join(folder, '.git/config'), 'utf-8', (err, data) => {
        if (err) {
          return reject(err);
        }

        const config = ini.parse(data);
        return resolve(config);
      });
    });
  },
  async getUrl(folder) {
    const config = await this.parseGitConfig(folder);
    const data = {};
    data.type = 'git';
    data.url = helper.get(config, 'remote "origin".url');
    return data;
  },

  getCommitInfo(folder, data) {
    return new Promise((resolve, reject) => {
      jsGitService.getHeadCommit(folder, (err, commit) => {
        if (err) {
          return reject(err);
        }
        data.revision = helper.get(commit, 'hash');
        data.comment = helper.get(commit, 'message');
        return resolve(data);
      });
    });
  },

  getStaged(folder, data) {
    return new Promise((resolve, reject) => {
      exec(cliCommand(folder, 'git status -s'), { timeout: TIMEOUT, maxBuffer: MAXBUFFER },
        (err, stdout) => {
          if (err) {
            return reject(err);
          }

          data.unstaged = stdout !== '';
          return resolve(data);
        });
    });
  },

  getBranch(folder, data) {
    return new Promise((resolve, reject) => {
      fs.readFile(path.join(folder, '.git/HEAD'), 'utf-8', (err, content) => {
        if (err) {
          return reject(err);
        }

        const regex = /ref: refs\/heads\/(.*)/;
        const match = regex.exec(content);
        data.branch = match ? match[1] : 'HEAD';

        return resolve(data);
      });
    });
  },

  async getRemote(folder, data) {
    const config = await this.parseGitConfig(folder);

    data.remotes = [];

    Object.keys(config).forEach((key) => {
      const regex = /remote "(.*)"/;
      const match = regex.exec(key);
      if (match) {
        data.remotes.push(match[1]);
      }
    });

    data.remote = (data.remotes.indexOf('origin') === -1) ? data.remotes[0] : 'origin';

    return data;
  },

  isCurrentBranchOnRemote(folder, data) {
    return new Promise((resolve, reject) => {
      jsGitService.getRefHash(folder, data.branch, data.remote, (err, hash) => {
        if (err) {
          return reject(err);
        }

        data.branch_exists_on_remote = !!hash;

        return resolve(data);
      });
    });
  },

  getPrevNext(folder, data) {
    return new Promise((resolve, reject) => {
      const remote = data.branch_exists_on_remote ? data.remote : null;

      jsGitService.getCommitHistory(folder, 100, data.branch, remote, (err, commitHistory) => {
        if (err) {
          return reject(err);
        }

        const currentCommitIndex = commitHistory.findIndex(({ hash }) => hash === data.revision);

        if (currentCommitIndex === -1) {
          data.ahead = true;
          data.next_rev = null;
          data.prev_rev = null;
        } else {
          data.ahead = false;
          data.next_rev = (currentCommitIndex === 0)
            ? null
            : commitHistory[currentCommitIndex - 1].hash;
          data.prev_rev = (currentCommitIndex === (commitHistory.length - 1))
            ? null
            : commitHistory[currentCommitIndex + 1].hash;
        }

        return resolve(data);
      });
    });
  },

  getUpdateTime(folder, data) {
    return new Promise((resolve, reject) => {
      fs.stat(`${folder}.git`, (err, stats) => {
        if (err) {
          return reject(err);
        }

        data.update_time = helper.trimNewLine(stats.mtime);
        return resolve(data);
      });
    });
  },

  getTags(folder, data) {
    return new Promise((resolve, reject) => {
      exec(cliCommand(folder, 'git tag'), { timeout: TIMEOUT, maxBuffer: MAXBUFFER },
        (err, stdout) => {
          if (err) {
            return reject(err);
          }

          if (stdout.length) {
            data.tags = stdout.split('\n');
            data.tags.pop();
            data.tags = data.tags.slice(0, 10);
          }
          return resolve(data);
        });
    });
  },

  async parse(folder) {
    let data = await this.getUrl(folder);
    data = await this.getCommitInfo(folder, data);
    data = await this.getStaged(folder, data);
    data = await this.getBranch(folder, data);
    data = await this.getRemote(folder, data);
    data = await this.isCurrentBranchOnRemote(folder, data);
    data = await this.getPrevNext(folder, data);
    data = await this.getUpdateTime(folder, data);
    data = await this.getTags(folder, data);
    return data;
  },

  async isUpdated(folder) {
    let data = await this.getCommitInfo(folder, {});
    data = await this.getBranch(folder, data);
    data = await this.getRemote(folder, data);
    data = await this.isCurrentBranchOnRemote(folder, data);
    return new Promise((resolve, reject) => {
      exec(cliCommand(folder, 'git remote update'), { timeout: 60000, maxBuffer: MAXBUFFER },
        (err) => {
          if (err) {
            return reject(err);
          }

          const remote = data.branch_exists_on_remote ? data.remote : null;
          return jsGitService.getLastCommit(folder, data.branch, remote, (err, commit) => {
            if (err) {
              return reject(err);
            }

            const res = {
              new_revision: commit.hash,
              current_revision: data.revision,
              is_up_to_date: (commit.hash === data.revision),
            };
            return resolve(res);
          });
        });
    });
  },

  async revert(args) {
    const ret = {};
    const command = cliCommand(args.folder, `git reset --hard ${args.revision}`);
    ret.output = '';
    ret.output += `${command}\n`;
    ret.success = true;
    return new Promise(((resolve) => {
      exec(command, { timeout: TIMEOUT, maxBuffer: MAXBUFFER },
        (err, stdout, stderr) => {
          ret.output += stdout;
          if (err !== null || stderr.substring(0, 6) === 'fatal:') ret.success = false;
          return resolve(ret);
        });
    }));
  },

  async update(folder) {
    const data = await this.isUpdated(folder);
    const res = {};
    if (data.is_up_to_date === true) {
      res.success = false;
      res.current_revision = data.new_revision;
      return res;
    } else {
      const meta = await this.revert({ folder, revision: data.new_revision });
      res.output = meta.output;
      res.success = meta.success;
      res.current_revision = (meta.success) ? data.new_revision : data.current_revision;
      return res;
    }
  },

  async prev(folder) {
    let data = await this.getCommitInfo(folder, {});
    data = await this.getBranch(folder, data);
    data = await this.getRemote(folder, data);
    data = await this.isCurrentBranchOnRemote(folder, data);
    data = await this.getPrevNext(folder, data);

    const res = {};
    if (data.prev_rev !== null) {
      const meta = await this.revert({ folder, revision: data.prev_rev });
      res.output = meta.output;
      res.success = meta.success;
      res.current_revision = (res.success) ? data.prev_rev : data.revision;
      return res;
    } else {
      res.success = false;
      res.current_revision = data.revision;
      return res;
    }
  },

  async next(folder) {
    let data = await this.getCommitInfo(folder, {});
    data = await this.getBranch(folder, data);
    data = await this.getRemote(folder, data);
    data = await this.isCurrentBranchOnRemote(folder, data);
    data = await this.getPrevNext(folder, data);
    const res = {};
    if (data.next_rev !== null) {
      const meta = await this.revert({ folder, revision: data.next_rev });
      res.output = meta.output;
      res.success = meta.success;
      res.current_revision = (res.success) ? data.next_rev : data.revision;
      return res;
    } else {
      res.success = false;
      res.current_revision = data.revision;
      return res;
    }
  },

};

module.exports = git;
