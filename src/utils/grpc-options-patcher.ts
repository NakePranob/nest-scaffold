import path from 'node:path';
import fs from 'fs-extra';
import { Project, SyntaxKind } from 'ts-morph';
import pc from 'picocolors';
import { toProtoPackage } from './proto-package';

export function buildModuleProtoPathSegments(
  moduleVersioning: boolean,
  moduleVersion: string,
  feature: string,
  fileBase: string,
  options: { infraLayer?: boolean } = {},
): string[] {
  const segments = ['..', 'modules'];
  if (moduleVersioning) {
    segments.push(moduleVersion);
  }
  segments.push(feature);
  if (options.infraLayer) {
    segments.push('infrastructure');
  }
  segments.push('proto', `${fileBase}.proto`);
  return segments;
}

function formatJoinExpression(segments: string[]): string {
  const args = ['__dirname', ...segments.map((segment) => `'${segment}'`)];
  return `join(${args.join(', ')})`;
}

export async function registerGrpcProtoInOptions(
  projectRoot: string,
  options: {
    protoPackage: string;
    protoPathSegments: string[];
  },
): Promise<void> {
  const grpcOptionsPath = path.join(projectRoot, 'src', 'grpc', 'grpc.options.ts');
  if (!(await fs.pathExists(grpcOptionsPath))) {
    return;
  }

  const project = new Project({
    tsConfigFilePath: path.join(projectRoot, 'tsconfig.json'),
    skipAddingFilesFromTsConfig: true,
  });

  const sourceFile = project.addSourceFileAtPath(grpcOptionsPath);
  const packagesVar = sourceFile.getVariableDeclaration('grpcPackages');
  const pathsVar = sourceFile.getVariableDeclaration('grpcProtoPaths');

  if (!packagesVar || !pathsVar) {
    throw new Error('grpcPackages or grpcProtoPaths not found in grpc.options.ts');
  }

  const packagesArray = packagesVar.getInitializerIfKindOrThrow(
    SyntaxKind.ArrayLiteralExpression,
  );
  const pathsArray = pathsVar.getInitializerIfKindOrThrow(
    SyntaxKind.ArrayLiteralExpression,
  );

  const hasPackage = packagesArray.getElements().some(
    (element) => element.getText().replace(/['"]/g, '') === options.protoPackage,
  );

  if (!hasPackage) {
    packagesArray.addElement(`'${options.protoPackage}'`);
  }

  const protoFileName = options.protoPathSegments.at(-1)!;
  const hasPath = pathsArray
    .getElements()
    .some((element) => element.getText().includes(protoFileName));

  if (!hasPath) {
    pathsArray.addElement(formatJoinExpression(options.protoPathSegments));
  }

  await sourceFile.save();
  console.log(
    pc.green(`✓ Registered gRPC proto package "${options.protoPackage}" in grpc.options.ts`),
  );
}

export async function registerModuleGrpcProto(
  projectRoot: string,
  config: { moduleVersioning: boolean },
  moduleVersion: string,
  naming: { name: string; fileBase: string },
  options: { infraLayer?: boolean } = {},
): Promise<void> {
  await registerGrpcProtoInOptions(projectRoot, {
    protoPackage: toProtoPackage(naming.name),
    protoPathSegments: buildModuleProtoPathSegments(
      config.moduleVersioning,
      moduleVersion,
      naming.name,
      naming.fileBase,
      options,
    ),
  });
}
