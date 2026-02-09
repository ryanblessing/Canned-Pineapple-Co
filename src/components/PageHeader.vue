<template>
  <div v-if="$route.name !== 'about' && $route.name !== 'contact'" class="header-content">
    <slot>
      <!-- Home -->
      <template v-if="$route.name === 'home'">
        <p class="home-header-text">
          A CREATIVE STUDIO FOCUSED IN SIGN PAINTING, MURALS, VISUAL ART AND BRAND DESIGN
        </p>
      </template>

      <!-- Folder -->
      <template v-else-if="$route.name === 'folder'">
        <div class="header-section title-section">
          <p class="header-text title-text">{{ folderName }}</p>
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
</template>

<script setup>
defineProps({
  folderDescription: { type: String, default: '' },
  folderName: { type: String, default: '' },
  folderServices: { type: String, default: '' },
})
</script>

<style scoped>
/* ======================= Tokens ======================= */
.header-content {
  --brand: #3e2723;
  --border-w: 0.12rem;

  --title-fixed: 210px;
  --gap-x: 10px;

  /* LOCKED HEIGHTS (pre-stack) */
  --header-h: 100px;
  --section-h: 75px;

  --nav-title-size: 18px;

  --rsz: clamp(10px, 1.1vw, 14px);
}

/* ======================= Desktop / Pre-stack ======================= */
.header-content {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0;

  height: var(--header-h);
  min-height: var(--header-h);

  border-top: var(--border-w) solid var(--brand);
  border-bottom: var(--border-w) solid var(--brand);
  box-sizing: border-box;
}

.header-section {
  display: flex;
  align-items: center;
  box-sizing: border-box;
  padding: 0;
  height: var(--section-h);
}

/* Columns */
.title-section {
  flex: 0 0 var(--title-fixed);
  width: var(--title-fixed);
  justify-content: center;
  text-align: center;
  line-height: 1;
}

.description-section {
  text-align: left;
  border-right: var(--border-w) solid var(--brand);
  border-left: var(--border-w) solid var(--brand);
  flex: 1 1 auto;
  width: auto;
  padding: 0 17px;
}

.services-section {
  flex: 0 0 23%;
  width: 23%;
  display: grid;
  place-items: center;
  text-align: center;
  padding: 0 var(--gap-x);
}

/* ======================= Typography ======================= */
.header-text {
  margin: 0;
  width: 100%;
  line-height: 1.2;
  color: var(--brand);
  text-align: inherit;
  font-family: var(--font-gotham);
  font-weight: 400;
  text-transform: uppercase;
}

.title-text {
  color: var(--brand);
  font-family: var(--font-gotham-medium) !important;
  font-weight: 600 !important;
  font-size: var(--nav-title-size) !important;
  text-transform: uppercase;
  line-height: 1.2;
}

/* HOME tagline */
.home-header-text {
  margin: 0;
  width: 100%;
  line-height: 1.15;
  color: var(--brand);
  text-align: center;
  font-family: var(--font-gotham);
  font-weight: 400;
  text-transform: uppercase;
  font-size: clamp(16px, 1.6vw, 21px);
  letter-spacing: 0.5px;
}

@media (max-width: 1350px) {
  .home-header-text { font-size: clamp(15px, 1.5vw, 19px); }
}
@media (max-width: 1150px) {
  .home-header-text { font-size: clamp(14px, 1.4vw, 18px); }
}

.description-section .header-text,
.services-section .header-text {
  font-size: var(--rsz);
  line-height: 1.2;
  white-space: normal;
  word-break: normal;
  overflow-wrap: break-word;
  hyphens: auto;
}

/* ======================= STACK (≤1200px) ======================= */
@media (max-width: 1200px) {
  .header-content {
    display: block !important;
    height: auto !important;
    min-height: unset !important;
    isolation: isolate;
  }

  .header-section {
    display: block !important;
    width: 100% !important;
    height: auto !important;
    padding: 0 !important;
    margin: 0 !important;
    border: 0 !important;
    position: static !important;
    overflow: visible !important;
    contain: layout paint !important;
    box-sizing: border-box !important;
  }

  .title-section {
    width: 100% !important;
    justify-content: center !important;
    padding: 16px 0 14px !important;
    margin: 0 0 14px 0 !important;
    border-bottom: var(--border-w) solid var(--brand) !important;
  }

  .description-section {
    max-height: none !important;
    height: auto !important;
    overflow: visible !important;
    padding: 0 16px !important;
    margin: 0 0 14px 0 !important;
    border: 0 !important;
    text-align: left !important;
  }

  .services-section {
    padding: 14px 0 16px !important;
    margin: 0 !important;
    border-top: var(--border-w) solid var(--brand) !important;
    text-align: center !important;
  }

  .header-section .header-text {
    display: block !important;
    margin: 0 auto !important;
    max-width: 36rem;
  }

  .description-section .header-text,
  .services-section .header-text {
    text-transform: uppercase !important;
    font-size: clamp(12px, 2.7vw, 13.5px) !important;
    line-height: 1.2 !important;
  }

  .title-text {
    font-family: var(--font-gotham-medium) !important;
    font-weight: 600 !important;
    font-size: var(--nav-title-size) !important;
  }
}
</style>
