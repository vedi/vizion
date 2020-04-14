const fs = require('fs');
const helper = require('./helper');

const allTypes = ['git', 'hg', 'svn'];

module.exports = async function identify(folder) {
  if (folder[folder.length - 1] !== '/') folder += '/';

  const type = await helper.findAsync(allTypes.map(
    async (type) => {
      const exists = await new Promise((resolve) => {
        fs.exists(`${folder}.${type}`, resolve);
      });
      return exists ? type : undefined;
    },
  ));

  return { type, folder };
};
