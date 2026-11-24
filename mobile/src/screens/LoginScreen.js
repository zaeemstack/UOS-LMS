import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_API_URL } from '../api/client';

const { width } = Dimensions.get('window');

export const LoginScreen = () => {
  const { login, isCampusNetwork, serverUrl, updateServerUrl } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [customIp, setCustomIp] = useState(serverUrl);

  const handleLogin = async (overrideEmail, overridePass) => {
    const loginUser = (overrideEmail || email).trim();
    const loginPass = overridePass || password;

    if (!loginUser || !loginPass) {
      setError('Please enter your Employee ID / Email and password.');
      return;
    }

    setLoading(true);
    setError('');

    const res = await login(loginUser, loginPass);
    setLoading(false);

    if (!res.success) {
      setError(res.message);
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch (_) {}
    } else {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (_) {}
    }
  };

  const handleBiometricLogin = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        Alert.alert(
          'Biometrics Unavailable',
          'Please sign in with your password first or set up biometrics in your device settings.'
        );
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Sign in to UoS Attendance Portal',
        cancelLabel: 'Use Password',
        fallbackLabel: 'Use Password',
      });

      if (result.success) {
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (_) {}
        // Auto-login with default faculty credential
        handleLogin('dr.farooq', 'farooq123');
      }
    } catch (err) {
      Alert.alert('Authentication Error', err.message);
    }
  };

  const saveServerUrl = () => {
    if (customIp.trim()) {
      updateServerUrl(customIp.trim());
      setShowConfig(false);
      Alert.alert('Server Saved', `Connected to: ${customIp.trim()}`);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* Top Dark Green Header with Circular Design */}
        <View style={styles.topHeader}>
          {/* Decorative Translucent Shapes */}
          <View style={styles.decorativeCircle1} />
          <View style={styles.decorativeCircle2} />

          {/* Official University of Sahiwal Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/uos-logo.png')}
              style={styles.universityLogo}
              resizeMode="contain"
            />
          </View>

          {/* University Title & Subtitle */}
          <Text style={styles.universityTitle}>University of Sahiwal</Text>
          <Text style={styles.portalSubtitle}>
            Attendance &amp; Faculty Management Portal
          </Text>
        </View>

        {/* White Rounded Card Form Sheet */}
        <View style={styles.bottomCard}>
          {/* Campus Wi-Fi Status Pill */}
          <View
            style={[
              styles.wifiPill,
              isCampusNetwork ? styles.wifiPillGood : styles.wifiPillWarn,
            ]}
          >
            <Ionicons
              name={isCampusNetwork ? 'wifi' : 'wifi-outline'}
              size={15}
              color={isCampusNetwork ? '#0a4d36' : '#b45309'}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.wifiPillText,
                isCampusNetwork ? styles.wifiTextGood : styles.wifiTextWarn,
              ]}
            >
              {isCampusNetwork
                ? 'Campus Wi-Fi connected'
                : 'Campus Wi-Fi required to mark attendance'}
            </Text>
          </View>

          {/* Welcome Text */}
          <Text style={styles.welcomeTitle}>Welcome back</Text>
          <Text style={styles.welcomeSubtitle}>
            Sign in with your faculty account
          </Text>

          {/* Error Message Box */}
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color="#b91c1c" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Employee ID / Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Employee ID / Email</Text>
            <TextInput
              style={styles.textInput}
              placeholder="name@uosahiwal.edu.pk"
              placeholderTextColor="#94a3b8"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter password"
              placeholderTextColor="#94a3b8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {/* Sign In Primary Button (Golden/Amber) */}
          <TouchableOpacity
            style={[styles.signInButton, loading && styles.buttonDisabled]}
            onPress={() => handleLogin()}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#0f172a" />
            ) : (
              <Text style={styles.signInButtonText}>Sign in</Text>
            )}
          </TouchableOpacity>

          {/* Secondary Button: Use fingerprint / Face ID */}
          <TouchableOpacity
            style={styles.biometricButton}
            onPress={handleBiometricLogin}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons
              name="fingerprint"
              size={22}
              color="#0a4d36"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.biometricButtonText}>
              Use fingerprint / Face ID
            </Text>
          </TouchableOpacity>

          {/* Quick Login Chips for Instant Testing */}
          <View style={styles.quickChipsSection}>
            <Text style={styles.quickChipsTitle}>Quick Login (Demo / Test):</Text>
            <View style={styles.chipsRow}>
              <TouchableOpacity
                style={styles.chip}
                onPress={() => handleLogin('dr.farooq', 'farooq123')}
              >
                <Text style={styles.chipText}>👨‍🏫 Dr. Farooq (Teacher)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.chip}
                onPress={() => handleLogin('dr.asif', 'asif123')}
              >
                <Text style={styles.chipText}>🎓 Dr. Asif (HOD)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.chip}
                onPress={() => handleLogin('zaeem', 'zaeem123')}
              >
                <Text style={styles.chipText}>⚙️ Zaeem (Admin)</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Security Assurance Footer */}
          <Text style={styles.securityFooterText}>
            Secured by biometrics, campus IP check &amp; audit log
          </Text>

          {/* Server Config Toggle */}
          <TouchableOpacity
            style={styles.serverConfigToggle}
            onPress={() => setShowConfig(!showConfig)}
          >
            <Text style={styles.serverConfigToggleText}>
              ⚙️ Server: {serverUrl} (Tap to change)
            </Text>
          </TouchableOpacity>

          {showConfig && (
            <View style={styles.serverConfigBox}>
              <Text style={styles.serverConfigLabel}>Backend API Endpoint</Text>
              <TextInput
                style={styles.serverConfigInput}
                value={customIp}
                onChangeText={setCustomIp}
                placeholder="http://192.168.100.226:5000/api"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.saveServerBtn}
                onPress={saveServerUrl}
              >
                <Text style={styles.saveServerBtnText}>Update Server Address</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveServerBtn, { backgroundColor: '#f2b737', marginTop: 8 }]}
                onPress={() => {
                  setCustomIp(DEFAULT_API_URL);
                  updateServerUrl(DEFAULT_API_URL);
                  Alert.alert('Server Reset', `Updated to default: ${DEFAULT_API_URL}`);
                }}
              >
                <Text style={[styles.saveServerBtnText, { color: '#0a4d36' }]}>
                  🔄 Reset to Current PC IP (172.200.63.13)
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a4d36',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  topHeader: {
    backgroundColor: '#0a4d36',
    paddingTop: Platform.OS === 'ios' ? 56 : 42,
    paddingHorizontal: 24,
    paddingBottom: 32,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#125e44',
    opacity: 0.5,
  },
  decorativeCircle2: {
    position: 'absolute',
    top: 60,
    left: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#0d523a',
    opacity: 0.4,
  },
  logoContainer: {
    width: 84,
    height: 84,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  universityLogo: {
    width: '100%',
    height: '100%',
  },
  universityTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.2,
    marginBottom: 4,
    textAlign: 'center',
  },
  portalSubtitle: {
    fontSize: 14,
    color: '#d1fae5',
    fontWeight: '400',
    textAlign: 'center',
  },
  bottomCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  wifiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  wifiPillGood: {
    backgroundColor: '#e6f7ef',
  },
  wifiPillWarn: {
    backgroundColor: '#fef3c7',
  },
  wifiPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  wifiTextGood: {
    color: '#0a4d36',
  },
  wifiTextWarn: {
    color: '#b45309',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: '#991b1b',
    fontSize: 13,
    flex: 1,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 14,
    color: '#0f172a',
  },
  signInButton: {
    backgroundColor: '#f2b737',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: '#f2b737',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#0a4d36',
    borderRadius: 14,
    paddingVertical: 13,
    marginTop: 12,
  },
  biometricButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0a4d36',
  },
  quickChipsSection: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  quickChipsTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  securityFooterText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#64748b',
    marginTop: 20,
    fontWeight: '400',
  },
  serverConfigToggle: {
    marginTop: 12,
    alignItems: 'center',
  },
  serverConfigToggleText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  serverConfigBox: {
    marginTop: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
  },
  serverConfigLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  serverConfigInput: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: '#0f172a',
    marginBottom: 8,
  },
  saveServerBtn: {
    backgroundColor: '#0a4d36',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  saveServerBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
