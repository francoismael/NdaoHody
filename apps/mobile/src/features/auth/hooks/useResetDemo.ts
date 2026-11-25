import { useMutation } from '@tanstack/react-query';

import { resetDemo } from '../services/demoService';

/** PROVISIONAL (demo only): one gesture puts the whole demo back to its start. */
export function useResetDemo() {
  return useMutation({ mutationFn: resetDemo });
}
