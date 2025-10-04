# 🚀 Quick Setup Guide

## Prerequisites

- Node.js >= 18
- pnpm >= 8

## Installation

```bash
# Install pnpm globally (if not installed)
npm install -g pnpm

# Install project dependencies
pnpm install
```

## Available Commands

```bash
# Development
pnpm install          # Install dependencies
pnpm test            # Run all tests
pnpm test --watch    # Run tests in watch mode
pnpm test --coverage # Run tests with coverage

# Building
pnpm build           # Compile TypeScript
pnpm typecheck       # Type check without emitting

# Code Quality
pnpm lint            # Run ESLint
```

## First Time Setup

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd imara-diff
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Run tests to verify**
   ```bash
   pnpm test
   ```

4. **Build the project**
   ```bash
   pnpm build
   ```

## Troubleshooting

### Error: Cannot find module 'vitest'
**Solution**: Run `pnpm install`

### Error: pnpm not found
**Solution**: Install pnpm globally with `npm install -g pnpm`

### TypeScript errors
**Solution**: Run `pnpm typecheck` to see all type errors

## Project Structure

```
imara-diff/
├── src/              # Source code
├── tests/            # Test files
├── docs/             # Documentation
├── dist/             # Compiled output (after build)
└── package.json      # Dependencies and scripts
```

## Ready to Code! 🎉

After running `pnpm install`, you're ready to:
- ✅ Run tests
- ✅ Make changes
- ✅ Build project
- ✅ Contribute

See `README.md` for detailed usage and API documentation.

