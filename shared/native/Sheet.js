// Bottom sheet: a ticket slid up from the bottom of the screen.
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './theme';
import T from './T';

export default function Sheet({ visible, onClose, title, children, dismissable = true }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={dismissable ? onClose : undefined} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable style={styles.backdrop} onPress={dismissable ? onClose : undefined} accessibilityLabel="Close" />
        <View style={[styles.sheet, { backgroundColor: theme.surface, paddingBottom: insets.bottom + 16 }]}>
          <View style={[styles.grip, { backgroundColor: theme.rule }]} />
          {title ? <T variant="headline" style={{ marginBottom: 14 }}>{title}</T> : null}
          <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>{children}</ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(22,33,62,0.45)' },
  sheet: { borderTopLeftRadius: 14, borderTopRightRadius: 14, paddingHorizontal: 20, paddingTop: 10, maxHeight: '88%' },
  grip: { width: 44, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 14 }
});
