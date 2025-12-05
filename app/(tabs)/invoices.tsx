import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import InvoiceDetailScreen from '../../src/screens/invoices/InvoiceDetailScreen';
import InvoiceEditScreen from '../../src/screens/invoices/InvoiceEditScreen';
import InvoiceListScreen from '../../src/screens/invoices/InvoiceListScreen';
import ScanOrUploadInvoiceScreen from '../../src/screens/invoices/ScanOrUploadInvoiceScreen';

const Stack = createStackNavigator();

export default function InvoicesTab() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="InvoiceList" component={InvoiceListScreen} />
      <Stack.Screen name="ScanOrUploadInvoice" component={ScanOrUploadInvoiceScreen} />
      <Stack.Screen name="InvoiceEdit" component={InvoiceEditScreen} />
      <Stack.Screen name="InvoiceDetail" component={InvoiceDetailScreen} />
    </Stack.Navigator>
  );
}
