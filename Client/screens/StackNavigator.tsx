import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { lazy, Suspense, useEffect, useState } from 'react';
import OverlayLoading from '@/components/OverlayLoading';
import React from 'react';

// 🚀 Lazy Load Screens (Except Settings, which loads instantly)
const ChatScreen = lazy(() => import('./ChatScreen'));
const PortfolioScreen = lazy(() => import('./PortfolioScreen'));

// 📌 Regular Imports (SettingsScreen Now Loads Instantly)
import HomeScreen from './HomeScreen';
import InvestmentsScreen from './InvestmentsScreen';
import NotificationsScreen from './NotificationsScreen';
import ProfileScreen from './Profile/ProfileScreen';
import Layout from './Layout';
import Login from './auth/Login';
import Signup from './auth/Signup';

import VerifyIdentity from './idVerification/VerifyIdentity';
import TothorScreen from './TothorScreen';
import testscreen from './testscreen';
import SettingsScreen from './settings/SettingsScreen';

const MemoizedLayout = React.memo(Layout);

const Stack = createStackNavigator();

const StackNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="MainApp"
        screenOptions={{
          detachPreviousScreen: true,
          headerShown: false,
        }}
      >
        {/* 🏆 Auth Screens */}
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="Signup" component={Signup} />
        <Stack.Screen name="VerifyIdentity" component={VerifyIdentity} />

        {/* 🏆 Main App with Layout */}
        <Stack.Screen name="MainApp" options={{ headerShown: false }}>
          {({ navigation }) => (
            <MemoizedLayout navigation={navigation}>
              <Stack.Navigator
                initialRouteName="Home"
                screenOptions={{
                  headerShown: false,
                  detachPreviousScreen: true,
                }}
              >
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="Investment" component={InvestmentsScreen} />
                <Stack.Screen name="Notifications" component={NotificationsScreen} />
                <Stack.Screen name="Profile" component={ProfileScreen} />
                <Stack.Screen name="Tothor" component={TothorScreen} />
                <Stack.Screen name="Portfolio" component={PortfolioScreen} />
                <Stack.Screen name="Settings" component={SettingsScreen} />
                <Stack.Screen name="test" component={testscreen} />

                {/* 🚀 Lazy Loaded Screens (Except Settings) */}
                <Stack.Screen name="Chat">
                  {() => (
                    <Suspense fallback={<OverlayLoading />}>
                      <ChatScreen navigation={navigation} />
                    </Suspense>
                  )}
                </Stack.Screen>

              </Stack.Navigator>
            </MemoizedLayout>
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default StackNavigator;
