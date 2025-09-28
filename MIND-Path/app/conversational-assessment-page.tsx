import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  questionIndex?: number;
}

const initialMessages: Message[] = [
  {
    id: '1',
    text: 'Hello! I\'m here to help you with a mental health assessment. How are you feeling today?',
    sender: 'ai',
  },
];

export default function ConversationalAssessmentPage() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputText, setInputText] = useState('');
  const [responses, setResponses] = useState<string[]>([]);
  const [showingResult, setShowingResult] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // demo questions
  const assessmentQuestions = [
    'How would you rate your stress level on a scale of 1-10?',
    'Have you been having trouble sleeping lately?',
    'How would you describe your energy levels throughout the day?',
    'Are you finding joy in activities you usually enjoy?',
    'How would you describe your social interactions lately?',
  ];

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const handleSend = () => {
    if (inputText.trim() === '') return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: 'user',
      questionIndex: currentQuestionIndex,
    };
    
    // Store the response
    setResponses(prev => [...prev, inputText.trim()]);

    setMessages(prev => [...prev, userMessage]);
    setInputText('');

    // Simulate AI response
    setTimeout(() => {
      if (currentQuestionIndex < assessmentQuestions.length) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: assessmentQuestions[currentQuestionIndex],
          sender: 'ai',
        };
        setMessages(prev => [...prev, aiMessage]);
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        const analysis = analyzeResponses(responses);
        setShowingResult(true);
        
        const summaryMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: 'Thank you for completing the assessment. Here\'s a summary of your responses:\n\n' + analysis,
          sender: 'ai',
        };
        setMessages(prev => [...prev, summaryMessage]);
      }
    }, 1000);
  };

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const analyzeResponses = (userResponses: string[]) => {
    let analysis = '';

    analysis += `Stress Level: ${userResponses[0]}\n`
    analysis += `Sleep: ${userResponses[1]}\n`;
    analysis += `Energy Levels: ${userResponses[2]}\n`;
    analysis += `Activity Enjoyment: ${userResponses[3]}\n`;
    analysis += `Social Interactions: ${userResponses[4]}\n`;

    analysis += '\nAssessment Results:\n';
    analysis += 'xxx';
    analysis += '\nRecommendations:\n';
    analysis += 'xxx';

    return analysis;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <Text style={styles.headerText}>Mental Health Assessment</Text>
        </View>
        
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesList}
        >
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageBubble,
                message.sender === 'user'
                  ? styles.userMessage
                  : styles.aiMessage,
              ]}
            >
              <Text style={[styles.messageText, message.sender === 'user' ? { color: '#ffffff' } : { color: '#000000' }]}>{message.text}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type your response..."
            multiline
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSend}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    padding: 16,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerText: {
    color: '#000000',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    padding: 16,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginVertical: 4,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#E9E9EB',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.2,
    color: '#000000',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  input: {
    flex: 1,
    marginRight: 8,
    padding: 10,
    paddingTop: 10,
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    maxHeight: 100,
    fontSize: 16,
    letterSpacing: -0.2,
  },
  sendButton: {
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    height: 36,
  },
  sendButtonText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: -0.2,
  },
});
