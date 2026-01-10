import { describe, it, expect, beforeEach } from 'vitest';
import Keyv from 'keyv';
import { createKeyvRepository, type KeyvRepository } from './keyv.repository.ts';

describe('KeyvRepository', () => {
  let store: Keyv;
  let repo: KeyvRepository<string>;

  beforeEach(() => {
    store = new Keyv();
    repo = createKeyvRepository<string>(store);
  });

  describe('set and get', () => {
    it('should set and get a value', async () => {
      await repo.set('key1', 'value1');
      const result = await repo.get('key1');
      expect(result).toBe('value1');
    });

    it('should return undefined for non-existent key', async () => {
      const result = await repo.get('nonexistent');
      expect(result).toBeUndefined();
    });

    it('should overwrite existing value', async () => {
      await repo.set('key1', 'value1');
      await repo.set('key1', 'value2');
      const result = await repo.get('key1');
      expect(result).toBe('value2');
    });
  });

  describe('has', () => {
    it('should return true for existing key', async () => {
      await repo.set('key1', 'value1');
      const exists = await repo.has('key1');
      expect(exists).toBe(true);
    });

    it('should return false for non-existent key', async () => {
      const exists = await repo.has('nonexistent');
      expect(exists).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete existing key', async () => {
      await repo.set('key1', 'value1');
      await repo.delete('key1');
      const result = await repo.get('key1');
      expect(result).toBeUndefined();
    });

    it('should not throw when deleting non-existent key', async () => {
      await expect(repo.delete('nonexistent')).resolves.not.toThrow();
    });
  });

  describe('clear', () => {
    it('should clear all keys', async () => {
      await repo.set('key1', 'value1');
      await repo.set('key2', 'value2');
      await repo.set('key3', 'value3');

      await repo.clear();

      const result1 = await repo.get('key1');
      const result2 = await repo.get('key2');
      const result3 = await repo.get('key3');

      expect(result1).toBeUndefined();
      expect(result2).toBeUndefined();
      expect(result3).toBeUndefined();
    });
  });

  describe('generic types', () => {
    it('should work with boolean type', async () => {
      const boolRepo = createKeyvRepository<boolean>(store);
      await boolRepo.set('flag', true);
      const result = await boolRepo.get('flag');
      expect(result).toBe(true);
    });

    it('should work with object type', async () => {
      interface User {
        id: number;
        name: string;
      }
      const userRepo = createKeyvRepository<User>(store);
      const user = { id: 1, name: 'John' };

      await userRepo.set('user1', user);
      const result = await userRepo.get('user1');

      expect(result).toEqual(user);
    });

    it('should work with number type', async () => {
      const numberRepo = createKeyvRepository<number>(store);
      await numberRepo.set('count', 42);
      const result = await numberRepo.get('count');
      expect(result).toBe(42);
    });
  });
});
