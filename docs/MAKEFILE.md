# Makefile Reference

This project includes a comprehensive Makefile for building and managing browser extensions.

## Quick Start

```bash
make help        # Show all available commands
make install     # Install dependencies
make build       # Build all extensions
make status      # Check build status
```

## Available Make Targets

### Help & Information

| Target | Description |
|--------|-------------|
| `make help` | Show all available make targets with descriptions |
| `make status` | Display build status for all browser extensions |
| `make check-deps` | Verify that Node.js, npm, and dependencies are installed |

### Installation

| Target | Description |
|--------|-------------|
| `make install` | Install Node.js dependencies via npm |

### Building

| Target | Description |
|--------|-------------|
| `make build` | Build extensions for all browsers (Chrome, Firefox, Safari) |
| `make build-chrome` | Build Chrome extension only |
| `make build-firefox` | Build Firefox extension only |
| `make build-safari` | Build Safari extension only |
| `make rebuild` | Clean and rebuild all extensions |
| `make quick-chrome` | Quick build for Chrome (no clean) |
| `make quick-firefox` | Quick build for Firefox (no clean) |
| `make quick-safari` | Quick build for Safari (no clean) |

### Watch Mode (Development)

| Target | Description |
|--------|-------------|
| `make watch` | Watch and auto-rebuild Chrome extension on file changes |
| `make watch-chrome` | Watch and auto-rebuild Chrome extension |
| `make watch-firefox` | Watch and auto-rebuild Firefox extension |
| `make watch-safari` | Watch and auto-rebuild Safari extension |

### Packaging

| Target | Description |
|--------|-------------|
| `make package` | Package Chrome and Firefox extensions for distribution |
| `make package-chrome` | Create chrome-extension.zip in dist/ folder |
| `make package-firefox` | Create firefox-extension.xpi in dist/ folder |

### Development

| Target | Description |
|--------|-------------|
| `make dev-firefox` | Build and run Firefox with the extension using web-ext |
| `make dev-chrome` | Open Chrome extensions page (manual load required) |
| `make dev-safari` | Show instructions for Safari development with Xcode |

### Maintenance

| Target | Description |
|--------|-------------|
| `make clean` | Remove all built files from browser directories |
| `make lint` | Run ESLint on source files |
| `make test` | Run tests (placeholder for future implementation) |

### Combined Operations

| Target | Description |
|--------|-------------|
| `make all` | Complete workflow: clean, install, build, and package |

## Typical Workflows

### First Time Setup

```bash
make install     # Install dependencies
make build       # Build all extensions
make status      # Verify everything built correctly
```

### Daily Development (Chrome)

```bash
# Terminal 1: Watch for changes
make watch-chrome

# Terminal 2: Work on your code
# Edit files in src/
# Extensions auto-rebuild on save
```

### Daily Development (Firefox)

```bash
# Option 1: Watch mode + manual reload
make watch-firefox

# Option 2: Use web-ext for auto-reload
make dev-firefox
```

### Testing Across All Browsers

```bash
make build       # Build all
make status      # Verify builds
# Then manually load in each browser
```

### Preparing for Release

```bash
make clean       # Clean old builds
make build       # Fresh build
make package     # Create distribution packages
# Check dist/ folder for .zip and .xpi files
```

### Quick Iteration (Single Browser)

```bash
# Make changes to src/
make quick-chrome    # Fast rebuild without clean
# Reload extension in Chrome
```

## Color-Coded Output

The Makefile uses color-coded terminal output:

- **Blue**: Informational messages
- **Green**: Success messages  
- **Yellow**: Warnings or notices
- **Red**: Errors

## Platform-Specific Notes

### Chrome
- Uses Manifest V3
- `make package-chrome` creates a ZIP file
- Load unpacked from `chrome/` directory for development

### Firefox  
- Uses Manifest V2
- `make package-firefox` creates an XPI file
- `make dev-firefox` uses web-ext for auto-reload
- Load temporary add-on from `firefox/manifest.json`

### Safari
- Requires Xcode on macOS
- `make dev-safari` shows conversion instructions
- Must convert to Safari Web Extension wrapper app

## Comparison: Make vs npm

Both systems work, but Make provides:

| Feature | Make | npm |
|---------|------|-----|
| Single command for all tasks | ✓ `make all` | ✗ Multiple commands |
| Help documentation | ✓ `make help` | ✗ Check package.json |
| Status checking | ✓ `make status` | ✗ Manual |
| Dependency checking | ✓ `make check-deps` | ✗ Manual |
| Color output | ✓ Built-in | ✗ Requires packages |
| Cross-platform | ⚠ Requires make | ✓ npm everywhere |

**Recommendation**: Use `make` on Linux/macOS for better DX. Use `pnpm` on Windows or if make is unavailable.

## Troubleshooting

### "make: command not found"

Install make:
```bash
# Ubuntu/Debian
sudo apt-get install build-essential

# macOS (usually pre-installed, or via Xcode)
xcode-select --install

# Or use npm commands instead
pnpm build
```

### Build Fails

```bash
make check-deps   # Verify dependencies
make clean        # Clean old files
make install      # Reinstall dependencies
make build        # Try building again
```

### Watch Mode Not Working

Ensure you have Node.js installed and all dependencies:
```bash
make check-deps
make install
```

## Environment Variables

Currently, the Makefile doesn't use environment variables, but you can extend it:

```makefile
# Example: Custom dist directory
DIST_DIR := $(or $(DIST_DIR),dist)
```

## Extending the Makefile

To add new targets, follow this pattern:

```makefile
my-target: dependency1 dependency2 ## Description for help
	@echo "$(BLUE)Starting task...$(NC)"
	# Your commands here
	@echo "$(GREEN)✓ Done$(NC)"
```

The `##` comment will automatically appear in `make help` output.
