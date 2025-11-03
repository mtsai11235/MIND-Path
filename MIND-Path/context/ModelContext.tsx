import React, { createContext, useState, useEffect, useContext } from 'react';
import { InferenceSession } from 'onnxruntime-react-native';
import { initModel } from '@/utils/modelUtils';

const ModelContext = createContext<{ session: InferenceSession | null }>({ session: null });

export const useModel = () => useContext(ModelContext);

export const ModelProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<InferenceSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeModel = async () => {
      try {
        const modelSession = await initModel();
        setSession(modelSession ?? null);
      } catch (error) {
        console.error('Failed to initialize model:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeModel();
  }, []);

  return (
    <ModelContext.Provider value={{ session }}>
      {children}
    </ModelContext.Provider>
  );
};