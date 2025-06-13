import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001'; // Backend server URL

/**
 * Check if user is authenticated with Dropbox
 * @returns {Promise<boolean>} True if authenticated, false otherwise
 */
export async function isAuthenticated() {
  try {
    const response = await axios.get(`${API_BASE_URL}/auth/check`);
    return response.data.authenticated;
  } catch (error) {
    console.error('Error checking authentication status:', error);
    return false;
  }
}

/**
 * Initialize Dropbox OAuth flow
 */
export function initDropbox() {
  window.location.href = `${API_BASE_URL}/auth/dropbox`;
}

/**
 * Fetch all folders from Dropbox root directory
 * @returns {Promise<Array>} Array of folder objects with name and path
 */
export async function fetchAllFolders(path = '/website photos') {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/folders`, {
      params: { path }
    });
    
    const folders = response.data.map(folder => ({
      name: folder.name,
      path: folder.path_lower,
      displayPath: folder.path_display,
      id: folder.id,
      size: folder.size,
      client_modified: folder.client_modified
    }));

    console.log('Found folders:', folders);
    return folders;
  } catch (error) {
    console.error('Error fetching folders:', error);
    return [];
  }
}

/**
 * Fetch images from a specific folder
 * @param {string} folderPath - The path of the folder to fetch images from
 * @returns {Promise<Array>} Array of image URLs
 */
export async function fetchImagesFromFolder(folderPath) {
  try {
    console.log('Fetching images from folder:', folderPath);
    
    // First, get the list of files in the folder from the backend
    const response = await axios.get(`${API_BASE_URL}/api/files`, {
      params: { 
        path: folderPath,
        recursive: false
      }
    });
    
    const entries = response.data.entries || [];
    
    // Filter for image files
    const isImage = name => /\.(jpe?g|png|gif|webp)$/i.test(name);
    const imageFiles = entries.filter(
      entry => entry['.tag'] === 'file' && isImage(entry.name)
    );
    
    console.log('Found image files:', imageFiles.length);
    
    // Get temporary links for each image
    const imageUrls = await Promise.all(
      imageFiles.map(async (file) => {
        try {
          const linkResponse = await axios.get(`${API_BASE_URL}/api/get-link`, {
            params: { path: file.path_lower }
          });
          return linkResponse.data.link;
        } catch (error) {
          console.error('Error getting link for file:', file.name, error);
          return null;
        }
      })
    );
    
    // Filter out any failed requests
    const validUrls = imageUrls.filter(url => url !== null);
    console.log(`Successfully fetched ${validUrls.length} image URLs`);
    return validUrls;
  } catch (error) {
    console.error('Error fetching images:', error);
    return [];
  }
}

/**
 * Get the first image from a folder to use as a thumbnail
 * @param {string} folderPath - Path to the folder
 * @returns {Promise<string|null>} URL of the first image in the folder, or null if none found
 */
export async function getFirstImageInFolder(folderPath) {
  try {
    const images = await fetchImagesFromFolder(folderPath);
    return images.length > 0 ? images[0] : null;
  } catch (error) {
    console.error('Error getting first image:', error);
    return null;
  }
}

export default {
  isAuthenticated,
  initDropbox,
  fetchAllFolders,
  fetchImagesFromFolder,
  getFirstImageInFolder
};