import type Keyv from "keyv";

export interface KeyvRepository<T> {
  set: (key: string, value: T) => Promise<void>;
  get: (key: string) => Promise<T | undefined>;
  delete: (key: string) => Promise<void>;
  has: (key: string) => Promise<boolean>;
  clear: () => Promise<void>;
}

export const createKeyvRepository = <T>(store: Keyv): KeyvRepository<T> => {
  return {
    set: async (key: string, value: T) => {
      await store.set(key, value);
    },

    get: async (key: string) => {
      return await store.get(key);
    },

    delete: async (key: string) => {
      await store.delete(key);
    },

    has: async (key: string) => {
      const value = await store.get(key);
      return value !== undefined;
    },

    clear: async () => {
      await store.clear();
    },
  };
};
