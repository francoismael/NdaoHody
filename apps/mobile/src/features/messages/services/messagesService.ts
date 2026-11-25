import type { Conversation, Message } from '@contract';

import { request } from '@/core/mock';

export const getMyConversations = () => request<Conversation[]>('GET', '/me/conversations');

export const getConversation = (conversationId: number) => request<Conversation>('GET', `/conversations/${conversationId}`);

export const sendMessage = (conversationId: number, contenu: string) =>
  request<Message>('POST', `/conversations/${conversationId}/messages`, { contenu });

export const markConversationRead = (conversationId: number) =>
  request<Conversation>('POST', `/conversations/${conversationId}/read`);
