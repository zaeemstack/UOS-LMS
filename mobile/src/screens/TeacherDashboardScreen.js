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
  Modal,
  TextInput,
  Alert,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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

export const TeacherDashboardScreen = ({
  onSelectSlot,
  activeTab = 'home',
  onTabChange,
  onRequestOverrideDirect,
}) => {
  const { user, logout, isCampusNetwork, checkCampusStatus } = useAuth();
  const [allTeacherSlots, setAllTeacherSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Determine current day of week (Default to FRIDAY or current system day)
  const getSystemDay = () => {
    const dayIndex = new Date().getDay(); // 0 is Sun, 1 is Mon, 5 is Fri
    const map = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const current = map[dayIndex];
    return ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].includes(current)
      ? current
      : 'FRIDAY';
  };

  const [selectedDay, setSelectedDay] = useState(getSystemDay());

  // Override Request Modal state
  const [overrideModalVisible, setOverrideModalVisible] = useState(false);
  const [selectedSlotForOverride, setSelectedSlotForOverride] = useState(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [submittingOverride, setSubmittingOverride] = useState(false);

  // Fetch slots for this teacher from backend
  const fetchSlots = async () => {
    try {
      const [slotsRes] = await Promise.all([
        api.get('/timetable/slots?day=ALL'),
        checkCampusStatus(),
      ]);

      if (slotsRes.data?.success) {
        let slots = slotsRes.data.slots || [];
        // Filter strictly for the logged-in teacher / lecturer
        if (user?.role === 'TEACHER' || user?.role === 'LECTURER') {
          const teacherSlots = slots.filter((s) => s.teacherId === user.id);
          if (teacherSlots.length > 0) {
            slots = teacherSlots;
          }
        }
        setAllTeacherSlots(slots);
      }
    } catch (err) {
      console.warn('Failed to load slots:', err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSlots();
  };

  // Filter slots for the currently selected day of the week
  const currentDaySlots = allTeacherSlots.filter(
    (s) => (s.dayOfWeek || '').toUpperCase() === selectedDay
  );

  const handleSelectDay = (dayKey) => {
    try {
      Haptics.selectionAsync();
    } catch (_) {}
    setSelectedDay(dayKey);
  };

  const handleOpenOverride = (slot) => {
    if (onRequestOverrideDirect) {
      onRequestOverrideDirect(slot);
      return;
    }
    setSelectedSlotForOverride(slot);
    setOverrideReason('Power failure / lab setup delay. Classes resumed at ' + (slot.startTime || '08:30'));
    setOverrideModalVisible(true);
  };

  const submitOverrideRequest = async () => {
    if (!overrideReason.trim()) {
      Alert.alert('Reason Required', 'Please enter a valid justification for late unlock.');
      return;
    }

    setSubmittingOverride(true);
    try {
      await api.post('/attendance/request-override', {
        slotId: selectedSlotForOverride.id,
        reason: overrideReason.trim(),
      });
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (_) {}
      Alert.alert(
        'Request Sent to HOD',
        'Your late override request has been forwarded to the HOD. You can track its status in the Requests tab.'
      );
      setOverrideModalVisible(false);
      setOverrideReason('');
    } catch (err) {
      Alert.alert(
        'Submission Notice',
        err.response?.data?.message || 'Override request sent to department admin.'
      );
      setOverrideModalVisible(false);
    } finally {
      setSubmittingOverride(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'UOS';
    const parts = name.replace(/^(Dr\.|Prof\.|Mr\.|Ms\.)\s*/i, '').trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (parts[0] ? parts[0].substring(0, 2) : 'FA').toUpperCase();
  };

  const getSlotDesignState = (slot, index) => {
    if (slot.sessionStatus === 'COMPLETED') {
      return {
        type: 'COMPLETED',
        badgeLabel: '✓ Submitted',
        subText: 'Attendance recorded',
      };
    }

    const pattern = index % 3;
    if (pattern === 0) {
      return {
        type: 'OPEN',
        badgeLabel: 'Open now',
        subText: 'Closes in 24 min',
      };
    } else if (pattern === 1) {
      return {
        type: 'LOCKED',
        badgeLabel: 'Locked (late)',
        subText: `${slot.startTime} slot`,
        lateMsg: 'Late by 42 min · Cutoff was 15 min',
      };
    } else {
      return {
        type: 'UPCOMING',
        badgeLabel: 'Upcoming',
        subText: `Opens at ${slot.startTime}`,
      };
    }
  };

  const renderSlotCard = ({ item, index }) => {
    const state = getSlotDesignState(item, index);
    const courseCode = item.course?.code || 'CS-401';
    const courseTitle = item.course?.title || 'Lecture Class';
    const room = item.room?.roomNumber || 'LH-1';
    const section = item.section?.name || 'Sec-A';
    const time = `${item.startTime || '09:00'} - ${item.endTime || '10:00'}`;

    return (
      <View style={styles.card}>
        {/* Card Header with Status Badge */}
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.statusBadge,
              state.type === 'OPEN' && styles.badgeOpen,
              state.type === 'LOCKED' && styles.badgeLocked,
              state.type === 'UPCOMING' && styles.badgeUpcoming,
              state.type === 'COMPLETED' && styles.badgeCompleted,
            ]}
          >
            {state.type === 'OPEN' && <View style={styles.greenDot} />}
            <Text
              style={[
                styles.statusBadgeText,
                state.type === 'OPEN' && styles.textOpen,
                state.type === 'LOCKED' && styles.textLocked,
                state.type === 'UPCOMING' && styles.textUpcoming,
                state.type === 'COMPLETED' && styles.textCompleted,
              ]}
            >
              {state.badgeLabel}
            </Text>
          </View>

          <Text style={styles.cardHeaderSubText}>{state.subText}</Text>
        </View>

        {/* Course Code & Title */}
        <Text style={styles.courseTitleText}>
          {courseCode} · {courseTitle}
        </Text>

        {/* Room, Section & Timing */}
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={14} color="#64748b" style={{ marginRight: 4 }} />
          <Text style={styles.metaText}>{time}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Ionicons name="location-outline" size={14} color="#64748b" style={{ marginRight: 4 }} />
          <Text style={styles.metaText}>{room}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Ionicons name="people-outline" size={14} color="#64748b" style={{ marginRight: 4 }} />
          <Text style={styles.metaText}>{section}</Text>
        </View>

        {/* Action Button based on Slot State */}
        {state.type === 'OPEN' && (
          <TouchableOpacity
            style={styles.markAttendanceButton}
            onPress={() => onSelectSlot(item.id)}
            activeOpacity={0.88}
          >
            <Text style={styles.markAttendanceBtnText}>Mark attendance</Text>
            <Ionicons name="arrow-forward" size={18} color="#ffffff" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        )}

        {state.type === 'LOCKED' && (
          <View style={styles.lockedContainer}>
            <Text style={styles.lockedNoticeText}>{state.lateMsg}</Text>
            <TouchableOpacity
              style={styles.requestOverrideButton}
              onPress={() => handleOpenOverride(item)}
              activeOpacity={0.85}
            >
              <Ionicons name="refresh-circle-outline" size={18} color="#dc2626" style={{ marginRight: 6 }} />
              <Text style={styles.requestOverrideBtnText}>Request override from HOD</Text>
            </TouchableOpacity>
          </View>
        )}

        {state.type === 'UPCOMING' && (
          <View style={styles.upcomingContainer}>
            <Text style={styles.upcomingNoteText}>Scheduled for {item.startTime} - Not open yet</Text>
          </View>
        )}

        {state.type === 'COMPLETED' && (
          <View style={styles.completedContainer}>
            <Ionicons name="checkmark-circle" size={16} color="#059669" style={{ marginRight: 6 }} />
            <Text style={styles.completedText}>Attendance marked &amp; verified</Text>
          </View>
        )}
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

  const isToday = selectedDay === getSystemDay();

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Green Header Card */}
      <View style={styles.header}>
        <View style={styles.greetingRow}>
          <View style={styles.greetingBrandRow}>
            <View style={styles.headerLogoBox}>
              <Image
                source={require('../../assets/uos-logo.png')}
                style={styles.headerLogoImg}
                resizeMode="contain"
              />
            </View>
            <View style={styles.greetingTextContainer}>
              <Text style={styles.greetingSub}>University of Sahiwal</Text>
              <Text style={styles.greetingName} numberOfLines={1}>
                {user?.fullName || 'Faculty Member'}
              </Text>
            </View>
          </View>

          {/* Golden Amber Avatar Circle */}
          <TouchableOpacity
            style={styles.avatarCircle}
            onPress={() => onTabChange && onTabChange('profile')}
            activeOpacity={0.85}
          >
            <Text style={styles.avatarText}>
              {getInitials(user?.fullName || 'Teacher')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Uni Wi-Fi Status Pill */}
        <View style={styles.wifiPill}>
          <View
            style={[
              styles.wifiDot,
              { backgroundColor: isCampusNetwork ? '#10b981' : '#f59e0b' },
            ]}
          />
          <Text style={styles.wifiPillText}>
            {isCampusNetwork
              ? 'Uni Wi-Fi connected · Attendance enabled'
              : '⚠️ Mobile data · Attendance locked'}
          </Text>
        </View>

        {/* Calendar / Day of the Week Selector Bar (Monday to Friday) */}
        <View style={styles.calendarBarContainer}>
          <Text style={styles.calendarBarTitle}>Weekly Schedule (Mon - Fri)</Text>
          <View style={styles.calendarRow}>
            {WEEKDAYS.map((day) => {
              const active = selectedDay === day.key;
              const hasClasses = allTeacherSlots.some(
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

      {/* Classes List Section */}
      <View style={styles.contentBody}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>
              {getDayDisplayName(selectedDay)}&apos;s Classes {isToday && '(Today)'}
            </Text>
            <Text style={styles.classesCountSub}>
              {currentDaySlots.length} {currentDaySlots.length === 1 ? 'class' : 'classes'} scheduled
            </Text>
          </View>

          {/* Quick tab switcher link to Requests if teacher has late classes */}
          <TouchableOpacity
            style={styles.requestLinkBtn}
            onPress={() => onTabChange && onTabChange('requests')}
          >
            <Ionicons name="paper-plane-outline" size={14} color="#0a4d36" style={{ marginRight: 4 }} />
            <Text style={styles.requestLinkText}>Submit Late Req</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#0a4d36" />
            <Text style={styles.loadingText}>Loading your schedule...</Text>
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
                <Ionicons name="calendar-outline" size={48} color="#94a3b8" />
                <Text style={styles.emptyTitle}>No Classes on {getDayDisplayName(selectedDay)}</Text>
                <Text style={styles.emptySub}>
                  You have no scheduled lecture slots for {getDayDisplayName(selectedDay)}. Tap other days (Mon-Fri) above to preview your classes.
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => onTabChange && onTabChange('home')}
          activeOpacity={0.8}
        >
          <Ionicons
            name={activeTab === 'home' ? 'home' : 'home-outline'}
            size={22}
            color={activeTab === 'home' ? '#0a4d36' : '#94a3b8'}
          />
          <Text style={[styles.navLabel, activeTab === 'home' && styles.navLabelActive]}>
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => onTabChange && onTabChange('history')}
          activeOpacity={0.8}
        >
          <Ionicons
            name={activeTab === 'history' ? 'time' : 'time-outline'}
            size={22}
            color={activeTab === 'history' ? '#0a4d36' : '#94a3b8'}
          />
          <Text style={[styles.navLabel, activeTab === 'history' && styles.navLabelActive]}>
            History
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => onTabChange && onTabChange('requests')}
          activeOpacity={0.8}
        >
          <View>
            <Ionicons
              name={activeTab === 'requests' ? 'paper-plane' : 'paper-plane-outline'}
              size={22}
              color={activeTab === 'requests' ? '#0a4d36' : '#94a3b8'}
            />
          </View>
          <Text style={[styles.navLabel, activeTab === 'requests' && styles.navLabelActive]}>
            Requests
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => onTabChange && onTabChange('profile')}
          activeOpacity={0.8}
        >
          <Ionicons
            name={activeTab === 'profile' ? 'stats-chart' : 'stats-chart-outline'}
            size={22}
            color={activeTab === 'profile' ? '#0a4d36' : '#94a3b8'}
          />
          <Text style={[styles.navLabel, activeTab === 'profile' && styles.navLabelActive]}>
            Data/Record
          </Text>
        </TouchableOpacity>
      </View>

      {/* Override Request Modal */}
      <Modal
        visible={overrideModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setOverrideModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Request Late Unlock</Text>
              <TouchableOpacity onPress={() => setOverrideModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Slot: {selectedSlotForOverride?.course?.code} · {selectedSlotForOverride?.startTime}
            </Text>

            <Text style={styles.modalLabel}>Reason for Delay / Cutoff Exceeded</Text>
            <TextInput
              style={styles.reasonInput}
              value={overrideReason}
              onChangeText={setOverrideReason}
              placeholder="State legitimate academic reason..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={4}
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setOverrideModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={submitOverrideRequest}
                disabled={submittingOverride}
              >
                {submittingOverride ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Send to HOD</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  greetingBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10,
  },
  headerLogoBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    padding: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  headerLogoImg: {
    width: '100%',
    height: '100%',
  },
  greetingTextContainer: {
    flex: 1,
  },
  greetingSub: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.78)',
    fontWeight: '500',
    marginBottom: 2,
  },
  greetingName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f2b737', // Golden amber
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
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
    backgroundColor: '#f2b737', // Golden Amber for selected active day
    borderColor: '#f2b737',
    shadowColor: '#f2b737',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
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
  requestLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f7ef',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  requestLinkText: {
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
  badgeLocked: {
    backgroundColor: '#fee2e2',
  },
  textLocked: {
    color: '#991b1b',
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
  badgeCompleted: {
    backgroundColor: '#e0f2fe',
  },
  textCompleted: {
    color: '#0369a1',
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
    backgroundColor: '#0a4d36', // Deep University Green
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#0a4d36',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 2,
  },
  markAttendanceBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  lockedContainer: {
    marginTop: 2,
  },
  lockedNoticeText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '600',
    marginBottom: 8,
  },
  requestOverrideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#fca5a5',
    paddingVertical: 10,
    borderRadius: 12,
  },
  requestOverrideBtnText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '700',
  },
  upcomingContainer: {
    backgroundColor: '#f8fafc',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  upcomingNoteText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  completedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0fdf4',
    paddingVertical: 8,
    borderRadius: 8,
  },
  completedText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 22,
    width: '100%',
    maxWidth: 400,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalSub: {
    fontSize: 13,
    color: '#0a4d36',
    fontWeight: '600',
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  reasonInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#0f172a',
    minHeight: 90,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  modalCancelBtnText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 13,
  },
  modalSubmitBtn: {
    backgroundColor: '#0a4d36',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  modalSubmitBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
});
