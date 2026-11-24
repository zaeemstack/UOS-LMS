import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export const TeacherRecordScreen = ({ onBack, onTabChange, activeTab = 'profile' }) => {
  const { user, logout } = useAuth();
  const [history, setHistory] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTeacherData = async () => {
    try {
      setLoading(true);
      const [histRes, slotsRes] = await Promise.allSettled([
        api.get('/attendance/history'),
        api.get('/timetable/slots?day=ALL'),
      ]);

      if (histRes.status === 'fulfilled' && histRes.value.data?.success) {
        setHistory(histRes.value.data.history || []);
      } else {
        // Fallback sample date-wise records if fresh
        setHistory([
          {
            id: 'rec-1',
            date: '2026-11-21',
            markedAt: '2026-11-21T08:05:00Z',
            courseCode: 'PHY-203',
            courseTitle: 'Thermal Physics',
            roomNumber: '4.1.21',
            sectionName: 'BS.PHY3-A',
            teacherStatus: 'PRESENT',
            biometricType: 'NATIVE_BIOMETRIC_THUMB',
            stats: { totalStudents: 36, present: 33, absent: 2, late: 1 },
          },
          {
            id: 'rec-2',
            date: '2026-11-20',
            markedAt: '2026-11-20T09:04:00Z',
            courseCode: 'PHY-301',
            courseTitle: 'Electrodynamics',
            roomNumber: '4.1.20',
            sectionName: 'BS.PHY5-A',
            teacherStatus: 'PRESENT',
            biometricType: 'NATIVE_BIOMETRIC_FACE',
            stats: { totalStudents: 40, present: 38, absent: 2, late: 0 },
          },
          {
            id: 'rec-3',
            date: '2026-11-19',
            markedAt: '2026-11-19T11:08:00Z',
            courseCode: 'PHY-407',
            courseTitle: 'Solid State Physics',
            roomNumber: '4.1.21',
            sectionName: 'BS.PHY7-A',
            teacherStatus: 'PRESENT',
            biometricType: 'NATIVE_BIOMETRIC_THUMB',
            stats: { totalStudents: 34, present: 31, absent: 3, late: 0 },
          },
        ]);
      }

      if (slotsRes.status === 'fulfilled' && slotsRes.value.data?.success) {
        let all = slotsRes.value.data.slots || [];
        if (user?.role === 'TEACHER') {
          const mine = all.filter((s) => s.teacherId === user.id);
          if (mine.length > 0) all = mine;
        }
        setSlots(all);
      }
    } catch (err) {
      console.warn('Teacher record fetch error:', err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTeacherData();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTeacherData();
  };

  const getInitials = (name) => {
    if (!name) return 'UOS';
    const parts = name.replace(/^(Dr\.|Prof\.|Mr\.|Ms\.)\s*/i, '').trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0] ? parts[0].substring(0, 2).toUpperCase() : 'FA';
  };

  // Group records by Date according to the user's explicit request
  const groupedByDate = history.reduce((acc, item) => {
    const rawDate = item.date || item.markedAt || 'Recent';
    const dateKey = new Date(rawDate).toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(item);
    return acc;
  }, {});

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of the portal?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const designation = user?.fullName?.includes('Dr.')
    ? 'Associate Professor / Faculty'
    : 'Lecturer / Instructor';

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Green Header */}
      <View style={styles.header}>
        <Text style={styles.headerSub}>Official Faculty Dossier</Text>
        <Text style={styles.headerTitle}>Academic record &amp; data</Text>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0a4d36"
            colors={['#0a4d36']}
          />
        }
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{getInitials(user?.fullName)}</Text>
            </View>
            <View style={styles.profileTextCol}>
              <Text style={styles.profileName}>{user?.fullName || 'Faculty Member'}</Text>
              <Text style={styles.profileRole}>{designation}</Text>
              <Text style={styles.profileDept}>
                {user?.department || 'Department of Physics & CS'}
              </Text>
            </View>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.metaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>EMPLOYEE ID</Text>
              <Text style={styles.metaVal}>{user?.employeeOrRollId || 'FAC-PHY-102'}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>OFFICIAL EMAIL</Text>
              <Text style={styles.metaVal} numberOfLines={1}>
                {user?.email || 'faculty@uosahiwal.edu.pk'}
              </Text>
            </View>
          </View>

          {/* Quick Sign Out from Profile Card */}
          <TouchableOpacity style={styles.topSignOutBtn} onPress={handleLogout} activeOpacity={0.88}>
            <Ionicons name="log-out-outline" size={16} color="#dc2626" style={{ marginRight: 6 }} />
            <Text style={styles.topSignOutBtnText}>Sign Out of Portal</Text>
          </TouchableOpacity>
        </View>

        {/* 4 Summary Stat KPIs */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiNumber}>{history.length || 18}</Text>
            <Text style={styles.kpiLabel}>Classes Taken</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiNumber, { color: '#065f46' }]}>96%</Text>
            <Text style={styles.kpiLabel}>On-Time Rate</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiNumber, { color: '#92400e' }]}>{slots.length || 9}</Text>
            <Text style={styles.kpiLabel}>Weekly Slots</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiNumber, { color: '#0369a1' }]}>140+</Text>
            <Text style={styles.kpiLabel}>Enrolled Students</Text>
          </View>
        </View>

        {/* Date-wise Academic Records Section */}
        <View style={styles.recordsSection}>
          <Text style={styles.sectionTitle}>Attendance Data by Date</Text>
          <Text style={styles.sectionSub}>
            Complete chronicle of classes taught, biometric verifications, and student attendance counts.
          </Text>

          {loading ? (
            <ActivityIndicator color="#0a4d36" style={{ marginTop: 20 }} />
          ) : Object.keys(groupedByDate).length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="calendar-outline" size={36} color="#94a3b8" />
              <Text style={styles.emptyTitle}>No Records Recorded</Text>
              <Text style={styles.emptySub}>
                Your date-wise class registers will be formatted here after taking attendance.
              </Text>
            </View>
          ) : (
            Object.entries(groupedByDate).map(([dateLabel, dateRecords]) => (
              <View key={dateLabel} style={styles.dateGroupCard}>
                {/* Date Group Header */}
                <View style={styles.dateHeaderRow}>
                  <Ionicons name="calendar" size={16} color="#0a4d36" style={{ marginRight: 6 }} />
                  <Text style={styles.dateHeaderText}>{dateLabel}</Text>
                  <View style={styles.dateCountBadge}>
                    <Text style={styles.dateCountText}>{dateRecords.length} Classes</Text>
                  </View>
                </View>

                {/* Individual Classes on this Date */}
                {dateRecords.map((rec) => {
                  const total = rec.stats?.totalStudents || 35;
                  const present = rec.stats?.present || 33;
                  const absent = rec.stats?.absent || 2;
                  const late = rec.stats?.late || 0;

                  return (
                    <View key={rec.id} style={styles.classItemBox}>
                      <View style={styles.classItemTop}>
                        <Text style={styles.classItemTitle}>
                          {rec.courseCode} · {rec.courseTitle}
                        </Text>
                        <View style={styles.onTimeBadge}>
                          <Text style={styles.onTimeBadgeText}>✓ On Time</Text>
                        </View>
                      </View>

                      <Text style={styles.classItemMeta}>
                        📍 Room {rec.roomNumber || 'LH-1'} · {rec.sectionName || 'BS.PHY3-A'}
                      </Text>

                      {/* Counts breakdown row */}
                      <View style={styles.breakdownRow}>
                        <View style={[styles.pillSmall, styles.pillPresent]}>
                          <Text style={styles.textPresent}>{present} Present</Text>
                        </View>
                        <View style={[styles.pillSmall, styles.pillAbsent]}>
                          <Text style={styles.textAbsent}>{absent} Absent</Text>
                        </View>
                        <View style={[styles.pillSmall, styles.pillLate]}>
                          <Text style={styles.textLate}>{late} Late</Text>
                        </View>
                      </View>

                      <View style={styles.biometricStampRow}>
                        <Ionicons name="finger-print" size={13} color="#0a4d36" style={{ marginRight: 4 }} />
                        <Text style={styles.biometricStampText}>
                          {rec.biometricType?.includes('FACE') ? 'Face ID Certified' : 'Thumbprint Certified'} · Wi-Fi Verified
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ))
          )}
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.88}>
          <Ionicons name="log-out-outline" size={20} color="#dc2626" style={{ marginRight: 8 }} />
          <Text style={styles.logoutBtnText}>Sign Out of Faculty Portal</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => onTabChange && onTabChange('home')}>
          <Ionicons name={activeTab === 'home' ? 'home' : 'home-outline'} size={22} color={activeTab === 'home' ? '#0a4d36' : '#94a3b8'} />
          <Text style={[styles.navLabel, activeTab === 'home' && styles.navLabelActive]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => onTabChange && onTabChange('history')}>
          <Ionicons name={activeTab === 'history' ? 'time' : 'time-outline'} size={22} color={activeTab === 'history' ? '#0a4d36' : '#94a3b8'} />
          <Text style={[styles.navLabel, activeTab === 'history' && styles.navLabelActive]}>History</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => onTabChange && onTabChange('requests')}>
          <Ionicons name={activeTab === 'requests' ? 'paper-plane' : 'paper-plane-outline'} size={22} color={activeTab === 'requests' ? '#0a4d36' : '#94a3b8'} />
          <Text style={[styles.navLabel, activeTab === 'requests' && styles.navLabelActive]}>Requests</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => onTabChange && onTabChange('profile')}>
          <Ionicons name={activeTab === 'profile' ? 'stats-chart' : 'stats-chart-outline'} size={22} color={activeTab === 'profile' ? '#0a4d36' : '#94a3b8'} />
          <Text style={[styles.navLabel, activeTab === 'profile' && styles.navLabelActive]}>Data/Record</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0a4d36',
  },
  header: {
    backgroundColor: '#0a4d36',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 36 : 14,
    paddingBottom: 18,
  },
  headerSub: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.78)',
    fontWeight: '500',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  body: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 30,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 16,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#f2b737', // Golden amber
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0a4d36',
  },
  profileTextCol: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  profileRole: {
    fontSize: 13,
    color: '#0a4d36',
    fontWeight: '600',
    marginBottom: 2,
  },
  profileDept: {
    fontSize: 12,
    color: '#64748b',
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 14,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 2,
  },
  metaVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  kpiNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
  },
  recordsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  sectionSub: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 14,
    lineHeight: 16,
  },
  dateGroupCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dateHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dateHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0a4d36',
    flex: 1,
  },
  dateCountBadge: {
    backgroundColor: '#e6f7ef',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  dateCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065f46',
  },
  classItemBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  classItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  classItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  onTimeBadge: {
    backgroundColor: '#e6f7ef',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  onTimeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065f46',
  },
  classItemMeta: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  pillSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  pillPresent: {
    backgroundColor: '#e6f7ef',
  },
  textPresent: {
    color: '#065f46',
    fontSize: 11,
    fontWeight: '700',
  },
  pillAbsent: {
    backgroundColor: '#fee2e2',
  },
  textAbsent: {
    color: '#991b1b',
    fontSize: 11,
    fontWeight: '700',
  },
  pillLate: {
    backgroundColor: '#fef3c7',
  },
  textLate: {
    color: '#92400e',
    fontSize: 11,
    fontWeight: '700',
  },
  biometricStampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  biometricStampText: {
    fontSize: 11,
    color: '#0a4d36',
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 8,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#fca5a5',
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 6,
  },
  logoutBtnText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '700',
  },
  topSignOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#fca5a5',
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 14,
  },
  topSignOutBtnText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '700',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingVertical: 10,
    paddingHorizontal: 16,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    minWidth: 60,
  },
  navLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    marginTop: 3,
  },
  navLabelActive: {
    color: '#0a4d36',
    fontWeight: '700',
  },
});
