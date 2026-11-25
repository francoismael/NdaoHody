import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getConversation, getMyConversations, markConversationRead, sendMessage } from '../services/messagesService';

const CONVERSATION_REFRESH_MS = 4000;

export const messagesKeys = {
  all: ['messages'] as const,
  list: () => [...messagesKeys.all, 'list'] as const,
  detail: (conversationId: number) => [...messagesKeys.all, 'detail', conversationId] as const,
};

export const useMyConversations = () => useQuery({ queryKey: messagesKeys.list(), queryFn: getMyConversations });

/** Open conversation: refreshed often so the other side's messages appear. */
export const useConversation = (conversationId: number) =>
  useQuery({
    queryKey: messagesKeys.detail(conversationId),
    queryFn: () => getConversation(conversationId),
    refetchInterval: CONVERSATION_REFRESH_MS,
  });

function useMessagesMutation<TInput, TResult>(mutationFn: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries({ queryKey: messagesKeys.all }) });
}

export const useSendMessage = () =>
  useMessagesMutation(({ conversationId, contenu }: { conversationId: number; contenu: string }) => sendMessage(conversationId, contenu));

export const useMarkConversationRead = () => useMessagesMutation((conversationId: number) => markConversationRead(conversationId));
