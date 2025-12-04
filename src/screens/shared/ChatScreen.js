import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import palette from '../../styles/palette';
import { messageAPI, projectAPI } from '../../services/api';

const formatTimestamp = (value) => {
  if (!value) return '';
  const date = new Date(value);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  return sameDay
    ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString();
};

const ChatScreen = ({ route, navigation }) => {
  const { project: initialProject, receiver: initialReceiver } = route.params || {};
  const { user } = useSelector((state) => state.auth);
  const [project, setProject] = useState(initialProject || null);
  const projectId = project?.id || initialProject?.id;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const listRef = useRef(null);

  const refreshProject = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await projectAPI.getProjectDetails(projectId);
      setProject(res.data || project);
    } catch (error) {
      console.log('chat:project:load:error', error?.message);
    }
  }, [projectId, project]);

  useEffect(() => {
    if (projectId && (!project?.owner || !project?.assignedContractor)) {
      refreshProject();
    }
  }, [projectId, project?.owner, project?.assignedContractor, refreshProject]);

  const isParticipant = Boolean(
    projectId &&
      user?.id &&
      (project?.userId === user.id ||
        project?.owner?.id === user.id ||
        project?.assignedContractor?.id === user.id)
  );
  const counterpart =
    user?.role === 'homeowner'
      ? project?.assignedContractor
      : project?.assignedContractor?.id === user?.id
      ? project?.owner
      : null;
  const activeReceiver = initialReceiver?.id ? initialReceiver : counterpart;
  const isConversationScoped = Boolean(initialReceiver?.id);
  const canSend = Boolean(projectId && user?.id && activeReceiver?.id && isParticipant);

  const loadMessages = useCallback(async () => {
    if (!projectId || !user?.id || !isParticipant) return;
    setIsLoading(true);
    try {
      const res = await messageAPI.list(projectId, user.id);
      setMessages(res.data || []);
      setTimeout(() => listRef.current?.scrollToEnd?.({ animated: false }), 50);
    } catch (error) {
      console.log('chat:load:error', error?.response?.data || error.message);
    } finally {
      setIsLoading(false);
    }
  }, [isParticipant, projectId, user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadMessages();
    }, [loadMessages])
  );

  const handleSend = async () => {
    const body = input.trim();
    if (!body || !canSend) return;
    setIsSubmitting(true);
    try {
      if (editingMessage) {
        await messageAPI.update(projectId, editingMessage.id, { userId: user.id, body });
        setEditingMessage(null);
      } else {
        await messageAPI.send(projectId, { senderId: user.id, receiverId: activeReceiver.id, body });
      }
      setInput('');
      await loadMessages();
      setTimeout(() => listRef.current?.scrollToEnd?.({ animated: true }), 100);
    } catch (error) {
      Alert.alert('Message failed', error?.response?.data?.message || 'Could not send message');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (message) => {
    if (!projectId || !user?.id) return;
    try {
      await messageAPI.remove(projectId, message.id, { userId: user.id });
      await loadMessages();
    } catch (error) {
      Alert.alert('Delete failed', error?.response?.data?.message || 'Could not delete message');
    }
  };

  const promptMessageActions = (message) => {
    if (!user?.id || message.senderId !== user.id || message.isDeleted) return;
    Alert.alert('Message', 'Edit or delete this message?', [
      {
        text: 'Edit',
        onPress: () => {
          setEditingMessage(message);
          setInput(message.body || '');
        },
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => handleDelete(message),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const renderMessage = ({ item }) => {
    const isOwn = item.senderId === user?.id;
    const metaLabel = `${formatTimestamp(item.createdAt)}${
      item.updatedAt && item.updatedAt !== item.createdAt && !item.isDeleted ? ' • Edited' : ''
    }`;

    return (
      <TouchableOpacity
        activeOpacity={item.isDeleted ? 1 : 0.8}
        onLongPress={() => promptMessageActions(item)}
        style={[styles.messageRow, isOwn ? styles.messageRowOwn : styles.messageRowOther]}
      >
        <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
          <Text
            style={[
              styles.bodyText,
              isOwn ? styles.bodyOwnText : null,
              item.isDeleted ? (isOwn ? styles.deletedOwnText : styles.deletedText) : null,
            ]}
          >
            {item.isDeleted ? 'Message deleted' : item.body}
          </Text>
          <Text style={[styles.metaText, isOwn ? styles.metaOwnText : null]}>{metaLabel}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const filteredMessages =
    isConversationScoped && activeReceiver?.id
      ? messages.filter(
          (m) =>
            (m.senderId === user?.id && m.receiverId === activeReceiver.id) ||
            (m.senderId === activeReceiver.id && m.receiverId === user?.id)
        )
      : messages;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{project?.title || 'Project Chat'}</Text>
            <Text style={styles.headerSubtitle}>
              {activeReceiver?.fullName
                ? `Chat with ${activeReceiver.fullName}`
                : 'Chat unlocks once the match is confirmed'}
            </Text>
          </View>
        </View>

        {!canSend ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Chat unavailable</Text>
            <Text style={styles.emptyBody}>
              {project?.assignedContractor
                ? 'Sign in to start messaging.'
                : 'Chat will unlock once a contractor is assigned to this project.'}
            </Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={filteredMessages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              !isLoading ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>No messages yet</Text>
                  <Text style={styles.emptyBody}>Start the conversation to keep work moving.</Text>
                </View>
              ) : null
            }
          />
        )}

        <View style={styles.composer}>
          {editingMessage ? (
            <View style={styles.editBanner}>
              <Text style={styles.editLabel}>Editing message</Text>
              <TouchableOpacity onPress={() => setEditingMessage(null)}>
                <Text style={styles.editCancel}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder={canSend ? 'Type a message' : 'Chat unavailable'}
              value={input}
              onChangeText={setInput}
              editable={canSend && !isSubmitting}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendButton, !input.trim() || !canSend ? styles.sendDisabled : null]}
              onPress={handleSend}
              disabled={!input.trim() || !canSend || isSubmitting}
            >
              <Text style={styles.sendText}>{editingMessage ? 'Save' : 'Send'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  backText: { fontSize: 22, color: palette.text },
  headerTitle: { fontSize: 18, fontWeight: '700', color: palette.text },
  headerSubtitle: { color: palette.muted, fontSize: 12 },
  listContent: { padding: 16, paddingBottom: 24 },
  messageRow: { marginBottom: 10 },
  messageRowOwn: { alignItems: 'flex-end' },
  messageRowOther: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '82%',
    padding: 12,
    borderRadius: 12,
  },
  bubbleOwn: { backgroundColor: palette.primary, borderTopRightRadius: 4 },
  bubbleOther: { backgroundColor: palette.surface, borderTopLeftRadius: 4, borderWidth: 1, borderColor: palette.border },
  bodyText: { color: palette.text },
  bodyOwnText: { color: '#fff' },
  deletedText: { color: palette.muted, fontStyle: 'italic' },
  deletedOwnText: { color: '#fff', fontStyle: 'italic' },
  metaText: { color: palette.muted, fontSize: 11, marginTop: 6 },
  metaOwnText: { color: '#E7E8FF' },
  emptyState: { padding: 20, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: palette.text, marginBottom: 6 },
  emptyBody: { color: palette.muted, textAlign: 'center' },
  composer: { padding: 12, borderTopWidth: 1, borderTopColor: palette.border, backgroundColor: palette.surface, gap: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 110,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: palette.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.border,
    color: palette.text,
  },
  sendButton: {
    backgroundColor: palette.primary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
  },
  sendDisabled: { opacity: 0.5 },
  sendText: { color: '#fff', fontWeight: '700' },
  editBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  editLabel: { color: palette.muted, fontSize: 12 },
  editCancel: { color: palette.primary, fontSize: 12, fontWeight: '600' },
});

export default ChatScreen;
