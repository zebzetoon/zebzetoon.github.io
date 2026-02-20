/**
 * Open Graph Meta Tag Module
 * 
 * This module dynamically generates and updates Open Graph meta tags
 * for Discord, Twitter, and other social media platform previews.
 * 
 * Executes early in the page lifecycle to ensure meta tags are present
 * before social media crawlers read the page.
 */

// Default meta tag values configuration
const DEFAULT_META = {
  title: "ZebzeManga - Türkçe Manga Oku",
  description: "ZebzeManga'da en yeni manga ve webtoon serilerini Türkçe okuyun. Güncel bölümler ve geniş arşiv.",
  image: "https://zebzetoon.vercel.app/logo/zlogo.png",
  siteName: "Zebze Toon",
  type: "website",
  twitterCard: "summary_large_image"
};

/**
 * Parse URL parameters to extract series name and chapter number
 * 
 * @returns {Object} Object with seri (string|null) and bolum (number|null)
 * 
 * Example:
 * URL: ?seri=%C3%96l%C3%BCm%20Pakt%C4%B1&bolum=8
 * Returns: { seri: "Ölüm Paktı", bolum: 8 }
 */
function parseURLParameters() {
  const params = new URLSearchParams(window.location.search);
  
  // Extract and decode "seri" parameter
  const seriParam = params.get('seri');
  const seri = seriParam ? decodeURIComponent(seriParam) : null;
  
  // Extract and parse "bolum" parameter
  const bolumParam = params.get('bolum');
  const bolum = bolumParam ? parseInt(bolumParam, 10) : null;
  
  return { seri, bolum };
}

/**
 * Retrieve series metadata from the ARSIV object
 * 
 * @param {string} seriesName - The name of the series to look up
 * @returns {Object|null} Series metadata object with kapak, ozet, yazar, banner properties, or null if not found
 * 
 * Example:
 * getSeriesData("Ölüm Paktı")
 * Returns: { kapak: "...", ozet: "...", yazar: "...", banner: "..." }
 */
function getSeriesData(seriesName) {
  // Check if ARSIV object exists and is populated
  if (!ARSIV || typeof ARSIV !== 'object' || Object.keys(ARSIV).length === 0) {
    return null;
  }
  
  // Look up series by name in ARSIV
  const series = ARSIV[seriesName];
  
  // Return series.meta object if found, null otherwise
  if (series && series.meta) {
    return series.meta;
  }
  
  return null;
}
/**
 * Create or update a meta tag in the document head
 * 
 * @param {string} property - The meta tag property or name (e.g., "og:title", "twitter:card")
 * @param {string} content - The content value for the meta tag
 * 
 * Behavior:
 * - Queries for existing meta tag by property attribute first
 * - Falls back to querying by name attribute if not found
 * - Updates content attribute if tag exists
 * - Creates new meta tag and appends to document.head if not exists
 * - Automatically determines whether to use property or name attribute based on prefix
 * 
 * Example:
 * setMetaTag("og:title", "Ölüm Paktı - Bölüm 8")
 * setMetaTag("twitter:card", "summary_large_image")
 */
function setMetaTag(property, content) {
  let selector = `meta[property="${property}"]`;
  let tag = document.querySelector(selector);
  
  if (!tag) {
    selector = `meta[name="${property}"]`;
    tag = document.querySelector(selector);
  }
  
  if (tag) {
    tag.setAttribute('content', content);
  } else {
    tag = document.createElement('meta');
    if (property.startsWith('og:')) {
      tag.setAttribute('property', property);
    } else {
      tag.setAttribute('name', property);
    }
    tag.setAttribute('content', content);
    document.head.appendChild(tag);
  }
}

/**
 * Batch update multiple meta tags
 * 
 * @param {Array<{property: string, content: string}>} tagDefinitions - Array of tag definition objects
 * 
 * Behavior:
 * - Iterates through the array of tag definitions
 * - Calls setMetaTag for each definition
 * - Ensures all tags are updated atomically
 * 
 * Example:
 * setMetaTags([
 *   { property: "og:title", content: "Ölüm Paktı - Bölüm 8" },
 *   { property: "og:description", content: "Series description..." },
 *   { property: "twitter:card", content: "summary_large_image" }
 * ])
 */
function setMetaTags(tagDefinitions) {
  tagDefinitions.forEach(({ property, content }) => {
    setMetaTag(property, content);
  });
}
/**
 * Convert a relative URL to an absolute URL
 * 
 * @param {string|null} url - The URL to convert (can be relative or absolute)
 * @returns {string} Absolute URL with full domain, or default image if invalid
 * 
 * Behavior:
 * - Returns the URL as-is if it already starts with http:// or https://
 * - Prepends "https://zebzetoon.vercel.app" to relative URLs
 * - Returns default image URL for null, undefined, or empty string inputs
 * - Handles edge cases gracefully without throwing errors
 * 
 * Example:
 * convertToAbsoluteURL("images/cover.jpg") 
 * Returns: "https://zebzetoon.vercel.app/images/cover.jpg"
 * 
 * convertToAbsoluteURL("https://cdn.example.com/image.jpg")
 * Returns: "https://cdn.example.com/image.jpg"
 * 
 * convertToAbsoluteURL(null)
 * Returns: "https://zebzetoon.vercel.app/logo/zlogo.png"
 */
function convertToAbsoluteURL(url) {
  // Handle null, undefined, or empty string
  if (!url || url.trim() === '') {
    return DEFAULT_META.image;
  }
  
  // Check if URL is already absolute
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Convert relative URL to absolute by prepending domain
  // Remove leading slash if present to avoid double slashes
  const cleanUrl = url.startsWith('/') ? url.substring(1) : url;
  return `https://zebzetoon.vercel.app/${cleanUrl}`;
}

/**
 * Generate Open Graph meta tag content based on URL parameters and series data
 * 
 * @param {Object} params - URL parameters object with seri (string|null) and bolum (number|null)
 * @param {Object|null} seriesData - Series metadata object or null if series not found
 * @returns {Array<{property: string, content: string}>} Array of meta tag definition objects
 * 
 * Content Generation Rules:
 * - Title: "{SeriesName} - Bölüm {ChapterNumber}" with chapter, "{SeriesName}" without, or default
 * - Description: series.ozet or default site description
 * - Image: series.kapak (converted to absolute URL) or default logo
 * - URL: Current page URL with parameters
 * - Type: Always "website"
 * - Site Name: Always "Zebze Toon"
 * - Twitter Card: Always "summary_large_image"
 * - Twitter tags mirror Open Graph tags for consistency
 * 
 * Example:
 * generateOpenGraphContent({ seri: "Ölüm Paktı", bolum: 8 }, seriesData)
 * Returns: [
 *   { property: "og:title", content: "Ölüm Paktı - Bölüm 8" },
 *   { property: "og:description", content: "..." },
 *   ...
 * ]
 */
function generateOpenGraphContent(params, seriesData) {
  const tags = [];
  
  // Generate title
  let title;
  if (params.seri && params.bolum !== null) {
    // With chapter: "{SeriesName} - Bölüm {ChapterNumber}"
    title = `${params.seri} - Bölüm ${params.bolum}`;
  } else if (params.seri) {
    // Without chapter: "{SeriesName}"
    title = params.seri;
  } else {
    // Default: site title
    title = DEFAULT_META.title;
  }
  
  // Generate description
  const description = (seriesData && seriesData.ozet) 
    ? seriesData.ozet 
    : DEFAULT_META.description;
  
  // Generate image URL
  let imageUrl;
  if (seriesData && seriesData.kapak) {
    imageUrl = convertToAbsoluteURL(seriesData.kapak);
  } else {
    imageUrl = DEFAULT_META.image;
  }
  
  // Generate page URL
  const pageUrl = window.location.href;
  
  // Build Open Graph tags
  tags.push({ property: "og:title", content: title });
  tags.push({ property: "og:description", content: description });
  tags.push({ property: "og:image", content: imageUrl });
  tags.push({ property: "og:url", content: pageUrl });
  tags.push({ property: "og:type", content: DEFAULT_META.type });
  tags.push({ property: "og:site_name", content: DEFAULT_META.siteName });
  
  // Build Twitter Card tags (mirror Open Graph tags)
  tags.push({ property: "twitter:card", content: DEFAULT_META.twitterCard });
  tags.push({ property: "twitter:title", content: title });
  tags.push({ property: "twitter:description", content: description });
  tags.push({ property: "twitter:image", content: imageUrl });
  
  return tags;
}

/**
 * Main initialization function that orchestrates the entire meta tag update process
 * 
 * Execution Flow:
 * 1. Parse URL parameters to extract series name and chapter number
 * 2. Retrieve series data from ARSIV (if series parameter exists)
 * 3. Generate meta tag content based on parameters and series data
 * 4. Update all meta tags in the document head
 * 5. Log completion for debugging purposes
 * 
 * This function is called on DOMContentLoaded to ensure meta tags are updated
 * before social media crawlers read the page.
 * 
 * Example:
 * URL: ?seri=Ölüm%20Paktı&bolum=8
 * Result: Meta tags updated with series-specific information
 */
function initializeOpenGraphTags() {
  // Parse URL parameters
  const params = parseURLParameters();
  
  // Retrieve series data if series parameter exists
  let seriesData = null;
  if (params.seri) {
    seriesData = getSeriesData(params.seri);
  }
  
  // Generate meta tag content
  const metaTags = generateOpenGraphContent(params, seriesData);
  
  // Update all meta tags
  setMetaTags(metaTags);
  
  // Log completion for debugging
  console.log('Open Graph meta tags initialized:', {
    series: params.seri,
    chapter: params.bolum,
    tagsUpdated: metaTags.length
  });
}

// Execute on DOMContentLoaded to ensure meta tags are updated early
document.addEventListener('DOMContentLoaded', initializeOpenGraphTags);

// Also execute on popstate event for SPA navigation support
window.addEventListener('popstate', initializeOpenGraphTags);
