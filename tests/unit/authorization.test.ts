import test from 'node:test'
import assert from 'node:assert/strict'
import { hasMinimumRole, assertMinimumRole, assertOwnerOrAdmin, AuthorizationError } from '../../lib/authorization.ts'
import { canSetProjectVisibility, isActiveProjectActor, projectAccessWhere } from '../../lib/project-access.ts'

test('role hierarchy grants only the requested minimum role', () => {
  assert.equal(hasMinimumRole('USER', 'USER'), true)
  assert.equal(hasMinimumRole('USER', 'CREATOR'), false)
  assert.equal(hasMinimumRole('CREATOR', 'USER'), true)
  assert.equal(hasMinimumRole('CREATOR', 'CREATOR'), true)
  assert.equal(hasMinimumRole('CREATOR', 'ADMIN'), false)
  assert.equal(hasMinimumRole('ADMIN', 'ADMIN'), true)
  assert.equal(hasMinimumRole(undefined, 'USER'), false)
  assert.equal(hasMinimumRole('ROOT', 'USER'), false)
})

test('assertMinimumRole rejects anonymous and insufficient roles', () => {
  assert.throws(() => assertMinimumRole(null, 'USER'), AuthorizationError)
  assert.throws(() => assertMinimumRole('USER', 'ADMIN'), AuthorizationError)
  assert.doesNotThrow(() => assertMinimumRole('ADMIN', 'CREATOR'))
})

test('resource ownership allows owner and admin only', () => {
  assert.doesNotThrow(() => assertOwnerOrAdmin({ actorId: 'alice', ownerId: 'alice', role: 'USER' }))
  assert.doesNotThrow(() => assertOwnerOrAdmin({ actorId: 'staff', ownerId: 'alice', role: 'ADMIN' }))
  assert.throws(() => assertOwnerOrAdmin({ actorId: 'bob', ownerId: 'alice', role: 'CREATOR' }), AuthorizationError)
})

test('all non-admin project queries are constrained to the actor ownerId', () => {
  assert.deepEqual(projectAccessWhere({ id: 'u1', role: 'USER', status: 'ACTIVE' }), { ownerId: 'u1' })
  assert.deepEqual(projectAccessWhere({ id: 'c1', role: 'CREATOR', status: 'ACTIVE' }, 'p1'), { id: 'p1', ownerId: 'c1' })
  assert.deepEqual(projectAccessWhere({ id: 'a1', role: 'ADMIN', status: 'ACTIVE' }, 'p1'), { id: 'p1' })
  assert.deepEqual(projectAccessWhere({ id: 'a1', role: 'ADMIN', status: 'ACTIVE' }), {})
})

test('suspended and deleted accounts cannot act as project actors', () => {
  assert.equal(isActiveProjectActor({ id: 'u', role: 'USER', status: 'ACTIVE' }), true)
  assert.equal(isActiveProjectActor({ id: 'u', role: 'USER', status: 'SUSPENDED' }), false)
  assert.equal(isActiveProjectActor({ id: 'u', role: 'ADMIN', status: 'DELETED' }), false)
  assert.equal(isActiveProjectActor(null), false)
})

test('only approved creators and admins may publish public projects', () => {
  assert.equal(canSetProjectVisibility('USER', 'PRIVATE'), true)
  assert.equal(canSetProjectVisibility('USER', 'PUBLIC'), false)
  assert.equal(canSetProjectVisibility('CREATOR', 'PUBLIC'), true)
  assert.equal(canSetProjectVisibility('ADMIN', 'PUBLIC'), true)
})
