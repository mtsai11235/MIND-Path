// Mock native modules before any imports
jest.mock('react-native-executorch', () => ({
  useTokenizer: jest.fn(),
}));

jest.mock('onnxruntime-react-native', () => ({
  InferenceSession: {
    create: jest.fn(),
  },
  Tensor: jest.fn(),
}));

// Mock the tokenizer.json require
jest.mock('../assets/mobilebert/tokenizer.json', () => ({}), { virtual: true });

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
