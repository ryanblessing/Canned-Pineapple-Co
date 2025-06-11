const { Dropbox } = require('dropbox');
const fetch = require('isomorphic-fetch');

function createDropboxInstance(accessToken) {
  return new Dropbox({ accessToken, fetch });
}

async function fetchAllFolders(dbx) {
  try {
    const response = await dbx.filesListFolder({ path: '', recursive: true });
    const entries = response.result.entries || [];

    const folders = entries
      .filter(e => e['.tag'] === 'folder')
      .map(folder => ({
        name: folder.name,
        path: folder.path_lower,
        displayPath: folder.path_display
      }));

    return folders;
  } catch (error) {
    console.error('Error fetching folders:', error);
    return [];
  }
}

async function fetchImagesFromFolder(dbx, folderPath) {
  try {
    const response = await dbx.filesListFolder({ path: folderPath });
    let { entries: folderFiles, has_more, cursor } = response.result;

    while (has_more) {
      const res = await dbx.filesListFolderContinue({ cursor });
      folderFiles = [...folderFiles, ...res.result.entries];
      has_more = res.result.has_more;
      cursor = res.result.cursor;
    }

    const isImage = name => /\.(jpe?g|png)$/i.test(name);
    const imageFiles = folderFiles.filter(e => e['.tag'] === 'file' && isImage(e.name));

    const urls = await Promise.all(
      imageFiles.map(async file => {
        try {
          const { result } = await dbx.sharingListSharedLinks({
            path: file.path_lower,
            direct_only: true
          });

          let url = result.links[0]?.url;
          if (!url) {
            const newLink = await dbx.sharingCreateSharedLinkWithSettings({ path: file.path_lower });
            url = newLink.result.url;
          }

          return url.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace('?dl=0', '');
        } catch (error) {
          console.error(`Error linking ${file.name}:`, error);
          return null;
        }
      })
    );

    return urls.filter(Boolean);
  } catch (error) {
    console.error('Error fetching images:', error);
    return [];
  }
}

module.exports = {
  createDropboxInstance,
  fetchAllFolders,
  fetchImagesFromFolder
};
