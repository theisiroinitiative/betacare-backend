import pkg from '@whiskeysockets/baileys';
import pino from 'pino';
import bcrypt from 'bcryptjs';
import UserAuth from '../auth/authModel.js';
import WhatsAppJidMapping from '../auth/whatsapp-auth/whatsappMappingModel.js';
import { messageProcessor } from '../services/ai/ai-to-system-intepreter.js';
import { usePostgresAuthState } from './agentModel.js';
import redisClient from '../config/redisConfig.js';

const makeWASocket = pkg.default || pkg;
const { DisconnectReason } = pkg;

class WhatsAppBotService {
    constructor() {
        this.sock = null;
        this.authState = null;
        this.saveCreds = null;
    }

    async init() {
        try {
            // Load Auth once
            const { state, saveCreds } = await usePostgresAuthState();
            this.authState = state;
            this.saveCreds = saveCreds;
            await this.connect();
        } catch (error) {
            console.error("Failed to initialize Auth State:", error);
        }
    }

    async connect() {
        console.log("Connecting to WhatsApp...");
        this.sock = makeWASocket({
            auth: this.authState,
            printQRInTerminal: false,
            logger: pino({ level: 'silent' }),
            browser: ['Ubuntu', 'Chrome', '20.0.04']
        });

        this.sock.ev.on('creds.update', this.saveCreds);

        this.sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

                console.log(`Connection closed. Reason: ${statusCode}. Reconnecting: ${shouldReconnect}`);

                if (shouldReconnect) {
                    setTimeout(() => this.connect(), 5000);
                }
            } else if (connection === 'open') {
                console.log('WhatsApp bot is ready!');
            }
        });

        // Pairing Code Logic
        if (!this.sock.authState.creds.registered) {
            const phoneNumber = process.env.BOT_PHONE_NUMBER;
            if (phoneNumber) {
                setTimeout(async () => {
                    try {
                        const code = await this.sock.requestPairingCode(phoneNumber);
                        console.log(`\n=================================\nPAIRING CODE: ${code}\n=================================\n`);
                    } catch (err) {
                        console.error("Pairing code error:", err.message);
                    }
                }, 5000);
            }
        }

        // Message Listener
        this.sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type !== 'notify') return;
            const m = messages[0];
            if (!m.message || m.key.fromMe) return;
            await this.receiveMessage(m);
        });
    }

    /**
     * Send message to a phone number or JID.
     * @param {string} to - Phone number or WhatsApp JID
     * @param {string} text - Message text
     */
    async sendMessage(to, text) {
        if (!this.sock) {
            console.error("WhatsApp socket is not connected.");
            return;
        }

        const jid = to.includes('@') ? to : `${to.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
        try {
            await this.sock.sendMessage(jid, { text });
            console.log(`[WhatsAppBot] Message sent to ${jid}`);
        } catch (error) {
            console.error(`[WhatsAppBot] Failed to send message to ${jid}:`, error.message);
        }
    }

    /**
     * Receive and process an incoming message.
     * @param {object} message - Baileys message object
     */
    async receiveMessage(message) {
        const senderJid = message.key.remoteJid;
        const text = (message.message.conversation || message.message.extendedTextMessage?.text || '').trim();

        if (!text) return;

        console.log(`[WhatsAppBot] Received message from ${senderJid}: "${text}"`);

        // Check if message is a WhatsApp verification code (e.g. XXXXXX-2348067651234)
        const codePattern = /^([A-Z0-9]{6})-(\d+)$/i;
        const match = text.match(codePattern);

        if (match) {
            const verificationCode = match[0];
            const phoneNumber = match[2];

            try {
                // Fetch hashed code from Redis
                const storedHash = await redisClient.get(phoneNumber);

                if (!storedHash) {
                    await this.sendMessage(senderJid, 'Invalid or expired WhatsApp verification code. Please request a new one from the platform.');
                    return;
                }

                // Verify code hash
                const isValid = await bcrypt.compare(verificationCode, storedHash);
                if (!isValid) {
                    await this.sendMessage(senderJid, 'Invalid or expired WhatsApp verification code. Please request a new one from the platform.');
                    return;
                }

                // Update verification status in DB
                const user = await UserAuth.findOne({ where: { phoneNumber } });
                if (user) {
                    user.isWhatsappVerified = true;
                    await user.save();
                }

                // Save Baileys JID mapping to DB
                await WhatsAppJidMapping.upsert({
                    phoneNumber,
                    whatsappJid: senderJid
                });

                // Clear Redis code
                await redisClient.del(phoneNumber);

                // Send confirmation
                await this.sendMessage(senderJid, 'Your WhatsApp number has been successfully verified! You can now interact with BetaCare AI.');
            } catch (error) {
                console.error('[WhatsAppBot] Error during verification flow:', error);
                await this.sendMessage(senderJid, 'An error occurred during verification. Please try again later.');
            }
            return;
        }

        // Standard message processing
        try {
            // Check if user is verified/mapped
            const mapping = await WhatsAppJidMapping.findOne({ where: { whatsappJid: senderJid } });
            if (!mapping) {
                await this.sendMessage(senderJid, 'Your WhatsApp number is not verified. Please register and verify your account on our web platform first.');
                return;
            }

            const user = await UserAuth.findOne({ where: { phoneNumber: mapping.phoneNumber } });
            if (!user) {
                await this.sendMessage(senderJid, 'User account not found. Please register on the web platform.');
                return;
            }

            // Process message via AI interpreter
            const reply = await messageProcessor(text, user.phoneNumber);

            // Send reply back
            await this.sendMessage(senderJid, reply);
        } catch (error) {
            console.error('[WhatsAppBot] Error processing message:', error);
            await this.sendMessage(senderJid, 'Sorry, I encountered an error while processing your message.');
        }
    }
}

const whatsappBotService = new WhatsAppBotService();
export default whatsappBotService;