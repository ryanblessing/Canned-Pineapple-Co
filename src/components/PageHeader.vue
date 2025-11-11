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
});
</script>

<style scoped>
/* ======================= Tokens ======================= */
.header-content {
  --brand: #3e2723;
  --border-w: 0.12rem;
  --title-fixed: 210px;
  --gap-x: 10px;
  --nav-title-size: 18px;
  --rsz: clamp(10px, 1.1vw, 14px);

  /* vertical padding used when space gets tight before stacking */
  --pad-y: clamp(8px, 1.1vw, 16px);
}

/* ======================= Desktop ======================= */
.header-content {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0;
  min-height: 100px;
  border-top: var(--border-w) solid var(--brand);
  border-bottom: var(--border-w) solid var(--brand);
}

.header-section {
  display: flex;
  align-items: center;
  height: 75px;
  box-sizing: border-box;
  padding: 0;
}

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
  flex: 0 0 60%;
  width: 60%;
  padding: 0 17px; /* horizontal padding */
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

/* HOME tagline (desktop defaults) */
.home-header-text {
  display: block;
  margin: 0 auto;
  width: 100%;
  max-width: 62rem;
  line-height: 1.15;
  color: var(--brand);
  text-align: center;
  font-family: var(--font-gotham);
  font-weight: 400;
  text-transform: uppercase;
  font-size: clamp(16px, 1.6vw, 21px);
  letter-spacing: 0.5px;
  padding: 10px 12px;           /* some breathing room even on desktop */
  text-wrap: balance;
}

@media (max-width: 1350px) {
  .home-header-text { font-size: clamp(15px, 1.5vw, 19px); }
}
@media (max-width: 1150px) {
  .home-header-text { font-size: clamp(14px, 1.4vw, 18px); }
}

/* Folder text sizing */
.description-section .header-text,
.services-section .header-text {
  font-size: var(--rsz);
  line-height: 1.4;
  white-space: normal;
  word-break: normal;
  overflow-wrap: break-word;
  hyphens: auto;
}

/* ======================= EARLY RELIEF BEFORE STACKING ======================= */
@media (max-width: 1500px) {
  .header-content { min-height: 90px; }
  .header-text { font-size: 14px; }
  .title-text { font-size: 1.25rem; }
  .header-section { height: auto; padding-block: var(--pad-y); }
}

@media (max-width: 1350px) {
  .header-content { min-height: 85px; }
  .header-text { font-size: 13px; }
  .title-text { font-size: 1.1rem; }
  .description-section { padding: var(--pad-y) 14px; }
  .services-section    { padding: var(--pad-y) var(--gap-x); }
}

@media (max-width: 1150px) {
  .title-section { flex: 0 0 25%; width: 25%; }
  .description-section { flex: 0 0 50%; width: 50%; }
  .services-section { flex: 0 0 25%; width: 25%; }
  .header-text { font-size: 0.75rem; }
}

/* ======================= EARLIER STACK (≤1200px) ======================= */
@media (max-width: 1200px) {
  .header-content {
    display: block !important;
    min-height: unset !important;
    isolation: isolate;
  }

  /* 🔸 HOME: add comfortable spacing around the tagline when stacked */
  .home-header-text {
    max-width: 40rem;
    padding: 16px 18px;         /* more padding on mobile */
    margin: 6px auto 10px;
    line-height: 1.35;
    font-size: clamp(13px, 3.4vw, 16px);
    letter-spacing: 0.04em;
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
    line-height: 1.45 !important;
  }

  .title-text {
    font-family: var(--font-gotham-medium) !important;
    font-weight: 600 !important;
    font-size: var(--nav-title-size) !important;
  }
}

/* Extra-small phones */
@media (max-width: 420px) {
  .home-header-text {
    padding: 18px 20px;
    font-size: clamp(12px, 4vw, 15px);
    line-height: 1.4;
  }
}
</style>
