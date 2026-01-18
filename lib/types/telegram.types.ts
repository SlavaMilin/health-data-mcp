export interface TelegramClientConfig {
  botToken: string;
  chatId: string;
}

export interface TelegramClient {
  sendMessage: (text: string) => Promise<void>;
}
