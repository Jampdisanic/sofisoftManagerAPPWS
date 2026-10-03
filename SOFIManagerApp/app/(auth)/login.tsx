import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Keyboard,
  Dimensions,
  Modal,
  ScrollView
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { decrypt } from '@/constants/SecManager';
import { usePermissions } from '@/constants/PermissionsContext';

export default function LoginScreen() {
  const [isConfigured, setIsConfigured] = useState(false);
  const [checkingConfig, setCheckingConfig] = useState(true);

  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const router = useRouter();
  
  const { reloadPermissions } = usePermissions();

  // Nuevos estados para conexiones dinámicas y comprobación de estado de servidor
  const [connections, setConnections] = useState<any[]>([]);
  const [activeCompany, setActiveCompany] = useState('');
  const [activeIp, setActiveIp] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [connectionStatuses, setConnectionStatuses] = useState<Record<string, 'checking' | 'online' | 'offline'>>({});

  useEffect(() => {
    checkConfig();
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const checkConfig = async () => {
    try {
      setCheckingConfig(true);
      setErrorMsg(null);
      
      const savedConfig = await AsyncStorage.getItem('firebase_config');

      if (!savedConfig) {
        router.replace('/setup');
        return;
      }

      const config = JSON.parse(savedConfig);
      const ip = config.directIp;

      if (!ip) {
        router.replace('/setup');
        return;
      }

      setIsConfigured(true);
      setActiveCompany(config.name || '');
      setActiveIp(config.directIp || '');
      
      // Cargar conexiones guardadas para cambiar rápido
      const listStr = await AsyncStorage.getItem('sofimanager_connections_list');
      if (listStr) {
        const list = JSON.parse(listStr);
        setConnections(list);
      }

      await loadUsers(ip);
    } catch (e) {
      console.error('Error revisando configuración:', e);
      setErrorMsg("Error al leer la configuración guardada.");
    } finally {
      setCheckingConfig(false);
    }
  };

  const loadUsers = async (ip: string) => {
    try {
      setFetchingUsers(true);
      setErrorMsg(null);

      const cleanIp = ip.trim();
      const url = cleanIp.includes(':') ? `http://${cleanIp}/api/reports/usuarios` : `http://${cleanIp}:5246/api/reports/usuarios`;
      
      console.log('Intentando cargar usuarios desde:', url);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s para evitar colgar Expo

      const response = await fetch(url, { 
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const userList = await response.json();
        if (userList && userList.length > 0) {
          const normalized = userList.map((u: any) => {
            const entry: any = {};
            Object.keys(u).forEach(key => entry[key.toUpperCase()] = u[key]);
            return entry;
          });

          setUsers(normalized);
          setSelectedUser(normalized[0].NOMBRE);
          await AsyncStorage.setItem('cached_usuarios', JSON.stringify(normalized));
          return;
        } else {
          setErrorMsg("El servidor no retornó usuarios.");
        }
      } else {
        setErrorMsg(`Error del servidor: ${response.status}`);
      }
    } catch (e: any) {
      console.warn('Error de red al cargar usuarios:', e.message);
      
      // Fallback a caché
      const cached = await AsyncStorage.getItem('cached_usuarios');
      if (cached) {
        try {
          const userList = JSON.parse(cached);
          if (userList.length > 0) {
            setUsers(userList);
            setSelectedUser(userList[0].NOMBRE);
            return;
          }
        } catch (jsonErr) {
          console.error("Error al parsear caché de usuarios:", jsonErr);
        }
      }
      
      // Diagnóstico detallado del error de red
      let diagnosticMsg = 'Servidor fuera de línea. ';
      if (e.name === 'AbortError') {
        diagnosticMsg = `⏱ Timeout: El servidor no respondió en 6s. IP: ${ip}`;
      } else if (e.message?.includes('Network request failed')) {
        diagnosticMsg = `🔌 Red: No se puede alcanzar ${ip}:5246. ¿Están en la misma red?`;
      } else if (e.message?.includes('Failed to connect')) {
        diagnosticMsg = `🚫 Conexión rechazada en ${ip}:5246. ¿El servicio está corriendo?`;
      } else {
        diagnosticMsg = `❌ Error: ${e.message || 'Desconocido'} | IP: ${ip}`;
      }
      setErrorMsg(diagnosticMsg);
    } finally {
      setFetchingUsers(false);
    }
  };

  // Función para probar de manera segura el estado del servidor
  const testServerStatus = async (ip: string): Promise<boolean> => {
    try {
      const cleanIp = ip.trim();
      const url = cleanIp.includes(':') ? `http://${cleanIp}/api/reports/status` : `http://${cleanIp}:5246/api/reports/status`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // Timeout rápido de 2s
      
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      return res.ok;
    } catch {
      return false;
    }
  };

  // Probar todos los estados de servidor en paralelo de forma segura
  const checkAllStatuses = async (connectionsList: any[]) => {
    const statuses: Record<string, 'checking' | 'online' | 'offline'> = {};
    connectionsList.forEach(c => {
      statuses[c.directIp] = 'checking';
    });
    setConnectionStatuses({ ...statuses });

    // Lanzar pruebas en paralelo
    connectionsList.forEach(async (c) => {
      try {
        const isOnline = await testServerStatus(c.directIp);
        setConnectionStatuses(prev => ({
          ...prev,
          [c.directIp]: isOnline ? 'online' : 'offline'
        }));
      } catch (err) {
        setConnectionStatuses(prev => ({
          ...prev,
          [c.directIp]: 'offline'
        }));
      }
    });
  };

  // Cambiar de empresa/conexión activa si está activa/encendida
  const handleSwitchCompany = async (conn: any) => {
    const status = connectionStatuses[conn.directIp] || 'checking';
    
    if (status === 'offline') {
      Alert.alert(
        "❌ Servidor Inactivo",
        `El servidor de la empresa "${conn.name}" (${conn.directIp}) está apagado o no responde. Por favor, verifique que el equipo del servidor esté encendido y tenga el puerto 5246 abierto.`
      );
      return;
    }

    try {
      setLoading(true);
      await AsyncStorage.setItem('firebase_config', JSON.stringify(conn));
      setActiveCompany(conn.name);
      setActiveIp(conn.directIp);
      setShowModal(false);
      
      // Recargar usuarios
      await loadUsers(conn.directIp);
      Alert.alert("✅ Conectado", `Cambiaste con éxito a "${conn.name}".`);
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "No se pudo cambiar de servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!selectedUser || !password) {
      Alert.alert('Error', 'Por favor selecciona un usuario e ingresa la contraseña.');
      return;
    }

    setLoading(true);
    const userAccount = users.find(u => u.NOMBRE === selectedUser);

    if (userAccount) {
      try {
        const decryptedPass = decrypt(userAccount.CONTRASENA);
        if (decryptedPass === password) {
          const idRolUsuario = userAccount.IDROL || userAccount.ROL || userAccount.IdRol;
          await AsyncStorage.setItem('userName', userAccount.NOMBRE);
          if (idRolUsuario) {
             await AsyncStorage.setItem('userIdRol', idRolUsuario.toString());
          }

          // Descargar Permisos (RBAC) de este rol
          if (idRolUsuario && activeIp) {
            try {
              const cleanIp = activeIp.trim();
              const url = cleanIp.includes(':') ? `http://${cleanIp}/api/reports/permiroles` : `http://${cleanIp}:5246/api/reports/permiroles`;
              
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 3000);
              const response = await fetch(url, { signal: controller.signal });
              clearTimeout(timeoutId);
              
              if (response.ok) {
                const allPermiroles = await response.json();
                // Filtrar solo los permisos del rol del usuario actual
                // Nota: Aseguramos que los nombres de columnas coincidan sin importar mayúsculas/minúsculas
                const userPerms = allPermiroles.filter((p: any) => {
                   const rolId = p.IdRol || p.IDROL || p.idRol;
                   return rolId?.toString() === idRolUsuario.toString();
                });
                await AsyncStorage.setItem('user_permissions', JSON.stringify(userPerms));
                await reloadPermissions(); // Refrescar contexto global de React
                console.log(`Guardados ${userPerms.length} permisos para el Rol ${idRolUsuario}`);
              }
            } catch (permErr) {
              console.warn('No se pudieron descargar los permisos', permErr);
            }
          }

          router.replace('/(tabs)');
        } else {
          Alert.alert('Acceso Denegado', 'La contraseña es incorrecta.');
        }
      } catch (decryptErr) {
        console.error("Error descifrando contraseña:", decryptErr);
        Alert.alert('Error', 'No se pudo verificar la credencial.');
      }
    } else {
      Alert.alert('Error', 'Usuario no encontrado.');
    }
    setLoading(false);
  };

  if (checkingConfig) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <View style={styles.inner}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../assets/images/logoBuss.png')} 
              style={styles.logo}
              contentFit="contain"
            />
          </View>

          {/* DYNAMIC COMPANY SELECTOR PILL ABOVE MANAGER */}
          <TouchableOpacity 
            style={styles.activeCompanySelector} 
            onPress={() => {
              setShowModal(true);
              checkAllStatuses(connections);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="business" size={18} color="#60a5fa" style={{ marginRight: 8 }} />
            <Text style={styles.activeCompanyText} numberOfLines={1}>
              {activeCompany || 'Seleccionar Empresa'}
            </Text>
            <Ionicons name="swap-horizontal" size={14} color="#94a3b8" style={{ marginLeft: 8 }} />
          </TouchableOpacity>

          <Text style={styles.title}>MANAGER</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Seleccionar Usuario</Text>
          
          {errorMsg && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color="#ef4444" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          <View style={styles.pickerContainer}>
            <Ionicons name="person-outline" size={20} color="#64748b" style={styles.inputIcon} />
            {fetchingUsers ? (
              <ActivityIndicator size="small" color="#2563eb" style={{ marginLeft: 10 }} />
            ) : users.length > 0 ? (
              <Picker
                selectedValue={selectedUser}
                onValueChange={(itemValue) => setSelectedUser(itemValue)}
                style={styles.picker}
              >
                {users.map((user, index) => (
                  <Picker.Item key={index} label={user.NOMBRE} value={user.NOMBRE} />
                ))}
              </Picker>
            ) : (
              <TouchableOpacity 
                style={{ flex: 1, height: 56, justifyContent: 'center' }} 
                onPress={checkConfig}
              >
                <Text style={{ color: '#2563eb', fontWeight: 'bold' }}>Toca para reintentar carga</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.label}>Contraseña</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#64748b" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Ingresa tu clave"
              placeholderTextColor="#94a3b8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={loading || fetchingUsers}
          >
            {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.loginButtonText}>Ingresar</Text>}
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => {
              router.replace('/setup');
            }} 
            style={styles.refreshButton}
          >
            <Text style={styles.refreshText}>Gestionar Conexiones / IP</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 SOFISOFT</Text>
        </View>
      </View>

      {/* PREMIUM COMPANY SWITCHER MODAL */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="swap-horizontal" size={20} color="#60a5fa" style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>Cambiar de Empresa</Text>
              </View>
              <TouchableOpacity onPress={() => setShowModal(false)} style={styles.closeModalBtn}>
                <Ionicons name="close-circle" size={28} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Seleccione una empresa registrada. Solo se habilitan las conexiones con servidores encendidos y activos.
            </Text>

            <TouchableOpacity 
              style={styles.refreshModalBtn} 
              onPress={() => checkAllStatuses(connections)}
            >
              <Ionicons name="refresh-outline" size={16} color="#60a5fa" />
              <Text style={styles.refreshModalBtnText}>Actualizar estados de red</Text>
            </TouchableOpacity>

            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {connections.length === 0 ? (
                <View style={{ alignItems: 'center', marginTop: 40 }}>
                  <Ionicons name="wifi-outline" size={40} color="#475569" />
                  <Text style={styles.noConnectionsText}>
                    No tienes empresas registradas en Conexiones.
                  </Text>
                </View>
              ) : (
                connections.map((item, idx) => {
                  const status = connectionStatuses[item.directIp] || 'checking';
                  const isActive = activeIp === item.directIp;
                  
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.modalConnCard,
                        isActive && styles.modalConnCardActive,
                        status === 'offline' && styles.modalConnCardDisabled
                      ]}
                      onPress={() => handleSwitchCompany(item)}
                      activeOpacity={status === 'offline' ? 0.9 : 0.7}
                    >
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={[styles.modalConnName, isActive && { color: '#60a5fa' }]}>
                          {item.name}
                        </Text>
                        <Text style={styles.modalConnIp}>{item.directIp}</Text>
                      </View>

                      {/* Status indicator */}
                      <View style={styles.statusIndicatorContainer}>
                        {status === 'checking' && (
                          <ActivityIndicator size="small" color="#60a5fa" />
                        )}
                        {status === 'online' && (
                          <View style={styles.onlineBadge}>
                            <View style={[styles.statusDot, { backgroundColor: '#10b981' }]} />
                            <Text style={styles.statusBadgeTextOnline}>Online</Text>
                          </View>
                        )}
                        {status === 'offline' && (
                          <View style={styles.offlineBadge}>
                            <View style={[styles.statusDot, { backgroundColor: '#ef4444' }]} />
                            <Text style={styles.statusBadgeTextOffline}>Offline</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <TouchableOpacity 
              style={styles.manageBtn}
              onPress={() => {
                setShowModal(false);
                router.replace('/setup');
              }}
            >
              <Ionicons name="settings-outline" size={18} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.manageBtnText}>Gestionar Conexiones / IP</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111184' },
  inner: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
  header: { alignItems: 'center', marginBottom: 30 },
  logoContainer: { width: 330, height: 160, justifyContent: 'center', alignItems: 'center', marginBottom: 12, marginLeft: 14 },
  logo: { width: '100%', height: '100%' },
  
  // DYNAMIC COMPANY SELECTOR PILL
  activeCompanySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  activeCompanyText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    maxWidth: 200,
  },
  
  title: { fontSize: 22, fontFamily: 'Poppins-Bold', color: '#FFFFFF', marginBottom: -10, marginRight: 10 },
  form: { width: '100%', maxWidth: 340 },
  label: { fontSize: 14, fontWeight: '600', color: '#eeeeee', marginBottom: 8, marginLeft: 4 },
  pickerContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 16, marginBottom: 20, paddingHorizontal: 16, borderWidth: 1, borderColor: '#e2e8f0', height: 56 },
  picker: { flex: 1, marginLeft: -10, color: '#1e293b' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 16, marginBottom: 24, paddingHorizontal: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, height: 56, color: '#1e293b', fontSize: 16 },
  loginButton: { backgroundColor: '#2563eb', height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  loginButtonText: { color: '#ffffff', fontSize: 18, fontWeight: '600' },
  refreshButton: { marginTop: 20, alignItems: 'center' },
  refreshText: { color: '#ffffff', fontSize: 13, textDecorationLine: 'underline', opacity: 0.7 },
  footer: { position: 'absolute', top: Dimensions.get('window').height - 60, width: '100%', alignItems: 'center' },
  footerText: { color: '#d4d7db', fontSize: 12 },
  errorContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fee2e2', padding: 10, borderRadius: 12, marginBottom: 15, gap: 8 },
  errorText: { color: '#ef4444', fontSize: 13, fontWeight: '500', flex: 1 },

  // PREMIUM SWITCHER MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 24,
    width: '100%',
    maxWidth: 360,
    padding: 24,
    elevation: 10,
    maxHeight: '80%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff'
  },
  closeModalBtn: {
    padding: 2
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
    marginBottom: 16
  },
  refreshModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 6
  },
  refreshModalBtnText: {
    fontSize: 12,
    color: '#60a5fa',
    fontWeight: '600'
  },
  modalList: {
    marginBottom: 16
  },
  noConnectionsText: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center'
  },
  modalConnCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: 'transparent'
  },
  modalConnCardActive: {
    borderColor: '#60a5fa',
    backgroundColor: 'rgba(96, 165, 250, 0.08)'
  },
  modalConnCardDisabled: {
    opacity: 0.6
  },
  modalConnName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff'
  },
  modalConnIp: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2
  },
  
  // Status indicator badges
  statusIndicatorContainer: {
    minWidth: 60,
    alignItems: 'flex-end'
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 4
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 4
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  statusBadgeTextOnline: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: 'bold'
  },
  statusBadgeTextOffline: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: 'bold'
  },
  
  manageBtn: {
    flexDirection: 'row',
    backgroundColor: '#3b82f6',
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8
  },
  manageBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold'
  }
});
