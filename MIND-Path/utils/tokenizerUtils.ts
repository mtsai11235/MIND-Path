import { useTokenizer } from 'react-native-executorch';

const wpTokenizer = useTokenizer({
  tokenizer: {
    tokenizerSource: require('../assets/mobilebert/tokenizer.json')
  }
});

export async function encodeText(text: string) {
  const wpEncoded = await wpTokenizer.encode(text);
  const inputIds = wpEncoded.getIds()
  const attentionMask = wpEncoded.getAttentionMask();
  const tokens = wpEncoded.getTokens();
  return { inputIds, attentionMask, tokens };
}

export function decodePredictions(logits: Float32Array, tokens: string[]) {
  // Convert logits → label per token (argmax)
  const numLabels = logits.length / tokens.length;
  const labels = [];
  for (let i = 0; i < tokens.length; i++) {
    const start = i * numLabels;
    const slice = logits.slice(start, start + numLabels);
    const maxIdx = slice.indexOf(Math.max(...slice));
    labels.push(labelFromIndex(maxIdx));
  }
  return labels;
}

function labelFromIndex(idx: number): string {
  const idToLabel = [
    "B-ACCOUNT",
    "B-DATE",
    "B-DEVICE",
    "B-EMAIL",
    "B-FAX",
    "B-HEALTHPLAN",
    "B-ID",
    "B-IP",
    "B-LICENSE",
    "B-LOCATION",
    "B-MRN",
    "B-NAME",
    "B-PHONE",
    "B-SSN",
    "B-URL",
    "B-VEHICLE",
    "I-ACCOUNT",
    "I-DATE",
    "I-DEVICE",
    "I-EMAIL",
    "I-FAX",
    "I-HEALTHPLAN",
    "I-ID",
    "I-IP",
    "I-LICENSE",
    "I-LOCATION",
    "I-MRN",
    "I-NAME",
    "I-PHONE",
    "I-SSN",
    "I-URL",
    "I-VEHICLE",
    "O"
  ];
  return idToLabel[idx] || "O";
}
