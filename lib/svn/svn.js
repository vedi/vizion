const fs = require('fs');
const { exec } = require('child_process');

const cliCommand = require('../cliCommand');

const svn = {
  async parse(folder) {
    const getMeta = () => new Promise((resolve, reject) => {
      exec(cliCommand(folder, 'svn info'), (err, stdout) => {
        if (err !== null) return reject(err);
        const data = {};
        data.type = 'svn';
        data.url = stdout.match(/Repository Root: ([^\n]+)/);
        if (data.url && typeof (data.url) === 'object') {
          [, data.url] = data.url;
        }
        let match = stdout.match(/Relative URL: \^\/([^\n]+)/);
        if (match) {
          const relativeUrl = match[1];
          if (relativeUrl.match(/^trunk/)) {
            data.branch = 'trunk';
          } else if (relativeUrl.match(/^branch/)) {
            match = relativeUrl.match(/^branch(?:es)?\/([^/]+)(?:\/|$)/);
            if (match) {
              [, data.branch] = match;
            }
          }
        }
        match = stdout.match(/Last Changed Rev: ([^\n]+)/);
        if (match) {
          [, data.revision] = match;
        }
        match = stdout.match(/Last Changed Date: ([^\n]+)/);
        if (match) {
          data.update_time = new Date(match[1]);
        }
        return resolve(data);
      });
    });

    const getRevComment = (data) => new Promise((resolve, reject) => {
      const rev = data.revision || 'BASE';
      exec(cliCommand(folder, `svn log -r ${rev}`), (err, stdout) => {
        if (err !== null) {
          return reject(err);
        }
        if (rev === 'BASE') {
          data.revision = stdout.match(/^(r[0-9]+)\s\|/m);
          if (data.revision) {
            [, data.revision] = data.revision;
          }
        }
        data.comment = stdout.match(/lines?\s*\n((.|\n)*)\n-{72}\n$/);
        if (data.comment) data.comment = data.comment[1].replace(/\n/g, '');
        if (!data.update_time) {
          data.update_time = stdout.match(/-+\n(.*?)\n/);
          if (data.update_time) {
            data.update_time = new Date(
              data.update_time[1].split(' | ')[2],
            );
          }
        }
        return resolve(data);
      });
    });

    const getDate = (data) => new Promise((resolve, reject) => {
      if (data.update_time) {
        return resolve(data);
      }
      return fs.stat(`${folder}.svn`, (err, stats) => {
        if (err !== null) {
          return reject(err);
        }
        data.update_time = stats.mtime;
        return resolve(data);
      });
    });

    const meta = await getMeta();
    const revComment = await getRevComment(meta);

    return getDate(revComment);
  },

  async isUpdated(folder) {
    const res = {};

    const getRev = (str) => {
      let matches = str.match(/Changed Rev: ([^\n]+)/);
      if (matches) {
        [, matches] = matches;
      }
      return matches;
    };

    return new Promise((resolve, reject) => {
      exec(cliCommand(folder, 'svn info'), (err, stdout) => {
        if (err !== null) {
          return reject(err);
        }
        const currentRevision = getRev(stdout);
        return exec(cliCommand(folder, 'svn info -r HEAD'), (err, stdout) => {
          if (err !== null) return reject(err);
          const recentRevision = getRev(stdout);
          res.is_up_to_date = (recentRevision === currentRevision);
          res.new_revision = recentRevision;
          res.current_revision = currentRevision;
          return resolve(res);
        });
      });
    });
  },

  async update(folder) {
    const res = {};

    return new Promise((resolve, reject) => {
      exec(cliCommand(folder, 'svn update'), (err, stdout) => {
        if (err !== null) {
          return reject(err);
        }
        const newRev = stdout.match(/Updated to revision ([^.]+)/);
        if (newRev === null) {
          res.success = false;
          const oldRev = stdout.match(/At revision ([^.]+)/);
          res.current_revision = (oldRev) ? oldRev[1] : null;
        } else {
          res.success = true;
          [, res.current_revision] = newRev;
        }
        return resolve(res);
      });
    });
  },
};

module.exports = svn;
