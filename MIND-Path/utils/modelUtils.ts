
import { InferenceSession, Tensor } from 'onnxruntime-react-native';
import { encodeText, decodePredictions } from '@/utils/tokenizerUtils';

let session: InferenceSession | null = null;

/**
 * Load the ONNX model into memory once on app startup.
 */
export async function initModel() {
  if (session) return; // already loaded

  // Path to model (bundled or downloaded)
  const modelPath = 'mobilebert_phi_finetuned.onnx';

  // Create inference session
  session = await InferenceSession.create(modelPath);
  console.log("Model session initialized");
}

/**
 * Run inference on input text and return redacted/sanitized version.
 */
export async function sanitizeText(text: string): Promise<string> {
  if (!session) throw new Error("Model not initialized");

  // Tokenize input text → convert to tensors
  const { inputIds, attentionMask, tokens } = await encodeText(text);

  const inputIdsTensor = new Tensor('int64', inputIds, [1, inputIds.length]);
  const attentionMaskTensor = new Tensor('int64', attentionMask, [1, attentionMask.length]);

  // Run model inference
  const output = await session.run({
    input_ids: inputIdsTensor,
    attention_mask: attentionMaskTensor,
  });

  // Interpret model outputs (e.g., predicted PHI tags)
  const logits = output.logits.data as Float32Array;
  const prediction = decodePredictions(logits, tokens);

  // Filter out special tokens ([CLS], [SEP], etc.) and replace PHI with [REDACTED]
  const redacted = tokens
    .map((t: string, i: number) => {
      const isSpecialToken = t.startsWith('[') && t.endsWith(']');
      const isPHI = prediction[i] !== 'O';
      // Skip special tokens, redact PHI, keep safe text
      return isSpecialToken ? '' : (isPHI ? '[REDACTED]' : t);
    })
    .filter((t: string) => t !== '') // Remove empty strings
    .join(' ');

  return redacted;
}