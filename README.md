# ACME Monorepo

This is a monorepo setup using [pnpm workspaces](https://pnpm.io/workspaces) for managing multiple packages under the `@acme/*` namespace.

## Structure

```
├── packages/
│   ├── web/          # @acme/web - Next.js application
│   ├── admin/        # @acme/admin - Admin dashboard
│   └── shared/       # @acme/shared - Shared auth, database, and utilities
├── pnpm-workspace.yaml
├── package.json      # @acme/root - Root package.json with workspace scripts
└── README.md
```

## Getting Started

1. **Install pnpm** (if you haven't already):

   ```bash
   npm install -g pnpm
   ```

2. **Install dependencies**:

   ```bash
   pnpm install
   ```

3. **Start development**:

   ```bash
   # Start all packages in development mode
   pnpm dev

   # Or start just the web app
   pnpm web:dev
   ```

## Available Scripts

### Root Level Scripts

- `pnpm dev` - Start all packages in development mode
- `pnpm build` - Build all packages
- `pnpm lint` - Lint all packages
- `pnpm lint:fix` - Fix linting issues in all packages
- `pnpm typecheck` - Run TypeScript checks on all packages
- `pnpm format:check` - Check code formatting
- `pnpm format:write` - Format code
- `pnpm clean` - Clean all packages and root node_modules

### Package Specific Scripts

#### Web App (@acme/web)

- `pnpm web:dev` - Start the web app in development mode (port 3000)
- `pnpm web:build` - Build the web app
- `pnpm web:start` - Start the web app in production mode
- `pnpm web:db:generate` - Generate database schema
- `pnpm web:db:migrate` - Run database migrations
- `pnpm web:db:push` - Push database changes
- `pnpm web:db:studio` - Open database studio

#### Admin Dashboard (@acme/admin)

- `pnpm admin:dev` - Start the admin dashboard in development mode (port 3002)
- `pnpm admin:build` - Build the admin dashboard
- `pnpm admin:start` - Start the admin dashboard in production mode
- `pnpm admin:typecheck` - Run TypeScript checks on admin package

## Adding New Packages

To add a new package to the workspace:

1. Create a new directory under `packages/`
2. Add a `package.json` file with a unique name under the `@acme/*` namespace
3. The package will automatically be included in the workspace

Example package.json for a new package:

```json
{
  "name": "@acme/shared-ui",
  "version": "0.1.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts"
}
```

## Workspace Protocol

This monorepo uses pnpm's [workspace protocol](https://pnpm.io/workspaces#workspace-protocol-workspace) for internal dependencies. When referencing packages within the workspace, use:

```json
{
  "dependencies": {
    "@acme/shared-ui": "workspace:*",
    "@acme/shared-utils": "workspace:^"
  }
}
```

## Benefits of This Setup

- **Namespace Organization**: All packages are organized under the `@acme/*` namespace
- **Shared Dependencies**: Common dependencies are hoisted to the root
- **Efficient Scripts**: Run commands across all packages or target specific ones
- **Type Safety**: Shared TypeScript configuration ensures consistency
- **Fast Installs**: pnpm's efficient dependency management
- **Workspace Protocol**: Ensures internal packages always use local versions
- **Easy Package References**: Use `@acme/package-name` to reference internal packages
