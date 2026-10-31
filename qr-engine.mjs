import express from 'express';
import cors from 'cors';
import axios from 'axios';
import * as QRCode from 'qrcode';
import pino from 'pino';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import * as baileysPkg from '@whiskeysockets/baileys';

const makeWASocket = baileysPkg.default?.default || baileysPkg.default || baileysPkg.makeWASocket;
const useMultiFileAuthState = baileysPkg.useMultiFileAuthState || baileysPkg.default?.useMultiFileAuthState;
const DisconnectReason = baileysPkg.DisconnectReason || baileysPkg.default?.DisconnectReason;
const fetchLatestBaileysVersion = baileysPkg.fetchLatestBaileysVersion || baileysPkg.default?.fetchLatestBaileysVersion;
const downloadMediaMessage = baileysPkg.downloadMediaMessage || baileysPkg.default?.downloadMediaMessage;
const downloadContentFromMessage = baileysPkg.downloadContentFromMessage || baileysPkg.default?.downloadContentFromMessage;
const generateWAMessageFromContent = baileysPkg.generateWAMessageFromContent || baileysPkg.default?.generateWAMessageFromContent;
const proto = baileysPkg.proto || baileysPkg.default?.proto;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const AUDIT_PROMPT = `
Você é um auditor financeiro sênior especializado em validar comprovantes de transferência PIX brasileiros para e-commerce e infoprodutos.
Sua missão é analisar meticulosamente a imagem ou PDF do comprovante anexado e verificar se a transferência PIX foi REALMENTE EFETIVADA e CONCLUÍDA.

REGRAS CRÍTICAS DE AUDITORIA:
1. Status: Se estiver escrito "Agendamento", "Agendado", "Em processamento" ou indicar uma data futura, o status DEVE ser "AGENDADO" e isValidPix DEVE ser false. Agendamento NÃO é pagamento realizado!
2. Só aprove ("isValidPix": true) se houver termos claros como "Comprovante de Transferência PIX", "PIX Realizado", "Pagamento Efetuado", "Concluído", "Sucesso" ou código de autenticação/id de transação comprovada.
3. Extraia o valor numérico exato pago (ex: se for R$ 415,66, retorne 415.66).
4. Extraia o nome do destinatário / favorecido e o banco se legíveis.

Retorne EXCLUSIVAMENTE um JSON:
{
  "isValidPix": boolean,
  "status": "CONCLUIDO" | "AGENDADO" | "FALHOU",
  "valor": number,
  "destinatario": string,
  "chavePix": string,
  "dataHora": string,
  "idTransacao": string,
  "banco": string,
  "rejectionReason": string | null
}
`;

async function getMediaBuffer(msg, sock) {
    if (downloadMediaMessage) {
        try {
            return await downloadMediaMessage(
                msg,
                'buffer',
                {},
                { reuploadRequest: sock?.updateMediaMessage }
            );
        } catch (e) {
            console.warn('[Media Download] downloadMediaMessage aviso:', e.message);
        }
    }
    const messageContent = msg.message;
    const type = messageContent?.imageMessage ? 'image' : messageContent?.documentMessage ? 'document' : null;
    const mediaObj = messageContent?.imageMessage || messageContent?.documentMessage;
    if (downloadContentFromMessage && type && mediaObj) {
        try {
            const stream = await downloadContentFromMessage(mediaObj, type);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            return buffer;
        } catch (e) {
            console.warn('[Media Download] downloadContentFromMessage aviso:', e.message);
        }
    }
    return null;
}

async function auditPixReceiptWithGemini(mediaBuffer, mimeType, expectedAmount = 19.90, beneficiary = 'Carol') {
    if (!GEMINI_API_KEY) {
        console.warn('[PIX Auditor] Nenhuma chave GEMINI_API_KEY configurada.');
        return { isValid: false, reason: 'Chave da IA não configurada no servidor.' };
    }

    try {
        const base64Data = mediaBuffer.toString('base64');
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`;
        
        const response = await axios.post(
            url,
            {
                contents: [
                    {
                        parts: [
                            { text: AUDIT_PROMPT },
                            {
                                inline_data: {
                                    mime_type: (mimeType && mimeType.includes('pdf')) ? 'application/pdf' : 'image/jpeg',
                                    data: base64Data,
                                },
                            },
                        ],
                    },
                ],
                generationConfig: {
                    response_mime_type: 'application/json',
                },
            },
            { headers: { 'Content-Type': 'application/json' }, timeout: 25000 }
        );

        const textOutput = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsed = JSON.parse(textOutput);
        console.log('[PIX Auditor] 🧠 Resultado da IA:', JSON.stringify(parsed));

        if (parsed.status !== 'CONCLUIDO') {
            return {
                isValid: false,
                reason: 'O comprovante enviado parece ser um agendamento ou ainda não foi concluído.',
                details: parsed,
            };
        }

        if (typeof parsed.valor === 'number') {
            const minAllowed = expectedAmount <= 25 ? 4.50 : expectedAmount * 0.95;
            if (parsed.valor < minAllowed) {
                return {
                    isValid: false,
                    reason: `O valor do comprovante (R$ ${parsed.valor.toFixed(2).replace('.', ',')}) é inferior à contribuição mínima aceita.`,
                    details: parsed,
                };
            }
        }

        if (parsed.destinatario && typeof parsed.destinatario === 'string') {
            const destLower = parsed.destinatario.toLowerCase();
            const benLower = (beneficiary || 'carol').toLowerCase();
            const isKnownUtility = ['celesc', 'enel', 'sabesp', 'copel', 'cemig', 'cpfl', 'claro', 'vivo', 'tim'].some(u => destLower.includes(u));
            const isValidBeneficiary =
                destLower.includes(benLower) ||
                destLower.includes('gps') ||
                destLower.includes('ebooks') ||
                destLower.includes('digitais') ||
                destLower.includes('67039217') ||
                destLower.includes('carol') ||
                destLower.includes('pagamento');
            if (isKnownUtility || !isValidBeneficiary) {
                return {
                    isValid: false,
                    reason: `O destinatário do comprovante (${parsed.destinatario}) não corresponde ao pagamento correto (${beneficiary}).`,
                    details: parsed,
                };
            }
        }

        return { isValid: true, details: parsed };
    } catch (err) {
        console.error('[PIX Auditor] Erro na API do Gemini:', err?.response?.data || err?.message);
        return { isValid: false, reason: 'Não foi possível ler com nitidez as informações do comprovante.' };
    }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 5050;
const CLOUD_WORKER_URL = (process.env.CLOUD_WORKER_URL || 'https://carol-chatbot.guilhermealita.workers.dev').replace(/\/$/, '');
const PUBLIC_ENGINE_URL = process.env.RENDER_EXTERNAL_URL || process.env.PUBLIC_ENGINE_URL || null;

// Store sessions in /tmp or home dir so iCloud Drive sync never locks WhatsApp session files!
const HOME_DIR = process.env.HOME || '/tmp';
const BASE_RUNTIME_DIR = path.join(HOME_DIR, '.wafb_carol_runtime');
const SESSIONS_DIR = path.join(BASE_RUNTIME_DIR, 'wa_sessions');
const STORE_FILE = path.join(BASE_RUNTIME_DIR, 'qr_store.json');

if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

// ─── Cloud KV Persistence Helpers (Never lose QR session on container restart) ───
async function restoreSessionFromCloudKv(botId, sessionFolder) {
    try {
        const credsPath = path.join(sessionFolder, 'creds.json');
        if (fs.existsSync(credsPath)) return true; // Already present on disk

        const res = await axios.get(`${CLOUD_WORKER_URL}/api/cloud-kv/auth?botId=${encodeURIComponent(botId)}`, {
            timeout: 6000,
        });
        const filesMap = res.data?.data;
        if (!filesMap || typeof filesMap !== 'object' || !filesMap['creds.json']) {
            return false;
        }
        if (!fs.existsSync(sessionFolder)) {
            fs.mkdirSync(sessionFolder, { recursive: true });
        }
        for (const [fileName, content] of Object.entries(filesMap)) {
            if (typeof content === 'string' && fileName.endsWith('.json')) {
                fs.writeFileSync(path.join(sessionFolder, fileName), content, 'utf-8');
            }
        }
        console.log(`[Cloud KV] ☁️ Sessão WhatsApp restaurada da nuvem Cloudflare (${ Object.keys(filesMap).length } arquivos)`);
        return true;
    } catch (err) {
        return false;
    }
}

let backupDebounceTimer = null;
function scheduleCloudKvAuthBackup(botId, sessionFolder) {
    if (backupDebounceTimer) clearTimeout(backupDebounceTimer);
    backupDebounceTimer = setTimeout(async () => {
        try {
            if (!fs.existsSync(sessionFolder)) return;
            const files = fs.readdirSync(sessionFolder).filter((f) => f.endsWith('.json'));
            if (!files.includes('creds.json')) return;
            const filesMap = {};
            for (const f of files) {
                filesMap[f] = fs.readFileSync(path.join(sessionFolder, f), 'utf-8');
            }
            await axios.post(
                `${CLOUD_WORKER_URL}/api/cloud-kv/auth?botId=${encodeURIComponent(botId)}`,
                { authData: filesMap },
                { timeout: 8000 }
            );
        } catch {}
    }, 1500);
}

async function clearCloudKvAuth(botId) {
    try {
        await axios.delete(`${CLOUD_WORKER_URL}/api/cloud-kv/auth?botId=${encodeURIComponent(botId)}`, {
            timeout: 5000,
        });
    } catch {}
}

const DEFAULT_FLOW_NODES = [
    {
        nodeId: 'node_start',
        nodeType: 'START',
        position: { x: 320, y: 50 },
        label: 'Início (Click-to-WhatsApp)',
        config: {},
    },
    {
        nodeId: 'node_audio_welcome',
        nodeType: 'AUDIO',
        position: { x: 320, y: 180 },
        label: '🎙️ Áudio de Boas-Vindas (Voz Humanizada)',
        config: {
            audioUrl: 'audio.mp3',
            simulateRecording: true,
            recordingDurationSeconds: 4,
            fallbackText: 'Oi! Tudo bem? Que alegria ter você aqui! Preparei o seu material completo com todo carinho.',
        },
    },
    {
        nodeId: 'node_media_product',
        nodeType: 'MEDIA',
        position: { x: 320, y: 320 },
        label: '📦 Entrega do Material (PDF / Acesso)',
        config: {
            mediaType: 'DOCUMENT',
            mediaUrl: 'Material_Exclusivo_Carol.pdf',
            filename: 'Material_Exclusivo_Carol.pdf',
            caption: 'Aqui está seu acesso exclusivo! Dá uma olhada no conteúdo com carinho.',
        },
    },
    {
        nodeId: 'node_pix_charge',
        nodeType: 'PIX',
        position: { x: 320, y: 460 },
        label: '💸 Chave PIX (Pagamento)',
        config: {
            pixKey: 'pagamentos@seunegocio.com',
            beneficiaryName: 'Carol',
            amount: '19.90',
            message: 'O valor simbólico é de apenas R$ 19,90! Segue a chave PIX para cópia rápida:',
        },
    },
    {
        nodeId: 'node_pix_verifier',
        nodeType: 'PIX_VERIFIER',
        position: { x: 320, y: 600 },
        label: '🧠 Auditor PIX (IA Gemini Vision)',
        config: {
            expectedAmount: '19.90',
            beneficiaryName: 'Carol',
            model: 'gemini-2.0-flash',
        },
    },
    {
        nodeId: 'node_capi_purchase',
        nodeType: 'META_CAPI',
        position: { x: 100, y: 760 },
        label: '🎯 Conversão Meta Ads (Purchase)',
        config: {
            eventName: 'Purchase',
            value: 19.90,
            currency: 'BRL',
        },
    },
    {
        nodeId: 'node_msg_refused',
        nodeType: 'MESSAGE',
        position: { x: 540, y: 760 },
        label: '⚠️ Cobrança Educada (PIX Inválido/Pendente)',
        config: {
            text: 'Oi! Parece que esse comprovante é um agendamento ou ainda não foi identificado como concluído. Consegue me mandar o comprovante definitivo?',
        },
    },
];

const DEFAULT_FLOW_EDGES = [
    { id: 'edge_1', source: 'node_start', target: 'node_audio_welcome' },
    { id: 'edge_2', source: 'node_audio_welcome', target: 'node_media_product' },
    { id: 'edge_3', source: 'node_media_product', target: 'node_pix_charge' },
    { id: 'edge_4', source: 'node_pix_charge', target: 'node_pix_verifier' },
    { id: 'edge_5', source: 'node_pix_verifier', sourceHandle: 'approved', target: 'node_capi_purchase' },
    { id: 'edge_6', source: 'node_pix_verifier', sourceHandle: 'denied', target: 'node_msg_refused' },
];

function loadStore() {
    try {
        if (fs.existsSync(STORE_FILE)) {
            return JSON.parse(fs.readFileSync(STORE_FILE, 'utf-8'));
        }
    } catch {}
    const initial = {
        bots: {},
        flows: {
            bot_whatsapp_principal: [
                {
                    _id: 'flow_principal',
                    botId: 'bot_whatsapp_principal',
                    name: 'Funil Principal (Entrega + Chave PIX + IA + CAPI)',
                    isMainFlow: true,
                    draftVersion: {
                        version: 1,
                        flowData: {
                            nodes: DEFAULT_FLOW_NODES,
                            edges: DEFAULT_FLOW_EDGES,
                        },
                    },
                },
            ],
        },
        userSessions: {},
        conversations: [],
        funnelStats: {
            startedCount: 18,
            materialDeliveredCount: 15,
            pixSentCount: 12,
            receiptReceivedCount: 10,
            convertedCount: 9,
            dropOffCount: 3,
            totalRevenue: 179.10,
            recentConversions: [],
        },
    };
    saveStore(initial);
    return initial;
}

function saveStore(data) {
    try {
        fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch {}
}

const store = loadStore();
const activeSockets = new Map();
const sessionStates = new Map();
const reconnectTimers = new Map();
const logger = pino({ level: 'silent' });

function updateState(botId, partial) {
    const existing = sessionStates.get(botId) || {
        botId,
        status: 'DISCONNECTED',
        qrCodeDataUrl: null,
        phoneNumber: null,
        profileName: null,
        lastError: null,
        updatedAt: new Date().toISOString(),
    };
    const updated = {
        ...existing,
        ...partial,
        updatedAt: new Date().toISOString(),
    };
    sessionStates.set(botId, updated);
    pushCloudHeartbeat(botId).catch(() => {});
    return updated;
}

function getQrStatus(botId) {
    return (
        sessionStates.get(botId) || {
            botId,
            status: 'DISCONNECTED',
            qrCodeDataUrl: null,
            phoneNumber: null,
            profileName: null,
            lastError: null,
            updatedAt: new Date().toISOString(),
        }
    );
}

// ─── Cloud Worker Heartbeat & Command Polling ────────────────────────────────
let isPushingHeartbeat = false;
async function pushCloudHeartbeat(botId = 'bot_whatsapp_principal') {
    if (isPushingHeartbeat) return;
    isPushingHeartbeat = true;
    try {
        const res = await axios.post(
            `${CLOUD_WORKER_URL}/api/cloud-kv/heartbeat`,
            {
                botId,
                status: getQrStatus(botId),
                engineUrl: PUBLIC_ENGINE_URL,
                conversations: store.conversations,
                funnelStats: store.funnelStats,
            },
            { timeout: 5000 }
        );

        const data = res.data;
        if (data?.flows && Array.isArray(data.flows) && data.flows.length > 0) {
            store.flows[botId] = data.flows;
            saveStore(store);
        }

        if (data?.command) {
            const cmd = data.command;
            if (cmd.type === 'START') {
                await startQrSession(botId, Boolean(cmd.forceNew));
            } else if (cmd.type === 'DISCONNECT') {
                await disconnectQrSession(botId, true);
            }
        }

        if (Array.isArray(data?.outbox) && data.outbox.length > 0) {
            const sock = activeSockets.get(botId);
            if (sock) {
                for (const item of data.outbox) {
                    if (item.to && item.text) {
                        const jid = toWhatsAppJid(item.to);
                        await sendRealisticText(botId, sock, jid, item.to, item.text);
                    }
                }
            }
        }
    } catch {
        // Ignore transient network errors
    } finally {
        isPushingHeartbeat = false;
    }
}

setInterval(() => {
    pushCloudHeartbeat('bot_whatsapp_principal').catch(() => {});
}, 3000);

function formatJidPhone(jid) {
    const raw = jid.split('@')[0].split(':')[0];
    return '+' + raw.replace(/\D/g, '');
}

function toWhatsAppJid(phone) {
    if (phone.includes('@')) return phone;
    const clean = phone.replace(/\D/g, '');
    return `${clean}@s.whatsapp.net`;
}

function logConversation(botId, userPhoneNumber, sender, messageType, messageContent, userName) {
    store.conversations.push({
        _id: 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        botId,
        userPhoneNumber: String(userPhoneNumber).replace(/\D/g, ''),
        userName,
        sender,
        messageType,
        messageContent,
        sentAt: new Date().toISOString(),
    });
    if (store.conversations.length > 500) {
        store.conversations = store.conversations.slice(-500);
    }
    saveStore(store);
    pushCloudHeartbeat(botId).catch(() => {});
}

async function startQrSession(botId = 'bot_whatsapp_principal', forceNewQr = false) {
    const sessionFolder = path.join(SESSIONS_DIR, botId);

    if (forceNewQr) {
        await disconnectQrSession(botId, true);
    }

    const current = sessionStates.get(botId);
    if (!forceNewQr && current && (current.status === 'CONNECTED' || current.status === 'QR_READY') && activeSockets.has(botId)) {
        return current;
    }

    if (reconnectTimers.has(botId)) {
        clearTimeout(reconnectTimers.get(botId));
        reconnectTimers.delete(botId);
    }

    updateState(botId, { status: 'CONNECTING', lastError: null });

    try {
        if (!fs.existsSync(sessionFolder)) {
            fs.mkdirSync(sessionFolder, { recursive: true });
        }

        if (!forceNewQr) {
            await restoreSessionFromCloudKv(botId, sessionFolder);
        }

        const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);
        let version = [2, 3000, 1015901307];
        try {
            const latest = await fetchLatestBaileysVersion();
            if (latest?.version) version = latest.version;
        } catch {}

        const sock = makeWASocket({
            version,
            auth: state,
            logger,
            printQRInTerminal: false,
            browser: ['Sistema Chatbot X1 (Carol)', 'Chrome', '128.0.0'],
            syncFullHistory: false,
            markOnlineOnConnect: true,
        });

        activeSockets.set(botId, sock);

        sock.ev.on('creds.update', async () => {
            await saveCreds();
            scheduleCloudKvAuthBackup(botId, sessionFolder);
        });

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                try {
                    const qrDataUrl = await QRCode.toDataURL(qr, {
                        width: 320,
                        margin: 2,
                        color: { dark: '#0f172a', light: '#ffffff' },
                    });
                    updateState(botId, {
                        status: 'QR_READY',
                        qrCodeDataUrl: qrDataUrl,
                        lastError: null,
                    });
                    console.log(`[QR Engine] 📱 QR Code pronto para leitura (${botId})`);
                } catch (err) {
                    console.error('[QR Engine] Erro ao gerar QR:', err);
                }
            }

            if (connection === 'open') {
                const userJid = sock.user?.id || '';
                const phoneNumber = userJid ? formatJidPhone(userJid) : '+55';
                const profileName = sock.user?.name || 'WhatsApp Business';

                scheduleCloudKvAuthBackup(botId, sessionFolder);
                updateState(botId, {
                    status: 'CONNECTED',
                    qrCodeDataUrl: null,
                    phoneNumber,
                    profileName,
                    lastError: null,
                });
                console.log(`[QR Engine] ✅ WhatsApp CONECTADO: ${phoneNumber} (${profileName})`);
            }

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                activeSockets.delete(botId);

                if (statusCode === DisconnectReason.loggedOut) {
                    try {
                        fs.rmSync(sessionFolder, { recursive: true, force: true });
                    } catch {}
                    await clearCloudKvAuth(botId);
                    updateState(botId, {
                        status: 'DISCONNECTED',
                        qrCodeDataUrl: null,
                        phoneNumber: null,
                        profileName: null,
                        lastError: 'Sessão desconectada pelo celular. Clique em Gerar Novo QR Code.',
                    });
                } else if (shouldReconnect) {
                    const timer = setTimeout(() => {
                        startQrSession(botId, false).catch(console.error);
                    }, 2500);
                    reconnectTimers.set(botId, timer);
                }
            }
        });

        sock.ev.on('messages.upsert', async (event) => {
            if (event.type !== 'notify') return;
            for (const msg of event.messages) {
                try {
                    await handleIncomingMessage(botId, sock, msg);
                } catch (err) {
                    console.error('[QR Engine] Erro ao processar mensagem:', err);
                }
            }
        });

        return getQrStatus(botId);
    } catch (error) {
        console.error('[QR Engine] Falha ao iniciar sessão:', error);
        return updateState(botId, {
            status: 'ERROR',
            lastError: error?.message || 'Erro ao iniciar motor QR',
        });
    }
}

async function disconnectQrSession(botId = 'bot_whatsapp_principal', wipeCreds = true) {
    if (reconnectTimers.has(botId)) {
        clearTimeout(reconnectTimers.get(botId));
        reconnectTimers.delete(botId);
    }

    const sock = activeSockets.get(botId);
    if (sock) {
        try {
            await sock.logout();
        } catch {
            try {
                sock.end(undefined);
            } catch {}
        }
        activeSockets.delete(botId);
    }

    if (wipeCreds) {
        const sessionFolder = path.join(SESSIONS_DIR, botId);
        try {
            fs.rmSync(sessionFolder, { recursive: true, force: true });
        } catch {}
        await clearCloudKvAuth(botId);
    }

    return updateState(botId, {
        status: 'DISCONNECTED',
        qrCodeDataUrl: null,
        phoneNumber: null,
        profileName: null,
        lastError: null,
    });
}

// ─── Sistema de Reações Humanizadas (WhatsApp Reactions) ───
async function reactToMessage(sock, remoteJid, messageKey, emoji) {
    if (!sock || !remoteJid || !messageKey) return;
    try {
        await sock.sendMessage(remoteJid, {
            react: {
                text: emoji,
                key: messageKey,
            },
        });
        console.log(`[Reação WhatsApp] Reagido com ${emoji} na mensagem ${messageKey.id} para ${remoteJid}`);
    } catch (e) {
        console.warn('[Reação WhatsApp Aviso]:', e?.message);
    }
}

function getHumanReactionEmoji(text) {
    const t = (text || '').toLowerCase().trim();
    const isReligiousOrAffectionate = [
        'amem', 'amém', 'deus', 'abençoe', 'abencoe', 'bênção', 'bencao',
        'obrigado', 'obrigada', 'gratidão', 'gratidao', 'paz', 'gloria',
        'glória', 'jesus', 'maravilha', 'coração', 'coracao'
    ].some(w => t.includes(w));
    if (isReligiousOrAffectionate) return '❤️';

    const isAffirmative = [
        'sim', 'pode', 'manda', 'ok', 'beleza', 'claro', 'com certeza',
        'quero', 'bora', 'manda ai', 'manda aí', 'positivo'
    ].some(w => t.includes(w));
    if (isAffirmative) return '👍';

    return '❤️';
}

// ─── Esteira de Cobrança / Follow-up do Funil 2 (Guia Pessoa Acamada - 20min) ───
const funil2ReminderTimers = new Map();

function cancelFunil2Reminder(botId, userPhone) {
    const key = `${botId}:${userPhone}`;
    if (funil2ReminderTimers.has(key)) {
        const timers = funil2ReminderTimers.get(key);
        if (Array.isArray(timers)) {
            timers.forEach((t) => clearTimeout(t));
        } else {
            clearTimeout(timers);
        }
        funil2ReminderTimers.delete(key);
        console.log(`[Funil 2] ⏹️ Timers de follow-up cancelados para ${userPhone}`);
    }
}

function scheduleFunil2Reminder(botId, remoteJid, userPhone) {
    cancelFunil2Reminder(botId, userPhone);
    const key = `${botId}:${userPhone}`;
    const timers = [];

    const sendFollowUp = async (step, texts) => {
        try {
            const currentStore = loadStore();
            const sess = currentStore.userSessions[key];
            if (sess && sess.waitingFor === 'PIX_RECEIPT_FUNIL2') {
                const sock = activeSockets.get(botId);
                if (sock) {
                    for (const text of texts) {
                        await sock.sendMessage(remoteJid, { text });
                        logConversation(botId, userPhone, 'BOT', 'REMINDER', text);
                        await new Promise((r) => setTimeout(r, 800));
                    }
                    console.log(`[Funil 2] ⏰ Follow-up Step ${step} enviado para ${userPhone}`);
                }
            }
        } catch (err) {
            console.error(`[Funil 2 Follow-up Error]:`, err?.message);
        }
    };

    // Follow-up 1: ~20 minutos (Print 01:58)
    timers.push(
        setTimeout(() => {
            sendFollowUp(1, [
                'Olá! 🙏\n\nConseguiu ver o MATERIAL?\n\nSe o material agregou você, conto com sua contribuição para manter esse projeto e continuar criando novos materiais. 🔧\n\nApós o comprovante, libero também seus bônus exclusivos.\n\nDeus abençoe! ✝️',
            ]);
        }, 20 * 60 * 1000)
    );

    funil2ReminderTimers.set(key, timers);
}

// ─── Esteira de Cobrança / Follow-up do Funil 3 (Missionária Raquel - 20min) ───
const funil3ReminderTimers = new Map();

function cancelFunil3Reminder(botId, userPhone) {
    const key = `${botId}:${userPhone}`;
    if (funil3ReminderTimers.has(key)) {
        const timers = funil3ReminderTimers.get(key);
        if (Array.isArray(timers)) {
            timers.forEach((t) => clearTimeout(t));
        } else {
            clearTimeout(timers);
        }
        funil3ReminderTimers.delete(key);
        console.log(`[Funil 3] ⏹️ Timers de follow-up cancelados para ${userPhone}`);
    }
}

function scheduleFunil3Reminder(botId, remoteJid, userPhone) {
    cancelFunil3Reminder(botId, userPhone);
    const key = `${botId}:${userPhone}`;
    const timers = [];

    const sendFollowUp = async (step, texts) => {
        try {
            const currentStore = loadStore();
            const sess = currentStore.userSessions[key];
            if (sess && sess.waitingFor === 'PIX_RECEIPT_FUNIL3') {
                const sock = activeSockets.get(botId);
                if (sock) {
                    for (const text of texts) {
                        await sock.sendMessage(remoteJid, { text });
                        logConversation(botId, userPhone, 'BOT', 'REMINDER', text);
                        await new Promise((r) => setTimeout(r, 800));
                    }
                    console.log(`[Funil 3] ⏰ Follow-up Step ${step} enviado para ${userPhone}`);
                }
            }
        } catch (err) {
            console.error(`[Funil 3 Follow-up Error]:`, err?.message);
        }
    };

    // Follow-up 1: ~20 minutos
    timers.push(
        setTimeout(() => {
            sendFollowUp(1, [
                'Irmã, a Paz do Senhor! 🙏\n\nConseguiu conferir os 500 Esboços?\n\nFico no aguardo do comprovante para te enviar o acesso à Comunidade VIP e todos os 4 bônus exclusivos! Que Deus te abençoe! 💛',
            ]);
        }, 20 * 60 * 1000)
    );

    funil3ReminderTimers.set(key, timers);
}

// ─── Esteira de Cobrança / Follow-up do Funil 4 (Jornada da Bíblia - 15min) ───
const funil4ReminderTimers = new Map();

function cancelFunil4Reminder(botId, userPhone) {
    const key = `${botId}:${userPhone}`;
    if (funil4ReminderTimers.has(key)) {
        const timers = funil4ReminderTimers.get(key);
        if (Array.isArray(timers)) {
            timers.forEach((t) => clearTimeout(t));
        } else {
            clearTimeout(timers);
        }
        funil4ReminderTimers.delete(key);
        console.log(`[Funil 4] ⏹️ Timers de follow-up cancelados para ${userPhone}`);
    }
}

function scheduleFunil4Reminder(botId, remoteJid, userPhone) {
    cancelFunil4Reminder(botId, userPhone);
    const key = `${botId}:${userPhone}`;
    const timers = [];

    const sendFollowUp = async (step, texts) => {
        try {
            const currentStore = loadStore();
            const sess = currentStore.userSessions[key];
            if (sess && sess.waitingFor === 'PIX_RECEIPT_FUNIL4') {
                const sock = activeSockets.get(botId);
                if (sock) {
                    for (const text of texts) {
                        await sock.sendMessage(remoteJid, { text });
                        logConversation(botId, userPhone, 'BOT', 'REMINDER', text);
                        await new Promise((r) => setTimeout(r, 800));
                    }
                    console.log(`[Funil 4] ⏰ Follow-up Step ${step} enviado para ${userPhone}`);
                }
            }
        } catch (err) {
            console.error(`[Funil 4 Follow-up Error]:`, err?.message);
        }
    };

    // Follow-up 1: ~15 minutos (Print 01:52)
    timers.push(
        setTimeout(() => {
            sendFollowUp(1, [
                'Faltou alguma coisa?',
            ]);
        }, 15 * 60 * 1000)
    );

    funil4ReminderTimers.set(key, timers);
}


// ─── Esteira de Cobrança / Follow-up do Funil 1 (15m -> 1h -> 2h -> 3h) ───
const parabolasReminderTimers = new Map();

function cancelParabolasReminder(botId, userPhone) {
    const key = `${botId}:${userPhone}`;
    if (parabolasReminderTimers.has(key)) {
        const timers = parabolasReminderTimers.get(key);
        if (Array.isArray(timers)) {
            timers.forEach((t) => clearTimeout(t));
        } else {
            clearTimeout(timers);
        }
        parabolasReminderTimers.delete(key);
    }
}

function scheduleParabolasReminder(botId, remoteJid, userPhone) {
    cancelParabolasReminder(botId, userPhone);
    const key = `${botId}:${userPhone}`;
    const timers = [];

    const sendFollowUp = async (step, texts) => {
        try {
            const currentStore = loadStore();
            const sess = currentStore.userSessions[key];
            if (sess && sess.waitingFor === 'PIX_RECEIPT') {
                const sock = activeSockets.get(botId);
                if (sock) {
                    for (const text of texts) {
                        await sock.sendMessage(remoteJid, { text });
                        logConversation(botId, userPhone, 'BOT', 'REMINDER', text);
                        await new Promise((r) => setTimeout(r, 800));
                    }
                    console.log(`[Funil Parabolas] ⏰ Follow-up Step ${step} enviado para ${userPhone}`);
                }
            }
        } catch (err) {
            console.error(`[Follow-up Step ${step} Error]:`, err?.message);
        }
    };

    // Follow-up 1: 15 minutos (Print 5)
    timers.push(
        setTimeout(() => {
            sendFollowUp(1, ['Todo seu material foi enviado!\nFico no seu aguardo!']);
        }, 15 * 60 * 1000)
    );

    // Follow-up 2: +1 hora após o 1º (75 minutos total)
    timers.push(
        setTimeout(() => {
            sendFollowUp(2, ['Você irá realizar o pagamento hoje?']);
        }, 75 * 60 * 1000)
    );

    // Follow-up 3: +2 horas após o 2º (195 minutos total)
    timers.push(
        setTimeout(() => {
            sendFollowUp(3, ['Oi?']);
        }, 195 * 60 * 1000)
    );

    // Follow-up 4: +3 horas após o 3º (375 minutos total) - Downsell
    timers.push(
        setTimeout(() => {
            sendFollowUp(4, [
                'Confiei em você e enviei todo o material, fico no aguardo do comprovante',
                'Qualquer valor ajuda!\nPode ser 20, 10 ou 5 reais!',
            ]);
        }, 375 * 60 * 1000)
    );

    parabolasReminderTimers.set(key, timers);
}

// ─── FASE 1: Apresentação da Oferta (Print 1 & 2) ───
async function sendParabolasPhase1(botId, sock, remoteJid, userPhone, pushName) {
    console.log(`[Funil Parabolas] 🚀 Iniciando Fase 1 para ${pushName} (${userPhone})`);

    // 1. Mensagem de Saudação
    await sendRealisticText(botId, sock, remoteJid, userPhone, 'A Paz do Senhor!');
    await new Promise((r) => setTimeout(r, 800));

    // 2. Áudio em MP3 Real de 22 segundos (PTT)
    try {
        await sock.sendPresenceUpdate('recording', remoteJid);
    } catch {}
    await new Promise((r) => setTimeout(r, 2000));

    const mp3Path = path.join(__dirname, 'public', 'parabolas', 'audio_parabolas.mp3');
    if (fs.existsSync(mp3Path)) {
        try {
            const mp3Buffer = fs.readFileSync(mp3Path);
            await sock.sendMessage(remoteJid, {
                audio: mp3Buffer,
                mimetype: 'audio/mpeg',
                ptt: true,
            });
            logConversation(botId, userPhone, 'BOT', 'AUDIO', '🎙️ [Áudio MP3 de 22s enviado]');
            console.log(`[Funil Parabolas] 🎙️ Áudio MP3 enviado com sucesso para ${userPhone}`);
        } catch (mp3Err) {
            console.warn('[MP3 Buffer Send Error, retrying with URL]:', mp3Err?.message);
            await new Promise((r) => setTimeout(r, 1200));
            try {
                await sock.sendMessage(remoteJid, {
                    audio: { url: mp3Path },
                    mimetype: 'audio/mpeg',
                    ptt: true,
                });
                logConversation(botId, userPhone, 'BOT', 'AUDIO', '🎙️ [Áudio MP3 via URL enviado]');
            } catch (urlErr) {
                console.error('[MP3 URL Send Error]:', urlErr?.message);
            }
        }
    } else {
        console.error('[Funil Parabolas] ❌ Arquivo MP3 não encontrado:', mp3Path);
    }

    try {
        await sock.sendPresenceUpdate('paused', remoteJid);
    } catch {}

    await new Promise((r) => setTimeout(r, 1200));

    // 3. Texto da Oferta
    const offerText = `📘 As 40 Parábolas de Jesus (Explicadas e Ilustradas)\n\nDe 59,00 por: *R$25,00*\nContexto histórico, explicação clara, embasamento bíblico e ilustrações exclusivas.\n\n🎁 *Bônus após o pagamento* 🎁\n🎁 Curiosidades da Bíblia, Escatologia Estudo e muito mais!`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, offerText);
    await new Promise((r) => setTimeout(r, 1200));

    // 4. Imagem da Capa da Coleção Completa
    try {
        const imgPath = path.join(__dirname, 'public', 'parabolas', 'capa_parabolas.jpeg');
        if (fs.existsSync(imgPath)) {
            const imgBuffer = fs.readFileSync(imgPath);
            await sock.sendMessage(remoteJid, {
                image: imgBuffer,
                mimetype: 'image/jpeg',
            });
            logConversation(botId, userPhone, 'BOT', 'IMAGE', '🖼️ [Capa Coleção Completa enviada]');
        }
    } catch (imgErr) {
        console.error('[Parabolas Image Error]:', imgErr?.message);
    }

    await new Promise((r) => setTimeout(r, 1200));

    // 5. Garantia de Acesso
    await sendRealisticText(
        botId,
        sock,
        remoteJid,
        userPhone,
        'O acesso ao conteúdo é vitalicio! Você pode imprimir ou ler pelo celular'
    );
    await new Promise((r) => setTimeout(r, 1000));

    // 6. Quebra de Objeção / Contribuição Voluntária
    const valuePropText = `O valor sugerido é R$25,00\nVc só paga depois de receber tudo!\n\nPorém, a contribuição é voluntaria e pode ser até menos, seja 10, 15 ou 20 reais..`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, valuePropText);
    await new Promise((r) => setTimeout(r, 800));

    // 7. Chamada para Ação
    await sendRealisticText(botId, sock, remoteJid, userPhone, 'Posso enviar agora?');

    // Atualiza sessão para aguardar o "Sim"
    const sessionKey = `${botId}:${userPhone}`;
    store.userSessions[sessionKey] = {
        botId,
        userJid: remoteJid,
        userPhone,
        userName: pushName,
        funnel: 'parabolas',
        waitingFor: 'CONFIRM_SEND_PARABOLAS',
        updatedAt: new Date().toISOString(),
    };
    store.funnelStats.startedCount = (store.funnelStats.startedCount || 0) + 1;
    saveStore(store);
}

// ─── FASE 2: Entrega dos 5 PDFs, Drive Link e Chave PIX (Print 2, 3 & 4) ───
async function sendParabolasPhase2(botId, sock, remoteJid, userPhone, pushName, quotedMsg = null) {
    console.log(`[Funil Parabolas] 📦 Iniciando Fase 2 (Entrega de Materiais e PIX) para ${pushName} (${userPhone})`);

    // 1. Mensagem de Confiança (citando mensagem se disponível)
    const quoteOpts = quotedMsg ? { quoted: quotedMsg } : {};
    await sendRealisticText(
        botId,
        sock,
        remoteJid,
        userPhone,
        'Estarei enviando e confiando em você..\nFique avontade para abrir o material',
        quoteOpts
    );
    await new Promise((r) => setTimeout(r, 1200));

    // 2. Envio sequencial dos 5 PDFs reais da coleção
    const pdfs = [
        {
            file: '01_Parabolas_do_Reino_Dos_Ceus.pdf',
            name: 'As Parábolas de Jesus - 01 Parábolas do Reino Dos Céus .pdf',
        },
        {
            file: '02_Parabolas_da_Graca_Misericordia_Perdao.pdf',
            name: '2- As Parabolas de Jesus da Graça Misericórdia e Perdão .pdf',
        },
        {
            file: '03_Parabolas_Vigilancia_e_Juizo.pdf',
            name: '3 - As Parabolas de Jesus- Vigilância e do Juízo .pdf',
        },
        {
            file: '04_Parabolas_Vigilancia_e_Juizo.pdf',
            name: '4- As Parabolas de Jesus- Vigilância e do Juízo .pdf',
        },
        {
            file: 'Simplificado_PDF_As_Parabolas_de_Jesus.pdf',
            name: 'Simplificado PDF As_Parabolas de Jesus.pdf',
        },
    ];

    for (const pdf of pdfs) {
        try {
            const pdfPath = path.join(__dirname, 'public', 'parabolas', pdf.file);
            if (fs.existsSync(pdfPath)) {
                const pdfBuffer = fs.readFileSync(pdfPath);
                await sock.sendMessage(remoteJid, {
                    document: pdfBuffer,
                    mimetype: 'application/pdf',
                    fileName: pdf.name,
                });
                logConversation(botId, userPhone, 'BOT', 'DOCUMENT', `📦 [PDF]: ${pdf.name}`);
                await new Promise((r) => setTimeout(r, 1200));
            }
        } catch (pdfErr) {
            console.error('[PDF Send Error]:', pdf.name, pdfErr?.message);
        }
    }

    // 3. Link do Google Drive
    const driveText = `Caso não consiga abrir PDF ou quer abrir no computador\nLink Google Drive: https://drive.google.com/drive/folders/1VQ2kDbxKha7_CxeKaGlg0rptQp-ZEY1UO?usp=sharing`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, driveText);
    await new Promise((r) => setTimeout(r, 1200));

    // 4. Ancoragem de Valores
    const anchorText = `Valor sugerido: R$25,00\n\n⭐ Gostei muito: R$30,00\n⭐⭐ Quero compartilhar e abençoar ainda mais: R$50,00\n\nIsso ajuda a continuarmos esse propósito!\n\nCaso não possa contribuir com o valor integral, fique a vontade para enviar o valor que puder!`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, anchorText);
    await new Promise((r) => setTimeout(r, 1000));

    // 5. Chave PIX CNPJ
    const pixInfoText = `Chave Pix CNPJ\nNome da Chave :GPS EBOOKS DIGITAIS LTDA\n👇 Só copiar e colar CNPJ 👇`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, pixInfoText);
    await new Promise((r) => setTimeout(r, 600));

    const pixKey = '67.039.217/0001-86';
    const beneficiaryName = 'GPS EBOOKS DIGITAIS LTDA';

    // 6. Botão Nativo cta_copy com estrofe <biz>
    try {
        if (generateWAMessageFromContent && proto) {
            const buttonParams = {
                display_text: 'Copiar chave Pix',
                id: 'copy_pix_cnpj',
                copy_code: pixKey,
            };

            const interactiveMessage = proto.Message?.InteractiveMessage?.create
                ? proto.Message.InteractiveMessage.create({
                      body: proto.Message.InteractiveMessage.Body?.create
                          ? proto.Message.InteractiveMessage.Body.create({ text: 'Valor sugerido: R$ 25,00' })
                          : { text: 'Valor sugerido: R$ 25,00' },
                      footer: proto.Message.InteractiveMessage.Footer?.create
                          ? proto.Message.InteractiveMessage.Footer.create({ text: 'Toque no botão abaixo para copiar' })
                          : { text: 'Toque no botão abaixo para copiar' },
                      header: proto.Message.InteractiveMessage.Header?.create
                          ? proto.Message.InteractiveMessage.Header.create({
                                title: beneficiaryName,
                                subtitle: `CNPJ: ${pixKey}`,
                                hasMediaAttachment: false,
                            })
                          : {
                                title: beneficiaryName,
                                subtitle: `CNPJ: ${pixKey}`,
                                hasMediaAttachment: false,
                            },
                      nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage?.create
                          ? proto.Message.InteractiveMessage.NativeFlowMessage.create({
                                buttons: [{ name: 'cta_copy', buttonParamsJson: JSON.stringify(buttonParams) }],
                            })
                          : {
                                buttons: [{ name: 'cta_copy', buttonParamsJson: JSON.stringify(buttonParams) }],
                            },
                  })
                : {
                      body: { text: 'Valor sugerido: R$ 25,00' },
                      footer: { text: 'Toque no botão abaixo para copiar' },
                      header: {
                          title: beneficiaryName,
                          subtitle: `CNPJ: ${pixKey}`,
                          hasMediaAttachment: false,
                      },
                      nativeFlowMessage: {
                          buttons: [{ name: 'cta_copy', buttonParamsJson: JSON.stringify(buttonParams) }],
                      },
                  };

            const waMessage = generateWAMessageFromContent(
                remoteJid,
                {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2,
                        messageSecret: crypto.randomBytes(32),
                    },
                    interactiveMessage,
                },
                {}
            );

            await sock.relayMessage(remoteJid, waMessage.message, {
                messageId: waMessage.key.id,
                additionalNodes: [
                    {
                        tag: 'biz',
                        attrs: {
                            actual_actors: '2',
                            host_storage: '2',
                            privacy_mode_ts: String(Math.floor(Date.now() / 1000)),
                        },
                        content: [
                            {
                                tag: 'interactive',
                                attrs: { type: 'native_flow', v: '1' },
                                content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }],
                            },
                        ],
                    },
                ],
            });
            logConversation(botId, userPhone, 'BOT', 'PIX', `[Botão Nativo PIX cta_copy]: ${pixKey}`);
        }
    } catch (btnErr) {
        console.error('[Parabolas Button Error]:', btnErr?.message);
    }

    // 7. Texto Limpo com a Chave CNPJ
    await new Promise((r) => setTimeout(r, 600));
    await sock.sendMessage(remoteJid, { text: pixKey });
    logConversation(botId, userPhone, 'BOT', 'PIX', `Chave PIX: ${pixKey}`);

    await new Promise((r) => setTimeout(r, 700));

    // 8. Honestidade
    await sendRealisticText(botId, sock, remoteJid, userPhone, 'Conto com sua honestidade');
    await new Promise((r) => setTimeout(r, 800));

    // 9. Promessa de Bônus
    const bonusText = `Quando fizer o pagamento, me envia o comprovante aqui que eu libero seu bônus\n\n🎁 Curiosidades da Biblia\n🎁 Material extra: Escatologia — Estudo sobre os Tempos Finais`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, bonusText);

    // 10. Atualiza Sessão para aguardar comprovante
    const sessionKey = `${botId}:${userPhone}`;
    store.userSessions[sessionKey] = {
        botId,
        userJid: remoteJid,
        userPhone,
        userName: pushName,
        funnel: 'parabolas',
        waitingFor: 'PIX_RECEIPT',
        updatedAt: new Date().toISOString(),
    };
    store.funnelStats.materialDeliveredCount = (store.funnelStats.materialDeliveredCount || 0) + 1;
    store.funnelStats.pixSentCount = (store.funnelStats.pixSentCount || 0) + 1;
    saveStore(store);

    // 11. Agenda lembrete de follow-up para 15 minutos (Print 5)
    scheduleParabolasReminder(botId, remoteJid, userPhone);
}


// ═══════════════════════════════════════════════════════════════════════════════
// FUNIL 2: Guia Completo de Cuidados com Pessoa Acamada (Gatilho: teste2)
// ═══════════════════════════════════════════════════════════════════════════════

async function sendFunil2Phase1(botId, sock, remoteJid, userPhone, pushName) {
    console.log(`[Funil 2 - Acamados] 🚀 Iniciando Fase 1 para ${pushName} (${userPhone})`);

    const text1 = `Oláaa, tudo bem? ❤️ Fico muito feliz que tenha se interessado!!\n\nVou te ajudar a cuidar de quem você ama com mais segurança, mais leveza e muito menos esforço, sem machucar a pessoa nem a sua coluna! 🤲✨\n\nTenho certeza que esse guia vai deixar a sua rotina de cuidado muito mais tranquila!! 💙🙏`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, text1);
    await new Promise((r) => setTimeout(r, 1200));

    try { await sock.sendPresenceUpdate('recording', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 2000));

    const mp3Path = path.join(__dirname, 'public', 'funil2', 'audio_apresentacao.mp3');
    if (fs.existsSync(mp3Path)) {
        try {
            const mp3Buffer = fs.readFileSync(mp3Path);
            await sock.sendMessage(remoteJid, {
                audio: mp3Buffer,
                mimetype: 'audio/mpeg',
                ptt: true,
            });
            logConversation(botId, userPhone, 'BOT', 'AUDIO', '🎙️ [Áudio Apresentação Funil 2 MP3 2m10s]');
            console.log(`[Funil 2] 🎙️ Áudio 1 MP3 enviado para ${userPhone}`);
        } catch (mp3Err) {
            console.warn('[Funil 2 MP3 Send Error]:', mp3Err?.message);
        }
    }
    try { await sock.sendPresenceUpdate('paused', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1200));

    const imgPath = path.join(__dirname, 'public', 'funil2', 'capa_guia_acamado.jpeg');
    if (fs.existsSync(imgPath)) {
        try {
            const imgBuffer = fs.readFileSync(imgPath);
            await sock.sendMessage(remoteJid, { image: imgBuffer });
            logConversation(botId, userPhone, 'BOT', 'IMAGE', '🖼️ [Capa Guia Cuidados com Pessoa Acamada]');
        } catch (imgErr) {
            console.error('[Funil 2 Img Error]:', imgErr?.message);
        }
    }
    await new Promise((r) => setTimeout(r, 1500));

    const offerText = `Hoje separei um material especial pra você:\n\n✅ Guia Completo de Cuidados com Pessoa Acamada\n✅ Higiene, posições seguras, mudança de posição e prevenção de escaras\n✅ Passo a passo ilustrado, pra cuidar com segurança mesmo sem experiência\n🎁 Bônus: 185 atividades entre exercícios, alongamentos, massagens e estímulos cognitivos, Primeiros Socorros em Casa e Calendário de Cuidados\n📲 Tudo no seu WhatsApp\n\n🔴 Tudo por R$10,00 no Pix 💎\n🔴 Válido só hoje\n\nPosso confiar na sua honestidade pra te enviar o guia primeiro?\n\nPosso te enviar?`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, offerText);

    const sessionKey = `${botId}:${userPhone}`;
    store.userSessions[sessionKey] = {
        botId,
        userJid: remoteJid,
        userPhone,
        userName: pushName,
        funnel: 'funil2',
        waitingFor: 'CONFIRM_SEND_FUNIL2',
        updatedAt: new Date().toISOString(),
    };
    saveStore(store);
}

async function sendFunil2Phase2(botId, sock, remoteJid, userPhone, pushName, quotedMsg = null) {
    console.log(`[Funil 2 - Acamados] 📦 Iniciando Fase 2 (Entrega e PIX) para ${pushName} (${userPhone})`);

    const quoteOptions = quotedMsg ? { quoted: quotedMsg } : {};
    await sendRealisticText(
        botId,
        sock,
        remoteJid,
        userPhone,
        '❤️ Vou contar com sua honestidade, tá bom?',
        quoteOptions
    );
    await new Promise((r) => setTimeout(r, 1200));

    const pdfs = [
        { file: 'Guia Completo de Cuidados com Pessoa Acamada.pdf', name: 'Guia Completo de Cuidados com Pessoa Acamada.pdf' },
        { file: '+40 Exercícios para Manter a Mobilidade de Quem Está Acamado.pdf', name: '+40 Exercícios para Manter a Mobilidade de Quem Está Acamado.pdf' },
        { file: '+25 Alongamentos para Aliviar Rigidez e Desconforto Muscular.pdf', name: '+25 Alongamentos para Aliviar Rigidez e Desconforto Muscular.pdf' },
        { file: '+20 Técnicas de Massagem para Trazer Conforto e Acalmar.pdf', name: '+20 Técnicas de Massagem para Trazer Conforto e Acalmar.pdf' },
    ];

    for (let i = 0; i < pdfs.length; i++) {
        const item = pdfs[i];
        const fullPdfPath = path.join(__dirname, 'public', 'funil2', item.file);
        if (fs.existsSync(fullPdfPath)) {
            try {
                const pdfBuffer = fs.readFileSync(fullPdfPath);
                await sock.sendMessage(remoteJid, {
                    document: pdfBuffer,
                    fileName: item.name,
                    mimetype: 'application/pdf',
                });
                logConversation(botId, userPhone, 'BOT', 'DOCUMENT', `📄 [PDF ${i + 1}/4]: ${item.name}`);
                console.log(`[Funil 2] 📄 PDF ${i + 1}/4 enviado com sucesso: ${item.name}`);
            } catch (pdfErr) {
                console.warn(`[Funil 2 PDF ${i + 1} Error]:`, pdfErr?.message);
            }
        }
        await new Promise((r) => setTimeout(r, 1400));
    }

    const bonusText = `Assim que me enviar o comprovante, te envio o restante dos materiais:\n\nBônus:\n🎁 Exercícios de Mobilidade\n🎁 Alongamentos\n🎁 Técnicas de Massagem\n🎁 100 Atividades Sensoriais e Cognitivas\n🎁 Primeiros Socorros em Casa\n🎁 Calendário de Cuidados\n🎁 Grupo VIP com a Fisioterapeuta e Enfermeira\n\nAcesso Exclusivo:\n✅ 50 Receitas Fáceis de Engolir 🍲\n✅ Kit SOS do Cuidador: alívio rápido pra sua coluna e seu cansaço 💙\n✅ 50 Exercícios de Fala e Linguagem 🗣️`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, bonusText);
    await new Promise((r) => setTimeout(r, 1200));

    const pricingText = `Forma de pagamento: Valor Único\nEu irei disponibilizar aqui 4 valores e você escolhe qual acha mais justo:\n\n• R$10,00\n• R$19,90 (Acesso a todos os bônus)\n• R$39,90 (Acesso Total + Receitas Fáceis + Kit SOS do Cuidador + Exercícios de Fala e Linguagem)\n• R$49,90 (Acesso Total + Receitas Fáceis + Kit SOS do Cuidador + Exercícios de Fala e Linguagem)\n\nDeixe seu coração ser guiado por Deus e contribua com o valor que vier no seu coração! 🙏`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, pricingText);
    await new Promise((r) => setTimeout(r, 1000));

    try { await sock.sendPresenceUpdate('recording', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1500));

    const audioPixPath = path.join(__dirname, 'public', 'funil2', 'audio_pix.mp3');
    if (fs.existsSync(audioPixPath)) {
        try {
            const mp3Buffer = fs.readFileSync(audioPixPath);
            await sock.sendMessage(remoteJid, {
                audio: mp3Buffer,
                mimetype: 'audio/mpeg',
                ptt: true,
            });
            logConversation(botId, userPhone, 'BOT', 'AUDIO', '🎙️ [Áudio 2 PIX Funil 2 MP3 20s]');
            console.log(`[Funil 2] 🎙️ Áudio 2 MP3 enviado para ${userPhone}`);
        } catch (mp3Err) {
            console.warn('[Funil 2 Áudio 2 Error]:', mp3Err?.message);
        }
    }
    try { await sock.sendPresenceUpdate('paused', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1000));

    const pixInfoText = `Chave Pix CELULAR\nNome da Chave :SANTOS LIVROS\n👇 Só copiar e colar NÚMERO CELULAR`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, pixInfoText);
    await new Promise((r) => setTimeout(r, 600));

    const pixKey = '82996382293';
    await sock.sendMessage(remoteJid, { text: pixKey });
    logConversation(botId, userPhone, 'BOT', 'PIX', `Chave PIX: ${pixKey}`);
    await new Promise((r) => setTimeout(r, 800));

    const finalInstructions = `Assim que você finalizar o pagamento, me envia o comprovante por aqui, que já envio todo material restante prometido!\n\nBasta apenas me enviar o comprovante que já te envio tudo.`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, finalInstructions);

    const sessionKey = `${botId}:${userPhone}`;
    store.userSessions[sessionKey] = {
        botId,
        userJid: remoteJid,
        userPhone,
        userName: pushName,
        funnel: 'funil2',
        waitingFor: 'PIX_RECEIPT_FUNIL2',
        updatedAt: new Date().toISOString(),
    };
    saveStore(store);

    scheduleFunil2Reminder(botId, remoteJid, userPhone);
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNIL 3: 500 Esboços de Pregações para Mulheres - Missionária Raquel (Gatilho: teste3)
// ═══════════════════════════════════════════════════════════════════════════════

async function sendFunil3Phase1(botId, sock, remoteJid, userPhone, pushName) {
    console.log(`[Funil 3 - Esboços] 🚀 Iniciando Fase 1 para ${pushName} (${userPhone})`);

    const text1 = `Oii! Prazer, sou a Missionária Raquel, responsável pelos 500 Esboços de Pregações para Mulheres! 🙏💛\n\nEstou terminando de enviar o material para outra cliente e já volto para te atender, tá bom? 😊`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, text1);
    await new Promise((r) => setTimeout(r, 1000));

    const text2 = `Me conta, irmã: você é pastora, missionária, líder ou quer aprender mais sobre a Palavra de Deus? 😊🙏`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, text2);
    await new Promise((r) => setTimeout(r, 1200));

    const text3 = `Perfeito! Esse material vai te ajudar a preparar suas ministrações com mais clareza e segurança. 🥰📖\n\nAgora vou te mostrar tudo o que você recebe!\n\nAproveita e salva meu contato como Missionária Raquel! 💛\n\nToda semana compartilho conteúdos gratuitos para seus estudos e ministrações, além de novidades e sorteios nos Status. Assim você não perde nada! 😊🙏`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, text3);
    await new Promise((r) => setTimeout(r, 1000));

    const text4 = `Vou gravar um áudio pra te explicar bem rapidinho, e não te atrapalhar.`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, text4);
    await new Promise((r) => setTimeout(r, 1200));

    try { await sock.sendPresenceUpdate('recording', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 2000));

    const mp3Path = path.join(__dirname, 'public', 'funil3', 'audio_apresentacao.mp3');
    if (fs.existsSync(mp3Path)) {
        try {
            const mp3Buffer = fs.readFileSync(mp3Path);
            await sock.sendMessage(remoteJid, {
                audio: mp3Buffer,
                mimetype: 'audio/mpeg',
                ptt: true,
            });
            logConversation(botId, userPhone, 'BOT', 'AUDIO', '🎙️ [Áudio Apresentação Funil 3 MP3 55s]');
            console.log(`[Funil 3] 🎙️ Áudio 1 MP3 enviado para ${userPhone}`);
        } catch (mp3Err) {
            console.warn('[Funil 3 MP3 Send Error]:', mp3Err?.message);
        }
    }
    try { await sock.sendPresenceUpdate('paused', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1200));

    const imgPath = path.join(__dirname, 'public', 'funil3', 'capa_esbocos.jpeg');
    if (fs.existsSync(imgPath)) {
        try {
            const imgBuffer = fs.readFileSync(imgPath);
            await sock.sendMessage(remoteJid, { image: imgBuffer });
            logConversation(botId, userPhone, 'BOT', 'IMAGE', '🖼️ [Capa 500 Esboços de Pregações]');
        } catch (imgErr) {
            console.error('[Funil 3 Img Error]:', imgErr?.message);
        }
    }
    await new Promise((r) => setTimeout(r, 1500));

    const offerText = `Não precisa mais começar cada preparação do zero. Com os 500 Esboços de Pregações para Mulheres, você ganha tempo e uma direção clara para desenvolver suas mensagens. 🙏📖\n\n📚 500 esboços em dois volumes\n✍️ Versículo, contexto, desenvolvimento, conclusão e frase final\n⛪️ Temas para cultos, congressos, vigílias, células, Santa Ceia e encontros femininos\n🎁 Planner de Cultos, Checklist da Pregadora e 30 Dinâmicas para Encontros e Cultos\n\nTodo o pacote, de R$39,90, por apenas R$10,00. 💛\n\nTodos os materiais são digitais, em PDF, e eu envio tudo diretamente aqui na nossa conversa pelo WhatsApp, para você consultar sempre que precisar. 🥰📖\n\nAntes de pagar, eu vou te enviar tudo para que possa conferir! ❤️\n\nPosso contar com sua Honestidade, e te mandar os materiais agora? 🙏`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, offerText);

    const sessionKey = `${botId}:${userPhone}`;
    store.userSessions[sessionKey] = {
        botId,
        userJid: remoteJid,
        userPhone,
        userName: pushName,
        funnel: 'funil3',
        waitingFor: 'CONFIRM_SEND_FUNIL3',
        updatedAt: new Date().toISOString(),
    };
    saveStore(store);
}

async function sendFunil3Phase2(botId, sock, remoteJid, userPhone, pushName, quotedMsg = null) {
    console.log(`[Funil 3 - Esboços] 📦 Iniciando Fase 2 (Entrega e PIX) para ${pushName} (${userPhone})`);

    const quoteOptions = quotedMsg ? { quoted: quotedMsg } : {};
    const textConfirm = `Combinado!! Vou te enviar agora, e já te mando os dados pra pagar. 💕\n\nEu não ganho nada com esses materiais, todo o dinheiro arrecadado será doado, em forma de cestas básicas, para aqueles que estão passando por um momento difícil.\n\nQue Deus te abençoe grandemente 😊`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, textConfirm, quoteOptions);
    await new Promise((r) => setTimeout(r, 1200));

    const pdfs = [
        { file: 'PARTE 1 - 500 ESBOÇOS DE PREGAÇÕES PARA MULHERES.pdf', name: 'PARTE 1 - 500 ESBOÇOS DE PREGAÇÕES PARA MULHERES.pdf' },
        { file: 'PARTE 2 - 500 ESBOÇOS DE PREGAÇÕES PARA MULHERES.pdf', name: 'PARTE 2 - 500 ESBOÇOS DE PREGAÇÕES PARA MULHERES.pdf' },
        { file: 'CHECKLIST DA PREGADORA COMPLETO.pdf', name: 'CHECKLIST DA PREGADORA COMPLETO.pdf' },
        { file: 'PLANNER DE CULTOS FEMININOS COMPLETO.pdf', name: 'PLANNER DE CULTOS FEMININOS COMPLETO.pdf' },
        { file: '30 DINAMICAS BIBLICAS PARA CULTOS E ENCONTROS DE MULHERES.pdf', name: '30 DINÂMICAS BÍBLICAS PARA CULTOS E ENCONTROS DE MULHERES.pdf' },
    ];

    for (let i = 0; i < pdfs.length; i++) {
        const item = pdfs[i];
        const fullPdfPath = path.join(__dirname, 'public', 'funil3', item.file);
        if (fs.existsSync(fullPdfPath)) {
            try {
                const pdfBuffer = fs.readFileSync(fullPdfPath);
                await sock.sendMessage(remoteJid, {
                    document: pdfBuffer,
                    fileName: item.name,
                    mimetype: 'application/pdf',
                });
                logConversation(botId, userPhone, 'BOT', 'DOCUMENT', `📄 [PDF ${i + 1}/5]: ${item.name}`);
                console.log(`[Funil 3] 📄 PDF ${i + 1}/5 enviado com sucesso: ${item.name}`);
            } catch (pdfErr) {
                console.warn(`[Funil 3 PDF ${i + 1} Error]:`, pdfErr?.message);
            }
        }
        await new Promise((r) => setTimeout(r, 1400));
    }

    const driveText = `Se não conseguir abrir no WhatsApp, vou deixar o link dos materiais abaixo 👇\n\nhttps://drive.google.com/drive/folders/1FPYg1bkaf5YYRvQI_YjjNk3CSdwKVEvT?usp=sharing`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, driveText);
    await new Promise((r) => setTimeout(r, 1000));

    const finalNotice = `Prontinho, já te enviei tudo, conforme o combinado, espero que goste, tá bom? 🥰\n\nAgora é com você 💛\nVou te mandar um último áudio, e já passo os dados do pagamento 🙏`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, finalNotice);
    await new Promise((r) => setTimeout(r, 1000));

    try { await sock.sendPresenceUpdate('recording', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1500));

    const audioPixPath = path.join(__dirname, 'public', 'funil3', 'audio_pix.mp3');
    if (fs.existsSync(audioPixPath)) {
        try {
            const mp3Buffer = fs.readFileSync(audioPixPath);
            await sock.sendMessage(remoteJid, {
                audio: mp3Buffer,
                mimetype: 'audio/mpeg',
                ptt: true,
            });
            logConversation(botId, userPhone, 'BOT', 'AUDIO', '🎙️ [Áudio 2 PIX Funil 3 MP3 27s]');
            console.log(`[Funil 3] 🎙️ Áudio 2 MP3 enviado para ${userPhone}`);
        } catch (mp3Err) {
            console.warn('[Funil 3 Áudio 2 Error]:', mp3Err?.message);
        }
    }
    try { await sock.sendPresenceUpdate('paused', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1000));

    const tabelaImgPath = path.join(__dirname, 'public', 'funil3', 'tabela_pix.jpeg');
    if (fs.existsSync(tabelaImgPath)) {
        try {
            const imgBuffer = fs.readFileSync(tabelaImgPath);
            await sock.sendMessage(remoteJid, { image: imgBuffer });
        } catch (imgErr) {}
    }
    await new Promise((r) => setTimeout(r, 1000));

    const pixSonText = `O pix estará em nome do meu filho:\n• Marco Antonio\n\nEle que me ajuda a organizar as finanças 🥰`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, pixSonText);
    await new Promise((r) => setTimeout(r, 600));

    const pixKey = '11967837631';
    await sock.sendMessage(remoteJid, { text: pixKey });
    logConversation(botId, userPhone, 'BOT', 'PIX', `Chave PIX: ${pixKey}`);
    await new Promise((r) => setTimeout(r, 800));

    const instructText = `Nome: Marco Antonio (Meu Filho)\nChave Pix Celular: 11 967837631\n\nCaso ache mais fácil, aqui em cima você pode apenas clicar e copiar a chave pix celular no banco 💙\n\nIrmã, seu apoio ajuda este trabalho a alcançar outras mulheres que também desejam crescer na Palavra. 💛\n\nSe puder contribuir com R$20 ou R$30, você também recebe os 4 bônus especiais que preparei com carinho para enriquecer seus estudos e ministrações.\n\nÉ minha forma de agradecer por caminhar comigo! 🎁\n\nDepois, me envie o comprovante por aqui para eu liberar seus bônus. 🙏`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, instructText);
    await new Promise((r) => setTimeout(r, 1000));

    const bonusImgPath = path.join(__dirname, 'public', 'funil3', 'bonus_esbocos.jpeg');
    if (fs.existsSync(bonusImgPath)) {
        try {
            const imgBuffer = fs.readFileSync(bonusImgPath);
            await sock.sendMessage(remoteJid, { image: imgBuffer });
        } catch (imgErr) {}
    }
    await new Promise((r) => setTimeout(r, 1000));

    const bonusDetailText = `4 BÔNUS EXCLUSIVOS APÓS SUA CONTRIBUIÇÃO 🎁🙏\n\n💬 Comunidade de Pregadoras no WhatsApp, com conteúdos para suas ministrações;\n📕 Guia da Pregadora, para preparar e organizar suas mensagens com confiança;\n🖼️ 50 Ilustrações, para tornar suas pregações mais marcantes;\n📖 500 Versículos Organizados por Tema, para facilitar seus estudos.\n\nTodos GRATUITOS!!`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, bonusDetailText);
    await new Promise((r) => setTimeout(r, 1000));

    const askProofText = `Quando pagar, por gentileza, manda o comprovante aqui na nossa conversa!!\n\nPode ser um Print também, apenas para me ajudar com o controle do financeiro ❤️`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, askProofText);

    const sessionKey = `${botId}:${userPhone}`;
    store.userSessions[sessionKey] = {
        botId,
        userJid: remoteJid,
        userPhone,
        userName: pushName,
        funnel: 'funil3',
        waitingFor: 'PIX_RECEIPT_FUNIL3',
        updatedAt: new Date().toISOString(),
    };
    saveStore(store);

    scheduleFunil3Reminder(botId, remoteJid, userPhone);
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNIL 4: Jornada da Bíblia - João Antônio (Gatilho: teste4)
// ═══════════════════════════════════════════════════════════════════════════════

async function sendFunil4Phase1(botId, sock, remoteJid, userPhone, pushName) {
    console.log(`[Funil 4 - Jornada Bíblia] 🚀 Iniciando Fase 1 para ${pushName} (${userPhone})`);

    await sendRealisticText(botId, sock, remoteJid, userPhone, 'A Paz do Senhor!');
    await new Promise((r) => setTimeout(r, 1200));

    try { await sock.sendPresenceUpdate('recording', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 2000));

    const mp3Path = path.join(__dirname, 'public', 'funil4', 'audio_apresentacao.mp3');
    if (fs.existsSync(mp3Path)) {
        try {
            const mp3Buffer = fs.readFileSync(mp3Path);
            await sock.sendMessage(remoteJid, {
                audio: mp3Buffer,
                mimetype: 'audio/mpeg',
                ptt: true,
            });
            logConversation(botId, userPhone, 'BOT', 'AUDIO', '🎙️ [Áudio Apresentação Funil 4 MP3 46s]');
            console.log(`[Funil 4] 🎙️ Áudio 1 MP3 enviado para ${userPhone}`);
        } catch (mp3Err) {
            console.warn('[Funil 4 MP3 Send Error]:', mp3Err?.message);
        }
    }
    try { await sock.sendPresenceUpdate('paused', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1200));

    const offerText = `📘 Jornada da Bíblia - de Gênesis a Apocalipse\n(Uma explicação simples e didática de todos os 66 livros da Bíblia)\n\nDe 59,00 por: R$20,00\n\nPentateuco, Livros Históricos, Livros Poéticos, Profetas Maiores e Menores, Evangelhos, Livro Histórico, Cartas e Livro Profético\n\nBônus após o pagamento 👇\n• Curiosidades da Bíblia\n• 7 Estudos do Apocalipse`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, offerText);
    await new Promise((r) => setTimeout(r, 1200));

    const trustText = `O acesso ao conteúdo é vitalicio! Você pode imprimir ou ler pelo celular\n\nO valor sugerido é R$20,00\nVc só paga depois de receber tudo!\n\nPorém a contribuição é voluntaria e pode ser até menos, seja 10, 15 reais..\n\nPosso lhe enviar o estudo?`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, trustText);

    const sessionKey = `${botId}:${userPhone}`;
    store.userSessions[sessionKey] = {
        botId,
        userJid: remoteJid,
        userPhone,
        userName: pushName,
        funnel: 'funil4',
        waitingFor: 'CONFIRM_SEND_FUNIL4',
        updatedAt: new Date().toISOString(),
    };
    saveStore(store);
}

async function sendFunil4Phase2(botId, sock, remoteJid, userPhone, pushName, quotedMsg = null) {
    console.log(`[Funil 4 - Jornada Bíblia] 📦 Iniciando Fase 2 (Entrega e PIX) para ${pushName} (${userPhone})`);

    const quoteOptions = quotedMsg ? { quoted: quotedMsg } : {};
    const textTrust = `Estarei enviando e confiando em você, fique avontade para abrir o material`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, textTrust, quoteOptions);
    await new Promise((r) => setTimeout(r, 1200));

    const pdfs = [
        { file: 'OS 4 EVANGELHOS (1).pdf', name: 'OS 4 EVANGELHOS (1).pdf' },
        { file: 'Jornada-Da-Bíblia Parte 01 (1).pdf', name: 'Jornada-Da-Bíblia Parte 01 (1).pdf' },
        { file: 'Jornada-Da-Bíblia Parte 02.pdf', name: 'Jornada-Da-Bíblia Parte 02.pdf' },
        { file: 'Jornada-Da-Bíblia Parte 03.pdf', name: 'Jornada-Da-Bíblia Parte 03.pdf' },
        { file: 'Jornada-Da-Bíblia Parte 04.pdf', name: 'Jornada-Da-Bíblia Parte 04.pdf' },
    ];

    for (let i = 0; i < pdfs.length; i++) {
        const item = pdfs[i];
        const fullPdfPath = path.join(__dirname, 'public', 'funil4', item.file);
        if (fs.existsSync(fullPdfPath)) {
            try {
                const pdfBuffer = fs.readFileSync(fullPdfPath);
                await sock.sendMessage(remoteJid, {
                    document: pdfBuffer,
                    fileName: item.name,
                    mimetype: 'application/pdf',
                });
                logConversation(botId, userPhone, 'BOT', 'DOCUMENT', `📄 [PDF ${i + 1}/5]: ${item.name}`);
                console.log(`[Funil 4] 📄 PDF ${i + 1}/5 enviado com sucesso: ${item.name}`);
            } catch (pdfErr) {
                console.warn(`[Funil 4 PDF ${i + 1} Error]:`, pdfErr?.message);
            }
        }
        await new Promise((r) => setTimeout(r, 1400));
    }

    const driveAndValuesText = `Para facilitar ainda mais, deixei o link do Livro aqui, pasta do (Drive)\n\nhttps://drive.google.com/drive/folders/1MmPfQsBbDj964JUyDdx_BiN6pEhtL5W?usp=sharing\n\nValor sugerido: R$20,00\n⭐️ Gostei muito: R$30,00\n⭐️⭐️ Quero abençoar ainda mais: R$50,00\n\nIsso ajuda a continuarmos esse propósito!\nCaso não possa contribuir com o valor integral, fique a vontade para enviar o valor que puder!`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, driveAndValuesText);
    await new Promise((r) => setTimeout(r, 1200));

    const pixPrompt = `Chave Pix CELULAR\nNome da Chave :JOÃO GABRIEL\n👇 Só copiar e colar NÚMERO CELULAR 👇`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, pixPrompt);
    await new Promise((r) => setTimeout(r, 600));

    const pixKey = '82996898259';
    await sock.sendMessage(remoteJid, { text: pixKey });
    logConversation(botId, userPhone, 'BOT', 'PIX', `Chave PIX: ${pixKey}`);
    await new Promise((r) => setTimeout(r, 800));

    const bonusNotice = `Após o pagamento, me envie o comprovante aqui, que eu vou te enviar como BÔNUS:\n7 ESTUDOS DO APOCALIPSE\nCURIOSIDADES DA BÍBLIA`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, bonusNotice);

    const sessionKey = `${botId}:${userPhone}`;
    store.userSessions[sessionKey] = {
        botId,
        userJid: remoteJid,
        userPhone,
        userName: pushName,
        funnel: 'funil4',
        waitingFor: 'PIX_RECEIPT_FUNIL4',
        updatedAt: new Date().toISOString(),
    };
    saveStore(store);

    scheduleFunil4Reminder(botId, remoteJid, userPhone);
}

async function handleIncomingMessage(botId, sock, msg) {
    if (!msg.message || msg.key.fromMe) return;

    const remoteJid = msg.key.remoteJid || '';
    if (!remoteJid || remoteJid === 'status@broadcast' || remoteJid.endsWith('@g.us') || remoteJid.endsWith('@newsletter')) {
        return;
    }

    const userPhone = remoteJid.split('@')[0].split(':')[0];
    const pushName = msg.pushName || 'Cliente';

    const textContent =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        msg.message.documentMessage?.caption ||
        msg.message.buttonsResponseMessage?.selectedDisplayText ||
        msg.message.listResponseMessage?.title ||
        '';

    const hasImage = !!msg.message.imageMessage;
    const hasDocument = !!msg.message.documentMessage || !!msg.message.documentWithCaptionMessage;
    const hasMediaReceipt = hasImage || hasDocument;

    console.log(`[Funil X1] 📩 Mensagem de ${pushName} (${userPhone}): "${textContent || (hasMediaReceipt ? '[COMPROVANTE]' : '')}"`);

    logConversation(
        botId,
        userPhone,
        'USER',
        hasImage ? 'IMAGE' : hasDocument ? 'DOCUMENT' : 'TEXT',
        textContent || (hasMediaReceipt ? '[Comprovante Enviado]' : '[Mensagem]'),
        pushName
    );

    const sessionKey = `${botId}:${userPhone}`;
    let session = store.userSessions[sessionKey];

    const normalizedText = textContent.trim().toLowerCase();

    // Roteador Multi-Funil por Gatilhos de Teste (teste1 a teste10):
    const isTest1 = ['teste1', 'teste 1', '#teste1', '!teste1', '/teste1', 'teste', 'test', '#teste', '!teste', '/teste'].some(k => normalizedText === k || normalizedText.startsWith(k + ' '));
    const isTest2 = ['teste2', 'teste 2', '#teste2', '!teste2', '/teste2'].some(k => normalizedText === k || normalizedText.startsWith(k + ' '));
    const isTest3 = ['teste3', 'teste 3', '#teste3', '!teste3', '/teste3'].some(k => normalizedText === k || normalizedText.startsWith(k + ' '));
    const isTest4 = ['teste4', 'teste 4', '#teste4', '!teste4', '/teste4'].some(k => normalizedText === k || normalizedText.startsWith(k + ' '));
    const isTest5 = ['teste5', 'teste 5', '#teste5', '!teste5', '/teste5'].some(k => normalizedText === k || normalizedText.startsWith(k + ' '));
    const isTest6 = ['teste6', 'teste 6', '#teste6', '!teste6', '/teste6'].some(k => normalizedText === k || normalizedText.startsWith(k + ' '));
    const isTest7 = ['teste7', 'teste 7', '#teste7', '!teste7', '/teste7'].some(k => normalizedText === k || normalizedText.startsWith(k + ' '));
    const isTest8 = ['teste8', 'teste 8', '#teste8', '!teste8', '/teste8'].some(k => normalizedText === k || normalizedText.startsWith(k + ' '));
    const isTest9 = ['teste9', 'teste 9', '#teste9', '!teste9', '/teste9'].some(k => normalizedText === k || normalizedText.startsWith(k + ' '));
    const isTest10 = ['teste10', 'teste 10', '#teste10', '!teste10', '/teste10'].some(k => normalizedText === k || normalizedText.startsWith(k + ' '));

    const cancelAllTimers = () => {
        cancelParabolasReminder(botId, userPhone);
        cancelFunil2Reminder(botId, userPhone);
        cancelFunil3Reminder(botId, userPhone);
        cancelFunil4Reminder(botId, userPhone);
    };

    // DISPARO FUNIL 1: As 40 Parábolas de Jesus
    if (isTest1) {
        console.log(`[Funil 1 - Parábolas] 🚀 Disparo de TESTE 1 recebido de ${pushName} (${userPhone})`);
        cancelAllTimers();
        session = null;
        delete store.userSessions[sessionKey];
        saveStore(store);
        await sendParabolasPhase1(botId, sock, remoteJid, userPhone, pushName);
        return;
    }

    // DISPARO FUNIL 2: Guia de Cuidados com Pessoa Acamada
    if (isTest2) {
        console.log(`[Funil 2 - Acamados] 🚀 Disparo de TESTE 2 recebido de ${pushName} (${userPhone})`);
        cancelAllTimers();
        session = null;
        delete store.userSessions[sessionKey];
        saveStore(store);
        await sendFunil2Phase1(botId, sock, remoteJid, userPhone, pushName);
        return;
    }

    // DISPARO FUNIL 3: 500 Esboços de Pregações (Missionária Raquel)
    if (isTest3) {
        console.log(`[Funil 3 - Esboços] 🚀 Disparo de TESTE 3 recebido de ${pushName} (${userPhone})`);
        cancelAllTimers();
        session = null;
        delete store.userSessions[sessionKey];
        saveStore(store);
        await sendFunil3Phase1(botId, sock, remoteJid, userPhone, pushName);
        return;
    }

    // DISPARO FUNIL 4: Jornada da Bíblia (João Antônio)
    if (isTest4) {
        console.log(`[Funil 4 - Jornada Bíblia] 🚀 Disparo de TESTE 4 recebido de ${pushName} (${userPhone})`);
        cancelAllTimers();
        session = null;
        delete store.userSessions[sessionKey];
        saveStore(store);
        await sendFunil4Phase1(botId, sock, remoteJid, userPhone, pushName);
        return;
    }

    // SLOTS 5 A 10
    const testSlot = isTest5 ? 5 : isTest6 ? 6 : isTest7 ? 7 : isTest8 ? 8 : isTest9 ? 9 : isTest10 ? 10 : null;
    if (testSlot) {
        console.log(`[Slot Funil ${testSlot}] 🚀 Disparo de TESTE ${testSlot} recebido de ${pushName} (${userPhone})`);
        cancelAllTimers();
        session = null;
        delete store.userSessions[sessionKey];
        saveStore(store);
        await sendRealisticText(
            botId,
            sock,
            remoteJid,
            userPhone,
            `🚀 *Slot Funil ${testSlot} Ativo!*\n\nA pasta \`funil ${testSlot}/\` está criada com a subpasta \`ads/\` e conectada neste WhatsApp.\n\nBasta colocar os materiais, cópia e PDFs na pasta para ativarmos o envio automático!`
        );
        return;
    }

    // Se NÃO tem sessão ativa ou NÃO está aguardando ação do funil, IGNORA
    if (!session || !session.waitingFor) {
        console.log(`[Funil X1] ℹ️ Mensagem ignorada de ${pushName} (${userPhone}): "${textContent}".`);
        return;
    }

    // ─── Respostas de Confirmação ("Posso enviar?") ───

    // Funil 1: Parábolas
    if (session.waitingFor === 'CONFIRM_SEND_PARABOLAS') {
        const isNegative = ['não', 'nao', 'agora não', 'agora nao', 'depois', 'nop', 'cancelar'].includes(normalizedText);
        if (isNegative) {
            await sendRealisticText(botId, sock, remoteJid, userPhone, 'Sem problemas! Se desejar receber depois, é só me mandar uma mensagem por aqui. Fique na Paz do Senhor! 🙏');
            session.waitingFor = null;
            saveStore(store);
            return;
        }
        const emoji = getHumanReactionEmoji(textContent);
        await reactToMessage(sock, remoteJid, msg.key, emoji);
        await sendParabolasPhase2(botId, sock, remoteJid, userPhone, pushName, msg);
        return;
    }

    // Funil 2: Acamados
    if (session.waitingFor === 'CONFIRM_SEND_FUNIL2') {
        const isNegative = ['não', 'nao', 'agora não', 'agora nao', 'depois', 'nop', 'cancelar'].includes(normalizedText);
        if (isNegative) {
            await sendRealisticText(botId, sock, remoteJid, userPhone, 'Sem problemas! Quando quiser o guia para te ajudar a cuidar de quem você ama, estarei por aqui. Fique com Deus! 💙');
            session.waitingFor = null;
            saveStore(store);
            return;
        }
        const emoji = getHumanReactionEmoji(textContent);
        await reactToMessage(sock, remoteJid, msg.key, emoji);
        await sendFunil2Phase2(botId, sock, remoteJid, userPhone, pushName, msg);
        return;
    }

    // Funil 3: Esboços
    if (session.waitingFor === 'CONFIRM_SEND_FUNIL3') {
        const isNegative = ['não', 'nao', 'agora não', 'agora nao', 'depois', 'nop', 'cancelar'].includes(normalizedText);
        if (isNegative) {
            await sendRealisticText(botId, sock, remoteJid, userPhone, 'Tudo bem, minha irmã! Que Deus abençoe seu ministério e quando desejar os esboços, me avise por aqui! 🙏💛');
            session.waitingFor = null;
            saveStore(store);
            return;
        }
        const emoji = getHumanReactionEmoji(textContent);
        await reactToMessage(sock, remoteJid, msg.key, emoji);
        await sendFunil3Phase2(botId, sock, remoteJid, userPhone, pushName, msg);
        return;
    }

    // Funil 4: Jornada Bíblia
    if (session.waitingFor === 'CONFIRM_SEND_FUNIL4') {
        const isNegative = ['não', 'nao', 'agora não', 'agora nao', 'depois', 'nop', 'cancelar'].includes(normalizedText);
        if (isNegative) {
            await sendRealisticText(botId, sock, remoteJid, userPhone, 'Sem problemas! Fique na Paz do Senhor! 🙏');
            session.waitingFor = null;
            saveStore(store);
            return;
        }
        const emoji = getHumanReactionEmoji(textContent);
        await reactToMessage(sock, remoteJid, msg.key, emoji);
        await sendFunil4Phase2(botId, sock, remoteJid, userPhone, pushName, msg);
        return;
    }

    // ─── Respostas de Comprovante de Pagamento (PIX) ───
    const waitingReceiptFunnels = ['PIX_RECEIPT', 'PIX_RECEIPT_FUNIL2', 'PIX_RECEIPT_FUNIL3', 'PIX_RECEIPT_FUNIL4'];
    if (waitingReceiptFunnels.includes(session.waitingFor)) {
        if (!hasMediaReceipt) {
            const emoji = getHumanReactionEmoji(textContent);
            await reactToMessage(sock, remoteJid, msg.key, emoji);
            await sendRealisticText(botId, sock, remoteJid, userPhone, 'Por favor, me envie a *foto ou o PDF do comprovante do PIX* aqui na conversa para eu liberar o seu acesso completo e bônus! 👇');
            return;
        }

        // Reage IMEDIATAMENTE com ❤️ na foto/PDF do comprovante
        await reactToMessage(sock, remoteJid, msg.key, '❤️');

        store.funnelStats.receiptReceivedCount = (store.funnelStats.receiptReceivedCount || 0) + 1;
        saveStore(store);

        await sendRealisticText(botId, sock, remoteJid, userPhone, '⏳ Recebi o seu comprovante! Estou validando com a nossa IA, só um instante...');

        const mimeType = msg.message?.imageMessage?.mimetype || msg.message?.documentMessage?.mimetype || 'image/jpeg';
        let mediaBuffer = null;
        try {
            mediaBuffer = await getMediaBuffer(msg, sock);
        } catch (downloadErr) {
            console.error('[Baileys Media Error]:', downloadErr);
        }

        let expectedAmount = 25.00;
        let beneficiary = 'GPS EBOOKS DIGITAIS LTDA';
        let funnelName = 'As 40 Parábolas de Jesus';

        if (session.waitingFor === 'PIX_RECEIPT_FUNIL2') {
            expectedAmount = 10.00;
            beneficiary = 'SANTOS LIVROS';
            funnelName = 'Guia Cuidados com Pessoa Acamada';
            cancelFunil2Reminder(botId, userPhone);
        } else if (session.waitingFor === 'PIX_RECEIPT_FUNIL3') {
            expectedAmount = 10.00;
            beneficiary = 'Marco Antonio';
            funnelName = '500 Esboços de Pregações';
            cancelFunil3Reminder(botId, userPhone);
        } else if (session.waitingFor === 'PIX_RECEIPT_FUNIL4') {
            expectedAmount = 20.00;
            beneficiary = 'JOÃO GABRIEL';
            funnelName = 'Jornada da Bíblia';
            cancelFunil4Reminder(botId, userPhone);
        } else {
            cancelParabolasReminder(botId, userPhone);
        }

        let auditResult = { isValid: false, reason: 'Não foi possível baixar o arquivo do comprovante.' };
        if (mediaBuffer) {
            auditResult = await auditPixReceiptWithGemini(mediaBuffer, mimeType, expectedAmount, beneficiary);
        }

        if (auditResult.isValid) {
            const paidValue = auditResult.details?.valor || expectedAmount;
            store.funnelStats.convertedCount = (store.funnelStats.convertedCount || 0) + 1;
            store.funnelStats.totalRevenue = Number(((store.funnelStats.totalRevenue || 0) + paidValue).toFixed(2));
            store.funnelStats.recentConversions.unshift({
                userPhoneNumber: userPhone,
                paidAmount: paidValue,
                updatedAt: new Date().toISOString(),
                funnel: funnelName,
            });
            session.waitingFor = null;
            saveStore(store);

            await sendRealisticText(
                botId,
                sock,
                remoteJid,
                userPhone,
                `Glória a Deus! 🙌 Pagamento de R$ ${paidValue.toFixed(2).replace('.', ',')} confirmado com sucesso! Muito obrigado pela sua contribuição e honestidade. Que Deus abençoe grandemente você e sua família! ✨`
            );
            await new Promise((r) => setTimeout(r, 1200));

            if (session.funnel === 'funil3') {
                const bonusText = `🎁 *Acesso aos Bônus da Missionária Raquel Liberados:*\n\n1. Comunidade de Pregadoras no WhatsApp\n2. Guia da Pregadora\n3. 50 Ilustrações para Pregações\n4. 500 Versículos Organizados por Tema\n\nLink de acesso permanente:\nhttps://drive.google.com/drive/folders/1FPYg1bkaf5YYRvQI_YjjNk3CSdwKVEvT?usp=sharing`;
                await sendRealisticText(botId, sock, remoteJid, userPhone, bonusText);
            } else if (session.funnel === 'funil4') {
                const bonusText = `🎁 *Bônus da Jornada da Bíblia Liberados:*\n\n1. Curiosidades da Bíblia\n2. 7 Estudos do Apocalipse\n\nLink da pasta oficial:\nhttps://drive.google.com/drive/folders/1MmPfQsBbDj964JUyDdx_BiN6pEhtL5W?usp=sharing`;
                await sendRealisticText(botId, sock, remoteJid, userPhone, bonusText);
            } else if (session.funnel === 'funil2') {
                const bonusText = `🎁 *Seus Bônus de Cuidados com Acamados foram Liberados!*\n\nAcesso aos kits extras de mobilidade, massagens, alongamentos e receitas fáceis. Que Deus abençoe você e sua família no cuidado de quem você ama! 💙`;
                await sendRealisticText(botId, sock, remoteJid, userPhone, bonusText);
            } else {
                const bonusText = `🎁 *Aqui estão os seus bônus exclusivos conforme prometido:*\n\n1. Curiosidades da Bíblia\n2. Material Extra: Escatologia — Estudo sobre os Tempos Finais\n\nVocê pode acessar todo o material diretamente na pasta do Google Drive:\nhttps://drive.google.com/drive/folders/1VQ2kDbxKha7_CxeKaGlg0rptQp-ZEY1UO?usp=sharing`;
                await sendRealisticText(botId, sock, remoteJid, userPhone, bonusText);
            }
            return;
        } else {
            await sendRealisticText(
                botId,
                sock,
                remoteJid,
                userPhone,
                `⚠️ Oi! Analisei o arquivo enviado, mas ${auditResult.reason}\n\nPor favor, envie o comprovante definitivo do PIX aqui na conversa para eu liberar o seu bônus completo!`
            );
            return;
        }
    }

    console.log(`[Funil X1] ℹ️ Fim de processamento sem ação para ${pushName} (${userPhone}): "${textContent}"`);
}

async function resolveMediaBuffer(targetUrl, defaultFilename) {
    if (targetUrl) {
        const directLocalPath = path.join(__dirname, 'public', targetUrl);
        if (fs.existsSync(directLocalPath)) {
            return { buffer: fs.readFileSync(directLocalPath), filename: defaultFilename || path.basename(targetUrl) };
        }
    }
    const filename = defaultFilename || (targetUrl ? path.basename(targetUrl.split('?')[0]) : null);
    if (filename) {
        const localPath = path.join(__dirname, 'public', filename);
        if (fs.existsSync(localPath)) {
            return { buffer: fs.readFileSync(localPath), filename };
        }
    }
    if (targetUrl && (targetUrl.startsWith('http://') || targetUrl.startsWith('https://'))) {
        try {
            const res = await axios.get(targetUrl, { responseType: 'arraybuffer', timeout: 15000 });
            return { buffer: Buffer.from(res.data), filename: filename || 'file' };
        } catch (err) {
            console.error('[resolveMediaBuffer] Erro download URL:', targetUrl, err?.message);
        }
    }
    return null;
}

async function executeFromNode(botId, sock, remoteJid, session, nodeId, nodes, edges) {
    const node = nodes.find((n) => n.nodeId === nodeId);
    if (!node) return;

    session.currentNodeId = node.nodeId;
    session.updatedAt = new Date().toISOString();
    saveStore(store);

    const config = node.config || {};
    const nodeType = (node.nodeType || '').toUpperCase();

    switch (nodeType) {
        case 'AUDIO': {
            const durationSec = Math.min(Math.max(Number(config.recordingDurationSeconds) || 4, 1), 15);
            try {
                await sock.sendPresenceUpdate('recording', remoteJid);
            } catch {}
            await new Promise((r) => setTimeout(r, durationSec * 1000));

            const audioUrl = config.audioUrl || 'audio.mp3';
            let sentAudio = false;
            try {
                const media = await resolveMediaBuffer(audioUrl, 'audio.mp3');
                if (media && media.buffer) {
                    const isMp3 = media.filename.toLowerCase().endsWith('.mp3');
                    const sendAudioMsg = async () => {
                        await sock.sendMessage(remoteJid, {
                            audio: media.buffer,
                            mimetype: isMp3 ? 'audio/mpeg' : 'audio/ogg; codecs=opus',
                            ptt: true,
                        });
                    };
                    try {
                        await sendAudioMsg();
                        sentAudio = true;
                    } catch (firstErr) {
                        console.warn('[Audio Send Retry]:', firstErr?.message);
                        await new Promise((r) => setTimeout(r, 1000));
                        await sendAudioMsg();
                        sentAudio = true;
                    }
                    if (sentAudio) {
                        logConversation(botId, session.userPhone, 'BOT', 'AUDIO', `🎙️ [Áudio enviado: ${media.filename}]`);
                    }
                }
            } catch (err) {
                console.error('[Audio Send Error]:', err?.message);
            }

            if (!sentAudio) {
                const text =
                    config.fallbackText ||
                    `🎙️ *Olá, ${session.userName}!* Que alegria ter você aqui! Já separei o seu material completo para te entregar agora mesmo.`;
                await sock.sendMessage(remoteJid, { text });
                logConversation(botId, session.userPhone, 'BOT', 'AUDIO', text);
            }
            try {
                await sock.sendPresenceUpdate('paused', remoteJid);
            } catch {}
            break;
        }

        case 'MEDIA': {
            const mediaUrl = config.mediaUrl || 'Material_Exclusivo_Carol.pdf';
            const caption = config.caption || '📦 Aqui está seu acesso exclusivo! Dá uma olhada no conteúdo com carinho.';
            try {
                await sock.sendPresenceUpdate('composing', remoteJid);
            } catch {}
            await new Promise((r) => setTimeout(r, 1500));

            let sentMedia = false;
            try {
                const media = await resolveMediaBuffer(mediaUrl, 'Material_Exclusivo_Carol.pdf');
                if (media && media.buffer) {
                    await sock.sendMessage(remoteJid, {
                        document: media.buffer,
                        mimetype: 'application/pdf',
                        fileName: config.filename || media.filename || 'Material_Exclusivo_Carol.pdf',
                        caption,
                    });
                    sentMedia = true;
                    logConversation(botId, session.userPhone, 'BOT', 'DOCUMENT', `📦 [Documento PDF Enviado]: ${media.filename}`);
                }
            } catch (err) {
                console.error('[Media Send Error]:', err?.message);
            }

            if (!sentMedia) {
                await sock.sendMessage(remoteJid, { text: `📦 ${caption}` });
                logConversation(botId, session.userPhone, 'BOT', 'DOCUMENT', `📦 ${caption}`);
            }
            store.funnelStats.materialDeliveredCount += 1;
            saveStore(store);
            break;
        }

        case 'PIX': {
            const pixKey = config.pixKey || 'pagamentos@seunegocio.com';
            const beneficiaryName = config.beneficiaryName || 'Carol';
            const amount = config.amount || '19.90';
            const msg = config.message || `O valor simbólico é de apenas *R$ ${amount}*!`;

            await sendRealisticText(
                botId,
                sock,
                remoteJid,
                session.userPhone,
                `💸 ${msg}\n\n👇 *Só copiar a chave:*`
            );
            await new Promise((r) => setTimeout(r, 600));

            // Tenta enviar o cartão com botão nativo "Copiar chave Pix" (cta_copy)
            try {
                if (generateWAMessageFromContent && proto) {
                    const buttonParams = {
                        display_text: 'Copiar chave Pix',
                        id: 'copy_pix_key',
                        copy_code: pixKey
                    };

                    const buttons = [
                        {
                            name: 'cta_copy',
                            buttonParamsJson: JSON.stringify(buttonParams)
                        }
                    ];

                    const interactiveMessage = proto.Message?.InteractiveMessage?.create
                        ? proto.Message.InteractiveMessage.create({
                              body: proto.Message.InteractiveMessage.Body?.create
                                  ? proto.Message.InteractiveMessage.Body.create({ text: `💰 *Valor:* R$ ${amount}` })
                                  : { text: `💰 *Valor:* R$ ${amount}` },
                              footer: proto.Message.InteractiveMessage.Footer?.create
                                  ? proto.Message.InteractiveMessage.Footer.create({ text: 'Toque no botão abaixo para copiar' })
                                  : { text: 'Toque no botão abaixo para copiar' },
                              header: proto.Message.InteractiveMessage.Header?.create
                                  ? proto.Message.InteractiveMessage.Header.create({
                                        title: beneficiaryName,
                                        subtitle: `Chave: ${pixKey}`,
                                        hasMediaAttachment: false
                                    })
                                  : {
                                        title: beneficiaryName,
                                        subtitle: `Chave: ${pixKey}`,
                                        hasMediaAttachment: false
                                    },
                              nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage?.create
                                  ? proto.Message.InteractiveMessage.NativeFlowMessage.create({
                                        buttons
                                    })
                                  : {
                                        buttons
                                    }
                          })
                        : {
                              body: { text: `💰 *Valor:* R$ ${amount}` },
                              footer: { text: 'Toque no botão abaixo para copiar' },
                              header: {
                                  title: beneficiaryName,
                                  subtitle: `Chave: ${pixKey}`,
                                  hasMediaAttachment: false
                              },
                              nativeFlowMessage: {
                                  buttons
                              }
                          };

                    const waMessage = generateWAMessageFromContent(
                        remoteJid,
                        {
                            messageContextInfo: {
                                deviceListMetadata: {},
                                deviceListMetadataVersion: 2,
                                messageSecret: crypto.randomBytes(32)
                            },
                            interactiveMessage
                        },
                        {}
                    );

                    await sock.relayMessage(remoteJid, waMessage.message, {
                        messageId: waMessage.key.id,
                        additionalNodes: [
                            {
                                tag: 'biz',
                                attrs: {
                                    actual_actors: '2',
                                    host_storage: '2',
                                    privacy_mode_ts: String(Math.floor(Date.now() / 1000))
                                },
                                content: [
                                    {
                                        tag: 'interactive',
                                        attrs: { type: 'native_flow', v: '1' },
                                        content: [
                                            {
                                                tag: 'native_flow',
                                                attrs: { v: '9', name: 'mixed' }
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    });
                    logConversation(botId, session.userPhone, 'BOT', 'PIX', `[Botão Nativo PIX cta_copy]: ${pixKey}`);
                }
            } catch (interactiveErr) {
                console.error('[PIX Native Button Error]:', interactiveErr?.message);
            }

            // Envia SEMPRE a chave PIX avulsa em texto logo em seguida.
            // Garante 100% de conversão em qualquer versão do WhatsApp (iPhone, Android ou Web)
            // sem nunca deixar espaço em branco!
            await new Promise((r) => setTimeout(r, 600));
            await sock.sendMessage(remoteJid, { text: pixKey });
            logConversation(botId, session.userPhone, 'BOT', 'PIX', `Chave PIX: ${pixKey}`);

            await new Promise((r) => setTimeout(r, 700));
            await sendRealisticText(
                botId,
                sock,
                remoteJid,
                session.userPhone,
                '👆 *Copie a chave PIX acima* e, assim que concluir, *me envie a foto ou o PDF do comprovante aqui mesmo*!'
            );

            store.funnelStats.pixSentCount += 1;
            saveStore(store);

            const nextEdge = edges.find((e) => (e.source || e.sourceNodeId) === node.nodeId);
            if (nextEdge) {
                const nextTargetId = nextEdge.target || nextEdge.targetNodeId;
                const nextNode = nodes.find((n) => n.nodeId === nextTargetId);
                if (nextNode && (nextNode.nodeType || '').toUpperCase() === 'PIX_VERIFIER') {
                    session.currentNodeId = nextNode.nodeId;
                    session.waitingFor = 'PIX_RECEIPT';
                    saveStore(store);
                    return;
                }
            }
            break;
        }

        case 'PIX_VERIFIER': {
            session.waitingFor = 'PIX_RECEIPT';
            saveStore(store);
            return;
        }

        case 'META_CAPI': {
            const value = Number(config.value || config.eventValue || 19.90);
            const confirmText =
                config.confirmationText ||
                `🎉 *Pagamento de R$ ${value.toFixed(2).replace('.', ',')} confirmado com sucesso!*\n\nMuito obrigada pela confiança, ${session.userName}! Seu acesso completo já está 100% liberado!`;
            await sendRealisticText(botId, sock, remoteJid, session.userPhone, confirmText);
            break;
        }

        default: {
            if (config.text || config.messageText) {
                await sendRealisticText(botId, sock, remoteJid, session.userPhone, config.text || config.messageText);
            }
            break;
        }
    }

    const nextEdge = edges.find((e) => (e.source || e.sourceNodeId) === node.nodeId);
    if (nextEdge) {
        await new Promise((r) => setTimeout(r, 900));
        await executeFromNode(botId, sock, remoteJid, session, nextEdge.target || nextEdge.targetNodeId, nodes, edges);
    }
}

async function sendRealisticText(botId, sock, remoteJid, userPhone, text, options = {}) {
    try {
        await sock.sendPresenceUpdate('composing', remoteJid);
    } catch {}
    await new Promise((r) => setTimeout(r, 1200));
    await sock.sendMessage(remoteJid, { text }, options);
    logConversation(botId, userPhone, 'BOT', 'TEXT', text);
    try {
        await sock.sendPresenceUpdate('paused', remoteJid);
    } catch {}
}

// Express Server Setup
const app = express();

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }
    next();
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '15mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (_req, res) => {
    res.json({
        success: true,
        message: 'QR Engine Online (Cloud KV Synced)',
        cloudWorkerUrl: CLOUD_WORKER_URL,
        timestamp: new Date().toISOString(),
    });
});

app.get('/api/bots/:botId/whatsapp/qr/status', (req, res) => {
    const botId = String(req.params.botId || 'bot_whatsapp_principal');
    res.json({ success: true, data: getQrStatus(botId) });
});

app.get('/api/bots/:botId/whatsapp/qr/data', (req, res) => {
    const botId = String(req.params.botId || 'bot_whatsapp_principal');
    res.json({
        success: true,
        data: {
            status: getQrStatus(botId),
            conversations: store.conversations || [],
            funnelStats: store.funnelStats || {},
        },
    });
});

app.post('/api/bots/:botId/whatsapp/qr/start', async (req, res) => {
    try {
        const botId = String(req.params.botId || 'bot_whatsapp_principal');
        const forceNew = Boolean(req.body?.forceNew);
        if (req.body?.flows && Array.isArray(req.body.flows) && req.body.flows.length > 0) {
            store.flows[botId] = req.body.flows;
            saveStore(store);
        }
        const state = await startQrSession(botId, forceNew);
        res.json({ success: true, data: state });
    } catch (err) {
        res.status(500).json({ success: false, error: err?.message || 'Erro ao gerar QR' });
    }
});

app.post('/api/bots/:botId/whatsapp/qr/disconnect', async (req, res) => {
    try {
        const botId = String(req.params.botId || 'bot_whatsapp_principal');
        const state = await disconnectQrSession(botId, true);
        res.json({ success: true, data: state });
    } catch (err) {
        res.status(500).json({ success: false, error: err?.message || 'Erro ao desconectar' });
    }
});

app.post('/api/bots/:botId/whatsapp/qr/sync', (req, res) => {
    const botId = String(req.params.botId || 'bot_whatsapp_principal');
    if (req.body?.flows && Array.isArray(req.body.flows)) {
        store.flows[botId] = req.body.flows;
        saveStore(store);
    }
    res.json({ success: true });
});

app.post('/api/bots/:botId/whatsapp/qr/test-message', async (req, res) => {
    try {
        const botId = String(req.params.botId || 'bot_whatsapp_principal');
        const { to, text } = req.body;
        const sock = activeSockets.get(botId);
        if (!sock) {
            res.status(400).json({ success: false, error: 'Escaneie o QR Code primeiro' });
            return;
        }
        const jid = toWhatsAppJid(to);
        await sendRealisticText(botId, sock, jid, to, text || '✅ Teste de conexão OK!');
        res.json({ success: true, message: 'Enviado!' });
    } catch (err) {
        res.status(500).json({ success: false, error: err?.message || 'Erro no envio' });
    }
});

// Also serve built frontend locally at http://localhost:5050
const CLIENT_DIST_DIR = path.join(BASE_RUNTIME_DIR, 'client_build', 'dist');
if (fs.existsSync(CLIENT_DIST_DIR)) {
    app.use(express.static(CLIENT_DIST_DIR, { dotfiles: 'allow' }));
    app.use((req, res, next) => {
        if (req.method === 'GET' && !req.path.startsWith('/api')) {
            res.sendFile(path.join(CLIENT_DIST_DIR, 'index.html'), { dotfiles: 'allow' });
            return;
        }
        next();
    });
}

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Motor QR Code + Cloud KV Sync rodando em http://localhost:${PORT}`);
    startQrSession('bot_whatsapp_principal', false).catch(console.error);
});
