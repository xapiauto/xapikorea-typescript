# Releasing xapikorea

Releases are published to npm by `.github/workflows/release.yml` when a GitHub
Release is published. The workflow uses npm Trusted Publishing, so no npm token
is stored in GitHub.

## First release (one time)

npm only lets you add a Trusted Publisher to a package that already exists, so
the first version is published by hand:

```bash
npm login
npm run typecheck && npm test
npm publish --access public
```

Then on npmjs.com, open the `xapikorea` package, go to **Settings → Trusted
Publisher**, choose GitHub Actions and enter:

- Organization or user: `xapiauto`
- Repository: `xapikorea-typescript`
- Workflow filename: `release.yml`
- Environment: `npm`

Also create an environment named `npm` in the GitHub repository settings.

## Publish a release

1. Set the new version in both `package.json` and `src/version.ts`.
   A test fails if they differ.
2. Run the local checks:

   ```bash
   npm run typecheck
   npm test
   npm pack --dry-run
   ```

3. Commit and push the release changes.
4. Create a GitHub Release with a tag matching the version, such as `v0.1.1`.
   Publishing that GitHub Release publishes the package to npm with provenance.

npm does not allow a published version to be reused. Increase the version before
retrying a release that already reached the registry.
