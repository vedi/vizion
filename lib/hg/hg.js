const { exec } = require('child_process');
const fs = require('fs');
const cliCommand = require('../cliCommand.js');

let halt = false;

function error(repoType, task, errorMsg, cb) {
  if (halt) return false;

  console.error(`[Repo-Parser] An error occured while ${task} in a ${repoType} repository: ${errorMsg}`);
  halt = true;
  return cb(`[Repo-Parser] An error occured while ${task} in a ${repoType} repository: ${errorMsg}`);
}

function checkReturn(dataArray, cb) {
  if (halt) {
    return false;
  }
  if (Object.keys(dataArray).length > 6) {
    Object.keys(dataArray).forEach((key) => {
      if (typeof (dataArray[key]) === 'string') {
        dataArray[key] = dataArray[key].replace(/\n/g, '');
      }
    });
    cb(dataArray);
  }
  return undefined;
}

module.exports.parse = async function parseHg(folder) {
  return new Promise((resolve, reject) => {
    const data = {};

    data.type = 'mercurial';
    data.commit_history = []; // temporary

    exec(cliCommand(folder, 'hg paths default'), (err, stdout, stderr) => {
      if (err !== null) {
        error('mercurial', 'fetching path', stderr, reject);
      } else {
        data.url = stdout;
        checkReturn(data, resolve);
      }
    });
    exec(cliCommand(folder, "hg log --limit 1 --template 'changeset: {rev}:{node|short}\nsummary: {desc}'"), (err, stdout, stderr) => {
      if (err !== null) {
        error('mercurial', 'fetching log', stderr, reject);
      } else {
        const changeset = stdout.match(/^changeset:\s+([^\n]+)$/m);
        // date = stdout.match(/^date:\s+:([^\n]+)$/m);
        const summary = stdout.match(/^summary:\s+([^\n]+)$/m);
        [, data.revision] = changeset;
        [, data.comment] = summary;
        // data.update_time = date;
        checkReturn(data, resolve);
      }
    });
    exec(cliCommand(folder, 'hg branch'), (err, stdout, stderr) => {
      if (err !== null) {
        error('mercurial', 'fetching branch', stderr, reject);
      } else {
        data.branch = stdout;
        checkReturn(data, resolve);
      }
    });
    fs.stat(`${folder}.hg`, (err, stats) => {
      if (err !== null) {
        error('mercurial', 'fetching stats', 'no error available', reject);
      } else {
        data.update_time = stats.mtime;
        checkReturn(data, resolve);
      }
    });
  });
};
