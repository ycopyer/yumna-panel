# Contributing to Yumna Panel

Thank you for your interest in contributing to Yumna Panel! This document provides guidelines and instructions for contributing.

## Code of Conduct

### Our Pledge
We are committed to providing a welcoming and inspiring community for all. Please be respectful and constructive in all interactions.

### Standards
- Use welcoming and inclusive language
- Be respectful of differing viewpoints
- Accept constructive criticism gracefully
- Focus on what is best for the community

---

## How to Contribute

### Reporting Bugs

Before creating a bug report, please check existing issues to avoid duplicates.

**Bug Report Template**:
```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment**:
- OS: [e.g., Ubuntu 20.04]
- Node.js version: [e.g., 18.0.0]
- Browser: [e.g., Chrome 120]
```

### Suggesting Features

**Feature Request Template**:
```markdown
**Is your feature request related to a problem?**
A clear description of the problem.

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
Any alternative solutions or features you've considered.

**Additional context**
Any other context or screenshots.
```

---

## Development Setup

### 1. Fork and Clone

```bash
# Fork the repository on GitHub
# Clone your fork
git clone https://github.com/YOUR_USERNAME/YumnaPanel.git
cd YumnaPanel

# Add upstream remote
git remote add upstream https://github.com/yumnapanel/YumnaPanel.git
```

### 2. Install Dependencies

```bash
# Install all dependencies
cd whm && npm install
cd ../panel && npm install
cd ../agent && npm install
cd ../app/server && npm install
```

### 3. Setup Development Environment

```bash
# Copy environment files
cp whm/.env.example whm/.env
cp agent/.env.example agent/.env

# Setup local MySQL database
mysql -u root -p
CREATE DATABASE yumna_panel_dev;
```

### 4. Start Development Servers

```bash
# Terminal 1: WHM Backend
cd whm
npm run dev

# Terminal 2: Panel Frontend
cd panel
npm run dev

# Terminal 3: Agent
cd agent
npm run dev

# Terminal 4: File Manager
cd app/server
npm run dev
```

---

## Coding Standards

### JavaScript/TypeScript

We follow the **Airbnb JavaScript Style Guide** with some modifications.

**Key Rules**:
- Use 4 spaces for indentation
- Use semicolons
- Use single quotes for strings
- Max line length: 120 characters
- Use async/await over promises
- Use arrow functions for callbacks

**Example**:
```javascript
// Good
const fetchUsers = async () => {
    try {
        const [rows] = await pool.promise().query('SELECT * FROM users');
        return rows;
    } catch (err) {
        console.error('[DB] Error:', err);
        throw err;
    }
};

// Bad
function fetchUsers() {
    return pool.promise().query("SELECT * FROM users").then(function(result) {
        return result[0]
    }).catch(function(err) {
        console.log(err)
    })
}
```

### React/TSX

**Component Structure**:
```tsx
import React, { useState, useEffect } from 'react';
import { Icon } from 'lucide-react';

interface ComponentProps {
    userId: number;
    onClose: () => void;
}

const MyComponent: React.FC<ComponentProps> = ({ userId, onClose }) => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [userId]);

    const fetchData = async () => {
        // Implementation
    };

    return (
        <div className="container">
            {/* JSX */}
        </div>
    );
};

export default MyComponent;
```

### CSS/Styling

- Use Tailwind CSS utility classes
- Follow the existing design system
- Use CSS variables for theming
- Maintain dark/light mode compatibility

**Example**:
```tsx
<div className="p-6 bg-white/5 rounded-2xl border border-white/10 hover:border-indigo-500/30 transition-all">
    <h3 className="text-xl font-black text-white">Title</h3>
</div>
```

---

## Git Workflow

### Branch Naming

- `feature/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `docs/documentation-update` - Documentation
- `refactor/component-name` - Code refactoring
- `test/test-description` - Tests

### Commit Messages

Follow the **Conventional Commits** specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples**:
```bash
feat(billing): add PPN 11% tax calculation

Implemented Indonesian tax compliance by adding automatic
PPN (Value Added Tax) calculation to all invoices.

Closes #123
```

```bash
fix(auth): resolve session timeout issue

Fixed a bug where user sessions were expiring prematurely
due to incorrect JWT expiration handling.

Fixes #456
```

### Pull Request Process

1. **Create a feature branch**:
```bash
git checkout -b feature/my-new-feature
```

2. **Make your changes and commit**:
```bash
git add .
git commit -m "feat(scope): description"
```

3. **Keep your branch updated**:
```bash
git fetch upstream
git rebase upstream/main
```

4. **Push to your fork**:
```bash
git push origin feature/my-new-feature
```

5. **Create Pull Request**:
- Go to GitHub and create a PR
- Fill out the PR template
- Link related issues
- Request review from maintainers

**PR Template**:
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Manual testing completed
- [ ] No console errors

## Screenshots (if applicable)

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
```

---

## Testing

### Backend Tests

```bash
cd whm
npm test
```

**Example Test**:
```javascript
const request = require('supertest');
const app = require('../src/index');

describe('Auth API', () => {
    it('should login with valid credentials', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                username: 'admin',
                password: 'password123'
            });
        
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('sessionId');
    });
});
```

### Frontend Tests

```bash
cd panel
npm test
```

---

## Documentation

### Code Comments

```javascript
/**
 * Calculate PPN tax for Indonesian invoices
 * @param {number} amount - Base amount before tax
 * @returns {Object} Object containing tax_amount and total_amount
 */
const calculateTax = (amount) => {
    const taxRate = 0.11; // 11% PPN
    const taxAmount = amount * taxRate;
    const totalAmount = amount + taxAmount;
    
    return { taxAmount, totalAmount };
};
```

### API Documentation

When adding new endpoints, update `docs/API.md`:

```markdown
### POST /api/new-endpoint
Description of what this endpoint does.

**Request Body**:
```json
{
  "field": "value"
}
```

**Response**:
```json
{
  "result": "success"
}
```
```

---

## Plugin Development

### Creating a Plugin

1. **Create plugin structure**:
```
plugins/
  my-plugin/
    index.js
    package.json
    README.md
```

2. **Plugin manifest** (`package.json`):
```json
{
  "name": "yumna-plugin-myplugin",
  "version": "1.0.0",
  "description": "My awesome plugin",
  "main": "index.js",
  "yumna": {
    "hooks": ["before_user_create", "after_invoice_paid"]
  }
}
```

3. **Plugin code** (`index.js`):
```javascript
module.exports = {
    name: 'my-plugin',
    version: '1.0.0',
    
    init: (pluginService) => {
        // Register hooks
        pluginService.registerHook('my-plugin', 'before_user_create', async (data) => {
            console.log('User about to be created:', data);
            return data; // Must return modified or original data
        });
    }
};
```

---

## Release Process

### Version Numbering

We follow **Semantic Versioning** (SemVer):
- MAJOR version for incompatible API changes
- MINOR version for backwards-compatible functionality
- PATCH version for backwards-compatible bug fixes

### Creating a Release

1. Update version in all `package.json` files
2. Update `CHANGELOG.md`
3. Create a git tag:
```bash
git tag -a v3.1.0 -m "Release v3.1.0"
git push origin v3.1.0
```

---

## Community

### Getting Help

- **Discord**: https://discord.gg/yumnapanel
- **Forum**: https://forum.yumnapanel.com
- **Email**: support@yumnapanel.com

### Recognition

Contributors will be recognized in:
- `CONTRIBUTORS.md` file
- Release notes
- Project website

---

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT License).

---

Thank you for contributing to Yumna Panel! 🚀
