import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useFormErrorTarget } from './formErrors';

export type ErrorAnchorProps = {
  /** true while the block shows an error: FormScreen can then scroll to it. */
  hasError: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * For a custom block of a form (e.g. a photo) that is not a TextField, ChoiceGroup or Stepper
 * (those already do it): lets `FormScreen.revealFirstError()` find it. Must be inside a FormScreen.
 */
export function ErrorAnchor({ hasError, children, style }: ErrorAnchorProps) {
  const target = useFormErrorTarget(hasError);
  return (
    <View ref={target} style={style}>
      {children}
    </View>
  );
}
