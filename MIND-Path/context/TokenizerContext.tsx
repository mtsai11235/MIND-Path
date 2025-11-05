import React, { useEffect } from 'react';
import { useTokenizer } from 'react-native-executorch';
import { initTokenizer } from '@/utils/tokenizerUtils';

export function TokenizerProvider({ children }: { children: React.ReactNode }) {
  const wpTokenizer = useTokenizer({
    tokenizer: {
      tokenizerSource: require('../assets/mobilebert/tokenizer.json')
    }
  });

  useEffect(() => {
    initTokenizer(wpTokenizer);
  }, [wpTokenizer]);

  return <>{children}</>;
}