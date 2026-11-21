import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const QUICK_REASONS = [
  '⚡ Power outage in academic block',
  '🚗 Severe traffic delay / road blockage',
  '🔬 Lab apparatus & software setup delay',
  '👥 Extended previous departmental lecture',
  '📋 Official administrative meeting delay',
];

export const TeacherRequestScreen = ({ onBack, onTabChange, activeTab = 'requests' }) => {
  const { user } = useAuth();
  const [slots, setSlots] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [recentRequests, setRecentRequests] = useState([]);

  const fetchData = async () => {
    try {
      setLoadingSlots(true);
      const [slotsRes, reqRes] = await Promise.allSettled([
        api.get('/timetable/slots?day=ALL'),
        api.get('/attendance/override-requests'),
      ]);

      if (slotsRes.status === 'fulfilled' && slotsRes.value.data?.success) {
        let allSlots = slotsRes.value.data.slots || [];
        if (user?.role === 'TEACHER') {
          const teacherSlots = allSlots.filter((s) => s.teacherId === user.id);
          if (teacherSlots.length > 0) allSlots = teacherSlots;
        }
        setSlots(allSlots);
        if (allSlots.length > 0 && !selectedSlotId) {
          setSelectedSlotId(allSlots[0].id);
        }
      }

      if (reqRes.status === 'fulfilled' && reqRes.value.data?.success) {
        setRecentRequests(reqRes.value.data.requests || []);
      }
    } catch (err) {
      console.warn('Request screen data fetch error:', err?.message);
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleSelectQuickReason = (text) => {
    try {
      Haptics.selectionAsync();
    } catch (_) {}
    setReason(text);
  };

  const handleSubmitRequest = async () => {
    if (!selectedSlotId) {
      Alert.alert('Selection Required', 'Please select a lecture slot to request an override.');
      return;
    }

    if (!reason.trim()) {
      Alert.alert('Reason Required', 'Please explain why you arrived late or exceeded the 15-minute cutoff.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/attendance/request-override', {
        slotId: selectedSlotId,
        reason: reason.trim(),
      });

      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (_) {}

      Alert.alert(
        'Request Sent to HOD',
        'Your request has been successfully delivered to the Department Head. You will receive real-time notification once reviewed.'
      );

      setReason('');
      fetchData();
    } catch (err) {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch (_) {}
      Alert.alert(
        'Submission Status',
        err.response?.data?.message || 'Override request submitted to HOD.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const selectedSlotObj = slots.find((s) => s.id === selectedSlotId);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Green Header */}
        <View style={styles.header}>
          <Text style={styles.headerSub}>Late Arrival &amp; Lock Release</Text>
          <Text style={styles.headerTitle}>Request override from HOD</Text>
        </View>

        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Main Card: Request Form */}
          <View style={styles.formCard}>
            <Text style={styles.formSectionTitle}>1. Select Late / Locked Class</Text>

            {loadingSlots ? (
              <ActivityIndicator color="#0a4d36" style={{ marginVertical: 12 }} />
            ) : slots.length === 0 ? (
              <Text style={styles.noSlotsText}>No timetable slots assigned to your profile.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.slotPickerRow}>
                {slots.map((s) => {
                  const isSelected = s.id === selectedSlotId;
                  return (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.slotChip, isSelected && styles.slotChipSelected]}
                      onPress={() => setSelectedSlotId(s.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.slotChipDay, isSelected && styles.slotChipTextActive]}>
                        {s.dayOfWeek || 'TODAY'}
                      </Text>
                      <Text style={[styles.slotChipCode, isSelected && styles.slotChipTextActive]}>
                        {s.course?.code || 'Slot'}
                      </Text>
                      <Text style={[styles.slotChipTime, isSelected && styles.slotChipTextActive]}>
                        {s.startTime}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {selectedSlotObj && (
              <View style={styles.selectedSlotBanner}>
                <Ionicons name="time" size={16} color="#065f46" style={{ marginRight: 6 }} />
                <Text style={styles.selectedSlotText}>
                  {selectedSlotObj.course?.code} · {selectedSlotObj.course?.title} ({selectedSlotObj.startTime} - {selectedSlotObj.endTime})
                </Text>
              </View>
            )}

            {/* Quick Reasons Chips */}
            <Text style={[styles.formSectionTitle, { marginTop: 16 }]}>
              2. Quick Reason (Tap to Auto-fill)
            </Text>
            <View style={styles.quickChipsWrapper}>
              {QUICK_REASONS.map((q, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.quickChip}
                  onPress={() => handleSelectQuickReason(q)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.quickChipText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Reason Text Input */}
            <Text style={[styles.formSectionTitle, { marginTop: 16 }]}>
              3. Justification for Delay
            </Text>
            <TextInput
              style={styles.reasonInput}
              value={reason}
              onChangeText={setReason}
              placeholder="Explain genuine cause of delay so HOD can unlock slot..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={4}
            />

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmitRequest}
              disabled={submitting}
              activeOpacity={0.88}
            >
              {submitting ? (
                <ActivityIndicator color="#0a4d36" size="small" />
              ) : (
                <>
                  <Ionicons name="paper-plane" size={18} color="#0a4d36" style={{ marginRight: 8 }} />
                  <Text style={styles.submitBtnText}>Send Request to HOD</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Section: Your Recent Requests & Status */}
          <View style={styles.statusSection}>
            <Text style={styles.sectionHeaderTitle}>Live Request Status Tracker</Text>
            <Text style={styles.sectionHeaderSub}>
              Updates automatically when your Department HOD reviews your request.
            </Text>

            {recentRequests.length === 0 ? (
              <View style={styles.emptyStatusBox}>
                <Ionicons name="checkmark-circle-outline" size={32} color="#94a3b8" />
                <Text style={styles.emptyStatusText}>No pending requests right now.</Text>
              </View>
            ) : (
              recentRequests.map((req) => (
                <View key={req.id} style={styles.requestStatusCard}>
                  <View style={styles.statusHeaderRow}>
                    <Text style={styles.statusCourseCode}>
                      {req.timetableSlot?.course?.code || 'Slot'} · {req.timetableSlot?.startTime || '08:00'}
                    </Text>
                    <View
                      style={[
                        styles.badge,
                        req.status === 'PENDING' && styles.badgePending,
                        req.status === 'APPROVED' && styles.badgeApproved,
                        req.status === 'REJECTED' && styles.badgeRejected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          req.status === 'PENDING' && styles.textPending,
                          req.status === 'APPROVED' && styles.textApproved,
                          req.status === 'REJECTED' && styles.textRejected,
                        ]}
                      >
                        {req.status === 'PENDING' ? '⏳ Under Review' : req.status === 'APPROVED' ? '✓ Unlocked' : '✗ Rejected'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.statusReasonText}>{req.reason}</Text>

                  {req.reviewNotes && (
                    <Text style={styles.statusNoteText}>HOD Note: {req.reviewNotes}</Text>
                  )}
                </View>
              ))
            )}
          </View>
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
      </KeyboardAvoidingView>
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
  formCard: {
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
    marginBottom: 20,
  },
  formSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
  },
  slotPickerRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  slotChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 8,
    alignItems: 'center',
    minWidth: 84,
  },
  slotChipSelected: {
    backgroundColor: '#0a4d36',
    borderColor: '#0a4d36',
  },
  slotChipDay: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '700',
  },
  slotChipCode: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '800',
    marginVertical: 2,
  },
  slotChipTime: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  slotChipTextActive: {
    color: '#ffffff',
  },
  noSlotsText: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 8,
  },
  selectedSlotBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f7ef',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    marginBottom: 6,
  },
  selectedSlotText: {
    fontSize: 12,
    color: '#065f46',
    fontWeight: '600',
    flex: 1,
  },
  quickChipsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  quickChip: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  quickChipText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
  },
  reasonInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#0f172a',
    minHeight: 85,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  submitBtn: {
    backgroundColor: '#f2b737', // Golden amber
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#f2b737',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0a4d36',
  },
  statusSection: {
    marginTop: 4,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  sectionHeaderSub: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 12,
  },
  emptyStatusBox: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyStatusText: {
    marginTop: 8,
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },
  requestStatusCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusCourseCode: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgePending: {
    backgroundColor: '#fef3c7',
  },
  textPending: {
    color: '#92400e',
    fontWeight: '700',
    fontSize: 11,
  },
  badgeApproved: {
    backgroundColor: '#e6f7ef',
  },
  textApproved: {
    color: '#065f46',
    fontWeight: '700',
    fontSize: 11,
  },
  badgeRejected: {
    backgroundColor: '#fee2e2',
  },
  textRejected: {
    color: '#991b1b',
    fontWeight: '700',
    fontSize: 11,
  },
  badgeText: {
    fontSize: 11,
  },
  statusReasonText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
  },
  statusNoteText: {
    fontSize: 11,
    color: '#065f46',
    fontWeight: '600',
    marginTop: 6,
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
