import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/constants/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React from 'react';
import { Alert, Modal, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

export default function SettingsScreen() {
  const { themeMode, setThemeMode, colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const [connections, setConnections] = React.useState<any[]>([]);
  const [activeIp, setActiveIp] = React.useState<string>('');

  // Estados para edición de conexión
  const [isEditModalVisible, setIsEditModalVisible] = React.useState(false);
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [editName, setEditName] = React.useState('');
  const [editIp, setEditIp] = React.useState('');

  useFocusEffect(
    React.useCallback(() => {
      loadConnections();
    }, [])
  );

  const loadConnections = async () => {
    try {
      const list = await AsyncStorage.getItem('sofimanager_connections_list');
      if (list) setConnections(JSON.parse(list));

      const current = await AsyncStorage.getItem('firebase_config');
      if (current) {
        const cfg = JSON.parse(current);
        setActiveIp(cfg.directIp || '');
      }
    } catch (e) { console.error(e); }
  };

  const switchConnection = async (conn: any) => {
    if (conn.directIp === activeIp) return;
    try {
      await AsyncStorage.setItem('firebase_config', JSON.stringify(conn));
      setActiveIp(conn.directIp);
      router.replace('/');
    } catch (e) {
      console.error(e);
    }
  };

  const openEditModal = (conn: any, index: number) => {
    setEditingIndex(index);
    setEditName(conn.name || '');
    setEditIp(conn.directIp || '');
    setIsEditModalVisible(true);
  };

  const saveConnectionEdit = async () => {
    if (!editName.trim() || !editIp.trim()) {
      Alert.alert("Campos vacíos", "Por favor ingresa un nombre y una dirección IP.");
      return;
    }

    try {
      const updated = [...connections];
      if (editingIndex !== null && editingIndex >= 0 && editingIndex < updated.length) {
        const oldConn = updated[editingIndex];
        const newConn = {
          ...oldConn,
          name: editName.trim(),
          directIp: editIp.trim()
        };
        updated[editingIndex] = newConn;

        // Si la conexión que editamos es la activa, actualizar firebase_config
        if (oldConn.directIp === activeIp) {
          await AsyncStorage.setItem('firebase_config', JSON.stringify(newConn));
          setActiveIp(newConn.directIp);
        }

        await AsyncStorage.setItem('sofimanager_connections_list', JSON.stringify(updated));
        setConnections(updated);
        setIsEditModalVisible(false);
        setEditingIndex(null);
        Alert.alert("✅ Éxito", "Conexión actualizada correctamente.");
      }
    } catch (e) {
      console.error(e);
      Alert.alert("❌ Error", "No se pudieron guardar los cambios.");
    }
  };

  const deleteConnection = async (conn: any, idx: number) => {
    Alert.alert("Eliminar Empresa", `¿Deseas eliminar la conexión a "${conn.name}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar", style: "destructive", onPress: async () => {
          try {
            const updated = connections.filter((_, i) => i !== idx);
            setConnections(updated);
            await AsyncStorage.setItem('sofimanager_connections_list', JSON.stringify(updated));

            if (activeIp === conn.directIp) {
              if (updated.length > 0) {
                await AsyncStorage.setItem('firebase_config', JSON.stringify(updated[0]));
                setActiveIp(updated[0].directIp);
              } else {
                await AsyncStorage.removeItem('firebase_config');
                setActiveIp('');
              }
            }
          } catch (e) {
            console.error(e);
          }
        }
      }
    ]);
  };

  const themeOptions = [
    { id: 'light', label: 'Modo Claro', icon: 'sunny-outline', color: '#f59e0b' },
    { id: 'dark', label: 'Modo Oscuro', icon: 'moon-outline', color: '#6366f1' },
    { id: 'system', label: 'Sistema', icon: 'settings-outline', color: '#64748b' },
  ];

  return (
    <ThemedView style={[styles.container, { backgroundColor: isDark ? '#1e1e1e' : '#f8fafc' }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDark ? '#1e293b' : '#2563eb' }]}>
        <ThemedText style={styles.headerTitle}>Configuración</ThemedText>
        <ThemedText style={styles.headerSubtitle}>Personaliza tu experiencia</ThemedText>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <ThemedText type="subtitle" style={[styles.sectionTitle, { color: isDark ? '#ffffff' : '#1e293b' }]}>Apariencia</ThemedText>
        
        <View style={[styles.card, { backgroundColor: isDark ? '#334155' : '#ffffff' }]}>
          {themeOptions.map((option) => (
            <TouchableOpacity 
              key={option.id}
              style={[
                styles.optionRow,
                themeMode === option.id && { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }
              ]}
              onPress={() => setThemeMode(option.id as any)}
            >
              <View style={[styles.iconContainer, { backgroundColor: option.color + '20' }]}>
                <Ionicons name={option.icon as any} size={22} color={option.color} />
              </View>
              <ThemedText style={[styles.optionLabel, { color: isDark ? '#ffffff' : '#1e293b' }]}>{option.label}</ThemedText>
              {themeMode === option.id && (
                <Ionicons name="checkmark-circle" size={24} color="#2563eb" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionHeaderRow}>
          <ThemedText type="subtitle" style={[styles.sectionTitle, { color: isDark ? '#ffffff' : '#1e293b' }]}>Empresas (Conexiones)</ThemedText>
          <TouchableOpacity onPress={() => router.push('/setup')} style={styles.addBtn}>
            <Ionicons name="add-circle-outline" size={20} color="#2563eb" />
            <ThemedText style={styles.addBtnText}>Añadir</ThemedText>
          </TouchableOpacity>
        </View>
        
        <View style={[styles.card, { backgroundColor: isDark ? '#334155' : '#ffffff' }]}>
          {connections.length > 0 ? (
            connections.map((conn, idx) => (
              <View 
                key={idx}
                style={[
                  styles.optionRowContainer,
                  { borderBottomWidth: idx === connections.length - 1 ? 0 : 1, borderBottomColor: isDark ? '#475569' : '#f1f5f9' },
                  activeIp === conn.directIp && { backgroundColor: isDark ? '#1e293b' : '#eff6ff' }
                ]}
              >
                <TouchableOpacity
                  style={styles.connectionSelectArea}
                  onPress={() => switchConnection(conn)}
                >
                  <View style={[styles.iconContainer, { backgroundColor: activeIp === conn.directIp ? '#2563eb20' : '#64748b20' }]}>
                    <Ionicons name="business-outline" size={22} color={activeIp === conn.directIp ? "#2563eb" : "#64748b"} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={[styles.optionLabel, { color: isDark ? '#ffffff' : '#1e293b' }]}>{conn.name}</ThemedText>
                    <ThemedText style={{ fontSize: 12, color: '#64748b' }}>{conn.directIp}</ThemedText>
                  </View>
                  {activeIp === conn.directIp && (
                    <View style={styles.activeBadge}>
                      <ThemedText style={styles.activeBadgeText}>ACTIVA</ThemedText>
                    </View>
                  )}
                </TouchableOpacity>

                <View style={styles.actionsArea}>
                  <TouchableOpacity onPress={() => openEditModal(conn, idx)} style={styles.actionIconBtn}>
                    <Ionicons name="create-outline" size={18} color="#2563eb" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteConnection(conn, idx)} style={styles.actionIconBtn}>
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <ThemedText style={{ color: '#64748b', textAlign: 'center' }}>No hay empresas guardadas. Añade una para empezar.</ThemedText>
            </View>
          )}
        </View>

        <ThemedText type="subtitle" style={[styles.sectionTitle, { color: isDark ? '#ffffff' : '#1e293b' }]}>Información</ThemedText>
        <View style={[styles.card, { backgroundColor: isDark ? '#334155' : '#ffffff' }]}>
          <View style={styles.infoItem}>
            <ThemedText style={[styles.infoLabel, { color: isDark ? '#94a3b8' : '#64748b' }]}>Versión</ThemedText>
            <ThemedText style={[styles.infoValue, { color: isDark ? '#ffffff' : '#1e293b' }]}>1.1.2</ThemedText>
          </View>
          <View style={[styles.infoItem, { borderBottomWidth: 0 }]}>
            <ThemedText style={[styles.infoLabel, { color: isDark ? '#94a3b8' : '#64748b' }]}>Desarrollado por</ThemedText>
            <ThemedText style={[styles.infoValue, { color: isDark ? '#ffffff' : '#1e293b' }]}>SOFISOFT Manager</ThemedText>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal de Edición de Conexión */}
      <Modal
        visible={isEditModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={[styles.modalContent, { backgroundColor: isDark ? '#1e293b' : '#ffffff' }]}>
            <View style={styles.modalHeader}>
              <Ionicons name="create-outline" size={24} color="#2563eb" />
              <ThemedText style={[styles.modalTitle, { color: isDark ? '#ffffff' : '#1e293b' }]}>Editar Conexión</ThemedText>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <ThemedText style={[styles.inputLabel, { color: isDark ? '#cbd5e1' : '#475569' }]}>Nombre de la Empresa</ThemedText>
                <View style={[styles.inputWrapper, { backgroundColor: isDark ? '#334155' : '#f8fafc', borderColor: isDark ? '#475569' : '#e2e8f0' }]}>
                  <Ionicons name="business-outline" size={18} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: isDark ? '#ffffff' : '#1e293b' }]}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Ej: Mi Tienda S.A."
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={[styles.inputLabel, { color: isDark ? '#cbd5e1' : '#475569' }]}>Dirección IP / Host</ThemedText>
                <View style={[styles.inputWrapper, { backgroundColor: isDark ? '#334155' : '#f8fafc', borderColor: isDark ? '#475569' : '#e2e8f0' }]}>
                  <Ionicons name="server-outline" size={18} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: isDark ? '#ffffff' : '#1e293b' }]}
                    value={editIp}
                    onChangeText={setEditIp}
                    placeholder="Ej: 192.168.1.10"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                  />
                </View>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.btnCancel, { backgroundColor: isDark ? '#475569' : '#e2e8f0' }]} 
                onPress={() => setIsEditModalVisible(false)}
              >
                <ThemedText style={[styles.btnCancelText, { color: isDark ? '#ffffff' : '#475569' }]}>Cancelar</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSave} onPress={saveConnectionEdit}>
                <ThemedText style={styles.btnSaveText}>Guardar</ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 30, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#ffffff' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, marginLeft: 4 },
  card: { borderRadius: 24, padding: 8, marginBottom: 24, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
  optionRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16 },
  iconContainer: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  optionLabel: { flex: 1, fontSize: 16, fontWeight: '500' },
  infoItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '600' },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingRight: 4 },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, gap: 4 },
  addBtnText: { color: '#2563eb', fontWeight: 'bold', fontSize: 13 },
  activeBadge: { backgroundColor: '#2563eb', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  activeBadgeText: { color: '#ffffff', fontSize: 10, fontWeight: 'bold' },

  // Nuevos estilos de administrador de conexiones
  optionRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingRight: 10
  },
  connectionSelectArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16
  },
  actionsArea: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  actionIconBtn: {
    padding: 8,
    borderRadius: 8,
    marginLeft: 6
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold'
  },
  modalBody: {
    gap: 16,
    marginBottom: 24
  },
  inputGroup: {
    gap: 8
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600'
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48
  },
  inputIcon: {
    marginRight: 8
  },
  input: {
    flex: 1,
    fontSize: 15
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end'
  },
  btnCancel: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12
  },
  btnCancelText: {
    fontWeight: 'bold',
    fontSize: 14
  },
  btnSave: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12
  },
  btnSaveText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14
  }
});
