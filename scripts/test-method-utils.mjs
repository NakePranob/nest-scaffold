#!/usr/bin/env node
import { createRequire } from 'node:module';
import path from 'node:path';
import {
  assertIncludes,
  cliRoot,
} from './test-helpers/method-test-lib.mjs';

const require = createRequire(import.meta.url);
const {
  buildMethodNameExamples,
  buildDefaultMethodName,
  buildLookupFieldExamples,
} = require(path.join(cliRoot, 'dist/src/utils/method-prompting.js'));
const {
  buildMicroserviceRequestFields,
  buildMicroserviceRpcName,
} = require(path.join(cliRoot, 'dist/src/utils/method-microservice.js'));
const {
  getLookupCandidateFields,
} = require(path.join(cliRoot, 'dist/src/utils/method-shared.js'));

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`Unexpected value for ${label}: expected ${expected}, received ${actual}`);
  }
}

function assertDeepEqual(actual, expected, label) {
  const left = JSON.stringify(actual);
  const right = JSON.stringify(expected);
  if (left !== right) {
    throw new Error(`Unexpected value for ${label}:\nexpected ${right}\nreceived ${left}`);
  }
}

try {
  const lookupFields = getLookupCandidateFields([
    { name: 'id', type: 'string' },
    { name: 'email', type: 'string' },
    { name: 'password', type: 'string' },
    { name: 'updatedAt', type: 'string' },
  ]);
  assertDeepEqual(
    lookupFields,
    [
      { name: 'id', type: 'string' },
      { name: 'email', type: 'string' },
    ],
    'lookup-safe fields',
  );

  assertEqual(
    buildDefaultMethodName('get', { entityFile: 'user', pascalName: 'Users' }, 'monolith', 'User', 'one', 'email'),
    'findByEmail',
    'monolith default get-one name',
  );
  assertEqual(
    buildDefaultMethodName('patch', { entityFile: 'user', pascalName: 'Users' }, 'microservice', 'User'),
    'updateUser',
    'microservice default patch name',
  );
  assertEqual(
    buildMicroserviceRpcName('get', { entityFile: 'user', pascalName: 'Users' }, 'User', 'one', 'email'),
    'GetUserByEmail',
    'microservice rpc name',
  );

  const methodExamples = buildMethodNameExamples('get', 'microservice', 'User', 'Users', 'all');
  assertIncludes(methodExamples.join(','), 'getUsersByRole', 'microservice get-all examples');

  const lookupExamples = buildLookupFieldExamples('monolith', [
    { name: 'id', type: 'string' },
    { name: 'email', type: 'string' },
    { name: 'slug', type: 'string' },
    { name: 'password', type: 'string' },
  ]);
  assertDeepEqual(lookupExamples, ['email', 'slug'], 'lookup examples');

  const requestFields = buildMicroserviceRequestFields(
    { methodType: 'patch', methodName: 'updateUser' },
    [
      { name: 'id', type: 'string' },
      { name: 'email', type: 'string' },
      { name: 'password', type: 'string' },
      { name: 'createdAt', type: 'string' },
      { name: 'isActive', type: 'boolean' },
    ],
    undefined,
  );
  assertDeepEqual(
    requestFields,
    [
      { name: 'id', type: 'string' },
      { name: 'email', type: 'string' },
      { name: 'password', type: 'string' },
      { name: 'isActive', type: 'boolean' },
    ],
    'microservice request field derivation',
  );

  console.log('\n✓ Method utility tests passed\n');
} catch (error) {
  console.error('\n✗ Method utility tests failed\n');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
