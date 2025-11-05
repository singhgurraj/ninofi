import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import AppNavigator from '../../src/navigation/AppNavigator';
import { persistor, store } from '../../src/store';

export default function Index() {
  return (
    <Provider store={store}>
      <PersistGate 
        loading={
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#1976D2" />
          </View>
        } 
        persistor={persistor}
      >
        <AppNavigator />
      </PersistGate>
    </Provider>
  );
}