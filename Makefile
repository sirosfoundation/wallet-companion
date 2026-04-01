# Makefile for DC API Interceptor Browser Extensions

.PHONY: help install clean build build-chrome build-firefox build-safari \
        watch watch-chrome watch-firefox watch-safari \
        package package-chrome package-firefox \
        dev-firefox lint test all

# Default target
.DEFAULT_GOAL := help

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

# Directories
SRC_DIR := src
DIST_DIR := dist

help: ## Show this help message
	@echo "$(BLUE)DC API Interceptor - Browser Extension Build System$(NC)"
	@echo ""
	@echo "$(GREEN)Available targets:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""

install: ## Install Node.js dependencies
	@echo "$(BLUE)Installing dependencies...$(NC)"
	pnpm install
	@echo "$(GREEN)✓ Dependencies installed$(NC)"

clean: ## Clean built files and prepare for git
	@echo "$(BLUE)Cleaning built files...$(NC)"
	rm -rf $(DIST_DIR)
	@echo "$(BLUE)Cleaning test artifacts...$(NC)"
	rm -rf coverage/
	rm -rf .nyc_output/
	rm -rf node_modules/.cache/
	@echo "$(BLUE)Cleaning editor artifacts...$(NC)"
	find . -type f -name '.DS_Store' -delete
	find . -type f -name 'Thumbs.db' -delete
	find . -type f -name '*~' -delete
	find . -type f -name '*.swp' -delete
	find . -type f -name '*.swo' -delete
	@echo "$(BLUE)Cleaning log files...$(NC)"
	find . -type f -name '*.log' -delete
	@echo "$(GREEN)✓ Cleaned and ready for git$(NC)"

# Build targets
build: build-chrome build-firefox build-safari ## Build extensions for all browsers

build-chrome: ## Build Chrome extension
	@echo "$(BLUE)Building Chrome extension...$(NC)"
	BROWSER=chrome pnpm vite build
	@echo "$(GREEN)✓ Chrome extension built$(NC)"

build-firefox: ## Build Firefox extension
	@echo "$(BLUE)Building Firefox extension...$(NC)"
	BROWSER=firefox pnpm vite build
	@echo "$(GREEN)✓ Firefox extension built$(NC)"

build-safari: ## Build Safari extension
	@echo "$(BLUE)Building Safari extension...$(NC)"
	BROWSER=safari pnpm vite build
	@echo "$(GREEN)✓ Safari extension built$(NC)"

# Watch targets for development
watch: watch-chrome ## Watch mode (default: Chrome)

watch-chrome: ## Watch and rebuild Chrome extension on changes
	@echo "$(BLUE)Watching Chrome extension for changes...$(NC)"
	BROWSER=chrome pnpm vite build --watch

watch-firefox: ## Watch and rebuild Firefox extension on changes
	@echo "$(BLUE)Watching Firefox extension for changes...$(NC)"
	BROWSER=firefox pnpm vite build --watch

watch-safari: ## Watch and rebuild Safari extension on changes
	@echo "$(BLUE)Watching Safari extension for changes...$(NC)"
	BROWSER=safari pnpm vite build --watch

# Package targets
package: package-chrome package-firefox ## Package extensions for distribution

package-chrome: build-chrome ## Package Chrome extension as ZIP
	@echo "$(BLUE)Packaging Chrome extension...$(NC)"
	cd $(DIST_DIR)/chrome && zip -r ../chrome-extension.zip . -x '*.git*' -x 'README.md'
	@echo "$(GREEN)✓ Chrome extension packaged: $(DIST_DIR)/chrome-extension.zip$(NC)"

package-firefox: build-firefox ## Package Firefox extension as XPI
	@echo "$(BLUE)Packaging Firefox extension...$(NC)"
	cd $(DIST_DIR)/firefox && zip -r ../firefox-extension.xpi . -x '*.git*' -x 'README.md'
	@echo "$(GREEN)✓ Firefox extension packaged: $(DIST_DIR)/firefox-extension.xpi$(NC)"

# Development targets
dev-firefox: ## Run Firefox with the extension loaded (requires build)
	@echo "$(BLUE)Starting Firefox with extension...$(NC)"
	pnpm dev:firefox

dev-chrome: ## Open Chrome extensions page (manual load required)
	@echo "$(YELLOW)Opening Chrome extensions page...$(NC)"
	@echo "$(YELLOW)Load the extension from: $(DIST_DIR)/chrome$(NC)"
	@if command -v google-chrome >/dev/null 2>&1; then \
		google-chrome chrome://extensions/; \
	elif command -v chromium >/dev/null 2>&1; then \
		chromium chrome://extensions/; \
	else \
		echo "$(RED)Chrome/Chromium not found$(NC)"; \
	fi

# Safari requires Xcode, so we just provide information
dev-safari: build-safari ## Instructions for Safari development
	@echo "$(YELLOW)Safari Extension Development:$(NC)"
	@echo ""
	@echo "1. Convert to Safari Web Extension:"
	@echo "   xcrun safari-web-extension-converter $(DIST_DIR)/safari/ --app-name 'Wallet Companion'"
	@echo ""
	@echo "2. Open the generated Xcode project and run it"
	@echo ""
	@echo "3. Enable the extension in Safari Preferences → Extensions"

# Quality targets
lint: ## Run ESLint on source files
	@echo "$(BLUE)Running ESLint...$(NC)"
	pnpm lint

test: ## Run unit tests
	@echo "$(BLUE)Running tests...$(NC)"
	pnpm test

typecheck: ## Run TypeScript type checking
	@echo "$(BLUE)Type checking...$(NC)"
	pnpm typecheck

# Utility targets
check-deps: ## Check if required dependencies are installed
	@echo "$(BLUE)Checking dependencies...$(NC)"
	@command -v node >/dev/null 2>&1 || { echo "$(RED)✗ Node.js not found$(NC)"; exit 1; }
	@command -v pnpm >/dev/null 2>&1 || { echo "$(RED)✗ pnpm not found$(NC)"; exit 1; }
	@echo "$(GREEN)✓ Node.js $(shell node --version)$(NC)"
	@echo "$(GREEN)✓ pnpm $(shell pnpm --version)$(NC)"
	@if [ -d node_modules ]; then \
		echo "$(GREEN)✓ Dependencies installed$(NC)"; \
	else \
		echo "$(YELLOW)⚠ Dependencies not installed. Run 'make install'$(NC)"; \
	fi

status: ## Show build status for all browsers
	@echo "$(BLUE)Extension Build Status:$(NC)"
	@echo ""
	@echo "$(YELLOW)Chrome:$(NC)"
	@if [ -f "$(DIST_DIR)/chrome/manifest.json" ]; then \
		echo "  $(GREEN)✓ Built$(NC)"; \
	else \
		echo "  $(RED)✗ Not built$(NC)"; \
	fi
	@echo ""
	@echo "$(YELLOW)Firefox:$(NC)"
	@if [ -f "$(DIST_DIR)/firefox/manifest.json" ]; then \
		echo "  $(GREEN)✓ Built$(NC)"; \
	else \
		echo "  $(RED)✗ Not built$(NC)"; \
	fi
	@echo ""
	@echo "$(YELLOW)Safari:$(NC)"
	@if [ -f "$(DIST_DIR)/safari/manifest.json" ]; then \
		echo "  $(GREEN)✓ Built$(NC)"; \
	else \
		echo "  $(RED)✗ Not built$(NC)"; \
	fi
	@echo ""
	@if [ -d "$(DIST_DIR)" ]; then \
		echo "$(YELLOW)Packages:$(NC)"; \
		ls -lh $(DIST_DIR)/*.zip $(DIST_DIR)/*.xpi 2>/dev/null || echo "  $(YELLOW)No packages$(NC)"; \
	fi

all: clean install build package ## Clean, install, build and package everything
	@echo "$(GREEN)✓ All tasks completed$(NC)"

rebuild: clean build ## Clean and rebuild all extensions

# Development workflow shortcuts
quick-chrome: build-chrome ## Quick build for Chrome (no clean)
	@echo "$(GREEN)✓ Ready to reload in Chrome$(NC)"

quick-firefox: build-firefox ## Quick build for Firefox (no clean)
	@echo "$(GREEN)✓ Ready to reload in Firefox$(NC)"

quick-safari: build-safari ## Quick build for Safari (no clean)
	@echo "$(GREEN)✓ Ready to reload in Safari$(NC)"
