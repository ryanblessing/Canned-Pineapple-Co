import { ref } from 'vue';
import { Dropbox } from 'dropbox';

const ACCESS_TOKEN = process.env.VITE_DROPBOX_ACCESS_TOKEN;
console.log('ACCESS_TOKEN', ACCESS_TOKEN);
const dbx = new Dropbox({ accessToken: ACCESS_TOKEN });

if (!ACCESS_TOKEN) {
  console.error('Warning: Dropbox access token not found. Please set VITE_DROPBOX_ACCESS_TOKEN in your .env file.');
}

export const fetchImagesByFolder = async (folderPath = '') => {
  try {
    // Ensure the path starts with a forward slash
    const normalizedPath = folderPath ? `/${folderPath}`.replace(/\/+/g, '/') : '';
    
    const response = await dbx.filesListFolder({
      path: normalizedPath,
      recursive: false,
      include_media_info: true,
    });

    return response.entries
      .filter(item => item.is_downloadable && item.media_info?.metadata?.dimensions)
      .map(item => ({
        id: item.id,
        name: item.name,
        path: item.path_display,
        dimensions: item.media_info.metadata.dimensions,
      }));
  } catch (error) {
    console.error('Error fetching images from Dropbox:', error);
    throw error;
  }
};

export const getDropboxImageUrl = async (path) => {
  try {
    const response = await dbx.filesGetTemporaryLink({ path });
    return response.link;
  } catch (error) {
    console.error('Error getting temporary link:', error);
    throw error;
  }
};

export const useDropboxImages = () => {
  const images = ref([]);
  const loading = ref(false);
  const error = ref(null);

  const fetchImages = async (folderPath = '') => {
    try {
      loading.value = true;
      error.value = null;
      const imageList = await fetchImagesByFolder(folderPath);
      images.value = await Promise.all(
        imageList.map(async (img) => ({
          ...img,
          url: await getDropboxImageUrl(img.path)
        }))
      );
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  };

  return {
    images,
    loading,
    error,
    fetchImages,
  };
};

export default {
  fetchImagesByFolder,
  getDropboxImageUrl,
  useDropboxImages,
};