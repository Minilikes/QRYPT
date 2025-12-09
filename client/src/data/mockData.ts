export interface Chat {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  isOnline: boolean;
  isPinned: boolean;
  isGroup: boolean;
}

export interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: string;
  status?: 'sent' | 'delivered' | 'read';
  reactions?: { emoji: string; count: number }[];
  replyTo?: { text: string; sender: string };
}

export const mockChats: Chat[] = [
  {
    id: '1',
    name: 'Sarah',
    lastMessage: 'The encryption keys look good! 🔐',
    timestamp: '2m',
    unreadCount: 2,
    isOnline: true,
    isPinned: true,
    isGroup: false,
  },
  {
    id: '2',
    name: 'Mike',
    lastMessage: 'Can you send me the documentation?',
    timestamp: '15m',
    unreadCount: 0,
    isOnline: false,
    isPinned: false,
    isGroup: false,
  },
  {
    id: '3',
    name: 'Dev Team',
    lastMessage: 'Alice: Meeting at 3 PM tomorrow',
    timestamp: '1h',
    unreadCount: 5,
    isOnline: true,
    isPinned: true,
    isGroup: true,
  },
  {
    id: '4',
    name: 'Emma',
    lastMessage: 'Thanks for the help!',
    timestamp: '2h',
    unreadCount: 0,
    isOnline: true,
    isPinned: false,
    isGroup: false,
  },
  {
    id: '5',
    name: 'Security Team',
    lastMessage: 'John: New security patch deployed',
    timestamp: '3h',
    unreadCount: 1,
    isOnline: true,
    isPinned: false,
    isGroup: true,
  },
];

export const mockMessages: Record<string, Message[]> = {
  '1': [
    {
      id: '1',
      text: 'Hey! How are you?',
      sender: 'Sarah',
      timestamp: '10:30 AM',
      status: 'read',
    },
    {
      id: '2',
      text: 'I\'m good! Just working on the new encryption features.',
      sender: 'me',
      timestamp: '10:32 AM',
      status: 'read',
    },
    {
      id: '3',
      text: 'That sounds exciting! Are you using RSA or AES?',
      sender: 'Sarah',
      timestamp: '10:33 AM',
      status: 'read',
    },
    {
      id: '4',
      text: 'We\'re using RSA for key exchange and AES-256 for the actual messages. Best of both worlds!',
      sender: 'me',
      timestamp: '10:35 AM',
      status: 'delivered',
      reactions: [{ emoji: '👍', count: 1 }, { emoji: '🔥', count: 1 }],
    },
    {
      id: '5',
      text: 'The encryption keys look good! 🔐',
      sender: 'Sarah',
      timestamp: '10:36 AM',
    },
  ],
  '2': [
    {
      id: '1',
      text: 'Hey Mike!',
      sender: 'me',
      timestamp: '9:15 AM',
      status: 'read',
    },
    {
      id: '2',
      text: 'Hi! Can you send me the documentation?',
      sender: 'Mike',
      timestamp: '9:45 AM',
    },
  ],
  '3': [
    {
      id: '1',
      text: 'Good morning team!',
      sender: 'Alice',
      timestamp: '8:00 AM',
    },
    {
      id: '2',
      text: 'Morning!',
      sender: 'me',
      timestamp: '8:05 AM',
      status: 'read',
    },
    {
      id: '3',
      text: 'Don\'t forget about our sprint planning today',
      sender: 'Bob',
      timestamp: '8:10 AM',
    },
    {
      id: '4',
      text: 'Meeting at 3 PM tomorrow',
      sender: 'Alice',
      timestamp: '9:00 AM',
      reactions: [{ emoji: '👍', count: 3 }],
    },
  ],
};
