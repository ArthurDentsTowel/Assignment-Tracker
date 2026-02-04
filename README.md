# UW Assignment Tracker

A real-time status tracking tool for underwriter file assignments.

---

## Overview

The UW Assignment Tracker allows underwriters to signal their availability for new file assignments, and gives assigners visibility into team workload throughout the day. All data resets automatically at 2:00 AM CST.

---

## Features

- **Status Indicators**: Underwriters can set their status to Green (wants files), Red (do not assign), or Neutral (default)
- **File Count Tracking**: Assigners can track how many files have been assigned to each UW
- **Timestamps**: Shows when a UW changed to green or red status (CST)
- **Smart Sorting**: Cards automatically sort to surface the most relevant information
- **Daily Reset**: Both status and file counts reset at 2:00 AM CST
- **Role-Based Access**: UWs can only change their own status; Assigners can see/edit file counts

---


## How It Works

### Status Colors
| Color | Meaning | Icon |
|-------|---------|------|
| 🟢 Green | Wants files | ✓ |
| ⚪ Gray | Neutral (default) | — |
| 🔴 Red | Do not assign | ✕ |

### Card Sorting Order
Cards are automatically sorted in this priority:

1. **Green status** — Oldest timestamp first (who's been waiting longest for files)
2. **Neutral with 0 file count** — Alphabetical by name
3. **Neutral with 1+ file count** — Lowest count on top
4. **Red status** — Oldest timestamp first

### Permissions
| Action | Underwriter | Assigner |
|--------|-------------|----------|
| Change own status | ✅ | ✅ |
| Change other's status | ❌ | ✅ |
| View file counts | ❌ | ✅ |
| Edit file counts | ❌ | ✅ |

### Daily Reset (2:00 AM CST)
- All statuses reset to **Neutral (gray)**
- All file counts reset to **0**
- All timestamps are cleared

---

## Using the App

### Signing In
1. Enter your Nations Lending email address
2. Click **Sign In** (or press Enter)

### Changing Your Status (Underwriters)
1. Find your card (marked with a purple dot)
2. Click ✓ to set **Green** (wants files)
3. Click ✕ to set **Red** (do not assign)
4. Click the same button again to return to **Neutral**

### Tracking Assignments (Assigners)
1. Use the **+** and **−** buttons on any card to adjust file counts
2. View the **Total Assigned Today** in the header
3. File counts are only visible to assigners

### Refreshing Data
- Click the **Refresh** button to pull the latest data from other users
- This does NOT log you out

### Signing Out
- Click **Sign Out** to return to the login screen

---

## Deployment

### Publishing a New Version
1. Go to **claude.ai** (not in a project)
2. Start a new chat
3. Paste the full JSX code and ask: "Create a React artifact using this code"
4. Once the artifact renders and works, click **Publish**
5. Copy the published link and share with the team

### Updating the User List
To add or remove users, edit the `CONFIG` object at the top of the code:

```javascript
const CONFIG = {
  underwriters: {
    "email@nxxxx.com": { name: "Display Name" },
    // Add or remove UWs here
  },
  assigners: [
    "assigner.email@xxxx.com",
    // Add or remove assigners here
  ]
};
```

After editing, publish a new version and share the updated link.

---

## Troubleshooting

### "Email not recognized"
- Ensure you're using your full Nations Lending email
- Check that your email is listed in the CONFIG section
- Email matching is case-insensitive

### Not seeing other users' updates
- Click the **Refresh** button to pull the latest data
- Other users also need to refresh to see your changes

### Status/counts didn't reset overnight
- The reset happens at 2:00 AM CST
- Click **Refresh** after 2:00 AM to trigger the reset check

### Sign In button not working
- Make sure you've entered a valid email format
- Try pressing Enter instead of clicking the button

---

## Technical Details

- **Framework**: React (runs as a Claude.ai published artifact)
- **Storage**: Claude's persistent shared storage API (`window.storage`)
- **Timezone**: CST (Central Standard Time) for all timestamps and resets
- **Storage Key**: `uw-tracker-shared-data`

---

## Project Structure

```
Assignment-Tracker/
├── README.md                      # This documentation
├── package.json                   # Dependencies and scripts
├── index.html                     # HTML entry point
├── vite.config.js                 # Build configuration
└── src/
    ├── index.js                   # Entry point and exports
    ├── main.jsx                   # React DOM entry
    ├── UWAssignmentTracker.jsx    # Main React component
    └── utils/
        ├── validation.js          # Input validation & authorization
        └── storage.js             # Storage adapter (localStorage/Supabase)
```

### Validation Module (`src/utils/validation.js`)

The validation module provides reusable utilities for:

- **Email Validation**: RFC 5322 compliant format checking
- **Domain Validation**: Ensures only @nationslending.com emails are accepted
- **Input Sanitization**: XSS prevention for string inputs
- **Authorization Helpers**: Role-based access control utilities

Key exports:
```javascript
import {
  isValidEmailFormat,     // Check email format
  isAllowedDomain,        // Check email domain
  sanitizeEmail,          // Clean email input
  validateAuthorization,  // Full auth validation
  canModifyStatus,        // Check status edit permission
  canModifyCount,         // Check count edit permission
  UserRole                // Role enum (UNDERWRITER, ASSIGNER, UNKNOWN)
} from './utils/validation.js';
```

### Future: Supabase Integration

The validation module includes placeholder functions for dynamic user management:

- `validateUserFromAPI()` - Validate users against Supabase backend
- `fetchUserConfig()` - Load user list dynamically from database

These are ready to be implemented when Supabase is configured.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | — | Initial release with basic status tracking |
| 1.1 | — | Added file counts, compact card design |
| 1.2 | — | Separated status buttons (green/red) |
| 1.3 | — | File counts visible to assigners only |
| 1.4 | — | Added Refresh button (no logout required) |
| 1.5 | — | Status + count reset at 2am CST, timestamps on status changes, smart sorting |
| 2.0 | — | Refactored architecture: validation module, improved auth, notification system, Supabase-ready structure |

---

## Support

For questions, modifications, or issues, contact Daniel Obenauf.
