import '@testing-library/jest-native/extend-expect';

// Mock expo modules
jest.mock('expo-file-system', () => ({
  documentDirectory: 'file:///mock/document/',
  cacheDirectory: 'file:///mock/cache/',
  bundleDirectory: 'file:///mock/bundle/',
  readAsStringAsync: jest.fn(() => Promise.resolve('mock content')),
  writeAsStringAsync: jest.fn(() => Promise.resolve()),
  deleteAsync: jest.fn(() => Promise.resolve()),
  getInfoAsync: jest.fn(() => Promise.resolve({ exists: true, isDirectory: false, size: 0 })),
}));

jest.mock('expo-sharing', () => ({
  shareAsync: jest.fn(() => Promise.resolve()),
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('expo-sqlite', () => ({
  openDatabase: jest.fn(() => ({
    transaction: jest.fn((callback) => {
      const mockTx = {
        executeSql: jest.fn((sql, params, successCallback, errorCallback) => {
          if (successCallback) {
            successCallback(mockTx, { rows: { _array: [], length: 0 }, insertId: 1 });
          }
        }),
      };
      callback(mockTx);
    }),
  })),
}));

jest.mock('expo-asset', () => ({
  Asset: jest.fn().mockImplementation(() => ({
    downloadAsync: jest.fn(() => Promise.resolve()),
    localUri: 'mock-uri',
  })),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  mergeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
  multiMerge: jest.fn(),
}));