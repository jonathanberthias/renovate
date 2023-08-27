import type { PackageFile } from '../../types';
import { detectMonorepos } from './monorepo';

jest.mock('./pnpm');

describe('modules/manager/yarn/extract/monorepo', () => {
  describe('.extractPackageFile()', () => {
    it('handles no monorepo', () => {
      const packageFiles: Partial<PackageFile>[] = [
        {
          packageFile: 'package.json',
          deps: [],
        },
      ];
      detectMonorepos(packageFiles);
      expect(packageFiles).toHaveLength(1);
    });

    it('updates internal packages', () => {
      const packageFiles: Partial<PackageFile>[] = [
        {
          packageFile: 'package.json',
          managerData: {
            workspacesPackages: ['packages/*'],
          },
          deps: [
            {
              depName: '@org/a',
            },
            {
              depName: '@org/b',
            },
            {
              depName: '@org/c',
            },
          ],
        },
        {
          packageFile: 'packages/a/package.json',
          managerData: { packageJsonName: '@org/a' },
          deps: [
            {
              depName: '@org/b',
            },
            {
              depName: '@org/c',
            },
            {
              depName: 'bar',
            },
          ],
        },
        {
          packageFile: 'packages/b/package.json',
          managerData: { packageJsonName: '@org/b' },
        },
      ];
      detectMonorepos(packageFiles);
      expect(
        packageFiles.some((packageFile) =>
          packageFile.deps?.some((dep) => dep.isInternal)
        )
      ).toBeTrue();
    });

    it('uses yarn workspaces package settings', () => {
      const packageFiles: Partial<PackageFile>[] = [
        {
          packageFile: 'package.json',
          npmrc: '@org:registry=//registry.some.org\n',
          managerData: { workspacesPackages: 'packages/*' },
        },
        {
          packageFile: 'packages/a/package.json',
          managerData: { packageJsonName: '@org/a', yarnLock: 'yarn.lock' },
        },
        {
          packageFile: 'packages/b/package.json',
          managerData: { packageJsonName: '@org/b' },
        },
      ];
      detectMonorepos(packageFiles);
      expect(packageFiles).toMatchObject([
        {},
        { npmrc: '@org:registry=//registry.some.org\n' },
        {},
      ]);
    });

    it('uses yarn workspaces package settings with extractedConstraints', () => {
      const packageFiles: Partial<PackageFile>[] = [
        {
          packageFile: 'package.json',
          skipInstalls: true, // coverage
          extractedConstraints: {
            node: '^14.15.0 || >=16.13.0',
            yarn: '3.2.1',
          },
          managerData: {
            hasPackageManager: true,
            workspacesPackages: ['docs'],
          },
        },
        {
          packageFile: 'docs/package.json',
          managerData: { packageJsonName: 'docs', yarnLock: 'yarn.lock' },

          extractedConstraints: { yarn: '^3.2.0' },
        },
      ];
      detectMonorepos(packageFiles);
      expect(packageFiles).toMatchObject([
        {
          extractedConstraints: {
            node: '^14.15.0 || >=16.13.0',
            yarn: '3.2.1',
          },
          managerData: {
            hasPackageManager: true,
          },
        },
        {
          extractedConstraints: {
            node: '^14.15.0 || >=16.13.0',
            yarn: '^3.2.0',
          },
          managerData: {
            hasPackageManager: true,
          },
        },
      ]);
    });

    it('uses yarnZeroInstall and skipInstalls from yarn workspaces package settings', () => {
      const packageFiles: Partial<PackageFile>[] = [
        {
          packageFile: 'package.json',
          managerData: {
            workspacesPackages: 'packages/*',
            yarnZeroInstall: true,
          },
          skipInstalls: false,
          npmrc: '@org:registry=//registry.some.org\n',
        },
        {
          packageFile: 'packages/a/package.json',
          managerData: { packageJsonName: '@org/a', yarnLock: 'yarn.lock' },
        },
        {
          packageFile: 'packages/b/package.json',
          managerData: { packageJsonName: '@org/b' },
          skipInstalls: true,
        },
      ];
      detectMonorepos(packageFiles);
      expect(packageFiles).toMatchObject([
        {},
        { managerData: { yarnZeroInstall: true }, skipInstalls: false },
        { managerData: { yarnZeroInstall: true }, skipInstalls: false },
      ]);
    });
  });
});