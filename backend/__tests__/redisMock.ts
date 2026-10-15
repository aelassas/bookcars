// __tests__/redisMock.ts
export const redis = {
  eval: async () => [1, 10],
  on: () => {},
  quit: async () => 'OK',
  disconnect: () => {},
}

export default redis
