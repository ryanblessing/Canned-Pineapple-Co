import { createStore } from "vuex";

export default createStore({
  state: {
    folders: [],
    loading: false,
    error: null
  },
  getters: {
    getFolders: state => state.folders,
    isLoading: state => state.loading,
    getError: state => state.error
  },
  mutations: {
    SET_FOLDERS(state, folders) {
      state.folders = folders;
    },
    SET_LOADING(state, loading) {
      state.loading = loading;
    },
    SET_ERROR(state, error) {
      state.error = error;
    }
  },
  actions: {
    async fetchFolders({ commit }) {
      commit('SET_LOADING', true);
      commit('SET_ERROR', null);
      
      try {
        // This is where you would typically make an API call
        // For now, we'll keep the folders empty as they seem to be loaded from a different source
        commit('SET_FOLDERS', []);
      } catch (error) {
        console.error('Error fetching folders:', error);
        commit('SET_ERROR', 'Failed to load folders. Please try again later.');
      } finally {
        commit('SET_LOADING', false);
      }
    }
  },
  modules: {}
});