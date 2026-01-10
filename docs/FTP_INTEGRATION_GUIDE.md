# FTP Manager Integration Guide

## Quick Integration Steps

### 1. Add FTP Manager Import to Explorer.tsx

Add this import at the top with other hosting managers (around line 15):

```typescript
import FTPManager from '../hosting/FTPManager';
```

### 2. Add FTP State to useExplorer Hook

In `hooks/useExplorer.ts`, add:

```typescript
// Add to state declarations
const [showAddFTPAccount, setShowAddFTPAccount] = useState(false);

// Add fetch function
const fetchFTP = async () => {
    setLoading(true);
    setActiveView('ftp');
    try {
        const res = await axios.get('/api/ftp');
        setFiles(res.data);
    } catch (err) {
        console.error('Failed to fetch FTP accounts:', err);
        setFiles([]);
    } finally {
        setLoading(false);
    }
};

// Return these in the hook
return {
    // ... existing returns
    showAddFTPAccount,
    setShowAddFTPAccount,
    fetchFTP,
};
```

### 3. Add FTP Navigation Handler

In Explorer.tsx, add to the `handleNavigate` function (around line 99):

```typescript
else if (view === 'ftp') fetchFTP();
```

### 4. Add FTP Manager Component

In Explorer.tsx, add this condition in the main content area (around line 255, after SSH):

```typescript
) : activeView === 'ftp' ? (
    <FTPManager
        accounts={files}
        loading={loading}
        onRefresh={fetchFTP}
        onAddAccount={() => setShowAddFTPAccount(true)}
    />
```

### 5. Add FTP to Sidebar Menu

In `components/layout/Sidebar.tsx`, add FTP to the hosting menu items:

```typescript
{
    icon: Server,
    label: 'FTP Accounts',
    view: 'ftp',
    badge: null
}
```

### 6. Add Create FTP Modal

In `components/modals/ExplorerModals.tsx`, add the modal handling:

```typescript
// Import
import CreateFTPModal from './CreateFTPModal';

// In the component props, add:
showAddFTPAccount: boolean;
setShowAddFTPAccount: (show: boolean) => void;
fetchFTP: () => void;

// In the JSX, add:
{showAddFTPAccount && (
    <CreateFTPModal
        onClose={() => setShowAddFTPAccount(false)}
        onSuccess={() => {
            setShowAddFTPAccount(false);
            fetchFTP();
        }}
    />
)}
```

## Alternative: Standalone FTP Page

If you prefer a dedicated FTP page instead of integrating into Explorer:

### Create FTPPage.tsx

```typescript
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import FTPManager from '../components/hosting/FTPManager';

const FTPPage: React.FC = () => {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchAccounts = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/ftp');
            setAccounts(res.data);
        } catch (err) {
            console.error('Failed to fetch FTP accounts:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, []);

    return (
        <div className="min-h-screen bg-[var(--bg-dark)]">
            <FTPManager
                accounts={accounts}
                loading={loading}
                onRefresh={fetchAccounts}
                onAddAccount={() => {/* handled by FTPManager */}}
            />
        </div>
    );
};

export default FTPPage;
```

## Testing the Integration

1. **Restart the server** to load the new FTP routes
2. **Navigate to FTP Manager** from the sidebar
3. **Create a test FTP account**:
   - Username: `test_ftp`
   - Password: Use the generator or enter manually
   - Leave root path empty for auto-generation
4. **Verify the account appears** in the FTP Manager
5. **Test management features**:
   - View statistics
   - Change password
   - Suspend/activate
   - Delete account

## Troubleshooting

### FTP accounts not loading
- Check database migration ran successfully
- Verify `/api/ftp` endpoint is accessible
- Check browser console for errors

### Cannot create FTP account
- Verify user has quota available (`max_ftp_accounts`)
- Check username doesn't already exist
- Ensure password meets minimum requirements (8 chars)

### Directory not created
- Check server has write permissions
- Verify the path is valid
- Check server logs for filesystem errors

## Security Notes

- All FTP passwords are hashed with bcrypt
- Users can only see/manage their own FTP accounts
- Admins can see all accounts
- Directory access is restricted to `rootPath`
- Quota limits prevent abuse
