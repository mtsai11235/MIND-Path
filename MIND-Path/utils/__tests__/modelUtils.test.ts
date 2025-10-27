import { encodeText, decodePredictions } from '../tokenizerUtils';
import { InferenceSession, Tensor } from 'onnxruntime-react-native';

// Mock dependencies BEFORE importing modelUtils
jest.mock('../tokenizerUtils');
jest.mock('onnxruntime-react-native');

const mockSession = {
  run: jest.fn(),
};

// Mock Tensor constructor
beforeEach(() => {
  jest.clearAllMocks();

  // Mock InferenceSession.create to return our mock session
  (InferenceSession.create as jest.Mock).mockResolvedValue(mockSession);
  
  // Mock Tensor constructor
  (Tensor as any) = function TensorConstructor(type: string, data: any, shape: any[]) {
    return { type, data, shape };
  };
});

// Import after mocks are set up
const modelUtils = require('../modelUtils');

describe('modelUtils', () => {
  beforeEach(async () => {
    // Initialize the model - this will set the session
    await modelUtils.initModel();
  });

  describe('sanitizeText', () => {
    it('should sanitize text and redact PHI entities', async () => {
      const text = 'Patient John Doe was admitted';
      
      // Mock encodeText with the correct number of tokens for this text
      (encodeText as jest.Mock).mockResolvedValueOnce({
        inputIds: [101, 2023, 2003, 2024, 2008, 3244],
        attentionMask: [1, 1, 1, 1, 1, 1],
        tokens: ['[CLS]', 'Patient', 'John', 'Doe', 'was', 'admitted'],
      });

      // Mock the model output
      const mockLogits = new Float32Array(198); // 6 tokens * 33 labels
      mockLogits[32] = 0.9;   // [CLS]: O
      mockLogits[65] = 0.9;   // Patient: O
      mockLogits[77] = 0.9;   // John: B-NAME
      mockLogits[127] = 0.9;  // Doe: I-NAME
      mockLogits[164] = 0.9;  // was: O
      mockLogits[197] = 0.9; // admitted: O

      mockSession.run.mockResolvedValueOnce({
        logits: { data: mockLogits },
      });

      (decodePredictions as jest.Mock).mockReturnValueOnce(['O', 'O', 'B-NAME', 'I-NAME', 'O', 'O']);

      const result = await modelUtils.sanitizeText(text);

      expect(encodeText).toHaveBeenCalledWith(text);
      expect(mockSession.run).toHaveBeenCalled();
      expect(result).toEqual('Patient [REDACTED] [REDACTED] was admitted');
    });

    it('should preserve non-PHI tokens', async () => {
      (encodeText as jest.Mock).mockResolvedValueOnce({
        inputIds: [101, 2023, 2003],
        attentionMask: [1, 1, 1],
        tokens: ['[CLS]', 'Hello', 'World'],
      });

      const allOLogits = new Float32Array(99);
      allOLogits[32] = 1.0;
      allOLogits[65] = 1.0;
      allOLogits[98] = 1.0;
      
      mockSession.run.mockResolvedValueOnce({
        logits: { data: allOLogits },
      });

      (decodePredictions as jest.Mock).mockReturnValueOnce(['O', 'O', 'O']);

      const result = await modelUtils.sanitizeText('Hello World');

      expect(result).not.toContain('[REDACTED]');
      expect(result).toBe('Hello World');
    });

    it('should create correct tensor inputs', async () => {
      // Set up mocks for this test
      (encodeText as jest.Mock).mockResolvedValueOnce({
        inputIds: [101, 2023],
        attentionMask: [1, 1],
        tokens: ['[CLS]', 'Test'],
      });

      mockSession.run.mockResolvedValueOnce({
        logits: { data: new Float32Array(66) }, // 2 tokens * 33
      });

      (decodePredictions as jest.Mock).mockReturnValueOnce(['O', 'O']);

      const result = await modelUtils.sanitizeText('Test');
      
      // Verify that session.run was called with tensor-like objects
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.objectContaining({
          input_ids: expect.anything(),
          attention_mask: expect.anything(),
        })
      );
      
      // Verify that encodeText was called first
      expect(encodeText).toHaveBeenCalled();
    });

    it('should handle error during encoding', async () => {
      (encodeText as jest.Mock).mockRejectedValueOnce(
        new Error('Encoding failed')
      );

      await expect(modelUtils.sanitizeText('test')).rejects.toThrow('Encoding failed');
    });

    it('should handle error during inference', async () => {
      // Set up mocks
      (encodeText as jest.Mock).mockResolvedValueOnce({
        inputIds: [101, 2023],
        attentionMask: [1, 1],
        tokens: ['[CLS]', 'test'],
      });

      mockSession.run.mockRejectedValueOnce(new Error('Inference failed'));

      await expect(modelUtils.sanitizeText('Test')).rejects.toThrow('Inference failed');
    });
  });
});
