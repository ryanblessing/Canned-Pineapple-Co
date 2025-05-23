const { Dropbox } = require('dropbox')
const fetch = require('isomorphic-fetch')

const ACCESS_TOKEN = process.env.VITE_DROPBOX_ACCESS_TOKEN;
const dbx = new Dropbox({ accessToken: ACCESS_TOKEN, fetch })

/**
 * Initialize Dropbox API connection
 * @returns {Promise<boolean>} True if initialization was successful, false otherwise
 */
async function initDropbox() {
  try {
    // Test the connection by getting account info
    const accountInfo = await dbx.usersGetCurrentAccount()
    console.log('Dropbox API initialized successfully:', accountInfo.name)
    return true
  } catch (error) {
    console.error('Failed to initialize Dropbox:', error)
    return false
  }
}

/**
 * Fetch all folders from Dropbox root directory
 * @returns {Promise<Array>} Array of folder objects with name and path
 */
async function fetchAllFolders() {
  try {
    const response = await dbx.filesListFolder({ path: '', recursive: true })
    if (!response || !response.result || !response.result.entries) {
      console.error('No entries returned from Dropbox:', response)
      return []
    }

    const entries = response.result.entries
    const folders = entries
      .filter(e => e['.tag'] === 'folder')
      .map(folder => ({
        name: folder.name,
        path: folder.path_lower,
        displayPath: folder.path_display
      }))

    console.log('Found folders:', folders.length)
    return folders
  } catch (error) {
    console.error('Error fetching folders:', error)
    return []
  }
}

/**
 * Fetch images from a specific folder
 * @param {string} folderPath - The path of the folder to fetch images from
 * @returns {Promise<Array>} Array of image URLs
 */
async function fetchImagesFromFolder(folderPath) {
  try {
    console.log('Fetching images from folder:', folderPath)
    const folderListResponse = await dbx.filesListFolder({ path: folderPath })
    let { entries: folderFiles, has_more, cursor } = folderListResponse.result

    if (!folderFiles) {
      console.error(`No files found in folder at path: ${folderPath}`)
      return []
    }

    // Handle pagination
    while (has_more) {
      const res = await dbx.filesListFolderContinue({ cursor })
      folderFiles = [...folderFiles, ...res.entries]
      has_more = res.has_more
      cursor = res.cursor
    }

    const isImage = name => /.(jpe?g|png)$/i.test(name)
    const imageFiles = folderFiles.filter(e => e['.tag'] === 'file' && isImage(e.name))

    console.log('Found image files:', imageFiles.length)
    
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

    const validUrls = urls.filter(Boolean)
    console.log(`Successfully fetched ${validUrls.length} image URLs`)
    return validUrls
  } catch (error) {
    console.error('Error fetching images:', error)
    return []
  }
}

// Export all functions
module.exports = {
  initDropbox,
  fetchAllFolders,
  fetchImagesFromFolder
}