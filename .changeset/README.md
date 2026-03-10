# Changesets

This repository uses Changesets for lockstep versioning and npm publishing.

## Add a changeset

Run:

pnpm changeset

Commit the generated file in .changeset/ with your pull request.

## Release flow

1. Merge changes with changesets into main.
2. Release workflow opens or updates a Version Packages pull request.
3. Merge that pull request to main.
4. Release workflow publishes packages to npm and pushes release tags.

## Required secret

Set NPM_TOKEN in GitHub repository secrets with publish access to the @archkit scope.
