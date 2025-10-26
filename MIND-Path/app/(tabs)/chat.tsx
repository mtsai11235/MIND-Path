import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { fetch as expoFetch } from 'expo/fetch';
import { useState } from 'react';
import { View, TextInput, ScrollView, Text, KeyboardAvoidingView, Platform, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { generateAPIUrl } from '@/utils/utils';

/** ---------- Theme colors ---------- */
const GREEN_LIGHT  = "#DDEFE6";
const GREEN_BORDER = "rgba(6,95,70,0.14)";
const PLACEHOLDER  = "#3a6a54";

/** ---------- Chat screen ---------- */
export default function ChatScreen() {
  const [input, setInput] = useState('');

  // The useChat hook, by default, use the POST API route (/api/chat). 
  // messages: the current chat messages (an array of objects with id, role, and parts properties)
  // sendMessagess: a function to send a message to the chat API
  const { messages, error, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      fetch: expoFetch as unknown as typeof globalThis.fetch,
      api: generateAPIUrl('api/chat'),
    }),
    messages: [
      {
        id: "welcome-1",
        role: "assistant",
        parts: [
          {
            type: "text",
            text: "Hello, I am MIND-Path. I am here to help you find mental health resources that fit your needs.",
          }
        ],
      }, 
      {
        id: "welcome-2",
        role: "assistant",
        parts: [
          {
            type: "text",
            text: "I will guide you through a few short questions to find the right type of support. Everything you tell me is confidential.",
          }
        ],
      }
    ],
    
    onError: error => console.error(error, 'ERROR'),
  });

  if (error) return <Text>{error.message}</Text>;
  const isLoading = (status === "submitted")
 
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView style={styles.chatWrap}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
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
            
          {/* show a spinner on assistant side when the user is waiting for a response */}
          {isLoading && (
            <View
              key = "assistant-typing"
              style = { [styles.msgRow, {alignItems: 'flex-start'}]}
            >
              <View style = {styles.bubbleAssistant}>
                <View style = {styles.typingRow}>
                <ActivityIndicator size = "small"/>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input area */}
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
              editable = {status !== "streaming"}
            />
            
            <TouchableOpacity
              style = {[styles.sendButton, (isLoading || input.trim.length === 0) && styles.sendButtonDisabled
              ]}
              onPress={() => {
                if (input.trim().length === 0) return;
                sendMessage({ text: input });
                setInput('');
              }}
              disabled = {isLoading || input.trim().length===0}
              >
                {isLoading?
                  <ActivityIndicator size = "small" color = "#fff" />
                  : <Text style = {styles.sendButtonText}>Send</Text>  
                }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** ---------- Chat styles ---------- */
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
    paddingHorizontal: 12,
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
    gap: 8,              // RN 0.71+; otherwise use marginRight on the spinner
  },
})