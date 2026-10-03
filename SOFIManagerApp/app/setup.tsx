import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Ionicons } from '@expo/vector-icons';

export default function SetupScreen() {
  const router = useRouter();
  const [connections, setConnections] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [directIp, setDirectIp] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'ok' | 'error'>('idle');

  useEffect(() => {
    loadConnections();
  }, []);

  const clearForm = () => {
    setName('');
    setDirectIp('');
    setTestStatus('idle');
  };

  const loadConnections = async () => {
    try {
      const list = await AsyncStorage.getItem('sofimanager_connections_list');
      if (list) setConnections(JSON.parse(list));

      const current = await AsyncStorage.getItem('firebase_config');
      if (current) {
        const cfg = JSON.parse(current);
        setName(cfg.name || '');
        setDirectIp(cfg.directIp || '');
      }
    } catch (e) { console.error(e); }
  };

  const testDirectConnection = async () => {
    if (!directIp) {
      Alert.alert("Falta la IP", "Ingresa la IP de tu servidor antes de probar.");
      return;
    }
    try {
      setIsTesting(true);
      setTestStatus('idle');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(`http://${directIp.trim()}:5246/api/reports/status`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        setTestStatus('ok');
        Alert.alert("✅ Conexión Exitosa", `Servidor responde correctamente.`);
      } else {
        throw new Error();
      }
    } catch {
      setTestStatus('error');
      Alert.alert("❌ Sin Conexión", "No se pudo alcanzar el servidor.");
    } finally {
      setIsTesting(false);
    }
  };

  const saveConnection = async () => {
    if (!name.trim() || !directIp.trim()) {
      Alert.alert("Campos incompletos", "Por favor ingresa el nombre y la IP.");
      return;
    }

    try {
      const newConfig = {
        name: name.trim(),
        directIp: directIp.trim(),
      };

      const newConnections = [...connections];
      const idx = newConnections.findIndex(c => c.directIp === directIp.trim());
      
      if (idx >= 0) {
        newConnections[idx] = newConfig;
      } else {
        newConnections.push(newConfig);
      }

      await AsyncStorage.setItem('sofimanager_connections_list', JSON.stringify(newConnections));
      await AsyncStorage.setItem('firebase_config', JSON.stringify(newConfig));
      setConnections(newConnections);

      Alert.alert("✅ Guardado", `"${name}" está ahora activa.`, [
        { text: "Continuar", onPress: () => router.replace('/') }
      ]);
    } catch {
      Alert.alert("Error", "No se pudo guardar.");
    }
  };

  const selectConnection = async (conn: any) => {
    Alert.alert("Cambiar Empresa", `¿Deseas conectar a "${conn.name}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Conectar", onPress: async () => {
          await AsyncStorage.setItem('firebase_config', JSON.stringify(conn));
          setName(conn.name || '');
          setDirectIp(conn.directIp || '');
          router.replace('/');
        }
      }
    ]);
  };

  const deleteConnection = async (conn: any, idx: number) => {
    Alert.alert("Eliminar", `¿Deseas eliminar "${conn.name}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar", style: "destructive", onPress: async () => {
          const updated = connections.filter((_, i) => i !== idx);
          setConnections(updated);
          await AsyncStorage.setItem('sofimanager_connections_list', JSON.stringify(updated));
          if (directIp === conn.directIp) clearForm();
        }
      }
    ]);
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconWrapper}>
            <Ionicons name="wifi" size={36} color="#fff" />
          </View>
          <ThemedText type="title" style={styles.title}>Conexiones</ThemedText>
          <ThemedText style={styles.subtitle}>
            Configura las empresas y servidores a los que conectarte
          </ThemedText>
        </View>

        {/* Lista de conexiones guardadas */}
        {connections.length > 0 && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionLabel}>CONEXIONES GUARDADAS</ThemedText>
            {connections.map((item, idx) => (
              <View key={idx} style={[styles.connCard, directIp === item.directIp && styles.connCardActive]}>
                <TouchableOpacity style={styles.connCardContent} onPress={() => selectConnection(item)}>
                  <View style={[styles.connDot, directIp === item.directIp && styles.connDotActive]} />
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.connName}>{item.name}</ThemedText>
                    <ThemedText style={styles.connIp}>{item.directIp}</ThemedText>
                  </View>
                  {directIp === item.directIp && (
                    <View style={styles.activeBadge}>
                      <ThemedText style={styles.activeBadgeText}>ACTIVA</ThemedText>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteConnection(item, idx)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Formulario */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <ThemedText style={styles.sectionLabel}>
              {connections.length > 0 ? 'AÑADIR / EDITAR' : 'NUEVA CONEXIÓN'}
            </ThemedText>
            {name !== '' && (
              <TouchableOpacity onPress={clearForm} style={styles.newBtn}>
                <Ionicons name="add-circle-outline" size={16} color="#0a7ea4" />
                <ThemedText style={styles.newBtnText}>Nueva Empresa</ThemedText>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Nombre de la Empresa</ThemedText>
            <View style={styles.inputWrapper}>
              <Ionicons name="business-outline" size={18} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Ej: Mi Tienda S.A."
                placeholderTextColor="#94a3b8"
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>IP del Servidor</ThemedText>
            <View style={styles.inputWrapper}>
              <Ionicons name="server-outline" size={18} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={directIp}
                onChangeText={(t) => { setDirectIp(t); setTestStatus('idle'); }}
                placeholder="192.168.1.x  ó  100.x.x.x (Tailscale)"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                keyboardType="default"
              />
            </View>
            <ThemedText style={styles.hint}>
              Red local: IP de tu PC • Fuera de oficina: IP de Tailscale
            </ThemedText>
          </View>

          {/* Botón de prueba */}
          <TouchableOpacity
            style={[
              styles.testBtn,
              testStatus === 'ok' && styles.testBtnOk,
              testStatus === 'error' && styles.testBtnError,
              isTesting && styles.testBtnLoading,
            ]}
            onPress={testDirectConnection}
            disabled={isTesting}
          >
            {isTesting ? (
              <ActivityIndicator color="#0a7ea4" size="small" />
            ) : (
              <Ionicons
                name={testStatus === 'ok' ? 'checkmark-circle' : testStatus === 'error' ? 'close-circle' : 'radio-button-on'}
                size={20}
                color={testStatus === 'ok' ? '#10b981' : testStatus === 'error' ? '#ef4444' : '#0a7ea4'}
              />
            )}
            <ThemedText style={[
              styles.testBtnText,
              testStatus === 'ok' && { color: '#10b981' },
              testStatus === 'error' && { color: '#ef4444' },
            ]}>
              {isTesting ? 'Probando conexión...' : testStatus === 'ok' ? 'Servidor encontrado' : testStatus === 'error' ? 'Sin respuesta' : 'Probar Conexión'}
            </ThemedText>
          </TouchableOpacity>

          {/* Botón guardar */}
          <TouchableOpacity style={styles.saveBtn} onPress={saveConnection}>
            <Ionicons name="save-outline" size={22} color="#fff" />
            <ThemedText style={styles.saveBtnText}>Guardar y Activar</ThemedText>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ThemedView>
  );
}

function InputField({ label, value, onChange, placeholder }: any) {
  return (
    <View style={{ gap: 5 }}>
      <ThemedText style={{ fontSize: 14, fontWeight: '600' }}>{label}</ThemedText>
      <TextInput
        style={{ backgroundColor: '#f1f5f9', padding: 12, borderRadius: 10, fontSize: 16, color: '#000' }}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder || `Ingresa ${label}`}
        placeholderTextColor="#666"
        autoCapitalize="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 24, paddingTop: 60 },

  header: { alignItems: 'center', marginBottom: 36 },
  iconWrapper: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#0a7ea4',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#0a7ea4', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { textAlign: 'center', color: '#64748b', lineHeight: 20 },

  section: { marginBottom: 28 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', letterSpacing: 1.5 },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f0f9ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  newBtnText: { fontSize: 12, fontWeight: '600', color: '#0a7ea4' },

  // Cards de conexión
  connCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#e2e8f0',
    marginBottom: 10, overflow: 'hidden',
  },
  connCardActive: { borderColor: '#0a7ea4', backgroundColor: '#f0f9ff' },
  connCardContent: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 14 },
  connDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#cbd5e1', marginRight: 12 },
  connDotActive: { backgroundColor: '#0a7ea4' },
  connName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  connIp: { fontSize: 12, color: '#64748b', marginTop: 2 },
  activeBadge: { backgroundColor: '#0a7ea4', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  activeBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  deleteBtn: { padding: 14, borderLeftWidth: 1, borderLeftColor: '#f1f5f9' },

  // Formulario
  inputGroup: { marginBottom: 18 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8fafc', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#e2e8f0',
    paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: 50, fontSize: 15, color: '#1e293b' },
  hint: { fontSize: 11, color: '#94a3b8', marginTop: 6, marginLeft: 4 },

  // Botón de prueba
  testBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 1.5, borderColor: '#0a7ea4',
    backgroundColor: '#f0f9ff',
    padding: 14, borderRadius: 12, marginBottom: 14,
  },
  testBtnOk: { borderColor: '#10b981', backgroundColor: '#f0fdf4' },
  testBtnError: { borderColor: '#ef4444', backgroundColor: '#fff1f2' },
  testBtnLoading: { opacity: 0.7 },
  testBtnText: { fontSize: 15, fontWeight: '600', color: '#0a7ea4' },

  // Botón guardar
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#0a7ea4', padding: 16, borderRadius: 14,
    shadowColor: '#0a7ea4', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
});
