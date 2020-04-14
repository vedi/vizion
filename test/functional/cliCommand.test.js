const { expect } = require('chai');
const cliCommand = require('../../lib/cliCommand.js');

describe('Functional: cliCommand', () => {
  it('ok', () => {
    let target; let
      folder;

    if (/^win/.exec(process.platform)) {
      folder = 'C:\\Program Files\\nodejs\\foobar';
      target = `cd "${folder}" && git status -s`;
    } else {
      folder = '/etc/node/foobar';
      target = `cd '${folder}';LC_ALL=en_US.UTF-8 git status -s`;
    }


    const result = cliCommand(folder, 'git status -s');
    expect(target).to.eq(result);
  });
});
