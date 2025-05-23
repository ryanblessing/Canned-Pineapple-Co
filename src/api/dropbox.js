import { ref } from 'vue';
import { Dropbox } from 'dropbox';

const ACCESS_TOKEN = process.env.VITE_DROPBOX_ACCESS_TOKEN;
console.log('ACCESS_TOKEN', ACCESS_TOKEN);
const dbx = new Dropbox({ accessToken: ACCESS_TOKEN });

if (!ACCESS_TOKEN) {
  console.error('Warning: Dropbox access token not found. Please set VITE_DROPBOX_ACCESS_TOKEN in your .env file.');
}

async function listFolders() {
  try {
    const response = await dbx.filesListFolder({ path: '', recursive: false });

    const folders = response.result.entries.filter(
      (entry) => entry[".tag"] === "folder"
    );

    return folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      path: folder.path_lower,
      thumbnailUrl: 'https://via.placeholder.com/300x200?text=' + encodeURIComponent(folder.name),
      items: '–' // you can customize or fetch file count later
    }));
  } catch (err) {
    console.error('Error listing folders:', err);
    return [];
  }
}


async function fetchImagesByFolder(folderName) {
  try {
    const response = await dbx.filesListFolder({ path: '', recursive: true })

    if (!response || !response.result || !response.result.entries) {
      console.error('No entries returned from Dropbox:', response)
      return
    }
   
    const entries = response.result.entries
    const folderEntry = entries.find(
      e => e['.tag'] === 'folder' && e.name === folderName
    )

    if (!folderEntry) {
      console.error(`Folder "${folderName}" not found.`)
      return
    }

    const folderPath = folderEntry.path_lower
    const folderListResponse = await dbx.filesListFolder({ path: folderPath })
    let { entries: folderFiles, has_more, cursor } = folderListResponse.result

    if (!folderFiles) {
      console.error(`No files found in folder "${folderName}" at path: ${folderPath}`)
      return
    }

    while (has_more) {
      const res = await dbx.filesListFolderContinue({ cursor })
      folderFiles = [...folderFiles, ...res.entries]
      has_more = res.has_more
      cursor = res.cursor
    }

    const isImage = name => /\.(jpe?g|png)$/i.test(name)
    const imageFiles = folderFiles.filter(e => e['.tag'] === 'file' && isImage(e.name))

  const urls = await Promise.all(
    imageFiles.map(async (file) => {
      try {
        const existingLinksResponse = await dbx.sharingListSharedLinks({ path: file.path_lower, direct_only: true })
        const existingLinks = existingLinksResponse.result.links

        if (existingLinks.length > 0) {
          return existingLinks[0].url.replace('?dl=0', '?raw=1')
        } else {
          const newLinkResponse = await dbx.sharingCreateSharedLinkWithSettings({ path: file.path_lower })
          return newLinkResponse.result.url.replace('?dl=0', '?raw=1')
        }
      } catch (error) {
        console.error('Error getting or creating link for file:', file.name, error)
        return null
      }
    })
  )
    console.log(`Images with tag "${folderName}":`, urls)
    return urls.map((url, i) => ({
      id: imageFiles[i].id,
      name: imageFiles[i].name,
      thumbnailUrl: url,
      path: imageFiles[i].path_lower,
      items: 1 // optional, if you want to display number of images
    }))
  } catch (error) {
    console.error('Error:', error)
    return []
    }
}

export { fetchImagesByFolder, listFolders }