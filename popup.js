/**
 * SkillScan Verifier - Popup Script
 */

document.addEventListener('DOMContentLoaded', () => {
  // Get stats from background
  chrome.runtime.sendMessage({ type: 'GET_STATS' }, (stats) => {
    if (stats) {
      document.getElementById('scannedCount').textContent = stats.scannedBadges || 0;
      document.getElementById('verifiedCount').textContent = stats.verifiedBadges || 0;
      
      // Update status based on suspicious badges
      if (stats.suspiciousBadges > 0) {
        const statusEl = document.getElementById('pageStatus');
        statusEl.textContent = `${stats.suspiciousBadges} Warning(s) ⚠`;
        statusEl.className = 'status-value warning';
      }
    }
  });
  
  // Query current tab for badges
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.url?.includes('github.com')) {
      // Tab is on GitHub
      document.getElementById('pageStatus').textContent = 'Monitoring ✓';
    } else {
      document.getElementById('pageStatus').textContent = 'Not on GitHub';
      document.getElementById('pageStatus').className = 'status-value';
    }
  });
});
