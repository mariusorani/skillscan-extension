/**
 * SkillScan Verifier - Background Service Worker
 */

// Track statistics
let stats = {
  scannedBadges: 0,
  verifiedBadges: 0,
  suspiciousBadges: 0,
  lastScan: null
};

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'BADGE_SCANNED') {
    stats.scannedBadges++;
    stats.lastScan = new Date().toISOString();
    
    if (message.verified) {
      stats.verifiedBadges++;
    } else {
      stats.suspiciousBadges++;
    }
  }
  
  if (message.type === 'GET_STATS') {
    sendResponse(stats);
    return true;
  }
});

// Update badge icon based on page status
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'UPDATE_ICON' && sender.tab?.id) {
    const iconPath = message.status === 'verified' 
      ? 'icons/icon-verified-'
      : message.status === 'warning'
      ? 'icons/icon-warning-'
      : 'icons/icon-';
    
    // Note: Dynamic icons would require creating icon variants
    // For now, we keep the default icon
  }
});

// Log installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[SkillScan] Extension installed');
    // Open welcome page
    chrome.tabs.create({
      url: 'https://skillscan.dev/extension/welcome'
    });
  } else if (details.reason === 'update') {
    console.log('[SkillScan] Extension updated to version', chrome.runtime.getManifest().version);
  }
});
