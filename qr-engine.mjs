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

// ─── LISTA MESTRE DOS 13 FUNIS DO CHATBOT X1 ───
export const FUNNELS_CATALOG = [
    {
        id: 'funil1',
        name: 'As 40 Parábolas de Jesus',
        trigger: 'teste1',
        expectedAmount: 25.00,
        beneficiary: 'GPS EBOOKS DIGITAIS LTDA',
        whatsappPhone: '551152291989',
        defaultMessage: 'Olá! Gostaria de receber o material das 40 Parábolas de Jesus [ref_{{campaign.id}}_{{ad.id}}]'
    },
    {
        id: 'funil2',
        name: 'Guia Cuidados com Pessoa Acamada',
        trigger: 'teste2',
        expectedAmount: 10.00,
        beneficiary: 'SANTOS LIVROS',
        whatsappPhone: '558296857184',
        defaultMessage: 'Olá! Gostaria de receber o Guia de Cuidados com Acamados [ref_{{campaign.id}}_{{ad.id}}]'
    },
    {
        id: 'funil3',
        name: '500 Esboços de Pregações (Raquel)',
        trigger: 'teste3',
        expectedAmount: 10.00,
        beneficiary: 'Marco Antonio',
        whatsappPhone: '5511963592672',
        defaultMessage: 'Paz do Senhor! Quero receber os 500 Esboços de Pregações [ref_{{campaign.id}}_{{ad.id}}]'
    },
    {
        id: 'funil4',
        name: 'Jornada da Bíblia (João Antônio)',
        trigger: 'teste4',
        expectedAmount: 20.00,
        beneficiary: 'JOÃO GABRIEL',
        whatsappPhone: '5582996898259',
        defaultMessage: 'Olá João! Gostaria de receber a Jornada da Bíblia [ref_{{campaign.id}}_{{ad.id}}]'
    },
    {
        id: 'funil5',
        name: 'Acervo 5.000+ Sermões Prontos (Vitor)',
        trigger: 'teste5',
        expectedAmount: 19.90,
        beneficiary: 'Vitor Bueno de Carvalho',
        whatsappPhone: '5517981175202',
        defaultMessage: 'Olá! Gostaria de receber o Acervo de Sermões Prontos [ref_{{campaign.id}}_{{ad.id}}]'
    },
    {
        id: 'funil6',
        name: 'Devocional Pelos Filhos (Flávia)',
        trigger: 'teste6',
        expectedAmount: 5.00,
        beneficiary: 'DIGITAL DSX LTDA',
        whatsappPhone: '5512983085720',
        defaultMessage: 'Paz! Quero colocar meu filho no altar de oração e devocional [ref_{{campaign.id}}_{{ad.id}}]'
    },
    {
        id: 'funil7',
        name: 'Construtor de Palavras e Alfabetização',
        trigger: 'teste7',
        expectedAmount: 11.90,
        beneficiary: 'Editora Branth',
        whatsappPhone: '5537999387172',
        defaultMessage: 'Olá! Gostaria do material do Construtor de Palavras [ref_{{campaign.id}}_{{ad.id}}]'
    },
    {
        id: 'funil8',
        name: 'Guia Pet Comilão (Fernanda Soares)',
        trigger: 'teste8',
        expectedAmount: 15.00,
        beneficiary: 'KV DIGITAL',
        whatsappPhone: '5511922026498',
        defaultMessage: 'Olá Fernanda! Gostaria do Guia Pet Comilão com a calculadora de porções [ref_{{campaign.id}}_{{ad.id}}]'
    },
    {
        id: 'funil9',
        name: 'Receitas Produtos de Limpeza',
        trigger: 'teste9',
        expectedAmount: 25.00,
        beneficiary: 'Junior Campos dos Santos',
        whatsappPhone: '551152291989',
        defaultMessage: 'Olá! Gostaria de receber as Receitas de Produtos de Limpeza [ref_{{campaign.id}}_{{ad.id}}]'
    },
    {
        id: 'funil10',
        name: 'Bolsas Lucrativas - 200 Moldes',
        trigger: 'teste10',
        expectedAmount: 14.90,
        beneficiary: 'THAISE OLIVEIRA LIMA',
        whatsappPhone: '551152291989',
        defaultMessage: 'Olá Thaíse! Quero aprender a fazer as Bolsas Lucrativas e moldes [ref_{{campaign.id}}_{{ad.id}}]'
    },
    {
        id: 'funil11',
        name: 'Projeto Mente Viva (Selma)',
        trigger: 'teste11',
        expectedAmount: 20.00,
        beneficiary: 'Projeto Viva Luz',
        whatsappPhone: '551152291989',
        defaultMessage: 'Olá Selma! Gostaria de participar do Projeto Mente Viva [ref_{{campaign.id}}_{{ad.id}}]'
    },
    {
        id: 'funil12',
        name: 'Cardápio Adventista (Déb)',
        trigger: 'teste12',
        expectedAmount: 19.90,
        beneficiary: 'RP Empreendimentos',
        whatsappPhone: '551152291989',
        defaultMessage: 'Olá Déb! Gostaria do Cardápio Adventista e bônus [ref_{{campaign.id}}_{{ad.id}}]'
    },
    {
        id: 'funil13',
        name: 'Devocional Pelos Filhos - Maria',
        trigger: 'teste13',
        expectedAmount: 5.00,
        beneficiary: 'DAYZA LTDA',
        whatsappPhone: '551152291989',
        defaultMessage: 'Olá! Quero oração pelos meus filhos e devocional [ref_{{campaign.id}}_{{ad.id}}]'
    }
];

// ─── EXTRAÇÃO DE CONTEXTO DE ANÚNCIO (CTWA NATIVO OU TAGS UTM) ───
function extractAdContext(msg, textContent) {
    const adData = {};
    const contextInfo =
        msg.message?.extendedTextMessage?.contextInfo ||
        msg.message?.contextInfo ||
        msg.message?.imageMessage?.contextInfo ||
        {};

    if (contextInfo.externalAdReply) {
        adData.isCtwa = true;
        adData.adTitle = contextInfo.externalAdReply.title || '';
        adData.sourceUrl = contextInfo.externalAdReply.sourceUrl || '';
    }

    if (contextInfo.conversionData) {
        try {
            adData.conversionData = Buffer.isBuffer(contextInfo.conversionData)
                ? contextInfo.conversionData.toString('hex')
                : String(contextInfo.conversionData);
        } catch {}
    }

    if (contextInfo.ctwaClid) {
        adData.ctwaClid = contextInfo.ctwaClid;
    }

    // Identificação de tags inseridas no texto de mensagem (Ex: [ref_1202084910284_1202084910285] ou [ref:1202084910284] ou [1202084910284])
    if (textContent) {
        const refMatch = textContent.match(/\[(?:ref:?_?|Ref:?\s*|ref\s+)?([0-9a-zA-Z_\-]+)\]/i);
        if (refMatch && refMatch[1]) {
            const rawRef = refMatch[1].trim();
            adData.rawTag = rawRef;
            const parts = rawRef.split('_');
            if (parts.length >= 2) {
                adData.campaignId = parts[0];
                adData.adId = parts[1];
            } else {
                adData.campaignId = rawRef;
            }
        }
    }

    return Object.keys(adData).length > 0 ? adData : null;
}

// ─── DISPARO PARA META CONVERSIONS API (CAPI) ───
async function sendMetaCapiConversion(transactionRecord) {
    const metaPixelId = process.env.META_PIXEL_ID || store.metaConfig?.pixelId;
    const metaAccessToken = process.env.META_ACCESS_TOKEN || store.metaConfig?.accessToken;

    if (!metaPixelId || !metaAccessToken) {
        console.log(`[Meta CAPI] ⚠️ Pixel ID ou Access Token da Meta não configurados no Chatbot. Conversão registrada localmente.`);
        return { success: false, skipped: true, reason: 'Pixel ID ou Access Token ausente' };
    }

    try {
        const cleanPhone = (transactionRecord.userPhone || '').replace(/\D/g, '');
        const phoneHash = cleanPhone ? crypto.createHash('sha256').update(cleanPhone).digest('hex') : undefined;
        
        const firstName = (transactionRecord.pushName || '').trim().split(' ')[0].toLowerCase();
        const fnHash = firstName ? crypto.createHash('sha256').update(firstName).digest('hex') : undefined;

        const payload = {
            data: [
                {
                    event_name: 'Purchase',
                    event_time: Math.floor(Date.now() / 1000),
                    action_source: 'business_messaging',
                    messaging_channel: 'whatsapp',
                    user_data: {
                        ph: phoneHash ? [phoneHash] : [],
                        fn: fnHash ? [fnHash] : [],
                        ctwa_clid: transactionRecord.ctwaClid || undefined
                    },
                    custom_data: {
                        currency: 'BRL',
                        value: Number(Number(transactionRecord.amount || 0).toFixed(2)),
                        content_name: transactionRecord.funnelName,
                        content_type: 'product',
                        order_id: transactionRecord.id,
                        campaign_id: transactionRecord.campaignId || undefined,
                        ad_id: transactionRecord.adId || undefined
                    }
                }
            ]
        };

        const capiUrl = `https://graph.facebook.com/v21.0/${metaPixelId}/events?access_token=${metaAccessToken}`;
        const res = await axios.post(capiUrl, payload, { timeout: 10000 });
        console.log(`[Meta CAPI] ✅ Evento Purchase enviado com sucesso para a Meta! Eventos recebidos: ${res.data?.events_received || 1}`);
        return { success: true, data: res.data };
    } catch (err) {
        console.error(`[Meta CAPI] ❌ Erro ao enviar evento de conversão para a Meta:`, err.response?.data || err.message);
        return { success: false, error: err.response?.data?.error?.message || err.message };
    }
}

// ─── DISPARO PARA WEBHOOK DO FACEHUB ───
async function notifyFaceHubWebhook(transactionRecord) {
    const webhookUrl = process.env.FACEHUB_WEBHOOK_URL || store.metaConfig?.facehubWebhookUrl;
    if (!webhookUrl) return;

    try {
        await axios.post(webhookUrl, {
            event: 'transaction.approved',
            timestamp: new Date().toISOString(),
            transaction: transactionRecord
        }, { timeout: 5000 });
        console.log(`[FaceHub Webhook] ✅ Transação enviada para o FaceHub com sucesso: ${webhookUrl}`);
    } catch (err) {
        console.error(`[FaceHub Webhook] ❌ Falha ao notificar FaceHub:`, err.message);
    }
}


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

// ─── Sistema de Reações Humanizadas Universal (WhatsApp Reactions) ───
const reactedMessagesCache = new Set();

async function reactToMessage(sock, remoteJid, messageKey, emoji) {
    if (!sock || !remoteJid || !messageKey) return;
    const msgId = messageKey.id;
    if (msgId && reactedMessagesCache.has(msgId)) {
        return;
    }
    if (msgId) {
        reactedMessagesCache.add(msgId);
        if (reactedMessagesCache.size > 3000) {
            const first = reactedMessagesCache.values().next().value;
            reactedMessagesCache.delete(first);
        }
    }
    try {
        await sock.sendMessage(remoteJid, {
            react: {
                text: emoji,
                key: messageKey,
            },
        });
        console.log(`[Reação WhatsApp] Reagido com ${emoji} na mensagem ${msgId} para ${remoteJid}`);
    } catch (e) {
        console.warn('[Reação WhatsApp Aviso]:', e?.message);
    }
}

function getHumanReactionEmoji(text, isNegative = false) {
    if (isNegative) return '🙏';
    const t = (text || '').toLowerCase().trim();

    // Afirmativas e confirmações
    const isAffirmative = [
        'sim', 'pode', 'manda', 'ok', 'beleza', 'claro', 'com certeza',
        'quero', 'bora', 'manda ai', 'manda aí', 'positivo', 'show', 'topo',
        'aceito', 'vamos', 'pode ser', 'por favor', 'mande', 'concerteza', 'isso'
    ].some(w => t === w || t.includes(w));
    if (isAffirmative) return '👍';

    // Religiosas, gratidão e afeto
    const isReligiousOrAffectionate = [
        'amem', 'amém', 'deus', 'abençoe', 'abencoe', 'bênção', 'bencao',
        'obrigado', 'obrigada', 'gratidão', 'gratidao', 'paz', 'gloria',
        'glória', 'jesus', 'maravilha', 'coração', 'coracao', 'carinho',
        'lindo', 'linda', 'maravilhoso', 'fofo', 'fofura', 'amor', 'irmã', 'irma', 'irmão', 'irmao'
    ].some(w => t.includes(w));
    if (isReligiousOrAffectionate) return '❤️';

    // Dúvidas ou perguntas
    const isQuestionOrDoubt = ['quanto', 'valor', 'preco', 'preço', 'como', 'onde', 'qual', 'chave', 'pix', 'envia', 'tem', 'dúvida', 'duvida'].some(w => t.includes(w));
    if (isQuestionOrDoubt) return '👍';

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

    // Follow-up 2: ~4 horas / manhã seguinte (Print 06:00)
    timers.push(
        setTimeout(() => {
            sendFollowUp(2, [
                'A paz do Senhor, minha irmã! Conseguiu realizar sua contribuição? 🙏\n\nPeço com carinho que não deixe nosso projeto no prejuízo, pois preparamos e enviamos o material com confiança. Esse trabalho ajuda muitas famílias, e sua honestidade diante de Deus faz toda diferença. 💛',
            ]);
        }, 4 * 60 * 60 * 1000)
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



// ─── Esteira de Cobrança / Follow-up do Funil 5 (Acervo 5.000+ - Vitor) ───
const funil5ReminderTimers = new Map();

function cancelFunil5Reminder(botId, userPhone) {
    const key = `${botId}:${userPhone}`;
    if (funil5ReminderTimers.has(key)) {
        const timers = funil5ReminderTimers.get(key);
        if (Array.isArray(timers)) {
            timers.forEach((t) => clearTimeout(t));
        } else {
            clearTimeout(timers);
        }
        funil5ReminderTimers.delete(key);
        console.log(`[Funil 5] ⏹️ Timers de follow-up cancelados para ${userPhone}`);
    }
}

function scheduleFunil5Reminder(botId, remoteJid, userPhone) {
    cancelFunil5Reminder(botId, userPhone);
    const key = `${botId}:${userPhone}`;
    const timers = [];

    const sendFollowUp = async (step, texts) => {
        try {
            const currentStore = loadStore();
            const sess = currentStore.userSessions[key];
            if (sess && sess.waitingFor === 'PIX_RECEIPT_FUNIL5') {
                const sock = activeSockets.get(botId);
                if (sock) {
                    for (const text of texts) {
                        await sock.sendMessage(remoteJid, { text });
                        logConversation(botId, userPhone, 'BOT', 'REMINDER', text);
                        await new Promise((r) => setTimeout(r, 800));
                    }
                    console.log(`[Funil 5] ⏰ Follow-up Step ${step} enviado para ${userPhone}`);
                }
            }
        } catch (err) {
            console.error(`[Funil 5 Follow-up Error]:`, err?.message);
        }
    };

    // Step 1: 10 minutos (Print 03:32 - 608s)
    timers.push(setTimeout(() => {
        sendFollowUp(1, ['Paz.. Fiquei aqui esperando o pagamento, confiei na sua palavra...']);
    }, 10 * 60 * 1000));

    // Step 2: 30 minutos (Print 03:52 - 1816s)
    timers.push(setTimeout(() => {
        sendFollowUp(2, [
            'Você consegue fazer a sua contribuição agora? Se sim vou agradecer e muito! 🙏',
            `Nosso PIX, só você copiar e colar 👇
(CNPJ)`,
            '64158407000124',
            'Fico no aguardo amém ?',
        ]);
    }, 30 * 60 * 1000));

    // Step 3: 45 minutos (Print 04:07 - 2753s)
    timers.push(setTimeout(() => {
        sendFollowUp(3, [
            `Conforme combinamos, os materiais e os bônus já foram enviados, e você *confirmou* o recebimento.

Agora estou aguardando apenas a contribuição combinada. Assim que realizar, me envie o comprovante por aqui. Deus abençoe.`,
            `🔑 CHAVE PIX *CNPJ* : 64158407000124

*VALOR*: R$19,90

*NOME:* Vitor Bueno de Carvalho`,
        ]);
    }, 45 * 60 * 1000));

    // Step 4: 1h35 (~95 min - Print 04:58 - Áudio de cobrança)
    timers.push(setTimeout(async () => {
        try {
            const currentStore = loadStore();
            const sess = currentStore.userSessions[key];
            if (sess && sess.waitingFor === 'PIX_RECEIPT_FUNIL5') {
                const sock = activeSockets.get(botId);
                if (sock) {
                    const mp3Path = path.join(__dirname, 'public', 'funil5', 'audio_cobranca.mp3');
                    if (fs.existsSync(mp3Path)) {
                        const mp3Buf = fs.readFileSync(mp3Path);
                        await sock.sendMessage(remoteJid, { audio: mp3Buf, mimetype: 'audio/mpeg', ptt: true });
                        logConversation(botId, userPhone, 'BOT', 'AUDIO', '🎙️ [Áudio Cobrança Funil 5]');
                    }
                }
            }
        } catch (err) {
            console.error('[Funil 5 Audio Cobrança Error]:', err?.message);
        }
    }, 95 * 60 * 1000));

    // Step 5: ~1h56 (116 min - Print 05:18 - 6983s)
    timers.push(setTimeout(() => {
        sendFollowUp(5, [
            `Oi ? está ai ? Consegue me enviar agora por favor ?`,
            `🔑 CHAVE PIX *CNPJ* : 64158407000124

*NOME:* Vitor Bueno de Carvalho

*VALOR :* R$19,90

Me envie o comprovante aqui por favor.`,
        ]);
    }, 116 * 60 * 1000));

    // Step 6: ~2h56 (176 min - Print 06:18 - 10605s - Eclesiastes 5:4)
    timers.push(setTimeout(() => {
        sendFollowUp(6, [
            `Preciso te lembrar de algo: diante de Deus, palavra e compromisso também são testemunho.`,
            `A Bíblia diz em *Eclesiastes 5:4*:

“Quando a Deus fizeres algum voto, não tardes em cumpri-lo; porque não se agrada de tolos; o que votares, paga-o.”`,
            `A contribuição simbólica não é apenas um valor. É uma forma de *honrar a palavra* que você deu antes de receber o material.`,
            `Se você recebeu, acessou e o material chegou certinho, peço com carinho que faça a sua parte agora, amém?`,
            `Que Deus toque no seu coração e abençoe sua vida 🙏`,
            `🔑 CHAVE PIX *CNPJ* : 64158407000124

*VALOR*: R$ 19,90

*NOME:* Vitor Bueno de Carvalho

*BANCO:* CloudWalk I.P`,
        ]);
    }, 176 * 60 * 1000));

    // Step 7: ~5 horas (298 min - Print 08:20 - 17882s - Foto Bíblia + Cobrança)
    timers.push(setTimeout(async () => {
        try {
            const currentStore = loadStore();
            const sess = currentStore.userSessions[key];
            if (sess && sess.waitingFor === 'PIX_RECEIPT_FUNIL5') {
                const sock = activeSockets.get(botId);
                if (sock) {
                    const ecImgPath = path.join(__dirname, 'public', 'funil5', 'eclesiastes.jpeg');
                    if (fs.existsSync(ecImgPath)) {
                        const imgBuf = fs.readFileSync(ecImgPath);
                        await sock.sendMessage(remoteJid, { image: imgBuf, caption: `Por favor, precisamos do seu pagamento

Nosso trabalho está ficando prejudicado, confiei na sua palavra...` });
                    } else {
                        await sock.sendMessage(remoteJid, { text: `Por favor, precisamos do seu pagamento

Nosso trabalho está ficando prejudicado, confiei na sua palavra...` });
                    }
                    await sock.sendMessage(remoteJid, { text: `*PIX:* 64158407000124
*NOME*: Vitor Bueno` });
                    await sock.sendMessage(remoteJid, { text: `Me envie o comprovante para dar baixa por favor 🙏` });
                    logConversation(botId, userPhone, 'BOT', 'REMINDER', 'Por favor, precisamos do seu pagamento');
                }
            }
        } catch (err) {
            console.error('[Funil 5 Step 7 Error]:', err?.message);
        }
    }, 298 * 60 * 1000));

    // Step 8: ~7 horas (418 min - Print 10:20 - 25109s)
    timers.push(setTimeout(() => {
        sendFollowUp(8, [
            `A paz do Senhor!

Passando aqui só para confirmar se você conseguiu acessar todos os materiais certinho.`,
            `Fico no aguardo do envio da contribuição de R$ 19,90 que você combinou, tá bom?

Deus abençoe seu dia!`,
            `*Chave PIX CNPJ* : 64158407000124

*NOME*: Vitor Bueno de Carvalho

VALOR: R$ 19,90`,
        ]);
    }, 418 * 60 * 1000));

    // Step 9: ~10 horas (599 min - Print 13:21 - 35943s)
    timers.push(setTimeout(() => {
        sendFollowUp(9, [
            `Poxa, irmão... fico triste que você aproveitou o material, mas não retornou mais para cumprir o que combinou. Confiei na sua palavra. Que Deus te abençoe.`,
        ]);
    }, 599 * 60 * 1000));

    // Step 10: ~10h30 (630 min - Print 13:52 - 37833s)
    timers.push(setTimeout(() => {
        sendFollowUp(10, [
            `Muitas pessoas já me deixaram na mão... Espero de coração que você não seja mais uma delas. Ainda estou aguardando.`,
        ]);
    }, 630 * 60 * 1000));

    // Step 11: ~15h35 (935 min - Noite 18:56 - 56097s - Áudio)
    timers.push(setTimeout(async () => {
        try {
            const currentStore = loadStore();
            const sess = currentStore.userSessions[key];
            if (sess && sess.waitingFor === 'PIX_RECEIPT_FUNIL5') {
                const sock = activeSockets.get(botId);
                if (sock) {
                    const mp3Path = path.join(__dirname, 'public', 'funil5', 'audio_lembrete_dia1_18h56.mp3');
                    if (fs.existsSync(mp3Path)) {
                        const mp3Buf = fs.readFileSync(mp3Path);
                        await sock.sendMessage(remoteJid, { audio: mp3Buf, mimetype: 'audio/mpeg', ptt: true });
                    }
                    await sock.sendMessage(remoteJid, { text: `*PIX*: 64158407000124
(*CNPJ*)

*R$19,90*` });
                    logConversation(botId, userPhone, 'BOT', 'AUDIO', '🎙️ [Áudio Lembrete Dia 1 18h56]');
                }
            }
        } catch (err) {
            console.error('[Funil 5 Step 11 Error]:', err?.message);
        }
    }, 935 * 60 * 1000));

    // Step 12: ~17h35 (1055 min - Noite 20:57 - 63321s - Áudio)
    timers.push(setTimeout(async () => {
        try {
            const currentStore = loadStore();
            const sess = currentStore.userSessions[key];
            if (sess && sess.waitingFor === 'PIX_RECEIPT_FUNIL5') {
                const sock = activeSockets.get(botId);
                if (sock) {
                    const mp3Path = path.join(__dirname, 'public', 'funil5', 'audio_lembrete_dia1_20h57.mp3');
                    if (fs.existsSync(mp3Path)) {
                        const mp3Buf = fs.readFileSync(mp3Path);
                        await sock.sendMessage(remoteJid, { audio: mp3Buf, mimetype: 'audio/mpeg', ptt: true });
                    }
                    await sock.sendMessage(remoteJid, { text: `*CHAVE PIX* : 64158407000124
*VALOR*: R$19,90

Me envie o comprovante por favor para eu confirmar no sistema!` });
                    logConversation(botId, userPhone, 'BOT', 'AUDIO', '🎙️ [Áudio Lembrete Dia 1 20h57]');
                }
            }
        } catch (err) {
            console.error('[Funil 5 Step 12 Error]:', err?.message);
        }
    }, 1055 * 60 * 1000));

    // Step 13: ~23h35 (1415 min - Dia 2 02:57 - 84934s)
    timers.push(setTimeout(() => {
        sendFollowUp(13, [
            `Porque você fez isso? 🙏 Eu te enviei tudo antes justamente na confiança, e você sumiu depois que recebeu os materiais.`,
            `Avisamos que seria necessário fazer o Pix hoje após receber os materiais e você concordou...`,
        ]);
    }, 1415 * 60 * 1000));

    // Step 14: ~24h36 (1476 min - Dia 2 03:58 - 88560s - Foto Eclesiastes 5:5)
    timers.push(setTimeout(async () => {
        try {
            const currentStore = loadStore();
            const sess = currentStore.userSessions[key];
            if (sess && sess.waitingFor === 'PIX_RECEIPT_FUNIL5') {
                const sock = activeSockets.get(botId);
                if (sock) {
                    await sock.sendMessage(remoteJid, { text: `Eclesiastes 5:5
“É melhor não fazer promessa do que fazer e não cumprir.”` });
                    const imgP = path.join(__dirname, 'public', 'funil5', 'eclesiastes_dia2.jpeg');
                    if (fs.existsSync(imgP)) {
                        const buf = fs.readFileSync(imgP);
                        await sock.sendMessage(remoteJid, { image: buf, caption: `Precisamos da contribuição combinada 🙏

Chave PIX (CNPJ) : 64158407000124` });
                    } else {
                        await sock.sendMessage(remoteJid, { text: `Precisamos da contribuição combinada 🙏

Chave PIX (CNPJ) : 64158407000124` });
                    }
                    logConversation(botId, userPhone, 'BOT', 'REMINDER', 'Eclesiastes 5:5 Foto Dia 2');
                }
            }
        } catch (err) {
            console.error('[Funil 5 Step 14 Error]:', err?.message);
        }
    }, 1476 * 60 * 1000));

    // Step 15: ~26h36 (1596 min - Dia 2 05:58 - 95791s)
    timers.push(setTimeout(() => {
        sendFollowUp(15, [
            `Confiei em você e já te enviei todo o material completo junto com os bônus.

Agora estou aqui aguardando você cumprir a sua parte que combinou comigo.`,
        ]);
    }, 1596 * 60 * 1000));

    // Step 16: ~27h36 (1656 min - Dia 2 06:58 - 99404s)
    timers.push(setTimeout(() => {
        sendFollowUp(16, [
            `Por que você visualiza a mensagem e não responde ?? depositei minha confiança em você...`,
            `Para facilitar, vou te enviar a chave Pix separada para você só copiar e colar`,
            `64158407000124`,
            `*(CHAVE PIX É CNPJ)*
Me envie o comprovante por favor 🙏`,
        ]);
    }, 1656 * 60 * 1000));

    // Step 17: ~35h37 (2137 min - Dia 2 14:59 - 128254s)
    timers.push(setTimeout(() => {
        sendFollowUp(17, [
            `A paz querido irmão(a), responde por favor 😢🙏🏻`,
        ]);
    }, 2137 * 60 * 1000));

    // Step 18: ~38h37 (2317 min - Dia 2 17:59 - 139065s)
    timers.push(setTimeout(() => {
        sendFollowUp(18, [
            `Irmão(ã), preciso ser sincero com você…

Isso acaba sendo uma falta de consideração comigo e com a obra.

Eu não vendo material para enriquecer. Esse valor é apenas uma contribuição simbólica para manter os custos da página, das ferramentas e continuar abençoando outros irmãos que também precisam.

Quando você disse que faria o envio após receber, eu confiei na sua palavra e enviei tudo imediatamente.

Sei que imprevistos acontecem, mas o silêncio machuca quem agiu de boa-fé com você.

Se houver qualquer dificuldade, apenas me responda e seja sincero(a). O que não podemos é deixar a palavra dada cair por terra.

Ainda acredito no seu coração e na sua honestidade.

Que Deus te abençoe.`,
        ]);
    }, 2317 * 60 * 1000));

    // Step 19: ~44h38 (2678 min - Dia 3 00:00 - 160676s)
    timers.push(setTimeout(() => {
        sendFollowUp(19, [
            `Quando for possível para você, peço que efetue o pagamento dos materiais enviados, honrando o compromisso que assumimos entre irmãos 🙏

Fico no aguardo.`,
            `*Valor: R$19,00*`,
            `*Chave PIX CNPJ* : 64158407000124`,
        ]);
    }, 2678 * 60 * 1000));

    // Step 20: ~49h38 (2978 min - Dia 3 05:00 - 178711s)
    timers.push(setTimeout(() => {
        sendFollowUp(20, [
            `Não faça igual outras pessoas, enviei os estudos com carinho e na confiança, que Deus possa tocar no seu coração e você enviar a contrbuição de *R$19,90* AMÉM ?`,
            `*PIX CNPJ* : 64158407000124
*VALOR* : R$19,90`,
        ]);
    }, 2978 * 60 * 1000));

    // Step 21: ~61h38 (3698 min - Dia 3 17:00 - 221926s)
    timers.push(setTimeout(() => {
        sendFollowUp(21, [
            `A Paz você ainda está ai?`,
            `me da um retorno, por favor... 🙏`,
            `Precisamos da conntrbuição de *R$19,90* para nãao ficarmos no prejuizo, confiei em você e liberei todos os materiais, agora por favor me envie o comprovante 🙏`,
        ]);
    }, 3698 * 60 * 1000));

    // Step 22: ~85h39 (5139 min - Dia 4 17:01 - 308355s)
    timers.push(setTimeout(() => {
        sendFollowUp(22, [
            `Boa tarde Olá irmão, tudo bem? 🙏

Passando aqui porque vi que você recebeu todo o material dos esboços, mas talvez na correria ainda não conseguiu olhar com calma.

E como combinamos, eu te enviei tudo primeiro pela confiança 🤝


Ela me ajuda a continuar mantendo esse trabalho e abençoando outras vidas através da Palavra.`,
            `CHAVE PIX *CNPJ*: 64158407000124

Que Deus te abençoe grandemente 🙏`,
            `Me envie o comprovante por favor.`,
        ]);
    }, 5139 * 60 * 1000));

    // Step 23: ~86h19 (5179 min - Dia 4 17:41 - 310793s - Novo Áudio 53s Vitor Bueno)
    timers.push(setTimeout(async () => {
        try {
            const currentStore = loadStore();
            const sess = currentStore.userSessions[key];
            if (sess && sess.waitingFor === 'PIX_RECEIPT_FUNIL5') {
                const sock = activeSockets.get(botId);
                if (sock) {
                    const mp3Path = path.join(__dirname, 'public', 'funil5', 'audio_lembrete_dia4_17h41.mp3');
                    if (fs.existsSync(mp3Path)) {
                        const mp3Buf = fs.readFileSync(mp3Path);
                        await sock.sendMessage(remoteJid, { audio: mp3Buf, mimetype: 'audio/mpeg', ptt: true });
                    }
                    await sock.sendMessage(remoteJid, {
                        text: `🔑 *Chave PIX* : Chave Pix: 64158407000124

VALOR: R$19,90

Me envie o comprovante por favor para dar baixa no sistema🙏`
                    });
                    logConversation(botId, userPhone, 'BOT', 'AUDIO', '🎙️ [Áudio Lembrete Dia 4 17h41 53s]');
                }
            }
        } catch (err) {
            console.error('[Funil 5 Step 23 Error]:', err?.message);
        }
    }, 5179 * 60 * 1000));

    // Step 24: ~88h20 (5300 min - Dia 4 19:42 - 318007s)
    timers.push(setTimeout(() => {
        sendFollowUp(24, [
            `POXA, é dificil acreditar nas pessoas hoje em dia! QUE MALDADE.

Deus não se agrada com isso.`,
            `Nao esperava ser enganado!😪`,
        ]);
    }, 5300 * 60 * 1000));

    // Step 25: ~112h20 (6740 min - Dia 5 19:42 - 404435s - Reflexão Final)
    timers.push(setTimeout(() => {
        sendFollowUp(25, [
            `Desculpa te incomodar…

*Mas enquanto orava, Deus me lembrou do verdadeiro propósito disso tudo.*

Esse material não foi criado apenas para ser mais um PDF no celular.

Ele foi preparado para ajudar pessoas que pregam a Palavra, que muitas vezes estão cansadas, sem tempo, mas ainda assim querem entregar uma mensagem com zelo, direção e temor a Deus.

Eu te enviei os materiais confiando que eles poderiam abençoar seu ministério.

E se eles chegaram até você, talvez não tenha sido por acaso.

A contribuição simbólica é apenas para ajudar esse projeto continuar alcançando mais pregadores e líderes que também precisam desse apoio.

Se você ainda puder fazer sua contribuição, vai me ajudar muito a manter esse trabalho de pé.

Que Deus abençoe sua vida, sua casa e seu ministério. 🙏`,
            `Quando der faça o PIX por favor...

CHAVE CNPJ: 64158407000124`,
        ]);
    }, 6740 * 60 * 1000));

    funil5ReminderTimers.set(key, timers);
}

// ─── Esteira de Cobrança / Follow-up do Funil 6 (Missionária Flávia - Devocional) ───
const funil6ReminderTimers = new Map();

function cancelFunil6Reminder(botId, userPhone) {
    const key = `${botId}:${userPhone}`;
    if (funil6ReminderTimers.has(key)) {
        const timers = funil6ReminderTimers.get(key);
        if (Array.isArray(timers)) {
            timers.forEach((t) => clearTimeout(t));
        } else {
            clearTimeout(timers);
        }
        funil6ReminderTimers.delete(key);
        console.log(`[Funil 6] ⏹️ Timers de follow-up cancelados para ${userPhone}`);
    }
}

function scheduleFunil6Reminder(botId, remoteJid, userPhone) {
    cancelFunil6Reminder(botId, userPhone);
    const key = `${botId}:${userPhone}`;
    const timers = [];

    const sendFollowUp = async (step, texts) => {
        try {
            const currentStore = loadStore();
            const sess = currentStore.userSessions[key];
            if (sess && sess.waitingFor === 'PIX_RECEIPT_FUNIL6') {
                const sock = activeSockets.get(botId);
                if (sock) {
                    for (const text of texts) {
                        await sock.sendMessage(remoteJid, { text });
                        logConversation(botId, userPhone, 'BOT', 'REMINDER', text);
                        await new Promise((r) => setTimeout(r, 800));
                    }
                    console.log(`[Funil 6] ⏰ Follow-up Step ${step} enviado para ${userPhone}`);
                }
            }
        } catch (err) {
            console.error(`[Funil 6 Follow-up Error]:`, err?.message);
        }
    };

    // Step 1: ~30 minutos (Print 07:22)
    timers.push(setTimeout(() => {
        sendFollowUp(1, [
            `Ta ai Irmã?`,
            `Não esquece de me mandar o comprovante tá bom? tenho um presente para você após enviar 😘`,
        ]);
    }, 30 * 60 * 1000));

    // Step 2: ~1h30 (Print 08:22 - Testemunho do Grupo)
    timers.push(setTimeout(async () => {
        try {
            const currentStore = loadStore();
            const sess = currentStore.userSessions[key];
            if (sess && sess.waitingFor === 'PIX_RECEIPT_FUNIL6') {
                const sock = activeSockets.get(botId);
                if (sock) {
                    const imgPath = path.join(__dirname, 'public', 'funil6', 'testemunho_grupo.jpeg');
                    if (fs.existsSync(imgPath)) {
                        const imgBuf = fs.readFileSync(imgPath);
                        await sock.sendMessage(remoteJid, { image: imgBuf });
                    }
                    await sock.sendMessage(remoteJid, {
                        text: `Irmã, olha esse testemunho aqui que recebi no nosso grupo`,
                    });
                    await new Promise((r) => setTimeout(r, 800));
                    await sock.sendMessage(remoteJid, {
                        text: `Conseguiu, irmã fazer sua contribuição? Sobrou 1 vaga aqui no grupo do sorteio, ai já coloco seu nome. Me manda também os nomes que a senhora deseja que a gente apresente em oração 🙌🏻`,
                    });
                }
            }
        } catch (err) {
            console.error('[Funil 6 Follow-up 2 Error]:', err?.message);
        }
    }, 90 * 60 * 1000));

    

    // Step 3: ~14 horas (Print 17:47)
    timers.push(setTimeout(() => {
        sendFollowUp(3, [
            `Ta ai Irmã?`,
            `Não esquece de me mandar o comprovante tá bom? tenho um presente para você após enviar 🤭`
        ]);
    }, 840 * 60 * 1000));

    // Step 4: ~15 horas (Print 18:47 - Foto Testemunho 2)
    timers.push(setTimeout(async () => {
        try {
            const currentStore = loadStore();
            const sess = currentStore.userSessions[key];
            if (sess && sess.waitingFor === 'PIX_RECEIPT_FUNIL6') {
                const sock = activeSockets.get(botId);
                if (sock) {
                    const imgP = path.join(__dirname, 'public', 'funil6', 'testemunho_grupo2.jpeg');
                    if (fs.existsSync(imgP)) {
                        const imgBuf = fs.readFileSync(imgP);
                        await sock.sendMessage(remoteJid, { image: imgBuf });
                    }
                    await sock.sendMessage(remoteJid, { text: `Irmã, olha esse testemunho aqui que recebi no nosso grupo` });
                    await new Promise(r => setTimeout(r, 800));
                    await sock.sendMessage(remoteJid, { text: `Conseguiu, irmã fazer sua contribuição? Sobrou 1 vaga aqui no grupo do sorteio, ai já coloco seu nome. Me manda também os nomes que a senhora deseja que a gente apresente em oração 🙌🏼` });
                }
            }
        } catch (err) {
            console.error('[Funil 6 Step 4 Error]:', err?.message);
        }
    }, 900 * 60 * 1000));

    // Step 5: ~27 horas (Dia 2 - 06:47 - Áudio de Oração)
    timers.push(setTimeout(async () => {
        try {
            const currentStore = loadStore();
            const sess = currentStore.userSessions[key];
            if (sess && sess.waitingFor === 'PIX_RECEIPT_FUNIL6') {
                const sock = activeSockets.get(botId);
                if (sock) {
                    await sock.sendMessage(remoteJid, { text: `A paz do Senhor, minha irmã! ✨` });
                    const audioP = path.join(__dirname, 'public', 'funil6', 'audio_oracao_dia2.mp3');
                    if (fs.existsSync(audioP)) {
                        const audioBuf = fs.readFileSync(audioP);
                        await sock.sendMessage(remoteJid, { audio: audioBuf, mimetype: 'audio/mpeg', ptt: true });
                        logConversation(botId, userPhone, 'BOT', 'AUDIO', '🎙️ [Áudio Oração Dia 2 Funil 6]');
                    }
                }
            }
        } catch (err) {
            console.error('[Funil 6 Step 5 Error]:', err?.message);
        }
    }, 1620 * 60 * 1000));

    // Step 6: ~51 horas (Dia 3 - 06:48 - Culto Familiar)
    timers.push(setTimeout(() => {
        sendFollowUp(6, [
            `Nós acabamos de fazer um culto e lembramos de sua família! Deus te abençoe! ❤️`,
            `Não esqueça de nós também, viu!! 🙏🏼`
        ]);
    }, 3060 * 60 * 1000));
funil6ReminderTimers.set(key, timers);
}

// ─── Esteira de Cobrança / Follow-up do Funil 7 (Alfabetização Infantil - Pinguim Estudioso) ───
const funil7ReminderTimers = new Map();

function cancelFunil7Reminder(botId, userPhone) {
    const key = `${botId}:${userPhone}`;
    if (funil7ReminderTimers.has(key)) {
        const timers = funil7ReminderTimers.get(key);
        if (Array.isArray(timers)) {
            timers.forEach((t) => clearTimeout(t));
        } else {
            clearTimeout(timers);
        }
        funil7ReminderTimers.delete(key);
        console.log(`[Funil 7] ⏹️ Timers de follow-up cancelados para ${userPhone}`);
    }
}

function scheduleFunil7Reminder(botId, remoteJid, userPhone) {
    cancelFunil7Reminder(botId, userPhone);
    const key = `${botId}:${userPhone}`;
    const timers = [];

    const sendFollowUp = async (step, texts) => {
        try {
            const currentStore = loadStore();
            const sess = currentStore.userSessions[key];
            if (sess && sess.waitingFor === 'PIX_RECEIPT_FUNIL7') {
                const sock = activeSockets.get(botId);
                if (sock) {
                    for (const text of texts) {
                        await sock.sendMessage(remoteJid, { text });
                        logConversation(botId, userPhone, 'BOT', 'REMINDER', text);
                        await new Promise((r) => setTimeout(r, 800));
                    }
                    console.log(`[Funil 7] ⏰ Follow-up Step ${step} enviado para ${userPhone}`);
                }
            }
        } catch (err) {
            console.error(`[Funil 7 Follow-up Error]:`, err?.message);
        }
    };

    // Step 1: ~30 minutos (Print 03:53)
    timers.push(setTimeout(() => {
        sendFollowUp(1, [
            'Oii, conseguiu fazer o pix? 🙏',
        ]);
    }, 30 * 60 * 1000));

    // Step 2: ~4 horas (Print 14:00)
    timers.push(setTimeout(() => {
        sendFollowUp(2, [
            'Estou contando com o seu pagamento pra manter esse projeto vivo!\nPor favor, realize o pagamento na chave pix abaixo 👇',
            '37999387172',
        ]);
    }, 240 * 60 * 1000));

    // Step 3: ~8 horas (Print 16:01)
    timers.push(setTimeout(() => {
        sendFollowUp(3, [
            'Eu te enviei todo o material acreditando que você faria o Pix depois.\nO valor é pequeno, R$11,90 mas pra mim representa respeito pelo meu trabalho.\nNão gosto de ficar cobrando ninguém...\nSó queria alinhar isso contigo.\nQuando puder, esse é o Pix 👇',
            '37999387172',
        ]);
    }, 480 * 60 * 1000));

    funil7ReminderTimers.set(key, timers);
}

// ─── Esteira de Cobrança / Follow-up do Funil 8 (Pet Comilão - Fernanda Soares) ───
const funil8ReminderTimers = new Map();

function cancelFunil8Reminder(botId, userPhone) {
    const key = `${botId}:${userPhone}`;
    if (funil8ReminderTimers.has(key)) {
        const timers = funil8ReminderTimers.get(key);
        if (Array.isArray(timers)) {
            timers.forEach((t) => clearTimeout(t));
        } else {
            clearTimeout(timers);
        }
        funil8ReminderTimers.delete(key);
        console.log(`[Funil 8] ⏹️ Timers de follow-up cancelados para ${userPhone}`);
    }
}

function scheduleFunil8Reminder(botId, remoteJid, userPhone) {
    cancelFunil8Reminder(botId, userPhone);
    const key = `${botId}:${userPhone}`;
    const timers = [];

    const sendFollowUp = async (step, texts) => {
        try {
            const currentStore = loadStore();
            const sess = currentStore.userSessions[key];
            if (sess && sess.waitingFor === 'PIX_RECEIPT_FUNIL8') {
                const sock = activeSockets.get(botId);
                if (sock) {
                    for (const text of texts) {
                        await sock.sendMessage(remoteJid, { text });
                        logConversation(botId, userPhone, 'BOT', 'REMINDER', text);
                        await new Promise((r) => setTimeout(r, 800));
                    }
                    console.log(`[Funil 8] ⏰ Follow-up Step ${step} enviado para ${userPhone}`);
                }
            }
        } catch (err) {
            console.error(`[Funil 8 Follow-up Error]:`, err?.message);
        }
    };

    // Step 1: ~1 hora (Print 04:21)
    timers.push(setTimeout(() => {
        sendFollowUp(1, [
            `Oii, tudo bem? 🐾 Espero que tenha gostado e que seu pet adore a alimentação natural! Se tiver qualquer dúvida na hora de preparar, estou à disposição! 👩‍🍳\nPara facilitar, já vou deixar a chave Pix para a sua contribuição, tá bom? Que Deus te abençoe! 🐶💛\n\nCHAVE PIX CELULAR:\n11965034611`,
        ]);
    }, 60 * 60 * 1000));

    // Step 2: ~23 horas (Dia 2 - 02:22 - Áudio Pet)
    timers.push(setTimeout(async () => {
        try {
            const currentStore = loadStore();
            const sess = currentStore.userSessions[key];
            if (sess && sess.waitingFor === 'PIX_RECEIPT_FUNIL8') {
                const sock = activeSockets.get(botId);
                if (sock) {
                    const audioP = path.join(__dirname, 'public', 'funil8', 'audio_dia2_pet.mp3');
                    if (fs.existsSync(audioP)) {
                        const audioBuf = fs.readFileSync(audioP);
                        await sock.sendMessage(remoteJid, { audio: audioBuf, mimetype: 'audio/mpeg', ptt: true });
                        logConversation(botId, userPhone, 'BOT', 'AUDIO', '🎙️ [Áudio Dia 2 Pet Funil 8]');
                    }
                    await sock.sendMessage(remoteJid, { text: `CHAVE PIX TELEFONE: 11965034611` });
                }
            }
        } catch (err) {
            console.error('[Funil 8 Step 2 Error]:', err?.message);
        }
    }, 1380 * 60 * 1000));

    funil8ReminderTimers.set(key, timers);
}


// ═══════════════════════════════════════════════════════════════════════════════
// FUNIL 9: Receitas de Produtos de Limpeza - Junior (Gatilho: teste9)
// ═══════════════════════════════════════════════════════════════════════════════

async function sendFunil9Phase1(botId, sock, remoteJid, userPhone, pushName) {
    console.log(`[Funil 9 - Junior Limpeza] 🚀 Iniciando Fase 1 para ${pushName} (${userPhone})`);

    await sendRealisticText(botId, sock, remoteJid, userPhone, 'olá tudo bem');
    await new Promise((r) => setTimeout(r, 1000));

    // Áudio PTT
    try { await sock.sendPresenceUpdate('recording', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1500));

    const audioPath = path.join(__dirname, 'public', 'funil9', 'audio_apresentacao.mp3');
    if (fs.existsSync(audioPath)) {
        try {
            const buf = fs.readFileSync(audioPath);
            await sock.sendMessage(remoteJid, { audio: buf, mimetype: 'audio/mpeg', ptt: true });
            logConversation(botId, userPhone, 'BOT', 'AUDIO', '🎙️ [Áudio Apresentação Funil 9]');
        } catch (err) {
            console.warn('[Funil 9 Audio Error]:', err?.message);
        }
    }
    try { await sock.sendPresenceUpdate('paused', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1000));

    const fotoPath = path.join(__dirname, 'public', 'funil9', 'foto_receitas.jpeg');
    if (fs.existsSync(fotoPath)) {
        try {
            const imgBuf = fs.readFileSync(fotoPath);
            await sock.sendMessage(remoteJid, { image: imgBuf });
        } catch (imgErr) {}
    }
    await new Promise((r) => setTimeout(r, 1200));

    await sendRealisticText(botId, sock, remoteJid, userPhone, 'peço apenas *25,00* pelas receitas de produtos de limpeza\nmas aceito o valor que puder 🙏🏻❤️');
    await new Promise((r) => setTimeout(r, 1200));

    await sendRealisticText(botId, sock, remoteJid, userPhone, 'chave pix Celular\n*42999944139*\nconfira meu nome\n(Junior Campos dos Santos)');
    await new Promise((r) => setTimeout(r, 1200));

    await sendRealisticText(botId, sock, remoteJid, userPhone, 'confio na tua honestidade e já vou enviar as receitas para você 🙏');
    await new Promise((r) => setTimeout(r, 1200));

    const pdfPath = path.join(__dirname, 'public', 'funil9', 'PRODUTOS_DE_LIMPEZA_2.pdf');
    if (fs.existsSync(pdfPath)) {
        try {
            const pdfBuf = fs.readFileSync(pdfPath);
            await sock.sendMessage(remoteJid, {
                document: pdfBuf,
                fileName: 'PRODUTOS_DE_LIMPEZA_2.pdf',
                mimetype: 'application/pdf',
            });
            logConversation(botId, userPhone, 'BOT', 'DOCUMENT', '📄 [PDF]: PRODUTOS_DE_LIMPEZA_2.pdf');
        } catch (err) {
            console.warn('[Funil 9 PDF Error]:', err?.message);
        }
    }

    const sessionKey = `${botId}:${userPhone}`;
    store.userSessions[sessionKey] = {
        botId,
        userJid: remoteJid,
        userPhone,
        userName: pushName,
        funnel: 'funil9',
        waitingFor: 'PIX_RECEIPT_FUNIL9',
        updatedAt: new Date().toISOString(),
    };
    saveStore(store);

    scheduleFunil9Reminder(botId, remoteJid, userPhone);
}

const funil9ReminderTimers = new Map();

function cancelFunil9Reminder(botId, userPhone) {
    const key = `${botId}:${userPhone}`;
    if (funil9ReminderTimers.has(key)) {
        const timers = funil9ReminderTimers.get(key);
        if (Array.isArray(timers)) timers.forEach((t) => clearTimeout(t));
        else clearTimeout(timers);
        funil9ReminderTimers.delete(key);
    }
}

function scheduleFunil9Reminder(botId, remoteJid, userPhone) {
    cancelFunil9Reminder(botId, userPhone);
    const key = `${botId}:${userPhone}`;
    const timers = [];

    const sendFollowUp = async (step, texts) => {
        try {
            const currentStore = loadStore();
            const sess = currentStore.userSessions[key];
            if (sess && sess.waitingFor === 'PIX_RECEIPT_FUNIL9') {
                const sock = activeSockets.get(botId);
                if (sock) {
                    for (const text of texts) {
                        await sock.sendMessage(remoteJid, { text });
                        logConversation(botId, userPhone, 'BOT', 'REMINDER', text);
                        await new Promise((r) => setTimeout(r, 800));
                    }
                }
            }
        } catch (err) {
            console.error('[Funil 9 Reminder Error]:', err?.message);
        }
    };

    // Step 1: ~30 min
    timers.push(setTimeout(() => {
        sendFollowUp(1, ['Oi tudo bem? Conseguiu dar uma olhada nas receitas? 🙏']);
    }, 30 * 60 * 1000));

    // Step 2: ~1h30
    timers.push(setTimeout(() => {
        sendFollowUp(2, [
            'Chave pix Celular:\n42999944139\nNome: Junior Campos dos Santos',
            'Assim que fizer é só mandar o comprovante aqui!'
        ]);
    }, 90 * 60 * 1000));

    funil9ReminderTimers.set(key, timers);
}


// ═══════════════════════════════════════════════════════════════════════════════
// FUNIL 10: Bolsas Lucrativas (+200 Moldes) - Thaíse Costura (Gatilho: teste10)
// ═══════════════════════════════════════════════════════════════════════════════

async function sendFunil10Phase1(botId, sock, remoteJid, userPhone, pushName) {
    console.log(`[Funil 10 - Thaíse Costura] 🚀 Iniciando Fase 1 para ${pushName} (${userPhone})`);

    const img1 = path.join(__dirname, 'public', 'funil10', 'foto_thaise.jpeg');
    if (fs.existsSync(img1)) {
        try {
            const buf = fs.readFileSync(img1);
            await sock.sendMessage(remoteJid, {
                image: buf,
                caption: '🌷 Oii, tudo bem? Muito prazer, me chamo Thaíse!\nSe você curte costura criativa, guarda meu contato aqui pra gente conversar melhor, viu meu bem 🙏❤️🌸'
            });
        } catch (err) {}
    } else {
        await sendRealisticText(botId, sock, remoteJid, userPhone, '🌷 Oii, tudo bem? Muito prazer, me chamo Thaíse!\nSe você curte costura criativa, guarda meu contato aqui pra gente conversar melhor, viu meu bem 🙏❤️🌸');
    }
    await new Promise((r) => setTimeout(r, 1200));

    await sendRealisticText(botId, sock, remoteJid, userPhone, 'Você quer aprender uma coisa que te dá uma renda extra garantida, né?');

    const sessionKey = `${botId}:${userPhone}`;
    store.userSessions[sessionKey] = {
        botId,
        userJid: remoteJid,
        userPhone,
        userName: pushName,
        funnel: 'funil10',
        waitingFor: 'CONFIRM_SEND_FUNIL10',
        updatedAt: new Date().toISOString(),
    };
    saveStore(store);
}

async function sendFunil10Phase2(botId, sock, remoteJid, userPhone, pushName, quotedMsg = null) {
    console.log(`[Funil 10 - Thaíse Costura] 📦 Fase 2 (Oferta) para ${pushName} (${userPhone})`);

    await sendRealisticText(botId, sock, remoteJid, userPhone, 'Perfeito!! Salvou meu contato? Me avisa que já te envio! 🧵✨');
    await new Promise((r) => setTimeout(r, 1000));

    const img2 = path.join(__dirname, 'public', 'funil10', 'foto_oferta.jpeg');
    if (fs.existsSync(img2)) {
        try {
            const buf = fs.readFileSync(img2);
            await sock.sendMessage(remoteJid, { image: buf });
        } catch (err) {}
    }
    await new Promise((r) => setTimeout(r, 1000));

    const offer = `📲✨ APLICATIVO WEB EXCLUSIVO + CURSO COMPLETO!\n\n💻 Aplicativo Web com materiais organizados e ferramentas digitais\n✂️ +200 moldes de BOLSAS, NECESSAIRES, MOCHILAS E CARTEIRAS\n🎬 Videoaulas passo a passo + medidas e dicas práticas\n🧵 Técnicas de acabamento para valorizar suas peças\n💰 Ferramenta de precificação + cálculo de custos e lucros\n📋 Lista de fornecedores de materiais e aviamentos\n📸 Tutorial de fotografia para deixar suas peças mais atrativas\n🛍️ Tutorial de vendas para aprender a vender no Instagram, Mercado Livre, Shopee, lojas e feirinhas\n🎁 Modelos extras + Grupo no WhatsApp com materiais gratuitos e novidades\n\n🔥 HOJE: APENAS R$ 14,90!🔥`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, offer);
    await new Promise((r) => setTimeout(r, 1000));

    // Áudio oferta
    try { await sock.sendPresenceUpdate('recording', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1500));
    const audioOferta = path.join(__dirname, 'public', 'funil10', 'audio_oferta.mp3');
    if (fs.existsSync(audioOferta)) {
        try {
            const buf = fs.readFileSync(audioOferta);
            await sock.sendMessage(remoteJid, { audio: buf, mimetype: 'audio/mpeg', ptt: true });
            logConversation(botId, userPhone, 'BOT', 'AUDIO', '🎙️ [Áudio Oferta Funil 10]');
        } catch (err) {}
    }
    try { await sock.sendPresenceUpdate('paused', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1000));

    await sendRealisticText(botId, sock, remoteJid, userPhone, '💰 Tudo isso por *apenas R$14,90*!');
    await new Promise((r) => setTimeout(r, 800));

    const imgPreco = path.join(__dirname, 'public', 'funil10', 'foto_preco.jpeg');
    if (fs.existsSync(imgPreco)) {
        try {
            const buf = fs.readFileSync(imgPreco);
            await sock.sendMessage(remoteJid, { image: buf });
        } catch (err) {}
    }
    await new Promise((r) => setTimeout(r, 1000));

    await sendRealisticText(botId, sock, remoteJid, userPhone, 'Posso confiar em você e te enviar agora? 💖');

    const sessionKey = `${botId}:${userPhone}`;
    store.userSessions[sessionKey] = {
        botId,
        userJid: remoteJid,
        userPhone,
        userName: pushName,
        funnel: 'funil10',
        waitingFor: 'CONFIRM_SEND_MOLDES_FUNIL10',
        updatedAt: new Date().toISOString(),
    };
    saveStore(store);
}

async function sendFunil10Phase3(botId, sock, remoteJid, userPhone, pushName, quotedMsg = null) {
    console.log(`[Funil 10 - Thaíse Costura] 🚀 Fase 3 (Envio Antecipado) para ${pushName} (${userPhone})`);

    // Áudio app web
    try { await sock.sendPresenceUpdate('recording', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1200));
    const audioApp = path.join(__dirname, 'public', 'funil10', 'audio_app_web.mp3');
    if (fs.existsSync(audioApp)) {
        try {
            const buf = fs.readFileSync(audioApp);
            await sock.sendMessage(remoteJid, { audio: buf, mimetype: 'audio/mpeg', ptt: true });
        } catch (err) {}
    }
    try { await sock.sendPresenceUpdate('paused', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1000));

    await sendRealisticText(botId, sock, remoteJid, userPhone, 'Dá uma olhadinha nesse vídeo aqui em cima ☝️❤️ que eu te mostro como acessar bem fácil.\nÉ só clicar no link aqui embaixo pra abrir 🌸👇');
    await new Promise((r) => setTimeout(r, 800));

    await sendRealisticText(botId, sock, remoteJid, userPhone, 'https://bolsas-lucrativas.vercel.app/');
    await new Promise((r) => setTimeout(r, 800));

    await sendRealisticText(botId, sock, remoteJid, userPhone, '🟢 Material Completo + Bônus\n👉 https://drive.google.com/drive/folders/1pMwwl2EbCe2i2Zf3QXXuHGRSzlFIdyxR\n✅ Material liberado.');
    await new Promise((r) => setTimeout(r, 1000));

    const vid1 = path.join(__dirname, 'public', 'funil10', 'video_tutorial_1.mp4');
    if (fs.existsSync(vid1)) {
        try {
            const buf = fs.readFileSync(vid1);
            await sock.sendMessage(remoteJid, { video: buf });
        } catch (err) {}
    }
    await new Promise((r) => setTimeout(r, 1200));

    // Áudio confiança
    try { await sock.sendPresenceUpdate('recording', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1500));
    const audioConf = path.join(__dirname, 'public', 'funil10', 'audio_confianca.mp3');
    if (fs.existsSync(audioConf)) {
        try {
            const buf = fs.readFileSync(audioConf);
            await sock.sendMessage(remoteJid, { audio: buf, mimetype: 'audio/mpeg', ptt: true });
        } catch (err) {}
    }
    try { await sock.sendPresenceUpdate('paused', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1000));

    const trustText = `Agora conto com você! 🙏\nConfiei em você e te enviei tudo primeiro, agora, contamos com sua palavra de pessoa honesta!\nEsses valores vão para trazer comida e roupas para meu filho dentro de casa. 🩷\n\nEscolha sua forma de contribuição:\n🟡 R$ 14,90 –> Recebe 200 MOLDES VITALÍCIO\n🟢 R$ 19,00 –> Recebe 200 MOLDES +10 MOLDES extras. VITALÍCIO\n💖 R$ 25,00 –> Recebe 200 MOLDES +14 MOLDES extras.VITALÍCIO\n🩷 R$ 37,00 –> Recebe 200 MOLDES +16 MOLDES extras VITALÍCIO\n💜 R$ 49,00 –> Recebe 200 MOLDES +30 MOLDES extras VITALÍCIO\n\n👉 Esse apoio mantém o projeto ativo e abençoando mais costureiras ✝️`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, trustText);
    await new Promise((r) => setTimeout(r, 1000));

    await sendRealisticText(botId, sock, remoteJid, userPhone, 'A maioria das clientes escolhem R$19 porque sabem que cada molde abençoado pode mudar uma vida.');
    await new Promise((r) => setTimeout(r, 1000));

    const pixDados = `✅ Acesso vitalício\n🔑 Chave Pix TELEFONE\n*PIX (celular):* 71992287791\n*BANCO:* NUBANK\n*NOME:* THAISE OLIVEIRA LIMA\n\n*👇 Só copiar e colar o TELEFONE👇*`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, pixDados);
    await new Promise((r) => setTimeout(r, 800));

    await sendRealisticText(botId, sock, remoteJid, userPhone, '71992287791');
    await new Promise((r) => setTimeout(r, 1000));

    await sendRealisticText(botId, sock, remoteJid, userPhone, 'Só falta o *pagamento por pix + comprovante* isso para liberar seu certificado.');
    await new Promise((r) => setTimeout(r, 800));

    const pdfBolsa = path.join(__dirname, 'public', 'funil10', '200_MOLDES_-_BOLSA_JEANS.pdf');
    if (fs.existsSync(pdfBolsa)) {
        try {
            const buf = fs.readFileSync(pdfBolsa);
            await sock.sendMessage(remoteJid, {
                document: buf,
                fileName: '200_MOLDES_-_BOLSA_JEANS.pdf',
                mimetype: 'application/pdf',
            });
        } catch (err) {}
    }
    await new Promise((r) => setTimeout(r, 1000));

    // Áudio certificado
    try { await sock.sendPresenceUpdate('recording', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1500));
    const audioCert = path.join(__dirname, 'public', 'funil10', 'audio_certificado.mp3');
    if (fs.existsSync(audioCert)) {
        try {
            const buf = fs.readFileSync(audioCert);
            await sock.sendMessage(remoteJid, { audio: buf, mimetype: 'audio/mpeg', ptt: true });
        } catch (err) {}
    }
    try { await sock.sendPresenceUpdate('paused', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1000));

    await sendRealisticText(botId, sock, remoteJid, userPhone, 'Assim que finalizar sua contribuição, me manda o comprovante que eu já libero seu *certificado* (no aplicativo), além de moldes, videoaulas e acesso à comunidade! 🏆💚');

    const sessionKey = `${botId}:${userPhone}`;
    store.userSessions[sessionKey] = {
        botId,
        userJid: remoteJid,
        userPhone,
        userName: pushName,
        funnel: 'funil10',
        waitingFor: 'PIX_RECEIPT_FUNIL10',
        updatedAt: new Date().toISOString(),
    };
    saveStore(store);

    scheduleFunil10Reminder(botId, remoteJid, userPhone);
}

const funil10ReminderTimers = new Map();

function cancelFunil10Reminder(botId, userPhone) {
    const key = `${botId}:${userPhone}`;
    if (funil10ReminderTimers.has(key)) {
        const timers = funil10ReminderTimers.get(key);
        if (Array.isArray(timers)) timers.forEach((t) => clearTimeout(t));
        else clearTimeout(timers);
        funil10ReminderTimers.delete(key);
    }
}

function scheduleFunil10Reminder(botId, remoteJid, userPhone) {
    cancelFunil10Reminder(botId, userPhone);
    const key = `${botId}:${userPhone}`;
    const timers = [];

    const sendFollowUp = async (step, texts) => {
        try {
            const currentStore = loadStore();
            const sess = currentStore.userSessions[key];
            if (sess && sess.waitingFor === 'PIX_RECEIPT_FUNIL10') {
                const sock = activeSockets.get(botId);
                if (sock) {
                    for (const text of texts) {
                        await sock.sendMessage(remoteJid, { text });
                        logConversation(botId, userPhone, 'BOT', 'REMINDER', text);
                        await new Promise((r) => setTimeout(r, 800));
                    }
                }
            }
        } catch (err) {
            console.error('[Funil 10 Reminder Error]:', err?.message);
        }
    };

    // Step 1: ~15 min
    timers.push(setTimeout(() => {
        sendFollowUp(1, ['Fico aguardando seu retorno sobre o valor com o comprovante, combinado?']);
    }, 15 * 60 * 1000));

    // Step 2: ~30 min
    timers.push(setTimeout(() => {
        sendFollowUp(2, ['Fico no aguardo, assim que puder me envie o comprovante, já separei seu presente aqui ❤️🙏']);
    }, 30 * 60 * 1000));

    // Step 3: ~1h
    timers.push(setTimeout(() => {
        sendFollowUp(3, ['Oii, deu tudo certinho?\nQuando puder me envia o comprovante ❤️']);
    }, 60 * 60 * 1000));

    // Step 4: Dia 2 (~12h) - Áudio Lembrete + Link App
    timers.push(setTimeout(async () => {
        try {
            const currentStore = loadStore();
            const sess = currentStore.userSessions[key];
            if (sess && sess.waitingFor === 'PIX_RECEIPT_FUNIL10') {
                const sock = activeSockets.get(botId);
                if (sock) {
                    const audioP = path.join(__dirname, 'public', 'funil10', 'audio_lembrete_dia2.mp3');
                    if (fs.existsSync(audioP)) {
                        const buf = fs.readFileSync(audioP);
                        await sock.sendMessage(remoteJid, { audio: buf, mimetype: 'audio/mpeg', ptt: true });
                    }
                    await sock.sendMessage(remoteJid, { text: 'https://bolsas-lucrativas.vercel.app/' });
                }
            }
        } catch (err) {}
    }, 720 * 60 * 1000));

    funil10ReminderTimers.set(key, timers);
}


// ═══════════════════════════════════════════════════════════════════════════════
// FUNIL 11: Estimulação Cognitiva Idosos - Selma (Projeto Mente Viva)
// (Gatilho: teste11)
// ═══════════════════════════════════════════════════════════════════════════════

async function sendFunil11Phase1(botId, sock, remoteJid, userPhone, pushName) {
    console.log(`[Funil 11 - Selma Mente Viva] 🚀 Iniciando Fase 1 para ${pushName} (${userPhone})`);

    const imgSelma = path.join(__dirname, 'public', 'funil11', 'foto_selma.jpeg');
    if (fs.existsSync(imgSelma)) {
        try {
            const buf = fs.readFileSync(imgSelma);
            await sock.sendMessage(remoteJid, {
                image: buf,
                caption: 'Olá, meu anjo! Tudo bem?\nEu sou a Selma, do Projeto Mente Viva 💙\nJá salva meu contato, assim você não perde nenhum arquivo ou orientação'
            });
        } catch (err) {}
    }
    await new Promise((r) => setTimeout(r, 1200));

    // Áudio apresentação
    try { await sock.sendPresenceUpdate('recording', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1500));
    const audioApres = path.join(__dirname, 'public', 'funil11', 'audio_apresentacao.mp3');
    if (fs.existsSync(audioApres)) {
        try {
            const buf = fs.readFileSync(audioApres);
            await sock.sendMessage(remoteJid, { audio: buf, mimetype: 'audio/mpeg', ptt: true });
            logConversation(botId, userPhone, 'BOT', 'AUDIO', '🎙️ [Áudio Apresentação Funil 11]');
        } catch (err) {}
    }
    try { await sock.sendPresenceUpdate('paused', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1200));

    const vidDemo = path.join(__dirname, 'public', 'funil11', 'video_demonstracao.mp4');
    if (fs.existsSync(vidDemo)) {
        try {
            const buf = fs.readFileSync(vidDemo);
            await sock.sendMessage(remoteJid, { video: buf });
        } catch (err) {}
    }
    await new Promise((r) => setTimeout(r, 1200));

    await sendRealisticText(botId, sock, remoteJid, userPhone, 'Viu como fica bonita no papel? 😊\nEu te mando as apostilas aqui, sem pagar nada antes.\n\nPosso mandar?');

    const sessionKey = `${botId}:${userPhone}`;
    store.userSessions[sessionKey] = {
        botId,
        userJid: remoteJid,
        userPhone,
        userName: pushName,
        funnel: 'funil11',
        waitingFor: 'CONFIRM_SEND_FUNIL11',
        updatedAt: new Date().toISOString(),
    };
    saveStore(store);
}

async function sendFunil11Phase2(botId, sock, remoteJid, userPhone, pushName, quotedMsg = null) {
    console.log(`[Funil 11 - Selma Mente Viva] 📦 Fase 2 (Entrega PDFs) para ${pushName} (${userPhone})`);

    await sendRealisticText(botId, sock, remoteJid, userPhone, 'Vou te enviar! Segue aqui os materiais 👇');
    await new Promise((r) => setTimeout(r, 1000));

    const pdfs = ['Mente Viva 50 - GVL.pdf', 'Mente Viva 2.0 - GVL.pdf'];
    for (const p of pdfs) {
        const fullP = path.join(__dirname, 'public', 'funil11', p);
        if (fs.existsSync(fullP)) {
            try {
                const buf = fs.readFileSync(fullP);
                await sock.sendMessage(remoteJid, {
                    document: buf,
                    fileName: p,
                    mimetype: 'application/pdf',
                });
            } catch (err) {}
        }
        await new Promise((r) => setTimeout(r, 1200));
    }

    await sendRealisticText(botId, sock, remoteJid, userPhone, 'Você já pode imprimir as atividades e começar hoje mesmo, no seu tempo e no conforto da sua casa 💛\nEspero que goste do material 🥰');
    await new Promise((r) => setTimeout(r, 1000));

    const imgApp = path.join(__dirname, 'public', 'funil11', 'foto_app.jpeg');
    if (fs.existsSync(imgApp)) {
        try {
            const buf = fs.readFileSync(imgApp);
            await sock.sendMessage(remoteJid, {
                image: buf,
                caption: 'E tem mais um presente: o app Mente Viva 📱\nSão 400 atividades direto no celular, sem imprimir.\nA letra aumenta e ele lê a atividade pra você.\nVai junto com a contribuição de R$ 30 💛'
            });
        } catch (err) {}
    }
    await new Promise((r) => setTimeout(r, 1200));

    const apoioText = `Nós mantemos o projeto Mente Viva pela contribuição de quem recebe e gosta 😊\n\n💰O apoio mínimo é de R$20.\n✨ R$ 30, o apoio mais escolhido, e vai junto o app Mente Viva ✨\n💎 R$ 50+ — uma forma especial de me ajudar a chegar a mais pessoas 💎\n\nCada apoio ajuda este projeto a continuar levando atividades que estimulam a mente e fazem a diferença na rotina de muitas pessoas. 💙\n\n💌 PIX: 31975362565\nNome: Projeto Viva Luz\nVou deixar a chave aqui para facilitar👇`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, apoioText);
    await new Promise((r) => setTimeout(r, 800));

    await sendRealisticText(botId, sock, remoteJid, userPhone, '31975362565');
    await new Promise((r) => setTimeout(r, 1000));

    // Áudio confiança
    try { await sock.sendPresenceUpdate('recording', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1500));
    const audioConf = path.join(__dirname, 'public', 'funil11', 'audio_confianca.mp3');
    if (fs.existsSync(audioConf)) {
        try {
            const buf = fs.readFileSync(audioConf);
            await sock.sendMessage(remoteJid, { audio: buf, mimetype: 'audio/mpeg', ptt: true });
        } catch (err) {}
    }
    try { await sock.sendPresenceUpdate('paused', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1000));

    const bonusInfo = `Quando você fizer a contribuição, é só me enviar o comprovante 😊\nAssim que confirmar, eu te envio os bônus:\n\n📙 80 Atividades Mentais Extras\n💪 Corpo Ativo em Casa\n🧘 Guia de Alongamentos\n📱 E com R$ 30 ou mais, o app Mente Viva, liberado no seu número na hora que eu conferir\n\nEstou por aqui! 🙏`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, bonusInfo);

    const sessionKey = `${botId}:${userPhone}`;
    store.userSessions[sessionKey] = {
        botId,
        userJid: remoteJid,
        userPhone,
        userName: pushName,
        funnel: 'funil11',
        waitingFor: 'PIX_RECEIPT_FUNIL11',
        updatedAt: new Date().toISOString(),
    };
    saveStore(store);

    scheduleFunil11Reminder(botId, remoteJid, userPhone);
}

const funil11ReminderTimers = new Map();

function cancelFunil11Reminder(botId, userPhone) {
    const key = `${botId}:${userPhone}`;
    if (funil11ReminderTimers.has(key)) {
        const timers = funil11ReminderTimers.get(key);
        if (Array.isArray(timers)) timers.forEach((t) => clearTimeout(t));
        else clearTimeout(timers);
        funil11ReminderTimers.delete(key);
    }
}

function scheduleFunil11Reminder(botId, remoteJid, userPhone) {
    cancelFunil11Reminder(botId, userPhone);
    const key = `${botId}:${userPhone}`;
    const timers = [];

    const sendFollowUp = async (step, texts) => {
        try {
            const currentStore = loadStore();
            const sess = currentStore.userSessions[key];
            if (sess && sess.waitingFor === 'PIX_RECEIPT_FUNIL11') {
                const sock = activeSockets.get(botId);
                if (sock) {
                    for (const text of texts) {
                        await sock.sendMessage(remoteJid, { text });
                        logConversation(botId, userPhone, 'BOT', 'REMINDER', text);
                        await new Promise((r) => setTimeout(r, 800));
                    }
                }
            }
        } catch (err) {}
    };

    // Step 1: ~1 hora
    timers.push(setTimeout(() => {
        sendFollowUp(1, ['Amém, Deus abençoe você também 🙏 Já deu pra fazer a lista do mercado, na página 28?']);
    }, 60 * 60 * 1000));

    funil11ReminderTimers.set(key, timers);
}


// ═══════════════════════════════════════════════════════════════════════════════
// FUNIL 12: Cardápio Adventista (90 Dias Saúde) - Déb (Gatilho: teste12)
// ═══════════════════════════════════════════════════════════════════════════════

async function sendFunil12Phase1(botId, sock, remoteJid, userPhone, pushName) {
    console.log(`[Funil 12 - Déb Cardápio Adventista] 🚀 Iniciando Fase 1 para ${pushName} (${userPhone})`);

    const intro = `Oii ${pushName || ''}, tudo bem? Que a paz de Deus esteja com você! Já vou te mandar o seu material agora mesmo 🙏🏼✨\n\nSe você é Adventista do Sétimo Dia, sabe o desafio que é manter uma alimentação 100% de acordo com o que a Bíblia ensina. Por isso eu organizei o Cardápio Adventista: com receitas saborosas, naturais, sem açúcar refinado, sem carnes impuras e saudável de verdade e além disso que agrada toda a família... 🥗\n\nVou te explicar em alguns segundos como você vai ter acesso a tudo isso!`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, intro);
    await new Promise((r) => setTimeout(r, 1200));

    // Áudio 1
    try { await sock.sendPresenceUpdate('recording', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1500));
    const a1 = path.join(__dirname, 'public', 'funil12', 'audio_apresentacao.mp3');
    if (fs.existsSync(a1)) {
        try {
            const buf = fs.readFileSync(a1);
            await sock.sendMessage(remoteJid, { audio: buf, mimetype: 'audio/mpeg', ptt: true });
        } catch (err) {}
    }
    try { await sock.sendPresenceUpdate('paused', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1000));

    await sendRealisticText(botId, sock, remoteJid, userPhone, 'Posso te explicar?');

    const sessionKey = `${botId}:${userPhone}`;
    store.userSessions[sessionKey] = {
        botId,
        userJid: remoteJid,
        userPhone,
        userName: pushName,
        funnel: 'funil12',
        waitingFor: 'CONFIRM_INFO_FUNIL12',
        updatedAt: new Date().toISOString(),
    };
    saveStore(store);
}

async function sendFunil12Phase2(botId, sock, remoteJid, userPhone, pushName, quotedMsg = null) {
    console.log(`[Funil 12 - Déb Cardápio Adventista] 📦 Fase 2 (Explicação) para ${pushName} (${userPhone})`);

    // Áudio 2
    try { await sock.sendPresenceUpdate('recording', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1500));
    const a2 = path.join(__dirname, 'public', 'funil12', 'audio_explicacao.mp3');
    if (fs.existsSync(a2)) {
        try {
            const buf = fs.readFileSync(a2);
            await sock.sendMessage(remoteJid, { audio: buf, mimetype: 'audio/mpeg', ptt: true });
        } catch (err) {}
    }
    try { await sock.sendPresenceUpdate('paused', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1000));

    const cardapioDesc = `O Menu - Cardápio Adventista é o material completo para você organizar a sua cozinha com saúde e sabor — com tudo o que você precisa para preparar refeições incríveis, 100% naturais e alinhadas com os princípios bíblicos.\n\n✅ +150 Receitas Saudáveis e Testadas\n✅ Cafés da Manhã Nutritivos\n✅ Almoços Completos & Ricos\n✅ Jantares Leves\n✅ Lanches Práticos e Rápidos\n✅ Organização para 90 Dias\n✅ Listas de Ingredientes Simples\n\nE muito mais! 🥗🥑`;
    const imgCardapio = path.join(__dirname, 'public', 'funil12', 'foto_cardapio.jpeg');
    if (fs.existsSync(imgCardapio)) {
        try {
            const buf = fs.readFileSync(imgCardapio);
            await sock.sendMessage(remoteJid, { image: buf, caption: cardapioDesc });
        } catch (err) {}
    }
    await new Promise((r) => setTimeout(r, 1200));

    const precoText = `O material é 100% digital, em formato PDF de alta resolução, enviado direto aqui no seu WhatsApp para você usar no celular ou imprimir quando quiser. 📱📄\n\nA contribuição é de apenas R$ 19,90 — um valor simbólico que me ajuda a cobrir os custos de pesquisa, edição e produção dessas receitas, permitindo que a gente continue mantendo esse projeto ativo e ajudando cada vez mais nossos irmãos e irmãs a cuidarem do corpo e da alimentação seguindo a Palavra.\n\nLembrando, que eu te envio todo o material antes para você analisar e só depois se gostar, nos ajudar com a contribuição, ok?`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, precoText);
    await new Promise((r) => setTimeout(r, 1000));

    await sendRealisticText(botId, sock, remoteJid, userPhone, 'Posso te enviar o material primeiro e depois você faz a sua contribuição?');

    const sessionKey = `${botId}:${userPhone}`;
    store.userSessions[sessionKey] = {
        botId,
        userJid: remoteJid,
        userPhone,
        userName: pushName,
        funnel: 'funil12',
        waitingFor: 'CONFIRM_SEND_FUNIL12',
        updatedAt: new Date().toISOString(),
    };
    saveStore(store);
}

async function sendFunil12Phase3(botId, sock, remoteJid, userPhone, pushName, quotedMsg = null) {
    console.log(`[Funil 12 - Déb Cardápio Adventista] 🚀 Fase 3 (Envio 3 PDFs) para ${pushName} (${userPhone})`);

    // Áudio envio
    try { await sock.sendPresenceUpdate('recording', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1500));
    const a3 = path.join(__dirname, 'public', 'funil12', 'audio_envio.mp3');
    if (fs.existsSync(a3)) {
        try {
            const buf = fs.readFileSync(a3);
            await sock.sendMessage(remoteJid, { audio: buf, mimetype: 'audio/mpeg', ptt: true });
        } catch (err) {}
    }
    try { await sock.sendPresenceUpdate('paused', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1000));

    const debPdfs = [
        'MENU - CARDÁPIO ADVENTISTA.pdf',
        'RECEITAS PARA O SÁBADO.pdf',
        '25 SOBREMESAS SAUDÁVEIS.pdf'
    ];

    for (const p of debPdfs) {
        // Encontra o arquivo correto independente da normalização
        const files = fs.readdirSync(path.join(__dirname, 'public', 'funil12'));
        const found = files.find(f => f.toLowerCase().includes(p.toLowerCase().slice(0, 10)));
        if (found) {
            try {
                const buf = fs.readFileSync(path.join(__dirname, 'public', 'funil12', found));
                await sock.sendMessage(remoteJid, {
                    document: buf,
                    fileName: found,
                    mimetype: 'application/pdf',
                });
            } catch (err) {}
        }
        await new Promise((r) => setTimeout(r, 1200));
    }

    await sendRealisticText(botId, sock, remoteJid, userPhone, 'Agora confio no seu coração e no agir de Deus ✝️🤍');
    await new Promise((r) => setTimeout(r, 800));

    const pixText = `O Cardápio Adventista já foi enviado todinho para você! Agora é a sua vez de enviar o PIX para ajudar a esse material chegar mais a frente, combinado?\n\n🙏 VOCÊ PODE CONTRIBUIR COM:\n💰 R$ 19,90\n💰 R$ 24,90\n💰 R$ 29,90\n⭐ R$ 49,90\n\nOu o valor que o seu coração mandar. A maioria dos irmãos e irmãs estão contribuindo com R$ 29,90 ou mais... Contribua com o que DEUS tocou no seu coração! 💖\n\n. Nome: RP Empreendimentos Digitais LTDA.\n. Banco: STONE IP PAGAMENTOS\n\nPara facilitar, vou te enviar a chave Pix separada para você só copiar e colar 👇👇`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, pixText);
    await new Promise((r) => setTimeout(r, 800));

    await sendRealisticText(botId, sock, remoteJid, userPhone, '71993667052');
    await new Promise((r) => setTimeout(r, 1000));

    const bonusFinal = `Assim que você me mandar o comprovante da sua contribuição aqui, eu mesma vou te enviar na hora o restante do seu Pacote de Bônus Exclusivos! 🎁✨\n\nNele eu fiz questão de colocar:\n✅ Bônus 01 — Lista Inteligente & Econômica de Compras\n✅ Bônus 02 — Guia Alimentar dos Princípios de Ellen White\n\nJá te mandei a nossa chave pix. É só fazer a sua contribuição e me mandar o comprovante, desde já, agradeço.`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, bonusFinal);

    const sessionKey = `${botId}:${userPhone}`;
    store.userSessions[sessionKey] = {
        botId,
        userJid: remoteJid,
        userPhone,
        userName: pushName,
        funnel: 'funil12',
        waitingFor: 'PIX_RECEIPT_FUNIL12',
        updatedAt: new Date().toISOString(),
    };
    saveStore(store);

    scheduleFunil12Reminder(botId, remoteJid, userPhone);
}

const funil12ReminderTimers = new Map();

function cancelFunil12Reminder(botId, userPhone) {
    const key = `${botId}:${userPhone}`;
    if (funil12ReminderTimers.has(key)) {
        const timers = funil12ReminderTimers.get(key);
        if (Array.isArray(timers)) timers.forEach((t) => clearTimeout(t));
        else clearTimeout(timers);
        funil12ReminderTimers.delete(key);
    }
}

function scheduleFunil12Reminder(botId, remoteJid, userPhone) {
    cancelFunil12Reminder(botId, userPhone);
    const key = `${botId}:${userPhone}`;
    const timers = [];

    const sendFollowUp = async (step, texts) => {
        try {
            const currentStore = loadStore();
            const sess = currentStore.userSessions[key];
            if (sess && sess.waitingFor === 'PIX_RECEIPT_FUNIL12') {
                const sock = activeSockets.get(botId);
                if (sock) {
                    for (const text of texts) {
                        await sock.sendMessage(remoteJid, { text });
                        logConversation(botId, userPhone, 'BOT', 'REMINDER', text);
                        await new Promise((r) => setTimeout(r, 800));
                    }
                }
            }
        } catch (err) {}
    };

    // Step 1: ~1h
    timers.push(setTimeout(() => {
        sendFollowUp(1, [
            'Amém, minha irmã 🤍\nSe você já conseguiu fazer o Pix, me manda o comprovante aqui pra eu confirmar direitinho, tá bom?\nSe ainda não fez, tudo bem também. Quando for fazer, a chave é essa aqui:\n\n71993667052\nNome: RP Empreendimentos Digitais LTDA.\nBanco: Stone IP Pagamentos'
        ]);
    }, 60 * 60 * 1000));

    funil12ReminderTimers.set(key, timers);
}


// ═══════════════════════════════════════════════════════════════════════════════
// FUNIL 13: Devocional Pelos Filhos - Missionária Maria (DAYZA LTDA)
// (Gatilho: teste13)
// ═══════════════════════════════════════════════════════════════════════════════

async function sendFunil13Phase1(botId, sock, remoteJid, userPhone, pushName) {
    console.log(`[Funil 13 - Missionária Maria] 🚀 Iniciando Fase 1 para ${pushName} (${userPhone})`);

    await sendRealisticText(botId, sock, remoteJid, userPhone, 'A paz do Senhor, minha irmã! Que Deus abençoe ✨');
    await new Promise((r) => setTimeout(r, 800));

    await sendRealisticText(botId, sock, remoteJid, userPhone, 'Só 1 minuto, que vou te mandar um áudio explicando sobre o Devocional.');
    await new Promise((r) => setTimeout(r, 1000));

    // Áudio 1
    try { await sock.sendPresenceUpdate('recording', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1500));
    const a1 = path.join(__dirname, 'public', 'funil13', 'audio_apresentacao.mp3');
    if (fs.existsSync(a1)) {
        try {
            const buf = fs.readFileSync(a1);
            await sock.sendMessage(remoteJid, { audio: buf, mimetype: 'audio/mpeg', ptt: true });
            logConversation(botId, userPhone, 'BOT', 'AUDIO', '🎙️ [Áudio Apresentação Funil 13]');
        } catch (err) {}
    }
    try { await sock.sendPresenceUpdate('paused', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1000));

    await sendRealisticText(botId, sock, remoteJid, userPhone, 'Deixa eu te perguntar mais uma coisa: como se chama o seu filho ou filha que se afastou?');

    const sessionKey = `${botId}:${userPhone}`;
    store.userSessions[sessionKey] = {
        botId,
        userJid: remoteJid,
        userPhone,
        userName: pushName,
        funnel: 'funil13',
        waitingFor: 'FILHO_NAME_FUNIL13',
        updatedAt: new Date().toISOString(),
    };
    saveStore(store);
}

async function sendFunil13AfterChildName(botId, sock, remoteJid, userPhone, pushName, quotedMsg = null) {
    console.log(`[Funil 13 - Missionária Maria] 👧 Recebido nome do filho de ${pushName} (${userPhone})`);

    await sendRealisticText(botId, sock, remoteJid, userPhone, 'Sei que o coração aperta, mas Deus não esquece, vamos orar juntos pra que dê tudo certo 🙏');
    await new Promise((r) => setTimeout(r, 800));

    await sendRealisticText(botId, sock, remoteJid, userPhone, 'Mas sabe o que realmente toca o meu coração, irmã?');
    await new Promise((r) => setTimeout(r, 800));

    const imgTest = path.join(__dirname, 'public', 'funil13', 'foto_testemunho_1.jpeg');
    if (fs.existsSync(imgTest)) {
        try {
            const buf = fs.readFileSync(imgTest);
            await sock.sendMessage(remoteJid, {
                image: buf,
                caption: 'Os testemunhos das mulheres que fazem o devocional'
            });
        } catch (err) {}
    }
    await new Promise((r) => setTimeout(r, 1000));

    await sendRealisticText(botId, sock, remoteJid, userPhone, 'E eu sei que Deus pode fazer um milagre na sua família também! *Você acredita?* 🙏🏼');
    await new Promise((r) => setTimeout(r, 1000));

    // Áudio explicação
    try { await sock.sendPresenceUpdate('recording', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1500));
    const a2 = path.join(__dirname, 'public', 'funil13', 'audio_explicacao.mp3');
    if (fs.existsSync(a2)) {
        try {
            const buf = fs.readFileSync(a2);
            await sock.sendMessage(remoteJid, { audio: buf, mimetype: 'audio/mpeg', ptt: true });
        } catch (err) {}
    }
    try { await sock.sendPresenceUpdate('paused', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1000));

    await sendRealisticText(botId, sock, remoteJid, userPhone, 'Posso mandar o Devocional agora e contar com sua contribuição, com o que Deus tocar no seu coração? 🙏🏻');

    const sessionKey = `${botId}:${userPhone}`;
    store.userSessions[sessionKey] = {
        botId,
        userJid: remoteJid,
        userPhone,
        userName: pushName,
        funnel: 'funil13',
        waitingFor: 'CONFIRM_SEND_FUNIL13',
        updatedAt: new Date().toISOString(),
    };
    saveStore(store);
}

async function sendFunil13Phase2(botId, sock, remoteJid, userPhone, pushName, quotedMsg = null) {
    console.log(`[Funil 13 - Missionária Maria] 📦 Enviando Devocional e PIX para ${pushName} (${userPhone})`);

    await sendRealisticText(botId, sock, remoteJid, userPhone, 'Glória a Deus! Em breve quero ouvir seu testemunho, irmã! Vou te enviar agora ⬇️');
    await new Promise((r) => setTimeout(r, 1000));

    const pdfs = ['Devocional 7 dias.pdf', 'Devocional 21 dias.pdf'];
    for (const p of pdfs) {
        const fullP = path.join(__dirname, 'public', 'funil13', p);
        if (fs.existsSync(fullP)) {
            try {
                const buf = fs.readFileSync(fullP);
                await sock.sendMessage(remoteJid, {
                    document: buf,
                    fileName: p,
                    mimetype: 'application/pdf',
                });
            } catch (err) {}
        }
        await new Promise((r) => setTimeout(r, 1200));
    }

    await sendRealisticText(botId, sock, remoteJid, userPhone, 'Caso a senhora não consiga abrir pelo PDF, vou te mandar o link pra abrir direto 👇🏻\nhttps://cutt.ly/devocional-libertacao');
    await new Promise((r) => setTimeout(r, 1000));

    // Áudio devocional online
    try { await sock.sendPresenceUpdate('recording', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1500));
    const aOnline = path.join(__dirname, 'public', 'funil13', 'audio_devocional_online.mp3');
    if (fs.existsSync(aOnline)) {
        try {
            const buf = fs.readFileSync(aOnline);
            await sock.sendMessage(remoteJid, { audio: buf, mimetype: 'audio/mpeg', ptt: true });
        } catch (err) {}
    }
    try { await sock.sendPresenceUpdate('paused', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1000));

    const imgCaixa = path.join(__dirname, 'public', 'funil13', 'foto_caixa_devocional.jpeg');
    if (fs.existsSync(imgCaixa)) {
        try {
            const buf = fs.readFileSync(imgCaixa);
            await sock.sendMessage(remoteJid, { image: buf });
        } catch (err) {}
    }
    await new Promise((r) => setTimeout(r, 1000));

    const pixText = `Agora eu conto com sua honestidade para manter esse projeto vivo 🙏🏻\n\nInformações para contribuição:\n📌 Chave Pix (telefone): 33999826417\n📌 Nome que aparece: *DAYZA LTDA*\n📌 Valor: *O que Deus tocar no seu coração*`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, pixText);
    await new Promise((r) => setTimeout(r, 800));

    await sendRealisticText(botId, sock, remoteJid, userPhone, 'Aqui é a chave PIX no número de celular separada para você só copiar e colar Irmã👇👇👇');
    await new Promise((r) => setTimeout(r, 600));

    await sendRealisticText(botId, sock, remoteJid, userPhone, '33999826417');
    await new Promise((r) => setTimeout(r, 1000));

    // Áudio oração final
    try { await sock.sendPresenceUpdate('recording', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1500));
    const aFinal = path.join(__dirname, 'public', 'funil13', 'audio_oracao_final.mp3');
    if (fs.existsSync(aFinal)) {
        try {
            const buf = fs.readFileSync(aFinal);
            await sock.sendMessage(remoteJid, { audio: buf, mimetype: 'audio/mpeg', ptt: true });
        } catch (err) {}
    }
    try { await sock.sendPresenceUpdate('paused', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1000));

    await sendRealisticText(botId, sock, remoteJid, userPhone, 'Me manda o comprovante, irmã, que eu já coloco a senhora no nosso grupo de oração do WhatsApp 🙏🏼');

    const sessionKey = `${botId}:${userPhone}`;
    store.userSessions[sessionKey] = {
        botId,
        userJid: remoteJid,
        userPhone,
        userName: pushName,
        funnel: 'funil13',
        waitingFor: 'PIX_RECEIPT_FUNIL13',
        updatedAt: new Date().toISOString(),
    };
    saveStore(store);

    scheduleFunil13Reminder(botId, remoteJid, userPhone);
}

const funil13ReminderTimers = new Map();

function cancelFunil13Reminder(botId, userPhone) {
    const key = `${botId}:${userPhone}`;
    if (funil13ReminderTimers.has(key)) {
        const timers = funil13ReminderTimers.get(key);
        if (Array.isArray(timers)) timers.forEach((t) => clearTimeout(t));
        else clearTimeout(timers);
        funil13ReminderTimers.delete(key);
    }
}

function scheduleFunil13Reminder(botId, remoteJid, userPhone) {
    cancelFunil13Reminder(botId, userPhone);
    const key = `${botId}:${userPhone}`;
    const timers = [];

    const sendFollowUp = async (step, texts) => {
        try {
            const currentStore = loadStore();
            const sess = currentStore.userSessions[key];
            if (sess && sess.waitingFor === 'PIX_RECEIPT_FUNIL13') {
                const sock = activeSockets.get(botId);
                if (sock) {
                    for (const text of texts) {
                        await sock.sendMessage(remoteJid, { text });
                        logConversation(botId, userPhone, 'BOT', 'REMINDER', text);
                        await new Promise((r) => setTimeout(r, 800));
                    }
                }
            }
        } catch (err) {}
    };

    // Step 1: ~1h
    timers.push(setTimeout(() => {
        sendFollowUp(1, ['Ta ai Irmã?']);
    }, 60 * 60 * 1000));

    // Step 2: ~2h - Foto Lembrete
    timers.push(setTimeout(async () => {
        try {
            const currentStore = loadStore();
            const sess = currentStore.userSessions[key];
            if (sess && sess.waitingFor === 'PIX_RECEIPT_FUNIL13') {
                const sock = activeSockets.get(botId);
                if (sock) {
                    const imgP = path.join(__dirname, 'public', 'funil13', 'foto_lembrete_testemunho.jpeg');
                    if (fs.existsSync(imgP)) {
                        const buf = fs.readFileSync(imgP);
                        await sock.sendMessage(remoteJid, { image: buf });
                    }
                    await sock.sendMessage(remoteJid, { text: 'Irmã, olha esse testemunho aqui que recebi no nosso grupo' });
                    await new Promise(r => setTimeout(r, 800));
                    await sock.sendMessage(remoteJid, { text: 'Conseguiu, irmã? Me manda também os nomes que a senhora deseja que a gente apresente em oração 🙌🏼' });
                }
            }
        } catch (err) {}
    }, 120 * 60 * 1000));

    // Step 3: Dia 2 (~16h) - Áudio Lembrete
    timers.push(setTimeout(async () => {
        try {
            const currentStore = loadStore();
            const sess = currentStore.userSessions[key];
            if (sess && sess.waitingFor === 'PIX_RECEIPT_FUNIL13') {
                const sock = activeSockets.get(botId);
                if (sock) {
                    await sock.sendMessage(remoteJid, { text: 'A paz do Senhor, minha irmã! ✨' });
                    const audioP = path.join(__dirname, 'public', 'funil13', 'audio_lembrete_dia2.mp3');
                    if (fs.existsSync(audioP)) {
                        const buf = fs.readFileSync(audioP);
                        await sock.sendMessage(remoteJid, { audio: buf, mimetype: 'audio/mpeg', ptt: true });
                    }
                }
            }
        } catch (err) {}
    }, 960 * 60 * 1000));

    funil13ReminderTimers.set(key, timers);
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


// ═══════════════════════════════════════════════════════════════════════════════
// FUNIL 5: Acervo 5.000+ Sermões - Vitor (Gatilho: teste5 - Ref: 17 98117-5202)
// ═══════════════════════════════════════════════════════════════════════════════

async function sendFunil5Phase1(botId, sock, remoteJid, userPhone, pushName) {
    console.log(`[Funil 5 - Acervo Sermões] 🚀 Iniciando Fase 1 para ${pushName} (${userPhone})`);

    await sendRealisticText(botId, sock, remoteJid, userPhone, 'Bom dia, tudo bem? A Paz do Senhor Jesus!');
    await new Promise((r) => setTimeout(r, 1200));

    try { await sock.sendPresenceUpdate('recording', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 2000));

    const mp3Path = path.join(__dirname, 'public', 'funil5', 'audio_apresentacao.mp3');
    if (fs.existsSync(mp3Path)) {
        try {
            const mp3Buffer = fs.readFileSync(mp3Path);
            await sock.sendMessage(remoteJid, {
                audio: mp3Buffer,
                mimetype: 'audio/mpeg',
                ptt: true,
            });
            logConversation(botId, userPhone, 'BOT', 'AUDIO', '🎙️ [Áudio Apresentação Funil 5 MP3 48s]');
            console.log(`[Funil 5] 🎙️ Áudio 1 MP3 enviado para ${userPhone}`);
        } catch (mp3Err) {
            console.warn('[Funil 5 MP3 Error]:', mp3Err?.message);
        }
    }
    try { await sock.sendPresenceUpdate('paused', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1200));

    await sendRealisticText(
        botId,
        sock,
        remoteJid,
        userPhone,
        'Salva meu contato para eu poder te enviar mais materiais e conteúdos como esses, amém?'
    );
    await new Promise((r) => setTimeout(r, 1000));

    const capaPath = path.join(__dirname, 'public', 'funil5', 'capa_acervo.jpeg');
    if (fs.existsSync(capaPath)) {
        try {
            const imgBuffer = fs.readFileSync(capaPath);
            await sock.sendMessage(remoteJid, { image: imgBuffer });
        } catch (imgErr) {}
    }
    await new Promise((r) => setTimeout(r, 1200));

    const offerText = `+ DE 5 MIL SERMÕES PRONTOS\nOrganizados e fáceis de usar 📖\n\n👉 É só ler, adaptar e ministrar.\n\n📲 Acesso imediato (PDFs)\n🖨️ Pode imprimir.\n\nO que você vai receber: 👇\n\n✅ Acesso ao acervo completo com + de 5MIL Sermões.\n✅ Sermões organizados por temas e categorias.\n✅ Acesso ao Grupo EXCLUSIVO no WhatsApp.\n✅ Materiais prontos pra usar, baixar e ministrar.\n\n👉 Você receberá atualizações semanais e você tem acesso VITALÍCIO!\n\nVocê vai receber 4 PRESENTES EXCLUSIVOS: 👇\n\n🎁 Os 150 Salmos explicados passo a passo.\n🎁 Os 66 livros da Bíblia Explicados (De Gênises a Apocalipse)\n🎁 AS CARTAS DE PAULO\n🎁 APLICATIVO DO APOCALIPSE\n\nAcervo completo 100% completo ⭐`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, offerText);
    await new Promise((r) => setTimeout(r, 1200));

    const priceText = `Normalmente esses materiais custariam no mínimo R$79,90\n\nMais Somente HOJE você recebe tudo isso por apenas R$19,90 no PIX\n\n(valor simbólico para ajudar nosso projeto)`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, priceText);
    await new Promise((r) => setTimeout(r, 1000));

    const trustText = `VOCÊ RECEBE TUDO PRIMEIRO\n\nE depois que eu enviar os materiais você faz a contribuição simbólica para apoiar essa obra ok? 🙏`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, trustText);
    await new Promise((r) => setTimeout(r, 1200));

    try { await sock.sendPresenceUpdate('recording', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1500));

    const audioConfPath = path.join(__dirname, 'public', 'funil5', 'audio_confianca.mp3');
    if (fs.existsSync(audioConfPath)) {
        try {
            const mp3Buffer = fs.readFileSync(audioConfPath);
            await sock.sendMessage(remoteJid, {
                audio: mp3Buffer,
                mimetype: 'audio/mpeg',
                ptt: true,
            });
            logConversation(botId, userPhone, 'BOT', 'AUDIO', '🎙️ [Áudio Confiança Funil 5 MP3 19s]');
        } catch (mp3Err) {}
    }
    try { await sock.sendPresenceUpdate('paused', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1000));

    const askText = `Posso te enviar agora mesmo e você faz o pix após receber os materiais ?\n\n⚠️ Atenção: responda SIM apenas se você se comprometer a realizar o pagamento em seguida.\n\nResponda apenas SIM ou NÃO por favor.`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, askText);

    const sessionKey = `${botId}:${userPhone}`;
    store.userSessions[sessionKey] = {
        botId,
        userJid: remoteJid,
        userPhone,
        userName: pushName,
        funnel: 'funil5',
        waitingFor: 'CONFIRM_SEND_FUNIL5',
        updatedAt: new Date().toISOString(),
    };
    saveStore(store);
}

async function sendFunil5Phase2(botId, sock, remoteJid, userPhone, pushName, quotedMsg = null) {
    console.log(`[Funil 5 - Acervo Sermões] 📦 Iniciando Fase 2 para ${pushName} (${userPhone})`);

    const quoteOptions = quotedMsg ? { quoted: quotedMsg } : {};

    try { await sock.sendPresenceUpdate('recording', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1000));

    const audioEnvPath = path.join(__dirname, 'public', 'funil5', 'audio_enviando.mp3');
    if (fs.existsSync(audioEnvPath)) {
        try {
            const mp3Buffer = fs.readFileSync(audioEnvPath);
            await sock.sendMessage(remoteJid, {
                audio: mp3Buffer,
                mimetype: 'audio/mpeg',
                ptt: true,
            }, quoteOptions);
            logConversation(botId, userPhone, 'BOT', 'AUDIO', '🎙️ [Áudio Enviando Funil 5 MP3 5s]');
        } catch (mp3Err) {}
    }
    try { await sock.sendPresenceUpdate('paused', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 800));

    await sendRealisticText(botId, sock, remoteJid, userPhone, 'Estou enviando agora:');
    await new Promise((r) => setTimeout(r, 1000));

    const mainPdfs = [
        '50 ESBOÇOS EM LUCAS.pdf',
        '50 ESBOÇOS EM MARCOS.pdf',
        '50 ESBOÇOS EM JOÃO.pdf',
        '70 ESBOÇOS EM MATHEUS.pdf',
        '40 ESBOÇOS EM ATOS DOS APÓSTOLOS.pdf',
        '50 ESBOÇOS JEREMIAS.pdf',
        '10 ESBOÇOS AVIVAMENTO ESPIRITUAL.pdf',
        '100 ESBOÇOS INPACTANTES ATUALIZADO.pdf',
        'LIDERANÇA CRISTÃ.pdf',
        '25 ESBOÇOS SOBRE JULGAMENTO.pdf',
        '10 ESBOÇOS O VERBO.pdf',
        '31 PROVERBIOS.pdf',
        '25 ESBOÇOS ATOS DOS APÓSTOLOS.pdf',
        '25 ESBOÇOS SOBRE SANSÃO.pdf',
        'Jesus Cristo no Antigo Testamento +Pentateuco.pdf',
        'AS 7 TROMBETAS.pdf',
        '50 ESBOÇOS EM EZEQUIEL.pdf',
        '25 ESBOÇOS SOBRE A CRUCIFICAÇÃO DE CRISTO.pdf',
        'Salmos - Explicados Versículo por Versículo - PARTE 1.pdf',
        'Salmos - Explicados Versículo por Versículo - PARTE 2.pdf',
        'Salmos - Explicados Versículo por Versículo - PARTE 3.pdf',
        '20 MIL ESBOÇOS.pdf'
    ];

    for (let i = 0; i < mainPdfs.length; i++) {
        const pdfFilename = mainPdfs[i];
        const pdfPath = path.join(__dirname, 'public', 'funil5', pdfFilename);
        if (fs.existsSync(pdfPath)) {
            try {
                const pdfBuf = fs.readFileSync(pdfPath);
                await sock.sendMessage(remoteJid, {
                    document: pdfBuf,
                    fileName: pdfFilename,
                    mimetype: 'application/pdf',
                });
                logConversation(botId, userPhone, 'BOT', 'DOCUMENT', `📄 [PDF ${i + 1}/${mainPdfs.length}]: ${pdfFilename}`);
                console.log(`[Funil 5] 📄 PDF ${i + 1}/${mainPdfs.length} enviado: ${pdfFilename}`);
            } catch (pdfErr) {
                console.warn(`[Funil 5 PDF Error]:`, pdfErr?.message);
            }
        }
        await new Promise((r) => setTimeout(r, 1200));
    }

    const biblioText = `Como são muitos materiais eu separei eles em uma Biblioteca Exclusiva todos organizados por temas. 👇\n\n🚨 ACESSE O RESTANTE DOS ESBOÇOS NO LINK ABAIXO 👇\n\nhttps://bibliotecapregacoes.netlify.app/\n\nSEU ACESSO FOI LIBERADO ✅\n\nVeja no tutorial abaixo como acessar sua biblioteca online 👇👇`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, biblioText);
    await new Promise((r) => setTimeout(r, 1200));

    const vidPath = path.join(__dirname, 'public', 'funil5', 'tutorial_biblioteca.mp4');
    if (fs.existsSync(vidPath)) {
        try {
            const vidBuf = fs.readFileSync(vidPath);
            await sock.sendMessage(remoteJid, {
                video: vidBuf,
                mimetype: 'video/mp4',
            });
            logConversation(botId, userPhone, 'BOT', 'VIDEO', '🎥 [Tutorial Biblioteca Online]');
        } catch (vidErr) {}
    }
    await new Promise((r) => setTimeout(r, 1500));

    const presentesText = `PRESENTE 1 🎁\n\nAcesse os 66 livros da bíblia de gênises a apocallipse 👇\nhttps://drive.google.com/drive/folders/10oLG9FY90lp5gQGIbfFrdzME8tytdMGm?usp=drive_link\n\n✅ Acesso liberado\n\nPRESENTE 2 - APLICATIVO SERMÃO DO APOCALIPSE 🎁👇\n\nA plataforma de sermões já está liberada para você.\n\n🔐 Dados de login:\n\nUsuário: Apocalipse\nSenha: 1234\n\n👉 Clique e acesse:\nhttps://sermoesbiblicos.online\n\nPRESENTE 3 - AS CARTAS DE PAULO 🎁👇\n\n✅ Acesso liberado!\nhttps://drive.google.com/drive/folders/1uNovAhcit1QUosY7Srk2-jSNvG5S0dS0?usp=drive_link\n\n📲 Entre no nosso grupo oficial no WhatsApp e fique por dentro de novos materiais e conteúdos exclusivos* que liberamos por lá!\n\nLINK DO NOSSO GRUPO: 👇\nhttps://chat.whatsapp.com/DDrnWQKV5vTB2UAYyQj3M2`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, presentesText);
    await new Promise((r) => setTimeout(r, 1200));

    const pixPromptText = `Agora conto com a sua contribuição 🙏\n\nInformações de pagamento via PIX:\n\nFinanceiro 👇\n\n🔑 - Chave PIX CNPJ: 64158407000124\n\n💵 - Valor: R$ 19,90\n( Ou o valor que Deus tocar no seu coração) ❤️\n\n👤 - Nome: Vitor Bueno de Carvalho\n\n🏦 - Banco: CloudWalk I.P\n\nPara facilitar, vou te enviar a chave PIX separada para você só copiar e colar`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, pixPromptText);
    await new Promise((r) => setTimeout(r, 800));

    const pixKey = '64158407000124';
    await sock.sendMessage(remoteJid, { text: pixKey });
    logConversation(botId, userPhone, 'BOT', 'PIX', `Chave PIX: ${pixKey}`);
    await new Promise((r) => setTimeout(r, 800));

    try { await sock.sendPresenceUpdate('recording', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1500));

    const audioPixPath = path.join(__dirname, 'public', 'funil5', 'audio_pix.mp3');
    if (fs.existsSync(audioPixPath)) {
        try {
            const mp3Buffer = fs.readFileSync(audioPixPath);
            await sock.sendMessage(remoteJid, {
                audio: mp3Buffer,
                mimetype: 'audio/mpeg',
                ptt: true,
            });
            logConversation(botId, userPhone, 'BOT', 'AUDIO', '🎙️ [Áudio PIX Funil 5 MP3 18s]');
        } catch (mp3Err) {}
    }
    try { await sock.sendPresenceUpdate('paused', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1000));

    const aguardoText = `Fico no aguardo do pagamento, só me enviar o comprovante!\n\nAgora conto com a sua honestidade amém. 🙏`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, aguardoText);

    const sessionKey = `${botId}:${userPhone}`;
    store.userSessions[sessionKey] = {
        botId,
        userJid: remoteJid,
        userPhone,
        userName: pushName,
        funnel: 'funil5',
        waitingFor: 'PIX_RECEIPT_FUNIL5',
        updatedAt: new Date().toISOString(),
    };
    saveStore(store);

    scheduleFunil5Reminder(botId, remoteJid, userPhone);
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNIL 6: Devocional Pelos Filhos - Missionária Flávia (Gatilho: teste6 - Ref: 12 98308-5720)
// ═══════════════════════════════════════════════════════════════════════════════

async function sendFunil6Phase1(botId, sock, remoteJid, userPhone, pushName) {
    console.log(`[Funil 6 - Devocional] 🚀 Iniciando Fase 1 para ${pushName} (${userPhone})`);

    const text1 = `A paz do Senhor, minha irmã! Que Deus abençoe ✨\n\nSó 1 minuto, que vou te mandar um áudio explicando sobre o Devocional.`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, text1);
    await new Promise((r) => setTimeout(r, 1200));

    try { await sock.sendPresenceUpdate('recording', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 2000));

    const mp3Path = path.join(__dirname, 'public', 'funil6', 'audio_apresentacao.mp3');
    if (fs.existsSync(mp3Path)) {
        try {
            const mp3Buffer = fs.readFileSync(mp3Path);
            await sock.sendMessage(remoteJid, {
                audio: mp3Buffer,
                mimetype: 'audio/mpeg',
                ptt: true,
            });
            logConversation(botId, userPhone, 'BOT', 'AUDIO', '🎙️ [Áudio Apresentação Funil 6 MP3 1m20s]');
        } catch (mp3Err) {}
    }
    try { await sock.sendPresenceUpdate('paused', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1200));

    const askChildText = `Deixa eu te perguntar mais uma coisa: como se chama o seu filho ou filha que se afastou?`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, askChildText);

    const sessionKey = `${botId}:${userPhone}`;
    store.userSessions[sessionKey] = {
        botId,
        userJid: remoteJid,
        userPhone,
        userName: pushName,
        funnel: 'funil6',
        waitingFor: 'FILHO_NAME_FUNIL6',
        updatedAt: new Date().toISOString(),
    };
    saveStore(store);
}

async function sendFunil6AfterChildName(botId, sock, remoteJid, userPhone, pushName, quotedMsg = null) {
    console.log(`[Funil 6 - Devocional] 💬 Resposta sobre o filho recebida de ${pushName} (${userPhone})`);

    const quoteOptions = quotedMsg ? { quoted: quotedMsg } : {};
    const textPrayer = `Sei que o coração aperta, mas Deus não esquece, vamos orar juntos pra que dê tudo certo 🙏\n\nMas sabe o que realmente toca o meu coração, irmã?`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, textPrayer, quoteOptions);
    await new Promise((r) => setTimeout(r, 1200));

    const printPath = path.join(__dirname, 'public', 'funil6', 'print_testemunho_filho.jpeg');
    if (fs.existsSync(printPath)) {
        try {
            const imgBuffer = fs.readFileSync(printPath);
            await sock.sendMessage(remoteJid, { image: imgBuffer });
        } catch (imgErr) {}
    }
    await new Promise((r) => setTimeout(r, 1200));

    const faithAsk = `Os testemunhos das mulheres que fazem o devocional\n\nE eu sei que Deus pode fazer um milagre na sua família também! Você acredita? 🙏`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, faithAsk);

    const sessionKey = `${botId}:${userPhone}`;
    store.userSessions[sessionKey] = {
        botId,
        userJid: remoteJid,
        userPhone,
        userName: pushName,
        funnel: 'funil6',
        waitingFor: 'CONFIRM_SEND_FUNIL6',
        updatedAt: new Date().toISOString(),
    };
    saveStore(store);
}

async function sendFunil6Phase2(botId, sock, remoteJid, userPhone, pushName, quotedMsg = null) {
    console.log(`[Funil 6 - Devocional] 📦 Iniciando Fase 2 para ${pushName} (${userPhone})`);

    const quoteOptions = quotedMsg ? { quoted: quotedMsg } : {};
    const textAmen = `Amém irmã! Deus está cuidando de cada detalhe com muito amor ❤️\n\nIrmã, eu vou te mandar mais 1 áudio explicando como funciona o Devocional ⬇️`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, textAmen, quoteOptions);
    await new Promise((r) => setTimeout(r, 1200));

    try { await sock.sendPresenceUpdate('recording', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 2000));

    const audioExpPath = path.join(__dirname, 'public', 'funil6', 'audio_explicacao.mp3');
    if (fs.existsSync(audioExpPath)) {
        try {
            const mp3Buffer = fs.readFileSync(audioExpPath);
            await sock.sendMessage(remoteJid, {
                audio: mp3Buffer,
                mimetype: 'audio/mpeg',
                ptt: true,
            });
            logConversation(botId, userPhone, 'BOT', 'AUDIO', '🎙️ [Áudio Explicação Funil 6 MP3 1m39s]');
        } catch (mp3Err) {}
    }
    try { await sock.sendPresenceUpdate('paused', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1200));

    const sendTrustText = `Glória a Deus! Em breve quero ouvir seu testemunho, irmã! Vou te enviar agora ⬇️`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, sendTrustText);
    await new Promise((r) => setTimeout(r, 1000));

    const pdfs = [
        { file: 'Devocional 7 dias.pdf', name: 'Devocional 7 dias.pdf' },
        { file: 'Devocional 21 dias.pdf', name: 'Devocional 21 dias.pdf' },
    ];

    for (let i = 0; i < pdfs.length; i++) {
        const item = pdfs[i];
        const fullPdfPath = path.join(__dirname, 'public', 'funil6', item.file);
        if (fs.existsSync(fullPdfPath)) {
            try {
                const pdfBuffer = fs.readFileSync(fullPdfPath);
                await sock.sendMessage(remoteJid, {
                    document: pdfBuffer,
                    fileName: item.name,
                    mimetype: 'application/pdf',
                });
                logConversation(botId, userPhone, 'BOT', 'DOCUMENT', `📄 [PDF ${i + 1}/2]: ${item.name}`);
            } catch (pdfErr) {}
        }
        await new Promise((r) => setTimeout(r, 1200));
    }

    const platformText = `Caso a senhora não consiga abrir pelo PDF, vou te mandar o link pra abrir direto 👇\nhttps://devocional7diasonline.lovable.app`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, platformText);
    await new Promise((r) => setTimeout(r, 1200));

    try { await sock.sendPresenceUpdate('recording', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1500));

    const audioEntPath = path.join(__dirname, 'public', 'funil6', 'audio_entrega.mp3');
    if (fs.existsSync(audioEntPath)) {
        try {
            const mp3Buffer = fs.readFileSync(audioEntPath);
            await sock.sendMessage(remoteJid, {
                audio: mp3Buffer,
                mimetype: 'audio/mpeg',
                ptt: true,
            });
            logConversation(botId, userPhone, 'BOT', 'AUDIO', '🎙️ [Áudio Entrega Funil 6 MP3 1m28s]');
        } catch (mp3Err) {}
    }
    try { await sock.sendPresenceUpdate('paused', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1200));

    const kitPath = path.join(__dirname, 'public', 'funil6', 'kit_caixa_devocional.jpeg');
    if (fs.existsSync(kitPath)) {
        try {
            const imgBuffer = fs.readFileSync(kitPath);
            await sock.sendMessage(remoteJid, { image: imgBuffer });
        } catch (imgErr) {}
    }
    await new Promise((r) => setTimeout(r, 1200));

    const pixPromptText = `Agora eu conto com sua honestidade para manter esse projeto vivo 🙏\n\nInformações para contribuição:\n\n📌 Chave Pix (Celular): 12983085720\n📌 Nome que aparece: DIGITAL DSX LTDA\n📌 Banco: DOCK IP S.A.\n📌 Valor: O que Deus tocar no seu coração`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, pixPromptText);
    await new Promise((r) => setTimeout(r, 800));

    const pixKey = '12983085720';
    await sock.sendMessage(remoteJid, { text: pixKey });
    logConversation(botId, userPhone, 'BOT', 'PIX', `Chave PIX: ${pixKey}`);
    await new Promise((r) => setTimeout(r, 800));

    const instructText = `Aqui é a chave PIX no número do Celular separada para você só copiar e colar Irmã 👇👇👇`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, instructText);
    await new Promise((r) => setTimeout(r, 1000));

    try { await sock.sendPresenceUpdate('recording', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1500));

    const audioUltPath = path.join(__dirname, 'public', 'funil6', 'audio_ultimo_sorteio.mp3');
    if (fs.existsSync(audioUltPath)) {
        try {
            const mp3Buffer = fs.readFileSync(audioUltPath);
            await sock.sendMessage(remoteJid, {
                audio: mp3Buffer,
                mimetype: 'audio/mpeg',
                ptt: true,
            });
            logConversation(botId, userPhone, 'BOT', 'AUDIO', '🎙️ [Último Áudio Funil 6 MP3 59s]');
        } catch (mp3Err) {}
    }
    try { await sock.sendPresenceUpdate('paused', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1000));

    const sorteioNotice = `E irmã, por mais que não tenha como contribuir agora, tenta ver se consegue ainda hoje, porque já coloco seu nome no sorteio. Muitas mães já ganharam e a próxima pode ser você 🙏\n\nMe manda o comprovante, irmã, que eu já coloco a senhora no nosso grupo de oração do WhatsApp 🙏`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, sorteioNotice);

    const sessionKey = `${botId}:${userPhone}`;
    store.userSessions[sessionKey] = {
        botId,
        userJid: remoteJid,
        userPhone,
        userName: pushName,
        funnel: 'funil6',
        waitingFor: 'PIX_RECEIPT_FUNIL6',
        updatedAt: new Date().toISOString(),
    };
    saveStore(store);

    scheduleFunil6Reminder(botId, remoteJid, userPhone);
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNIL 7: Construtor de Palavras e Alfabetização Infantil - Pinguim Estudioso
// (Gatilho: teste7 - Ref: 37 99938-7172)
// ═══════════════════════════════════════════════════════════════════════════════

async function sendFunil7Phase1(botId, sock, remoteJid, userPhone, pushName) {
    console.log(`[Funil 7 - Alfabetização] 🚀 Iniciando Fase 1 para ${pushName} (${userPhone})`);

    await sendRealisticText(botId, sock, remoteJid, userPhone, 'Olá! Bom dia, tudo bem?');
    await new Promise((r) => setTimeout(r, 1000));

    const capaPath = path.join(__dirname, 'public', 'funil7', 'capa_gratuito.jpeg');
    if (fs.existsSync(capaPath)) {
        try {
            const imgBuffer = fs.readFileSync(capaPath);
            await sock.sendMessage(remoteJid, { image: imgBuffer });
        } catch (e) {
            console.warn('[Funil 7 Capa Error]:', e?.message);
        }
    }
    await new Promise((r) => setTimeout(r, 800));

    await sendRealisticText(botId, sock, remoteJid, userPhone, 'Posso te enviar nosso material gratuito?');

    const sessionKey = `${botId}:${userPhone}`;
    store.userSessions[sessionKey] = {
        botId,
        userJid: remoteJid,
        userPhone,
        userName: pushName,
        funnel: 'funil7',
        waitingFor: 'CONFIRM_SEND_FUNIL7_FREE',
        updatedAt: new Date().toISOString(),
    };
    saveStore(store);
}

async function sendFunil7Phase2(botId, sock, remoteJid, userPhone, pushName, quotedMsg = null) {
    console.log(`[Funil 7 - Alfabetização] 📦 Enviando Amostra Grátis e Oferta para ${pushName} (${userPhone})`);

    const quoteOptions = quotedMsg ? { quoted: quotedMsg } : {};
    await sendRealisticText(botId, sock, remoteJid, userPhone, 'Segue o material gratuito Construtor de Palavras 👇', quoteOptions);
    await new Promise((r) => setTimeout(r, 1000));

    const samplePdfPath = path.join(__dirname, 'public', 'funil7', 'CONSTRUTOR DE PALAVRAS PLR.pdf');
    if (fs.existsSync(samplePdfPath)) {
        try {
            const pdfBuffer = fs.readFileSync(samplePdfPath);
            await sock.sendMessage(remoteJid, {
                document: pdfBuffer,
                fileName: 'CONSTRUTOR DE PALAVRAS PLR.pdf',
                mimetype: 'application/pdf',
            });
            logConversation(botId, userPhone, 'BOT', 'DOCUMENT', '📄 [PDF Grátis]: CONSTRUTOR DE PALAVRAS PLR.pdf');
        } catch (pdfErr) {
            console.warn('[Funil 7 PDF Grátis Error]:', pdfErr?.message);
        }
    }
    await new Promise((r) => setTimeout(r, 1200));

    // Áudio PTT (52s)
    try { await sock.sendPresenceUpdate('recording', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1500));

    const mp3Path = path.join(__dirname, 'public', 'funil7', 'audio_apresentacao.mp3');
    if (fs.existsSync(mp3Path)) {
        try {
            const mp3Buffer = fs.readFileSync(mp3Path);
            await sock.sendMessage(remoteJid, {
                audio: mp3Buffer,
                mimetype: 'audio/mpeg',
                ptt: true,
            });
            logConversation(botId, userPhone, 'BOT', 'AUDIO', '🎙️ [Áudio Apresentação Funil 7 MP3 52s]');
        } catch (mp3Err) {
            console.warn('[Funil 7 Áudio Error]:', mp3Err?.message);
        }
    }
    try { await sock.sendPresenceUpdate('paused', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1000));

    const promoImgPath = path.join(__dirname, 'public', 'funil7', 'tabela_promocao.jpeg');
    if (fs.existsSync(promoImgPath)) {
        try {
            const imgBuffer = fs.readFileSync(promoImgPath);
            await sock.sendMessage(remoteJid, { image: imgBuffer });
        } catch (e) {}
    }
    await new Promise((r) => setTimeout(r, 1000));

    await sendRealisticText(botId, sock, remoteJid, userPhone, 'VÁLIDO APENAS HOJE ⭐️');
    await new Promise((r) => setTimeout(r, 800));
    await sendRealisticText(botId, sock, remoteJid, userPhone, 'Você paga apenas R$ 11,90 pelo KIT COMPLETO! ✅');
    await new Promise((r) => setTimeout(r, 800));
    await sendRealisticText(botId, sock, remoteJid, userPhone, 'Você gostaria de receber?');

    const sessionKey = `${botId}:${userPhone}`;
    store.userSessions[sessionKey] = {
        botId,
        userJid: remoteJid,
        userPhone,
        userName: pushName,
        funnel: 'funil7',
        waitingFor: 'CONFIRM_SEND_FUNIL7_FULL',
        updatedAt: new Date().toISOString(),
    };
    saveStore(store);
}

async function sendFunil7Phase3(botId, sock, remoteJid, userPhone, pushName, quotedMsg = null) {
    console.log(`[Funil 7 - Alfabetização] 🎁 Enviando Kit Completo (7 PDFs) e PIX para ${pushName} (${userPhone})`);

    const quoteOptions = quotedMsg ? { quoted: quotedMsg } : {};
    await sendRealisticText(botId, sock, remoteJid, userPhone, 'Segue o KIT COMPLETO ABAIXO 👇', quoteOptions);
    await new Promise((r) => setTimeout(r, 1000));

    const fullPdfs = [
        'CAIXA DA LEITURA.pdf',
        'DITADO SILÁBICO GENIOS.pdf',
        'FICHAS PARA LEITURA.pdf',
        'FRASES NO PALITO GENIOS.pdf',
        'FRASES PARA ALFABETIZAÇÃO.pdf',
        'APOSTILA 3 SÍLABAS SIMPLES.pdf',
        'MONTE O CENÁRIO PINGUIM.pdf',
    ];

    for (let i = 0; i < fullPdfs.length; i++) {
        const item = fullPdfs[i];
        const fullPdfPath = path.join(__dirname, 'public', 'funil7', item);
        if (fs.existsSync(fullPdfPath)) {
            try {
                const pdfBuffer = fs.readFileSync(fullPdfPath);
                await sock.sendMessage(remoteJid, {
                    document: pdfBuffer,
                    fileName: item,
                    mimetype: 'application/pdf',
                });
                logConversation(botId, userPhone, 'BOT', 'DOCUMENT', `📄 [PDF ${i + 1}/7]: ${item}`);
                console.log(`[Funil 7] 📄 PDF ${i + 1}/7 enviado: ${item}`);
            } catch (err) {
                console.warn(`[Funil 7 PDF ${item} Error]:`, err?.message);
            }
        }
        await new Promise((r) => setTimeout(r, 1200));
    }

    await sendRealisticText(botId, sock, remoteJid, userPhone, 'Prontinho, te enviei o KIT COMPLETO! 🎉');
    await new Promise((r) => setTimeout(r, 800));

    await sendRealisticText(botId, sock, remoteJid, userPhone, 'Vou enviar nossa chave PIX para facilitar seu pagamento! 😊');
    await new Promise((r) => setTimeout(r, 800));

    const pixCardText = `🔑 Chave PIX:\n📲 TELEFONE: 37999387172\n👤 Editora Branth`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, pixCardText);
    await new Promise((r) => setTimeout(r, 800));

    await sendRealisticText(botId, sock, remoteJid, userPhone, 'O valor é R$ 11,90 se você quiser copiar e colar a chave 👇');
    await new Promise((r) => setTimeout(r, 500));

    const pixKey = '37999387172';
    await sock.sendMessage(remoteJid, { text: pixKey });
    logConversation(botId, userPhone, 'BOT', 'PIX', `Chave PIX: ${pixKey}`);
    await new Promise((r) => setTimeout(r, 800));

    await sendRealisticText(botId, sock, remoteJid, userPhone, 'Fico aguardando o comprovante 🙏');

    const sessionKey = `${botId}:${userPhone}`;
    store.userSessions[sessionKey] = {
        botId,
        userJid: remoteJid,
        userPhone,
        userName: pushName,
        funnel: 'funil7',
        waitingFor: 'PIX_RECEIPT_FUNIL7',
        updatedAt: new Date().toISOString(),
    };
    saveStore(store);

    scheduleFunil7Reminder(botId, remoteJid, userPhone);
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNIL 8: Pet Comilão e 100 Receitas de Alimentação Natural - Fernanda Soares
// (Gatilho: teste8 - Ref: 11 92202-6498)
// ═══════════════════════════════════════════════════════════════════════════════

async function sendFunil8Phase1(botId, sock, remoteJid, userPhone, pushName) {
    console.log(`[Funil 8 - Pet Comilão] 🚀 Iniciando Fase 1 para ${pushName} (${userPhone})`);

    await sendRealisticText(botId, sock, remoteJid, userPhone, 'Oi! Que alegria ter você aqui 🤍');
    await new Promise((r) => setTimeout(r, 800));

    await sendRealisticText(botId, sock, remoteJid, userPhone, 'Se você chegou até aqui, é porque se preocupa de verdade com a saúde do seu doguinho 🐶');
    await new Promise((r) => setTimeout(r, 1000));

    // Áudio 1 PTT (1m10s)
    try { await sock.sendPresenceUpdate('recording', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1500));

    const mp3Path1 = path.join(__dirname, 'public', 'funil8', 'audio_apresentacao.mp3');
    if (fs.existsSync(mp3Path1)) {
        try {
            const mp3Buffer = fs.readFileSync(mp3Path1);
            await sock.sendMessage(remoteJid, {
                audio: mp3Buffer,
                mimetype: 'audio/mpeg',
                ptt: true,
            });
            logConversation(botId, userPhone, 'BOT', 'AUDIO', '🎙️ [Áudio 1 Apresentação Funil 8 MP3 1m10s]');
        } catch (mp3Err) {
            console.warn('[Funil 8 Áudio 1 Error]:', mp3Err?.message);
        }
    }
    try { await sock.sendPresenceUpdate('paused', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1000));

    await sendRealisticText(botId, sock, remoteJid, userPhone, 'Criei o Guia do Pet Comilão, com o passo a passo pra você introduzir a Alimentação Natural e mais 100 Receitas de Alimentação Natural para cães 🐶🐱');
    await new Promise((r) => setTimeout(r, 1000));

    const benefitsText = `Dá uma olhada no que você vai receber 👇\n\n✅ Guia Completo de Alimentação Natural (passo a passo)\n✅ 100 Receitas de Alimentação Natural para Cães\n✅ Lista Semáforo: o que Pode, o que Cuidado e o que Nunca dar\n✅ Material em PDF pronto pra usar direto do celular\n✅ Acesso vitalício\n✅ Suporte direto comigo no WhatsApp`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, benefitsText);
    await new Promise((r) => setTimeout(r, 1000));

    const bonusText = `BÔNUS ⭐️⭐️⭐️\n✅ Calculadora de Porção, a quantidade exata pro peso e porte do seu pet\n\n👉 Tudo isso por uma contribuição simbólica de apenas R$15,00 SOMENTE HOJE!\n\n🐶🤍 Posso te enviar o material completo agora?`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, bonusText);

    const sessionKey = `${botId}:${userPhone}`;
    store.userSessions[sessionKey] = {
        botId,
        userJid: remoteJid,
        userPhone,
        userName: pushName,
        funnel: 'funil8',
        waitingFor: 'CONFIRM_SEND_FUNIL8',
        updatedAt: new Date().toISOString(),
    };
    saveStore(store);
}

async function sendFunil8Phase2(botId, sock, remoteJid, userPhone, pushName, quotedMsg = null) {
    console.log(`[Funil 8 - Pet Comilão] 📦 Enviando 4 PDFs e PIX para ${pushName} (${userPhone})`);

    const quoteOptions = quotedMsg ? { quoted: quotedMsg } : {};
    await sendRealisticText(botId, sock, remoteJid, userPhone, 'Eu faço questão de enviar antes porque acredito muito na honestidade de quem ama de verdade seus pets 🤍', quoteOptions);
    await new Promise((r) => setTimeout(r, 800));

    await sendRealisticText(botId, sock, remoteJid, userPhone, 'Vou te enviar o material agora 👇');
    await new Promise((r) => setTimeout(r, 1000));

    const f8Pdfs = [
        'Guia Pet Comilão - COMO INICIAR.pdf',
        '50 Receitas Cozidas PET COMILÃO.pdf',
        '50 Receitas Cruas - COM E SEM OSSO.pdf',
        'Lista Semafaro PET COMILÃO.pdf',
    ];

    for (let i = 0; i < f8Pdfs.length; i++) {
        const item = f8Pdfs[i];
        const fullPdfPath = path.join(__dirname, 'public', 'funil8', item);
        if (fs.existsSync(fullPdfPath)) {
            try {
                const pdfBuffer = fs.readFileSync(fullPdfPath);
                await sock.sendMessage(remoteJid, {
                    document: pdfBuffer,
                    fileName: item,
                    mimetype: 'application/pdf',
                });
                logConversation(botId, userPhone, 'BOT', 'DOCUMENT', `📄 [PDF ${i + 1}/4]: ${item}`);
                console.log(`[Funil 8] 📄 PDF ${i + 1}/4 enviado: ${item}`);
            } catch (err) {
                console.warn(`[Funil 8 PDF ${item} Error]:`, err?.message);
            }
        }
        await new Promise((r) => setTimeout(r, 1200));
    }

    const contribNotice = `🎁 AGORA QUE VOCÊ JÁ TEM TODO O MATERIAL...\n\nConfio 100% na sua honestidade. ❤️\n\nPor favor, contribua com o valor que seu coração mandar para que ela possa continuar salvando mais pets como o seu:\n\nR$ 15,00 (recomendado)\n🌟 R$19,90 (mais escolhido) 🌟\n💰 R$24,90 - Contribuição abençoada`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, contribNotice);
    await new Promise((r) => setTimeout(r, 1000));

    // Áudio 2 PTT (1m19s)
    try { await sock.sendPresenceUpdate('recording', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1500));

    const mp3Path2 = path.join(__dirname, 'public', 'funil8', 'audio_pix.mp3');
    if (fs.existsSync(mp3Path2)) {
        try {
            const mp3Buffer = fs.readFileSync(mp3Path2);
            await sock.sendMessage(remoteJid, {
                audio: mp3Buffer,
                mimetype: 'audio/mpeg',
                ptt: true,
            });
            logConversation(botId, userPhone, 'BOT', 'AUDIO', '🎙️ [Áudio 2 PIX Funil 8 MP3 1m19s]');
        } catch (mp3Err) {
            console.warn('[Funil 8 Áudio 2 Error]:', mp3Err?.message);
        }
    }
    try { await sock.sendPresenceUpdate('paused', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1000));

    const pixText = `PIX TELEFONE: 11965034611\nNome: Projeto Feliz (KV DIGITAL)\n\nEscolha o valor que toca o seu coração! 💚\n\nAlgumas tutoras mandam até R$50 porque viram a vida dos pets transformar...`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, pixText);
    await new Promise((r) => setTimeout(r, 800));

    await sendRealisticText(botId, sock, remoteJid, userPhone, 'MESMA CHAVE APENAS PARA COPIAR E COLAR 👇');
    await new Promise((r) => setTimeout(r, 500));

    const pixKey = '11965034611';
    await sock.sendMessage(remoteJid, { text: pixKey });
    logConversation(botId, userPhone, 'BOT', 'PIX', `Chave PIX: ${pixKey}`);
    await new Promise((r) => setTimeout(r, 800));

    const interactiveCardPath = path.join(__dirname, 'public', 'funil8', 'interactive_copiar_pix.png');
    if (fs.existsSync(interactiveCardPath)) {
        try {
            const imgBuffer = fs.readFileSync(interactiveCardPath);
            await sock.sendMessage(remoteJid, { image: imgBuffer });
        } catch (e) {}
    }
    await new Promise((r) => setTimeout(r, 800));

    const bonusPromiseText = `Após o pagamento, me envie o comprovante aqui, que eu vou te enviar como BÔNUS:\n\n📲 CALCULADORA DE PORÇÃO pra você saber exatamente quanto dar para o seu pet 🐶`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, bonusPromiseText);

    const sessionKey = `${botId}:${userPhone}`;
    store.userSessions[sessionKey] = {
        botId,
        userJid: remoteJid,
        userPhone,
        userName: pushName,
        funnel: 'funil8',
        waitingFor: 'PIX_RECEIPT_FUNIL8',
        updatedAt: new Date().toISOString(),
    };
    saveStore(store);

    scheduleFunil8Reminder(botId, remoteJid, userPhone);
}

async function handleIncomingMessage(botId, sock, msg) {
    if (!msg.message || msg.key.fromMe) return;

    const remoteJid = msg.key.remoteJid || '';
    if (!remoteJid || remoteJid === 'status@broadcast' || remoteJid.endsWith('@g.us') || remoteJid.endsWith('@newsletter')) {
        return;
    }

    if (msg.message.reactionMessage) {
        // Usuário apenas reagiu a uma mensagem nossa, não processa
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
    const hasAudio = !!msg.message.audioMessage;
    const hasSticker = !!msg.message.stickerMessage;

    console.log(`[Funil X1] 📩 Mensagem de ${pushName} (${userPhone}): "${textContent || (hasMediaReceipt ? '[COMPROVANTE]' : hasAudio ? '[AUDIO]' : hasSticker ? '[FIGURINHA]' : '')}"`);

    logConversation(
        botId,
        userPhone,
        'USER',
        hasImage ? 'IMAGE' : hasDocument ? 'DOCUMENT' : hasAudio ? 'AUDIO' : hasSticker ? 'STICKER' : 'TEXT',
        textContent || (hasMediaReceipt ? '[Comprovante Enviado]' : hasAudio ? '[Áudio Enviado]' : hasSticker ? '[Figurinha]' : '[Mensagem]'),
        pushName
    );

    const sessionKey = `${botId}:${userPhone}`;
    let session = store.userSessions[sessionKey];

    // Capturar contexto de anúncio (CTWA ou tags dinâmicas no texto)
    const detectedAd = extractAdContext(msg, textContent);
    if (detectedAd) {
        if (!session) {
            session = {
                botId,
                userJid: remoteJid,
                userPhone,
                userName: pushName,
                adData: detectedAd,
                updatedAt: new Date().toISOString()
            };
            store.userSessions[sessionKey] = session;
        } else {
            session.adData = { ...(session.adData || {}), ...detectedAd };
        }
        console.log(`[Atribuição Meta Ads] 🎯 Detectado anúncio para ${userPhone}:`, session.adData);
    }

    const normalizedText = textContent.trim().toLowerCase();

    // ─── Sistema Universal de Reações Humanizadas para TODOS os Funis (Atuais e Futuros) ───
    const isNegative = ['não', 'nao', 'agora não', 'agora nao', 'depois', 'nop', 'cancelar', 'não quero', 'nao quero'].some(w => normalizedText === w || normalizedText.startsWith(w + ' '));
    const autoEmoji = hasMediaReceipt ? '❤️' : (hasAudio ? '👍' : (hasSticker ? '❤️' : getHumanReactionEmoji(textContent, isNegative)));
    
    // Dispara a reação humanizada imediatamente na mensagem do lead
    reactToMessage(sock, remoteJid, msg.key, autoEmoji).catch(() => {});

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
    const isTest11 = ['teste11', 'teste 11', '#teste11', '!teste11', '/teste11'].some(k => normalizedText === k || normalizedText.startsWith(k + ' '));
    const isTest12 = ['teste12', 'teste 12', '#teste12', '!teste12', '/teste12'].some(k => normalizedText === k || normalizedText.startsWith(k + ' '));
    const isTest13 = ['teste13', 'teste 13', '#teste13', '!teste13', '/teste13'].some(k => normalizedText === k || normalizedText.startsWith(k + ' '));

    const cancelAllTimers = () => {
        cancelParabolasReminder(botId, userPhone);
        cancelFunil2Reminder(botId, userPhone);
        cancelFunil3Reminder(botId, userPhone);
        cancelFunil4Reminder(botId, userPhone);
        cancelFunil5Reminder(botId, userPhone);
        cancelFunil6Reminder(botId, userPhone);
        cancelFunil7Reminder(botId, userPhone);
        cancelFunil8Reminder(botId, userPhone);
        cancelFunil9Reminder(botId, userPhone);
        cancelFunil10Reminder(botId, userPhone);
        cancelFunil11Reminder(botId, userPhone);
        cancelFunil12Reminder(botId, userPhone);
        cancelFunil13Reminder(botId, userPhone);
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

    // DISPARO FUNIL 2: Guia de Cuidados com Pessoa Acamada (82 9685-7184)
    if (isTest2) {
        console.log(`[Funil 2 - Acamados] 🚀 Disparo de TESTE 2 recebido de ${pushName} (${userPhone})`);
        cancelAllTimers();
        session = null;
        delete store.userSessions[sessionKey];
        saveStore(store);
        await sendFunil2Phase1(botId, sock, remoteJid, userPhone, pushName);
        return;
    }

    // DISPARO FUNIL 3: 500 Esboços de Pregações - Missionária Raquel (11 96359-2672)
    if (isTest3) {
        console.log(`[Funil 3 - Esboços] 🚀 Disparo de TESTE 3 recebido de ${pushName} (${userPhone})`);
        cancelAllTimers();
        session = null;
        delete store.userSessions[sessionKey];
        saveStore(store);
        await sendFunil3Phase1(botId, sock, remoteJid, userPhone, pushName);
        return;
    }

    // DISPARO FUNIL 4: Jornada da Bíblia - João Antônio (82 99689-8259)
    if (isTest4) {
        console.log(`[Funil 4 - Jornada Bíblia] 🚀 Disparo de TESTE 4 recebido de ${pushName} (${userPhone})`);
        cancelAllTimers();
        session = null;
        delete store.userSessions[sessionKey];
        saveStore(store);
        await sendFunil4Phase1(botId, sock, remoteJid, userPhone, pushName);
        return;
    }

    // DISPARO FUNIL 5: Acervo 5.000+ Sermões - Vitor (17 98117-5202)
    if (isTest5) {
        console.log(`[Funil 5 - Acervo Sermões] 🚀 Disparo de TESTE 5 recebido de ${pushName} (${userPhone})`);
        cancelAllTimers();
        session = null;
        delete store.userSessions[sessionKey];
        saveStore(store);
        await sendFunil5Phase1(botId, sock, remoteJid, userPhone, pushName);
        return;
    }

    // DISPARO FUNIL 6: Devocional Pelos Filhos - Missionária Flávia (12 98308-5720)
    if (isTest6) {
        console.log(`[Funil 6 - Devocional] 🚀 Disparo de TESTE 6 recebido de ${pushName} (${userPhone})`);
        cancelAllTimers();
        session = null;
        delete store.userSessions[sessionKey];
        saveStore(store);
        await sendFunil6Phase1(botId, sock, remoteJid, userPhone, pushName);
        return;
    }

    // DISPARO FUNIL 7: Construtor de Palavras e Alfabetização Infantil (37 99938-7172)
    if (isTest7) {
        console.log(`[Funil 7 - Alfabetização] 🚀 Disparo de TESTE 7 recebido de ${pushName} (${userPhone})`);
        cancelAllTimers();
        session = null;
        delete store.userSessions[sessionKey];
        saveStore(store);
        await sendFunil7Phase1(botId, sock, remoteJid, userPhone, pushName);
        return;
    }

    // DISPARO FUNIL 8: Pet Comilão - Fernanda Soares (11 92202-6498)
    if (isTest8) {
        console.log(`[Funil 8 - Pet Comilão] 🚀 Disparo de TESTE 8 recebido de ${pushName} (${userPhone})`);
        cancelAllTimers();
        session = null;
        delete store.userSessions[sessionKey];
        saveStore(store);
        await sendFunil8Phase1(botId, sock, remoteJid, userPhone, pushName);
        return;
    }

        // DISPARO FUNIL 9: Junior Limpeza (42 99994-4139)
    if (isTest9) {
        console.log(`[Funil 9 - Junior Limpeza] 🚀 Disparo de TESTE 9 recebido de ${pushName} (${userPhone})`);
        cancelAllTimers();
        session = null;
        delete store.userSessions[sessionKey];
        saveStore(store);
        await sendFunil9Phase1(botId, sock, remoteJid, userPhone, pushName);
        return;
    }

    // DISPARO FUNIL 10: Bolsas Lucrativas - Thaíse Costura (71 99228-7791)
    if (isTest10) {
        console.log(`[Funil 10 - Thaíse Costura] 🚀 Disparo de TESTE 10 recebido de ${pushName} (${userPhone})`);
        cancelAllTimers();
        session = null;
        delete store.userSessions[sessionKey];
        saveStore(store);
        await sendFunil10Phase1(botId, sock, remoteJid, userPhone, pushName);
        return;
    }

    // DISPARO FUNIL 11: Projeto Mente Viva - Selma (31 97536-2565)
    if (isTest11) {
        console.log(`[Funil 11 - Selma Mente Viva] 🚀 Disparo de TESTE 11 recebido de ${pushName} (${userPhone})`);
        cancelAllTimers();
        session = null;
        delete store.userSessions[sessionKey];
        saveStore(store);
        await sendFunil11Phase1(botId, sock, remoteJid, userPhone, pushName);
        return;
    }

    // DISPARO FUNIL 12: Cardápio Adventista - Déb (71 99366-7052)
    if (isTest12) {
        console.log(`[Funil 12 - Déb Cardápio Adventista] 🚀 Disparo de TESTE 12 recebido de ${pushName} (${userPhone})`);
        cancelAllTimers();
        session = null;
        delete store.userSessions[sessionKey];
        saveStore(store);
        await sendFunil12Phase1(botId, sock, remoteJid, userPhone, pushName);
        return;
    }

    // DISPARO FUNIL 13: Devocional Pelos Filhos - Missionária Maria (33 99982-6417)
    if (isTest13) {
        console.log(`[Funil 13 - Missionária Maria] 🚀 Disparo de TESTE 13 recebido de ${pushName} (${userPhone})`);
        cancelAllTimers();
        session = null;
        delete store.userSessions[sessionKey];
        saveStore(store);
        await sendFunil13Phase1(botId, sock, remoteJid, userPhone, pushName);
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

    // Funil 5: Acervo Sermões (Vitor)
    if (session.waitingFor === 'CONFIRM_SEND_FUNIL5') {
        const isNegative = ['não', 'nao', 'agora não', 'agora nao', 'depois', 'nop', 'cancelar'].includes(normalizedText);
        if (isNegative) {
            await sendRealisticText(botId, sock, remoteJid, userPhone, 'Sem problemas, meu irmão! Se desejar os sermões futuramente, é só me chamar por aqui. A Paz do Senhor Jesus! 🙏');
            session.waitingFor = null;
            saveStore(store);
            return;
        }
        const emoji = getHumanReactionEmoji(textContent);
        await reactToMessage(sock, remoteJid, msg.key, emoji);
        await sendFunil5Phase2(botId, sock, remoteJid, userPhone, pushName, msg);
        return;
    }

    // Funil 6: Pergunta do Nome do Filho (Missionária Flávia)
    if (session.waitingFor === 'FILHO_NAME_FUNIL6') {
        const emoji = getHumanReactionEmoji(textContent);
        await reactToMessage(sock, remoteJid, msg.key, emoji);
        await sendFunil6AfterChildName(botId, sock, remoteJid, userPhone, pushName, msg);
        return;
    }

    // Funil 6: Confirmação de Envio do Devocional
    if (session.waitingFor === 'CONFIRM_SEND_FUNIL6') {
        const isNegative = ['não', 'nao', 'agora não', 'agora nao', 'depois', 'nop', 'cancelar'].includes(normalizedText);
        if (isNegative) {
            await sendRealisticText(botId, sock, remoteJid, userPhone, 'Tudo bem, minha irmã! Continuarei orando pela sua família. Quando desejar o devocional, estarei por aqui! 🙏❤️');
            session.waitingFor = null;
            saveStore(store);
            return;
        }
        const emoji = getHumanReactionEmoji(textContent);
        await reactToMessage(sock, remoteJid, msg.key, emoji);
        await sendFunil6Phase2(botId, sock, remoteJid, userPhone, pushName, msg);
        return;
    }

    // Funil 7: Confirmação de Amostra Grátis
    if (session.waitingFor === 'CONFIRM_SEND_FUNIL7_FREE') {
        const isNegative = ['não', 'nao', 'agora não', 'agora nao', 'depois', 'nop', 'cancelar'].includes(normalizedText);
        if (isNegative) {
            await sendRealisticText(botId, sock, remoteJid, userPhone, 'Tudo bem! Se precisar de atividades educativas para as crianças no futuro, é só me chamar por aqui! 😊');
            session.waitingFor = null;
            saveStore(store);
            return;
        }
        const emoji = getHumanReactionEmoji(textContent);
        await reactToMessage(sock, remoteJid, msg.key, emoji);
        await sendFunil7Phase2(botId, sock, remoteJid, userPhone, pushName, msg);
        return;
    }

    // Funil 7: Confirmação do Kit Completo
    if (session.waitingFor === 'CONFIRM_SEND_FUNIL7_FULL') {
        const isNegative = ['não', 'nao', 'agora não', 'agora nao', 'depois', 'nop', 'cancelar'].includes(normalizedText);
        if (isNegative) {
            await sendRealisticText(botId, sock, remoteJid, userPhone, 'Sem problemas! Aproveite bastante o Construtor de Palavras gratuito! Qualquer dúvida estou à disposição! 🌟');
            session.waitingFor = null;
            saveStore(store);
            return;
        }
        const emoji = getHumanReactionEmoji(textContent);
        await reactToMessage(sock, remoteJid, msg.key, emoji);
        await sendFunil7Phase3(botId, sock, remoteJid, userPhone, pushName, msg);
        return;
    }

    // Funil 8: Confirmação de Envio do Kit Pet Comilão
    if (session.waitingFor === 'CONFIRM_SEND_FUNIL8') {
        const isNegative = ['não', 'nao', 'agora não', 'agora nao', 'depois', 'nop', 'cancelar'].includes(normalizedText);
        if (isNegative) {
            await sendRealisticText(botId, sock, remoteJid, userPhone, 'Tudo bem! Muita saúde para o seu pet e quando quiser introduzir a alimentação natural, estarei por aqui! 🐶🤍');
            session.waitingFor = null;
            saveStore(store);
            return;
        }
        const emoji = getHumanReactionEmoji(textContent);
        await reactToMessage(sock, remoteJid, msg.key, emoji);
        await sendFunil8Phase2(botId, sock, remoteJid, userPhone, pushName, msg);
        return;
    }

    // Funil 10: Confirmação Inicial Thaíse Costura
    if (session.waitingFor === 'CONFIRM_SEND_FUNIL10') {
        const emoji = getHumanReactionEmoji(textContent);
        await reactToMessage(sock, remoteJid, msg.key, emoji);
        await sendFunil10Phase2(botId, sock, remoteJid, userPhone, pushName, msg);
        return;
    }

    // Funil 10: Confirmação Envio Moldes Thaíse
    if (session.waitingFor === 'CONFIRM_SEND_MOLDES_FUNIL10') {
        const emoji = getHumanReactionEmoji(textContent);
        await reactToMessage(sock, remoteJid, msg.key, emoji);
        await sendFunil10Phase3(botId, sock, remoteJid, userPhone, pushName, msg);
        return;
    }

    // Funil 11: Confirmação Envio Selma Mente Viva
    if (session.waitingFor === 'CONFIRM_SEND_FUNIL11') {
        const emoji = getHumanReactionEmoji(textContent);
        await reactToMessage(sock, remoteJid, msg.key, emoji);
        await sendFunil11Phase2(botId, sock, remoteJid, userPhone, pushName, msg);
        return;
    }

    // Funil 12: Confirmação Explicação Déb Cardápio
    if (session.waitingFor === 'CONFIRM_INFO_FUNIL12') {
        const emoji = getHumanReactionEmoji(textContent);
        await reactToMessage(sock, remoteJid, msg.key, emoji);
        await sendFunil12Phase2(botId, sock, remoteJid, userPhone, pushName, msg);
        return;
    }

    // Funil 12: Confirmação Envio PDFs Déb Cardápio
    if (session.waitingFor === 'CONFIRM_SEND_FUNIL12') {
        const emoji = getHumanReactionEmoji(textContent);
        await reactToMessage(sock, remoteJid, msg.key, emoji);
        await sendFunil12Phase3(botId, sock, remoteJid, userPhone, pushName, msg);
        return;
    }

    // Funil 13: Nome do Filho Missionária Maria
    if (session.waitingFor === 'FILHO_NAME_FUNIL13') {
        const emoji = getHumanReactionEmoji(textContent);
        await reactToMessage(sock, remoteJid, msg.key, emoji);
        await sendFunil13AfterChildName(botId, sock, remoteJid, userPhone, pushName, msg);
        return;
    }

    // Funil 13: Confirmação Envio Missionária Maria
    if (session.waitingFor === 'CONFIRM_SEND_FUNIL13') {
        const emoji = getHumanReactionEmoji(textContent);
        await reactToMessage(sock, remoteJid, msg.key, emoji);
        await sendFunil13Phase2(botId, sock, remoteJid, userPhone, pushName, msg);
        return;
    }

    // ─── Respostas de Comprovante de Pagamento (PIX) ───
    const waitingReceiptFunnels = [
        'PIX_RECEIPT',
        'PIX_RECEIPT_FUNIL2',
        'PIX_RECEIPT_FUNIL3',
        'PIX_RECEIPT_FUNIL4',
        'PIX_RECEIPT_FUNIL5',
        'PIX_RECEIPT_FUNIL6',
        'PIX_RECEIPT_FUNIL7',
        'PIX_RECEIPT_FUNIL8',
        'PIX_RECEIPT_FUNIL9',
        'PIX_RECEIPT_FUNIL10',
        'PIX_RECEIPT_FUNIL11',
        'PIX_RECEIPT_FUNIL12',
        'PIX_RECEIPT_FUNIL13'
    ];

    if (waitingReceiptFunnels.includes(session.waitingFor)) {
        if (!hasMediaReceipt) {
            const emoji = getHumanReactionEmoji(textContent);
            await reactToMessage(sock, remoteJid, msg.key, emoji);

            // Resposta carinhosa personalizada da Missionária Raquel (Funil 3 - Print 13:50)
            if (session.waitingFor === 'PIX_RECEIPT_FUNIL3' && ['amem', 'amém', 'ok', 'sim', 'certo', 'ta bom', 'tá bom'].some(w => normalizedText.includes(w))) {
                await sendRealisticText(botId, sock, remoteJid, userPhone, 'Ok irmã! 🙏💙', { quoted: msg });
                return;
            }

            // Resposta carinhosa da Fernanda Soares (Funil 8 - Print 03:21)
            if (session.waitingFor === 'PIX_RECEIPT_FUNIL8' && ['amem', 'amém', 'ok', 'sim', 'certo', 'ta bom', 'tá bom', 'obrigado', 'obrigada'].some(w => normalizedText.includes(w))) {
                await sendRealisticText(botId, sock, remoteJid, userPhone, 'Fico muito feliz de verdade em saber disso 💚🐶\nQualquer dúvida é só me chamar 🙏', { quoted: msg });
                return;
            }

            // Respostas da Selma (Funil 11 - Projeto Mente Viva)
            if (session.waitingFor === 'PIX_RECEIPT_FUNIL11') {
                if (['lendo', 'ler', 'estou lendo'].some(w => normalizedText.includes(w))) {
                    await sendRealisticText(botId, sock, remoteJid, userPhone, 'Que bom que está lendo 😊 Quando chegar à página 28, faça a lista do mercado e depois me conte quantos itens lembrou.', { quoted: msg });
                    return;
                }
                if (['amem', 'amém', 'creio', 'sim'].some(w => normalizedText.includes(w))) {
                    await sendRealisticText(botId, sock, remoteJid, userPhone, 'Amém, Deus abençoe você também 🙏 Já deu pra fazer a lista do mercado, na página 28?', { quoted: msg });
                    return;
                }
            }

            // Resposta carinhosa de Déb (Funil 12 - Cardápio Adventista)
            if (session.waitingFor === 'PIX_RECEIPT_FUNIL12' && ['amem', 'amém', 'manda', 'sim', 'ok'].some(w => normalizedText.includes(w))) {
                await sendRealisticText(botId, sock, remoteJid, userPhone, 'Amém, minha irmã 🤍 Quando você puder, faz a contribuição no Pix e me manda o comprovante aqui, pode ser print mesmo. Aí eu confirmo e te envio os 2 bônus certinho.', { quoted: msg });
                return;
            }

            // Resposta carinhosa da Thaíse Costura (Funil 10)
            if (session.waitingFor === 'PIX_RECEIPT_FUNIL10' && ['amem', 'amém', 'ok', 'sim'].some(w => normalizedText.includes(w))) {
                await sendRealisticText(botId, sock, remoteJid, userPhone, 'Fico no aguardo, assim que puder me envie o comprovante, já separei seu presente aqui ❤️🙏', { quoted: msg });
                return;
            }

            // Para mensagens de confirmação/agradecimento ('amem', 'sim', 'ok', 'calma', etc.), apenas a reação já foi feita, sem spam de mensagem repetitiva
            const isAck = ['amem', 'amém', 'sim', 'ok', 'ta bom', 'tá bom', 'certo', 'calma', 'obrigado', 'obrigada', 'deus abençoe', 'vou pagar', 'pago já', 'pode deixar'].some(w => normalizedText.includes(w));
            if (isAck) {
                return;
            }

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
        } else if (session.waitingFor === 'PIX_RECEIPT_FUNIL5') {
            expectedAmount = 19.90;
            beneficiary = 'Vitor Bueno de Carvalho';
            funnelName = 'Acervo 5.000+ Sermões Prontos';
            cancelFunil5Reminder(botId, userPhone);
        } else if (session.waitingFor === 'PIX_RECEIPT_FUNIL6') {
            expectedAmount = 5.00; // qualquer contribuição voluntária
            beneficiary = 'DIGITAL DSX LTDA';
            funnelName = 'Devocional Pelos Filhos';
            cancelFunil6Reminder(botId, userPhone);
        } else if (session.waitingFor === 'PIX_RECEIPT_FUNIL7') {
            expectedAmount = 11.90;
            beneficiary = 'Editora Branth';
            funnelName = 'Construtor de Palavras e Alfabetização';
            cancelFunil7Reminder(botId, userPhone);
        } else if (session.waitingFor === 'PIX_RECEIPT_FUNIL8') {
            expectedAmount = 15.00;
            beneficiary = 'KV DIGITAL';
            funnelName = 'Guia Pet Comilão';
            cancelFunil8Reminder(botId, userPhone);
        } else if (session.waitingFor === 'PIX_RECEIPT_FUNIL9') {
            expectedAmount = 25.00;
            beneficiary = 'Junior Campos dos Santos';
            funnelName = 'Receitas Produtos de Limpeza';
            cancelFunil9Reminder(botId, userPhone);
        } else if (session.waitingFor === 'PIX_RECEIPT_FUNIL10') {
            expectedAmount = 14.90;
            beneficiary = 'THAISE OLIVEIRA LIMA';
            funnelName = 'Bolsas Lucrativas - 200 Moldes';
            cancelFunil10Reminder(botId, userPhone);
        } else if (session.waitingFor === 'PIX_RECEIPT_FUNIL11') {
            expectedAmount = 20.00;
            beneficiary = 'Projeto Viva Luz';
            funnelName = 'Projeto Mente Viva';
            cancelFunil11Reminder(botId, userPhone);
        } else if (session.waitingFor === 'PIX_RECEIPT_FUNIL12') {
            expectedAmount = 19.90;
            beneficiary = 'RP Empreendimentos';
            funnelName = 'Cardápio Adventista';
            cancelFunil12Reminder(botId, userPhone);
        } else if (session.waitingFor === 'PIX_RECEIPT_FUNIL13') {
            expectedAmount = 5.00;
            beneficiary = 'DAYZA LTDA';
            funnelName = 'Devocional Pelos Filhos - Maria';
            cancelFunil13Reminder(botId, userPhone);
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

            // ─── Registro Oficial de Transação & Disparo Meta CAPI + FaceHub ───
            const txId = 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
            const now = new Date();
            const transactionRecord = {
                id: txId,
                timestamp: now.toISOString(),
                timeFormatted: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                dateFormatted: now.toLocaleDateString('pt-BR'),
                botId,
                funnelId: session.funnel || 'funil1',
                funnelName,
                amount: paidValue,
                beneficiary,
                userPhone,
                pushName,
                campaignId: session.adData?.campaignId || null,
                adId: session.adData?.adId || null,
                adTag: session.adData?.rawTag || null,
                isCtwa: !!session.adData?.isCtwa,
                ctwaClid: session.adData?.ctwaClid || null,
                status: 'APROVADO_PIX',
                capiStatus: 'PENDING'
            };

            // Disparar Meta Conversions API (CAPI)
            try {
                const capiRes = await sendMetaCapiConversion(transactionRecord);
                transactionRecord.capiStatus = capiRes.success ? 'ENVIADO_CAPI_OK' : (capiRes.skipped ? 'CAPI_CONFIG_PENDENTE' : 'ERRO_CAPI: ' + capiRes.error);
            } catch (capiErr) {
                transactionRecord.capiStatus = 'ERRO_CAPI: ' + capiErr.message;
            }

            store.funnelTransactions = store.funnelTransactions || [];
            store.funnelTransactions.unshift(transactionRecord);
            if (store.funnelTransactions.length > 500) store.funnelTransactions.pop();

            // Notificar Webhook FaceHub se configurado
            notifyFaceHubWebhook(transactionRecord).catch(() => {});

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

            if (session.funnel === 'funil7') {
                const bonusText = `🎁 *Acesso Completo ao Kit Construtor de Palavras e Alfabetização Confirmado!*\n\nTodos os 8 materiais já estão disponíveis na sua conversa para você consultar e imprimir sempre que quiser. Que este material faça uma grande diferença no aprendizado das crianças! 🌟📚`;
                await sendRealisticText(botId, sock, remoteJid, userPhone, bonusText);
            } else if (session.funnel === 'funil8') {
                const bonusText = `🎁 *BÔNUS LIBERADO: CALCULADORA DE PORÇÃO PET*\n\nAqui está o seu bônus especial conforme prometido! Muito obrigada pelo carinho e pela sua contribuição com o projeto! Que seu doguinho tenha muita saúde com a alimentação natural! 🐶💚`;
                await sendRealisticText(botId, sock, remoteJid, userPhone, bonusText);
            } else if (session.funnel === 'funil9') {
                const bonusText = `🎁 *Acesso Completo às Receitas de Produtos de Limpeza Confirmado!*\n\nMuito obrigado pela sua honestidade e contribuição de coração! Que essas receitas te ajudem muito! 🙏❤️`;
                await sendRealisticText(botId, sock, remoteJid, userPhone, bonusText);
            } else if (session.funnel === 'funil10') {
                const bonusText = `🎁 *BÔNUS LIBERADO: CERTIFICADO + MOLDES EXTRAS*\n\nSeu certificado com assinatura e todos os moldes extras e videoaulas já estão 100% liberados no aplicativo:\nhttps://bolsas-lucrativas.vercel.app/\n\nMuito sucesso na sua jornada na costura! 🏆✨`;
                await sendRealisticText(botId, sock, remoteJid, userPhone, bonusText);
            } else if (session.funnel === 'funil11') {
                const bonusText = `🎁 *BÔNUS LIBERADO: APP MENTE VIVA + ATIVIDADES EXTRAS*\n\nSeu acesso ao App Mente Viva e aos bônus extras de alongamento e mente ativa já estão liberados! Que façam uma diferença linda no seu dia a dia! 🧘💛`;
                await sendRealisticText(botId, sock, remoteJid, userPhone, bonusText);
            } else if (session.funnel === 'funil12') {
                const bonusText = `🎁 *BÔNUS LIBERADOS: PRINCÍPIOS DE SAÚDE*\n\nAqui estão seus 2 bônus conforme combinamos:\n✅ Bônus 01: Lista Inteligente de Compras\n✅ Bônus 02: Guia Alimentar dos Princípios de Ellen White\n\nQue Deus abençoe você e sua família poderosamente! 🥗🥑`;
                await sendRealisticText(botId, sock, remoteJid, userPhone, bonusText);
            } else if (session.funnel === 'funil13') {
                const bonusText = `🎁 *Altar de Oração Pelos Filhos*\n\nJá coloquei o nome do seu filho e de sua família em nosso altar de oração 🙏❤️ Em breve quero ouvir o seu milagre e testemunho!`;
                await sendRealisticText(botId, sock, remoteJid, userPhone, bonusText);
            } else if (session.funnel === 'funil5') {
                const bonusText = `🎁 *Seu acesso ao Acervo de Sermões e Bônus está 100% vitalício e garantido!*\n\nParticipe do nosso grupo de atualizações:\nhttps://chat.whatsapp.com/DDrnWQKV5vTB2UAYyQj3M2\n\nQue a Palavra de Deus prospere grandemente no seu ministério! 🙏📖`;
                await sendRealisticText(botId, sock, remoteJid, userPhone, bonusText);
            } else if (session.funnel === 'funil6') {
                const bonusText = `🎁 *Você já está participando do sorteio da Caixa Devocional!*\n\nEm breve entraremos em contato com as contempladas. Que o Senhor traga restauração e bênçãos sobre a vida dos seus filhos! ❤️🙏`;
                await sendRealisticText(botId, sock, remoteJid, userPhone, bonusText);
            } else if (session.funnel === 'funil3') {
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

// ─── ROTAS DE INTEGRAÇÃO COM O FACEHUB (META ADS MULTI-CONTAS) ───
app.get('/api/funnels', (_req, res) => {
    // Mesclar catálogo estático com estatísticas em tempo real
    const stats = store.funnelStats || {};
    const funnelsWithStats = FUNNELS_CATALOG.map(f => {
        const txs = (store.funnelTransactions || []).filter(t => t.funnelId === f.id);
        const sales = txs.length;
        const revenue = txs.reduce((acc, cur) => acc + (cur.amount || 0), 0);
        return {
            ...f,
            sales,
            revenue: Number(revenue.toFixed(2))
        };
    });
    res.json({ success: true, count: funnelsWithStats.length, funnels: funnelsWithStats });
});

app.get('/api/funnels/transactions', (req, res) => {
    const limit = parseInt(req.query.limit || '50', 10);
    const funnelId = req.query.funnelId;
    let list = store.funnelTransactions || [];
    if (funnelId) {
        list = list.filter(t => t.funnelId === funnelId);
    }
    res.json({
        success: true,
        count: list.length,
        transactions: list.slice(0, limit)
    });
});

app.get('/api/funnels/metrics', (_req, res) => {
    const txs = store.funnelTransactions || [];
    const totalRevenue = txs.reduce((acc, cur) => acc + (cur.amount || 0), 0);
    const totalSales = txs.length;
    const capiSuccess = txs.filter(t => t.capiStatus === 'ENVIADO_CAPI_OK').length;
    
    // Agrupamento por campanha
    const campaignMap = {};
    txs.forEach(t => {
        const campKey = t.campaignId || 'Orgânico / Sem Tag';
        if (!campaignMap[campKey]) {
            campaignMap[campKey] = { campaignId: campKey, sales: 0, revenue: 0, funnels: {} };
        }
        campaignMap[campKey].sales += 1;
        campaignMap[campKey].revenue += (t.amount || 0);
        campaignMap[campKey].funnels[t.funnelName] = (campaignMap[campKey].funnels[t.funnelName] || 0) + 1;
    });

    res.json({
        success: true,
        metrics: {
            totalSales,
            totalRevenue: Number(totalRevenue.toFixed(2)),
            capiSuccess,
            campaignsTracked: Object.values(campaignMap)
        }
    });
});

app.get('/api/meta/config', (_req, res) => {
    const cfg = store.metaConfig || {};
    res.json({
        success: true,
        pixelId: cfg.pixelId || process.env.META_PIXEL_ID || null,
        hasAccessToken: Boolean(cfg.accessToken || process.env.META_ACCESS_TOKEN),
        facehubWebhookUrl: cfg.facehubWebhookUrl || process.env.FACEHUB_WEBHOOK_URL || null
    });
});

app.post('/api/meta/config', (req, res) => {
    const { pixelId, accessToken, facehubWebhookUrl } = req.body || {};
    store.metaConfig = store.metaConfig || {};
    if (pixelId !== undefined) store.metaConfig.pixelId = pixelId;
    if (accessToken !== undefined) store.metaConfig.accessToken = accessToken;
    if (facehubWebhookUrl !== undefined) store.metaConfig.facehubWebhookUrl = facehubWebhookUrl;
    saveStore(store);
    res.json({ success: true, message: 'Configurações da Meta salvas com sucesso!' });
});

app.post('/api/funnels/simulate-pix', async (req, res) => {
    try {
        const { funnelId, amount, phone, name, campaignId, adId } = req.body || {};
        const funnel = FUNNELS_CATALOG.find(f => f.id === funnelId) || FUNNELS_CATALOG[0];
        const paidValue = Number(amount || funnel.expectedAmount);
        const txId = 'tx_sim_' + Date.now();
        const now = new Date();

        const transactionRecord = {
            id: txId,
            timestamp: now.toISOString(),
            timeFormatted: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            dateFormatted: now.toLocaleDateString('pt-BR'),
            botId: 'bot_whatsapp_principal',
            funnelId: funnel.id,
            funnelName: funnel.name,
            amount: paidValue,
            beneficiary: funnel.beneficiary,
            userPhone: phone || '5511999999999',
            pushName: name || 'Lead Simulado FaceHub',
            campaignId: campaignId || '1202084910284',
            adId: adId || '1202084910285',
            adTag: `ref_${campaignId || '1202084910284'}_${adId || '1202084910285'}`,
            isCtwa: true,
            status: 'APROVADO_PIX',
            capiStatus: 'PENDING'
        };

        const capiRes = await sendMetaCapiConversion(transactionRecord);
        transactionRecord.capiStatus = capiRes.success ? 'ENVIADO_CAPI_OK' : (capiRes.skipped ? 'CAPI_CONFIG_PENDENTE' : 'ERRO_CAPI: ' + capiRes.error);

        store.funnelTransactions = store.funnelTransactions || [];
        store.funnelTransactions.unshift(transactionRecord);
        store.funnelStats.convertedCount = (store.funnelStats.convertedCount || 0) + 1;
        store.funnelStats.totalRevenue = Number(((store.funnelStats.totalRevenue || 0) + paidValue).toFixed(2));
        saveStore(store);

        notifyFaceHubWebhook(transactionRecord).catch(() => {});

        res.json({ success: true, transaction: transactionRecord });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

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
