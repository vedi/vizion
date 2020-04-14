const { expect } = require('chai');
const shell = require('shelljs');
const p = require('path');
const vizion = require('../../index.js');

if (shell.which('git') === null) process.exit(0);

describe('Functional: Git', () => {
  let testRepoPath = '';
  before((done) => {
    shell.cd('test/fixtures');

    shell.rm('-rf', 'angular-bridge');
    shell.exec('git clone https://github.com/Unitech/angular-bridge.git', () => {
      testRepoPath = p.join(shell.pwd().toString(), 'angular-bridge');
      done();
    });
  });

  after(() => {
    shell.rm('-rf', 'angular-bridge');
    shell.cd('../..'); // go back to root
  });

  it('should recursively downgrade to first commit', (done) => {
    const callback = (err, meta) => {
      if (err) {
        return done(err);
      }

      if (meta.success === true) {
        return vizion.prev({ folder: testRepoPath }, callback);
      } else {
        expect(meta.success).to.eq(false);
        return vizion.analyze({ folder: testRepoPath }, (err, meta) => {
          if (err) {
            return done(err);
          }

          expect(meta.prev_rev).to.eq(null);
          expect(meta.revision).to.eq('445c0b78e447e87eaec2140d32f67652108b434e');
          return done();
        });
      }
    };

    vizion.prev({ folder: testRepoPath }, callback);
  });

  it('should recursively upgrade to most recent commit', (done) => {
    const callback = (err, meta) => {
      if (err) {
        return done(err);
      }

      if (meta.success === true) {
        return vizion.next({ folder: testRepoPath }, callback);
      } else {
        expect(meta.success).to.eq(false);
        return vizion.analyze({ folder: testRepoPath }, (err, meta) => {
          if (err) {
            return done(err);
          }
          expect(meta.next_rev).to.eq(null);
          expect(meta.revision).to.eq('d1dee188a0d82f21c05a398704ac3237f5523ca7');
          return done();
        });
      }
    };

    vizion.next({ folder: testRepoPath }, callback);
  });

  describe('at head', () => {
    describe('analyze', () => {
      it('ok', (done) => {
        console.log('start');
        vizion.analyze({ folder: testRepoPath }, (err, meta) => {
          if (err) {
            return done(err);
          }

          expect(meta.type).to.eq('git');
          expect(meta.url).to.eq('https://github.com/Unitech/angular-bridge.git');
          expect(meta.branch).to.eq('master');
          expect(meta.comment).to.eq('Merge pull request #17 from jorge-d/express_4\n\nExpress 4');
          expect(meta.unstaged).to.eq(false);
          expect(meta.branch).to.eq('master');
          expect(meta.remotes).to.deep.eq(['origin']);
          expect(meta.remote).to.eq('origin');
          expect(meta.branch_exists_on_remote).to.eq(true);
          expect(meta.ahead).to.eq(false);
          expect(meta.next_rev).to.eq(null);
          expect(meta.prev_rev).to.eq('da29de44b4884c595468b6978fb19f17bee76893');
          expect(meta.tags).to.deep.eq(['v0.3.4']);

          return done();
        });
      });
    });

    describe('isUpToDate', () => {
      it('up to date', (done) => {
        vizion.isUpToDate({
          folder: testRepoPath,
        }, (err, meta) => {
          if (err) {
            return done(err);
          }

          expect(meta.is_up_to_date).to.eq(true);
          return done();
        });
      });
    });
  });

  describe('previous commit', () => {
    before((done) => {
      vizion.revertTo({
        folder: testRepoPath,
        revision: 'eb488c1ca9024b6da2d65ef34dc1544244d8c714',
      }, (err, meta) => {
        if (err) {
          return done(err);
        }

        expect(meta.success).to.eq(true);
        return done();
      });
    });

    describe('analyze', () => {
      it('ok', (done) => {
        vizion.analyze({ folder: testRepoPath }, (err, meta) => {
          if (err) {
            return done(err);
          }

          expect(meta.type).to.eq('git');
          expect(meta.branch).to.eq('master');
          expect(meta.comment).to.eq('Fix indentation\n');
          expect(meta.unstaged).to.eq(false);
          expect(meta.branch).to.eq('master');
          expect(meta.remotes).to.deep.eq(['origin']);
          expect(meta.remote).to.eq('origin');
          expect(meta.branch_exists_on_remote).to.eq(true);
          expect(meta.ahead).to.eq(false);
          expect(meta.next_rev).to.eq('759120ab5b19953886424b7c847879cf7f4cb28e');
          expect(meta.prev_rev).to.eq('0c0cb178a3de0b8c69a81d1fd2f0d72fe0f23a11');
          expect(meta.tags).to.deep.eq(['v0.3.4']);

          return done();
        });
      });
    });

    describe('isUpToDate', () => {
      it('not up to date', (done) => {
        vizion.isUpToDate({
          folder: testRepoPath,
        }, (err, meta) => {
          if (err) {
            return done(err);
          }

          expect(meta.is_up_to_date).to.eq(false);
          return done();
        });
      });
    });

    describe('update', () => {
      it('should update to latest', (done) => {
        vizion.update({
          folder: testRepoPath,
        }, (err, meta) => {
          if (err) {
            return done(err);
          }

          expect(meta.success).to.eq(true);

          return vizion.analyze({ folder: testRepoPath }, (err, meta) => {
            if (err) {
              return done(err);
            }

            expect(meta.revision).to.eq('d1dee188a0d82f21c05a398704ac3237f5523ca7');
            return done();
          });
        });
      });
    });
  });
});
