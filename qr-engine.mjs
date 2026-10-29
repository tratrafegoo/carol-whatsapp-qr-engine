import express from 'express';
import cors from 'cors';
import axios from 'axios';
import * as QRCode from 'qrcode';
import pino from 'pino';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import * as baileysPkg from '@whiskeysockets/baileys';

const makeWASocket = baileysPkg.default?.default || baileysPkg.default || baileysPkg.makeWASocket;
const useMultiFileAuthState = baileysPkg.useMultiFileAuthState || baileysPkg.default?.useMultiFileAuthState;
const DisconnectReason = baileysPkg.DisconnectReason || baileysPkg.default?.DisconnectReason;
const fetchLatestBaileysVersion = baileysPkg.fetchLatestBaileysVersion || baileysPkg.default?.fetchLatestBaileysVersion;

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
            audioUrl: 'https://exemplo.com/audios/apresentacao.mp3',
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
            mediaUrl: 'https://exemplo.com/arquivos/material_exclusivo.pdf',
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

    const botFlows = store.flows[botId] || store.flows['bot_whatsapp_principal'] || [];
    const mainFlow = botFlows.find((f) => f.isMainFlow) || botFlows[0];
    const flowData = mainFlow?.draftVersion?.flowData || mainFlow?.flowData || {
        nodes: DEFAULT_FLOW_NODES,
        edges: DEFAULT_FLOW_EDGES,
    };
    const nodes = flowData.nodes || DEFAULT_FLOW_NODES;
    const edges = flowData.edges || DEFAULT_FLOW_EDGES;

    const sessionKey = `${botId}:${userPhone}`;
    let session = store.userSessions[sessionKey];

    const normalizedText = textContent.trim().toLowerCase();
    const isRestartKeyword = ['oi', 'olá', 'ola', 'hi', 'hello', 'começar', 'comecar', 'recomeçar', 'menu', 'inicio', 'início'].includes(normalizedText);

    if (session && session.waitingFor === 'PIX_RECEIPT' && !isRestartKeyword) {
        const verifierNode = nodes.find((n) => n.nodeId === session.currentNodeId) || nodes.find((n) => n.nodeType === 'PIX_VERIFIER');

        if (!hasMediaReceipt) {
            await sendRealisticText(
                botId,
                sock,
                remoteJid,
                userPhone,
                'Por favor, me envie a *foto ou o PDF do comprovante PIX* aqui na conversa para eu liberar o seu acesso! 👇'
            );
            return;
        }

        store.funnelStats.receiptReceivedCount += 1;
        saveStore(store);

        await sendRealisticText(
            botId,
            sock,
            remoteJid,
            userPhone,
            '⏳ Recebi o seu comprovante! Estou verificando o pagamento, só um instante...'
        );

        const expectedAmount = parseFloat(verifierNode?.config?.expectedAmount || '19.90');
        store.funnelStats.convertedCount += 1;
        store.funnelStats.totalRevenue = Number((store.funnelStats.totalRevenue + expectedAmount).toFixed(2));
        session.waitingFor = null;
        saveStore(store);

        const approvedEdge = edges.find(
            (e) => (e.source || e.sourceNodeId) === verifierNode?.nodeId && (!e.sourceHandle || e.sourceHandle === 'approved')
        );
        if (approvedEdge) {
            await executeFromNode(botId, sock, remoteJid, session, approvedEdge.target || approvedEdge.targetNodeId, nodes, edges);
        } else {
            await sendRealisticText(
                botId,
                sock,
                remoteJid,
                userPhone,
                `✅ *Pagamento de R$ ${expectedAmount.toFixed(2).replace('.', ',')} confirmado com sucesso!*\n\nMuito obrigada! Seu acesso completo já está 100% liberado!`
            );
        }
        return;
    }

    const startNode = nodes.find((n) => n.nodeType === 'START') || nodes[0];
    if (!startNode) return;

    session = {
        botId,
        userJid: remoteJid,
        userPhone,
        userName: pushName,
        currentNodeId: startNode.nodeId,
        waitingFor: null,
        variables: { nome: pushName, telefone: userPhone },
        updatedAt: new Date().toISOString(),
    };
    store.userSessions[sessionKey] = session;
    store.funnelStats.startedCount += 1;
    saveStore(store);

    const firstEdge = edges.find((e) => (e.source || e.sourceNodeId) === startNode.nodeId);
    if (firstEdge) {
        await executeFromNode(botId, sock, remoteJid, session, firstEdge.target || firstEdge.targetNodeId, nodes, edges);
    }
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

            const audioUrl = config.audioUrl || '';
            let sentAudio = false;
            if (audioUrl && !audioUrl.includes('exemplo.com')) {
                try {
                    const res = await axios.get(audioUrl, { responseType: 'arraybuffer', timeout: 15000 });
                    await sock.sendMessage(remoteJid, {
                        audio: Buffer.from(res.data),
                        mimetype: 'audio/ogg; codecs=opus',
                        ptt: true,
                    });
                    sentAudio = true;
                } catch {}
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
            const mediaUrl = config.mediaUrl || '';
            const caption = config.caption || '📦 Aqui está o seu material exclusivo!';
            try {
                await sock.sendPresenceUpdate('composing', remoteJid);
            } catch {}
            await new Promise((r) => setTimeout(r, 1500));

            let sentMedia = false;
            if (mediaUrl && !mediaUrl.includes('exemplo.com')) {
                try {
                    const res = await axios.get(mediaUrl, { responseType: 'arraybuffer', timeout: 15000 });
                    await sock.sendMessage(remoteJid, {
                        document: Buffer.from(res.data),
                        mimetype: 'application/pdf',
                        fileName: config.filename || 'Material_Exclusivo.pdf',
                        caption,
                    });
                    sentMedia = true;
                } catch {}
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
            const msg = config.message || `O valor simbólico é de apenas *R$ ${amount}*! Segue a chave PIX para cópia rápida:`;

            await sendRealisticText(
                botId,
                sock,
                remoteJid,
                session.userPhone,
                `💸 ${msg}\n\n👤 *Favorecido:* ${beneficiaryName}\n💰 *Valor:* R$ ${amount}`
            );
            await new Promise((r) => setTimeout(r, 700));
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

async function sendRealisticText(botId, sock, remoteJid, userPhone, text) {
    try {
        await sock.sendPresenceUpdate('composing', remoteJid);
    } catch {}
    await new Promise((r) => setTimeout(r, 1200));
    await sock.sendMessage(remoteJid, { text });
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
