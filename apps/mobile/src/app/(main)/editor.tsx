import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LocalNote } from '@cloudnotes/shared-types';
import { getDb } from '../../db/client';
import { NoteEditorModal } from '../../components/NoteEditorModal';

export default function NoteEditorScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [note, setNote] = useState<LocalNote | null>(null);
  const [loading, setLoading] = useState(Boolean(id));

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const db = await getDb();
        const existing = await db.getFirstAsync<LocalNote>(
          'SELECT * FROM local_notes WHERE id = ?',
          [id]
        );
        if (existing) {
          setNote(existing);
        }
      } catch (err) {
        console.warn('Error loading note in route:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F59E0B" />
      </View>
    );
  }

  return (
    <NoteEditorModal
      visible={true}
      note={note}
      onClose={() => router.back()}
      onSaveSuccess={() => router.back()}
      onDeleteSuccess={() => router.back()}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0B0F19',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
