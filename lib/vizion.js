const ALL = {};

ALL.hg = require('./hg/hg');
ALL.git = require('./git/git');
ALL.svn = require('./svn/svn');
// Add more revision control tools here
const identify = require('./identify');

const vizion = {
  async analyze(argv, cb) {
    try {
      const _folder = (argv.folder !== undefined) ? argv.folder : '.';
      const { type, folder } = await identify(_folder);
      if (ALL[type]) {
        const result = await ALL[type].parse(folder);
        cb(null, result);
      } else {
        cb(`Error vizion::analyze() for given folder: ${folder}`);
      }
    } catch (err) {
      cb(err);
    }
  },

  async isUpToDate(argv, cb) {
    try {
      const _folder = (argv.folder !== undefined) ? argv.folder : '.';
      const { type, folder } = await identify(_folder);
      if (ALL[type]) {
        const result = await ALL[type].isUpdated(folder);
        return cb(null, result);
      } else {
        return cb(`Error vizion::isUpToDate() for given folder: ${folder}`);
      }
    } catch (err) {
      return cb(err);
    }
  },

  async update(argv, cb) {
    try {
      const _folder = (argv.folder !== undefined) ? argv.folder : '.';
      const { type, folder } = await identify(_folder);
      if (ALL[type]) {
        const result = await ALL[type].update(folder);
        return cb(null, result);
      } else {
        return cb(`Error vizion::update() for given folder: ${folder}`);
      }
    } catch (err) {
      return cb(err);
    }
  },

  async revertTo(argv, cb) {
    try {
      const revision = (argv.revision) ? argv.revision : false;
      const _folder = (argv.folder !== undefined) ? argv.folder : '.';

      if (!(revision && /^[A-Fa-f0-9]+$/.test(revision))) return cb({ msg: 'Cannot revert to an invalid commit revision', path: _folder });

      const { type, folder } = await identify(_folder);
      if (ALL[type]) {
        const result = await ALL[type].revert({ folder, revision });
        return cb(null, result);
      } else {
        return cb(`Error vizion::analyze() for given folder: ${folder}`);
      }
    } catch (err) {
      return cb(err);
    }
  },

  async prev(argv, cb) {
    try {
      const _folder = (argv.folder !== undefined) ? argv.folder : '.';
      const { type, folder } = await identify(_folder);
      if (ALL[type]) {
        const result = await ALL[type].prev(folder);
        return cb(null, result);
      } else {
        return cb(`Error vizion::prev() for given folder: ${folder}`);
      }
    } catch (err) {
      return cb(err);
    }
  },

  async next(argv, cb) {
    try {
      const _folder = (argv.folder !== undefined) ? argv.folder : '.';
      const { type, folder } = await identify(_folder);
      if (ALL[type]) {
        const result = await ALL[type].next(folder);
        return cb(null, result);
      } else {
        return cb(`Error vizion::next() for given folder: ${folder}`);
      }
    } catch (err) {
      return cb(err);
    }
  },
};

module.exports = vizion;
