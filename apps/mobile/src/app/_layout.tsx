import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#0B0F19',
          },
          headerTintColor: '#F8FAFC',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          contentStyle: {
            backgroundColor: '#0B0F19',
          },
        }}
      >
        <Stack.Screen 
          name="(main)/index" 
          options={{ 
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="(main)/editor" 
          options={{ 
            headerShown: false,
            presentation: 'fullScreenModal',
            animation: 'slide_from_bottom',
          }} 
        />
        <Stack.Screen 
          name="(main)/trash" 
          options={{ 
            title: 'Trash Bin Gallery',
          }} 
        />
        <Stack.Screen 
          name="(main)/ai" 
          options={{ 
            title: 'AI Note Assistant',
            presentation: 'modal',
          }} 
        />
        <Stack.Screen 
          name="(auth)/pin" 
          options={{ 
            headerShown: false,
            presentation: 'fullScreenModal',
          }} 
        />
        <Stack.Screen 
          name="(auth)/server" 
          options={{ 
            title: 'Server & Account',
          }} 
        />
      </Stack>
    </SafeAreaProvider>
  );
}
