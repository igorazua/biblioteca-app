// Solo para tests: AsyncStorage en memoria (el real necesita el módulo nativo). `vitest.config.ts` lo pone en su lugar.
const mem = new Map<string, string>()

const AsyncStorage = {
  getItem: async (key: string): Promise<string | null> => mem.get(key) ?? null,
  setItem: async (key: string, value: string): Promise<void> => {
    mem.set(key, value)
  },
  removeItem: async (key: string): Promise<void> => {
    mem.delete(key)
  },
  clear: async (): Promise<void> => {
    mem.clear()
  },
  getAllKeys: async (): Promise<string[]> => [...mem.keys()],
}

export default AsyncStorage
