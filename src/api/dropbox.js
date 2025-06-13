import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001';

// Helper function to log API errors
const logApiError = (operation, error) => {
    console.error(`API Error (${operation}):`, {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        stack: error.stack
    });
};

// Create an axios instance with default config
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add request interceptor to handle auth
apiClient.interceptors.request.use(
    (config) => {
        const token = sessionStorage.getItem('dropboxAccessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add response interceptor to handle errors
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        
        // If the error is 401 and we haven't already tried to refresh the token
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            
            try {
                console.log('Attempting to refresh token...');
                // Call your refresh token endpoint
                const refreshToken = sessionStorage.getItem('dropboxRefreshToken');
                if (!refreshToken) {
                    throw new Error('No refresh token available');
                }
                
                const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
                const { accessToken, refreshToken: newRefreshToken } = response.data;
                
                // Update tokens in session storage
                sessionStorage.setItem('dropboxAccessToken', accessToken);
                if (newRefreshToken) {
                    sessionStorage.setItem('dropboxRefreshToken', newRefreshToken);
                }
                
                // Update the authorization header
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                
                // Retry the original request
                return apiClient(originalRequest);
            } catch (refreshError) {
                console.error('Failed to refresh token:', refreshError);
                // Clear tokens and redirect to login
                sessionStorage.removeItem('dropboxAccessToken');
                sessionStorage.removeItem('dropboxRefreshToken');
                window.location.href = '/';
                return Promise.reject(refreshError);
            }
        }
        
        return Promise.reject(error);
    }
);

// Check if user is authenticated
export const isAuthenticated = async () => {
    try {
        console.log('Checking authentication status...');
        const response = await apiClient.get('/auth/check', {
            timeout: 10000,
            validateStatus: (status) => status < 500 // Don't throw for 4xx errors
        });
        
        console.log('Auth check response:', response.data);
        return response.data.authenticated === true;
    } catch (error) {
        logApiError('isAuthenticated', error);
        return false;
    }
};

// Initialize Dropbox authentication
export const initDropbox = () => {
    console.log('Initiating Dropbox OAuth flow...');
    // Store the current URL to redirect back after auth
    sessionStorage.setItem('preAuthPath', window.location.pathname);
    window.location.href = `${API_BASE_URL}/auth/dropbox`;
};

// Process OAuth callback
export const processOAuthCallback = async () => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const error = params.get('error');

    if (error) {
        console.error('OAuth error:', params.toString());
        throw new Error(`OAuth error: ${error} - ${params.get('error_description')}`);
    }

    if (accessToken) {
        console.log('OAuth callback received access token');
        // Clear the URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Store tokens in session storage
        if (accessToken) sessionStorage.setItem('dropboxAccessToken', accessToken);
        if (refreshToken) sessionStorage.setItem('dropboxRefreshToken', refreshToken);
        
        // Redirect back to the original URL if available
        const preAuthPath = sessionStorage.getItem('preAuthPath');
        if (preAuthPath && preAuthPath !== window.location.pathname) {
            sessionStorage.removeItem('preAuthPath');
            window.location.href = preAuthPath;
        }
        
        return { accessToken, refreshToken };
    }
    
    return null;
};

// Fetch all folders
export const fetchAllFolders = async (path = '/website photos') => {
    try {
        console.log('Fetching all folders...');
        const response = await apiClient.get('/api/folders', {
            params: { path }
        });
        
        return response.data.map(folder => ({
            name: folder.name,
            path: folder.path_lower,
            displayPath: folder.path_display,
            id: folder.id,
            size: folder.size,
            client_modified: folder.client_modified
        }));
    } catch (error) {
        logApiError('fetchAllFolders', error);
        throw error;
    }
};
export async function fetchImagesFromFolder(folderPath) {
  try {
    console.log('Fetching images from folder:', folderPath);
    
    // First, get the list of files in the folder from the backend
    const response = await axios.get(`${API_BASE_URL}/api/files`, {
      params: { 
        path: folderPath,
        recursive: false
      },
      // Ensure params are properly encoded
      paramsSerializer: params => {
        return Object.entries(params)
          .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
          .join('&');
      }
    });
    
    const entries = response.data.entries || [];
    
    // Filter for image files
    const isImage = name => /\.(jpe?g|png|gif|webp)$/i.test(name);
    const imageFiles = entries.filter(
      entry => entry['.tag'] === 'file' && isImage(entry.name)
    );
    
    console.log('Found image files:', imageFiles);
    
    // Get temporary links for each image
    const imageUrls = await Promise.all(
      imageFiles.map(async (file) => {
        try {
          // Use the path_display instead of path_lower to maintain case sensitivity
          const pathToUse = file.path_display || file.path_lower;
          console.log('Requesting link for path:', pathToUse);
          
          const linkResponse = await axios.get(`${API_BASE_URL}/api/get-link`, {
            params: { path: pathToUse },
            paramsSerializer: params => {
              return Object.entries(params)
                .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
                .join('&');
            }
          });
          
          console.log('Link response for', pathToUse, ':', linkResponse.data);
          return linkResponse.data.link;
        } catch (error) {
          console.error('Error getting link for file:', file.name, {
            error: error.response?.data || error.message,
            path: file.path_display || file.path_lower
          });
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