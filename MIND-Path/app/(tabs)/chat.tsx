import { useChat } from '@ai-sdk/react';
import { StyleSheet } from 'react-native'
import { DefaultChatTransport } from 'ai';
import { fetch as expoFetch } from 'expo/fetch';
import { useState } from 'react';
import { View, TextInput, ScrollView, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { generateAPIUrl } from '@/utils/utils';


/** ---------- Theme colors ---------- */
const GREEN_LIGHT  = "#DDEFE6";
const GREEN_BORDER = "rgba(6,95,70,0.14)";
const PLACEHOLDER  = "#3a6a54";

/** ---------- Chat screen ---------- */
export default function ChatScreen() {
  const [input, setInput] = useState('');
  const { messages, error, sendMessage } = useChat({
    transport: new DefaultChatTransport({
      fetch: expoFetch as unknown as typeof globalThis.fetch,
      api: generateAPIUrl('api/chat'),
    }),
    onError: error => console.error(error, 'ERROR'),
  });

  if (error) return <Text>{error.message}</Text>;

  return (
    <SafeAreaProvider style={{ height: '100%' }}>
      <View style={styles.chatWrap}>
        {/* Messages list */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12 }}
        >
          {messages.map(m => {
            const isUser = m.role === 'user';
            return (
              <View
                key={m.id}
                style={[styles.msgRow, { alignItems: isUser ? 'flex-end' : 'flex-start' }]}
              >
                <View style={isUser ? styles.bubbleUser : styles.bubbleAssistant}>
                  {m.parts.map((part, i) => {
                    if (part.type === 'text') {
                      return (
                        <Text key={`${m.id}-${i}`} style={styles.msgText}>
                          {part.text}
                        </Text>
                      );
                    }
                    return null;
                  })}
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Input area */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 30 : 0}
        >
          <View style={styles.chatInputWrap}>
            <TextInput
              style={styles.chatInput}
              placeholder="Say something..."
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
            />
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaProvider>
  );
}

/** ---------- Chat styles ---------- */
const styles = StyleSheet.create({
    chatInputWrap: {
    backgroundColor: GREEN_LIGHT,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GREEN_BORDER,
    marginHorizontal: 4,
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  chatInput: {
    height: 44,
    fontSize: 14,
    color: '#1f2937',
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
    height: '95%',
    display: 'flex',
    flexDirection: 'column',
    paddingHorizontal: 8,
  },
    msgText: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
  },
})