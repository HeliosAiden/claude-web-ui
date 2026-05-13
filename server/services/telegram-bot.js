import TelegramBot from 'node-telegram-bot-api';
import { telegramConfigDb } from '../modules/database/index.js';

/** Map of botToken -> { bot, chatIds: Set<chatId> } */
const botInstances = new Map();

export function ensureBotForToken(botToken) {
  if (!botToken) return null;

  const existing = botInstances.get(botToken);
  if (existing) {
    return existing.bot;
  }

  const bot = new TelegramBot(botToken, { polling: true });

  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(
      chatId,
      `Your Chat ID is: \`${chatId}\`\n\nUse this ID in your CloudCLI notification settings to receive alerts here.`,
      { parse_mode: 'Markdown' }
    ).catch((err) => {
      console.error('Telegram /start response error:', err?.message);
    });
  });

  bot.on('polling_error', (err) => {
    console.error('Telegram polling error:', err?.message);
  });

  botInstances.set(botToken, { bot, chatIds: new Set() });
  console.log('Telegram bot started for token:', botToken.substring(0, 10) + '...');
  return bot;
}

export function registerChatForToken(botToken, chatId) {
  const bot = ensureBotForToken(botToken);
  if (!bot) return;

  const instance = botInstances.get(botToken);
  instance.chatIds.add(String(chatId));
}

export function unregisterChatForToken(botToken, chatId) {
  const instance = botInstances.get(botToken);
  if (!instance) return;

  instance.chatIds.delete(String(chatId));

  if (instance.chatIds.size === 0) {
    stopBotForToken(botToken);
  }
}

export function stopBotForToken(botToken) {
  const instance = botInstances.get(botToken);
  if (!instance) return;

  instance.bot.stopPolling()
    .then(() => {
      console.log('Telegram bot stopped for token:', botToken.substring(0, 10) + '...');
    })
    .catch((err) => {
      console.error('Error stopping Telegram bot:', err?.message);
    });

  botInstances.delete(botToken);
}

export async function sendTelegramNotification(userId, text) {
  if (!userId || !text) return false;

  const config = telegramConfigDb.getConfig(userId);
  if (!config || !config.enabled) return false;

  try {
    const bot = ensureBotForToken(config.botToken);
    registerChatForToken(config.botToken, config.chatId);
    await bot.sendMessage(config.chatId, text, { parse_mode: 'HTML' });
    return true;
  } catch (err) {
    console.error('Telegram send error for user', userId, ':', err?.message);
    return false;
  }
}

export function initializeTelegramBots() {
  try {
    const configs = telegramConfigDb.getAllEnabledConfigs();
    const seenTokens = new Set();

    for (const config of configs) {
      if (!config.botToken || !config.chatId) continue;

      ensureBotForToken(config.botToken);
      const instance = botInstances.get(config.botToken);
      if (instance) {
        instance.chatIds.add(String(config.chatId));
        seenTokens.add(config.botToken);
      }
    }

    if (seenTokens.size > 0) {
      console.log(`Telegram: Started ${seenTokens.size} bot(s) for ${configs.length} user(s)`);
    }
  } catch (err) {
    console.error('Telegram initialization error:', err?.message);
  }
}

export function shutdownTelegramBots() {
  const stopPromises = [];
  for (const [token, instance] of botInstances.entries()) {
    stopPromises.push(
      instance.bot.stopPolling().catch(() => {})
    );
  }
  botInstances.clear();
  return Promise.all(stopPromises);
}
