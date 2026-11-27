// The phone's notifications (simulated pushes today, FCM tomorrow): the only door to core/push.
export {
  dismissPushPrompt,
  getPushPermission,
  isPushPromptDismissed,
  preparePush,
  requestPushPermission,
  subscribePushTaps,
  takeLaunchTap,
} from '@/core/push/devicePush';
