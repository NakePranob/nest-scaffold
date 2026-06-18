#!/usr/bin/env node
import path from 'node:path';
import {
  assertIncludes,
  assertMatchCount,
  assertNotIncludes,
  cleanup,
  cliBin,
  createWorkDir,
  read,
  run,
  write,
} from './test-helpers/method-test-lib.mjs';

const workDir = createWorkDir();

try {
  const monoDir = path.join(workDir, 'mono-app');
  const autoDir = path.join(workDir, 'auto-app');

  run(`node "${cliBin}" create "${monoDir}" --defaults`, workDir);
  run(`node "${cliBin}" generate method users approve --type patch`, monoDir);
  run(`node "${cliBin}" generate method users createAdmin --type post`, monoDir);
  const initialMethodPromptOutput = run(
    `node "${cliBin}" generate method users --type get --get-mode one --field emailAlias`,
    monoDir,
    '\n',
  );
  run(`node "${cliBin}" generate method users findByEmail --type get --get-mode one --field email`, monoDir);
  const duplicateMethodOutput = run(
    `node "${cliBin}" generate method users findByEmail --type get --get-mode one --field email`,
    monoDir,
    '\u001b[B\n',
  );

  const monoControllerPath = path.join(monoDir, 'src/modules/users/users.controller.ts');
  const monoSwaggerPath = path.join(monoDir, 'src/modules/users/swagger/user-swagger.decorator.ts');
  const monoResponseDtoPath = path.join(monoDir, 'src/modules/users/swagger/user-response.dto.ts');
  const monoController = read(monoControllerPath);
  const monoSwagger = read(monoSwaggerPath);
  const monoResponseDto = read(monoResponseDtoPath);

  assertIncludes(initialMethodPromptOutput, 'Method name (e.g. findByEmail, findBySlug):', 'initial method prompt examples');
  assertIncludes(duplicateMethodOutput, 'Method "findByEmail" already exists.', 'duplicate method prompt');
  assertIncludes(monoController, '@ApiApproveDocs()', 'monolith patch swagger helper');
  assertIncludes(monoController, '@ApiCreateAdminDocs()', 'monolith post swagger helper');
  assertIncludes(monoController, '@ApiFindByEmailDocs()', 'monolith get-one swagger helper');
  assertIncludes(monoController, '@ApiFindByNameDocs()', 'monolith duplicate method swagger helper');
  assertIncludes(monoController, 'createAdmin(@Body() dto: CreateUserDto)', 'monolith post method');
  assertIncludes(monoController, "@Get('email/:email')", 'monolith get-one route');
  assertIncludes(monoController, 'findByEmail(@Param(\'email\') email: string)', 'monolith get-one method');
  assertIncludes(monoController, "@Get('name/:name')", 'monolith duplicate method route update');
  assertIncludes(monoController, 'findByName(@Param(\'name\') name: string)', 'monolith duplicate method rename');
  assertNotIncludes(monoController, '@ApiParam(', 'monolith controller has no direct ApiParam');
  assertNotIncludes(monoController, '@ApiBody(', 'monolith controller has no direct ApiBody');
  assertMatchCount(monoController, /from '\.\/swagger\/user-swagger\.decorator';/g, 1, 'single swagger import');
  assertNotIncludes(monoController, '@ApiSuccessResponse(UserResponseDto', 'monolith controller direct success decorator');
  assertNotIncludes(monoController, "@ApiNotFoundError('USER_NOT_FOUND', 'User not found')", 'monolith controller direct not found decorator');
  assertNotIncludes(monoController, "@ApiOperation({ summary: 'Get user by Email' })", 'monolith controller direct operation decorator');
  assertIncludes(monoSwagger, 'export function ApiApproveDocs()', 'monolith patch helper function');
  assertIncludes(monoSwagger, 'ApiSuccessResponse(UserResponseDto)', 'monolith patch helper body');
  assertIncludes(monoSwagger, 'export function ApiCreateAdminDocs()', 'monolith post helper function');
  assertIncludes(monoSwagger, 'USER_ERRORS.USER_EMAIL_ALREADY_IN_USE.code', 'monolith post helper uses example error catalog');
  assertIncludes(monoSwagger, 'export function ApiFindByEmailDocs()', 'monolith get-one helper function');
  assertIncludes(monoSwagger, 'export function ApiFindByNameDocs()', 'monolith duplicate get-one helper function');
  assertIncludes(monoSwagger, "ApiParam({ name: 'email' })", 'monolith get-one helper has ApiParam');
  assertIncludes(monoSwagger, "ApiParam({ name: 'id' })", 'monolith write helper has ApiParam');
  assertIncludes(monoSwagger, 'ApiBody({ type: CreateUserDto })', 'monolith post helper has ApiBody');
  assertIncludes(monoSwagger, 'ApiBody({ type: UpdateUserDto })', 'monolith write helper has ApiBody');
  assertIncludes(
    monoSwagger,
    [
      'export function ApiApproveDocs() {',
      '  return applyDecorators(',
      "    ApiOperation({ summary: 'Update user' }),",
      '    ApiBearerAuth(),',
      "    ApiParam({ name: 'id' }),",
      '    ApiBody({ type: UpdateUserDto }),',
      '    ApiSuccessResponse(UserResponseDto),',
    ].join('\n'),
    'monolith patch helper snapshot',
  );
  assertIncludes(monoResponseDto, "@ApiProperty({ example: 'user@example.com' })", 'response dto email example');
  assertIncludes(monoResponseDto, 'email: string;', 'response dto email field');
  assertIncludes(monoResponseDto, 'createdAt: Date;', 'response dto createdAt field');
  assertIncludes(monoResponseDto, 'updatedAt: Date;', 'response dto updatedAt field');

  write(
    monoResponseDtoPath,
    [
      "import { ApiProperty } from '@nestjs/swagger';",
      '',
      'export class UserResponseDto {',
      "  @ApiProperty({ example: '3f0f4d2d-2b99-4f0f-9f4f-2f54e3acb3a1' })",
      '  id: string;',
      '}',
      '',
    ].join('\n'),
  );
  run(`node "${cliBin}" generate method users updateStatus --type patch`, monoDir);
  const syncedMonoResponseDto = read(monoResponseDtoPath);
  assertIncludes(syncedMonoResponseDto, 'id: string;', 'synced response dto keeps id field');
  assertIncludes(syncedMonoResponseDto, 'email: string;', 'synced response dto adds missing entity field');
  assertIncludes(syncedMonoResponseDto, 'createdAt: Date;', 'synced response dto adds createdAt');
  assertIncludes(syncedMonoResponseDto, 'updatedAt: Date;', 'synced response dto adds updatedAt');

  run(`node "${cliBin}" create "${autoDir}" --defaults`, workDir);
  run(`node "${cliBin}" generate service audit-log`, autoDir);
  run(`node "${cliBin}" generate method audit-log publish --type patch`, autoDir);
  const generatedController = read(path.join(autoDir, 'src/modules/audit-log/audit-log.controller.ts'));
  assertIncludes(generatedController, 'publish(@Param(\'id\') id: string, @Body() dto: UpdateAuditLogDto)', 'missing controller auto-generated before method patch');

  run(`node "${cliBin}" generate controller audit-entry`, autoDir);
  run(`node "${cliBin}" generate method audit-entry archive --type delete`, autoDir);
  const generatedService = read(path.join(autoDir, 'src/modules/audit-entry/audit-entry.service.ts'));
  assertIncludes(generatedService, 'archive(id: string)', 'missing service auto-generated before method patch');

  console.log('\n✓ Monolith method generator tests passed\n');
} catch (error) {
  console.error('\n✗ Monolith method generator tests failed\n');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  cleanup(workDir);
}
