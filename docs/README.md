# Documentation

This directory contains all documentation for the Web Wallet Selector browser extension.

## Structure

```
docs/
├── design/                      # Design documents and architecture
│   ├── PROTOCOL_SUPPORT.md     # Protocol plugin architecture
│   ├── WALLET_API.md           # Wallet registration API
│   ├── WALLET_MANAGEMENT.md    # Wallet management features
│   ├── IMPLEMENTATION.md       # Implementation details
│   ├── IMPLEMENTATION_SUMMARY.md
│   └── AUTO_REGISTRATION_SUMMARY.md
├── BRANDING.md                 # Brand guidelines and assets
├── BRANDING_UPDATE.md          # Branding update changelog
├── QUICKSTART.md               # Quick start guide
├── DEVELOPMENT.md              # Development guide
├── TESTING.md                  # Testing documentation
├── CHANGELOG.md                # Version history
├── MAKEFILE.md                 # Makefile documentation
├── PROJECT_SUMMARY.md          # Project overview
└── TEST_RESULTS.md             # Test results and coverage
```

## Documentation Index

### Getting Started

- **[QUICKSTART.md](QUICKSTART.md)** - Quick start guide for developers
- **[DEVELOPMENT.md](DEVELOPMENT.md)** - Development environment setup and workflows
- **[TESTING.md](TESTING.md)** - Testing guide and best practices

### Design Documents (`design/`)

- **[PROTOCOL_SUPPORT.md](design/PROTOCOL_SUPPORT.md)** - Protocol-aware business logic, plugin architecture, and W3C Digital Credentials API implementation
- **[WALLET_API.md](design/WALLET_API.md)** - Wallet registration and communication API
- **[WALLET_MANAGEMENT.md](design/WALLET_MANAGEMENT.md)** - Wallet management system design
- **[IMPLEMENTATION.md](design/IMPLEMENTATION.md)** - Detailed implementation notes
- **[IMPLEMENTATION_SUMMARY.md](design/IMPLEMENTATION_SUMMARY.md)** - Implementation overview
- **[AUTO_REGISTRATION_SUMMARY.md](design/AUTO_REGISTRATION_SUMMARY.md)** - Auto-registration feature design

### Brand Guidelines

- **[BRANDING.md](BRANDING.md)** - Complete branding guide including logo usage, color palette, typography, and UI components
- **[BRANDING_UPDATE.md](BRANDING_UPDATE.md)** - Summary of branding changes and asset generation process

### Project Information

- **[CHANGELOG.md](CHANGELOG.md)** - Version history and release notes
- **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** - High-level project overview
- **[TEST_RESULTS.md](TEST_RESULTS.md)** - Test coverage and results
- **[MAKEFILE.md](MAKEFILE.md)** - Build system documentation

## Quick Links

### For Developers

- [Protocol Plugin System](design/PROTOCOL_SUPPORT.md#protocol-plugin-system) - How to create custom protocol plugins
- [Architecture Overview](design/PROTOCOL_SUPPORT.md#architecture) - System design and data flow
- [Testing](design/PROTOCOL_SUPPORT.md#testing) - How to test protocol implementations

### For Designers

- [Logo Files](BRANDING.md#logo-files) - Available logo formats and usage
- [Color Palette](BRANDING.md#color-palette) - Brand colors and their applications
- [Icon Generation](BRANDING.md#icon-generation) - How to regenerate extension icons

### For Wallet Developers

- [Wallet Registration](design/PROTOCOL_SUPPORT.md#wallet-registration) - How to register your wallet with the extension
- [Protocol Specifications](design/PROTOCOL_SUPPORT.md#protocol-specifications) - Supported protocols and their formats

## Contributing to Documentation

When adding new documentation:

1. **Design Documents** → Place in `docs/design/`
2. **User Guides** → Place in `docs/`
3. **API Documentation** → Consider using JSDoc in code and generating with tools
4. **Brand Assets** → Store source files in `src/icons/`, document in `docs/BRANDING.md`

### Documentation Standards

- Use Markdown format (`.md`)
- Include table of contents for documents > 200 lines
- Add code examples where applicable
- Reference related documents with relative links
- Keep line length ≤ 120 characters for readability
- Update this index when adding new documents

## Generating Documentation

Some documentation is auto-generated from source code:

```bash
# Generate API docs from JSDoc comments (future)
npm run docs:api

# Generate test coverage reports
npm run test:coverage

# Build all documentation
npm run docs:build
```

## Version History

See [CHANGELOG.md](CHANGELOG.md) for project version history and release notes.

## License

This documentation is part of the Web Wallet Selector project and is licensed under the same terms as the project itself.
