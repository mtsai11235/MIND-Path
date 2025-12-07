import React, { useState, useMemo } from 'react';
import { 
  View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView, 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


/** * Matches Assessment JSON structure:
 * {
 * "scale": { "0": "Not at all", ... },
 * "scoring": { "0-4": "Minimal anxiety", ... },
 * "questions": [ ... ]
 * }
 */
export interface AssessmentContent {
  title?: string;
  scale: Record<string, string>;
  scoring: Record<string, string>;
  questions: {
    id: string;
    text: string;
    options: number[];
  }[];
}

interface Props {
  visible: boolean;
  data: AssessmentContent; // The JSON from DB
  title?: string;
  onComplete: (score: number, severity: string) => void;
  onCancel: () => void;
}

export default function AssessmentModal({ visible, data, title, onComplete, onCancel }: Props) {
  const [answers, setAnswers] = useState<Record<string, number>>({});


  const handleSelect = (qId: string, value: number) => {
    setAnswers(prev => ({ ...prev, [qId]: value }));
  };

  const calculateResult = () => {
    // 1. Sum the score
    let total = 0;
    Object.values(answers).forEach(val => total += val);

    // 2. Determine Severity based on ranges "0-4", "5-9", etc.
    let severityLabel = "Unknown";
    
    // Iterate through keys like "0-4", "10-14"
    for (const [rangeStr, label] of Object.entries(data.scoring)) {
      const [minStr, maxStr] = rangeStr.split('-');
      const min = parseInt(minStr, 10);
      const max = maxStr ? parseInt(maxStr, 10) : 999; // Handle "20+" if it ever appears

      if (total >= min && total <= max) {
        severityLabel = label;
        break;
      }
    }

    return { total, severityLabel };
  };

  const handleSubmit = () => {
    const { total, severityLabel } = calculateResult();
    onComplete(total, severityLabel);
  };

  // Check if all questions have been answered
  const isComplete = data.questions.every(q => answers[q.id] !== undefined);

  // Parse scale for rendering (e.g., ensure "0" comes before "1")
  const sortedScale = useMemo(() => {
    return Object.entries(data.scale).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
  }, [data.scale]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{title || "Assessment"}</Text>
          <TouchableOpacity onPress={onCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.instruction}>
            Over the last 2 weeks, how often have you been bothered by the following problems?
          </Text>

          {data.questions.map((q, index) => (
            <View key={q.id} style={styles.card}>
              <Text style={styles.questionText}>
                {index + 1}. {q.text}
              </Text>
              
              <View style={styles.optionsContainer}>
                {sortedScale.map(([valStr, label]) => {
                  const val = parseInt(valStr);
                  const isSelected = answers[q.id] === val;
                  
                  return (
                    <TouchableOpacity
                      key={valStr}
                      style={[styles.optionBtn, isSelected && styles.optionBtnSelected]}
                      onPress={() => handleSelect(q.id, val)}
                    >
                      <Text style={[styles.optionNum, isSelected && styles.textSelected]}>
                        {val}
                      </Text>
                      <Text style={[styles.optionLabel, isSelected && styles.textSelected]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.submitBtn, !isComplete && styles.submitBtnDisabled]}
            disabled={!isComplete}
            onPress={handleSubmit}
          >
            <Text style={styles.submitBtnText}>Submit & Get Results</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#e5e7eb'
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  cancelText: { fontSize: 16, color: '#6b7280' },
  scrollContent: { padding: 16, paddingBottom: 100 },
  instruction: { fontSize: 14, color: '#4b5563', marginBottom: 16, fontStyle: 'italic' },
  
  card: {
    backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }
  },
  questionText: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 12 },
  
  optionsContainer: { flexDirection: 'row', gap: 8 },
  optionBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4,
    borderRadius: 8, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb'
  },
  optionBtnSelected: { backgroundColor: '#3F9360', borderColor: '#3F9360' },
  optionNum: { fontSize: 18, fontWeight: '700', color: '#374151', marginBottom: 4 },
  optionLabel: { fontSize: 10, textAlign: 'center', color: '#6b7280', lineHeight: 12 },
  textSelected: { color: 'white' },

  footer: {
    padding: 16, backgroundColor: 'white', borderTopWidth: 1, borderColor: '#e5e7eb',
    position: 'absolute', bottom: 0, left: 0, right: 0
  },
  submitBtn: {
    backgroundColor: '#3F9360', paddingVertical: 16, borderRadius: 12, alignItems: 'center'
  },
  submitBtnDisabled: { backgroundColor: '#d1d5db' },
  submitBtnText: { color: 'white', fontSize: 16, fontWeight: '700' }
});