import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { fetch as expoFetch } from 'expo/fetch';
import { useState, useEffect, useMemo } from 'react';
import { View, TextInput, ScrollView, Text, KeyboardAvoidingView, Platform, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { generateAPIUrl } from '@/utils/utils';
import AssessmentModal, { AssessmentContent } from '../components/AssessmentModal';
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'expo-router'


/** ---------- Theme colors ---------- */
const GREEN_LIGHT  = "#DDEFE6";
const GREEN_BORDER = "rgba(6,95,70,0.14)";
const PLACEHOLDER  = "#3a6a54";


/** ---------- Chat screen ---------- */
export default function ChatScreen() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [activeAssessment, setActiveAssessment] = useState<AssessmentContent | null>(null);
  const [isAssessmentLoading, setAssessmentLoading] = useState(false);
  const [recommendedAssessmentTitle, setRecommendedAssessmentTitle] = useState<string | null>(null);
  const [recommendedConcern, setRecommendedConcern] = useState<string | null>(null);
  const [showRecommendation, setShowRecommendation] = useState(false);
  
  // add delay in setShowRecommendation
  useEffect(() => {
    if (!recommendedConcern) {
      setShowRecommendation(false);
      return;
    }

    const timer = setTimeout(() => {
      setShowRecommendation(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, [recommendedConcern]);

  const { messages, error, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      fetch: expoFetch as unknown as typeof globalThis.fetch,
      api: generateAPIUrl('api/chat'),
    }),
   
    messages: [
      {
        id: "welcome-1",
        role: "assistant",
        parts: [{ type: "text", text: "Hello, I am MIND-Path. I am here to help you find mental health resources that fit your needs." }],
      }, 
      {
        id: "welcome-2",
        role: "assistant",
        parts: [{ type: "text", text: "I will guide you through a few short questions to find the right type of support. Everything you tell me is confidential." }],
      },
      {
        id: "welcome-3",
        role: "assistant",
        parts: [{ type: "text", text: "To start, would you like to share what you've been experiencing lately?" }],

      }
    ],
    onError: error => console.error(error, 'ERROR'),
  });

  useEffect(() => {
  if (!messages || messages.length === 0) return;

  // Find the latest assistant message
  const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
  if (!lastAssistant) return;

  // Combine all text parts
  const fullText = lastAssistant.parts
    .filter(p => p.type === 'text')
    .map(p => p.text)
    .join('\n');

  // Look for [[ASSESSMENT_TITLE]]
  const match = fullText.match(/\[\[ASSESSMENT_TITLE:([^\]]+)\]\]/);

  if (match) {
    const title = match[1];
    setRecommendedAssessmentTitle(title);
    console.log('Detected assessment title from LLM:', title);
  }
}, [messages]);


  if (error) return <Text>{error.message}</Text>;
  
  // status 'streaming' is when tokens are arriving. 
  // 'submitted' is waiting for response. 
  const isLoading = (status === "submitted" || status === "streaming");

  const handleStartAssessment = async () => {
    if (!recommendedAssessmentTitle) {
    console.error('No assessment has been recommended yet.');
    return;
  }
  try {
    setAssessmentLoading(true);

    const { data, error } = await supabase
      .from('resources')
      .select('title, content')
      .eq('title', recommendedAssessmentTitle)
      .limit(1)       
      .single();

    if (error) {
      console.error('Error fetching assessment:', error);
      return;
    }

      const content = data.content as AssessmentContent;
      if (data.title && !content.title) {
        content.title = data.title;
      }

      setActiveAssessment(content);
    } finally {
      setAssessmentLoading(false);
    }
  };


  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView style={styles.chatWrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12 }}>
          {messages.map(m => {
            const isUser = m.role === 'user';
            
            return (
              <View key={m.id} style={[styles.msgRow, { alignItems: isUser ? 'flex-end' : 'flex-start' }]}>
                <View style={isUser ? styles.bubbleUser : styles.bubbleAssistant}>
                  {m.parts.map((part, i) => {
                    if (part.type === 'text') {
                      return <Text key={`${m.id}-${i}`} style={styles.msgText}>{part.text}</Text>;
                    }               
                    return null;
                  })}
                </View>
              </View>
            );
          })}
            
          {isLoading && status !== 'streaming' && (
            <View key="assistant-typing" style={[styles.msgRow, {alignItems: 'flex-start'}]}>
              <View style={styles.bubbleAssistant}>
                <View style={styles.typingRow}>
                  <ActivityIndicator size="small"/>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
  
        {/* ASSESSMENT MODAL */}
        {activeAssessment && (
          <AssessmentModal
            visible={true}
            title={activeAssessment.title}
            data={activeAssessment}
            onComplete={(score, severity) => {
              const title = activeAssessment.title ?? "";
              setActiveAssessment(null);
              // Send summary back into chat so AI can use it
              sendMessage({
                text: `I just completed the assessment "${activeAssessment.title}". My total score is ${score}, which corresponds to "${severity}". Please help me interpret this and suggest next steps.`,
              });

              // Route to providers page if score >= 10 (moderate severity and might need professional intervention)
                const isPHQ9 = title.toLowerCase().includes("phq-9");
                const isGAD7 = title.toLowerCase().includes("gad-7");

                if ((isPHQ9 || isGAD7 && score >= 10)) {
                  setRecommendedConcern(isPHQ9? "depression" : "anxiety");
                }
            }}
            onCancel={() => {
              setActiveAssessment(null);
            }}
          />
        )}


        {/* Input area */}
          <View style={{ paddingBottom: 8 }}>
          {/* Button to trigger assessment */}
          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'flex-start', 
            paddingHorizontal: 8, 
            marginBottom: 4 
          }}>
            <TouchableOpacity
            style={[
              styles.assessmentTriggerButton,
              (isAssessmentLoading || isLoading || !recommendedAssessmentTitle) && styles.sendButtonDisabled,
            ]}
            onPress={handleStartAssessment}
            disabled={isAssessmentLoading || isLoading || !recommendedAssessmentTitle}
          >
            {isAssessmentLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.assessmentTriggerText}>
                {recommendedAssessmentTitle ? 'Take assessment' : 'No assessment recommended yet'}
              </Text>
            )}
          </TouchableOpacity>
          </View>

      {/** UI message to user to prompt them to explore the providers page with pre-filled specialty*/}
      {/** with a slight delay */}

      {showRecommendation && recommendedConcern && (
      <View style={{ paddingHorizontal: 12, paddingBottom: 6 }}>
        <View
          style={{
            backgroundColor: "#F5FAF7",
            borderRadius: 12,
            padding: 10,
            borderWidth: 1,
            borderColor: "#CFE4D7",
          }}
        >
          <Text style={{ marginBottom: 6 }}>
            Based on your results, it might help to look at providers who specialize in{" "}
            {recommendedConcern}. Would you like to see some options?
          </Text>
          <TouchableOpacity
            style={{
              alignSelf: "flex-start",
              backgroundColor: "#2F6F4E",
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 999,
            }}
            onPress={() => {
              setTimeout(() => {
                router.push({
                  pathname: "/(tabs)/resourcesProvider",
                  params: { specialty: recommendedConcern },
                });
              }, 500);
              
              setRecommendedConcern(null);
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>
              View providers near me
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      )}
      


        <View style={styles.chatInputWrap}>
          <TextInput
            style={styles.chatInput}
            placeholder="Message MIND-Path..."
            placeholderTextColor={PLACEHOLDER}
            value={input}
            onChange={e => setInput(e.nativeEvent.text)}
            onSubmitEditing={e => {
              e.preventDefault();
              if (input.trim().length === 0) return;
              sendMessage({ text: input });
              setInput('');
            }}
            autoFocus={true}
            returnKeyType="send"
            editable={status !== "streaming"} // Disable typing while streaming
          />
          
          <TouchableOpacity
            style={[styles.sendButton, (isLoading || input.trim().length === 0) && styles.sendButtonDisabled]}
            onPress={() => {
              if (input.trim().length === 0) return;
              sendMessage({ text: input });
              setInput('');
            }}
            disabled={isLoading || input.trim().length === 0}
          >
            {isLoading ?
              <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.sendButtonText}>Send</Text>  
            }
          </TouchableOpacity>
        </View>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  chatInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 4,
  },
  chatInput: {
    flex: 1,
    fontSize: 14,
    color: '#1f2937',
    padding: 12,
    backgroundColor: GREEN_LIGHT,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GREEN_BORDER
  },
  msgRow: {
    width: '100%',
    marginVertical: 6,
  },
  bubbleAssistant: {
    maxWidth: '82%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  bubbleUser: {
    maxWidth: '82%',
    backgroundColor: GREEN_LIGHT,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: GREEN_BORDER,
  },
  chatWrap: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    paddingHorizontal: 8,
  },
  msgText: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
  },
  sendButton: {
    backgroundColor: '#007AFF', 
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 70,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
    assessmentTriggerButton: {
    backgroundColor: '#065F46',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
  },
  assessmentTriggerText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});