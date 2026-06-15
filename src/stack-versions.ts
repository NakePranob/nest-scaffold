import manifest from '../stack-packages.json';

type StackPackage = {
  key: string;
  name: string;
  version: string;
};

const { nestMajor, packages } = manifest as {
  nestMajor: number;
  packages: StackPackage[];
};

export const STACK_VERSIONS = {
  nestMajor,
  ...Object.fromEntries(packages.map((pkg) => [pkg.key, pkg.version])),
} as const;

export const STACK_LABEL = `NestJS ${STACK_VERSIONS.nestMajor}.x`;
