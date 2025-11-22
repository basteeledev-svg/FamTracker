import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {useAuth} from '../context/AuthContext';

export const HomeScreen = () => {
  const {user, logout} = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome, {user?.name}!</Text>
      <Text style={styles.subtitle}>FamTracker Home</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🗺️ Map</Text>
        <Text style={styles.cardText}>
          See your family members' locations in real-time
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>👨‍👩‍👧‍👦 Family</Text>
        <Text style={styles.cardText}>
          Manage your family groups and members
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>⚡ Speed Tracking</Text>
        <Text style={styles.cardText}>
          Monitor speed vs speed limits
        </Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 5,
    color: '#000',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000',
  },
  cardText: {
    fontSize: 14,
    color: '#666',
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
