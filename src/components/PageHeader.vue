<template>
    <div v-if="$route.name !== 'about' || $route.name !== 'contact'" class="header-content">
      <slot>
        <template v-if="$route.name === 'home'">
          <p class="home-header-text">
            A CREATIVE STUDIO FOCUSED IN SIGN PAINTING, MURALS, VISUAL ART AND BRAND DESIGN
          </p>
        </template>
        <template v-else-if="$route.name === 'folder'">
          <div class="header-section title-section">
            <p class="header-text" style="color: #3e2723; font-weight: 700; font-size: 1.5rem;">{{ folderName }}</p>
          </div>
          <div class="header-section description-section">
            <p v-if="folderDescription" class="header-text">
              {{ folderDescription }}
            </p>
          </div>
          <div class="header-section services-section">
            <p v-if="folderServices" class="header-text">
              {{ folderServices }}
            </p>
          </div>
        </template>
      </slot>
    </div>
    <!-- <div v-if="$route.name === 'about'">
      <p class="header-section">
      </p>
    </div> -->
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const props = defineProps({
  folderDescription: {
    type: String,
    default: ''
  },
  folderName: {
    type: String,
    default: ''
  },
  folderServices: {
    type: String,
    default: ''
  }
});

const route = useRoute();
</script>

<style scoped>
/* Header layout */
.header-content {
  display: flex;
  align-items: center;
  width: 100%;
  /* justify-content: center; */
  padding: 0;
  min-height: 100px;
  border-top: .12rem solid #3e2723;
  border-bottom: .12rem solid #3e2723;
}
.folder-header {
  display: flex;
  width: 100%;
  min-height: 60px;
  align-items: center;
}

/* Section styles */
.header-section {
  display: flex;
  align-items: center;
  height: 75px;
  box-sizing: border-box;
  padding: 0;
  /* padding: 5px 0 0 0; */
}

.title-section {
  justify-content: center;
  text-align: center;
  line-height: 1;
  width: 305px;
  flex: 0 0 305px;
  padding: 0;
}

.description-section {
  text-align: left;
  border-right: .12rem solid #3e2723;
  border-left: .12rem solid #3e2723;
  width: 75%;
  flex: 0 0 60%;
  padding: 0 17px;
  /* text-transform: uppercase;
  letter-spacing: 1px; */
  
}

.services-section {
  /* justify-content: center; */
  /* text-align: center; */
  /* border-left: 3px solid #e0e0e0eb; */
  width: 15%;
  flex: 0 0 23%;
  /* padding: 0 1rem; */
}

/* Text styles */
.header-text {
  margin: 0;
  width: 100%;
  line-height: 1.2;
  color: #3e2723;
  text-align: inherit;
  /* transition: font-size 0.3s ease; */
  font-family: var(--font-gotham);
  font-weight: 400;
  /* letter-spacing: 0.5px; */
  text-transform: uppercase;
}

.home-header-text {
  margin: 0;
  font-size: 21px;
  width: 100%;
  line-height: 1;
  color: #3e2723;
  text-align: inherit;
  font-family: var(--font-gotham);
  font-weight: 400;
  /* letter-spacing: 0.5px; */
  text-transform: uppercase;
}


/* Responsive adjustments */
@media (max-width: 1500px) {
  .header-text {
    font-size: 0.9rem;
  }
  
  .title-section .header-text {
    font-size: 1.1rem !important;
  }
  
  .home-header-text {
    font-size: 1.1rem;
  }

  .services-section {
    white-space: normal;
    text-overflow: clip;
    overflow: visible;
    word-wrap: break-word;
  }
  .header-content {
    display: flex;
    align-items: center;
    width: 100%;
    /* justify-content: center; */
    padding: 0;
    min-height: 100px;
    /* border-top: .14rem solid #3e2723;
    border-bottom: .14rem solid #3e2723; */
  }
}

@media (max-width: 1350px) {
  .header-text {
    font-size: 13px;
    line-height: 1.2 !important;
  }
  
  .title-section .header-text {
    font-size: 1.1rem !important;
    font-weight: 500 !important;
  }
  
  .home-header-text {
    font-size: 14px;
  }

  .services-section {
    white-space: normal;
    text-overflow: clip;
    overflow: visible;
    word-wrap: break-word;
  }
  .header-content {
    display: flex;
    align-items: center;
    width: 100%;
    /* justify-content: center; */
    padding: 0;
    min-height: 85px;
    border-top: .12rem solid #3e2723;
    border-bottom: .12rem solid #3e2723 !important;
  }

  .title-section {
    justify-content: center;
    text-align: center;
    line-height: 1;
    width: 17%;
    flex: 0 0 17%;
    /* padding: 0 8px 0 0; */
  }

  .description-section {
    text-align: left;
    border-right: .12rem solid #3e2723;
    border-left: .12rem solid #3e2723;
    max-height: 67px !important;
    width: 80%;
    flex: 0 0 60%;
    padding: 0 14px;
    /* text-transform: uppercase;
    letter-spacing: 1px; */
  }

  .services-section {
    /* justify-content: center; */
    /* text-align: center; */
    /* border-left: 3px solid #e0e0e0eb; */
    width: 20%;
    flex: 0 0 23%;
    justify-content: center;
    text-align: center;
    padding-left: 5px;
    /* padding-left: 17px; */
    /* padding: 0 1rem; */
  }
}

@media (max-width: 1200px) {
  .title-section {
    flex: 0 0 25% !important;
    width: 25% !important;
  }
  
  .description-section {
    flex: 0 0 50% !important;
    width: 50% !important;
    padding: 0 10px !important;
  }
  
  .services-section {
    flex: 0 0 25% !important;
    width: 25% !important;
    padding: 0 10px !important;
  }
  .header-text {
    font-size: 0.75rem !important;
  }
}

@media (max-width: 1024px) {
  /* .header-text {
    font-size: 0.75rem;
  } */
  
  .title-section .header-text {
    font-size: 1.2rem;
  }
  
  /* .home-header-text {
    font-size: 1rem;
  } */
  
  .header-section {
    padding: 0 10px;
  }
  
  .description-section .header-text {
    padding: 0 12px;
    font-size: 0.65rem !important;
  }
  .header-content {
    display: flex;
    align-items: center;
    width: 100%;
    /* justify-content: center; */
    padding: 0;
    min-height: 100px;
    border-top: .12rem solid #3e2723;
    border-bottom: .12rem solid #3e2723;
  }
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    min-height: auto;
  }
  
  .header-section {
    width: 100% !important;
    flex: 1 1 100% !important;
    height: auto;
    min-height: 50px;
    padding: 15px 20px;
    border-right: none !important;
    border-left: none !important;
    border-bottom: 0.18rem solid #3e2723;
    text-align: center;
  }
  
  .services-section {
    white-space: normal;
    text-overflow: clip;
    overflow: visible;
    word-wrap: break-word;
    padding: 15px 20px;
  }
  
  .header-section:last-child {
    border-bottom: none !important;
  }
  
  .header-text {
    font-size: 0.8rem;
    line-height: 1.4;
  }
  
  .title-section .header-text {
    font-size: 1.1rem;
    text-align: center;
  }
  
  .home-header-text {
    font-size: 0.95rem;
    text-align: center;
    padding: 10px;
  }
}

@media (max-width: 430px) {
  .header-content {
    flex-direction: column;
    min-height: auto;
  }
  
  .header-section {
    width: 100% !important;
    flex: 1 1 100% !important;
    height: auto;
    min-height: 50px;
    padding: 15px 20px;
    border-right: none !important;
    border-left: none !important;
    border-bottom: 0.18rem solid #3e2723;
    text-align: center;
  }
  
  .services-section {
    white-space: normal;
    text-overflow: clip;
    overflow: visible;
    word-wrap: break-word;
    padding: 15px 20px;
  }
  
  .header-section:last-child {
    border-bottom: none !important;
  }
  
  .header-text {
    font-size: 0.6rem;
    line-height: 1.4;
  }
  
  .title-section .header-text {
    font-size: 1.1rem;
    text-align: center;
  }
  
  .home-header-text {
    font-size: 0.65rem;
    text-align: center;
    /* padding: 10px; */
  }
}

@media screen and (max-width: 390px) {
  .header-content {
    flex-direction: column !important;
    min-height: auto !important;
  }
  
  .header-section {
    width: 100% !important;
    flex: 1 1 100% !important;
    height: auto !important;
    padding: 15px 20px !important;
    border-right: none !important;
    border-left: none !important;
    border-bottom: 0.18rem solid #3e2723 !important;
    text-align: center !important;
  }
  
  .services-section {
    white-space: normal !important;
    text-overflow: clip !important;
    overflow: visible !important;
    word-wrap: break-word !important;
    /* padding: 5px 10px !important; */
  }
  
  .header-section:last-child {
    border-bottom: none !important;
  }
  
  .header-text,
  .header-section p,
  .header-section .header-text,
  .title-section .header-text,
  .home-header-text {
    font-size: 0.5rem !important;
    line-height: 1 !important;
    text-align: center !important;
    padding: 2px 1px !important;
  }
  
  /* Specific override for the folder name/title */
  .title-section .header-text[style*="font-size"] {
    font-size: 0.5rem !important;
  }
  
  .home-header-text {
    font-size: 0.5rem !important;
    padding: 10px 5px !important;
  }
}
</style>
