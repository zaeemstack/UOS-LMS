import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export const ProfileModal = ({ visible, onClose, user, onSignOut }) => {
  if (!user) return null;

  const getInitials = (name) => {
    if (!name) return 'UOS';
    const parts = name.replace(/^(Dr\.|Prof\.|Mr\.|Ms\.)\s*/i, '').trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0] ? parts[0].substring(0, 2).toUpperCase() : 'FA';
  };

  const handleConfirmSignOut = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (_) {}

    Alert.alert(
      'Sign Out Confirmation',
      'Are you sure you want to sign out of the University of Sahiwal Attendance Portal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            onClose();
            if (onSignOut) onSignOut();
          },
        },
      ]
    );
  };

  const roleDisplay =
    user.role === 'HOD'
      ? 'Head of Department (HOD)'
      : user.role === 'ADMIN'
      ? 'System Administrator'
      : 'Faculty / Lecturer';

  const departmentDisplay =
    user.department?.name || user.department || 'Department of Physics';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Header Bar */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleWrap}>
              <Ionicons name="person-circle-outline" size={20} color="#0a4d36" style={{ marginRight: 6 }} />
              <Text style={styles.headerTitle}>Faculty Profile</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={24} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPad}>
            {/* Avatar & Main Identity */}
            <View style={styles.identitySection}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{getInitials(user.fullName)}</Text>
              </View>
              <Text style={styles.userName}>{user.fullName || 'Faculty Member'}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{roleDisplay}</Text>
              </View>
              <Text style={styles.deptText}>{departmentDisplay}</Text>
            </View>

            {/* Info Cards List */}
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <View style={styles.infoIconBox}>
                  <Ionicons name="card-outline" size={16} color="#0a4d36" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.infoLabel}>EMPLOYEE ID</Text>
                  <Text style={styles.infoValue}>{user.employeeOrRollId || 'FAC-PHY-102'}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <View style={styles.infoIconBox}>
                  <Ionicons name="mail-outline" size={16} color="#0a4d36" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.infoLabel}>OFFICIAL EMAIL</Text>
                  <Text style={styles.infoValue} numberOfLines={1}>
                    {user.email || 'faculty@uosahiwal.edu.pk'}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <View style={styles.infoIconBox}>
                  <Ionicons name="shield-checkmark-outline" size={16} color="#0a4d36" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.infoLabel}>SECURITY CLEARANCE</Text>
                  <Text style={styles.infoValue}>Biometrics &amp; Wi-Fi Authorized</Text>
                </View>
              </View>
            </View>

            {/* University Tag */}
            <View style={styles.universityBadgeRow}>
              <MaterialCommunityIcons name="school" size={16} color="#166534" style={{ marginRight: 6 }} />
              <Text style={styles.universityBadgeText}>University of Sahiwal · Attendance Portal</Text>
            </View>

            {/* Prominent Red Sign Out Button */}
            <TouchableOpacity
              style={styles.signOutBtn}
              onPress={handleConfirmSignOut}
              activeOpacity={0.88}
            >
              <Ionicons name="log-out-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.signOutBtnText}>Sign Out / Logout</Text>
            </TouchableOpacity>

            {/* Close Button */}
            <TouchableOpacity style={styles.dismissBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.dismissBtnText}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0a4d36',
  },
  scrollPad: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  identitySection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#f2b737',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0a4d36',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 4,
  },
  roleBadge: {
    backgroundColor: '#e6f7ef',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0a4d36',
  },
  deptText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.4,
    marginBottom: 1,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 10,
  },
  universityBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0fdf4',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  universityBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#166534',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc2626',
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 8,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  signOutBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  dismissBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  dismissBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
});
