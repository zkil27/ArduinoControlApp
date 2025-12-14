import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, FontFamily, FontSizes } from '@/constants/theme';

export default function ModalScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>This is a modal</Text>
      <Link href="/" dismissTo style={styles.link}>
        <Text style={styles.linkText}>Go to home screen</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: Colors.background,
  },
  title: {
    fontFamily: FontFamily.mono,
    fontSize: FontSizes.xl,
    color: Colors.text,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontFamily: FontFamily.mono,
    fontSize: FontSizes.md,
    color: Colors.primary,
  },
});
