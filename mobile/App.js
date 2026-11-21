import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LoginScreen } from './src/screens/LoginScreen';
import { TeacherDashboardScreen } from './src/screens/TeacherDashboardScreen';
import { MarkAttendanceScreen } from './src/screens/MarkAttendanceScreen';
import { HodClassesScreen } from './src/screens/HodClassesScreen';
import { HodOverviewScreen } from './src/screens/HodOverviewScreen';
import { HodFacultyScreen } from './src/screens/HodFacultyScreen';
import { HodTimetableManagerScreen } from './src/screens/HodTimetableManagerScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { TeacherRequestScreen } from './src/screens/TeacherRequestScreen';
import { TeacherRecordScreen } from './src/screens/TeacherRecordScreen';

function MainNavigator() {
  const { user, loading } = useAuth();
  const [selectedSlotId, setSelectedSlotId] = useState(null);

  // Determine role
  const isHodOrAdmin = user?.role === 'HOD' || user?.role === 'ADMIN';

  // Navigation tab state (defaults to 'hod_classes' for HOD, 'home' for teacher)
  const [activeTab, setActiveTab] = useState(isHodOrAdmin ? 'hod_classes' : 'home');

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0a4d36" />
      </View>
    );
  }

  // Not logged in -> Show Public University Login Screen
  if (!user) {
    return <LoginScreen />;
  }

  // Attendance marking mode (When either teacher or HOD taps "Mark attendance")
  if (selectedSlotId) {
    return (
      <MarkAttendanceScreen
        slotId={selectedSlotId}
        onBack={() => setSelectedSlotId(null)}
      />
    );
  }

  // ==========================================
  // HOD & ADMIN INTERFACE FLOW
  // ==========================================
  if (isHodOrAdmin) {
    // Tab 1: HOD's Own Classes & Schedule (with Monday to Friday calendar)
    if (activeTab === 'hod_classes' || activeTab === 'home') {
      return (
        <HodClassesScreen
          onSelectSlot={(slotId) => setSelectedSlotId(slotId)}
          activeTab={activeTab === 'home' ? 'hod_classes' : activeTab}
          onTabChange={(tab) => setActiveTab(tab)}
        />
      );
    }

    // Tab 2: Department Overview & Override Requests (Approve / Reject)
    if (activeTab === 'overview' || activeTab === 'requests') {
      return (
        <HodOverviewScreen
          onBack={() => setActiveTab('hod_classes')}
          activeTab={activeTab === 'requests' ? 'overview' : activeTab}
          onTabChange={(tab) => setActiveTab(tab)}
        />
      );
    }

    // Tab 3: Faculty Roster & Individual Teacher Submitted Attendance Dossier
    if (activeTab === 'faculty') {
      return (
        <HodFacultyScreen
          onBack={() => setActiveTab('hod_classes')}
          activeTab="faculty"
          onTabChange={(tab) => setActiveTab(tab)}
        />
      );
    }

    // Tab 4: Timetable Engine, Paste/Import, Teacher Auto-Update & Versioning
    if (activeTab === 'timetable') {
      return (
        <HodTimetableManagerScreen
          onBack={() => setActiveTab('hod_classes')}
          activeTab="timetable"
          onTabChange={(tab) => setActiveTab(tab)}
        />
      );
    }
  }

  // ==========================================
  // TEACHER / LECTURER INTERFACE FLOW
  // ==========================================

  // Tab: History (Submitted attendance registers + Sent override requests)
  if (activeTab === 'history') {
    return (
      <HistoryScreen
        onBack={() => setActiveTab('home')}
        activeTab="history"
        onTabChange={(tab) => setActiveTab(tab)}
      />
    );
  }

  // Tab: Requests (Send late override request to HOD)
  if (activeTab === 'requests') {
    return (
      <TeacherRequestScreen
        onBack={() => setActiveTab('home')}
        activeTab="requests"
        onTabChange={(tab) => setActiveTab(tab)}
      />
    );
  }

  // Tab: Data/Record Profile (Teacher's entire academic record formatted by date)
  if (activeTab === 'profile') {
    return (
      <TeacherRecordScreen
        onBack={() => setActiveTab('home')}
        activeTab="profile"
        onTabChange={(tab) => setActiveTab(tab)}
      />
    );
  }

  // Default: Teacher / Lecturer Home Dashboard (Today's classes + Mon-Fri selector)
  return (
    <TeacherDashboardScreen
      onSelectSlot={(slotId) => setSelectedSlotId(slotId)}
      activeTab="home"
      onTabChange={(tab) => setActiveTab(tab)}
      onRequestOverrideDirect={() => setActiveTab('requests')}
    />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="light" backgroundColor="#0a4d36" />
      <MainNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0a4d36',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
