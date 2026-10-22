import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  Modal,
  SafeAreaView 
} from 'react-native';
import { LocalNote } from '@cloudnotes/shared-types';
import { NoteBentoCard } from './NoteBentoCard';
import { Search, X, ArrowLeft, FileText } from 'lucide-react-native';

interface SearchModalProps {
  visible: boolean;
  notes: LocalNote[];
  isVaultUnlocked: boolean;
  onClose: () => void;
  onOpenNote: (note: LocalNote) => void;
  onDeleteNote: (noteId: string) => void;
  onArchiveToggle: (note: LocalNote) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  visible,
  notes,
  isVaultUnlocked,
  onClose,
  onOpenNote,
  onDeleteNote,
  onArchiveToggle,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!visible) {
      setQuery('');
    }
  }, [visible]);

  const filtered = notes.filter((n) => {
    if (!query.trim()) return false;
    const q = query.toLowerCase();
    const titleMatch = (n.title || '').toLowerCase().includes(q);
    const contentMatch = (n.content || '').toLowerCase().includes(q);
    const excerptMatch = (n.excerpt || '').toLowerCase().includes(q);
    return titleMatch || contentMatch || excerptMatch;
  });

  // Dynamic Bento row chunking for search results
  const rows: LocalNote[][] = [];
  for (let i = 0; i < filtered.length; i += 2) {
    if (i + 1 < filtered.length) {
      rows.push([filtered[i], filtered[i + 1]]);
    } else {
      rows.push([filtered[i]]);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Top Search Bar */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backBtn} 
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={22} color="#F8FAFC" />
          </TouchableOpacity>

          <View style={styles.inputContainer}>
            <Search size={16} color="#64748B" style={styles.searchIcon} />
            <TextInput
              autoFocus
              value={query}
              onChangeText={setQuery}
              placeholder="Search all notes..."
              placeholderTextColor="#64748B"
              style={styles.searchInput}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity 
                onPress={() => setQuery('')} 
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Content Area */}
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {!query.trim() ? (
            <View style={styles.emptyContainer}>
              <Search size={36} color="#475569" style={{ opacity: 0.6, marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>Search Notes</Text>
              <Text style={styles.emptySubtitle}>
                Type keywords, tags, or phrases to find notes across your notebook.
              </Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.emptyContainer}>
              <FileText size={36} color="#475569" style={{ opacity: 0.6, marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>No matching notes</Text>
              <Text style={styles.emptySubtitle}>
                No results found for "{query}". Try a different search term.
              </Text>
            </View>
          ) : (
            <View style={styles.gridContainer}>
              <Text style={styles.resultsCount}>
                Found {filtered.length} {filtered.length === 1 ? 'note' : 'notes'}
              </Text>
              {rows.map((row, rowIndex) => {
                if (row.length === 2) {
                  return (
                    <View key={`search-row-${rowIndex}`} style={styles.rowPair}>
                      <NoteBentoCard
                        note={row[0]}
                        variant="compact"
                        isVaultUnlocked={isVaultUnlocked}
                        onPress={() => {
                          onClose();
                          onOpenNote(row[0]);
                        }}
                        onDelete={() => onDeleteNote(row[0].id)}
                        onArchiveToggle={() => onArchiveToggle(row[0])}
                      />
                      <NoteBentoCard
                        note={row[1]}
                        variant="compact"
                        isVaultUnlocked={isVaultUnlocked}
                        onPress={() => {
                          onClose();
                          onOpenNote(row[1]);
                        }}
                        onDelete={() => onDeleteNote(row[1].id)}
                        onArchiveToggle={() => onArchiveToggle(row[1])}
                      />
                    </View>
                  );
                }

                return (
                  <View key={`search-row-${rowIndex}`} style={styles.rowSingle}>
                    <NoteBentoCard
                      note={row[0]}
                      variant="full"
                      isVaultUnlocked={isVaultUnlocked}
                      onPress={() => {
                        onClose();
                        onOpenNote(row[0]);
                      }}
                      onDelete={() => onDeleteNote(row[0].id)}
                      onArchiveToggle={() => onArchiveToggle(row[0])}
                    />
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    gap: 12,
  },
  backBtn: {
    padding: 6,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111622',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 14,
    height: '100%',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 40,
  },
  resultsCount: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
    marginBottom: 12,
  },
  gridContainer: {
    width: '100%',
  },
  rowPair: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  rowSingle: {
    width: '100%',
    marginBottom: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
  },
});
