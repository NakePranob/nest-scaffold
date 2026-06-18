#!/usr/bin/env node
import path from 'node:path';
import {
  assertIncludes,
  assertMatchCount,
  cleanup,
  cliBin,
  createWorkDir,
  read,
  run,
  write,
} from './test-helpers/method-test-lib.mjs';

const workDir = createWorkDir();

try {
  const msDir = path.join(workDir, 'ms-app');
  const msUserEntityPath = path.join(msDir, 'src/modules/user/domain/entities/user.entity.ts');

  run(`node "${cliBin}" create "${msDir}" --defaults --architecture microservice`, workDir);
  run(`node "${cliBin}" generate module user --full`, msDir);
  write(
    msUserEntityPath,
    [
      'import {',
      '  Entity,',
      '  PrimaryGeneratedColumn,',
      '  Column,',
      '  CreateDateColumn,',
      '  UpdateDateColumn,',
      "} from 'typeorm';",
      '',
      "@Entity('users')",
      'export class User {',
      "  @PrimaryGeneratedColumn('uuid')",
      '  id: string;',
      '',
      '  @Column({ unique: true })',
      '  email: string;',
      '',
      '  @Column()',
      '  password: string;',
      '',
      '  @Column({ nullable: true })',
      '  name: string;',
      '',
      '  @Column({ default: true })',
      '  isActive: boolean;',
      '',
      '  @Column({ nullable: true })',
      '  role: string;',
      '',
      '  @CreateDateColumn()',
      '  createdAt: Date;',
      '',
      '  @UpdateDateColumn()',
      '  updatedAt: Date;',
      '}',
      '',
    ].join('\n'),
  );

  run(`node "${cliBin}" generate method user createOperator --type post`, msDir);
  run(`node "${cliBin}" generate method user updatePreferences --type patch`, msDir);
  run(`node "${cliBin}" generate method user getUserByEmail --type get --get-mode one --field email`, msDir);
  run(`node "${cliBin}" generate module owner --full`, msDir);
  run(`node "${cliBin}" generate method owner approve --type patch`, msDir);
  const duplicateRpcOutput = run(
    `node "${cliBin}" generate method owner approve --type patch`,
    msDir,
    '\u001b[B\n',
  );

  const ownerController = read(path.join(msDir, 'src/modules/owner/infrastructure/owner.controller.grpc.ts'));
  const ownerProto = read(path.join(msDir, 'src/modules/owner/infrastructure/proto/owner.proto'));
  const userController = read(path.join(msDir, 'src/modules/user/infrastructure/user.controller.grpc.ts'));
  const userProto = read(path.join(msDir, 'src/modules/user/infrastructure/proto/user.proto'));
  const createOperatorDto = read(path.join(msDir, 'src/modules/user/dto/create-operator-request.dto.ts'));
  const updatePreferencesDto = read(path.join(msDir, 'src/modules/user/dto/update-preferences-request.dto.ts'));
  const getUserByEmailDto = read(path.join(msDir, 'src/modules/user/dto/get-user-by-email-request.dto.ts'));

  assertIncludes(duplicateRpcOutput, 'would create duplicate RPC "Approve"', 'duplicate rpc prompt');
  assertIncludes(ownerController, "@GrpcMethod('OwnerService', 'Approve')", 'microservice grpc method name');
  assertIncludes(ownerController, 'approve(@Payload() request: ApproveRequestDto)', 'microservice request dto');
  assertIncludes(ownerController, "@GrpcMethod('OwnerService', 'UpdateOwnerStatus')", 'microservice duplicate rpc rename');
  assertIncludes(ownerController, 'updateOwnerStatus(@Payload() request: UpdateOwnerStatusRequestDto)', 'microservice duplicate rpc method');
  assertIncludes(ownerProto, 'rpc Approve (ApproveRequest) returns (OwnerResponse);', 'microservice proto rpc');
  assertIncludes(ownerProto, 'message ApproveRequest {', 'microservice proto request');
  assertIncludes(ownerProto, 'rpc UpdateOwnerStatus (UpdateOwnerStatusRequest) returns (OwnerResponse);', 'microservice renamed proto rpc');
  assertIncludes(ownerProto, 'message UpdateOwnerStatusRequest {', 'microservice renamed proto request');

  assertIncludes(createOperatorDto, 'email!: string;', 'microservice post dto email field');
  assertIncludes(createOperatorDto, 'password!: string;', 'microservice post dto password field');
  assertIncludes(createOperatorDto, 'isActive!: boolean;', 'microservice post dto boolean field');
  assertIncludes(updatePreferencesDto, 'id!: string;', 'microservice patch dto id field');
  assertIncludes(updatePreferencesDto, 'email!: string;', 'microservice patch dto email field');
  assertIncludes(updatePreferencesDto, 'password!: string;', 'microservice patch dto password field');
  assertIncludes(updatePreferencesDto, 'isActive!: boolean;', 'microservice patch dto boolean field');
  assertIncludes(getUserByEmailDto, 'email!: string;', 'microservice get-one dto lookup field');

  assertIncludes(userProto, 'rpc CreateOperator (CreateOperatorRequest) returns (UserResponse);', 'microservice post proto rpc');
  assertIncludes(userProto, 'string email = 1;', 'microservice post proto email field');
  assertIncludes(userProto, 'string password = 2;', 'microservice post proto password field');
  assertIncludes(userProto, 'string name = 3;', 'microservice post proto name field');
  assertIncludes(userProto, 'bool isActive = 4;', 'microservice post proto boolean field');
  assertIncludes(userProto, 'string role = 5;', 'microservice post proto role field');
  assertIncludes(userProto, 'rpc UpdatePreferences (UpdatePreferencesRequest) returns (UserResponse);', 'microservice patch proto rpc');
  assertIncludes(userProto, 'message UpdatePreferencesRequest {', 'microservice patch proto message');
  assertIncludes(userProto, 'string id = 1;', 'microservice patch proto id field');
  assertIncludes(userProto, 'rpc GetUserByEmail (GetUserByEmailRequest) returns (UserResponse);', 'microservice get-one proto rpc');
  assertIncludes(userProto, 'message GetUserByEmailRequest {', 'microservice get-one proto message');
  assertMatchCount(userController, /from '@nestjs\/microservices';/g, 1, 'single microservice import declaration');

  console.log('\n✓ Microservice method generator tests passed\n');
} catch (error) {
  console.error('\n✗ Microservice method generator tests failed\n');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  cleanup(workDir);
}
