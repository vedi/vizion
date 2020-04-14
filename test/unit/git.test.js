const { expect } = require('chai');
const fs = require('fs');
const sinon = require('sinon');
const ini = require('ini');

const git = require('../../lib/git/git');
const jsGitService = require('../../lib/git/js-git-service');


describe('Unit: git', () => {
  describe('parseGitConfig', () => {
    const folder = 'my-folder';
    const config = { stub: 'config' };
    const data = { stub: 'data' };
    let readFileStub; let
      parseStub;

    before(() => {
      readFileStub = sinon.stub(fs, 'readFile').callsFake((path, encoding, cb) => {
        if (process.platform !== 'win32' && process.platform !== 'win64') expect(path).to.eq('my-folder/.git/config');
        else expect(path).to.eq('my-folder\\.git\\config');

        cb(null, data);
      });

      parseStub = sinon.stub(ini, 'parse').callsFake(async (myData) => {
        expect(myData).to.eq(data);

        return config;
      });
    });

    it('ok', async () => {
      const myConfig = await git.parseGitConfig(folder);
      expect(myConfig).to.eq(config);
    });

    after(() => {
      readFileStub.restore();
      parseStub.restore();
    });
  });

  describe('getUrl', () => {
    const folder = 'my-folder';
    const config = {
      'remote "origin"': {
        url: 'test-url',
      },
    };
    let parseGitConfigStub;

    before(() => {
      parseGitConfigStub = sinon.stub(git, 'parseGitConfig').callsFake(async (myFolder) => {
        expect(myFolder).to.eq(folder);
        return config;
      });
    });

    it('ok', async () => {
      const data = await git.getUrl(folder);
      expect(data).to.deep.eq({
        type: 'git',
        url: 'test-url',
      });
    });

    after(() => {
      parseGitConfigStub.restore();
    });
  });


  describe('getCommitInfo', () => {
    const folder = 'my-folder';
    const commit = {
      hash: 'xfd4560',
      message: 'my message',
    };
    let data = {};
    let getHeadCommitStub;

    before(() => {
      getHeadCommitStub = sinon.stub(jsGitService, 'getHeadCommit').callsFake(async (myFolder) => {
        expect(myFolder).to.eq(folder);

        return commit;
      });
    });

    it('ok', async () => {
      data = await git.getCommitInfo(folder, data);
      expect(data).to.deep.eq({
        revision: commit.hash,
        comment: commit.message,
      });
    });

    after(() => {
      getHeadCommitStub.restore();
    });
  });

  describe('getBranch', () => {
    const folder = 'my-folder';
    let data = {};
    let readFileStub;

    before(() => {
      readFileStub = sinon.stub(fs, 'readFile').callsFake((path, encoding, cb) => {
        if (process.platform !== 'win32' && process.platform !== 'win64') expect(path).to.eq('my-folder/.git/HEAD');
        else expect(path).to.eq('my-folder\\.git\\HEAD');
        expect(encoding).to.eq('utf-8');

        cb(null, 'ref: refs/heads/master');
      });
    });

    it('ok', async () => {
      data = await git.getBranch(folder, data);
      expect(data).to.deep.eq({
        branch: 'master',
      });
    });

    after(() => {
      readFileStub.restore();
    });
  });

  describe('getRemote', () => {
    const folder = 'my-folder';
    const config = {
      'remote "origin"': {
        url: 'test-url',
      },
      'remote "other"': {
        url: 'other-url',
      },
    };
    let data = {};
    let parseGitConfigStub;

    before(() => {
      parseGitConfigStub = sinon.stub(git, 'parseGitConfig').callsFake(async (myFolder) => {
        expect(myFolder).to.eq(folder);
        return config;
      });
    });

    it('ok', async () => {
      data = await git.getRemote(folder, data);
      expect(data).to.deep.eq({
        remote: 'origin',
        remotes: [
          'origin',
          'other',
        ],
      });
    });

    after(() => {
      parseGitConfigStub.restore();
    });
  });


  describe('isCurrentBranchOnRemote', () => {
    const folder = 'my-folder';
    let data = {
      branch: 'my-branch',
      remote: 'my-remote',
    };
    let getRefHashStub;

    context('not on remote', () => {
      before(() => {
        getRefHashStub = sinon.stub(jsGitService, 'getRefHash').callsFake(async (myFolder, myBranch, myRemote) => {
          expect(myFolder).to.eq(folder);
          expect(myBranch).to.eq(data.branch);
          expect(myRemote).to.eq(data.remote);
          return null;
        });
      });

      it('ok', async () => {
        data = await git.isCurrentBranchOnRemote(folder, data);
        expect(data).to.deep.eq({
          branch: 'my-branch',
          branch_exists_on_remote: false,
          remote: 'my-remote',
        });
      });

      after(() => {
        getRefHashStub.restore();
      });
    });

    context('on remote', () => {
      before(() => {
        getRefHashStub = sinon.stub(jsGitService, 'getRefHash').callsFake(async (myFolder, myBranch, myRemote) => {
          expect(myFolder).to.eq(folder);
          expect(myBranch).to.eq(data.branch);
          expect(myRemote).to.eq(data.remote);
          return 'FX421345CX';
        });
      });

      it('ok', async () => {
        data = await git.isCurrentBranchOnRemote(folder, data);
        expect(data).to.deep.eq({
          branch: 'my-branch',
          branch_exists_on_remote: true,
          remote: 'my-remote',
        });
      });

      after(() => {
        getRefHashStub.restore();
      });
    });
  });

  describe('getPrevNext', () => {
    const folder = 'my-folder';
    let data = {
      branch_exists_on_remote: true,
      branch: 'my-branch',
      remote: 'my-remote',
      revision: '2',
    };
    const commitHistory = [
      { hash: '3' },
      { hash: '2' },
      { hash: '1' },
    ];
    let getCommitHistoryStub;

    before(() => {
      getCommitHistoryStub = sinon.stub(jsGitService, 'getCommitHistory').callsFake(async (myFolder, n, myBranch, myRemote) => {
        expect(myFolder).to.eq(folder);
        expect(n).to.eq(100);
        expect(myBranch).to.eq(data.branch);
        expect(myRemote).to.eq(data.remote);

        return commitHistory;
      });
    });

    it('ok', async () => {
      data = await git.getPrevNext(folder, data);
      expect(data).to.deep.eq({
        ahead: false,
        branch: 'my-branch',
        branch_exists_on_remote: true,
        next_rev: '3',
        prev_rev: '1',
        remote: 'my-remote',
        revision: '2',
      });
    });

    after(() => {
      getCommitHistoryStub.restore();
    });
  });
});
