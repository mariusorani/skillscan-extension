/**
 * SkillScan Verifier - Content Script
 * 
 * Runs on GitHub pages to detect and verify SkillScan badges.
 * Shows visual overlay indicating verification status.
 */

const SKILLSCAN_API = 'https://skillscan.dev/api/check';
const BADGE_PATTERN = /skillscan\.dev\/api\/badge\/([^\/\.]+)/i;
const VERIFY_PATTERN = /skillscan\.dev\/verify\/([^\/\?\#]+)/i;

// Cache verification results
const verificationCache = new Map();

/**
 * Extract current repo info from GitHub URL
 */
function getCurrentRepo() {
  const match = window.location.pathname.match(/^\/([^\/]+)\/([^\/]+)/);
  if (match) {
    return { owner: match[1], name: match[2] };
  }
  return null;
}

/**
 * Find all SkillScan badges on the page
 */
function findSkillScanBadges() {
  const badges = [];
  
  // Find badge images (direct src)
  const images = document.querySelectorAll('img[src*="skillscan.dev/api/badge"]');
  images.forEach(img => {
    const match = img.src.match(BADGE_PATTERN);
    if (match) {
      badges.push({
        element: img,
        skillId: match[1],
        type: 'image'
      });
    }
  });
  
  // Find badge images via data-canonical-src (GitHub proxies images through camo.githubusercontent.com)
  const camoImages = document.querySelectorAll('img[data-canonical-src*="skillscan.dev/api/badge"]');
  camoImages.forEach(img => {
    const canonicalSrc = img.getAttribute('data-canonical-src');
    const match = canonicalSrc?.match(BADGE_PATTERN);
    if (match && !badges.some(b => b.element === img)) {
      badges.push({
        element: img,
        skillId: match[1],
        type: 'image'
      });
    }
  });
  
  // Find badge links
  const links = document.querySelectorAll('a[href*="skillscan.dev/verify"]');
  links.forEach(link => {
    const match = link.href.match(VERIFY_PATTERN);
    if (match && !badges.some(b => b.element === link || b.element.closest('a') === link)) {
      badges.push({
        element: link,
        skillId: match[1],
        type: 'link'
      });
    }
  });
  
  return badges;
}

/**
 * Verify a skill via SkillScan API
 */
async function verifySkill(skillId) {
  // Check cache
  if (verificationCache.has(skillId)) {
    return verificationCache.get(skillId);
  }
  
  try {
    const response = await fetch(`${SKILLSCAN_API}?id=${encodeURIComponent(skillId)}`);
    const data = await response.json();
    
    // Cache for 5 minutes
    verificationCache.set(skillId, data);
    setTimeout(() => verificationCache.delete(skillId), 5 * 60 * 1000);
    
    return data;
  } catch (error) {
    console.error('[SkillScan] Verification error:', error);
    return { error: 'Network error', verified: false };
  }
}

/**
 * Check if badge repo matches current page repo
 */
function checkRepoMatch(skillData, currentRepo) {
  if (!currentRepo || !skillData.skill) return { matches: true, reason: null };
  
  const skillRepo = skillData.skill.repo?.toLowerCase();
  const pageRepo = `${currentRepo.owner}/${currentRepo.name}`.toLowerCase();
  
  if (skillRepo !== pageRepo) {
    return { 
      matches: false, 
      reason: `Badge is for ${skillData.skill.repo}, but you're viewing ${currentRepo.owner}/${currentRepo.name}`
    };
  }
  
  return { matches: true, reason: null };
}

/**
 * Create verification overlay
 */
function createOverlay(badge, status, message, isWarning = false, isError = false) {
  try {
    // Find the link wrapper (badge is usually img inside <a>)
    const link = badge.element.closest('a') || badge.element.parentElement;
    if (!link) return null;
    
    // Remove existing overlay next to this badge
    const existingOverlay = link.nextElementSibling;
    if (existingOverlay?.classList?.contains('skillscan-overlay')) {
      existingOverlay.remove();
    }
    
    const overlay = document.createElement('span');
    overlay.className = 'skillscan-overlay';
    
    if (isError) {
      overlay.classList.add('skillscan-overlay-error');
    } else if (isWarning) {
      overlay.classList.add('skillscan-overlay-warning');
    } else {
      overlay.classList.add('skillscan-overlay-success');
    }
    
    overlay.innerHTML = `<span class="skillscan-overlay-icon">${isError ? '✗' : isWarning ? '⚠' : '✓'}</span><span class="skillscan-overlay-text">${status}</span>`;
    
    if (message) {
      overlay.title = message;
    }
    
    // Find the README article/container to position overlay at far right
    const articleContainer = link.closest('article') || link.closest('.markdown-body') || link.closest('.Box-body');
    if (articleContainer) {
      articleContainer.style.position = 'relative';
      articleContainer.appendChild(overlay);
      
      // Position overlay at same height as badge, but on far right
      const badgeRect = badge.element.getBoundingClientRect();
      const containerRect = articleContainer.getBoundingClientRect();
      const topOffset = badgeRect.top - containerRect.top;
      overlay.style.top = topOffset + 'px';
      overlay.style.transform = 'none';
    } else {
      // Fallback: insert after link
      link.insertAdjacentElement('afterend', overlay);
    }
    
    return overlay;
  } catch (e) {
    console.error('[SkillScan] Error creating overlay:', e);
    return null;
  }
}

/**
 * Notify background script about badge scan result
 */
function notifyBadgeScan(verified, suspicious = false) {
  try {
    chrome.runtime.sendMessage({
      type: 'BADGE_SCANNED',
      verified: verified,
      suspicious: suspicious
    });
  } catch (e) {
    // Extension context may be invalidated
    console.log('[SkillScan] Could not notify background:', e.message);
  }
}

/**
 * Process all badges on page
 */
async function processBadges() {
  const badges = findSkillScanBadges();
  const currentRepo = getCurrentRepo();
  
  console.log(`[SkillScan] Found ${badges.length} badge(s) on page`);
  
  for (const badge of badges) {
    try {
      // Add loading state
      badge.element.style.opacity = '0.7';
      
      const result = await verifySkill(badge.skillId);
      
      // Reset opacity
      badge.element.style.opacity = '1';
      
      if (result.error) {
        createOverlay(badge, 'Error', result.error, false, true);
        notifyBadgeScan(false, true);
        continue;
      }
      
      // Check for outdated status FIRST (code changed but was verified)
      if (result.status === 'outdated') {
        createOverlay(badge, 'OUTDATED', result.warning || 'Code changed since verification', true, false);
        notifyBadgeScan(true, false);
        continue;
      }
      
      // Check if verified
      if (!result.verified) {
        const reason = result.warning || result.message || 'Not verified';
        createOverlay(badge, 'UNVERIFIED', reason, false, true);
        notifyBadgeScan(false, true);
        continue;
      }
      
      // Check if badge matches current repo
      const repoCheck = checkRepoMatch(result, currentRepo);
      
      if (!repoCheck.matches) {
        createOverlay(badge, 'MISMATCH', repoCheck.reason, false, true);
        notifyBadgeScan(false, true);
        continue;
      }
      
      // All good! Show verification overlay as independent trust indicator
      const tier = result.skill?.tier === 'audited' ? 'AUDITED' : 'VERIFIED';
      createOverlay(badge, tier, `Verified by extension: ${result.skill?.repo} @ ${result.skill?.verifiedCommitShort}`, false, false);
      notifyBadgeScan(true, false);
      
    } catch (error) {
      console.error('[SkillScan] Error processing badge:', error);
      badge.element.style.opacity = '1';
      notifyBadgeScan(false, true);
    }
  }
}

/**
 * Initialize extension
 */
function init() {
  console.log('[SkillScan] Verifier initialized');
  
  // Initial scan
  processBadges();
  
  // Re-scan on dynamic content changes (for SPAs)
  const observer = new MutationObserver((mutations) => {
    let shouldRescan = false;
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node;
            if (el.querySelector?.('img[src*="skillscan"]') || 
                el.querySelector?.('img[data-canonical-src*="skillscan"]') ||
                el.querySelector?.('a[href*="skillscan"]') ||
                el.matches?.('img[src*="skillscan"]') ||
                el.matches?.('img[data-canonical-src*="skillscan"]') ||
                el.matches?.('a[href*="skillscan"]')) {
              shouldRescan = true;
              break;
            }
          }
        }
      }
      if (shouldRescan) break;
    }
    
    if (shouldRescan) {
      // Debounce
      clearTimeout(window.skillscanRescanTimeout);
      window.skillscanRescanTimeout = setTimeout(processBadges, 500);
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
