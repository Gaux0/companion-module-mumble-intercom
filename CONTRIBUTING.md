# Contributing to companion-module-mumble-intercom

Thanks for your interest in contributing! This module was born from a real broadcast production need, and we welcome improvements from the community.

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Install dependencies:

```bash
npm install
```

4. Build:

```bash
npx tsc -p tsconfig.json
```

5. Set up Companion with Developer Modules pointing to the parent folder of your clone
6. Make changes — Companion will auto-reload on file changes

## Development Tips

- The module runs inside Companion's Node.js 18 runtime
- Use `this.log('info', 'message')` for logging visible in Companion's Log tab
- Use `this.log('debug', 'message')` for verbose logging (only visible with debug enabled)
- Test with a real Murmur server — there's no mock available yet

## What We'd Love Help With

- **Multi-channel support** — Monitor users across different Mumble channels
- **Audio routing** — Integration with audio mixing software
- **Testing** — More real-world testing with different Murmur versions
- **Documentation** — Translations, video tutorials, setup guides
- **UI improvements** — Better preset layouts, custom icons

## Code Style

- TypeScript strict mode
- Tabs for indentation
- Single quotes for strings
- No semicolons (handled by TypeScript)

## Pull Request Process

1. Create a feature branch from `main`
2. Keep changes focused — one feature per PR
3. Update CHANGELOG.md
4. Test with Companion v4.x
5. Submit PR with a clear description

## Reporting Issues

When reporting bugs, please include:

- Companion version
- Operating system
- Murmur server version
- Relevant log output from Companion's Log tab

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
