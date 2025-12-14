// Jest setup file
// Mock global variables that might be needed
(global as any)._gaq = [];

// Mock localStorage if needed
if (typeof localStorage === 'undefined') {
  const localStorageMock = (() => {
    let store: { [key: string]: string } = {};
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value.toString();
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    };
  })();
  Object.defineProperty(global, 'localStorage', {
    value: localStorageMock
  });
}
