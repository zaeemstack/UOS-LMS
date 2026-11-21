import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const WEEKDAYS = [
  { key: 'MONDAY', label: 'Mon', shortDate: '17' },
  { key: 'TUESDAY', label: 'Tue', shortDate: '18' },
  { key: 'WEDNESDAY', label: 'Wed', shortDate: '19' },
  { key: 'THURSDAY', label: 'Thu', shortDate: '20' },
  { key: 'FRIDAY', label: 'Fri', shortDate: '21' },
];

export const HodClassesScreen = ({
  onSelectSlot,
  activeTab = 'hod_classes',
  onTabChange,
}) => {
  const { user, isCampusNetwork, checkCampusStatus } = useAuth();
  const [hodSlots, setHodSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getSystemDay = () => {
    const dayIndex = new Date().getDay();
    const map = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const current = map[dayIndex];
    return ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].includes(current)
      ? current
      : 'FRIDAY';
  };

  const [selectedDay, setSelectedDay] = useState(getSystemDay());

  const fetchHodSlots = async () => {
    try {
      const [slotsRes] = await Promise.all([
        api.get('/timetable/slots?day=ALL'),
        checkCampusStatus(),
      ]);

      if (slotsRes.data?.success) {
        const allSlots = slotsRes.data.slots || [];
        // Filter slots where HOD is the teacher
        const mySlots = allSlots.filter((s) => s.teacherId === user.id);
        setHodSlots(mySlots.length > 0 ? mySlots : allSlots.slice(0, 8));
      }
    } catch (err) {
      console.warn('Failed to load HOD slots:', err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHodSlots();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHodSlots();
  };

  const currentDaySlots = hodSlots.filter(
    (s) => (s.dayOfWeek || '').toUpperCase() === selectedDay
  );

  const handleSelectDay = (dayKey) => {
    try {
      Haptics.selectionAsync();
    } catch (_) {}
    setSelectedDay(dayKey);
  };

  const renderSlotCard = ({ item, index }) => {
    const isCompleted = item.sessionStatus === 'COMPLETED';
    const isOpen = index % 2 === 0;
    const courseCode = item.course?.code || 'MPHIL-705A';
    const courseTitle = item.course?.title || 'Solid State Physics & Nanotech';
    const room = item.room?.roomNumber || '4.1.21';
    const section = item.section?.name || 'MPHIL.PHY1';
    const time = `${item.startTime || '16:00'} - ${item.endTime || '17:00'}`;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.statusBadge,
              isOpen ? styles.badgeOpen : styles.badgeUpcoming,
            ]}
          >
            {isOpen && <View style={styles.greenDot} />}
            <Text
              style={[
                styles.statusBadgeText,
                isOpen ? styles.textOpen : styles.textUpcoming,
              ]}
            >
              {isCompleted ? '✓ Completed' : isOpen ? 'Open now' : 'Scheduled'}
            </Text>
          </View>
          <Text style={styles.cardHeaderSubText}>
            {isOpen ? 'Closes in 20 min' : 'Lecture Slot'}
          </Text>
        </View>

        <Text style={styles.courseTitleText}>
          {courseCode} · {courseTitle}
        </Text>

        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={14} color="#64748b" style={{ marginRight: 4 }} />
          <Text style={styles.metaText}>{time}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Ionicons name="location-outline" size={14} color="#64748b" style={{ marginRight: 4 }} />
          <Text style={styles.metaText}>Room {room}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Ionicons name="people-outline" size={14} color="#64748b" style={{ marginRight: 4 }} />
          <Text style={styles.metaText}>{section}</Text>
        </View>

        <TouchableOpacity
          style={styles.markAttendanceButton}
          onPress={() => onSelectSlot(item.id)}
          activeOpacity={0.88}
        >
          <Text style={styles.markAttendanceBtnText}>Mark class attendance</Text>
          <Ionicons name="arrow-forward" size={18} color="#ffffff" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      </View>
    );
  };

  const getDayDisplayName = (dayKey) => {
    switch (dayKey) {
      case 'MONDAY': return 'Monday';
      case 'TUESDAY': return 'Tuesday';
      case 'WEDNESDAY': return 'Wednesday';
      case 'THURSDAY': return 'Thursday';
      case 'FRIDAY': return 'Friday';
      default: return dayKey;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Green Header */}
      <View style={styles.header}>
        <View style={styles.greetingRow}>
          <View style={styles.greetingTextContainer}>
            <Text style={styles.greetingSub}>HOD Academic Register</Text>
            <Text style={styles.greetingName} numberOfLines={1}>
              {user?.fullName || 'Dr. M. Asif Nawaz'}
            </Text>
            <Text style={styles.greetingRole}>Head of Department · Teaching Timetable</Text>
          </View>

          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>AN</Text>
          </View>
        </View>

        {/* Network Pill */}
        <View style={styles.wifiPill}>
          <View
            style={[
              styles.wifiDot,
              { backgroundColor: isCampusNetwork ? '#10b981' : '#f59e0b' },
            ]}
          />
          <Text style={styles.wifiPillText}>
            {isCampusNetwork
              ? 'Campus Wi-Fi verified · Attendance unlocked'
              : '⚠️ Mobile data · Attendance locked'}
          </Text>
        </View>

        {/* Monday to Friday Calendar Bar */}
        <View style={styles.calendarBarContainer}>
          <Text style={styles.calendarBarTitle}>My Teaching Days (Mon - Fri)</Text>
          <View style={styles.calendarRow}>
            {WEEKDAYS.map((day) => {
              const active = selectedDay === day.key;
              const hasClasses = hodSlots.some(
                (s) => (s.dayOfWeek || '').toUpperCase() === day.key
              );

              return (
                <TouchableOpacity
                  key={day.key}
                  style={[styles.dayPill, active && styles.dayPillActive]}
                  onPress={() => handleSelectDay(day.key)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.dayLabel, active && styles.dayLabelActive]}>
                    {day.label}
                  </Text>
                  <Text style={[styles.dayDate, active && styles.dayDateActive]}>
                    {day.shortDate}
                  </Text>
                  {hasClasses && !active && <View style={styles.classIndicatorDot} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* Body */}
      <View style={styles.contentBody}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>
              {getDayDisplayName(selectedDay)}&apos;s Lectures
            </Text>
            <Text style={styles.classesCountSub}>
              {currentDaySlots.length} {currentDaySlots.length === 1 ? 'class' : 'classes'} taught by you
            </Text>
          </View>

          {/* Quick link to Overview */}
          <TouchableOpacity
            style={styles.overviewLinkBtn}
            onPress={() => onTabChange && onTabChange('overview')}
          >
            <Ionicons name="shield-checkmark-outline" size={14} color="#0a4d36" style={{ marginRight: 4 }} />
            <Text style={styles.overviewLinkText}>Dept Overview</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#0a4d36" />
            <Text style={styles.loadingText}>Loading your teaching schedule...</Text>
          </View>
        ) : (
          <FlatList
            data={currentDaySlots}
            keyExtractor={(item) => item.id}
            renderItem={renderSlotCard}
            contentContainerStyle={styles.listPadding}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#0a4d36"
                colors={['#0a4d36']}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyCard}>
                <Ionicons name="school-outline" size={48} color="#94a3b8" />
                <Text style={styles.emptyTitle}>No Lectures on {getDayDisplayName(selectedDay)}</Text>
                <Text style={styles.emptySub}>
                  You do not have any MPhil or PhD classes scheduled for {getDayDisplayName(selectedDay)}. Tap other days (Mon-Fri) above to view your lecture slots.
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* HOD Bottom Navigation Bar (4 Options) */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => onTabChange && onTabChange('hod_classes')}
          activeOpacity={0.8}
        >
          <Ionicons
            name={activeTab === 'hod_classes' ? 'calendar' : 'calendar-outline'}
            size={22}
            color={activeTab === 'hod_classes' ? '#0a4d36' : '#94a3b8'}
          />
          <Text style={[styles.navLabel, activeTab === 'hod_classes' && styles.navLabelActive]}>
            My Classes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => onTabChange && onTabChange('overview')}
          activeOpacity={0.8}
        >
          <Ionicons
            name={activeTab === 'overview' ? 'shield-checkmark' : 'shield-checkmark-outline'}
            size={22}
            color={activeTab === 'overview' ? '#0a4d36' : '#94a3b8'}
          />
          <Text style={[styles.navLabel, activeTab === 'overview' && styles.navLabelActive]}>
            Overview
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => onTabChange && onTabChange('faculty')}
          activeOpacity={0.8}
        >
          <Ionicons
            name={activeTab === 'faculty' ? 'people' : 'people-outline'}
            size={22}
            color={activeTab === 'faculty' ? '#0a4d36' : '#94a3b8'}
          />
          <Text style={[styles.navLabel, activeTab === 'faculty' && styles.navLabelActive]}>
            Faculty
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => onTabChange && onTabChange('timetable')}
          activeOpacity={0.8}
        >
          <Ionicons
            name={activeTab === 'timetable' ? 'layers' : 'layers-outline'}
            size={22}
            color={activeTab === 'timetable' ? '#0a4d36' : '#94a3b8'}
          />
          <Text style={[styles.navLabel, activeTab === 'timetable' && styles.navLabelActive]}>
            Timetable
          </Text>
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
    paddingBottom: 16,
  },
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  greetingTextContainer: {
    flex: 1,
    paddingRight: 12,
  },
  greetingSub: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.78)',
    fontWeight: '500',
    marginBottom: 2,
  },
  greetingName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  greetingRole: {
    fontSize: 12,
    color: '#f2b737',
    fontWeight: '600',
    marginTop: 2,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f2b737',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0a4d36',
  },
  wifiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    alignSelf: 'flex-start',
    marginBottom: 14,
  },
  wifiDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  wifiPillText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  calendarBarContainer: {
    marginTop: 2,
  },
  calendarBarTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.75)',
    marginBottom: 8,
  },
  calendarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  dayPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  dayPillActive: {
    backgroundColor: '#f2b737',
    borderColor: '#f2b737',
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 2,
  },
  dayLabelActive: {
    color: '#0a4d36',
    fontWeight: '800',
  },
  dayDate: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  dayDateActive: {
    color: '#0a4d36',
    fontWeight: '800',
  },
  classIndicatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#10b981',
    marginTop: 3,
  },
  contentBody: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  classesCountSub: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 1,
  },
  overviewLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f7ef',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  overviewLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0a4d36',
  },
  listPadding: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
    marginRight: 6,
  },
  badgeOpen: {
    backgroundColor: '#e6f7ef',
  },
  textOpen: {
    color: '#065f46',
    fontWeight: '700',
    fontSize: 12,
  },
  badgeUpcoming: {
    backgroundColor: '#fef3c7',
  },
  textUpcoming: {
    color: '#92400e',
    fontWeight: '700',
    fontSize: 12,
  },
  statusBadgeText: {
    fontSize: 12,
  },
  cardHeaderSubText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  courseTitleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  metaDot: {
    marginHorizontal: 6,
    color: '#cbd5e1',
    fontWeight: 'bold',
  },
  markAttendanceButton: {
    backgroundColor: '#0a4d36',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  markAttendanceBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginTop: 30,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
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
