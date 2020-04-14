const PLATFORM = {
  WINDOWS: 'WINDOWS',
  UNIX: 'UNIX',
};

function getPlatform() {
  switch (process.platform) {
    case 'win32':
    case 'win64':
      return PLATFORM.WINDOWS;
    default:
      return PLATFORM.UNIX;
  }
}

function getCdCommand() {
  switch (this.platform) {
    case PLATFORM.WINDOWS:
      return function cdToPath(folder) {
        return `cd "${folder}"`;
      };
    case PLATFORM.UNIX:
      return function cdToPath(folder) {
        return `cd '${folder}'`;
      };
    default:
      return null;
  }
}

function getCleanseCommand(setEnvVar) {
  switch (this.platform) {
    case PLATFORM.WINDOWS:
      return (cmd) => {
        const envCmd = setEnvVar();
        if (!envCmd.length) return cmd;
        return [envCmd, cmd].join(' ');
      };
    case PLATFORM.UNIX:
      return (cmd) => [setEnvVar('LC_ALL', 'en_US.UTF-8'), cmd].join(' ');
    default:
      return null;
  }
}

function getSetEnv() {
  switch (this.platform) {
    case PLATFORM.WINDOWS:
      return (k, v) => {
        if (!k) return '';
        return 'SET '.concat([k, v].join('='));
      };
    case PLATFORM.UNIX:
      return (k, v) => {
        if (!k) return '';
        return [k, v].join('=');
      };
    default:
      return null;
  }
}

function getConcatenator() {
  switch (this.platform) {
    case PLATFORM.WINDOWS:
      return (cmds) => cmds.join(' && ');
    case PLATFORM.UNIX:
      return (cmds) => {
        let cmdText = '';
        for (let i = 0; i < cmds.length; i += 1) {
          cmdText += cmds[i];
          if (i < cmds.length - 1) cmdText += ';';
        }
        return cmdText;
      };
    default:
      return null;
  }
}

const cliCommand = (function getExecutor() {
  this.platform = getPlatform();

  const cdTo = getCdCommand.call(this);
  const concat = getConcatenator.call(this);
  const setEnvVar = getSetEnv.call(this);
  const cleanse = getCleanseCommand.call(this, setEnvVar);

  return (folder, cmd) => {
    const cmds = [];
    cmds.push(cdTo(folder));
    cmds.push(cleanse(cmd));

    return concat(cmds);
  };
}());

module.exports = cliCommand;
