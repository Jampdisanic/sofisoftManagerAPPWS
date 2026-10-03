import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/constants/ThemeContext';

export default function NotificationScreen() {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Cargar notificaciones
  const loadNotifications = async (isSilent = false) => {
    if (!isSilent) {
      if (notifications.length === 0) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
    }
    
    try {
      const configStr = await AsyncStorage.getItem('firebase_config');
      if (!configStr) {
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      const config = JSON.parse(configStr);
      const ip = config.directIp;
      if (!ip) {
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      const base = `http://${ip}:5246/api/reports`;
      // Traer notificaciones desde hace 7 días para tener histórico reciente
      const hace7Dias = new Date();
      hace7Dias.setDate(hace7Dias.getDate() - 7);
      const fechaFiltro = hace7Dias.toISOString().split('T')[0];

      const res = await fetch(`${base}/notificaciones?desde=${fechaFiltro}`);
      if (res.ok) {
        let data = await res.json();
        
        // NORMALIZACIÓN DE LLAVES A MAYÚSCULAS: Previene fallos por políticas camelCase/PascalCase del serializador JSON
        const normalized = data.map((item: any) => {
          const norm: any = {};
          Object.keys(item).forEach(key => {
            norm[key.toUpperCase()] = item[key];
          });
          return norm;
        });

        // Ordenar por fecha o timestamp descendente (más recientes primero)
        normalized.sort((a: any, b: any) => {
          const tA = a.TIMESTAMP || (a.FECHA ? new Date(a.FECHA).getTime() : 0);
          const tB = b.TIMESTAMP || (b.FECHA ? new Date(b.FECHA).getTime() : 0);
          return tB - tA;
        });

        setNotifications(normalized);
      }
    } catch (e) {
      console.error("Error al cargar notificaciones:", e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Cargar al enfocar la pantalla
  useFocusEffect(
    React.useCallback(() => {
      loadNotifications(false);
    }, [])
  );

  // Intervalo de recarga periódica silenciosa cada 12 segundos para detectar cambios en tiempo real
  useEffect(() => {
    const intervalId = setInterval(() => {
      loadNotifications(true);
    }, 12000);

    return () => clearInterval(intervalId);
  }, []);

  const getIconForType = (tipo: string) => {
    switch (tipo?.toLowerCase()) {
      case 'stock bajo': return { name: 'warning-outline', color: '#ef4444' };
      case 'venta': return { name: 'cash-outline', color: '#10b981' };
      case 'anulación': return { name: 'close-circle-outline', color: '#f43f5e' };
      case 'anulación de crédito': return { name: 'close-circle-outline', color: '#b91c1c' };
      case 'pago recibido': return { name: 'checkmark-circle-outline', color: '#10b981' };
      case 'abono recibido': return { name: 'wallet-outline', color: '#06b6d4' };
      case 'mora/vencimiento': return { name: 'calendar-outline', color: '#f59e0b' };
      default: return { name: 'notifications-outline', color: '#3b82f6' };
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}>
      <View style={[styles.header, { backgroundColor: isDark ? '#1e293b' : '#2563eb' }]}>
        <View style={styles.headerTop}>
           <ThemedText style={styles.headerTitle}>Notificaciones</ThemedText>
           <TouchableOpacity onPress={() => loadNotifications(false)} disabled={isLoading || isRefreshing}>
             <Ionicons 
               name={(isLoading || isRefreshing) ? "sync-outline" : "refresh-outline"} 
               size={24} 
               color="#fff" 
             />
           </TouchableOpacity>
        </View>
        <ThemedText style={styles.headerSubtitle}>Alertas automáticas en tiempo real de tu negocio</ThemedText>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={isDark ? '#60a5fa' : '#2563eb'} />
          <ThemedText style={{ marginTop: 12, color: '#94a3b8' }}>Buscando alertas nuevas...</ThemedText>
        </View>
      ) : (
        <ScrollView 
          style={styles.listContent} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadNotifications(false)}
              colors={['#2563eb']}
              tintColor={isDark ? '#fff' : '#2563eb'}
            />
          }
        >
          {notifications.length === 0 && (
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-off-outline" size={48} color={isDark ? "#475569" : "#cbd5e1"} />
              <ThemedText style={styles.emptyText}>No hay alertas ni notificaciones registradas</ThemedText>
            </View>
          )}

          {notifications.map((notif, index) => {
            const iconConfig = getIconForType(notif.TIPO);
            return (
              <View key={notif.ID || index} style={[styles.notificationCard, { backgroundColor: isDark ? '#1e293b' : '#ffffff' }]}>
                <View style={[styles.iconContainer, { backgroundColor: iconConfig.color + '20' }]}>
                  <Ionicons name={iconConfig.name as any} size={24} color={iconConfig.color} />
                </View>
                <View style={styles.infoCol}>
                  <View style={styles.cardHeader}>
                    <ThemedText style={[styles.moduleText, { color: iconConfig.color }]}>{notif.TIPO}</ThemedText>
                    <ThemedText style={styles.dateText}>{formatDate(notif.FECHA)}</ThemedText>
                  </View>
                  <ThemedText style={[styles.descriptionText, { color: isDark ? '#e2e8f0' : '#334155' }]}>
                    {notif.MENSAJE}
                  </ThemedText>
                </View>
              </View>
            );
          })}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#ffffff' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  listContent: { paddingHorizontal: 20, paddingTop: 20, flex: 1 },
  notificationCard: { flexDirection: 'row', padding: 16, borderRadius: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  iconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  infoCol: { flex: 1, justifyContent: 'center' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  moduleText: { fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  dateText: { fontSize: 11, color: '#94a3b8' },
  descriptionText: { fontSize: 13, fontWeight: '500', lineHeight: 18 },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 20, fontSize: 16, color: '#94a3b8', textAlign: 'center' }
});
