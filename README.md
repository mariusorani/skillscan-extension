# SkillScan Verifier Browser Extension

🛡️ **Protect yourself from malicious AI agent skills**

This browser extension automatically verifies SkillScan badges on GitHub and alerts you to suspicious or spoofed badges.

## Features

- ✅ **Automatic Verification**: Scans GitHub pages for SkillScan badges
- 🔍 **Real-time Checking**: Verifies each badge against the SkillScan API
- ⚠️ **Spoof Detection**: Highlights fake or mismatched badges in red
- 📊 **Status Overlay**: Shows verification status directly on badges

## How It Works

1. When you visit a GitHub repository, the extension scans for SkillScan badges
2. Each badge is verified against our public API
3. The extension adds a visual overlay showing the verification status:
   - ✓ **VERIFIED** (green) - Badge is authentic and matches the repo
   - ⚠ **OUTDATED** (orange) - Code has changed since verification
   - ✗ **MISMATCH** (red) - Badge doesn't match this repository
   - ✗ **UNVERIFIED** (red) - Badge is not in our registry

## Installation

### Chrome Web Store
*Coming soon*

### Manual Installation (Developer Mode)

1. Download this folder
2. Go to `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select the `browser-extension` folder

### Firefox
*Coming soon via Firefox Add-ons*

## Building Icons

The extension needs icons in multiple sizes. Create PNG icons from your logo:

```bash
# Required sizes: 16x16, 32x32, 48x48, 128x128
# Place in icons/ folder as icon16.png, icon32.png, etc.
```

## Development

### Structure

```
browser-extension/
├── manifest.json     # Extension configuration
├── content.js        # Runs on GitHub pages
├── background.js     # Service worker
├── popup.html        # Extension popup
├── popup.js          # Popup logic
├── styles.css        # Overlay styles
└── icons/            # Extension icons
```

### Testing

1. Load the extension in developer mode
2. Visit any GitHub repo with a SkillScan badge
3. The badge should show a verification overlay

### API

The extension uses the public SkillScan API:

```
GET https://skillscan.dev/api/check?id={skillId}
```

## Privacy

- No user data is collected or transmitted
- Only GitHub pages are scanned
- Only SkillScan badge URLs are sent to our API for verification
- See our [Privacy Policy](https://skillscan.dev/privacy)

## License

MIT License - See LICENSE file

## Support

- Website: https://skillscan.dev
- Issues: https://github.com/mariusorani/skillscan-registry/issues
