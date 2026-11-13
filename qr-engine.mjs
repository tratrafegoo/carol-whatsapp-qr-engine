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
const generateMessageIDV2 = baileysPkg.generateMessageIDV2 || baileysPkg.default?.generateMessageIDV2;
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
        name: 'Jornada da Bíblia (Pastor Guilherme)',
        trigger: 'teste4',
        expectedAmount: 20.00,
        beneficiary: 'Pastor Guilherme',
        whatsappPhone: '551152291989',
        defaultMessage: 'Olá Pastor Guilherme! Gostaria de receber a Jornada da Bíblia [ref_{{campaign.id}}_{{ad.id}}]'
    },
    {
        id: 'funil5',
        name: 'Acervo 5.000+ Sermões Prontos (Igreja Ensino da Palavra)',
        trigger: 'teste5',
        expectedAmount: 19.90,
        beneficiary: 'Vitor Bueno de Carvalho',
        whatsappPhone: '551152291989',
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

// ─── UTILITÁRIOS DE TELEFONE REAL VS @LID E NORMALIZAÇÃO META ───
const DEFAULT_META_PAGE_ID = '1046083835265089';

function getMetaAccessToken(preferEnvOnly = false) {
    const envOrStore = process.env.META_ACCESS_TOKEN || store.metaConfig?.accessToken;
    if (envOrStore) return envOrStore;
    if (preferEnvOnly) return '';
    return 'EAAUO1JVtzLgBS9gj3E8dtMiX2KkICYQyjZAUuy0SJJmzWPZCZABlSDFUllmoDfB5h1lt7xHJ3ifoY5jOMuLRKG9Bkq7Ulw9V3vOG3PgXEWqZByjMrv1ZCozA2hnjKCWyjlcHAsm4hxzFZCptbgtD3WbzZBxzg8ZBWncHbjBVjOdRON9xfxhX9EoYMQj0Yf7XbG3FDQZDZD';
}

function isPlausibleRealPhone(digits, jidHint = '') {
    if (jidHint && String(jidHint).endsWith('@lid')) return false;
    const clean = String(digits || '').replace(/\D/g, '');
    if (!clean || /^0+$/.test(clean)) return false;
    // @lid IDs no WhatsApp têm tipicamente 14-15+ dígitos arbitrários; telefones BR com DDI 55 têm 12 ou 13 dígitos
    if (clean.startsWith('55')) {
        return clean.length === 12 || clean.length === 13;
    }
    if (jidHint && String(jidHint).endsWith('@s.whatsapp.net')) {
        return clean.length >= 10 && clean.length <= 15;
    }
    return clean.length >= 10 && clean.length <= 13;
}

function sha256Hex(value) {
    return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function normalizeMetaPersonNamePart(rawPart) {
    if (!rawPart) return '';
    return String(rawPart)
        .trim()
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]/gu, '');
}

function splitMetaCustomerName(pushName) {
    const raw = String(pushName || '').trim();
    if (!raw || raw === '-' || ['cliente', 'lead', 'visitante'].includes(raw.toLowerCase())) {
        return { fn: '', ln: '' };
    }
    const tokens = raw.split(/\s+/).map(normalizeMetaPersonNamePart).filter(Boolean);
    if (tokens.length === 0) return { fn: '', ln: '' };
    return {
        fn: tokens[0],
        ln: tokens.length >= 2 ? tokens[tokens.length - 1] : ''
    };
}

function decodeCtwaConversionData(rawConversionData) {
    if (!rawConversionData) return { raw: null, decodedToken: '', isOpaquePayload: false };
    try {
        let str = '';
        if (Buffer.isBuffer(rawConversionData) || rawConversionData instanceof Uint8Array) {
            str = Buffer.from(rawConversionData).toString('utf8');
        } else {
            const rawStr = String(rawConversionData).trim();
            if (/^\d+(,\d+)+$/.test(rawStr)) {
                const bytes = rawStr.split(',').map(n => Number(n.trim())).filter(n => Number.isFinite(n) && n >= 0 && n <= 255);
                str = Buffer.from(bytes).toString('utf8');
            } else if (/^[0-9a-fA-F]{16,}$/.test(rawStr) && rawStr.length % 2 === 0) {
                const asUtf8 = Buffer.from(rawStr, 'hex').toString('utf8');
                str = /^[\x20-\x7e]+$/.test(asUtf8) ? asUtf8 : rawStr;
            } else {
                str = rawStr;
            }
        }
        str = str.replace(/[\r\n\0]+/g, '').trim();
        const printable = /^[A-Za-z0-9_\-+/=]+$/.test(str) ? str : '';
        // Payloads opacos do WhatsApp Web/Baileys (conversionData/ctwaPayload) começam em Afh/Afg/Afj e têm ~350-500 chars;
        // já ctwa_clid oficial da Cloud API tipicamente tem <= 250 chars
        const isOpaquePayload = printable.length > 250;
        return {
            raw: Buffer.isBuffer(rawConversionData) ? rawConversionData.toString('utf8') : String(rawConversionData),
            decodedToken: printable,
            isOpaquePayload
        };
    } catch {
        return { raw: String(rawConversionData), decodedToken: '', isOpaquePayload: false };
    }
}

// ─── EXTRAÇÃO E ENRIQUECIMENTO DE CONTEXTO DE ANÚNCIO (CTWA / GRAPH API) ───
function extractAdContext(msg, textContent) {
    const adData = {};
    let m = msg?.message || {};
    while (m.ephemeralMessage || m.viewOnceMessage || m.viewOnceMessageV2 || m.documentWithCaptionMessage) {
        m = m.ephemeralMessage?.message || m.viewOnceMessage?.message || m.viewOnceMessageV2?.message || m.documentWithCaptionMessage?.message || m;
    }
    const contextInfo =
        m.extendedTextMessage?.contextInfo ||
        m.imageMessage?.contextInfo ||
        m.videoMessage?.contextInfo ||
        m.documentMessage?.contextInfo ||
        m.buttonsResponseMessage?.contextInfo ||
        m.listResponseMessage?.contextInfo ||
        m.contextInfo ||
        msg?.message?.extendedTextMessage?.contextInfo ||
        msg?.message?.contextInfo ||
        {};

    const ext = contextInfo.externalAdReply;
    if (ext && typeof ext === 'object') {
        adData.isCtwa = true;
        if (ext.title) adData.adTitle = ext.title;
        if (ext.body) adData.adBody = ext.body;
        if (ext.sourceUrl) adData.sourceUrl = ext.sourceUrl;
        if (ext.sourceType) adData.sourceType = ext.sourceType;
        if (ext.sourceApp) adData.sourceApp = ext.sourceApp;
        if (ext.mediaUrl || ext.thumbnailUrl) adData.mediaUrl = ext.mediaUrl || ext.thumbnailUrl;
        if (ext.sourceId && /^\d{6,}$/.test(String(ext.sourceId).trim())) {
            adData.adId = String(ext.sourceId).trim();
        }
        if (ext.ctwaClid) {
            adData.ctwaClid = String(ext.ctwaClid).trim();
        }
    }

    if (contextInfo.entryPointConversionSource === 'ctwa_ad' || contextInfo.conversionSource === 'FB_Ads') {
        adData.isCtwa = true;
        if (contextInfo.conversionSource) adData.conversionSource = contextInfo.conversionSource;
        if (contextInfo.entryPointConversionApp) adData.entryPointApp = contextInfo.entryPointConversionApp;
    }

    const rawConv = contextInfo.conversionData || contextInfo.ctwaPayload;
    if (rawConv) {
        const decoded = decodeCtwaConversionData(rawConv);
        if (decoded.raw) adData.conversionData = decoded.raw;
        if (decoded.decodedToken) {
            adData.ctwaPayload = decoded.decodedToken;
            if (!adData.ctwaClid && !decoded.isOpaquePayload) {
                adData.ctwaClid = decoded.decodedToken;
            }
        }
    }

    if (contextInfo.ctwaClid) {
        adData.ctwaClid = String(contextInfo.ctwaClid).trim();
    }

    // Identificação de tags inseridas no texto de mensagem (Ex: [ref_1202084910284_1202084910285] ou [ref:1202084910284])
    if (textContent) {
        const refMatch = textContent.match(/\[(?:ref:?_?|Ref:?\s*|ref\s+)?([0-9a-zA-Z_\-]+)\]/i);
        if (refMatch && refMatch[1]) {
            const rawRef = refMatch[1].trim();
            adData.rawTag = rawRef;
            const parts = rawRef.split('_');
            if (parts.length >= 2 && /^\d+$/.test(parts[0]) && /^\d+$/.test(parts[1])) {
                adData.campaignId = parts[0];
                adData.adId = parts[1];
            } else if (/^\d+$/.test(rawRef)) {
                adData.campaignId = rawRef;
            }
        }
    }

    return Object.keys(adData).length > 0 ? adData : null;
}

const metaAdLookupCache = new Map();
let metaCreativeIndexCache = { timestamp: 0, byIgUrl: new Map(), byVideoId: new Map() };
let metaCreativeIndexPromise = null;

function normalizeInstagramPermalink(url) {
    if (!url) return '';
    try {
        const u = new URL(String(url).trim());
        return `${u.hostname.replace(/^www\./, '').toLowerCase()}${u.pathname.replace(/\/+$/, '')}`;
    } catch {
        return String(url).trim().replace(/^https?:\/\/(www\.)?/i, '').split('?')[0].replace(/\/+$/, '').toLowerCase();
    }
}

async function getMetaCreativeAttributionIndex() {
    const now = Date.now();
    if (metaCreativeIndexCache.timestamp > 0 && now - metaCreativeIndexCache.timestamp < 10 * 60 * 1000) {
        return metaCreativeIndexCache;
    }
    if (metaCreativeIndexPromise) return metaCreativeIndexPromise;

    const token = getMetaAccessToken(false);
    if (!token) return metaCreativeIndexCache;

    metaCreativeIndexPromise = (async () => {
        try {
            const bmId = process.env.META_BUSINESS_ID || '2124779294600156';
            const accountsRes = await Promise.allSettled([
                axios.get(`https://graph.facebook.com/v21.0/${bmId}/client_ad_accounts?fields=id,account_id&limit=100&access_token=${token}`, { timeout: 6000 }),
                axios.get(`https://graph.facebook.com/v21.0/${bmId}/owned_ad_accounts?fields=id,account_id&limit=100&access_token=${token}`, { timeout: 6000 })
            ]);
            const accountIds = new Set();
            for (const r of accountsRes) {
                if (r.status === 'fulfilled') {
                    for (const acc of (r.value.data?.data || [])) {
                        accountIds.add(acc.id || `act_${acc.account_id}`);
                    }
                }
            }

            const byIgUrl = new Map();
            const byVideoId = new Map();
            const adsResults = await Promise.allSettled(
                Array.from(accountIds).map(accId =>
                    axios.get(`https://graph.facebook.com/v21.0/${accId}/ads`, {
                        params: {
                            fields: 'id,name,effective_status,campaign_id,campaign{id,name},adset_id,account_id,creative{id,video_id,instagram_permalink_url,object_story_spec{video_data{video_id}}}',
                            filtering: JSON.stringify([{ field: 'effective_status', operator: 'IN', value: ['ACTIVE', 'PAUSED'] }]),
                            limit: 30,
                            access_token: token
                        },
                        timeout: 7000
                    })
                )
            );

            for (const res of adsResults) {
                if (res.status !== 'fulfilled') continue;
                for (const ad of (res.value.data?.data || [])) {
                    const info = {
                        adId: ad.id,
                        adName: ad.name || '',
                        campaignId: ad.campaign_id || ad.campaign?.id || '',
                        campaignName: ad.campaign?.name || '',
                        adsetId: ad.adset_id || '',
                        accountId: ad.account_id ? `act_${String(ad.account_id).replace(/^act_/, '')}` : '',
                        effectiveStatus: ad.effective_status || ''
                    };
                    const igKey = normalizeInstagramPermalink(ad.creative?.instagram_permalink_url);
                    if (igKey) {
                        const list = byIgUrl.get(igKey) || [];
                        list.push(info);
                        byIgUrl.set(igKey, list);
                    }
                    const vid = ad.creative?.video_id || ad.creative?.object_story_spec?.video_data?.video_id;
                    if (vid) {
                        const list = byVideoId.get(String(vid)) || [];
                        list.push(info);
                        byVideoId.set(String(vid), list);
                    }
                }
            }

            metaCreativeIndexCache = { timestamp: Date.now(), byIgUrl, byVideoId };
        } catch (err) {
            console.warn('[Atribuição Meta Graph] Aviso ao indexar criativos:', err?.message);
        } finally {
            metaCreativeIndexPromise = null;
        }
        return metaCreativeIndexCache;
    })();

    return metaCreativeIndexPromise;
}

async function resolveMetaAdAttribution(adData) {
    if (!adData || typeof adData !== 'object') return adData;
    if (adData.campaignId && adData.accountId) return adData;

    const token = getMetaAccessToken(false);
    if (!token) return adData;

    try {
        // 1) Se já temos o adId exato (via externalAdReply.sourceId ou [ref_camp_ad]), consulta direto
        if (adData.adId && /^\d{6,}$/.test(String(adData.adId))) {
            const cacheKey = `ad:${adData.adId}`;
            let cached = metaAdLookupCache.get(cacheKey);
            if (!cached || Date.now() - cached.ts > 6 * 3600 * 1000) {
                const res = await axios.get(`https://graph.facebook.com/v21.0/${adData.adId}`, {
                    params: {
                        fields: 'id,name,campaign_id,campaign{id,name},adset_id,account_id',
                        access_token: token
                    },
                    timeout: 5000
                });
                const d = res.data || {};
                cached = {
                    ts: Date.now(),
                    data: {
                        adId: d.id || adData.adId,
                        adName: d.name || '',
                        campaignId: d.campaign_id || d.campaign?.id || adData.campaignId || undefined,
                        campaignName: d.campaign?.name || undefined,
                        adsetId: d.adset_id || undefined,
                        accountId: d.account_id ? `act_${String(d.account_id).replace(/^act_/, '')}` : undefined
                    }
                };
                metaAdLookupCache.set(cacheKey, cached);
            }
            return { ...adData, ...cached.data };
        }

        // 2) Se temos apenas campaignId (via [ref_camp]), resolve accountId e campaignName
        if (adData.campaignId && !adData.accountId && /^\d{6,}$/.test(String(adData.campaignId))) {
            const cacheKey = `camp:${adData.campaignId}`;
            let cached = metaAdLookupCache.get(cacheKey);
            if (!cached || Date.now() - cached.ts > 6 * 3600 * 1000) {
                const res = await axios.get(`https://graph.facebook.com/v21.0/${adData.campaignId}`, {
                    params: { fields: 'id,name,account_id', access_token: token },
                    timeout: 5000
                });
                const d = res.data || {};
                cached = {
                    ts: Date.now(),
                    data: {
                        campaignId: d.id || adData.campaignId,
                        campaignName: d.name || undefined,
                        accountId: d.account_id ? `act_${String(d.account_id).replace(/^act_/, '')}` : undefined
                    }
                };
                metaAdLookupCache.set(cacheKey, cached);
            }
            return { ...adData, ...cached.data };
        }

        // 3) Se temos sourceUrl (instagram.com/p/... ou fb.me/...), tenta resolver pelo índice da BM
        if (adData.sourceUrl) {
            const srcUrl = String(adData.sourceUrl).trim();
            const index = await getMetaCreativeAttributionIndex();

            if (srcUrl.includes('instagram.com/')) {
                const igKey = normalizeInstagramPermalink(srcUrl);
                const matches = index.byIgUrl.get(igKey) || [];
                const activeMatches = matches.filter(m => m.effectiveStatus === 'ACTIVE');
                const pool = activeMatches.length > 0 ? activeMatches : matches;
                if (pool.length === 1) {
                    return { ...adData, ...pool[0] };
                }
            } else if (/^https?:\/\/(fb\.me|www\.facebook\.com|facebook\.com)\//i.test(srcUrl)) {
                let targetUrl = srcUrl;
                if (/^https?:\/\/fb\.me\//i.test(srcUrl)) {
                    const cacheKey = `fbme:${srcUrl}`;
                    const cachedUrl = metaAdLookupCache.get(cacheKey);
                    if (cachedUrl) {
                        targetUrl = cachedUrl.url;
                    } else {
                        const r = await axios.get(srcUrl, { maxRedirects: 0, validateStatus: s => s >= 200 && s < 400, timeout: 4000 }).catch(e => e.response);
                        const loc = r?.headers?.location || '';
                        if (loc) {
                            targetUrl = loc;
                            metaAdLookupCache.set(cacheKey, { url: loc, ts: Date.now() });
                        }
                    }
                }
                const fbidMatch = targetUrl.match(/story_fbid=(\d+)/);
                if (fbidMatch && fbidMatch[1]) {
                    const videoId = fbidMatch[1];
                    const matches = index.byVideoId.get(videoId) || [];
                    const activeMatches = matches.filter(m => m.effectiveStatus === 'ACTIVE');
                    const pool = activeMatches.length > 0 ? activeMatches : matches;
                    if (pool.length === 1) {
                        return { ...adData, creativeVideoId: videoId, ...pool[0] };
                    }
                    if (pool.length > 1) {
                        return {
                            ...adData,
                            creativeVideoId: videoId,
                            creativeName: pool[0].adName || undefined
                        };
                    }
                }
            }
        }
    } catch (err) {
        console.warn('[Atribuição Meta Graph] Falha não-crítica ao enriquecer anúncio:', err?.message);
    }
    return adData;
}

// ─── DISPARO PARA META CONVERSIONS API (CAPI) ───
async function sendMetaCapiConversion(transactionRecord, options = {}) {
    const metaPixelId = process.env.META_PIXEL_ID || store.metaConfig?.pixelId;
    const metaAccessToken = getMetaAccessToken(true);
    const metaPageId = process.env.META_PAGE_ID || store.metaConfig?.pageId || DEFAULT_META_PAGE_ID;
    const metaWabaId = process.env.META_WABA_ID || store.metaConfig?.wabaId || '';
    const metaMessagingDatasetId = process.env.META_MESSAGING_DATASET_ID || store.metaConfig?.messagingDatasetId || '';

    if (!metaPixelId || !metaAccessToken) {
        console.log(`[Meta CAPI] ⚠️ Pixel ID ou Access Token da Meta não configurados no Chatbot. Conversão registrada localmente.`);
        return { success: false, skipped: true, reason: 'Pixel ID ou Access Token ausente', capiMode: 'skipped' };
    }

    try {
        // Nunca hashear @lid (14+ dígitos internos do WhatsApp) como telefone no CAPI!
        const candidatePhones = [];
        for (const rawP of [transactionRecord.realPhone, transactionRecord.userPhone]) {
            const digits = String(rawP || '').replace(/\D/g, '');
            const hint = digits && transactionRecord.lidDigits && digits === transactionRecord.lidDigits ? `${digits}@lid` : '';
            if (isPlausibleRealPhone(digits, hint)) {
                getBrazilianPhoneVariants(digits).forEach(v => {
                    if (!candidatePhones.includes(v)) candidatePhones.push(v);
                });
            }
        }
        const phHashes = candidatePhones.map(sha256Hex);

        const { fn, ln } = splitMetaCustomerName(transactionRecord.pushName);
        const fnHash = fn ? sha256Hex(fn) : undefined;
        const lnHash = ln ? sha256Hex(ln) : undefined;
        const countryHash = (candidatePhones.some(p => p.startsWith('55')) || !candidatePhones.length) ? sha256Hex('br') : undefined;
        const extRaw = candidatePhones[0] || String(transactionRecord.userPhone || '').replace(/\D/g, '');
        const extIdHash = extRaw ? sha256Hex(extRaw) : undefined;

        const decodedConv = decodeCtwaConversionData(transactionRecord.ctwaClid || transactionRecord.ctwaPayload || transactionRecord.conversionData);
        const officialCtwaClid = (transactionRecord.ctwaClid && !decodeCtwaConversionData(transactionRecord.ctwaClid).isOpaquePayload)
            ? String(transactionRecord.ctwaClid).trim()
            : (!decodedConv.isOpaquePayload && decodedConv.decodedToken ? decodedConv.decodedToken : undefined);

        // event_time precisa estar nos últimos 7 dias e no máximo igual ao timestamp atual
        const nowSec = Math.floor(Date.now() / 1000);
        const rawTxMs = Number(transactionRecord.time) || (transactionRecord.timestamp ? Date.parse(transactionRecord.timestamp) : NaN);
        let eventTime = Number.isFinite(rawTxMs) ? Math.floor(rawTxMs / 1000) : nowSec;
        if (eventTime > nowSec) eventTime = nowSec;
        if (nowSec - eventTime > 6 * 86400 + 43200) eventTime = nowSec - 6 * 86400;

        const customData = {
            currency: 'BRL',
            value: Number(Number(transactionRecord.amount || 0).toFixed(2)),
            content_name: transactionRecord.funnelName || 'Jornada da Bíblia',
            content_type: 'product',
            order_id: transactionRecord.id
        };
        if (transactionRecord.campaignId) customData.campaign_id = String(transactionRecord.campaignId);
        if (transactionRecord.adId) customData.ad_id = String(transactionRecord.adId);

        const baseUserData = {};
        if (phHashes.length > 0) baseUserData.ph = phHashes;
        if (fnHash) baseUserData.fn = [fnHash];
        if (lnHash) baseUserData.ln = [lnHash];
        if (countryHash) baseUserData.country = [countryHash];
        if (extIdHash) baseUserData.external_id = [extIdHash];

        // Só utiliza business_messaging quando houver Dataset WABA/Page e ctwa_clid oficial da Cloud API (ou wabaId+dataset configurado),
        // caso contrário envia action_source: 'chat' diretamente no Pixel consolidado (1494508035936698), que a Meta aceita com Advanced Matching.
        const useBusinessMessaging = Boolean(
            (metaMessagingDatasetId && (officialCtwaClid || metaWabaId)) ||
            (officialCtwaClid && metaWabaId)
        );

        let targetDatasetId = metaPixelId;
        let capiMode = 'chat';
        let eventObj;

        if (useBusinessMessaging) {
            targetDatasetId = metaMessagingDatasetId || metaPixelId;
            capiMode = 'business_messaging';
            const bmUserData = { ...baseUserData };
            if (metaWabaId) bmUserData.whatsapp_business_account_id = String(metaWabaId);
            else bmUserData.page_id = String(metaPageId);
            if (officialCtwaClid) bmUserData.ctwa_clid = officialCtwaClid;

            eventObj = {
                event_name: 'Purchase',
                event_time: eventTime,
                event_id: transactionRecord.id,
                action_source: 'business_messaging',
                messaging_channel: 'whatsapp',
                user_data: bmUserData,
                custom_data: customData
            };
        } else {
            eventObj = {
                event_name: 'Purchase',
                event_time: eventTime,
                event_id: transactionRecord.id,
                action_source: 'chat',
                user_data: baseUserData,
                custom_data: customData
            };
        }

        const payload = { data: [eventObj] };
        if (options?.testEventCode) {
            payload.test_event_code = String(options.testEventCode).trim();
        }

        const capiUrl = `https://graph.facebook.com/v21.0/${targetDatasetId}/events?access_token=${metaAccessToken}`;
        const res = await axios.post(capiUrl, payload, { timeout: 10000 });
        console.log(`[Meta CAPI] ✅ Evento Purchase (${capiMode}) enviado para ${targetDatasetId}! Recebidos: ${res.data?.events_received || 1} | MatchKeys: ${Object.keys(eventObj.user_data).join(',')} | fbtrace_id: ${res.data?.fbtrace_id || '-'}`);
        return {
            success: true,
            capiMode,
            datasetId: targetDatasetId,
            matchKeys: Object.keys(eventObj.user_data),
            realPhoneMatched: candidatePhones.length > 0,
            data: res.data
        };
    } catch (err) {
        const metaErr = err.response?.data?.error;
        const errorMsg = metaErr?.error_user_msg || metaErr?.message || err.message;
        const errorSubcode = metaErr?.error_subcode || null;
        const fbtraceId = metaErr?.fbtrace_id || null;
        console.error(`[Meta CAPI] ❌ Erro (${errorSubcode || 'HTTP'}) ao enviar Purchase:`, err.response?.data || err.message);
        if (!options?.testEventCode) {
            sendNtfyEmergencyAlert({
                title: '⚠️ ALERTA X1: FALHA NO DISPARO META CAPI',
                message: `⚠️ Erro ao enviar Purchase para Meta CAPI!\nValor: R$ ${transactionRecord.amount}\nFunil: ${transactionRecord.funnelName}\nLead: ${transactionRecord.pushName || 'Cliente'} (+${transactionRecord.realPhone || transactionRecord.userPhone})\nSubcódigo: ${errorSubcode || '-'}\nErro: ${errorMsg}`,
                priority: 'high',
                tags: 'warning,chart_with_downwards_trend',
                alertKey: 'capi_error',
                cooldownSec: 180
            }).catch(() => {});
        }
        return { success: false, capiMode: 'error', error: errorMsg, errorSubcode, fbtraceId };
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

// ─── NOTIFICAÇÃO PUSH NO CELULAR (NTFY.SH) ───
async function sendNtfyNotification(transactionRecord) {
    const topic = process.env.NTFY_TOPIC || 'gui_vendas_sermoes';
    try {
        const bodyText = `💰 Nova Venda PIX Aprovada!\n` +
            `💵 Valor: R$ ${Number(transactionRecord.amount || 19.90).toFixed(2).replace('.', ',')}\n` +
            `👤 Lead: ${transactionRecord.pushName || 'Cliente'} (+${transactionRecord.userPhone})\n` +
            `📖 Funil: ${transactionRecord.funnelName || 'Acervo de Sermões'}\n` +
            `🎯 Campanha: ${transactionRecord.campaignId || 'Orgânico / Direto'}`;

        await axios.post(`https://ntfy.sh/${topic}`, bodyText, {
            headers: {
                'Title': '🎉 PIX APROVADO NO CHATBOT!',
                'Priority': 'urgent',
                'Tags': 'moneybag,white_check_mark,pray'
            },
            timeout: 5000
        });
        console.log(`[ntfy] 🔔 Alerta push enviado para o canal: https://ntfy.sh/${topic}`);
    } catch (err) {
        console.warn(`[ntfy] ⚠️ Erro ao enviar notificação push:`, err.message);
    }
}

// ─── SENTINELA DE ALERTAS DE EMERGÊNCIA (NTFY.SH) ───
const lastEmergencyAlertTimes = {};

async function sendNtfyEmergencyAlert({ title, message, priority = 'urgent', tags = 'warning,rotating_light', alertKey = 'default', cooldownSec = 180 }) {
    const now = Date.now();
    if (lastEmergencyAlertTimes[alertKey] && (now - lastEmergencyAlertTimes[alertKey]) < (cooldownSec * 1000)) {
        console.log(`[ntfy Alert] Cooldown ativo para alerta '${alertKey}' (${Math.round((cooldownSec * 1000 - (now - lastEmergencyAlertTimes[alertKey])) / 1000)}s restantes)`);
        return;
    }
    lastEmergencyAlertTimes[alertKey] = now;

    const topic = process.env.NTFY_TOPIC || 'gui_vendas_sermoes';
    try {
        await axios.post(`https://ntfy.sh/${topic}`, message, {
            headers: {
                'Title': title,
                'Priority': priority,
                'Tags': tags
            },
            timeout: 6000
        });
        console.log(`[ntfy Alert] 🚨 Alerta crítico enviado para https://ntfy.sh/${topic}: ${title}`);
    } catch (err) {
        console.warn(`[ntfy Alert Error]:`, err?.message);
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
    const type = messageContent?.imageMessage ? 'image' : 
                 messageContent?.documentMessage ? 'document' : 
                 messageContent?.audioMessage ? 'audio' : null;
    const mediaObj = messageContent?.imageMessage || messageContent?.documentMessage || messageContent?.audioMessage;
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

function detectPaymentRefusal(text) {
    if (!text || typeof text !== 'string') return false;
    const norm = text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

    const patterns = [
        /\b(nao|nunca)\s+(vou|posso|consigo|quero)\s+(pagar|comprar|fazer|enviar)\b/i,
        /\b(nao\s+vou\s+querer|nao\s+quero\s+mais|nao\s+tenho\s+interesse|perdi\s+o\s+interesse)\b/i,
        /\b(muito|achei|ta|tava)\s+caro\b/i,
        /\b(caro\s+demais|puxado|sem\s+condicoes)\b/i,
        /\b(sem\s+dinheiro|sem\s+grana|nao\s+tenho\s+dinheiro|to\s+sem\s+dinheiro|to\s+liso|sem\s+limite)\b/i,
        /\b(cancela|cancelar|cancelamento|cancela\s+ai|pode\s+cancelar)\b/i,
        /\b(deixa\s+pra\s+la|deixa\s+quieto|esquece|esquece\s+isso|desisto|desisti)\b/i,
        /\b(pensei|achei|achava)\s+que\s+(era|fosse)\s+gratis\b/i,
        /\b(pensei|achei|achava)\s+que\s+(era|fosse)\s+de\s+graca\b/i,
        /\b(e\s+pago|tem\s+que\s+pagar|cobrando)\b/i,
        /\b(nao\s+vou\s+levar|nao\s+tenho\s+interesse)\b/i,
        /\b(golpe|fraude|enganacao)\b/i,
        /\b(nao\s+obrigado|nao\s+obrigada|obrigado\s+mas\s+nao|obrigada\s+mas\s+nao|nao\s+vlw|nao\s+valeu)\b/i
    ];

    return patterns.some(pat => pat.test(norm));
}

async function auditAudioRefusalWithGemini(audioBuffer, mimeType = 'audio/ogg') {
    if (!GEMINI_API_KEY) {
        console.warn('[Audio Auditor] Chave GEMINI_API_KEY não configurada.');
        return { isRefusal: false, transcript: '', refusalReason: null };
    }

    try {
        const base64Audio = audioBuffer.toString('base64');
        const cleanMime = (mimeType && mimeType.includes('mp4')) ? 'audio/mp4' : 'audio/ogg';
        const modelsToTry = ['gemini-3.5-flash-lite', 'gemini-4-hydrogen', 'gemini-3.6-flash'];
        const prompt = `Você é uma inteligência artificial especialista em vendas no WhatsApp para infoprodutos.
O lead enviou esta mensagem de áudio (nota de voz gravada no WhatsApp) após receber a chave PIX e a oferta.
Analise o áudio e realize duas tarefas:
1. Transcreva com fidelidade absoluta o que a pessoa disse em português.
2. Analise a intenção e determine se a pessoa está RECUSANDO, DESISTINDO ou REJEITANDO o pagamento do PIX (por exemplo: dizendo que não vai pagar, que achou caro, que não tem dinheiro agora, que quer cancelar, que não tem interesse, que desiste, etc.).

Retorne EXCLUSIVAMENTE um objeto JSON válido no formato:
{
  "transcript": "texto exato falado",
  "isRefusal": true ou false,
  "refusalReason": "motivo resumido da recusa ou null"
}`;

        let response = null;
        let lastErr = null;

        for (const modelName of modelsToTry) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
                response = await axios.post(
                    url,
                    {
                        contents: [
                            {
                                parts: [
                                    { text: prompt },
                                    {
                                        inline_data: {
                                            mime_type: cleanMime,
                                            data: base64Audio
                                        }
                                    }
                                ]
                            }
                        ],
                        generationConfig: {
                            response_mime_type: "application/json",
                            temperature: 0.1
                        }
                    },
                    { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
                );
                if (response?.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
                    console.log(`[Audio Auditor] 🎙️ Áudio analisado via ${modelName}`);
                    break;
                }
            } catch (mErr) {
                lastErr = mErr;
                console.warn(`[Audio Auditor] Modelo ${modelName} falhou: ${mErr?.response?.data?.error?.message || mErr.message}`);
            }
        }

        if (!response && lastErr) throw lastErr;

        const rawJson = response?.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawJson) {
            const parsed = JSON.parse(rawJson);
            const transcript = parsed.transcript || '';
            const isGeminiRefusal = Boolean(parsed.isRefusal);
            const isTextRefusal = detectPaymentRefusal(transcript);
            const finalIsRefusal = isGeminiRefusal || isTextRefusal;

            return {
                isRefusal: finalIsRefusal,
                transcript,
                refusalReason: parsed.refusalReason || (isTextRefusal ? 'Padrão de recusa identificado no texto transcrito' : null)
            };
        }
    } catch (e) {
        console.warn('[Audio Auditor] Erro ao analisar áudio com Gemini:', e?.response?.data?.error?.message || e.message);
    }

    return { isRefusal: false, transcript: '', refusalReason: null };
}

async function auditPixReceiptWithGemini(mediaBuffer, mimeType, expectedAmount = 19.90, beneficiary = '') {
    if (!GEMINI_API_KEY) {
        console.warn('[PIX Auditor] Nenhuma chave GEMINI_API_KEY configurada.');
        sendNtfyEmergencyAlert({
            title: '🚨 ALERTA X1: CHAVE DA IA NÃO CONFIGURADA!',
            message: 'A variável GEMINI_API_KEY está ausente no servidor. O bot não conseguirá ler comprovantes de pagamento!',
            priority: 'urgent',
            tags: 'warning,key',
            alertKey: 'missing_gemini_key',
            cooldownSec: 300
        }).catch(() => {});
        return { isValid: false, reason: 'Chave da IA não configurada no servidor.' };
    }

    try {
        const base64Data = mediaBuffer.toString('base64');
        const modelsToTry = ['gemini-3.5-flash-lite', 'gemini-4-hydrogen', 'gemini-3.6-flash'];
        let response = null;
        let usedModel = null;
        let lastErr = null;

        for (const modelName of modelsToTry) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
                response = await axios.post(
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
                    { headers: { 'Content-Type': 'application/json' }, timeout: 18000 }
                );
                if (response?.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
                    usedModel = modelName;
                    break;
                }
            } catch (mErr) {
                lastErr = mErr;
                console.warn(`[PIX Auditor] Modelo ${modelName} falhou: ${mErr?.response?.data?.error?.message || mErr.message}`);
            }
        }

        if (!response && lastErr) throw lastErr;

        const textOutput = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsed = JSON.parse(textOutput);
        console.log(`[PIX Auditor] 🧠 Resultado da IA (${usedModel}):`, JSON.stringify(parsed));

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
            const isKnownUtility = ['celesc', 'enel', 'sabesp', 'copel', 'cemig', 'cpfl', 'claro', 'vivo', 'tim'].some(u => destLower.includes(u));
            if (isKnownUtility) {
                return {
                    isValid: false,
                    reason: `O destinatário do comprovante (${parsed.destinatario}) parece ser uma conta de consumo e não o PIX esperado.`,
                    details: parsed,
                };
            }

            const cleanBen = String(beneficiary || '').trim().toLowerCase();
            if (cleanBen) {
                const ignoredWords = new Set(['pastor', 'missionaria', 'missionário', 'missionario', 'igreja', 'projeto', 'editora', 'guia', 'ltda', 'digital', 'digitais']);
                const benTokens = cleanBen
                    .split(/[\s\-_()/,]+/)
                    .map(t => t.trim())
                    .filter(t => t.length >= 3 && !ignoredWords.has(t));

                const matchesToken = benTokens.length === 0 || benTokens.some(tok => destLower.includes(tok));
                const isKnownMerchant =
                    destLower.includes(cleanBen) ||
                    matchesToken ||
                    destLower.includes('guilherme') ||
                    destLower.includes('gps') ||
                    destLower.includes('ebooks') ||
                    destLower.includes('digitais') ||
                    destLower.includes('67039217') ||
                    destLower.includes('carol') ||
                    destLower.includes('pagamento');

                if (!isKnownMerchant) {
                    return {
                        isValid: false,
                        reason: `O destinatário do comprovante (${parsed.destinatario}) não corresponde ao beneficiário esperado (${beneficiary}).`,
                        details: parsed,
                    };
                }
            }
        }

        const paidAmount = (typeof parsed.valor === 'number' && parsed.valor > 0) ? parsed.valor : Number(expectedAmount || 19.90);
        return { isValid: true, paidAmount, details: parsed };
    } catch (err) {
        const errorDetail = err?.response?.data?.error?.message || err?.message;
        console.error('[PIX Auditor] Erro na API do Gemini:', err?.response?.data || err?.message);
        sendNtfyEmergencyAlert({
            title: '⚠️ ALERTA X1: FALHA NA IA DO GEMINI!',
            message: `A API do Gemini falhou ao tentar auditar um comprovante!\nErro: ${errorDetail}\nVerifique imediatamente os tokens e status da API do Gemini.`,
            priority: 'urgent',
            tags: 'warning,robot',
            alertKey: 'gemini_api_error',
            cooldownSec: 120
        }).catch(() => {});
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
        let restoredCount = 0;
        for (const [fileName, content] of Object.entries(filesMap)) {
            if (typeof content === 'string' && fileName.endsWith('.json')) {
                // Ignorar sessões criptográficas antigas de destinatários (session-*.json) congeladas no KV
                // para evitar erro "Bad MAC" no iPhone da sócia/leads e forçar assertSessions a buscar prekeys novas.
                // Mantém creds.json, pre-key-*, app-state-sync-* e a sessão do próprio número principal.
                if (fileName.startsWith('session-') && !fileName.startsWith('session-551152291989')) {
                    continue;
                }
                fs.writeFileSync(path.join(sessionFolder, fileName), content, 'utf-8');
                restoredCount++;
            }
        }
        console.log(`[Cloud KV] ☁️ Sessão WhatsApp restaurada da nuvem Cloudflare (${restoredCount} arquivos essenciais, sessões de leads renovadas)`);
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
        nodeId: 'node_pix_intro_msg',
        nodeType: 'MESSAGE',
        position: { x: 320, y: 460 },
        label: '💬 Instruções da Chave PIX',
        config: {
            text: 'Chave Pix E-MAIL\nNome: Pastor Guilherme\n👇 Só clicar no botão ou copiar a chave abaixo 👇',
            messageText: 'Chave Pix E-MAIL\nNome: Pastor Guilherme\n👇 Só clicar no botão ou copiar a chave abaixo 👇',
        },
    },
    {
        nodeId: 'node_pix_charge',
        nodeType: 'PIX',
        position: { x: 320, y: 600 },
        label: '💳 Cartão PIX Copia e Cola',
        config: {
            keyType: 'EMAIL',
            pixKey: 'pastorguilhermeigreja@gmail.com',
            beneficiaryName: 'Pastor Guilherme',
            amount: '20.00',
        },
    },
    {
        nodeId: 'node_pix_raw_key',
        nodeType: 'MESSAGE',
        position: { x: 320, y: 740 },
        label: '🔑 Chave PIX (Só a Chave)',
        config: {
            text: 'pastorguilhermeigreja@gmail.com',
            messageText: 'pastorguilhermeigreja@gmail.com',
        },
    },
    {
        nodeId: 'node_pix_verifier',
        nodeType: 'PIX_VERIFIER',
        position: { x: 320, y: 880 },
        label: '🧠 Auditor PIX (IA Gemini Vision)',
        config: {
            expectedAmount: '20.00',
            beneficiaryName: 'Pastor Guilherme',
            model: 'gemini-3.5-flash-lite',
        },
    },
    {
        nodeId: 'node_capi_purchase',
        nodeType: 'META_CAPI',
        position: { x: 100, y: 1040 },
        label: '🎯 Conversão Meta Ads (Purchase)',
        config: {
            eventName: 'Purchase',
            value: 20.00,
            currency: 'BRL',
        },
    },
    {
        nodeId: 'node_msg_refused',
        nodeType: 'MESSAGE',
        position: { x: 540, y: 1040 },
        label: '⚠️ Cobrança Educada (PIX Inválido/Pendente)',
        config: {
            text: 'Oi! Parece que esse comprovante é um agendamento ou ainda não foi identificado como concluído. Consegue me mandar o comprovante definitivo?',
        },
    },
];

const DEFAULT_FLOW_EDGES = [
    { id: 'edge_1', source: 'node_start', target: 'node_audio_welcome' },
    { id: 'edge_2', source: 'node_audio_welcome', target: 'node_media_product' },
    { id: 'edge_3', source: 'node_media_product', target: 'node_pix_intro_msg' },
    { id: 'edge_4', source: 'node_pix_intro_msg', target: 'node_pix_charge' },
    { id: 'edge_5', source: 'node_pix_charge', target: 'node_pix_raw_key' },
    { id: 'edge_6', source: 'node_pix_raw_key', target: 'node_pix_verifier' },
    { id: 'edge_7', source: 'node_pix_verifier', sourceHandle: 'success', target: 'node_capi_purchase' },
    { id: 'edge_8', source: 'node_pix_verifier', sourceHandle: 'fail', target: 'node_msg_refused' },
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
            startedCount: 0,
            materialDeliveredCount: 0,
            pixSentCount: 0,
            receiptReceivedCount: 0,
            convertedCount: 0,
            dropOffCount: 0,
            totalRevenue: 0.00,
            recentConversions: [],
        },
    };
    saveStore(initial);
    return initial;
}

let isRestoringRuntimeState = false;
let runtimeStateBootRestored = false;
let runtimeBackupDebounceTimer = null;
let lastRuntimeBackupHash = '';

function sanitizeSessionsForBackup(userSessions = {}) {
    const cleaned = {};
    for (const [k, s] of Object.entries(userSessions || {})) {
        if (!s || typeof s !== 'object') continue;
        const copy = { ...s };
        delete copy.inFlightStartedAt;
        cleaned[k] = copy;
    }
    return cleaned;
}

function buildRuntimeStatePayload(botId = 'bot_whatsapp_principal') {
    const scopedSessions = {};
    for (const [k, s] of Object.entries(store.userSessions || {})) {
        if (k.startsWith(`${botId}:`) || (s && s.botId === botId) || !s?.botId) {
            const copy = { ...s };
            delete copy.inFlightStartedAt;
            scopedSessions[k] = copy;
        }
    }
    return {
        botId,
        savedAt: new Date().toISOString(),
        userSessions: scopedSessions,
        scheduledJobs: Array.isArray(store.scheduledJobs) ? store.scheduledJobs : [],
        conversations: Array.isArray(store.conversations) ? store.conversations.slice(-500) : [],
        funnelStats: store.funnelStats || {},
        funnelTransactions: Array.isArray(store.funnelTransactions) ? store.funnelTransactions : [],
    };
}

function computeRuntimeHash(payload) {
    try {
        return JSON.stringify({
            sc: Object.keys(payload.userSessions || {}).length,
            su: Object.entries(payload.userSessions || {}).map(([k, v]) => [k, v.waitingFor, v.currentNodeId, v.paid, v.updatedAt]),
            jc: (payload.scheduledJobs || []).map(j => [j.jobId, j.resumeAt, j.targetNodeId]),
            cc: (payload.conversations || []).length,
            lc: payload.conversations?.[(payload.conversations || []).length - 1]?._id || '',
            tc: (payload.funnelTransactions || []).length,
            fs: payload.funnelStats || {},
        });
    } catch {
        return String(Date.now());
    }
}

async function flushRuntimeStateBackupNow(botId = 'bot_whatsapp_principal', force = false) {
    try {
        const payload = buildRuntimeStatePayload(botId);
        const hash = computeRuntimeHash(payload);
        if (!force && hash === lastRuntimeBackupHash) {
            return { skipped: true };
        }
        await axios.post(
            `${CLOUD_WORKER_URL}/api/cloud-kv/runtime-state?botId=${encodeURIComponent(botId)}`,
            payload,
            { timeout: 8000 }
        );
        lastRuntimeBackupHash = hash;
        console.log(`[Cloud KV Runtime] ☁️ Backup salvo: ${Object.keys(payload.userSessions).length} sessões, ${payload.scheduledJobs.length} jobs, ${payload.conversations.length} msgs.`);
        return { success: true, savedAt: payload.savedAt };
    } catch (err) {
        console.warn('[Cloud KV Runtime] Aviso ao salvar backup runtime:', err?.message);
        return { success: false, error: err?.message };
    }
}

function scheduleCloudKvRuntimeBackup(botId = 'bot_whatsapp_principal') {
    if (isRestoringRuntimeState || !runtimeStateBootRestored) return;
    if (runtimeBackupDebounceTimer) clearTimeout(runtimeBackupDebounceTimer);
    runtimeBackupDebounceTimer = setTimeout(() => {
        flushRuntimeStateBackupNow(botId, false).catch(() => {});
    }, 45000);
}

function reconstructMissingSessionsFromHistory(botId = 'bot_whatsapp_principal') {
    const flows = store.flows?.[botId] || [];
    const activeFlowId = store.activeFunnelId || 'flow_1794362249148';
    const activeFlow = flows.find(f => f._id === activeFlowId) || flows.find(f => f._id === 'flow_1794362249148') || flows[0];
    const resolveFlowHelpers = (targetFlowId) => {
        const f = flows.find(fl => fl._id === targetFlowId) || activeFlow;
        const nodes = f?.draftVersion?.flowData?.nodes || [];
        const inputNode = nodes.find(n => (n.nodeType || '').toUpperCase() === 'INPUT') || null;
        const verifierNode = nodes.find(n => (n.nodeType || '').toUpperCase() === 'PIX_VERIFIER') || null;
        const pixNode = nodes.find(n => (n.nodeType || '').toUpperCase() === 'PIX') || null;
        return { flow: f, inputNode, verifierNode, pixNode };
    };

    let reconstructedCount = 0;
    store.userSessions = store.userSessions || {};

    // 1. Reconstruir sessões de leads com jobs agendados no scheduler (pós-PIX / remarketing)
    for (const job of (store.scheduledJobs || [])) {
        const jBot = job.botId || botId;
        const phone = String(job.userPhone || '').replace(/\D/g, '');
        if (!phone) continue;
        const key = `${jBot}:${phone}`;
        const jidDigits = String(job.remoteJid || '').split('@')[0].split(':')[0].replace(/\D/g, '');
        const { flow, verifierNode, pixNode } = resolveFlowHelpers(job.flowId);
        let sess = store.userSessions[key] || (jidDigits ? store.userSessions[`${jBot}:${jidDigits}`] : null);
        if (!sess) {
            sess = {
                botId: jBot,
                userJid: job.remoteJid || (phone.length > 13 ? `${phone}@lid` : `${phone}@s.whatsapp.net`),
                userPhone: phone,
                userName: 'Cliente',
                flowId: flow?._id || job.flowId || activeFlowId,
                flowName: flow?.name || job.flowName || '',
                currentNodeId: verifierNode?.nodeId || verifierNode?.id || 'node_flow_funil_4_12',
                waitingFor: 'PIX_RECEIPT',
                hasReceivedPix: true,
                wasInRecovery: true,
                expectedAmount: Number(verifierNode?.config?.expectedAmount || pixNode?.config?.amount || 20.0),
                latestPixAmount: Number(pixNode?.config?.amount || verifierNode?.config?.expectedAmount || 20.0),
                beneficiary: String(verifierNode?.config?.beneficiary || pixNode?.config?.beneficiaryName || 'Pastor Guilherme'),
                updatedAt: job.scheduledAt || new Date().toISOString(),
            };
            store.userSessions[key] = sess;
            reconstructedCount += 1;
        } else if (!store.userSessions[key]) {
            store.userSessions[key] = sess;
        }
        if (jidDigits && jidDigits !== phone && !store.userSessions[`${jBot}:${jidDigits}`]) {
            store.userSessions[`${jBot}:${jidDigits}`] = sess;
        }
    }

    // 2. Enriquecer e reconstruir leads parados na pergunta inicial (USER_REPLY) ou após PIX pelo histórico de mensagens
    const byPhone = new Map();
    for (const m of (store.conversations || [])) {
        const p = String(m.userPhoneNumber || '').replace(/\D/g, '');
        if (!p) continue;
        if (!byPhone.has(p)) byPhone.set(p, []);
        byPhone.get(p).push(m);
    }

    for (const [phone, msgs] of byPhone.entries()) {
        const key = `${botId}:${phone}`;
        const lastUser = [...msgs].reverse().find(m => m.sender === 'USER' && m.userName);
        if (store.userSessions[key]) {
            if (lastUser?.userName && (!store.userSessions[key].userName || store.userSessions[key].userName === 'Cliente')) {
                store.userSessions[key].userName = lastUser.userName;
            }
            continue;
        }

        const hasAsk = msgs.some(m => m.sender === 'BOT' && String(m.messageContent || '').includes('Posso lhe enviar o material'));
        const hasPdf = msgs.some(m => m.sender === 'BOT' && m.messageType === 'PDF');
        const hasPix = msgs.some(m => m.sender === 'BOT' && m.messageType === 'PIX');
        const declined = msgs.some(m => m.sender === 'BOT' && String(m.messageContent || '').includes('Quando desejar receber os materiais'));
        const lastMsg = msgs[msgs.length - 1];
        const { flow, inputNode, verifierNode, pixNode } = resolveFlowHelpers(activeFlowId);
        if (!flow) continue;

        if (hasPix && !hasPdf) {
            // fallback raro: recebeu PIX sem job
        }

        if (hasPix) {
            store.userSessions[key] = {
                botId,
                userJid: phone.length > 13 ? `${phone}@lid` : `${phone}@s.whatsapp.net`,
                userPhone: phone,
                userName: lastUser?.userName || 'Cliente',
                flowId: flow._id,
                flowName: flow.name,
                currentNodeId: verifierNode?.nodeId || 'node_flow_funil_4_12',
                waitingFor: 'PIX_RECEIPT',
                hasReceivedPix: true,
                expectedAmount: Number(verifierNode?.config?.expectedAmount || pixNode?.config?.amount || 20.0),
                latestPixAmount: Number(pixNode?.config?.amount || verifierNode?.config?.expectedAmount || 20.0),
                beneficiary: String(verifierNode?.config?.beneficiary || pixNode?.config?.beneficiaryName || 'Pastor Guilherme'),
                updatedAt: lastMsg?.sentAt || new Date().toISOString(),
            };
            reconstructedCount += 1;
        } else if (hasAsk && !hasPdf && !declined && inputNode) {
            store.userSessions[key] = {
                botId,
                userJid: phone.length > 13 ? `${phone}@lid` : `${phone}@s.whatsapp.net`,
                userPhone: phone,
                userName: lastUser?.userName || 'Cliente',
                flowId: flow._id,
                flowName: flow.name,
                currentNodeId: inputNode.nodeId,
                variableName: inputNode.config?.variableName || 'lead_confirm',
                waitingFor: 'USER_REPLY',
                updatedAt: lastMsg?.sentAt || new Date().toISOString(),
            };
            reconstructedCount += 1;
        }
    }

    return reconstructedCount;
}

function mergeRuntimeState(stateData = {}, options = {}) {
    if (!stateData || typeof stateData !== 'object') return { mergedSessions: 0, mergedJobs: 0, reconstructed: 0 };
    isRestoringRuntimeState = true;
    try {
        let mergedSessions = 0;
        let mergedJobs = 0;

        if (stateData.userSessions && typeof stateData.userSessions === 'object') {
            store.userSessions = store.userSessions || {};
            const cleanIncoming = sanitizeSessionsForBackup(stateData.userSessions);
            for (const [key, sess] of Object.entries(cleanIncoming)) {
                const existing = store.userSessions[key];
                const incTime = new Date(sess.updatedAt || 0).getTime();
                const extTime = new Date(existing?.updatedAt || 0).getTime();
                if (!existing || incTime > extTime) {
                    store.userSessions[key] = sess;
                    mergedSessions += 1;
                }
            }
        }

        if (Array.isArray(stateData.conversations) && stateData.conversations.length > 0) {
            const byId = new Map();
            for (const m of (store.conversations || [])) {
                if (m && m._id) byId.set(m._id, m);
            }
            for (const m of stateData.conversations) {
                if (m && m._id && !byId.has(m._id)) byId.set(m._id, m);
            }
            const mergedMsgs = Array.from(byId.values()).sort((a, b) => new Date(a.sentAt || 0) - new Date(b.sentAt || 0));
            store.conversations = mergedMsgs.slice(-500);
        }

        if (Array.isArray(stateData.scheduledJobs) && stateData.scheduledJobs.length > 0) {
            store.scheduledJobs = store.scheduledJobs || [];
            const seenJobKeys = new Set(
                store.scheduledJobs.map(j => `${j.userPhone}:${j.targetNodeId || ''}:${Boolean(j.isPixTimeout)}`)
            );
            for (const job of stateData.scheduledJobs) {
                const sKey = `${job.botId || 'bot_whatsapp_principal'}:${job.userPhone}`;
                if (store.userSessions?.[sKey]?.paid) continue;
                const dedup = `${job.userPhone}:${job.targetNodeId || ''}:${Boolean(job.isPixTimeout)}`;
                if (!seenJobKeys.has(dedup)) {
                    store.scheduledJobs.push(job);
                    seenJobKeys.add(dedup);
                    mergedJobs += 1;
                }
            }
        }

        if (Array.isArray(stateData.funnelTransactions) && stateData.funnelTransactions.length > 0) {
            const seenTx = new Set((store.funnelTransactions || []).map(t => t.id));
            store.funnelTransactions = store.funnelTransactions || [];
            for (const tx of stateData.funnelTransactions) {
                if (tx?.id && !seenTx.has(tx.id)) {
                    store.funnelTransactions.push(tx);
                    seenTx.add(tx.id);
                }
            }
            store.funnelTransactions.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
        }

        if (stateData.funnelStats && typeof stateData.funnelStats === 'object') {
            store.funnelStats = store.funnelStats || {};
            const inc = stateData.funnelStats;
            for (const k of ['startedCount', 'materialDeliveredCount', 'pixSentCount', 'receiptReceivedCount', 'convertedCount', 'dropOffCount', 'totalRevenue']) {
                if (typeof inc[k] === 'number' && inc[k] > (store.funnelStats[k] || 0)) {
                    store.funnelStats[k] = inc[k];
                }
            }
            if (Array.isArray(inc.recentConversions) && inc.recentConversions.length > (store.funnelStats.recentConversions?.length || 0)) {
                store.funnelStats.recentConversions = inc.recentConversions;
            }
        }

        let reconstructed = 0;
        if (options.reconstructMissingSessions) {
            reconstructed = reconstructMissingSessionsFromHistory('bot_whatsapp_principal');
        }

        saveStore(store);
        return { mergedSessions, mergedJobs, reconstructed };
    } finally {
        isRestoringRuntimeState = false;
    }
}

async function restoreRuntimeStateFromCloudKv(botId = 'bot_whatsapp_principal') {
    try {
        const res = await axios.get(`${CLOUD_WORKER_URL}/api/cloud-kv/runtime-state?botId=${encodeURIComponent(botId)}`, {
            timeout: 7000,
        });
        const kvState = res.data?.state;
        if (kvState && typeof kvState === 'object') {
            const summary = mergeRuntimeState(kvState, { reconstructMissingSessions: false });
            lastRuntimeBackupHash = computeRuntimeHash(buildRuntimeStatePayload(botId));
            console.log(`[Cloud KV Runtime] ☁️ Estado de runtime restaurado do KV (${summary.mergedSessions} sessões, ${summary.mergedJobs} jobs, ${store.conversations?.length || 0} msgs)`);
            return true;
        }
    } catch (err) {
        console.warn('[Cloud KV Runtime] Aviso ao restaurar estado runtime do KV:', err?.message);
    } finally {
        runtimeStateBootRestored = true;
    }
    return false;
}

function saveStore(data) {
    try {
        fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), 'utf-8');
        scheduleCloudKvRuntimeBackup('bot_whatsapp_principal');
    } catch {}
}

const store = loadStore();

function mergeFlowsPreservingNewest(baseFlows = [], candidateFlows = []) {
    if (!Array.isArray(baseFlows) || baseFlows.length === 0) return Array.isArray(candidateFlows) ? candidateFlows : [];
    if (!Array.isArray(candidateFlows) || candidateFlows.length === 0) return baseFlows;

    const mergedMap = new Map();
    for (const bf of baseFlows) {
        if (!bf || !bf._id || bf._id === 'flow_principal') continue;
        mergedMap.set(bf._id, bf);
    }

    for (const cf of candidateFlows) {
        if (!cf || !cf._id || cf._id === 'flow_principal') continue;
        const existing = mergedMap.get(cf._id);
        if (!existing) {
            mergedMap.set(cf._id, cf);
            continue;
        }
        const existingNodes = existing.draftVersion?.flowData?.nodes?.length || 0;
        const candidateNodes = cf.draftVersion?.flowData?.nodes?.length || 0;
        const existingTime = new Date(existing.updatedAt || 0).getTime();
        const candidateTime = new Date(cf.updatedAt || 0).getTime();

        // Nunca permitir que um funil com menos blocos e timestamp mais antigo sobrescreva um funil editado mais completo
        if (candidateNodes > existingNodes) {
            mergedMap.set(cf._id, cf);
        } else if (candidateNodes === existingNodes && candidateTime >= existingTime) {
            mergedMap.set(cf._id, cf);
        } else if (candidateTime > existingTime && candidateNodes >= 20 && existingNodes <= 30) {
            mergedMap.set(cf._id, cf);
        }
    }

    return Array.from(mergedMap.values());
}

let flowsBackupDebounceTimer = null;
function scheduleCloudKvFlowsBackup(botId = 'bot_whatsapp_principal') {
    if (flowsBackupDebounceTimer) clearTimeout(flowsBackupDebounceTimer);
    flowsBackupDebounceTimer = setTimeout(async () => {
        try {
            const currentFlows = store.flows?.[botId];
            if (!Array.isArray(currentFlows) || currentFlows.length === 0) return;
            await axios.post(
                `${CLOUD_WORKER_URL}/api/cloud-kv/flows?botId=${encodeURIComponent(botId)}`,
                { flows: currentFlows },
                { timeout: 8000 }
            );
            console.log(`[Cloud KV Flows] ☁️ Backup de ${currentFlows.length} funis salvo na Cloudflare KV (${botId})`);
        } catch {}
    }, 1500);
}

async function restoreFlowsFromCloudKv(botId = 'bot_whatsapp_principal') {
    try {
        const res = await axios.get(`${CLOUD_WORKER_URL}/api/cloud-kv/flows?botId=${encodeURIComponent(botId)}`, {
            timeout: 6000,
        });
        const kvFlows = res.data?.flows;
        if (Array.isArray(kvFlows) && kvFlows.length > 0) {
            const currentFlows = store.flows[botId] || [];
            const merged = mergeFlowsPreservingNewest(currentFlows, kvFlows);
            store.flows[botId] = merged;
            saveStore(store);
            console.log(`[Cloud KV Flows] ☁️ Funis mesclados/restaurados da Cloudflare KV (Total: ${merged.length} funis)`);
            return true;
        }
    } catch {}
    return false;
}

let funnelModeLocalChanged = false;
async function backupFunnelModeToCloudKv(botId = 'bot_whatsapp_principal') {
    try {
        await axios.post(
            `${CLOUD_WORKER_URL}/api/cloud-kv/mode?botId=${encodeURIComponent(botId)}`,
            {
                singleFunnelMode: Boolean(store.singleFunnelMode),
                activeFunnelId: store.activeFunnelId || 'flow_1794362249148',
                activeFunnelName: store.activeFunnelName || 'Funil 4: Jornada da Bíblia (Cópia)',
            },
            { timeout: 6000 }
        );
    } catch {}
}

async function restoreFunnelModeFromCloudKv(botId = 'bot_whatsapp_principal') {
    try {
        const res = await axios.get(`${CLOUD_WORKER_URL}/api/cloud-kv/mode?botId=${encodeURIComponent(botId)}`, {
            timeout: 6000,
        });
        const kvMode = res.data?.mode;
        if (kvMode && typeof kvMode === 'object' && !funnelModeLocalChanged) {
            store.singleFunnelMode = Boolean(kvMode.singleFunnelMode);
            if (kvMode.activeFunnelId) store.activeFunnelId = kvMode.activeFunnelId;
            if (kvMode.activeFunnelName) store.activeFunnelName = kvMode.activeFunnelName;
            saveStore(store);
            console.log(`[Cloud KV Mode] 🎯 Modo Funil Único restaurado: ${store.singleFunnelMode ? 'ATIVO' : 'DESATIVADO'} -> ${store.activeFunnelId}`);
            return true;
        }
    } catch {}
    return false;
}

// Carregar automaticamente os funis visuais ricos preservando sempre a versão mais recente/completa
try {
    const defFlowsPath = path.join(__dirname, 'default_flows.json');
    if (fs.existsSync(defFlowsPath)) {
        const defFlows = JSON.parse(fs.readFileSync(defFlowsPath, 'utf-8'));
        const currentFlows = (store.flows['bot_whatsapp_principal'] || []).filter(f => f._id !== 'flow_principal');
        const mergedFlows = mergeFlowsPreservingNewest(defFlows, currentFlows);
        for (const f of mergedFlows) {
            for (const n of (f.draftVersion?.flowData?.nodes || [])) {
                if ((n.nodeType || '').toUpperCase() === 'PIX') {
                    n.config = n.config || {};
                    const rawK = String(n.config.pixKey || n.config.copyPasteCode || '').trim();
                    if (rawK.includes('@')) {
                        n.config.pixKeyType = 'EMAIL';
                        n.config.keyType = 'EMAIL';
                    } else if (rawK.replace(/\D/g, '').length === 14) {
                        n.config.pixKeyType = 'CNPJ';
                        n.config.keyType = 'CNPJ';
                    } else if (/^[1-9]{2}9\d{8}$/.test(rawK.replace(/\D/g, ''))) {
                        n.config.pixKeyType = 'PHONE';
                        n.config.keyType = 'PHONE';
                    }
                }
            }
        }
        store.flows['bot_whatsapp_principal'] = mergedFlows;
        store.flows_schema_version = 'v12_preserved_live_20261112';
        if (typeof store.singleFunnelMode === 'undefined') {
            store.singleFunnelMode = true;
            store.activeFunnelId = store.activeFunnelId || 'flow_1794362249148';
            store.activeFunnelName = store.activeFunnelName || 'Funil 4: Jornada da Bíblia - João Antônio (Gatilho: teste4_copia) - 82 99689-8259 (Cópia)';
        }
        saveStore(store);
        console.log(`[Store Init] 🚀 Funis Visuais V12 Carregados com Preservação Anti-Perda (Total: ${store.flows['bot_whatsapp_principal'].length} funis)!`);
    }
    restoreFunnelModeFromCloudKv('bot_whatsapp_principal').catch(() => {});
    restoreFlowsFromCloudKv('bot_whatsapp_principal').then(() => {
        scheduleCloudKvFlowsBackup('bot_whatsapp_principal');
    }).catch(() => {});
    restoreRuntimeStateFromCloudKv('bot_whatsapp_principal').catch(() => {});
} catch (err) {
    console.warn('[Store Init] Aviso ao carregar default_flows.json:', err?.message);
}
const activeSockets = new Map();
const sessionStates = new Map();
const reconnectTimers = new Map();
const logger = pino({ level: 'warn' });

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
        // NUNCA sobrescrever store.flows[botId] pelo heartbeat do KV, pois o frontend
        // sincroniza diretamente com o Render via /whatsapp/qr/sync e /flows/:flowId/draft.
        if (data?.flows && Array.isArray(data.flows) && data.flows.length > 0 && (!store.flows[botId] || store.flows[botId].length === 0)) {
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

// ============================================================
// HELPER UNIVERSAL: ENVIO DE NOTA DE VOZ (PTT) COMPATÍVEL COM iOS & ANDROID
// ============================================================
// No WhatsApp iOS (iPhone), notas de voz PTT EXIGEM estritamente OGG Opus (audio/ogg; codecs=opus).
// O envio de áudio MP3 com mimetype 'audio/mpeg' e ptt: true causa o erro:
// "Não foi possível baixar o áudio. Tente novamente." no WhatsApp do iPhone.
async function sendPttVoiceNote(sock, remoteJid, filePath, botId = null, userPhone = null, label = 'Áudio PTT', quoteOptions = {}) {
    const baseWithoutExt = filePath.replace(/\.(mp3|ogg)$/i, '');
    const oggPath = `${baseWithoutExt}.ogg`;
    const mp3Path = `${baseWithoutExt}.mp3`;

    let targetPath = null;
    let mimetype = 'audio/ogg; codecs=opus';

    if (fs.existsSync(oggPath)) {
        targetPath = oggPath;
        mimetype = 'audio/ogg; codecs=opus';
    } else if (fs.existsSync(mp3Path)) {
        targetPath = mp3Path;
        mimetype = 'audio/mpeg';
    } else if (fs.existsSync(filePath)) {
        targetPath = filePath;
        mimetype = filePath.endsWith('.ogg') ? 'audio/ogg; codecs=opus' : 'audio/mpeg';
    }

    if (!targetPath) {
        console.warn(`[sendPttVoiceNote] ⚠️ Arquivo de áudio não encontrado: ${filePath}`);
        return false;
    }

    const audioBuffer = fs.readFileSync(targetPath);
    const isOgg = targetPath.endsWith('.ogg');

    return safeDispatchBlock({
        sock,
        remoteJid,
        blockType: 'AUDIO',
        description: `${label} (${isOgg ? 'OGG Opus' : 'MP3'})`,
        botId: botId || 'bot_whatsapp_principal',
        userPhone: userPhone || '',
        timeoutMs: 30000,
        sendAction: async (activeSock) => {
            const targetSock = activeSock || sock;
            const sent = await targetSock.sendMessage(remoteJid, {
                audio: audioBuffer,
                mimetype,
                ptt: true,
                seconds: quoteOptions.seconds || 46
            }, quoteOptions);
            if (botId && userPhone) {
                logConversation(botId, userPhone, 'BOT', 'AUDIO', `🎙️ [${label} (${isOgg ? 'OGG Opus' : 'MP3'})]`);
            }
            console.log(`[sendPttVoiceNote] 🎙️ ${label} enviado com sucesso (${isOgg ? 'OGG Opus 100% iOS/Android' : 'MP3'}) para ${userPhone || remoteJid}`);
            return sent;
        }
    });
}

function resolvePttAudio(audioPath) {
    if (!audioPath) return null;
    const base = audioPath.replace(/\.(mp3|ogg)$/i, '');
    const oggPath = `${base}.ogg`;
    const mp3Path = `${base}.mp3`;
    if (fs.existsSync(oggPath)) {
        return {
            buffer: fs.readFileSync(oggPath),
            mimetype: 'audio/ogg; codecs=opus',
            path: oggPath,
            isOgg: true
        };
    }
    if (fs.existsSync(mp3Path)) {
        return {
            buffer: fs.readFileSync(mp3Path),
            mimetype: 'audio/mpeg',
            path: mp3Path,
            isOgg: false
        };
    }
    if (fs.existsSync(audioPath)) {
        return {
            buffer: fs.readFileSync(audioPath),
            mimetype: audioPath.endsWith('.ogg') ? 'audio/ogg; codecs=opus' : 'audio/mpeg',
            path: audioPath,
            isOgg: audioPath.endsWith('.ogg')
        };
    }
    return null;
}

// ============================================================
// HELPER UNIVERSAL: CARTÃO PIX NATIVO (payment_info / pix_static_code)
// COMPATÍVEL COM TODOS OS iPHONES (iOS), ANDROIDS E WHATSAPP WEB
// Baseado no padrão oficial Evolution API PR #2742 & Zapo raw-sends
// ============================================================
const sentMessagesCache = new Map();
function cacheSentMessage(msgId, messageObj) {
    if (!msgId || !messageObj) return;
    sentMessagesCache.set(msgId, messageObj);
    if (sentMessagesCache.size > 500) {
        const firstKey = sentMessagesCache.keys().next().value;
        if (firstKey) sentMessagesCache.delete(firstKey);
    }
}

const pixDeliveryTracker = new Map();
const recentReceiptEvents = [];
function pushReceiptEvent(event) {
    recentReceiptEvents.push({
        at: new Date().toISOString(),
        ...event
    });
    if (recentReceiptEvents.length > 60) {
        recentReceiptEvents.shift();
    }
}

function collectReceiptItemIds(node) {
    const attrs = node?.attrs || {};
    const ids = new Set();
    if (attrs.id) ids.add(String(attrs.id));
    const walk = (children) => {
        if (!Array.isArray(children)) return;
        for (const child of children) {
            if (child?.tag === 'item' && child?.attrs?.id) {
                ids.add(String(child.attrs.id));
            }
            if (Array.isArray(child?.content)) {
                walk(child.content);
            }
        }
    };
    walk(node?.content);
    return Array.from(ids);
}

function trackPixMessage(msgId, meta = {}) {
    if (!msgId) return;
    pixDeliveryTracker.set(msgId, {
        messageId: msgId,
        status: 'RELAYED',
        statusCode: null,
        error: null,
        stanzaAck: null,
        receipts: [],
        sentAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...meta
    });
    if (pixDeliveryTracker.size > 200) {
        const oldestKey = pixDeliveryTracker.keys().next().value;
        if (oldestKey) pixDeliveryTracker.delete(oldestKey);
    }
}

const WA_STATUS_LABELS = {
    0: 'ERROR',
    1: 'PENDING',
    2: 'SERVER_ACK',
    3: 'DELIVERY_ACK',
    4: 'READ',
    5: 'PLAYED'
};

function updateTrackedPixStatus(msgId, statusCode, stubParams = []) {
    if (!msgId || !pixDeliveryTracker.has(msgId)) return;
    const entry = pixDeliveryTracker.get(msgId);
    entry.statusCode = typeof statusCode === 'number' ? statusCode : entry.statusCode;
    entry.status = WA_STATUS_LABELS[statusCode] || `STATUS_${statusCode}`;
    if (Array.isArray(stubParams) && stubParams.length > 0) {
        entry.error = stubParams.join(' | ');
    }
    entry.updatedAt = new Date().toISOString();
    const logFn = statusCode === 0 ? console.error : console.log;
    logFn(`[PIX Delivery Tracker] 📡 msg=${msgId} para ${entry.remoteJid} -> ${entry.status}${entry.error ? ` (erro: ${entry.error})` : ''}`);
}

function updateTrackedPixFromReceipt(msgId, receipt = {}) {
    if (!msgId || !pixDeliveryTracker.has(msgId)) return;
    const entry = pixDeliveryTracker.get(msgId);
    const nextCode = receipt.playedTimestamp
        ? 5
        : receipt.readTimestamp
          ? 4
          : receipt.receiptTimestamp
            ? 3
            : null;
    if (nextCode !== null && (entry.statusCode == null || entry.statusCode < nextCode)) {
        entry.statusCode = nextCode;
        entry.status = WA_STATUS_LABELS[nextCode] || `STATUS_${nextCode}`;
    }
    entry.receipts.push({
        at: new Date().toISOString(),
        source: 'message-receipt.update',
        userJid: receipt.userJid || null,
        receiptTimestamp: receipt.receiptTimestamp || null,
        readTimestamp: receipt.readTimestamp || null,
        playedTimestamp: receipt.playedTimestamp || null,
        pendingDeviceJid: receipt.pendingDeviceJid || null
    });
    entry.updatedAt = new Date().toISOString();
    console.log(`[PIX Receipt Update] 📬 msg=${msgId} para ${entry.remoteJid} -> ${entry.status} (${JSON.stringify(receipt)})`);
}

function recordPixStanzaEvent(msgId, kind, attrs = {}) {
    if (!msgId || !pixDeliveryTracker.has(msgId)) return;
    const entry = pixDeliveryTracker.get(msgId);
    const snapshot = {
        at: new Date().toISOString(),
        from: attrs.from || null,
        participant: attrs.participant || null,
        type: attrs.type || null,
        error: attrs.error || null,
        phash: attrs.phash || null,
        t: attrs.t || null
    };
    if (kind === 'ack') {
        entry.stanzaAck = snapshot;
        if (attrs.error) {
            entry.status = 'ERROR';
            entry.statusCode = 0;
            entry.error = String(attrs.error);
        } else if (entry.status === 'RELAYED') {
            entry.status = 'SERVER_ACK';
            entry.statusCode = 2;
        }
        console.log(`[PIX Stanza ACK] msg=${msgId} para ${entry.remoteJid} -> ack=${JSON.stringify(snapshot)}`);
    } else if (kind === 'receipt') {
        entry.receipts.push(snapshot);
        if (!attrs.type && (entry.statusCode == null || entry.statusCode < 3)) {
            entry.status = 'DELIVERY_ACK';
            entry.statusCode = 3;
        } else if (attrs.type === 'read' || attrs.type === 'read-self') {
            entry.status = 'READ';
            entry.statusCode = 4;
        }
        console.log(`[PIX Stanza RECEIPT] msg=${msgId} para ${entry.remoteJid} -> receipt=${JSON.stringify(snapshot)}`);
    }
    entry.updatedAt = snapshot.at;
}

function resolvePixKeyType(rawKey, configuredType = '') {
    const key = String(rawKey || '').trim();
    const cfg = String(configuredType || '').trim().toUpperCase();

    // 1. E-mail (contém @)
    if (key.includes('@')) {
        return 'EMAIL';
    }

    // 2. Chave Aleatória EVP (UUID 8-4-4-4-12 ou código EMV 000201...)
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key) || key.startsWith('000201')) {
        return 'EVP';
    }

    // 3. Máscara explícita de CPF (XXX.XXX.XXX-XX)
    if (/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(key)) {
        return 'CPF';
    }

    const digits = key.replace(/\D/g, '');

    // 4. CNPJ (14 dígitos ou máscara XX.XXX.XXX/XXXX-XX)
    if (digits.length === 14 || /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(key)) {
        return 'CNPJ';
    }

    // 5. Telefone internacional (+55... ou 12-13 dígitos começando com 55)
    if (key.startsWith('+') || ((digits.length === 12 || digits.length === 13) && digits.startsWith('55'))) {
        return 'PHONE';
    }

    // 6. Se tiver 11 dígitos (DDD + 9 + 8 dígitos de celular ou CPF sem máscara)
    if (digits.length === 11) {
        if (['PHONE', 'TELEFONE', 'CELULAR'].includes(cfg)) return 'PHONE';
        if (cfg === 'CPF' && !/^[1-9]{2}9\d{8}$/.test(digits)) return 'CPF';
        if (/^[1-9]{2}9\d{8}$/.test(digits)) return 'PHONE';
        return 'CPF';
    }

    // 7. Fallback pelo tipo configurado
    if (['EMAIL', 'E-MAIL'].includes(cfg)) return 'EMAIL';
    if (cfg === 'CNPJ') return 'CNPJ';
    if (['PHONE', 'TELEFONE', 'CELULAR'].includes(cfg)) return 'PHONE';
    if (['EVP', 'RANDOM', 'ALEATORIA', 'ALEATÓRIA'].includes(cfg)) return 'EVP';
    return 'CPF';
}

const DEFAULT_PIX_VARIANT = 'attr_only_no_bot';

function parsePixVariant(variant = DEFAULT_PIX_VARIANT, noBotOverride = undefined) {
    const raw = String(variant || DEFAULT_PIX_VARIANT).trim().toLowerCase();
    const baseVariant = raw.replace(/_(no_bot|with_bot)$/, '') || 'default';
    const noBotByVariant = raw.endsWith('_no_bot') || (['zapo', 'minimal'].includes(baseVariant) && !raw.endsWith('_with_bot'));
    const noBot = typeof noBotOverride === 'boolean' ? noBotOverride : noBotByVariant;
    const useAttrOnlyBiz = ['attr_only', 'zapo', 'minimal'].includes(baseVariant);
    return { rawVariant: raw, baseVariant, noBot, useAttrOnlyBiz };
}

function buildPixBizNodes(remoteJid = '', variant = DEFAULT_PIX_VARIANT, noBotOverride = undefined) {
    const { useAttrOnlyBiz, noBot } = parsePixVariant(variant, noBotOverride);
    const bizNode = useAttrOnlyBiz
        ? {
            tag: 'biz',
            attrs: { native_flow_name: 'payment_info' }
        }
        : {
            tag: 'biz',
            attrs: {},
            content: [
                {
                    tag: 'interactive',
                    attrs: { type: 'native_flow', v: '1' },
                    content: [{ tag: 'native_flow', attrs: { name: 'payment_info' } }]
                }
            ]
        };

    const nodes = [bizNode];
    if (!noBot && remoteJid && !/@(g\.us|newsletter|broadcast)$/.test(String(remoteJid))) {
        nodes.push({ tag: 'bot', attrs: { biz_bot: '1' } });
    }
    return nodes;
}

function buildPixInteractiveMessage({
    beneficiaryName,
    pixKey,
    copyCode,
    amount,
    footerText = '',
    configuredKeyType = '',
    variant = DEFAULT_PIX_VARIANT
}) {
    const { baseVariant } = parsePixVariant(variant);
    const cleanPixKey = String(pixKey || '').trim();
    const cleanCopyCode = String(copyCode || cleanPixKey).trim();
    const cleanBeneficiary = String(beneficiaryName || 'Pastor Guilherme').trim();
    const resolvedKeyType = resolvePixKeyType(cleanCopyCode || cleanPixKey, configuredKeyType);

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let referenceId = '';
    for (let i = 0; i < 11; i++) {
        referenceId += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const useWaJsOrder = baseVariant === 'wa_js';
    const isMinimal = baseVariant === 'minimal';
    const isZapo = baseVariant === 'zapo';
    const paymentPayload = isMinimal
        ? {
              payment_settings: [
                  {
                      type: 'pix_static_code',
                      pix_static_code: {
                          merchant_name: cleanBeneficiary,
                          key: cleanCopyCode,
                          key_type: resolvedKeyType
                      }
                  }
              ]
          }
        : {
              currency: 'BRL',
              total_amount: { value: 0, offset: useWaJsOrder ? 1 : 100 },
              reference_id: referenceId,
              type: 'physical-goods',
              order: {
                  status: useWaJsOrder ? 'payment_requested' : 'pending',
                  subtotal: { value: 0, offset: useWaJsOrder ? 1 : 100 },
                  order_type: useWaJsOrder ? 'ORDER_WITHOUT_AMOUNT' : 'ORDER',
                  items: [
                      {
                          name: '',
                          ...(useWaJsOrder ? { retailer_id: `custom-item-${referenceId}` } : { sale_amount: { value: 0, offset: 100 } }),
                          amount: { value: 0, offset: useWaJsOrder ? 1 : 100 },
                          quantity: 0
                      }
                  ]
              },
              payment_settings: [
                  {
                      type: 'pix_static_code',
                      pix_static_code: {
                          merchant_name: cleanBeneficiary,
                          key: cleanCopyCode,
                          key_type: resolvedKeyType
                      }
                  },
                  ...(useWaJsOrder ? [{ type: 'cards', cards: { enabled: false } }] : [])
              ],
              ...(useWaJsOrder
                  ? {
                        external_payment_configurations: [
                            { payment_instruction: String(footerText || ''), type: 'payment_instruction' }
                        ],
                        additional_note: ''
                    }
                  : {
                        share_payment_status: false,
                        ...(isZapo ? { is_soft_deleted: false, referral: 'chat_attachment' } : {})
                    })
          };

    const nativeFlowMessage = {
        buttons: [
            {
                name: 'payment_info',
                buttonParamsJson: JSON.stringify(paymentPayload)
            }
        ],
        ...(!isZapo && !isMinimal
            ? { messageParamsJson: JSON.stringify({ native_flow_name: 'order_details', version: 1 }) }
            : {}),
        messageVersion: 1
    };

    const interactiveMessage = {
        ...(baseVariant === 'with_body' && cleanBeneficiary
            ? {
                  body: {
                      text: amount
                          ? `*${cleanBeneficiary}*\nChave: ${cleanPixKey}\n💰 *Valor:* R$ ${amount}`
                          : `*${cleanBeneficiary}*\nChave: ${cleanPixKey}`
                  }
              }
            : isMinimal
              ? { body: { text: '' } }
              : {}),
        nativeFlowMessage
    };

    const message = {
        interactiveMessage,
        messageContextInfo: {
            messageSecret: crypto.randomBytes(32)
        }
    };

    return { message, cleanBeneficiary, cleanPixKey, cleanCopyCode, resolvedKeyType, referenceId };
}

async function sendUniversalPixCopyCard({
    sock,
    remoteJid,
    beneficiaryName,
    pixKey,
    copyCode,
    amount,
    footerText = '',
    configuredKeyType = '',
    botId = 'bot_whatsapp_principal',
    userPhone = '',
    variant = DEFAULT_PIX_VARIANT,
    noBot = undefined
}) {
    const activeSock = activeSockets.get(botId) || sock;
    if (!activeSock || typeof activeSock.relayMessage !== 'function' || !proto || !generateWAMessageFromContent) {
        return false;
    }

    const { noBot: effectiveNoBot } = parsePixVariant(variant, noBot);
    const { message, cleanBeneficiary, cleanPixKey, resolvedKeyType } = buildPixInteractiveMessage({
        beneficiaryName,
        pixKey,
        copyCode,
        amount,
        footerText,
        configuredKeyType,
        variant
    });

    return safeDispatchBlock({
        sock: activeSock,
        remoteJid,
        blockType: 'PIX_CARD',
        description: `Cartão Pix Nativo (${cleanBeneficiary} | ${cleanPixKey})`,
        botId,
        userPhone,
        sendAction: async (currentSock) => {
            const targetSock = currentSock || activeSockets.get(botId) || activeSock;
            const userJid = targetSock.authState?.creds?.me?.id || targetSock.user?.id;
            const generatedMsgId = typeof generateMessageIDV2 === 'function' ? generateMessageIDV2(userJid) : undefined;
            const waMessage = generateWAMessageFromContent(
                remoteJid,
                message,
                {
                    userJid,
                    timestamp: new Date(),
                    ...(generatedMsgId ? { messageId: generatedMsgId } : {})
                }
            );

            const bizNodes = buildPixBizNodes(remoteJid, variant, noBot);
            cacheSentMessage(waMessage.key.id, waMessage.message);
            trackPixMessage(waMessage.key.id, {
                remoteJid,
                keyType: resolvedKeyType,
                pixKey: cleanPixKey,
                beneficiary: cleanBeneficiary,
                variant,
                noBot: effectiveNoBot,
                bizNodes
            });

            await targetSock.relayMessage(remoteJid, waMessage.message, {
                messageId: waMessage.key.id,
                additionalNodes: bizNodes
            });

            console.log(`[PIX Card Universal] ✅ Cartão Pix Nativo Oficial (payment_info | variant=${variant} | noBot=${effectiveNoBot} | ${cleanBeneficiary} | ${cleanPixKey} | ${resolvedKeyType} | msg=${waMessage.key.id}) enviado para ${remoteJid}`);
            return { messageId: waMessage.key.id, keyType: resolvedKeyType, variant, noBot: effectiveNoBot, remoteJid };
        }
    });
}

// ============================================================
// DESPACHANTE RESILIENTE UNIVERSAL: CONFERÊNCIA ULTRA RÁPIDA,
// RETRY AUTOMÁTICO E NOTIFICAÇÕES PUSH DUPLAS NO NTFY (FALHA + RECUPERAÇÃO)
// ============================================================
async function safeDispatchBlock({
    sock,
    remoteJid,
    blockType,
    description,
    sendAction,
    botId = 'bot_whatsapp_principal',
    userPhone = '',
    maxRetries = 5,
    timeoutMs = 12000,
    baseBackoffMs = 1500
}) {
    let attempt = 0;
    let hadError = false;
    let lastErr = null;
    const phoneLabel = userPhone || (remoteJid ? String(remoteJid).replace(/[^0-9]/g, '') : 'Lead');

    while (attempt < maxRetries) {
        attempt++;
        try {
            const currentSock = activeSockets.get(botId) || sock;
            let timer;
            const timeoutPromise = new Promise((_, reject) => {
                timer = setTimeout(() => {
                    reject(new Error(`Timeout de entrega (${timeoutMs / 1000}s) excedido para ${blockType}`));
                }, timeoutMs);
            });

            const sendPromise = Promise.resolve().then(() => sendAction(currentSock));
            const result = await Promise.race([sendPromise, timeoutPromise]);
            clearTimeout(timer);

            if (result === false) {
                throw new Error(`Falha reportada na ação de envio do ${blockType}`);
            }

            // Se houve falha anterior e agora deu certo: DISPARA ALERTA DE RECUPERAÇÃO NO NTFY!
            if (hadError) {
                console.log(`[SafeDispatch] 🎉 [${blockType}] Recuperado com sucesso na tentativa ${attempt}/${maxRetries} para ${phoneLabel}!`);
                sendNtfyEmergencyAlert({
                    title: `✅ RECUPERADO COM SUCESSO: ${blockType.toUpperCase()}`,
                    message: `🎉 O item [${blockType}] "${description}" foi reenviado e CONFIRMADO com sucesso para ${phoneLabel} na tentativa ${attempt}!
O funil retomou normalmente sem perder nenhuma mensagem.`,
                    priority: 'default',
                    tags: 'white_check_mark,tada,repeat',
                    alertKey: `recov_${blockType}_${phoneLabel}`,
                    cooldownSec: 10
                }).catch(() => {});
            } else {
                console.log(`[SafeDispatch] ⚡ [${blockType}] Conferência instantânea OK (tentativa ${attempt}) para ${phoneLabel}: "${description}"`);
            }

            return result || true;
        } catch (err) {
            lastErr = err;
            hadError = true;
            console.warn(`[SafeDispatch] ⚠️ Falha na tentativa ${attempt}/${maxRetries} ao enviar ${blockType} (${description}) para ${phoneLabel}:`, err?.message || err);

            // Disparo de alerta de erro no ntfy na primeira falha imediata
            if (attempt === 1) {
                sendNtfyEmergencyAlert({
                    title: `⚠️ ERRO DE ENVIO NO FUNIL: ${blockType.toUpperCase()}`,
                    message: `🚨 Falha ao enviar [${blockType}] "${description}" para o lead ${phoneLabel}!
Erro: ${err?.message || 'Falha de entrega'}
⏳ Reenviando automaticamente agora (Tentativa 1/${maxRetries})...`,
                    priority: 'high',
                    tags: 'warning,repeat,rotating_light',
                    alertKey: `err_${blockType}_${phoneLabel}`,
                    cooldownSec: 30
                }).catch(() => {});
            }

            if (attempt < maxRetries) {
                const waitTime = baseBackoffMs * attempt;
                console.log(`[SafeDispatch] ⏳ Aguardando ${waitTime}ms antes da tentativa ${attempt + 1}/${maxRetries}...`);
                await new Promise((r) => setTimeout(r, waitTime));
            }
        }
    }

    // Se esgotou todas as tentativas, alerta crítico no ntfy
    sendNtfyEmergencyAlert({
        title: `🚨 FALHA CRÍTICA DE ENVIO: ${blockType.toUpperCase()}`,
        message: `❌ Esgotadas ${maxRetries} tentativas de envio do [${blockType}] "${description}" para ${phoneLabel}!
Último erro: ${lastErr?.message}
⚠️ O funil foi pausado neste ponto para evitar mensagens incompletas ao lead.`,
        priority: 'urgent',
        tags: 'rotating_light,skull,no_entry',
        alertKey: `crit_${blockType}_${phoneLabel}`,
        cooldownSec: 60
    }).catch(() => {});

    throw new Error(`Falha definitiva ao enviar ${blockType} após ${maxRetries} tentativas: ${lastErr?.message}`);
}

async function sendSafeDocument(sock, remoteJid, buffer, fileName, caption = undefined, botId = 'bot_whatsapp_principal', userPhone = '', description = '') {
    const desc = description || `Documento: ${fileName}`;
    return safeDispatchBlock({
        sock,
        remoteJid,
        blockType: 'PDF',
        description: desc,
        botId,
        userPhone,
        timeoutMs: 45000,
        sendAction: async (currentSock) => {
            const targetSock = currentSock || sock;
            const sent = await targetSock.sendMessage(remoteJid, {
                document: buffer,
                fileName,
                mimetype: 'application/pdf',
                caption: caption || undefined,
            });
            if (botId && userPhone) {
                logConversation(botId, userPhone, 'BOT', 'DOCUMENT', `📄 [${desc}]`);
            }
            console.log(`[SafeDispatch] 📄 Documento enviado com sucesso para ${userPhone || remoteJid}: ${fileName}`);
            return sent;
        }
    });
}

async function sendSafeImage(sock, remoteJid, buffer, caption = undefined, botId = 'bot_whatsapp_principal', userPhone = '', description = '') {
    const desc = description || 'Imagem';
    return safeDispatchBlock({
        sock,
        remoteJid,
        blockType: 'IMAGE',
        description: desc,
        botId,
        userPhone,
        sendAction: async (currentSock) => {
            const targetSock = currentSock || sock;
            const sent = await targetSock.sendMessage(remoteJid, {
                image: buffer,
                caption: caption || undefined,
            });
            if (botId && userPhone) {
                logConversation(botId, userPhone, 'BOT', 'IMAGE', `🖼️ [${desc}]`);
            }
            console.log(`[SafeDispatch] 🖼️ Imagem enviada com sucesso para ${userPhone || remoteJid}: ${desc}`);
            return sent;
        }
    });
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

        // Limpa sessões de destinatários com erro "Bad MAC" residual em disco antes de iniciar
        try {
            const existingFiles = fs.readdirSync(sessionFolder);
            for (const f of existingFiles) {
                if ((f.startsWith('session-53128913264771') || f.startsWith('session-202671302688975')) && f.endsWith('.json')) {
                    fs.unlinkSync(path.join(sessionFolder, f));
                }
            }
        } catch {}

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
            getMessage: async (key) => {
                if (key?.id && sentMessagesCache.has(key.id)) {
                    return sentMessagesCache.get(key.id);
                }
                return undefined;
            },
        });

        // Garante que qualquer reenvio automático (retry receipt) de mensagem interativa mantenha o nó <biz native_flow_name="payment_info"/> (sem <bot biz_bot="1"/>)
        const origRelayMessage = sock.relayMessage.bind(sock);
        sock.relayMessage = async (jid, message, opts = {}) => {
            if (opts?.messageId && message) {
                cacheSentMessage(opts.messageId, message);
            }
            if (message?.interactiveMessage && (!opts?.additionalNodes || opts.additionalNodes.length === 0)) {
                const firstBtn = message.interactiveMessage?.nativeFlowMessage?.buttons?.[0]?.name;
                if (!firstBtn || firstBtn === 'payment_info') {
                    opts = { ...opts, additionalNodes: buildPixBizNodes(jid, DEFAULT_PIX_VARIANT) };
                }
            }
            return origRelayMessage(jid, message, opts);
        };

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
                    sendNtfyEmergencyAlert({
                        title: '⚠️ ALERTA X1: WHATSAPP AGUARDANDO QR CODE',
                        message: `⚠️ O WhatsApp do bot (+55 11 5229-1989) está aguardando leitura de QR Code!\nPAUSE OS ANÚNCIOS NO META ADS até reconectar.`,
                        priority: 'urgent',
                        tags: 'warning,qr_code',
                        alertKey: 'wa_qr_ready',
                        cooldownSec: 300
                    }).catch(() => {});
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
                const errMessage = lastDisconnect?.error?.message || '';
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                activeSockets.delete(botId);

                const isForbidden = statusCode === 403 || statusCode === DisconnectReason.forbidden || /forbidden|banned|block/i.test(errMessage);
                if (isForbidden) {
                    console.error('[QR Engine] 🚨 ERRO 403 FORBIDDEN / BANIMENTO DETECTADO:', lastDisconnect?.error);
                    sendNtfyEmergencyAlert({
                        title: '🚨 ALERTA MÁXIMO: NÚMERO BANIDO OU BLOQUEADO (403)!',
                        message: `⚠️ O número do WhatsApp (+55 11 5229-1989) recebeu status 403 FORBIDDEN (Possível restrição/banimento pelo WhatsApp)!\nDetalhe: ${errMessage || statusCode}\nPAUSE OS ANÚNCIOS NO META ADS IMEDIATAMENTE e abra o app físico do WhatsApp no aparelho!`,
                        priority: 'max',
                        tags: 'rotating_light,skull,no_entry',
                        alertKey: 'wa_forbidden_403',
                        cooldownSec: 60
                    }).catch(() => {});
                }

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
                    sendNtfyEmergencyAlert({
                        title: '🚨 ALERTA CRÍTICO: WHATSAPP DESLOGADO!',
                        message: `⚠️ O WhatsApp do bot (+55 11 5229-1989) foi DESLOGADO pelo aparelho!\nPAUSE OS ANÚNCIOS NO META ADS IMEDIATAMENTE até gerar um novo QR Code!`,
                        priority: 'max',
                        tags: 'rotating_light,no_entry,warning',
                        alertKey: 'wa_logged_out',
                        cooldownSec: 60
                    }).catch(() => {});
                } else if (shouldReconnect) {
                    const timer = setTimeout(() => {
                        startQrSession(botId, false).catch(console.error);
                    }, 2500);
                    reconnectTimers.set(botId, timer);
                }
            }
        });

        sock.ws?.on('CB:ack,class:message', (node) => {
            try {
                const attrs = node?.attrs || {};
                if (attrs.id) {
                    recordPixStanzaEvent(attrs.id, 'ack', attrs);
                    if (attrs.error || pixDeliveryTracker.has(attrs.id)) {
                        pushReceiptEvent({
                            source: 'CB:ack',
                            msgId: attrs.id,
                            from: attrs.from || null,
                            type: attrs.type || null,
                            error: attrs.error || null,
                            tracked: pixDeliveryTracker.has(attrs.id)
                        });
                    }
                    if (attrs.error) {
                        console.error(`[WA STANZA ACK ERROR] msg=${attrs.id} from=${attrs.from} error=${attrs.error}`);
                    }
                }
            } catch {}
        });

        sock.ws?.on('CB:receipt', (node) => {
            try {
                const attrs = node?.attrs || {};
                const ids = collectReceiptItemIds(node);
                pushReceiptEvent({
                    source: 'CB:receipt',
                    msgIds: ids,
                    from: attrs.from || null,
                    participant: attrs.participant || null,
                    type: attrs.type || null,
                    error: attrs.error || null,
                    tracked: ids.some((id) => pixDeliveryTracker.has(id))
                });
                for (const id of ids) {
                    recordPixStanzaEvent(id, 'receipt', attrs);
                }
            } catch {}
        });

        sock.ev.on('message-receipt.update', (updates) => {
            try {
                for (const u of updates || []) {
                    const msgId = u?.key?.id || null;
                    const remoteJid = u?.key?.remoteJid || null;
                    const receipt = u?.receipt || {};
                    const isTracked = Boolean(msgId && pixDeliveryTracker.has(msgId));
                    pushReceiptEvent({
                        source: 'message-receipt.update',
                        msgId,
                        remoteJid,
                        fromMe: Boolean(u?.key?.fromMe),
                        userJid: receipt.userJid || null,
                        receiptTimestamp: receipt.receiptTimestamp || null,
                        readTimestamp: receipt.readTimestamp || null,
                        playedTimestamp: receipt.playedTimestamp || null,
                        pendingDeviceJid: receipt.pendingDeviceJid || null,
                        tracked: isTracked
                    });
                    if (isTracked) {
                        updateTrackedPixFromReceipt(msgId, receipt);
                    }
                }
            } catch {}
        });

        sock.ev.on('messages.update', (updates) => {
            try {
                for (const u of updates || []) {
                    const msgId = u?.key?.id;
                    const statusCode = u?.update?.status;
                    const stubParams = u?.update?.messageStubParameters;
                    const isTracked = Boolean(msgId && pixDeliveryTracker.has(msgId));
                    if (msgId && typeof statusCode === 'number') {
                        updateTrackedPixStatus(msgId, statusCode, stubParams);
                        if (isTracked || statusCode === 0 || statusCode >= 3) {
                            pushReceiptEvent({
                                source: 'messages.update',
                                msgId,
                                remoteJid: u?.key?.remoteJid || null,
                                fromMe: Boolean(u?.key?.fromMe),
                                statusCode,
                                status: WA_STATUS_LABELS[statusCode] || `STATUS_${statusCode}`,
                                error: Array.isArray(stubParams) && stubParams.length > 0 ? stubParams.join(' | ') : null,
                                tracked: isTracked
                            });
                        }
                    }
                    if (statusCode === 0 && msgId && !pixDeliveryTracker.has(msgId)) {
                        console.warn(`[WA ACK ERROR] msg=${msgId} para ${u?.key?.remoteJid} -> erro: ${(stubParams || []).join(' | ')}`);
                    }
                }
            } catch {}
        });

        sock.ev.on('messages.upsert', async (event) => {
            // Processa tanto 'notify' quanto 'append' (mensagens acumuladas durante reconexão)
            for (const msg of event.messages) {
                try {
                    // Ignora apenas mensagens antigas de histórico histórico (> 24h)
                    const msgTimestamp = msg.messageTimestamp ? Number(msg.messageTimestamp) * 1000 : Date.now();
                    if (Date.now() - msgTimestamp > 24 * 60 * 60 * 1000) {
                        continue;
                    }
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
                        const audioData = resolvePttAudio(mp3Path);
                        if (audioData) await sock.sendMessage(remoteJid, { audio: audioData.buffer, mimetype: audioData.mimetype, ptt: true });
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
                        const audioData = resolvePttAudio(mp3Path);
                        if (audioData) await sock.sendMessage(remoteJid, { audio: audioData.buffer, mimetype: audioData.mimetype, ptt: true });
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
                        const audioData = resolvePttAudio(mp3Path);
                        if (audioData) await sock.sendMessage(remoteJid, { audio: audioData.buffer, mimetype: audioData.mimetype, ptt: true });
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
            `Por que você visualiza a mensagem e não responde ?? depositei minha confiança em você....`,
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
                        const audioData = resolvePttAudio(mp3Path);
                        if (audioData) await sock.sendMessage(remoteJid, { audio: audioData.buffer, mimetype: audioData.mimetype, ptt: true });
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
                        const audioData = resolvePttAudio(audioP);
                        if (audioData) await sock.sendMessage(remoteJid, { audio: audioData.buffer, mimetype: audioData.mimetype, ptt: true });
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
                        const audioData = resolvePttAudio(audioP);
                        if (audioData) await sock.sendMessage(remoteJid, { audio: audioData.buffer, mimetype: audioData.mimetype, ptt: true });
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
            const audioData = resolvePttAudio(audioPath);
                        if (audioData) await sock.sendMessage(remoteJid, { audio: audioData.buffer, mimetype: audioData.mimetype, ptt: true });
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
            const audioData = resolvePttAudio(audioOferta);
                        if (audioData) await sock.sendMessage(remoteJid, { audio: audioData.buffer, mimetype: audioData.mimetype, ptt: true });
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
            const audioData = resolvePttAudio(audioApp);
                        if (audioData) await sock.sendMessage(remoteJid, { audio: audioData.buffer, mimetype: audioData.mimetype, ptt: true });
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
            const audioData = resolvePttAudio(audioConf);
                        if (audioData) await sock.sendMessage(remoteJid, { audio: audioData.buffer, mimetype: audioData.mimetype, ptt: true });
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
            const audioData = resolvePttAudio(audioCert);
                        if (audioData) await sock.sendMessage(remoteJid, { audio: audioData.buffer, mimetype: audioData.mimetype, ptt: true });
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
                        const audioData = resolvePttAudio(audioP);
                        if (audioData) await sock.sendMessage(remoteJid, { audio: audioData.buffer, mimetype: audioData.mimetype, ptt: true });
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
            const audioData = resolvePttAudio(audioApres);
                        if (audioData) await sock.sendMessage(remoteJid, { audio: audioData.buffer, mimetype: audioData.mimetype, ptt: true });
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
            const audioData = resolvePttAudio(audioConf);
                        if (audioData) await sock.sendMessage(remoteJid, { audio: audioData.buffer, mimetype: audioData.mimetype, ptt: true });
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
            const audioData = resolvePttAudio(a1);
                        if (audioData) await sock.sendMessage(remoteJid, { audio: audioData.buffer, mimetype: audioData.mimetype, ptt: true });
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
            const audioData = resolvePttAudio(a2);
                        if (audioData) await sock.sendMessage(remoteJid, { audio: audioData.buffer, mimetype: audioData.mimetype, ptt: true });
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
            const audioData = resolvePttAudio(a3);
                        if (audioData) await sock.sendMessage(remoteJid, { audio: audioData.buffer, mimetype: audioData.mimetype, ptt: true });
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
            const audioData = resolvePttAudio(a1);
                        if (audioData) await sock.sendMessage(remoteJid, { audio: audioData.buffer, mimetype: audioData.mimetype, ptt: true });
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
            const audioData = resolvePttAudio(a2);
                        if (audioData) await sock.sendMessage(remoteJid, { audio: audioData.buffer, mimetype: audioData.mimetype, ptt: true });
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
            const audioData = resolvePttAudio(aOnline);
                        if (audioData) await sock.sendMessage(remoteJid, { audio: audioData.buffer, mimetype: audioData.mimetype, ptt: true });
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
            const audioData = resolvePttAudio(aFinal);
                        if (audioData) await sock.sendMessage(remoteJid, { audio: audioData.buffer, mimetype: audioData.mimetype, ptt: true });
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
                        const audioData = resolvePttAudio(audioP);
                        if (audioData) await sock.sendMessage(remoteJid, { audio: audioData.buffer, mimetype: audioData.mimetype, ptt: true });
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

function cancelAllUserTimers(botId, userPhone) {
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

    if (store && store.scheduledJobs && store.scheduledJobs.length > 0) {
        const countBefore = store.scheduledJobs.length;
        store.scheduledJobs = store.scheduledJobs.filter(j => j.userPhone !== userPhone);
        if (store.scheduledJobs.length !== countBefore) {
            console.log(`[Visual Flow Scheduler] 🛑 Cancelados ${countBefore - store.scheduledJobs.length} job(s) agendados de delay/remarketing para ${userPhone}`);
            saveStore(store);
        }
    }
}

function scheduleVisualReminder(botId, sock, remoteJid, userPhone, delayMinutes, text) {
    cancelFunil4Reminder(botId, userPhone);
    const key = `${botId}:${userPhone}`;
    const delayMs = Math.max(Number(delayMinutes) || 15, 1) * 60 * 1000;
    const timer = setTimeout(async () => {
        try {
            const currentStore = loadStore();
            const sess = currentStore.userSessions[key];
            if (sess && (sess.waitingFor === 'PIX_RECEIPT' || (sess.waitingFor || '').startsWith('PIX_RECEIPT_'))) {
                const activeSock = activeSockets.get(botId) || sock;
                if (activeSock) {
                    await activeSock.sendMessage(remoteJid, { text });
                    logConversation(botId, userPhone, 'BOT', 'REMINDER', text);
                    console.log(`[Visual Flow] ⏰ Follow-up automático de lembrete enviado para ${userPhone}: "${text}"`);
                }
            }
        } catch (err) {
            console.error('[Visual Reminder Error]:', err?.message);
        }
    }, delayMs);

    const existingTimers = funil4ReminderTimers.get(key) || [];
    existingTimers.push(timer);
    funil4ReminderTimers.set(key, existingTimers);
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
            const audioData = resolvePttAudio(mp3Path);
            if (audioData) await sock.sendMessage(remoteJid, { audio: audioData.buffer, mimetype: audioData.mimetype, ptt: true });
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
        'O acesso ao conteúdo é vitalício! Você pode imprimir ou ler pelo celular'
    );
    await new Promise((r) => setTimeout(r, 1000));

    // 6. Quebra de Objeção / Contribuição Voluntária
    const valuePropText = `O valor sugerido é R$25,00\nVocê só paga depois de receber tudo!\n\nPorém, a contribuição é voluntária e pode ser até menos, seja 10, 15 ou 20 reais.`;
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
        'Estarei enviando e confiando em você...\nFique à vontade para abrir o material',
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
    const anchorText = `Valor sugerido: R$25,00\n\n⭐ Gostei muito: R$30,00\n⭐⭐ Quero compartilhar e abençoar ainda mais: R$50,00\n\nIsso ajuda a continuarmos esse propósito!\n\nCaso não possa contribuir com o valor integral, fique à vontade para enviar o valor que puder!`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, anchorText);
    await new Promise((r) => setTimeout(r, 1000));

    // 5. Chave PIX CNPJ
    const pixInfoText = `Chave Pix CNPJ\nNome da Chave :GPS EBOOKS DIGITAIS LTDA\n👇 Só copiar e colar CNPJ 👇`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, pixInfoText);
    await new Promise((r) => setTimeout(r, 600));

    const pixKey = '67.039.217/0001-86';
    const beneficiaryName = 'GPS EBOOKS DIGITAIS LTDA';

    // 6. Cartão PIX Nativo Grande (payment_info / pix_static_code) compatível com iOS, Android e Web
    try {
        await sendUniversalPixCopyCard({
            sock,
            remoteJid,
            beneficiaryName,
            pixKey,
            copyCode: pixKey,
            amount: '25,00',
            footerText: 'Toque no botão abaixo para copiar',
            configuredKeyType: 'CNPJ',
            botId,
            userPhone
        });
        logConversation(botId, userPhone, 'BOT', 'PIX', `[Cartão PIX Nativo payment_info (CNPJ)]: ${pixKey}`);
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
            const audioData = resolvePttAudio(mp3Path);
            if (audioData) await sock.sendMessage(remoteJid, { audio: audioData.buffer, mimetype: audioData.mimetype, ptt: true });
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
            const audioData = resolvePttAudio(audioPixPath);
            if (audioData) await sock.sendMessage(remoteJid, { audio: audioData.buffer, mimetype: audioData.mimetype, ptt: true });
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
            const audioData = resolvePttAudio(mp3Path);
            if (audioData) await sock.sendMessage(remoteJid, { audio: audioData.buffer, mimetype: audioData.mimetype, ptt: true });
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
            const audioData = resolvePttAudio(audioPixPath);
            if (audioData) await sock.sendMessage(remoteJid, { audio: audioData.buffer, mimetype: audioData.mimetype, ptt: true });
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
// FUNIL 4: Jornada da Bíblia - Pastor Guilherme (Gatilho: teste4)
// ═══════════════════════════════════════════════════════════════════════════════

async function sendFunil4Phase1(botId, sock, remoteJid, userPhone, pushName) {
    console.log(`[Funil 4 - Jornada Bíblia] 🚀 Iniciando Fase 1 para ${pushName} (${userPhone})`);

    await sendRealisticText(botId, sock, remoteJid, userPhone, 'A Paz do Senhor!');
    await new Promise((r) => setTimeout(r, 1200));

    try { await sock.sendPresenceUpdate('recording', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 2000));

    const audioPath = path.join(__dirname, 'public', 'funil4', 'audio_apresentacao');
    try {
        const sent = await sendPttVoiceNote(sock, remoteJid, audioPath, botId, userPhone, 'Áudio Apresentação Funil 4 46s');
        if (!sent) throw new Error('Arquivo de áudio não encontrado no disco (audio_apresentacao.ogg / .mp3)');
    } catch (audioErr) {
        console.warn('[Funil 4 Audio Send Error]:', audioErr?.message);
        sendNtfyEmergencyAlert({
            title: '⚠️ ALERTA X1: FALHA AO ENVIAR ÁUDIO',
            message: `⚠️ Ocorreu um erro ao enviar o áudio de apresentação do Funil 4 para ${userPhone}!\nErro: ${audioErr?.message}`,
            priority: 'high',
            tags: 'warning,sound',
            alertKey: 'audio_send_error',
            cooldownSec: 180
        }).catch(() => {});
    }
    try { await sock.sendPresenceUpdate('paused', remoteJid); } catch {}
    await new Promise((r) => setTimeout(r, 1200));

    const offerText = `📘 Jornada da Bíblia - de Gênesis a Apocalipse\n(Uma explicação simples e didática de todos os 66 livros da Bíblia)\n\nDe 59,00 por: R$20,00\n\nPentateuco, Livros Históricos, Livros Poéticos, Profetas Maiores e Menores, Evangelhos, Livro Histórico, Cartas e Livro Profético\n\nBônus após o pagamento 👇\n• Bônus Especial: 7 Estudos do Apocalipse`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, offerText);
    await new Promise((r) => setTimeout(r, 1200));

    const trustText = `O acesso ao conteúdo é vitalício! Você pode imprimir ou ler pelo celular\n\nO valor sugerido é R$20,00\nVocê só paga depois de receber tudo!\n\nPorém a contribuição é voluntária e pode ser até menos, seja 10, 15 reais.\n\nPosso lhe enviar o estudo?`;
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
    const textTrust = `Estarei enviando e confiando em você, fique à vontade para abrir o material`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, textTrust, quoteOptions);
    await new Promise((r) => setTimeout(r, 1200));

    const pdfs = [
        { file: '1 - Jornada da Bíblia Parte 01.pdf', name: '1 - Jornada da Bíblia Parte 01.pdf' },
        { file: '2 - Jornada da Bíblia Parte 02.pdf', name: '2 - Jornada da Bíblia Parte 02.pdf' },
        { file: '3 - Jornada da Bíblia Parte 03.pdf', name: '3 - Jornada da Bíblia Parte 03.pdf' },
        { file: '4 - Jornada da Bíblia Parte 04.pdf', name: '4 - Jornada da Bíblia Parte 04.pdf' },
        { file: '5 - Os 4 Evangelhos.pdf', name: '5 - Os 4 Evangelhos.pdf' },
    ];

    for (let i = 0; i < pdfs.length; i++) {
        const item = pdfs[i];
        const fullPdfPath = path.join(__dirname, 'public', 'funil4', item.file);
        if (fs.existsSync(fullPdfPath)) {
            const pdfBuffer = fs.readFileSync(fullPdfPath);
            await sendSafeDocument(
                sock,
                remoteJid,
                pdfBuffer,
                item.name,
                undefined,
                botId,
                userPhone,
                `[PDF ${i + 1}/5]: ${item.name}`
            );
        } else {
            console.warn(`[Funil 4 PDF Missing]: Arquivo não encontrado: ${fullPdfPath}`);
            sendNtfyEmergencyAlert({
                title: '🚨 ALERTA X1: ARQUIVO PDF AUSENTE NO DISCO',
                message: `⚠️ O arquivo PDF "${item.name}" não foi encontrado na pasta public/funil4!`,
                priority: 'urgent',
                tags: 'warning,file_folder',
                alertKey: 'pdf_missing_' + i,
                cooldownSec: 300
            }).catch(() => {});
        }
        await new Promise((r) => setTimeout(r, 1400));
    }

    const valuesText = `Acabei de enviar todos os 5 livros em PDF aqui na conversa para você baixar e ler no seu celular ou imprimir!\n\nValor sugerido: R$20,00\n⭐️ Gostei muito: R$30,00\n⭐️⭐️ Quero abençoar ainda mais: R$50,00\n\nIsso ajuda a continuarmos esse propósito!\nCaso não possa contribuir com o valor integral, fique à vontade para enviar o valor que puder!`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, valuesText);
    await new Promise((r) => setTimeout(r, 1200));

    const pixKey = 'pastorguilhermeigreja@gmail.com';
    const beneficiaryName = 'Pastor Guilherme';

    // 1. Mensagem com instrução
    const pixPrompt = `Chave Pix E-MAIL\nNome: Pastor Guilherme\n👇 Só clicar no botão ou copiar a chave abaixo 👇`;
    await sendRealisticText(botId, sock, remoteJid, userPhone, pixPrompt);
    await new Promise((r) => setTimeout(r, 600));

    // 2. Cartão PIX Nativo Grande (payment_info / pix_static_code) — Compatível com iOS, Android e Web
    try {
        await sendUniversalPixCopyCard({
            sock,
            remoteJid,
            beneficiaryName,
            pixKey,
            copyCode: pixKey,
            amount: '20,00',
            footerText: 'Toque no botão abaixo para copiar',
            configuredKeyType: 'EMAIL',
            botId,
            userPhone
        });
        logConversation(botId, userPhone, 'BOT', 'PIX', `[Cartão PIX Nativo payment_info (EMAIL)]: ${pixKey}`);
        console.log(`[Funil 4] 🔘 Cartão PIX nativo payment_info enviado com sucesso para ${userPhone}`);
    } catch (btnErr) {
        console.error('[Funil 4 Button Error]:', btnErr?.message);
    }

    await new Promise((r) => setTimeout(r, 600));

    const codeBlockPix = '```' + pixKey + '```';
    await safeDispatchBlock({
        sock,
        remoteJid,
        blockType: 'PIX',
        description: `Código PIX Copia e Cola: ${pixKey}`,
        botId,
        userPhone,
        sendAction: async () => {
            const sent = await sock.sendMessage(remoteJid, { text: codeBlockPix });
            logConversation(botId, userPhone, 'BOT', 'PIX', `Chave PIX: ${pixKey}`);
            return sent;
        }
    });
    await new Promise((r) => setTimeout(r, 800));

    const bonusNotice = `Após o pagamento, me envie o comprovante aqui, que eu vou te enviar como BÔNUS:\n7 ESTUDOS DO APOCALIPSE EM PDF 🎁`;
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
            const audioData = resolvePttAudio(mp3Path);
            if (audioData) await sock.sendMessage(remoteJid, { audio: audioData.buffer, mimetype: audioData.mimetype, ptt: true });
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
            const audioData = resolvePttAudio(audioConfPath);
            if (audioData) await sock.sendMessage(remoteJid, { audio: audioData.buffer, mimetype: audioData.mimetype, ptt: true });
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
            const audioData = resolvePttAudio(audioEnvPath);
            if (audioData) await sock.sendMessage(remoteJid, { audio: audioData.buffer, mimetype: audioData.mimetype, ptt: true }, quoteOptions);
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
            const audioData = resolvePttAudio(audioPixPath);
            if (audioData) await sock.sendMessage(remoteJid, { audio: audioData.buffer, mimetype: audioData.mimetype, ptt: true });
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
            const audioData = resolvePttAudio(mp3Path);
            if (audioData) await sock.sendMessage(remoteJid, { audio: audioData.buffer, mimetype: audioData.mimetype, ptt: true });
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
            const audioData = resolvePttAudio(audioExpPath);
            if (audioData) await sock.sendMessage(remoteJid, { audio: audioData.buffer, mimetype: audioData.mimetype, ptt: true });
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
            const audioData = resolvePttAudio(audioEntPath);
            if (audioData) await sock.sendMessage(remoteJid, { audio: audioData.buffer, mimetype: audioData.mimetype, ptt: true });
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
            const audioData = resolvePttAudio(audioUltPath);
            if (audioData) await sock.sendMessage(remoteJid, { audio: audioData.buffer, mimetype: audioData.mimetype, ptt: true });
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
            const audioData = resolvePttAudio(mp3Path);
            if (audioData) await sock.sendMessage(remoteJid, { audio: audioData.buffer, mimetype: audioData.mimetype, ptt: true });
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
            const audioData = resolvePttAudio(mp3Path1);
            if (audioData) await sock.sendMessage(remoteJid, { audio: audioData.buffer, mimetype: audioData.mimetype, ptt: true });
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
            const audioData = resolvePttAudio(mp3Path2);
            if (audioData) await sock.sendMessage(remoteJid, { audio: audioData.buffer, mimetype: audioData.mimetype, ptt: true });
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

function ensureBotVisualFlowsLoaded(botId) {
    let flows = store.flows[botId] || [];
    if (!flows || flows.length === 0) {
        try {
            const defFlowsPath = path.join(__dirname, 'default_flows.json');
            if (fs.existsSync(defFlowsPath)) {
                flows = JSON.parse(fs.readFileSync(defFlowsPath, 'utf-8'));
                store.flows[botId] = flows;
                saveStore(store);
            }
        } catch (e) {
            console.warn('[ensureBotVisualFlowsLoaded] Aviso:', e?.message);
        }
    }
    return flows;
}

function normalizeVisualFlowId(flowId) {
    const raw = String(flowId || '').trim();
    if (!raw) return '';
    if (raw.startsWith('flow_')) return raw;
    if (/^funil\d+$/i.test(raw)) return raw.replace(/^funil(\d+)$/i, 'flow_funil_$1');
    return 'flow_' + raw;
}

function getVisualFlowById(botId, flowId) {
    const flows = ensureBotVisualFlowsLoaded(botId);
    const normalizedFid = normalizeVisualFlowId(flowId);
    const flow = flows.find(f => f._id === normalizedFid || f._id === flowId);
    if (flow && flow.isDeployed !== false && flow.draftVersion?.flowData?.nodes?.length > 2) {
        const nodes = flow.draftVersion.flowData.nodes;
        const edges = flow.draftVersion.flowData.edges || [];
        const startNode = nodes.find(n => (n.nodeType || '').toUpperCase() === 'START') || nodes[0];
        return { flow, startNode, nodes, edges };
    }
    return null;
}

function collectCandidateFlowTriggers(flows = []) {
    const candidateTriggers = [];
    for (const flow of flows) {
        if (flow.isDeployed === false) continue;
        const nodes = flow.draftVersion?.flowData?.nodes || [];
        if (nodes.length <= 2) continue;
        const edges = flow.draftVersion?.flowData?.edges || [];
        const startNode = nodes.find(n => (n.nodeType || '').toUpperCase() === 'START') || nodes[0];

        const rawTriggers = new Set();
        const cfgTrig = String(startNode?.config?.trigger || '').trim().toLowerCase();
        if (cfgTrig) rawTriggers.add(cfgTrig);

        const labelMatch = String(startNode?.label || '').match(/gatilho:\s*([^\)\]]+)/i);
        if (labelMatch && labelMatch[1]) rawTriggers.add(labelMatch[1].trim().toLowerCase());

        const nameMatch = String(flow.name || '').match(/gatilho:\s*([^\)\]]+)/i);
        if (nameMatch && nameMatch[1]) rawTriggers.add(nameMatch[1].trim().toLowerCase());

        for (const trig of rawTriggers) {
            if (!trig) continue;
            candidateTriggers.push({ trig, flow, startNode, nodes, edges });
        }
    }
    candidateTriggers.sort((a, b) => b.trig.length - a.trig.length);
    return candidateTriggers;
}

function isExplicitTriggerMatch(text, trig) {
    if (!trig) return false;
    const cleanText = String(text || '').trim().toLowerCase();
    const bareText = cleanText.replace(/^[#!/]+/, '').trim();
    const spacedVariant = /^teste\d+$/.test(trig) ? trig.replace(/^teste(\d+)$/, 'teste $1') : null;
    return Boolean(
        cleanText === trig ||
        bareText === trig ||
        cleanText.startsWith(trig + ' ') ||
        bareText.startsWith(trig + ' ') ||
        (spacedVariant && (cleanText === spacedVariant || bareText === spacedVariant || cleanText.startsWith(spacedVariant + ' ')))
    );
}

function findDeployedFlowForTrigger(botId, text) {
    const flows = ensureBotVisualFlowsLoaded(botId);
    const cleanText = String(text || '').trim().toLowerCase();
    const bareText = cleanText.replace(/^[#!/]+/, '').trim();

    // ─── 1º LUGAR ABSOLUTO: Verificar os gatilhos explícitos reais (config.trigger / label) de TODOS os fluxos do painel ───
    // Ordena por tamanho do gatilho (decrescente) para que 'teste4_copia' ou 'teste10' tenham prioridade sobre 'teste4' ou 'teste1'
    const candidateTriggers = collectCandidateFlowTriggers(flows);
    for (const item of candidateTriggers) {
        if (isExplicitTriggerMatch(cleanText, item.trig)) {
            console.log(`[Visual Flow Router] 🎯 Gatilho exato do fluxograma encontrado: "${item.trig}" ➔ "${item.flow.name}" (${item.flow._id})`);
            return { flow: item.flow, startNode: item.startNode, nodes: item.nodes, edges: item.edges };
        }
    }

    // ─── 2º LUGAR: Mapa canônico explícito de teste1 a teste13 (ordenado do maior para o menor) ───
    const triggerMap = [
        ['teste13', 'flow_funil_13'],
        ['teste12', 'flow_funil_12'],
        ['teste11', 'flow_funil_11'],
        ['teste10', 'flow_funil_10'],
        ['teste9', 'flow_funil_9'],
        ['teste8', 'flow_funil_8'],
        ['teste7', 'flow_funil_7'],
        ['teste6', 'flow_funil_6'],
        ['teste5', 'flow_funil_5'],
        ['teste4', 'flow_funil_4'],
        ['teste3', 'flow_funil_3'],
        ['teste2', 'flow_funil_2'],
        ['teste1', 'flow_funil_1'],
    ];

    let matchedFlowId = null;
    for (const [trig, fid] of triggerMap) {
        const variants = [trig, trig.replace('teste', 'teste '), '#' + trig, '!' + trig, '/' + trig];
        if (variants.some(k => cleanText === k || cleanText.startsWith(k + ' '))) {
            matchedFlowId = fid;
            break;
        }
    }
    if (matchedFlowId) {
        const resolvedTest = getVisualFlowById(botId, matchedFlowId);
        if (resolvedTest) return resolvedTest;
    }

    // ─── 3º LUGAR PRIORITÁRIO: MODO FUNIL ÚNICO BLINDADO (Executa ANTES do keywordMap!) ───
    // Qualquer lead que não enviou um gatilho explícito de teste (ex: "Oi", "Olá! Gostaria de receber a Jornada da Bíblia",
    // mensagem padrão de anúncio com "Pastor Guilherme" ou "Parábolas", etc.) vai OBRIGATORIAMENTE para o funil único selecionado.
    if (store.singleFunnelMode && store.activeFunnelId) {
        const singleResolved = getVisualFlowById(botId, store.activeFunnelId);
        if (singleResolved) {
            console.log(`[Visual Flow] 🛡️ Modo Funil Único ATIVO (Blindado): roteando automaticamente para "${singleResolved.flow.name}" (${singleResolved.flow._id})`);
            return singleResolved;
        }
    }

    // ─── 4º LUGAR (somente no Modo Multi-Funil): Palavras-chave de anúncios CTWA ───
    if (!matchedFlowId && !bareText.startsWith('teste')) {
        const keywordMap = {
            'flow_funil_1': ['parábolas', 'parabolas', 'maria gps'],
            'flow_funil_2': ['acamada', 'acamado', 'cuidados com pessoa'],
            'flow_funil_3': ['500 esboços', '500 esbocos', 'missionária raquel', 'missionaria raquel'],
            'flow_funil_4': ['jornada da bíblia', 'jornada da biblia', 'pastor guilherme', 'jornada bíblia', 'jornada biblia'],
            'flow_funil_5': ['acervo de serm', 'sermões prontos', 'sermoes prontos', 'vitor bueno'],
            'flow_funil_6': ['flávia', 'flavia', 'devocional pelos filhos - flávia', 'devocional pelos filhos - flavia'],
            'flow_funil_7': ['construtor de palavras', 'alfabetização infantil', 'alfabetizacao', 'pinguim estudioso'],
            'flow_funil_8': ['pet comilão', 'pet comilao', 'alimentação natural cães', 'fernanda soares'],
            'flow_funil_9': ['produtos de limpeza', 'receitas de produtos', 'junior limpeza'],
            'flow_funil_10': ['bolsas lucrativas', '200 moldes', 'thaíse costura', 'thaise costura'],
            'flow_funil_11': ['mente viva', 'estimulação cognitiva', 'estimulacao cognitiva', 'selma'],
            'flow_funil_12': ['cardápio adventista', 'cardapio adventista', 'ellen white', 'déb', 'deb'],
            'flow_funil_13': ['missionária maria', 'missionaria maria', 'devocional pelos filhos - maria']
        };
        for (const [fid, keywords] of Object.entries(keywordMap)) {
            if (keywords.some(kw => cleanText.includes(kw))) {
                matchedFlowId = fid;
                break;
            }
        }
    }

    if (matchedFlowId) {
        const resolved = getVisualFlowById(botId, matchedFlowId);
        if (resolved) return resolved;
    }

    return null;
}

function getBrazilianPhoneVariants(digits) {
    const clean = String(digits || '').replace(/\D/g, '');
    const set = new Set();
    if (clean) set.add(clean);
    if (clean.startsWith('55') && clean.length === 13 && clean[4] === '9') {
        set.add(clean.slice(0, 4) + clean.slice(5));
    } else if (clean.startsWith('55') && clean.length === 12) {
        set.add(clean.slice(0, 4) + '9' + clean.slice(4));
    }
    return Array.from(set);
}

async function resolveBrazilianWhatsAppJid(sock, rawPhone) {
    const cleanPhone = String(rawPhone || '').replace(/\D/g, '');
    const variants = getBrazilianPhoneVariants(cleanPhone);
    let resolvedJid = `${cleanPhone}@s.whatsapp.net`;
    let resolvedPhone = cleanPhone;
    let resolvedLid = '';
    let exists = null;

    if (sock && typeof sock.onWhatsApp === 'function' && variants.length > 0) {
        try {
            const lookupResults = await Promise.race([
                sock.onWhatsApp(...variants),
                new Promise((_, reject) => setTimeout(() => reject(new Error('onWhatsApp timeout')), 6000))
            ]);
            const valid = Array.isArray(lookupResults)
                ? (lookupResults.find(r => r?.exists && r?.jid === `${cleanPhone}@s.whatsapp.net`) || lookupResults.find(r => r?.exists && r?.jid))
                : null;
            if (valid && valid.jid) {
                resolvedJid = valid.jid;
                resolvedPhone = String(valid.jid).split('@')[0].split(':')[0].replace(/\D/g, '') || cleanPhone;
                if (valid.lid) resolvedLid = String(valid.lid);
                exists = true;
            } else if (Array.isArray(lookupResults) && lookupResults.length > 0) {
                exists = false;
            }
        } catch (err) {
            console.warn(`[JID Resolver] Aviso ao consultar onWhatsApp para ${cleanPhone}:`, err?.message);
        }
    }

    if (!resolvedLid && sock?.signalRepository?.lidMapping?.getLIDForPN) {
        try {
            const lid = await sock.signalRepository.lidMapping.getLIDForPN(resolvedJid);
            if (lid) resolvedLid = String(lid);
        } catch {}
    }

    return {
        exists,
        jid: resolvedJid,
        phoneDigits: resolvedPhone,
        lid: resolvedLid,
        allVariants: Array.from(new Set([...variants, resolvedPhone, resolvedLid ? resolvedLid.split('@')[0].split(':')[0].replace(/\D/g, '') : ''].filter(Boolean)))
    };
}

function syncSessionAliases(botId, session, extraIdentifiers = []) {
    if (!botId || !session) return;
    store.userSessions = store.userSessions || {};
    const keys = new Set();
    const addId = (val) => {
        const clean = String(val || '').split('@')[0].split(':')[0].replace(/\D/g, '');
        if (clean) keys.add(clean);
    };
    addId(session.userPhone);
    addId(session.realPhone);
    addId(session.lidDigits);
    addId(session.userJid);
    for (const extra of (extraIdentifiers || [])) addId(extra);
    for (const id of keys) {
        store.userSessions[`${botId}:${id}`] = session;
    }
}

async function recoverSessionIdentityAndAttribution(botId, sock, session, candidateHints = []) {
    if (!session) return session;
    const lidCandidates = new Set();
    const pnCandidates = new Set();

    const inspectValue = (val, jidHint = '') => {
        if (!val) return;
        const s = String(val).trim();
        const digits = s.split('@')[0].split(':')[0].replace(/\D/g, '');
        if (!digits) return;
        const hint = s.includes('@') ? s : jidHint;
        if (isPlausibleRealPhone(digits, hint)) {
            pnCandidates.add(digits);
        } else if (hint.endsWith('@lid') || digits.length >= 14) {
            lidCandidates.add(digits);
        }
    };

    inspectValue(session.realPhone);
    inspectValue(session.userPhone, session.userJid && String(session.userPhone) === String(session.userJid).split('@')[0].split(':')[0].replace(/\D/g, '') ? session.userJid : '');
    inspectValue(session.userJid);
    inspectValue(session.lidDigits, session.lidDigits ? `${session.lidDigits}@lid` : '');
    for (const h of candidateHints) inspectValue(h);

    const activeSock = sock || activeSockets.get(botId);
    const lidMapping = activeSock?.signalRepository?.lidMapping;

    if (pnCandidates.size === 0 && lidMapping && typeof lidMapping.getPNForLID === 'function') {
        const lidJids = [];
        if (session.userJid && String(session.userJid).endsWith('@lid')) lidJids.push(session.userJid);
        for (const l of lidCandidates) lidJids.push(`${l}@lid`);
        for (const lj of lidJids) {
            try {
                const pn = await lidMapping.getPNForLID(lj);
                if (pn) inspectValue(pn, `${pn}`.includes('@') ? '' : '@s.whatsapp.net');
            } catch {}
        }
    }

    if (pnCandidates.size === 0) {
        for (const [otherKey, other] of Object.entries(store.userSessions || {})) {
            if (!other || other.botId !== botId) continue;
            const sharesIdentity =
                other === session ||
                (session.userJid && other.userJid === session.userJid) ||
                (session.lidDigits && other.lidDigits === session.lidDigits) ||
                (session.adData?.conversionData && other.adData?.conversionData === session.adData.conversionData);
            if (sharesIdentity) {
                const keyDigits = String(otherKey).includes(':') ? String(otherKey).split(':').slice(1).join(':') : '';
                if (keyDigits) inspectValue(keyDigits);
                inspectValue(other.realPhone);
                inspectValue(other.userPhone);
            }
        }
    }

    if (pnCandidates.size === 0) {
        for (const job of (store.scheduledJobs || [])) {
            if (job?.botId === botId && session.userJid && job.remoteJid === session.userJid) {
                inspectValue(job.userPhone);
            }
        }
    }

    const sortedPns = Array.from(pnCandidates).sort((a, b) => {
        const aScore = (a.startsWith('55') && a.length === 13) ? 2 : 1;
        const bScore = (b.startsWith('55') && b.length === 13) ? 2 : 1;
        return bScore - aScore;
    });
    const resolvedRealPhone = sortedPns[0] || null;
    const resolvedLidDigits = Array.from(lidCandidates)[0] || null;

    if (resolvedRealPhone && session.realPhone !== resolvedRealPhone) {
        session.realPhone = resolvedRealPhone;
    }
    if (resolvedLidDigits && session.lidDigits !== resolvedLidDigits) {
        session.lidDigits = resolvedLidDigits;
    }
    if (session.realPhone && !isPlausibleRealPhone(session.userPhone)) {
        session.userPhone = session.realPhone;
    }

    if (session.adData && (!session.adData.campaignId || !session.adData.accountId)) {
        const enriched = await Promise.race([
            resolveMetaAdAttribution(session.adData),
            new Promise((resolve) => setTimeout(() => resolve(session.adData), 2500))
        ]);
        if (enriched && (enriched.campaignId || enriched.adId || enriched.accountId || enriched.creativeVideoId)) {
            session.adData = Object.assign(session.adData, enriched);
        }
    }

    syncSessionAliases(botId, session, [resolvedRealPhone, resolvedLidDigits]);
    return session;
}

async function resolveIncomingSession(botId, sock, remoteJid, msg) {
    const primaryPhone = remoteJid.split('@')[0].split(':')[0].replace(/\D/g, '');
    const altPhones = new Set(getBrazilianPhoneVariants(primaryPhone));
    let resolvedRealPhone = isPlausibleRealPhone(primaryPhone, remoteJid) ? primaryPhone : null;
    let resolvedLidDigits = remoteJid.endsWith('@lid') ? primaryPhone : null;

    const considerCandidate = (rawVal, hint = '') => {
        if (!rawVal) return;
        const s = String(rawVal).trim();
        const digits = s.split('@')[0].split(':')[0].replace(/\D/g, '');
        if (!digits) return;
        const effectiveHint = s.includes('@') ? s : hint;
        if (effectiveHint.endsWith('@lid') || (!resolvedLidDigits && !digits.startsWith('55') && digits.length >= 14)) {
            if (!resolvedLidDigits) resolvedLidDigits = digits;
            altPhones.add(digits);
            return;
        }
        getBrazilianPhoneVariants(digits).forEach(p => altPhones.add(p));
        if (!resolvedRealPhone && isPlausibleRealPhone(digits, effectiveHint)) {
            resolvedRealPhone = digits;
        }
    };

    for (const keyAlt of [msg?.key?.senderPn, msg?.key?.participantPn, msg?.key?.remoteJidAlt]) {
        if (keyAlt) considerCandidate(keyAlt);
    }

    const lidMapping = sock?.signalRepository?.lidMapping;
    try {
        if (lidMapping && remoteJid.endsWith('@lid') && typeof lidMapping.getPNForLID === 'function') {
            const pn = await lidMapping.getPNForLID(remoteJid);
            if (pn) considerCandidate(pn, `${pn}`.includes('@') ? '' : '@s.whatsapp.net');
        } else if (lidMapping && remoteJid.endsWith('@s.whatsapp.net') && typeof lidMapping.getLIDForPN === 'function') {
            const lid = await lidMapping.getLIDForPN(remoteJid);
            if (lid) considerCandidate(lid, `${lid}`.includes('@') ? '' : '@lid');
        }
    } catch {}

    const primaryKey = `${botId}:${primaryPhone}`;
    const canonicalUserPhone = resolvedRealPhone || primaryPhone;
    const canonicalKey = `${botId}:${canonicalUserPhone}`;

    let found = store.userSessions[canonicalKey] || store.userSessions[primaryKey] || null;
    let matchedAlias = null;
    if (!found) {
        for (const candidatePhone of altPhones) {
            const candidateKey = `${botId}:${candidatePhone}`;
            if (store.userSessions[candidateKey]) {
                found = store.userSessions[candidateKey];
                matchedAlias = candidatePhone;
                break;
            }
        }
    }

    if (found) {
        const existingReal = isPlausibleRealPhone(found.realPhone) ? found.realPhone
            : (isPlausibleRealPhone(found.userPhone) ? found.userPhone : null);
        const bestRealPhone = resolvedRealPhone || existingReal;
        const bestLidDigits = resolvedLidDigits || found.lidDigits || (String(found.userJid || '').endsWith('@lid') ? String(found.userJid).split('@')[0].split(':')[0].replace(/\D/g, '') : null);

        let changed = false;
        if (remoteJid && found.userJid !== remoteJid) {
            found.userJid = remoteJid;
            changed = true;
        }
        if (bestRealPhone && found.realPhone !== bestRealPhone) {
            found.realPhone = bestRealPhone;
            changed = true;
        }
        if (bestLidDigits && found.lidDigits !== bestLidDigits) {
            found.lidDigits = bestLidDigits;
            changed = true;
        }
        const desiredPhone = bestRealPhone || found.userPhone || primaryPhone;
        if (desiredPhone && found.userPhone !== desiredPhone) {
            found.userPhone = desiredPhone;
            changed = true;
        }

        syncSessionAliases(botId, found, [primaryPhone, bestRealPhone, bestLidDigits, matchedAlias]);
        if (matchedAlias || changed) {
            saveStore(store);
            if (matchedAlias) {
                console.log(`[Session Alias] 🔗 Sessão localizada via alias (${matchedAlias} -> ${found.userPhone} | JID: ${remoteJid})`);
            }
        }
        return {
            userPhone: found.userPhone,
            rawPrimaryPhone: primaryPhone,
            realPhone: found.realPhone || null,
            lidDigits: found.lidDigits || null,
            sessionKey: `${botId}:${found.userPhone}`,
            session: found,
            altPhones: Array.from(altPhones)
        };
    }

    return {
        userPhone: canonicalUserPhone,
        rawPrimaryPhone: primaryPhone,
        realPhone: resolvedRealPhone || null,
        lidDigits: resolvedLidDigits || null,
        sessionKey: canonicalKey,
        session: null,
        altPhones: Array.from(altPhones)
    };
}

const leadMessageQueues = new Map();

function enqueueLeadMessage(queueKey, taskFn) {
    const prev = leadMessageQueues.get(queueKey) || Promise.resolve();
    const next = prev
        .catch(() => {})
        .then(taskFn)
        .finally(() => {
            if (leadMessageQueues.get(queueKey) === next) {
                leadMessageQueues.delete(queueKey);
            }
        });
    leadMessageQueues.set(queueKey, next);
    return next;
}

async function handleIncomingMessage(botId, sock, msg) {
    if (!msg.message || msg.key.fromMe) return;

    const remoteJid = msg.key.remoteJid || '';
    if (!remoteJid || remoteJid === 'status@broadcast' || remoteJid.endsWith('@g.us') || remoteJid.endsWith('@newsletter')) {
        return;
    }

    // Descarte imediato de reações, mensagens apagadas (REVOKE) e pacotes de controle interno
    if (msg.message.reactionMessage || msg.message.protocolMessage || msg.message.senderKeyDistributionMessage) {
        return;
    }

    const rawQueueKey = remoteJid.split('@')[0].split(':')[0].replace(/\D/g, '') || remoteJid;
    return enqueueLeadMessage(`${botId}:${rawQueueKey}`, () => processIncomingMessageLocked(botId, sock, msg, remoteJid));
}

async function processIncomingMessageLocked(botId, sock, msg, remoteJid) {
    const identity = await resolveIncomingSession(botId, sock, remoteJid, msg);
    const userPhone = identity.userPhone;
    const pushName = msg.pushName || 'Cliente';

    // Desempacotamento recursivo de mensagens temporárias e mídias de visualização única
    let m = msg.message;
    while (m.ephemeralMessage || m.viewOnceMessage || m.viewOnceMessageV2 || m.documentWithCaptionMessage) {
        m = m.ephemeralMessage?.message || m.viewOnceMessage?.message || m.viewOnceMessageV2?.message || m.documentWithCaptionMessage?.message || m;
    }

    const textContent =
        m.conversation ||
        m.extendedTextMessage?.text ||
        m.imageMessage?.caption ||
        m.documentMessage?.caption ||
        m.buttonsResponseMessage?.selectedDisplayText ||
        m.listResponseMessage?.title ||
        '';

    const hasImage = !!m.imageMessage;
    const hasDocument = !!m.documentMessage;
    const hasMediaReceipt = hasImage || hasDocument;
    const hasAudio = !!m.audioMessage;
    const hasSticker = !!m.stickerMessage;

    console.log(`[Funil X1] 📩 Mensagem de ${pushName} (${userPhone}): "${textContent || (hasMediaReceipt ? '[COMPROVANTE]' : hasAudio ? '[AUDIO]' : hasSticker ? '[FIGURINHA]' : '')}"`);

    logConversation(
        botId,
        userPhone,
        'USER',
        hasImage ? 'IMAGE' : hasDocument ? 'DOCUMENT' : hasAudio ? 'AUDIO' : hasSticker ? 'STICKER' : 'TEXT',
        textContent || (hasMediaReceipt ? '[Comprovante Enviado]' : hasAudio ? '[Áudio Enviado]' : hasSticker ? '[Figurinha]' : '[Mensagem]'),
        pushName
    );

    const sessionKey = identity.sessionKey;
    let session = identity.session;

    // Capturar contexto de anúncio (CTWA ou tags dinâmicas no texto)
    const detectedAd = extractAdContext(msg, textContent);
    if (detectedAd) {
        if (!session) {
            session = {
                botId,
                userJid: remoteJid,
                userPhone,
                realPhone: identity.realPhone || undefined,
                lidDigits: identity.lidDigits || undefined,
                userName: pushName,
                adData: detectedAd,
                updatedAt: new Date().toISOString()
            };
            syncSessionAliases(botId, session, [identity.rawPrimaryPhone]);
            saveStore(store);
        } else {
            session.adData = { ...(session.adData || {}), ...detectedAd };
            if (identity.realPhone && !session.realPhone) session.realPhone = identity.realPhone;
            if (identity.lidDigits && !session.lidDigits) session.lidDigits = identity.lidDigits;
            syncSessionAliases(botId, session, [identity.rawPrimaryPhone]);
        }
        console.log(`[Atribuição Meta Ads] 🎯 Detectado anúncio para ${userPhone}:`, session.adData);

        if (!session.adData.campaignId || !session.adData.accountId) {
            const adTargetRef = session.adData;
            resolveMetaAdAttribution(adTargetRef)
                .then((enriched) => {
                    if (enriched && adTargetRef && (enriched.campaignId || enriched.adId || enriched.accountId || enriched.creativeVideoId)) {
                        Object.assign(adTargetRef, enriched);
                        saveStore(store);
                        if (enriched.campaignId || enriched.adId) {
                            console.log(`[Atribuição Meta Graph] ✅ Enriquecido para ${userPhone}: Camp=${enriched.campaignId || '-'} | Ad=${enriched.adId || '-'} | Conta=${enriched.accountId || '-'}`);
                        }
                    }
                })
                .catch(() => {});
        }
    }

    const normalizedText = textContent.trim().toLowerCase();

    // ─── Função de Cancelamento Universal de Timers (Hoisted e Segura) ───
    const cancelAllTimers = () => {
        cancelAllUserTimers(botId, userPhone);
        for (const altP of (identity.altPhones || [])) {
            if (altP !== userPhone) cancelAllUserTimers(botId, altP);
        }
    };

    // ─── Sistema Universal de Reações Humanizadas para TODOS os Funis (Atuais e Futuros) ───
    const isNegative = ['não', 'nao', 'agora não', 'agora nao', 'depois', 'nop', 'cancelar', 'não quero', 'nao quero'].some(w => normalizedText === w || normalizedText.startsWith(w + ' '));
    const autoEmoji = hasMediaReceipt ? '❤️' : (hasAudio ? '👍' : (hasSticker ? '❤️' : getHumanReactionEmoji(textContent, isNegative)));
    
    // Dispara a reação humanizada imediatamente na mensagem do lead
    reactToMessage(sock, remoteJid, msg.key, autoEmoji).catch(() => {});

    // Roteador Multi-Funil por Gatilhos de Teste explícitos (teste1 a teste13 + triggers custom dos fluxos):
    const isTest1 = ['teste1', 'teste 1', '#teste1', '!teste1', '/teste1'].some(k => normalizedText === k || normalizedText.startsWith(k + ' '));
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

    const customTriggerCandidates = collectCandidateFlowTriggers(store.flows[botId] || []);
    const isCustomFlowTrigger = customTriggerCandidates.some(item => isExplicitTriggerMatch(normalizedText, item.trig));
    const isAnyTestTrigger = isCustomFlowTrigger || isTest1 || isTest2 || isTest3 || isTest4 || isTest5 || isTest6 || isTest7 || isTest8 || isTest9 || isTest10 || isTest11 || isTest12 || isTest13;

    // Se o lead enviou qualquer gatilho de teste explícito, LIMPA QUALQUER SESSÃO ANTERIOR IMEDIATAMENTE!
    if (isAnyTestTrigger) {
        console.log(`[Universal Trigger Reset] 🔄 Gatilho explícito "${normalizedText}" recebido de ${pushName} (${userPhone}). Resetando sessão presa e timers!`);
        cancelAllTimers();
        session = null;
        delete store.userSessions[sessionKey];
        for (const altP of (identity.altPhones || [])) {
            delete store.userSessions[`${botId}:${altP}`];
        }
        saveStore(store);
    }

    // Se o Modo Funil Único está ativo e o usuário tinha sessão antiga (de outro funil ou legado) que ainda nem recebeu PIX nem pagou, libera para entrar no funil único ativo
    const activeSingleFlowIdNormalized = store.activeFunnelId ? normalizeVisualFlowId(store.activeFunnelId) : '';
    if (
        store.singleFunnelMode &&
        activeSingleFlowIdNormalized &&
        session &&
        (!session.flowId || session.flowId !== activeSingleFlowIdNormalized) &&
        !session.hasReceivedPix &&
        !session.paid &&
        session.waitingFor !== 'PIX_RECEIPT'
    ) {
        const updatedMs = new Date(session.updatedAt || 0).getTime();
        if (session.waitingFor !== 'USER_REPLY' || (Date.now() - updatedMs > 60 * 60 * 1000)) {
            console.log(`[Modo Funil Único] 🔄 Sessão antiga (${session.flowId || 'legado'}) encerrada para iniciar funil ativo ${activeSingleFlowIdNormalized}`);
            cancelAllTimers();
            session = null;
            delete store.userSessions[sessionKey];
            for (const altP of (identity.altPhones || [])) {
                delete store.userSessions[`${botId}:${altP}`];
            }
            saveStore(store);
        }
    }

    // ─── 0. Verificação de Sessão Ativa em Fluxo Visual Deployed (INPUT / PIX_VERIFIER) ───
    if (session && session.flowId) {
        const flows = store.flows[botId] || [];
        const flow = flows.find(f => f._id === session.flowId || f.name === session.flowName);
        if (flow && flow.draftVersion?.flowData) {
            const nodes = flow.draftVersion.flowData.nodes || [];
            const edges = flow.draftVersion.flowData.edges || [];

            // A) Lead respondeu a um nó de INPUT (ex: "Posso enviar?", "SIM", etc.)
            if (session.waitingFor === 'USER_REPLY') {
                const isNeg = ['não', 'nao', 'agora não', 'agora nao', 'depois', 'nop', 'cancelar', 'não quero', 'nao quero'].includes(normalizedText);
                if (isNeg) {
                    await sendRealisticText(botId, sock, remoteJid, userPhone, 'Sem problemas! Quando desejar receber os materiais, estarei por aqui. Fique com Deus! 🙏');
                    session.waitingFor = null;
                    saveStore(store);
                    return;
                }
                const emoji = getHumanReactionEmoji(textContent);
                await reactToMessage(sock, remoteJid, msg.key, emoji);

                const nextEdge = edges.find(e => (e.sourceNodeId || e.source) === session.currentNodeId);
                if (nextEdge) {
                    session.waitingFor = null;
                    session.variables = session.variables || {};
                    session.variables[session.variableName || 'user_reply'] = textContent;
                    session.inFlightStartedAt = Date.now();
                    saveStore(store);
                    try {
                        await executeFromNode(botId, sock, remoteJid, session, nextEdge.targetNodeId || nextEdge.target, nodes, edges);
                    } finally {
                        delete session.inFlightStartedAt;
                        saveStore(store);
                    }
                    return;
                }
            }

            // B) Lead enviou comprovante para auditoria (somente se já recebeu PIX / entrou em espera de comprovante)
            const verifierNode = nodes.find(n => (n.nodeType || '').toUpperCase() === 'PIX_VERIFIER');
            const isWaitingReceipt = !session.paid && (
                session.waitingFor === 'PIX_RECEIPT' ||
                session.hasReceivedPix ||
                session.rejectedPayment ||
                session.expired
            );

            if (isWaitingReceipt && hasMediaReceipt) {
                console.log(`[Visual Flow] 🧾 Auditando comprovante com IA Gemini para ${userPhone} (Recuperação=${Boolean(session.rejectedPayment || session.expired || session.wasInRecovery)})...`);
                store.funnelStats.receiptReceivedCount = (store.funnelStats.receiptReceivedCount || 0) + 1;
                saveStore(store);

                const mediaBuffer = await getMediaBuffer(msg, sock);
                let auditResult = { isValid: false, reason: 'Arquivo ilegível' };
                const verifierAmount = Number(verifierNode?.config?.expectedAmount || 0);
                const latestAmount = Number(session.latestPixAmount || session.expectedAmount || verifierAmount || 19.90);
                const expectedAmount = verifierAmount > 0 ? Math.min(verifierAmount, latestAmount) : latestAmount;
                const beneficiary = String(verifierNode?.config?.beneficiaryName || verifierNode?.config?.beneficiary || '').trim();

                if (mediaBuffer) {
                    const mime = msg.message.imageMessage ? 'image/jpeg' : 'application/pdf';
                    auditResult = await auditPixReceiptWithGemini(mediaBuffer, mime, expectedAmount, beneficiary);
                }

                if (auditResult && auditResult.isValid) {
                    const paidValue = Number(auditResult.paidAmount || session.latestPixAmount || session.expectedAmount || expectedAmount || 19.90);
                    console.log(`[Visual Flow] ✅ Comprovante APROVADO para ${userPhone}! Valor contabilizado: R$ ${paidValue.toFixed(2)}`);
                    cancelAllTimers();
                    if (store.scheduledJobs) {
                        store.scheduledJobs = store.scheduledJobs.filter(j => j.userPhone !== userPhone);
                    }
                    session.wasInRecovery = Boolean(session.wasInRecovery || session.rejectedPayment || session.expired);
                    session.paidAmount = paidValue;
                    session.expectedAmount = paidValue;
                    session.waitingFor = null;
                    session.paid = true;
                    session.rejectedPayment = false;
                    session.expired = false;

                    const verifierNodeId = verifierNode ? verifierNode.nodeId : session.currentNodeId;
                    session.currentNodeId = verifierNodeId;
                    saveStore(store);

                    const successEdge =
                        edges.find(e => (e.sourceNodeId || e.source) === verifierNodeId && e.sourceHandle === 'success') ||
                        edges.find(e => (e.sourceNodeId || e.source) === verifierNodeId && (!e.sourceHandle || e.sourceHandle === 'default')) ||
                        edges.find(e => (e.sourceNodeId || e.source) === session.currentNodeId);

                    if (successEdge) {
                        await executeFromNode(botId, sock, remoteJid, session, successEdge.targetNodeId || successEdge.target, nodes, edges);
                    }

                    // Garantia Dupla: se o fluxo (ou ramo de recuperação) não passou por um bloco META_CAPI,
                    // dispara a conversão no Meta Ads (CAPI) e registra no Dashboard da Operação automaticamente!
                    if (!session.capiFired) {
                        await recordAndFireFunnelConversion(botId, session, paidValue, flow.name);
                    }
                    return;
                } else {
                    console.warn(`[Visual Flow] ❌ Comprovante RECUSADO para ${userPhone}: ${auditResult?.reason}`);
                    const verifierNodeId = verifierNode ? verifierNode.nodeId : session.currentNodeId;
                    const failEdge = edges.find(e => (e.sourceNodeId || e.source) === verifierNodeId && e.sourceHandle === 'fail');
                    if (failEdge && !session.rejectedPayment) {
                        session.rejectedPayment = true;
                        session.wasInRecovery = true;
                        saveStore(store);
                        await executeFromNode(botId, sock, remoteJid, session, failEdge.targetNodeId || failEdge.target, nodes, edges);
                        return;
                    } else {
                        await sendRealisticText(botId, sock, remoteJid, userPhone, 'Não consegui identificar o valor ou destinatário com clareza na imagem enviada. Poderia me enviar o comprovante oficial completo em PDF ou imagem nítida, por favor? 🙏');
                        return;
                    }
                }
            }

            // C) Lead enviou mensagem de ÁUDIO (nota de voz) durante a espera do comprovante
            if (isWaitingReceipt && hasAudio) {
                const detectRefusal = verifierNode?.config?.detectRefusalAi !== false;
                if (detectRefusal) {
                    console.log(`[Visual Flow] 🎙️ Lead ${userPhone} enviou áudio durante espera do comprovante. Analisando com Gemini...`);
                    const audioBuffer = await getMediaBuffer(msg, sock);
                    if (audioBuffer) {
                        const audioMime = msg.message.audioMessage?.mimetype || 'audio/ogg';
                        const audioAudit = await auditAudioRefusalWithGemini(audioBuffer, audioMime);

                        if (audioAudit.isRefusal && !session.rejectedPayment) {
                            console.warn(`[Visual Flow] 🛑 Lead ${userPhone} expressou recusa/objeção via ÁUDIO: "${audioAudit.transcript}" (${audioAudit.refusalReason})`);
                            cancelAllTimers();
                            if (store.scheduledJobs) {
                                store.scheduledJobs = store.scheduledJobs.filter(j => j.userPhone !== userPhone);
                            }

                            const verifierNodeId = verifierNode ? verifierNode.nodeId : session.currentNodeId;
                            const failEdge = edges.find(e => (e.sourceNodeId || e.source) === verifierNodeId && e.sourceHandle === 'fail');
                            if (failEdge) {
                                session.waitingFor = 'PIX_RECEIPT';
                                session.rejectedPayment = true;
                                session.wasInRecovery = true;
                                session.currentNodeId = verifierNodeId;
                                saveStore(store);
                                await executeFromNode(botId, sock, remoteJid, session, failEdge.targetNodeId || failEdge.target, nodes, edges);
                                return;
                            } else {
                                const refusalMsg = verifierNode?.config?.refusalMessage || 
                                    'Entendido perfeitamente! Sem problemas, ficamos à disposição caso mude de ideia ou precise de qualquer ajuda no futuro. Que Deus abençoe! 🙏';
                                session.waitingFor = 'PIX_RECEIPT';
                                session.rejectedPayment = true;
                                session.wasInRecovery = true;
                                saveStore(store);
                                await sendRealisticText(botId, sock, remoteJid, userPhone, refusalMsg);
                                return;
                            }
                        } else {
                            console.log(`[Visual Flow] 🎙️ Áudio de ${userPhone} processado. Não é recusa: "${audioAudit.transcript}". Mantendo espera.`);
                            return;
                        }
                    }
                }
                return;
            }

            // D) Lead enviou mensagem de TEXTO durante a espera do comprovante
            if (isWaitingReceipt && !hasMediaReceipt && !hasAudio && textContent) {
                const detectRefusal = verifierNode?.config?.detectRefusalAi !== false;
                const isRefusal = detectRefusal && detectPaymentRefusal(textContent);

                if (isRefusal && !session.rejectedPayment) {
                    console.warn(`[Visual Flow] 🛑 Lead ${userPhone} expressou recusa/objeção de pagamento: "${textContent}"`);
                    cancelAllTimers();
                    if (store.scheduledJobs) {
                        store.scheduledJobs = store.scheduledJobs.filter(j => j.userPhone !== userPhone);
                    }

                    const verifierNodeId = verifierNode ? verifierNode.nodeId : session.currentNodeId;
                    const failEdge = edges.find(e => (e.sourceNodeId || e.source) === verifierNodeId && e.sourceHandle === 'fail');
                    if (failEdge) {
                        session.waitingFor = 'PIX_RECEIPT';
                        session.rejectedPayment = true;
                        session.wasInRecovery = true;
                        session.currentNodeId = verifierNodeId;
                        saveStore(store);
                        await executeFromNode(botId, sock, remoteJid, session, failEdge.targetNodeId || failEdge.target, nodes, edges);
                        return;
                    } else {
                        const refusalMsg = verifierNode?.config?.refusalMessage || 
                            'Entendido perfeitamente! Sem problemas, ficamos à disposição caso mude de ideia ou precise de qualquer ajuda no futuro. Que Deus abençoe! 🙏';
                        session.waitingFor = 'PIX_RECEIPT';
                        session.rejectedPayment = true;
                        session.wasInRecovery = true;
                        saveStore(store);
                        await sendRealisticText(botId, sock, remoteJid, userPhone, refusalMsg);
                        return;
                    }
                }
                // Se o lead mandou uma mensagem comum enquanto aguarda o comprovante (ex: "Já vou mandar", "Pronto"),
                // mantém a sessão ativa aguardando a imagem/PDF sem reiniciar o funil!
                return;
            }
            // D) Evitar re-disparar funil para quem já pagou ou está recebendo as primeiras mensagens neste exato momento
            if (session.paid && !isAnyTestTrigger) {
                console.log(`[Visual Flow] ✅ Lead ${userPhone} já concluiu o pagamento. Mantendo pós-venda sem reiniciar funil.`);
                return;
            }
            if (session.inFlightStartedAt && (Date.now() - session.inFlightStartedAt < 90000) && !session.waitingFor && !isAnyTestTrigger) {
                console.log(`[Visual Flow] ⏳ Fase inicial em envio para ${userPhone}. Ignorando mensagem simultânea para evitar duplicação.`);
                return;
            }
        }
    }

    // ─── 1. Roteador de Gatilhos de Fluxos Visuais Deployed ───
    let visualFlowMatch = findDeployedFlowForTrigger(botId, normalizedText);

    // Fallback 100% Visual: se for um novo lead sem sessão ativa (ex: "Oi, bom dia" ou clique de anúncio CTWA)
    // e nenhum gatilho específico bateu, roteia para o Fluxo Visual ativo (ou flow_funil_4 por padrão)
    if (!visualFlowMatch && (!session || (!session.waitingFor && !session.flowId))) {
        const fallbackFlowId = (store.singleFunnelMode && store.activeFunnelId)
            ? store.activeFunnelId
            : 'flow_funil_4';
        visualFlowMatch = getVisualFlowById(botId, fallbackFlowId) || getVisualFlowById(botId, 'flow_funil_4');
        if (visualFlowMatch) {
            console.log(`[Visual Flow Anti-Refugo] 🎯 Novo lead sem gatilho específico (${userPhone}: "${textContent}") -> Executando Fluxo Visual "${visualFlowMatch.flow.name}"`);
        }
    }

    if (visualFlowMatch) {
        console.log(`[Visual Flow Engine] 🚀 Executando fluxo visual deployado "${visualFlowMatch.flow.name}" (${visualFlowMatch.flow._id}) para ${userPhone}`);
        cancelAllTimers();
        session = {
            botId,
            userJid: remoteJid,
            userPhone,
            realPhone: identity.realPhone || session?.realPhone || undefined,
            lidDigits: identity.lidDigits || session?.lidDigits || undefined,
            userName: pushName,
            flowId: visualFlowMatch.flow._id,
            flowName: visualFlowMatch.flow.name,
            currentNodeId: visualFlowMatch.startNode.nodeId,
            adData: session?.adData || detectedAd || undefined,
            inFlightStartedAt: Date.now(),
            updatedAt: new Date().toISOString()
        };
        syncSessionAliases(botId, session, [identity.rawPrimaryPhone]);
        saveStore(store);

        const firstEdge = visualFlowMatch.edges.find(e => (e.sourceNodeId || e.source) === visualFlowMatch.startNode.nodeId);
        if (firstEdge) {
            try {
                await executeFromNode(botId, sock, remoteJid, session, firstEdge.targetNodeId || firstEdge.target, visualFlowMatch.nodes, visualFlowMatch.edges);
            } finally {
                delete session.inFlightStartedAt;
                saveStore(store);
            }
            return;
        }
        delete session.inFlightStartedAt;
        saveStore(store);
    }

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

    // DISPARO FUNIL 4: Jornada da Bíblia - Pastor Guilherme (Gatilho: teste4 ou Lead vindo do Anúncio)
    const isFunil4Lead = isTest4 || 
        !!(detectedAd && (detectedAd.isCtwa || detectedAd.ctwaClid)) ||
        normalizedText.includes('posso ter mais informações') ||
        normalizedText.includes('posso ter mais informacoes') ||
        normalizedText.includes('posso saber mais informações') ||
        normalizedText.includes('posso saber mais informacoes') ||
        normalizedText.includes('mais informações sobre isso') ||
        normalizedText.includes('mais informacoes sobre isso') ||
        normalizedText.includes('mais informações sobre isto') ||
        normalizedText.includes('mais informacoes sobre isto') ||
        normalizedText.includes('jornada da bíblia') || 
        normalizedText.includes('jornada da biblia') || 
        normalizedText.includes('jornada bíblia') || 
        normalizedText.includes('jornada biblia') || 
        normalizedText.includes('pastor guilherme') || 
        normalizedText.startsWith('olá! gostaria de receber a jornada') ||
        normalizedText.startsWith('ola! gostaria de receber a jornada') ||
        normalizedText.startsWith('olá pastor guilherme') ||
        normalizedText.startsWith('ola pastor guilherme') ||
        normalizedText.includes('gostaria de receber a jornada') ||
        normalizedText.includes('jornada da bíblia [ref_') ||
        normalizedText.includes('jornada da biblia [ref_');

    if (isFunil4Lead) {
        console.log(`[Funil 4 - Jornada Bíblia] 🚀 Disparo ativado para ${pushName} (${userPhone})`);
        cancelAllTimers();
        session = null;
        delete store.userSessions[sessionKey];
        saveStore(store);
        await sendFunil4Phase1(botId, sock, remoteJid, userPhone, pushName);
        return;
    }

    // DISPARO FUNIL 5: Acervo 5.000+ Sermões (Gatilho: teste5 ou Lead vindo do Anúncio)
    const isFunil5Lead = isTest5 || 
        normalizedText.includes('acervo de serm') || 
        normalizedText.includes('sermões prontos') || 
        normalizedText.includes('sermoes prontos') || 
        normalizedText.includes('esboços de prega') || 
        normalizedText.includes('esbocos de prega') || 
        normalizedText.startsWith('olá! gostaria de receber o acervo') ||
        normalizedText.startsWith('ola! gostaria de receber o acervo') ||
        normalizedText.includes('amostra grátis dos 5') ||
        normalizedText.includes('amostra gratis dos 5');

    if (isFunil5Lead) {
        console.log(`[Funil 5 - Acervo Sermões] 🚀 Disparo ativado para ${pushName} (${userPhone})`);
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

    // Se NÃO tem sessão ativa ou NÃO está aguardando ação do funil:
    // Respeita o Modo Funil Único (ou fallback visual) antes de recorrer ao Funil 4 legado
    if (!session || !session.waitingFor) {
        const targetFlowId = (store.singleFunnelMode && store.activeFunnelId) ? store.activeFunnelId : 'flow_funil_4';
        const fallbackVisual = getVisualFlowById(botId, targetFlowId) || getVisualFlowById(botId, 'flow_funil_4');
        if (fallbackVisual) {
            const firstEdge = fallbackVisual.edges.find(e => (e.sourceNodeId || e.source) === fallbackVisual.startNode.nodeId);
            if (firstEdge) {
                console.log(`[Fallback Visual] 🎯 Disparando "${fallbackVisual.flow.name}" (${fallbackVisual.flow._id}) para ${pushName} (${userPhone})`);
                cancelAllTimers();
                session = {
                    botId,
                    userJid: remoteJid,
                    userPhone,
                    realPhone: identity.realPhone || session?.realPhone || undefined,
                    lidDigits: identity.lidDigits || session?.lidDigits || undefined,
                    userName: pushName,
                    flowId: fallbackVisual.flow._id,
                    flowName: fallbackVisual.flow.name,
                    currentNodeId: fallbackVisual.startNode.nodeId,
                    adData: session?.adData || detectedAd || undefined,
                    inFlightStartedAt: Date.now(),
                    updatedAt: new Date().toISOString()
                };
                syncSessionAliases(botId, session, [identity.rawPrimaryPhone]);
                saveStore(store);
                try {
                    await executeFromNode(botId, sock, remoteJid, session, firstEdge.targetNodeId || firstEdge.target, fallbackVisual.nodes, fallbackVisual.edges);
                } finally {
                    delete session.inFlightStartedAt;
                    saveStore(store);
                }
                return;
            }
        }
        console.log(`[Funil 4 - Anti-Refugo 100%] 🎯 Novo lead capturado: ${pushName} (${userPhone}): "${textContent}" -> Disparando Funil 4`);
        cancelAllTimers();
        session = null;
        delete store.userSessions[sessionKey];
        saveStore(store);
        await sendFunil4Phase1(botId, sock, remoteJid, userPhone, pushName);
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
            beneficiary = 'Guilherme';
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
            await recoverSessionIdentityAndAttribution(botId, sock, session, [userPhone, identity.rawPrimaryPhone]);
            const resolvedTxPhone = session.realPhone || (isPlausibleRealPhone(session.userPhone) ? session.userPhone : userPhone);
            const adInfo = session.adData || {};
            const txId = 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
            const now = new Date();
            const transactionRecord = {
                id: txId,
                timestamp: now.toISOString(),
                time: Date.now(),
                timeFormatted: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                dateFormatted: now.toLocaleDateString('pt-BR'),
                botId,
                funnelId: session.funnel || 'funil1',
                funnelName,
                amount: paidValue,
                beneficiary,
                userPhone: resolvedTxPhone,
                realPhone: session.realPhone || undefined,
                lidDigits: session.lidDigits || undefined,
                pushName,
                accountId: adInfo.accountId || null,
                campaignId: adInfo.campaignId || null,
                campaignName: adInfo.campaignName || null,
                adId: adInfo.adId || null,
                adName: adInfo.adName || null,
                adTag: adInfo.rawTag || null,
                sourceUrl: adInfo.sourceUrl || null,
                entryPointApp: adInfo.sourceApp || adInfo.entryPointApp || null,
                creativeVideoId: adInfo.creativeVideoId || null,
                isCtwa: Boolean(adInfo.isCtwa || adInfo.ctwaClid || adInfo.ctwaPayload || adInfo.sourceUrl || adInfo.sourceId),
                ctwaClid: adInfo.ctwaClid || null,
                ctwaPayload: adInfo.ctwaPayload || undefined,
                status: 'APROVADO_PIX',
                capiStatus: 'PENDING'
            };

            // Disparar Meta Conversions API (CAPI)
            try {
                const capiRes = await sendMetaCapiConversion(transactionRecord);
                transactionRecord.capiMode = capiRes.capiMode || null;
                transactionRecord.capiMatchKeys = capiRes.matchKeys || undefined;
                transactionRecord.capiRealPhoneMatched = Boolean(capiRes.realPhoneMatched);
                transactionRecord.capiStatus = capiRes.success ? 'ENVIADO_CAPI_OK' : (capiRes.skipped ? 'CAPI_CONFIG_PENDENTE' : 'ERRO_CAPI: ' + capiRes.error);
            } catch (capiErr) {
                transactionRecord.capiStatus = 'ERRO_CAPI: ' + capiErr.message;
            }

            store.funnelTransactions = store.funnelTransactions || [];
            store.funnelTransactions.unshift(transactionRecord);
            if (store.funnelTransactions.length > 500) store.funnelTransactions.pop();

            // Notificar Webhook FaceHub se configurado
            notifyFaceHubWebhook(transactionRecord).catch(() => {});
        sendNtfyNotification(transactionRecord).catch(() => {});

            // Notificação Push no Celular via ntfy
            sendNtfyNotification(transactionRecord).catch(() => {});

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

            if (session.funnel === 'funil4') {
                const bonusPdfPath = path.join(__dirname, 'public', 'funil4', 'Bônus Especial - Estudos do Apocalipse.pdf');
                if (fs.existsSync(bonusPdfPath)) {
                    const bonusBuffer = fs.readFileSync(bonusPdfPath);
                    await sendSafeDocument(
                        sock,
                        remoteJid,
                        bonusBuffer,
                        'Bônus Especial - Estudos do Apocalipse.pdf',
                        '🎁 Aqui está o seu Bônus Especial: 7 Estudos do Apocalipse em PDF! Que este estudo ilumine sua fé e traga grandes revelações da Palavra de Deus! 🙏📖',
                        botId,
                        userPhone,
                        '[Bônus]: 7 Estudos do Apocalipse'
                    );
                }
            } else if (session.funnel === 'funil7') {
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
                const bonusText = `🎁 *Parabéns! Seu pagamento foi confirmado com sucesso!*\n\nConforme prometido, estou enviando agora o seu *Bônus Especial: 7 Estudos do Apocalipse* em PDF diretamente aqui na conversa para você ler e estudar. Que Deus abençoe grandemente seus estudos e sua família! 🙏❤️`;
                await sendRealisticText(botId, sock, remoteJid, userPhone, bonusText);
                await new Promise((r) => setTimeout(r, 1200));

                const bonusPath = path.join(__dirname, 'public', 'funil4', 'Bônus Especial - Estudos do Apocalipse.pdf');
                if (fs.existsSync(bonusPath)) {
                    try {
                        const bonusBuffer = fs.readFileSync(bonusPath);
                        await sock.sendMessage(remoteJid, {
                            document: bonusBuffer,
                            fileName: 'Bônus Especial - Estudos do Apocalipse.pdf',
                            mimetype: 'application/pdf',
                        });
                        logConversation(botId, userPhone, 'BOT', 'DOCUMENT', '📄 [Bônus Especial - Estudos do Apocalipse.pdf]');
                        console.log(`[Funil 4] 🎁 Bônus PDF enviado com sucesso para ${userPhone}`);
                    } catch (bErr) {
                        console.error('[Funil 4 Bonus Send Error]:', bErr?.message);
                        sendNtfyEmergencyAlert({
                            title: '⚠️ ALERTA X1: FALHA AO ENVIAR BÔNUS PDF',
                            message: `⚠️ Ocorreu um erro ao enviar o Bônus PDF de Apocalipse para ${userPhone}!\nErro: ${bErr?.message}`,
                            priority: 'high',
                            tags: 'warning,gift',
                            alertKey: 'bonus_pdf_send_error',
                            cooldownSec: 180
                        }).catch(() => {});
                    }
                } else {
                    console.warn(`[Funil 4 Bonus Missing]: Bônus não encontrado em ${bonusPath}`);
                    sendNtfyEmergencyAlert({
                        title: '🚨 ALERTA X1: ARQUIVO DO BÔNUS PDF AUSENTE NO DISCO',
                        message: `⚠️ O arquivo 'Bônus Especial - Estudos do Apocalipse.pdf' não foi encontrado na pasta public/funil4!`,
                        priority: 'urgent',
                        tags: 'warning,file_folder',
                        alertKey: 'bonus_pdf_missing',
                        cooldownSec: 300
                    }).catch(() => {});
                }
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
        const clean = targetUrl.replace(/^\/+/, '');
        const directLocalPath = path.join(__dirname, 'public', clean);
        if (fs.existsSync(directLocalPath)) {
            return { buffer: fs.readFileSync(directLocalPath), filename: defaultFilename || path.basename(clean) };
        }
        const base = path.basename(clean);
        const directBase = path.join(__dirname, 'public', base);
        if (fs.existsSync(directBase)) {
            return { buffer: fs.readFileSync(directBase), filename: defaultFilename || base };
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
        case 'START': {
            // Ponto de entrada, continua imediatamente para o próximo nó
            break;
        }

        case 'INPUT': {
            if (config.prompt || config.text) {
                await sendRealisticText(botId, sock, remoteJid, session.userPhone, config.prompt || config.text);
            }
            session.waitingFor = 'USER_REPLY';
            session.currentNodeId = node.nodeId;
            session.variableName = config.variableName || 'user_reply';
            saveStore(store);
            return; // Pausa e aguarda resposta do lead no WhatsApp!
        }

        case 'DELAY': {
            const unit = ((config.delayUnit || 'seconds') + '').toLowerCase();
            let totalSeconds = 0;
            if (config.delayValue !== undefined && !isNaN(Number(config.delayValue))) {
                const val = Number(config.delayValue);
                if (unit === 'days') totalSeconds = val * 86400;
                else if (unit === 'hours') totalSeconds = val * 3600;
                else if (unit === 'minutes') totalSeconds = val * 60;
                else totalSeconds = val;
            } else if (config.delaySeconds !== undefined && !isNaN(Number(config.delaySeconds))) {
                totalSeconds = Number(config.delaySeconds);
            } else {
                totalSeconds = 5;
            }

            totalSeconds = Math.max(1, Math.round(totalSeconds));

            // Delays curtos (<= 15 segundos) executam diretamente inline
            if (totalSeconds <= 15) {
                console.log(`[Visual Flow] ⏳ Delay curto (${totalSeconds}s) em execução direta para ${session.userPhone}`);
                await new Promise((r) => setTimeout(r, totalSeconds * 1000));
                break;
            }

            // Delays longos (> 15 segundos) são agendados de forma persistente no store
            const nextEdge = edges.find((e) => (e.source || e.sourceNodeId) === node.nodeId);
            if (!nextEdge) {
                console.log(`[Visual Flow] ⚠️ Delay finalizado sem próximo nó conectado (${node.nodeId})`);
                return;
            }

            const targetNodeId = nextEdge.target || nextEdge.targetNodeId;
            const resumeAt = Date.now() + (totalSeconds * 1000);

            store.scheduledJobs = store.scheduledJobs || [];
            // Remove jobs anteriores de delay deste usuário e fluxo para evitar duplicações (preservando o timer de expiração isPixTimeout)
            store.scheduledJobs = store.scheduledJobs.filter(j => !(j.userPhone === session.userPhone && j.flowId === session.flowId && !j.isPixTimeout));

            const newJob = {
                jobId: `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                botId,
                userPhone: session.userPhone,
                remoteJid,
                flowId: session.flowId,
                flowName: session.flowName,
                targetNodeId,
                resumeAt,
                delaySeconds: totalSeconds,
                scheduledAt: new Date().toISOString(),
                resumeAtFormatted: new Date(resumeAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
            };

            store.scheduledJobs.push(newJob);
            saveStore(store);

            console.log(`[Visual Flow Scheduler] ⏰ Job persistente agendado com sucesso!`);
            console.log(`   Lead: ${session.userPhone} | Alvo: ${targetNodeId} | Retomada em: ${newJob.resumeAtFormatted} (${totalSeconds}s)`);
            return; // Encerra a thread atual. O Scheduler Worker retomará a partir de targetNodeId no momento exato!
        }

        case 'AUDIO': {
            const durationSec = Math.min(Math.max(Number(config.recordingDurationSeconds) || 4, 1), 15);
            try {
                await sock.sendPresenceUpdate('recording', remoteJid);
            } catch {}
            await new Promise((r) => setTimeout(r, durationSec * 1000));

            const audioUrl = config.audioUrl || 'audio.mp3';
            const cleanAudio = audioUrl.replace(/^\/+/, '');
            const localAudioPath = path.join(__dirname, 'public', cleanAudio);

            let sentAudio = false;
            try {
                sentAudio = await sendPttVoiceNote(sock, remoteJid, localAudioPath, botId, session.userPhone, `Áudio PTT (${node.label || 'Voz'})`);
            } catch (pttErr) {
                console.warn('[executeFromNode AUDIO sendPttVoiceNote Error]:', pttErr?.message);
            }

            if (!sentAudio) {
                const media = await resolveMediaBuffer(audioUrl, 'audio.mp3');
                if (media && media.buffer) {
                    const isMp3 = media.filename.toLowerCase().endsWith('.mp3');
                    await safeDispatchBlock({
                        sock,
                        remoteJid,
                        blockType: 'AUDIO',
                        description: `Áudio: ${media.filename}`,
                        botId,
                        userPhone: session.userPhone,
                        timeoutMs: 30000,
                        sendAction: async (currentSock) => {
                            const targetSock = currentSock || sock;
                            const sent = await targetSock.sendMessage(remoteJid, {
                                audio: media.buffer,
                                mimetype: isMp3 ? 'audio/mpeg' : 'audio/ogg; codecs=opus',
                                ptt: true,
                            });
                            logConversation(botId, session.userPhone, 'BOT', 'AUDIO', `🎙️ [Áudio enviado: ${media.filename}]`);
                            return sent;
                        }
                    });
                } else {
                    const text =
                        config.fallbackText ||
                        `🎙️ *Olá, ${session.userName}!* Que alegria ter você aqui! Já separei o seu material completo para te entregar agora mesmo.`;
                    await sendRealisticText(botId, sock, remoteJid, session.userPhone, text);
                }
            }
            try {
                await (activeSockets.get(botId) || sock).sendPresenceUpdate('paused', remoteJid);
            } catch {}
            break;
        }

        case 'MEDIA': {
            const mediaUrl = config.mediaUrl || 'Material_Exclusivo_Carol.pdf';
            const caption = config.caption || '';
            try {
                await (activeSockets.get(botId) || sock).sendPresenceUpdate('composing', remoteJid);
            } catch {}
            await new Promise((r) => setTimeout(r, 1200));

            const media = await resolveMediaBuffer(mediaUrl, config.filename || 'Material.pdf');
            if (media && media.buffer) {
                const isImage = /\.(jpe?g|png|webp)$/i.test(media.filename);
                const isVideo = /\.(mp4|mov|avi)$/i.test(media.filename);
                const blockType = isImage ? 'IMAGE' : isVideo ? 'VIDEO' : 'PDF';
                await safeDispatchBlock({
                    sock,
                    remoteJid,
                    blockType,
                    description: `Arquivo: ${media.filename}`,
                    botId,
                    userPhone: session.userPhone,
                    sendAction: async (currentSock) => {
                        const targetSock = currentSock || sock;
                        let sent;
                        if (isImage) {
                            sent = await targetSock.sendMessage(remoteJid, { image: media.buffer, caption: caption || undefined });
                        } else if (isVideo) {
                            sent = await targetSock.sendMessage(remoteJid, { video: media.buffer, caption: caption || undefined, mimetype: 'video/mp4' });
                        } else {
                            sent = await targetSock.sendMessage(remoteJid, {
                                document: media.buffer,
                                mimetype: 'application/pdf',
                                fileName: config.filename || media.filename,
                                caption: caption || undefined,
                            });
                        }
                        logConversation(botId, session.userPhone, 'BOT', blockType, `📦 [Arquivo Enviado]: ${media.filename}`);
                        return sent;
                    }
                });
            } else if (caption) {
                await sendRealisticText(botId, sock, remoteJid, session.userPhone, `📦 ${caption}`);
            }
            store.funnelStats.materialDeliveredCount += 1;
            saveStore(store);
            break;
        }

        case 'PIX': {
            const pixKey = String(config.pixKey || 'pagamentos@seunegocio.com').trim();
            const copyCode = String(config.copyPasteCode || pixKey).trim();
            const beneficiaryName = String(config.beneficiaryName || 'Favorecido').trim();
            const amount = config.amount || '19.90';
            const footerText = String(config.footerText || '').trim();
            const configuredKeyType = String(config.pixKeyType || config.keyType || '').trim();

            let sentInteractiveCard = false;
            try {
                sentInteractiveCard = await sendUniversalPixCopyCard({
                    sock: activeSockets.get(botId) || sock,
                    remoteJid,
                    beneficiaryName,
                    pixKey,
                    copyCode,
                    amount,
                    footerText,
                    configuredKeyType,
                    botId,
                    userPhone: session.userPhone
                });
                if (sentInteractiveCard) {
                    const resolvedType = resolvePixKeyType(copyCode || pixKey, configuredKeyType);
                    logConversation(botId, session.userPhone, 'BOT', 'PIX', `[Cartão PIX Nativo (payment_info | ${resolvedType})]: ${pixKey}`);
                }
            } catch (interactiveErr) {
                console.error('[PIX Card Error]:', interactiveErr?.message);
            }

            // Fallback de segurança apenas se o protocolo nativo falhar
            if (!sentInteractiveCard) {
                await sendRealisticText(
                    botId,
                    sock,
                    remoteJid,
                    session.userPhone,
                    `*${beneficiaryName}*\nChave: ${pixKey}\n💰 *Valor:* R$ ${amount}`
                );
            }

            const numericAmount = Number(amount) || 19.90;
            if (!session.originalExpectedAmount) {
                session.originalExpectedAmount = numericAmount;
            }
            session.expectedAmount = numericAmount;
            session.latestPixAmount = numericAmount;
            session.beneficiary = beneficiaryName;
            session.hasReceivedPix = true;
            // Se este bloco PIX está sendo executado dentro de um fluxo de recuperação
            // (após vácuo/timeout ou após recusa/fail), reativa a escuta de comprovante!
            if (!session.paid) {
                session.waitingFor = 'PIX_RECEIPT';
            }
            store.funnelStats.pixSentCount += 1;
            saveStore(store);

            // Segue estritamente para o próximo nó conectado no fluxograma visual (ex: Bloco 3 'Só a Chave PIX' ➔ Bônus 7 ➔ PIX_VERIFIER)
            break;
        }

        case 'PIX_VERIFIER': {
            const verifierNodeId = node.nodeId || node.id;
            session.waitingFor = 'PIX_RECEIPT';
            session.hasReceivedPix = true;
            session.pixVerifierNodeId = verifierNodeId;
            session.pixVerifierStartedAt = Date.now();
            session.expectedAmount = Number(config.expectedAmount || session.expectedAmount || 19.90);
            session.beneficiary = config.beneficiaryName || session.beneficiary || '';
            session.currentNodeId = verifierNodeId;
            saveStore(store);

            console.log(`[Visual Flow] 🧠 Nó PIX_VERIFIER (${node.label || verifierNodeId}) ativado para ${session.userPhone}. Aguardando comprovante...`);

            // 1. Inicia esteira lateral de remarketing se houver aresta no handle 'timeout'
            const timeoutEdge = edges.find(e => 
                ((e.sourceNodeId || e.source) === verifierNodeId) && 
                (e.sourceHandle === 'timeout' || e.sourceHandle === 'reminder')
            );
            if (timeoutEdge) {
                const targetNodeId = timeoutEdge.targetNodeId || timeoutEdge.target;
                const targetNode = nodes.find(n => (n.nodeId || n.id) === targetNodeId);
                console.log(`[Visual Flow] ⏱️ Disparando esteira lateral de remarketing (saída 'timeout') ➔ ${targetNode?.label || targetNodeId}`);
                session.wasInRecovery = true;
                saveStore(store);
                executeFromNode(botId, sock, remoteJid, session, targetNodeId, nodes, edges).catch(err => {
                    console.error(`[Visual Flow] Erro na esteira lateral de remarketing:`, err);
                });
            }

            // 2. Agenda tempo limite sem comprovante para expiração automática (saída 'fail')
            const enableTimeoutLimit = config.enableTimeoutLimit !== false;
            const timeoutHours = Number(config.timeoutHours || 24);
            if (enableTimeoutLimit && timeoutHours > 0) {
                store.scheduledJobs = store.scheduledJobs || [];
                store.scheduledJobs = store.scheduledJobs.filter(j => !(j.userPhone === session.userPhone && j.isPixTimeout));
                const expireResumeAt = Date.now() + (timeoutHours * 3600 * 1000);
                const expireJob = {
                    jobId: `pix_timeout_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                    botId,
                    userPhone: session.userPhone,
                    remoteJid,
                    flowId: session.flowId,
                    flowName: session.flowName,
                    isPixTimeout: true,
                    verifierNodeId,
                    resumeAt: expireResumeAt,
                    delaySeconds: timeoutHours * 3600,
                    scheduledAt: new Date().toISOString(),
                    resumeAtFormatted: new Date(expireResumeAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
                };
                store.scheduledJobs.push(expireJob);
                saveStore(store);
                console.log(`[Visual Flow] ⏳ Tempo limite sem comprovante agendado (${timeoutHours}h) para ${session.userPhone} (Retomada: ${expireJob.resumeAtFormatted})`);
            }

            return;
        }

        case 'META_CAPI': {
            const value = Number(session.paidAmount || session.latestPixAmount || config.value || config.eventValue || session.expectedAmount || 19.90);
            if (config.confirmationText) {
                await sendRealisticText(botId, sock, remoteJid, session.userPhone, String(config.confirmationText));
            }
            await recordAndFireFunnelConversion(botId, session, value, node.label);
            break;
        }

        default: {
            if (config.isReminder === true) {
                const delayMin = Number(config.delayMinutes) || 15;
                const reminderText = config.text || config.messageText || 'Faltou alguma coisa?';
                console.log(`[Visual Flow] ⏰ Agendando lembrete de follow-up (${delayMin} min) para ${session.userPhone}: "${reminderText}"`);
                scheduleVisualReminder(botId, sock, remoteJid, session.userPhone, delayMin, reminderText);
                break;
            }
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

async function recordAndFireFunnelConversion(botId, session, paidValue, customLabel = '') {
    if (session.capiFired) {
        console.log(`[Visual Flow CAPI] ℹ️ Conversão já registrada nesta sessão para ${session.userPhone}. Ignorando duplicidade.`);
        return;
    }
    session.capiFired = true;

    await recoverSessionIdentityAndAttribution(botId, activeSockets.get(botId), session);
    const resolvedPhone = session.realPhone || session.userPhone;
    const adInfo = session.adData || {};

    const value = Number(paidValue || session.paidAmount || session.latestPixAmount || session.expectedAmount || 19.90);
    const now = new Date();
    const transactionRecord = {
        id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: now.toISOString(),
        time: Date.now(),
        dateFormatted: now.toLocaleDateString('pt-BR'),
        timeFormatted: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        botId,
        userPhone: resolvedPhone,
        realPhone: session.realPhone || undefined,
        lidDigits: session.lidDigits || undefined,
        pushName: session.userName || 'Cliente',
        amount: value,
        beneficiary: session.beneficiary || 'Pastor Guilherme',
        funnelId: session.flowId || 'funil_visual',
        funnelName: session.flowName || customLabel || 'Funil Visual',
        accountId: adInfo.accountId || undefined,
        campaignId: adInfo.campaignId || undefined,
        campaignName: adInfo.campaignName || undefined,
        adId: adInfo.adId || undefined,
        adName: adInfo.adName || undefined,
        ctwaClid: adInfo.ctwaClid || undefined,
        ctwaPayload: adInfo.ctwaPayload || undefined,
        adTag: adInfo.adTag || adInfo.rawTag || undefined,
        sourceUrl: adInfo.sourceUrl || undefined,
        entryPointApp: adInfo.sourceApp || adInfo.entryPointApp || undefined,
        creativeVideoId: adInfo.creativeVideoId || undefined,
        isCtwa: Boolean(adInfo.isCtwa || adInfo.ctwaClid || adInfo.ctwaPayload || adInfo.sourceUrl || adInfo.sourceId),
        isRecovery: Boolean(session.wasInRecovery || session.rejectedPayment || session.expired),
        status: 'APROVADO_PIX',
        capiStatus: 'PENDING'
    };

    try {
        const capiRes = await sendMetaCapiConversion(transactionRecord);
        transactionRecord.capiMode = capiRes.capiMode || undefined;
        transactionRecord.capiMatchKeys = capiRes.matchKeys || undefined;
        transactionRecord.capiRealPhoneMatched = Boolean(capiRes.realPhoneMatched);
        transactionRecord.capiStatus = capiRes.success
            ? 'ENVIADO_CAPI_OK'
            : (capiRes.skipped ? 'CAPI_CONFIG_PENDENTE' : 'ERRO_CAPI: ' + capiRes.error);
        console.log(`[Visual Flow META_CAPI] 🎯 Disparo CAPI (${transactionRecord.isRecovery ? 'RECUPERAÇÃO' : 'DIRETO'} | ${capiRes.capiMode || '-'} | R$ ${value.toFixed(2)}): ${transactionRecord.capiStatus}`);
    } catch (capiErr) {
        transactionRecord.capiStatus = 'ERRO_CAPI: ' + capiErr.message;
    }

    store.funnelTransactions = store.funnelTransactions || [];
    store.funnelTransactions.unshift(transactionRecord);
    store.funnelStats.convertedCount = (store.funnelStats.convertedCount || 0) + 1;
    store.funnelStats.totalRevenue = Number(((store.funnelStats.totalRevenue || 0) + value).toFixed(2));
    saveStore(store);

    notifyFaceHubWebhook(transactionRecord).catch(() => {});
    sendNtfyNotification(transactionRecord).catch(() => {});
}

async function sendRealisticText(botId, sock, remoteJid, userPhone, text, options = {}) {
    const preview = (text || '').length > 60 ? (text || '').substring(0, 57) + '...' : text;
    return safeDispatchBlock({
        sock,
        remoteJid,
        blockType: 'TEXT',
        description: preview,
        botId,
        userPhone,
        sendAction: async (currentSock) => {
            const targetSock = currentSock || activeSockets.get(botId) || sock;
            try {
                await targetSock.sendPresenceUpdate('composing', remoteJid);
            } catch {}
            await new Promise((r) => setTimeout(r, 1200));
            const sent = await targetSock.sendMessage(remoteJid, { text }, options);
            logConversation(botId, userPhone, 'BOT', 'TEXT', text);
            try {
                await targetSock.sendPresenceUpdate('paused', remoteJid);
            } catch {}
            return sent;
        }
    });
}

// ─── Visual Flow Scheduler Worker (Delays Longos & Remarketing Persistente) ───
let schedulerWorkerInterval = null;

function initSchedulerWorker(intervalMs = 15000) {
    if (schedulerWorkerInterval) {
        clearInterval(schedulerWorkerInterval);
    }

    console.log(`[Visual Flow Scheduler] 🔄 Worker de agendamento persistente iniciado (verificação a cada ${intervalMs / 1000}s)...`);

    schedulerWorkerInterval = setInterval(async () => {
        try {
            if (!store.scheduledJobs || store.scheduledJobs.length === 0) return;

            const now = Date.now();
            const readyJobs = store.scheduledJobs.filter(j => Number(j.resumeAt) <= now);
            if (readyJobs.length === 0) return;

            for (const job of readyJobs) {
                // Remove job da fila para não executar duas vezes
                store.scheduledJobs = store.scheduledJobs.filter(j => j.jobId !== job.jobId);
                saveStore(store);

                const sessionKey = `${job.botId}:${job.userPhone}`;
                const session = store.userSessions ? store.userSessions[sessionKey] : null;

                // Se o lead já pagou, descarta a continuação da fila de remarketing
                if (session && session.paid) {
                    console.log(`[Visual Flow Scheduler] ⏩ Ignorando job ${job.jobId} para ${job.userPhone}: Lead já pagou.`);
                    continue;
                }

                const sock = activeSockets.get(job.botId);
                if (!sock) {
                    console.warn(`[Visual Flow Scheduler] ⚠️ Bot ${job.botId} não conectado. Reagendando job ${job.jobId} para daqui a 30s...`);
                    job.resumeAt = Date.now() + 30000;
                    store.scheduledJobs.push(job);
                    saveStore(store);
                    continue;
                }

                const flows = store.flows[job.botId] || [];
                let flow = flows.find(f => f._id === job.flowId || f.name === job.flowName);
                if (!flow) {
                    try {
                        const defFlowsPath = path.join(__dirname, 'default_flows.json');
                        if (fs.existsSync(defFlowsPath)) {
                            const defFlows = JSON.parse(fs.readFileSync(defFlowsPath, 'utf-8'));
                            flow = defFlows.find(f => f._id === job.flowId || f.name === job.flowName);
                        }
                    } catch {}
                }

                if (!flow || !flow.draftVersion?.flowData) {
                    console.warn(`[Visual Flow Scheduler] ❌ Fluxo "${job.flowId}" não encontrado para retomar nó ${job.targetNodeId}.`);
                    continue;
                }

                const nodes = flow.draftVersion.flowData.nodes || [];
                const edges = flow.draftVersion.flowData.edges || [];

                // Tratamento especial para expiração de comprovante PIX (timeout de espera sem resposta)
                if (job.isPixTimeout) {
                    if (session && session.waitingFor === 'PIX_RECEIPT' && !session.paid) {
                        console.warn(`[Visual Flow Scheduler] ⌛ Tempo limite sem comprovante expirado para ${job.userPhone}!`);
                        session.waitingFor = null;
                        session.expired = true;
                        saveStore(store);

                        const failEdge = edges.find(e => (e.sourceNodeId || e.source) === job.verifierNodeId && e.sourceHandle === 'fail');
                        if (failEdge) {
                            await executeFromNode(job.botId, sock, job.remoteJid, session, failEdge.targetNodeId || failEdge.target, nodes, edges);
                        } else {
                            const verifierNode = nodes.find(n => (n.nodeId || n.id) === job.verifierNodeId);
                            const timeoutMsg = verifierNode?.config?.failureMessage || 'Percebemos que o comprovante não foi enviado e o atendimento foi encerrado. Caso deseje reabrir, basta nos mandar uma mensagem!';
                            await sendRealisticText(job.botId, sock, job.remoteJid, job.userPhone, timeoutMsg);
                        }
                    }
                    continue;
                }

                console.log(`[Visual Flow Scheduler] 🚀 Executando nó retomado ${job.targetNodeId} para ${job.userPhone}...`);

                const currentSession = session || {
                    botId: job.botId,
                    userPhone: job.userPhone,
                    flowId: job.flowId,
                    flowName: job.flowName,
                    currentNodeId: job.targetNodeId,
                    waitingFor: null,
                    userName: 'Amigo(a)',
                    updatedAt: new Date().toISOString()
                };

                await executeFromNode(job.botId, sock, job.remoteJid, currentSession, job.targetNodeId, nodes, edges);
            }
        } catch (workerErr) {
            console.error('[Visual Flow Scheduler Worker Error]:', workerErr?.message);
        }
    }, intervalMs);
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
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (_req, res) => {
    res.json({
        success: true,
        message: 'QR Engine Online (Cloud KV Synced)',
        cloudWorkerUrl: CLOUD_WORKER_URL,
        timestamp: new Date().toISOString(),
    });
});

// Catálogo de todas as mídias disponíveis no servidor
app.get('/api/media/catalog', (_req, res) => {
    try {
        const publicDir = path.join(__dirname, 'public');
        const catalog = [];
        if (fs.existsSync(publicDir)) {
            const scan = (dir, relPath = '') => {
                const items = fs.readdirSync(dir);
                for (const item of items) {
                    if (item.startsWith('.')) continue;
                    const full = path.join(dir, item);
                    const rel = relPath ? `${relPath}/${item}` : item;
                    const stat = fs.statSync(full);
                    if (stat.isDirectory()) {
                        scan(full, rel);
                    } else {
                        const ext = path.extname(item).toLowerCase();
                        let type = 'OTHER';
                        if (['.ogg', '.mp3', '.wav', '.m4a', '.opus'].includes(ext)) type = 'AUDIO';
                        else if (['.pdf'].includes(ext)) type = 'DOCUMENT';
                        else if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) type = 'IMAGE';
                        else if (['.mp4', '.mov', '.avi'].includes(ext)) type = 'VIDEO';
                        catalog.push({
                            name: item,
                            path: rel,
                            type,
                            size: stat.size,
                            folder: relPath || 'root'
                        });
                    }
                }
            };
            scan(publicDir);
        }
        res.json({ success: true, count: catalog.length, data: catalog });
    } catch (err) {
        res.status(500).json({ success: false, error: err?.message });
    }
});

// Upload direto de mídias (áudio, PDF, imagens, vídeos)
app.post('/api/media/upload', async (req, res) => {
    try {
        const { filename, data, folder, mimetype } = req.body || {};
        if (!filename || !data) {
            return res.status(400).json({ success: false, error: 'Arquivo inválido ou ausente' });
        }
        const safeFolder = (folder || 'uploads').replace(/[^a-zA-Z0-9_\-\/]/g, '').replace(/^\/+|\/+$/g, '') || 'uploads';
        const targetDir = path.join(__dirname, 'public', safeFolder);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        const cleanName = path.basename(filename).replace(/[^a-zA-Z0-9_.\-\s()]/g, '_');
        const filePath = path.join(targetDir, cleanName);
        
        const base64Data = data.includes(';base64,') ? data.split(';base64,')[1] : data;
        const buffer = Buffer.from(base64Data, 'base64');
        fs.writeFileSync(filePath, buffer);
        
        const relativeUrl = `${safeFolder}/${cleanName}`;
        console.log(`[Media Upload] ✅ Salvo com sucesso: ${filePath} (${buffer.length} bytes) -> url: ${relativeUrl}`);
        
        return res.json({
            success: true,
            url: relativeUrl,
            filename: cleanName,
            size: buffer.length,
            mimetype: mimetype || 'application/octet-stream'
        });
    } catch (err) {
        console.error('[Media Upload] ❌ Erro ao processar upload:', err?.message);
        return res.status(500).json({ success: false, error: err?.message || 'Erro interno no upload' });
    }
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
        store.flows[botId] = mergeFlowsPreservingNewest(store.flows[botId] || [], req.body.flows);
        saveStore(store);
        scheduleCloudKvFlowsBackup(botId);
        console.log(`[QR Engine Sync] 🔄 ${store.flows[botId].length} fluxos sincronizados/mesclados para bot ${botId}`);
    }
    res.json({ success: true, count: store.flows[botId]?.length || 0 });
});

// Suporte direto para /bots/:botId/whatsapp/qr/sync (sem prefixo /api)
app.post('/bots/:botId/whatsapp/qr/sync', (req, res) => {
    const botId = String(req.params.botId || 'bot_whatsapp_principal');
    if (req.body?.flows && Array.isArray(req.body.flows)) {
        store.flows[botId] = mergeFlowsPreservingNewest(store.flows[botId] || [], req.body.flows);
        saveStore(store);
        scheduleCloudKvFlowsBackup(botId);
        console.log(`[QR Engine Sync Direct] 🔄 ${store.flows[botId].length} fluxos sincronizados/mesclados para bot ${botId}`);
    }
    res.json({ success: true, count: store.flows[botId]?.length || 0 });
});

app.get(['/api/bots/:botId/flows', '/bots/:botId/flows'], (req, res) => {
    const botId = String(req.params.botId || 'bot_whatsapp_principal');
    const flows = ensureBotVisualFlowsLoaded(botId);
    res.json({ success: true, data: flows });
});

app.get(['/api/bots/:botId/flows/:flowId', '/bots/:botId/flows/:flowId'], (req, res) => {
    const botId = String(req.params.botId || 'bot_whatsapp_principal');
    const flowId = String(req.params.flowId);
    const flows = ensureBotVisualFlowsLoaded(botId);
    const flow = flows.find(f => f._id === flowId) || flows[0];
    if (!flow) return res.status(404).json({ success: false, error: 'Funil não encontrado' });
    res.json({ success: true, data: flow });
});

app.put(['/api/bots/:botId/flows/:flowId/draft', '/bots/:botId/flows/:flowId/draft'], (req, res) => {
    const botId = String(req.params.botId || 'bot_whatsapp_principal');
    const flowId = String(req.params.flowId);
    const flows = ensureBotVisualFlowsLoaded(botId);
    const flowIndex = flows.findIndex(f => f._id === flowId);
    if (flowIndex < 0) {
        return res.status(404).json({ success: false, error: 'Funil não encontrado' });
    }
    const flowData = req.body?.flowData || {};
    if (Array.isArray(flowData.edges)) {
        flowData.edges = flowData.edges.map((e, idx) => ({
            ...e,
            id: e.id || e.edgeId || `edge_${idx}`,
            edgeId: e.edgeId || e.id || `edge_${idx}`,
            source: e.source || e.sourceNodeId,
            sourceNodeId: e.sourceNodeId || e.source,
            target: e.target || e.targetNodeId,
            targetNodeId: e.targetNodeId || e.target,
        }));
    }
    const startNode = (flowData.nodes || []).find(n => (n.nodeType || '').toUpperCase() === 'START');
    if (startNode) {
        const labelTrigMatch = String(startNode.label || '').match(/gatilho:\s*([^\)\]]+)/i);
        if (!startNode.config?.trigger && labelTrigMatch?.[1]) {
            startNode.config = { ...(startNode.config || {}), trigger: labelTrigMatch[1].trim() };
        }
    }
    flows[flowIndex].draftVersion = {
        ...(flows[flowIndex].draftVersion || { version: 1 }),
        flowData
    };
    flows[flowIndex].publishedVersion = JSON.parse(JSON.stringify(flows[flowIndex].draftVersion));
    flows[flowIndex].updatedAt = new Date().toISOString();
    store.flows[botId] = flows;
    saveStore(store);
    scheduleCloudKvFlowsBackup(botId);
    console.log(`[QR Engine Draft] 💾 Rascunho do funil "${flows[flowIndex].name}" (${flowId}) salvo com sucesso!`);
    res.json({ success: true, data: flows[flowIndex] });
});

app.post(['/api/bots/:botId/flows/:flowId/validate', '/bots/:botId/flows/:flowId/validate'], (_req, res) => {
    res.json({
        success: true,
        data: { isValid: true, errors: [], warnings: [] }
    });
});

app.delete(['/api/bots/:botId/flows/:flowId', '/bots/:botId/flows/:flowId'], (req, res) => {
    const botId = String(req.params.botId || 'bot_whatsapp_principal');
    const flowId = String(req.params.flowId);
    const flows = ensureBotVisualFlowsLoaded(botId);
    store.flows[botId] = flows.filter(f => f._id !== flowId);
    saveStore(store);
    scheduleCloudKvFlowsBackup(botId);
    res.json({ success: true, data: null });
});

app.post(['/api/bots/:botId/flows/:flowId/duplicate', '/bots/:botId/flows/:flowId/duplicate'], (req, res) => {
    const botId = String(req.params.botId || 'bot_whatsapp_principal');
    const flowId = String(req.params.flowId);
    const flows = store.flows[botId] || [];
    const sourceFlow = flows.find(f => f._id === flowId);
    if (!sourceFlow) {
        return res.status(404).json({ success: false, error: 'Funil não encontrado' });
    }

    const newFlowId = 'flow_' + Date.now();
    const clonedFlowData = JSON.parse(JSON.stringify(sourceFlow.draftVersion?.flowData || { nodes: [], edges: [] }));
    const startNode = (clonedFlowData.nodes || []).find(n => (n.nodeType || '').toUpperCase() === 'START');
    let newTrigger = 'novo_gatilho';
    if (startNode) {
        const oldTrigger = (startNode.config?.trigger || 'start').trim();
        if (/_copia(_\d+)?$/i.test(oldTrigger)) {
            const match = oldTrigger.match(/_copia_?(\d+)?$/i);
            const nextNum = match && match[1] ? parseInt(match[1], 10) + 1 : 2;
            newTrigger = oldTrigger.replace(/_copia(_\d+)?$/i, `_copia_${nextNum}`);
        } else {
            newTrigger = `${oldTrigger}_copia`;
        }
        startNode.config = { ...(startNode.config || {}), trigger: newTrigger };
        startNode.label = `Início (Gatilho: ${newTrigger})`;
    }

    let newName = sourceFlow.name || 'Novo Funil';
    if (newName.includes('(Gatilho:')) {
        newName = newName.replace(/\(Gatilho:\s*[^)]+\)/i, `(Gatilho: ${newTrigger})`);
    }
    if (!newName.endsWith('(Cópia)')) {
        newName = `${newName} (Cópia)`;
    }

    const duplicatedFlow = {
        ...JSON.parse(JSON.stringify(sourceFlow)),
        _id: newFlowId,
        botId,
        name: newName,
        isMainFlow: false,
        isDeployed: true,
        productionVersion: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        draftVersion: {
            version: 1,
            flowData: clonedFlowData
        },
        publishedVersion: {
            version: 1,
            flowData: clonedFlowData
        }
    };

    const sourceIndex = flows.findIndex(f => f._id === flowId);
    if (sourceIndex >= 0) {
        flows.splice(sourceIndex + 1, 0, duplicatedFlow);
    } else {
        flows.push(duplicatedFlow);
    }
    store.flows[botId] = flows;
    saveStore(store);
    scheduleCloudKvFlowsBackup(botId);
    console.log(`[QR Engine Duplicate] 📋 Funil "${sourceFlow.name}" duplicado como "${newName}" (Gatilho: ${newTrigger})`);
    res.status(201).json({ success: true, data: duplicatedFlow });
});

app.post(['/api/bots/:botId/flows/:flowId/deploy', '/bots/:botId/flows/:flowId/deploy'], (req, res) => {
    const botId = String(req.params.botId || 'bot_whatsapp_principal');
    const flowId = String(req.params.flowId);
    const flows = store.flows[botId] || [];
    const flow = flows.find(f => f._id === flowId);
    if (flow) {
        flow.isDeployed = true;
        flow.productionVersion = (flow.productionVersion || 1) + 1;
        if (flow.draftVersion) {
            flow.publishedVersion = JSON.parse(JSON.stringify(flow.draftVersion));
        }
        flow.updatedAt = new Date().toISOString();
        saveStore(store);
        scheduleCloudKvFlowsBackup(botId);
        console.log(`[QR Engine Deploy] 🚀 Funil "${flow.name}" deployado em produção!`);
        return res.json({ success: true, data: flow });
    }
    res.status(404).json({ success: false, error: 'Funil não encontrado' });
});


// ─── ROTA DE RECUPERAÇÃO ATIVA DE LEADS (DISPARO DE FLUXO VISUAL / FUNIL 4) ───
app.post('/api/funnels/recover-lead', async (req, res) => {
    try {
        const botId = String(req.body.botId || 'bot_whatsapp_principal');
        const rawPhone = String(req.body.phone || '').replace(/\D/g, '');
        const pushName = String(req.body.name || 'Cliente').trim() || 'Cliente';
        const funnel = String(req.body.funnel || 'funil4').trim();
        const hasExplicitLegacyFunnel = req.body.funnel && req.body.funnel !== 'funil4' && req.body.funnel !== 'active' && !String(req.body.funnel).startsWith('flow_');
        const requestedFlowId = String(
            req.body.flowId ||
            (funnel.startsWith('flow_') ? funnel : '') ||
            (req.body.useActiveSingleFunnel || funnel === 'active' || (!hasExplicitLegacyFunnel && store.singleFunnelMode && store.activeFunnelId) ? (store.activeFunnelId || 'flow_funil_4') : '')
        ).trim();

        if (!rawPhone || rawPhone.length < 10) {
            return res.status(400).json({ success: false, error: 'Número de telefone inválido' });
        }

        const sock = activeSockets.get(botId);
        if (!sock || !sock.user) {
            return res.status(400).json({ success: false, error: 'WhatsApp não está conectado no servidor' });
        }

        const jidInfo = await resolveBrazilianWhatsAppJid(sock, rawPhone);
        const canonicalPhone = jidInfo.phoneDigits || rawPhone;
        const remoteJid = jidInfo.jid || `${canonicalPhone}@s.whatsapp.net`;
        const sessionKey = `${botId}:${canonicalPhone}`;

        console.log(`[Lead Recovery] 🚀 Disparando recuperação para ${pushName} (${rawPhone} -> JID: ${remoteJid}, Verified: ${jidInfo.exists}, Flow: ${requestedFlowId || funnel})`);

        // Cancelar timers antigos e limpar sessões antigas em todas as variantes do número/@lid
        for (const variant of jidInfo.allVariants) {
            cancelFunil4Reminder(botId, variant);
            delete store.userSessions[`${botId}:${variant}`];
        }
        delete store.userSessions[sessionKey];
        if (store.scheduledJobs) {
            const variantSet = new Set(jidInfo.allVariants);
            store.scheduledJobs = store.scheduledJobs.filter(j => !variantSet.has(String(j.userPhone || '')));
        }
        saveStore(store);

        if (requestedFlowId || funnel === 'funil4') {
            const targetFlowId = requestedFlowId || 'flow_funil_4';
            const visualFlow = getVisualFlowById(botId, targetFlowId) || (store.activeFunnelId ? getVisualFlowById(botId, store.activeFunnelId) : null);
            const firstEdge = visualFlow ? visualFlow.edges.find(e => (e.sourceNodeId || e.source) === visualFlow.startNode.nodeId) : null;

            if (visualFlow && firstEdge) {
                const lidDigitsFromInfo = jidInfo.lid ? jidInfo.lid.split('@')[0].split(':')[0].replace(/\D/g, '') : undefined;
                const session = {
                    botId,
                    userJid: remoteJid,
                    userPhone: canonicalPhone,
                    realPhone: isPlausibleRealPhone(canonicalPhone) ? canonicalPhone : undefined,
                    lidDigits: lidDigitsFromInfo || undefined,
                    userName: pushName,
                    flowId: visualFlow.flow._id,
                    flowName: visualFlow.flow.name,
                    currentNodeId: visualFlow.startNode.nodeId,
                    adData: req.body.adData || { source: 'manual_recovery', originalPhone: rawPhone },
                    inFlightStartedAt: Date.now(),
                    updatedAt: new Date().toISOString()
                };
                syncSessionAliases(botId, session, [rawPhone, lidDigitsFromInfo]);
                saveStore(store);

                console.log(`[Lead Recovery] ⏳ Executando fluxo visual "${visualFlow.flow.name}" (${visualFlow.flow._id}) para ${canonicalPhone}...`);
                try {
                    await executeFromNode(botId, sock, remoteJid, session, firstEdge.targetNodeId || firstEdge.target, visualFlow.nodes, visualFlow.edges);
                } finally {
                    delete session.inFlightStartedAt;
                    saveStore(store);
                }

                return res.json({
                    success: true,
                    message: `Fluxo "${visualFlow.flow.name}" disparado com sucesso para ${canonicalPhone}!`,
                    flowId: visualFlow.flow._id,
                    flowName: visualFlow.flow.name,
                    jid: remoteJid,
                    resolvedPhone: canonicalPhone,
                    lid: jidInfo.lid || null,
                    onWhatsAppVerified: jidInfo.exists
                });
            }
        }

        if (funnel === 'funil4') {
            console.log(`[Lead Recovery] ⏳ Aguardando espaçamento de conexão (legado funil4) para ${canonicalPhone}...`);
            await new Promise((r) => setTimeout(r, 1500));
            await sendFunil4Phase1(botId, sock, remoteJid, canonicalPhone, pushName);
        } else if (funnel === 'funil1') {
            console.log(`[Lead Recovery] ⏳ Aguardando espaçamento de conexão (funil1) para ${canonicalPhone}...`);
            await new Promise((r) => setTimeout(r, 1500));
            await sendParabolasPhase1(botId, sock, remoteJid, canonicalPhone, pushName);
        } else {
            return res.status(404).json({ success: false, error: `Funil "${requestedFlowId || funnel}" não encontrado ou sem fluxo válido` });
        }

        res.json({
            success: true,
            message: `Fase 1 do ${funnel} disparada com sucesso para ${canonicalPhone}!`,
            jid: remoteJid,
            resolvedPhone: canonicalPhone,
            onWhatsAppVerified: jidInfo.exists
        });
    } catch (err) {
        console.error('[Lead Recovery Error]:', err);
        res.status(500).json({ success: false, error: err?.message || 'Erro ao recuperar lead' });
    }
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

// ─── ROTAS DE INTEGRAÇÃO COM O METAHUB (META ADS MULTI-CONTAS) ───
app.get('/api/funnels', (_req, res) => {
    try {
        const flows = store.flows['bot_whatsapp_principal'] || [];
        let baseFlows = flows;
        if (!baseFlows || baseFlows.length === 0) {
            const defFlowsPath = path.join(__dirname, 'default_flows.json');
            if (fs.existsSync(defFlowsPath)) {
                baseFlows = JSON.parse(fs.readFileSync(defFlowsPath, 'utf-8'));
            }
        }

        const funnelsList = [];
        const seenIds = new Set();

        (baseFlows || []).forEach((flow, index) => {
            const fid = flow._id;
            seenIds.add(fid);

            const nodes = flow.draftVersion?.flowData?.nodes || [];
            const startNode = nodes.find(n => (n.nodeType || '').toUpperCase() === 'START');
            const pixNode = nodes.find(n => (n.nodeType || '').toUpperCase() === 'PIX' || (n.nodeType || '').toUpperCase() === 'PIX_VERIFIER');

            const nameTrigMatch = String(flow.name || '').match(/gatilho:\s*([^\)\]]+)/i);
            const trigger = (startNode?.config?.trigger || (nameTrigMatch ? nameTrigMatch[1] : '') || `teste${index + 1}`).trim();
            const expectedAmount = Number(pixNode?.config?.amount || pixNode?.config?.expectedAmount || 19.90);
            const beneficiary = pixNode?.config?.pixKeyName || pixNode?.config?.beneficiary || 'Pastor Guilherme';

            const canonicalMatch = FUNNELS_CATALOG.find(c => c.id === fid || c.trigger === trigger);
            const rawName = flow.name || canonicalMatch?.name || `Funil ${index + 1}`;
            const whatsappPhone = canonicalMatch?.whatsappPhone || store.connectedPhone || '551152291989';
            const defaultMsg = canonicalMatch?.defaultMessage || `Olá! Gostaria de receber ${rawName} [ref_{{campaign.id}}_{{ad.id}}]`;

            const txs = (store.funnelTransactions || []).filter(t => t.funnelId === fid || t.funnelId === canonicalMatch?.id);
            const sales = txs.length;
            const revenue = txs.reduce((acc, cur) => acc + (cur.amount || 0), 0);

            funnelsList.push({
                id: fid,
                canonicalId: canonicalMatch?.id || fid,
                name: rawName,
                trigger,
                expectedAmount,
                beneficiary,
                whatsappPhone,
                defaultMessage: defaultMsg,
                isDeployed: flow.isDeployed !== false,
                isCustomOrCopy: !canonicalMatch,
                sales,
                revenue: Number(revenue.toFixed(2))
            });
        });

        // Adicionar do catálogo canônico se algum não constava
        FUNNELS_CATALOG.forEach((cat) => {
            if (!seenIds.has(cat.id) && !funnelsList.some(f => f.trigger === cat.trigger)) {
                const txs = (store.funnelTransactions || []).filter(t => t.funnelId === cat.id);
                funnelsList.push({
                    ...cat,
                    sales: txs.length,
                    revenue: Number(txs.reduce((acc, cur) => acc + (cur.amount || 0), 0).toFixed(2))
                });
            }
        });

        res.json({
            success: true,
            count: funnelsList.length,
            singleFunnelMode: Boolean(store.singleFunnelMode),
            activeFunnelId: store.activeFunnelId || 'flow_1794362249148',
            activeFunnelName: store.activeFunnelName || 'Funil 4: Jornada da Bíblia - João Antônio (Gatilho: teste4_copia) - 82 99689-8259 (Cópia)',
            funnels: funnelsList
        });
    } catch (err) {
        console.error('[GET /api/funnels] Erro:', err);
        res.status(500).json({ success: false, error: err?.message });
    }
});

app.post('/api/funnels/mode', (req, res) => {
    try {
        const { singleFunnelMode, activeFunnelId, activeFunnelName } = req.body || {};
        funnelModeLocalChanged = true;
        store.singleFunnelMode = Boolean(singleFunnelMode);
        if (activeFunnelId) store.activeFunnelId = String(activeFunnelId).trim();
        if (activeFunnelName) store.activeFunnelName = String(activeFunnelName).trim();
        saveStore(store);
        backupFunnelModeToCloudKv('bot_whatsapp_principal').catch(() => {});
        console.log(`[MetaHub] Modo Funil Único atualizado: ${store.singleFunnelMode ? 'ATIVO' : 'DESATIVADO'} -> ${store.activeFunnelName} (${store.activeFunnelId})`);
        res.json({
            success: true,
            singleFunnelMode: store.singleFunnelMode,
            activeFunnelId: store.activeFunnelId,
            activeFunnelName: store.activeFunnelName
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err?.message });
    }
});

app.get('/api/funnels/mode', (_req, res) => {
    res.json({
        success: true,
        singleFunnelMode: Boolean(store.singleFunnelMode),
        activeFunnelId: store.activeFunnelId || 'flow_1794362249148',
        activeFunnelName: store.activeFunnelName || 'Funil 4: Jornada da Bíblia - João Antônio (Gatilho: teste4_copia) - 82 99689-8259 (Cópia)'
    });
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

    const s = store.funnelStats || {};
    const started = s.startedCount || 0;
    const pixSent = s.pixSentCount || 0;
    const converted = totalSales || s.convertedCount || 0;

    const funnelStats = {
        startedCount: started,
        materialDeliveredCount: s.materialDeliveredCount || 0,
        pixSentCount: pixSent,
        receiptReceivedCount: s.receiptReceivedCount || 0,
        convertedCount: converted,
        totalRevenue: Number(totalRevenue.toFixed(2)),
        defaultRate: pixSent > 0 ? Math.max(0, Math.round(((pixSent - converted) / pixSent) * 100)) : 0,
        conversionRate: started > 0 ? Number(((converted / started) * 100).toFixed(1)) : 0,
        recentConversions: txs.length > 0 ? txs.slice(0, 10) : []
    };

    res.json({
        success: true,
        metrics: {
            totalSales,
            totalRevenue: Number(totalRevenue.toFixed(2)),
            capiSuccess,
            campaignsTracked: Object.values(campaignMap),
            funnelStats
        }
    });
});

app.post('/api/funnels/reset', (_req, res) => {
    store.funnelTransactions = [];
    store.funnelStats = {
        startedCount: 0,
        materialDeliveredCount: 0,
        pixSentCount: 0,
        receiptReceivedCount: 0,
        convertedCount: 0,
        dropOffCount: 0,
        totalRevenue: 0.00,
        recentConversions: []
    };
    saveStore(store);
    res.json({ success: true, message: 'Funil e métricas zerados com sucesso para início da operação real!' });
});

app.get('/api/admin/runtime-state', (req, res) => {
    const botId = String(req.query.botId || 'bot_whatsapp_principal');
    res.json({
        success: true,
        singleFunnelMode: Boolean(store.singleFunnelMode),
        activeFunnelId: store.activeFunnelId || null,
        activeFunnelName: store.activeFunnelName || null,
        state: buildRuntimeStatePayload(botId),
    });
});

app.post('/api/admin/runtime-state', async (req, res) => {
    try {
        const body = req.body || {};
        const botId = String(body.botId || 'bot_whatsapp_principal');
        const statePayload = body.state || body;
        const summary = mergeRuntimeState(statePayload, {
            reconstructMissingSessions: Boolean(body.reconstructMissingSessions),
        });
        if (typeof body.singleFunnelMode === 'boolean') {
            store.singleFunnelMode = body.singleFunnelMode;
        }
        if (body.activeFunnelId) store.activeFunnelId = String(body.activeFunnelId);
        if (body.activeFunnelName) store.activeFunnelName = String(body.activeFunnelName);
        saveStore(store);
        const backupRes = await flushRuntimeStateBackupNow(botId, true);
        res.json({
            success: true,
            summary,
            backup: backupRes,
            totalSessions: Object.keys(store.userSessions || {}).length,
            totalJobs: (store.scheduledJobs || []).length,
            totalConversations: (store.conversations || []).length,
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err?.message || 'Erro ao restaurar runtime state' });
    }
});

app.post('/api/admin/runtime-state/backup', async (req, res) => {
    try {
        const botId = String(req.body?.botId || 'bot_whatsapp_principal');
        const backupRes = await flushRuntimeStateBackupNow(botId, true);
        res.json({
            success: Boolean(backupRes?.success),
            ...backupRes,
            totalSessions: Object.keys(store.userSessions || {}).length,
            totalJobs: (store.scheduledJobs || []).length,
            totalConversations: (store.conversations || []).length,
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err?.message || 'Erro ao fazer backup runtime' });
    }
});

app.post('/api/admin/manual-pix-approve', async (req, res) => {
    try {
        const body = req.body || {};
        const botId = String(body.botId || 'bot_whatsapp_principal');
        const rawJid = String(body.jid || '').trim();
        const rawPhone = String(body.phone || rawJid.split('@')[0] || '').split(':')[0].replace(/\D/g, '');
        const flowId = String(body.flowId || store.activeFunnelId || 'flow_1794362249148').trim();
        const paidValue = Number(body.amount || 20.0);
        const recordSale = body.recordSale !== false;
        const pushName = String(body.name || 'Cliente').trim() || 'Cliente';

        if (!rawJid && (!rawPhone || rawPhone.length < 10)) {
            return res.status(400).json({ success: false, error: 'Informe jid ou phone válido.' });
        }

        const sock = activeSockets.get(botId);
        if (!sock || !sock.user) {
            return res.status(400).json({ success: false, error: 'WhatsApp não está conectado no servidor.' });
        }

        let remoteJid = rawJid;
        let canonicalPhone = rawPhone;
        let resolvedRealPhone = isPlausibleRealPhone(rawPhone) ? rawPhone : null;
        let resolvedLidDigits = null;
        const variantPhones = new Set(canonicalPhone ? getBrazilianPhoneVariants(canonicalPhone) : []);

        if (rawJid && rawJid.endsWith('@lid')) {
            remoteJid = rawJid;
            resolvedLidDigits = rawJid.split('@')[0].split(':')[0].replace(/\D/g, '') || null;
            if (resolvedLidDigits) variantPhones.add(resolvedLidDigits);
            try {
                const pn = await sock?.signalRepository?.lidMapping?.getPNForLID?.(rawJid);
                if (pn) {
                    const pnDigits = String(pn).split('@')[0].split(':')[0].replace(/\D/g, '');
                    if (!resolvedRealPhone && isPlausibleRealPhone(pnDigits, `${pn}`.includes('@') ? pn : '@s.whatsapp.net')) {
                        resolvedRealPhone = pnDigits;
                    }
                    getBrazilianPhoneVariants(pnDigits).forEach(v => variantPhones.add(v));
                }
            } catch {}
            canonicalPhone = resolvedRealPhone || resolvedLidDigits || canonicalPhone;
        } else if (!remoteJid) {
            const jidInfo = await resolveBrazilianWhatsAppJid(sock, rawPhone);
            remoteJid = jidInfo.jid || `${rawPhone}@s.whatsapp.net`;
            canonicalPhone = jidInfo.phoneDigits || rawPhone;
            if (isPlausibleRealPhone(canonicalPhone, remoteJid)) {
                resolvedRealPhone = canonicalPhone;
            }
            (jidInfo.allVariants || []).forEach(v => variantPhones.add(v));
            if (jidInfo.lid) {
                resolvedLidDigits = jidInfo.lid.split('@')[0].split(':')[0].replace(/\D/g, '') || null;
                if (resolvedLidDigits) variantPhones.add(resolvedLidDigits);
            }
        } else {
            const jidDigits = rawJid.split('@')[0].split(':')[0].replace(/\D/g, '');
            if (jidDigits) variantPhones.add(jidDigits);
            if (!resolvedRealPhone && isPlausibleRealPhone(jidDigits, rawJid)) {
                resolvedRealPhone = jidDigits;
            }
            canonicalPhone = resolvedRealPhone || canonicalPhone || jidDigits;
        }
        if (canonicalPhone) variantPhones.add(canonicalPhone);
        if (resolvedRealPhone) getBrazilianPhoneVariants(resolvedRealPhone).forEach(v => variantPhones.add(v));

        // Cancelar todos os timers e agendamentos de cobrança para todas as variantes desse lead
        for (const pVar of variantPhones) {
            if (!pVar) continue;
            cancelAllUserTimers(botId, pVar);
        }
        if (Array.isArray(store.scheduledJobs)) {
            store.scheduledJobs = store.scheduledJobs.filter(j => {
                const jp = String(j.userPhone || '').replace(/\D/g, '');
                const jJidDigits = String(j.remoteJid || '').split('@')[0].split(':')[0].replace(/\D/g, '');
                return !variantPhones.has(jp) && !variantPhones.has(jJidDigits) && j.remoteJid !== remoteJid;
            });
        }

        const visualFlow = getVisualFlowById(botId, flowId) || getVisualFlowById(botId, 'flow_1794362249148');
        if (!visualFlow) {
            return res.status(404).json({ success: false, error: `Fluxo "${flowId}" não encontrado.` });
        }

        const sessionKey = `${botId}:${canonicalPhone}`;
        let session = store.userSessions[sessionKey];
        for (const pVar of variantPhones) {
            if (!session && store.userSessions[`${botId}:${pVar}`]) {
                session = store.userSessions[`${botId}:${pVar}`];
            }
        }
        if (!session) {
            session = {
                botId,
                userJid: remoteJid,
                userPhone: canonicalPhone,
                realPhone: resolvedRealPhone || undefined,
                lidDigits: resolvedLidDigits || undefined,
                userName: pushName,
                flowId: visualFlow.flow._id,
                flowName: visualFlow.flow.name,
            };
        }

        const bestRealPhone = resolvedRealPhone
            || (isPlausibleRealPhone(session.realPhone) ? session.realPhone : null)
            || (isPlausibleRealPhone(session.userPhone) ? session.userPhone : null);
        const bestLidDigits = resolvedLidDigits || session.lidDigits || null;
        canonicalPhone = bestRealPhone || canonicalPhone;

        session.userJid = remoteJid;
        session.userPhone = canonicalPhone;
        if (bestRealPhone) session.realPhone = bestRealPhone;
        if (bestLidDigits) session.lidDigits = bestLidDigits;
        if (req.body?.campaignId || req.body?.adId || req.body?.sourceUrl) {
            session.adData = {
                ...(session.adData || {}),
                ...(req.body.campaignId ? { campaignId: String(req.body.campaignId) } : {}),
                ...(req.body.adId ? { adId: String(req.body.adId) } : {}),
                ...(req.body.sourceUrl ? { sourceUrl: String(req.body.sourceUrl) } : {})
            };
        }
        session.userName = pushName !== 'Cliente' ? pushName : (session.userName || 'Cliente');
        session.flowId = visualFlow.flow._id;
        session.flowName = visualFlow.flow.name;
        session.paid = true;
        session.paidAmount = paidValue;
        session.expectedAmount = paidValue;
        session.waitingFor = null;
        session.rejectedPayment = false;
        session.expired = false;
        session.capiFired = !recordSale;
        session.updatedAt = new Date().toISOString();

        const verifierNode = visualFlow.nodes.find(n => (n.nodeType || '').toUpperCase() === 'PIX_VERIFIER');
        if (verifierNode) {
            session.currentNodeId = verifierNode.nodeId;
        }

        syncSessionAliases(botId, session, Array.from(variantPhones));
        saveStore(store);

        const verifierNodeId = verifierNode ? verifierNode.nodeId : session.currentNodeId;
        const successEdge =
            visualFlow.edges.find(e => (e.sourceNodeId || e.source) === verifierNodeId && e.sourceHandle === 'success') ||
            visualFlow.edges.find(e => (e.sourceNodeId || e.source) === verifierNodeId && (!e.sourceHandle || e.sourceHandle === 'default'));

        if (!successEdge) {
            return res.status(400).json({ success: false, error: 'Nó PIX_VERIFIER sem saída success conectada.' });
        }

        console.log(`[Admin Manual Approve] ✅ Liberando bônus para ${session.userName} (${remoteJid} | R$ ${paidValue.toFixed(2)} | recordSale=${recordSale})...`);
        await executeFromNode(botId, sock, remoteJid, session, successEdge.targetNodeId || successEdge.target, visualFlow.nodes, visualFlow.edges);

        if (recordSale && !session.capiFired) {
            await recordAndFireFunnelConversion(botId, session, paidValue, visualFlow.flow.name);
        }

        await flushRuntimeStateBackupNow(botId, true);

        res.json({
            success: true,
            message: `Bônus enviados para ${session.userName} (${remoteJid})!`,
            remoteJid,
            canonicalPhone,
            amount: paidValue,
            recordSale,
            capiFired: Boolean(session.capiFired),
        });
    } catch (err) {
        console.error('[Admin Manual Approve Error]:', err);
        res.status(500).json({ success: false, error: err?.message || 'Erro ao aprovar manualmente' });
    }
});

app.get('/api/meta/config', (_req, res) => {
    const cfg = store.metaConfig || {};
    res.json({
        success: true,
        pixelId: cfg.pixelId || process.env.META_PIXEL_ID || null,
        pageId: cfg.pageId || process.env.META_PAGE_ID || DEFAULT_META_PAGE_ID,
        wabaId: cfg.wabaId || process.env.META_WABA_ID || null,
        messagingDatasetId: cfg.messagingDatasetId || process.env.META_MESSAGING_DATASET_ID || null,
        hasAccessToken: Boolean(cfg.accessToken || process.env.META_ACCESS_TOKEN),
        facehubWebhookUrl: cfg.facehubWebhookUrl || process.env.FACEHUB_WEBHOOK_URL || null
    });
});

app.post('/api/meta/config', (req, res) => {
    const { pixelId, accessToken, facehubWebhookUrl, pageId, wabaId, messagingDatasetId } = req.body || {};
    store.metaConfig = store.metaConfig || {};
    if (pixelId !== undefined) store.metaConfig.pixelId = pixelId;
    if (accessToken !== undefined) store.metaConfig.accessToken = accessToken;
    if (facehubWebhookUrl !== undefined) store.metaConfig.facehubWebhookUrl = facehubWebhookUrl;
    if (pageId !== undefined) store.metaConfig.pageId = pageId;
    if (wabaId !== undefined) store.metaConfig.wabaId = wabaId;
    if (messagingDatasetId !== undefined) store.metaConfig.messagingDatasetId = messagingDatasetId;
    saveStore(store);
    res.json({ success: true, message: 'Configurações da Meta salvas com sucesso!' });
});

// ============================================================
// PROXY DE ALTA VELOCIDADE ANTI-BLOQUEIO PARA META ADS HUB
// ============================================================
let metaAccountsCache = { timestamp: 0, data: [] };
let metaBillingCache = { timestamp: 0, data: [], totals: {} };
const metaInsightsCache = new Map();

const META_PERIOD_PRESET_MAP = {
    'TODAY': 'today',
    'YESTERDAY': 'yesterday',
    'LAST_7D': 'last_7d',
    'LAST_30D': 'last_30d',
    'MAX': 'maximum'
};

const META_ZERO_DECIMAL_CURRENCIES = new Set(['BIF', 'CLP', 'COP', 'DJF', 'GNF', 'HUF', 'ISK', 'IDR', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'TWD', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF']);
const META_THREE_DECIMAL_CURRENCIES = new Set(['BHD', 'IQD', 'JOD', 'KWD', 'LYD', 'OMR', 'TND']);

function getMetaCurrencyOffset(currency = 'BRL') {
    const code = String(currency || 'BRL').trim().toUpperCase();
    if (META_ZERO_DECIMAL_CURRENCIES.has(code)) return 1;
    if (META_THREE_DECIMAL_CURRENCIES.has(code)) return 1000;
    return 100;
}

function parseMetaInsightRow(row) {
    const msgAction = (row.actions || []).find(a =>
        a.action_type === 'onsite_conversion.messaging_conversation_started_7d' ||
        a.action_type === 'onsite_conversion.total_messaging_connection' ||
        a.action_type === 'onsite_conversion.messaging_first_reply'
    );
    const leads = msgAction ? parseInt(msgAction.value, 10) : 0;

    const purAction = (row.actions || []).find(a =>
        a.action_type === 'purchase' ||
        a.action_type === 'omni_purchase'
    );
    const purchases = purAction ? parseInt(purAction.value, 10) : 0;

    const revAction = (row.action_values || []).find(a =>
        a.action_type === 'purchase' ||
        a.action_type === 'omni_purchase'
    );
    const revenue = revAction ? parseFloat(revAction.value) : 0;

    const spend = parseFloat(row.spend || 0);
    const impressions = parseInt(row.impressions || 0, 10);
    const clicks = parseInt(row.clicks || 0, 10);
    const cpm = parseFloat(row.cpm || 0) || (impressions > 0 ? (spend / impressions) * 1000 : 0);
    const ctr = parseFloat(row.ctr || 0) || (impressions > 0 ? (clicks / impressions) * 100 : 0);
    const cpc = parseFloat(row.cpc || 0) || (clicks > 0 ? spend / clicks : 0);

    const cplAction = (row.cost_per_action_type || []).find(a =>
        a.action_type === 'onsite_conversion.messaging_conversation_started_7d' ||
        a.action_type === 'onsite_conversion.total_messaging_connection'
    );
    const cpl = cplAction ? parseFloat(cplAction.value) : (leads > 0 ? spend / leads : 0);

    const roasAction = (row.purchase_roas || []).find(a => a.action_type === 'omni_purchase' || a.action_type === 'purchase');
    const roas = roasAction ? parseFloat(roasAction.value) : (spend > 0 && revenue > 0 ? revenue / spend : 0);

    return {
        campaignId: row.campaign_id || '',
        campaignName: row.campaign_name || '',
        objective: row.objective || '',
        spend,
        cpm,
        ctr,
        cpc,
        impressions,
        clicks,
        leads,
        cpl,
        purchases,
        revenue,
        roas
    };
}

async function fetchMetaAccountsFromApi() {
    const token = process.env.META_ACCESS_TOKEN || 'EAAUO1JVtzLgBS9gj3E8dtMiX2KkICYQyjZAUuy0SJJmzWPZCZABlSDFUllmoDfB5h1lt7xHJ3ifoY5jOMuLRKG9Bkq7Ulw9V3vOG3PgXEWqZByjMrv1ZCozA2hnjKCWyjlcHAsm4hxzFZCptbgtD3WbzZBxzg8ZBWncHbjBVjOdRON9xfxhX9EoYMQj0Yf7XbG3FDQZDZD';
    const bmId = process.env.META_BUSINESS_ID || '2124779294600156';
    const fields = 'id,account_id,name,account_status,disable_reason,currency,amount_spent,balance,funding_source_details,timezone_name';
    const version = 'v21.0';

    const endpoints = [
        `https://graph.facebook.com/${version}/me/adaccounts?fields=${fields}&limit=100&access_token=${token}`,
        `https://graph.facebook.com/${version}/${bmId}/client_ad_accounts?fields=${fields}&limit=100&access_token=${token}`,
        `https://graph.facebook.com/${version}/${bmId}/owned_ad_accounts?fields=${fields}&limit=100&access_token=${token}`
    ];

    const accountsMap = new Map();
    const results = await Promise.allSettled(
        endpoints.map(async (url) => {
            const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
            const json = await r.json();
            return json.data || [];
        })
    );

    results.forEach(res => {
        if (res.status === 'fulfilled' && Array.isArray(res.value)) {
            res.value.forEach(acc => {
                const cleanId = acc.account_id || acc.id.replace('act_', '');
                accountsMap.set(cleanId, {
                    ...acc,
                    currency_offset: getMetaCurrencyOffset(acc.currency)
                });
            });
        }
    });

    return Array.from(accountsMap.values());
}

app.get('/api/meta/adaccounts', async (_req, res) => {
    try {
        const now = Date.now();
        if (metaAccountsCache.data.length > 0 && now - metaAccountsCache.timestamp < 30000) {
            return res.json({ success: true, accounts: metaAccountsCache.data, count: metaAccountsCache.data.length, cached: true });
        }

        const accounts = await fetchMetaAccountsFromApi();
        if (accounts.length > 0) {
            metaAccountsCache = { timestamp: now, data: accounts };
        }
        res.json({ success: true, accounts, count: accounts.length });
    } catch (err) {
        console.error('[API Proxy Meta Accounts Error]:', err?.message);
        res.status(500).json({ success: false, error: err?.message, accounts: metaAccountsCache.data });
    }
});

app.get('/api/meta/insights', async (req, res) => {
    try {
        const periodPreset = String(req.query.period || 'TODAY').toUpperCase();
        const metaPreset = META_PERIOD_PRESET_MAP[periodPreset] || 'today';
        const forceRefresh = req.query.force === '1' || req.query.force === 'true';
        const now = Date.now();

        const cached = metaInsightsCache.get(periodPreset);
        if (!forceRefresh && cached && now - cached.timestamp < 20000) {
            return res.json({ success: true, period: periodPreset, accountsInsights: cached.data, cached: true });
        }

        const token = process.env.META_ACCESS_TOKEN || 'EAAUO1JVtzLgBS9gj3E8dtMiX2KkICYQyjZAUuy0SJJmzWPZCZABlSDFUllmoDfB5h1lt7xHJ3ifoY5jOMuLRKG9Bkq7Ulw9V3vOG3PgXEWqZByjMrv1ZCozA2hnjKCWyjlcHAsm4hxzFZCptbgtD3WbzZBxzg8ZBWncHbjBVjOdRON9xfxhX9EoYMQj0Yf7XbG3FDQZDZD';
        let accounts = metaAccountsCache.data;
        if (!accounts || accounts.length === 0) {
            accounts = await fetchMetaAccountsFromApi();
            if (accounts.length > 0) metaAccountsCache = { timestamp: now, data: accounts };
        }

        const accountsInsights = {};
        const insightFields = 'campaign_id,campaign_name,objective,spend,cpm,ctr,cpc,impressions,clicks,actions,action_values,cost_per_action_type,purchase_roas';
        const campaignFields = 'id,name,status,effective_status,objective,daily_budget,lifetime_budget,adsets.limit(50){id,status,effective_status,daily_budget,lifetime_budget}';

        await Promise.allSettled(
            accounts.map(async (acc) => {
                const cleanId = acc.account_id || (acc.id ? acc.id.replace('act_', '') : '');
                const accCurrency = acc.currency || 'BRL';
                const currencyOffset = getMetaCurrencyOffset(accCurrency);
                const insightsUrl = `https://graph.facebook.com/v21.0/act_${cleanId}/insights?level=campaign&fields=${insightFields}&date_preset=${metaPreset}&limit=100&access_token=${token}`;
                const campaignsUrl = `https://graph.facebook.com/v21.0/act_${cleanId}/campaigns?fields=${campaignFields}&limit=100&access_token=${token}`;
                try {
                    const [insRes, campRes] = await Promise.allSettled([
                        fetch(insightsUrl, { signal: AbortSignal.timeout(9000) }).then(r => r.json()),
                        fetch(campaignsUrl, { signal: AbortSignal.timeout(9000) }).then(r => r.json())
                    ]);

                    const campaignMap = new Map();
                    const rawCampaigns = (campRes.status === 'fulfilled' && Array.isArray(campRes.value?.data)) ? campRes.value.data : [];
                    for (const camp of rawCampaigns) {
                        const adsets = Array.isArray(camp.adsets?.data) ? camp.adsets.data : [];
                        const activeAdsets = adsets.filter(a => a.effective_status === 'ACTIVE' || a.status === 'ACTIVE');
                        const budgetAdsets = activeAdsets.length > 0
                            ? activeAdsets
                            : adsets.filter(a => a.effective_status !== 'DELETED' && a.effective_status !== 'ARCHIVED');

                        const adsetsDailyBudget = budgetAdsets.reduce((s, a) => s + Number(a.daily_budget || 0), 0);
                        const adsetsLifetimeBudget = budgetAdsets.reduce((s, a) => s + Number(a.lifetime_budget || 0), 0);
                        const campDailyBudget = Number(camp.daily_budget || 0);
                        const campLifetimeBudget = Number(camp.lifetime_budget || 0);
                        const budgetLevel = (campDailyBudget > 0 || campLifetimeBudget > 0)
                            ? 'CBO'
                            : ((adsetsDailyBudget > 0 || adsetsLifetimeBudget > 0) ? 'ABO' : null);

                        campaignMap.set(String(camp.id), {
                            campaignId: String(camp.id),
                            id: String(camp.id),
                            campaignName: camp.name || '',
                            name: camp.name || '',
                            status: camp.status || 'PAUSED',
                            effective_status: camp.effective_status || camp.status || 'PAUSED',
                            objective: camp.objective || '',
                            daily_budget: campDailyBudget > 0 ? String(campDailyBudget) : null,
                            lifetime_budget: campLifetimeBudget > 0 ? String(campLifetimeBudget) : null,
                            adsets_daily_budget: adsetsDailyBudget > 0 ? adsetsDailyBudget : 0,
                            adsets_lifetime_budget: adsetsLifetimeBudget > 0 ? adsetsLifetimeBudget : 0,
                            budget_level: budgetLevel,
                            currency: accCurrency,
                            currency_offset: currencyOffset,
                            spend: 0,
                            cpm: 0,
                            ctr: 0,
                            cpc: 0,
                            impressions: 0,
                            clicks: 0,
                            leads: 0,
                            cpl: 0,
                            purchases: 0,
                            revenue: 0,
                            roas: 0
                        });
                    }

                    const rows = (insRes.status === 'fulfilled' && Array.isArray(insRes.value?.data)) ? insRes.value.data : [];
                    for (const row of rows) {
                        const parsed = parseMetaInsightRow(row);
                        const cid = String(parsed.campaignId || '');
                        const existing = cid ? campaignMap.get(cid) : null;
                        if (existing) {
                            Object.assign(existing, parsed, {
                                name: existing.name || parsed.campaignName,
                                campaignName: existing.campaignName || parsed.campaignName,
                                objective: existing.objective || parsed.objective
                            });
                        } else if (cid) {
                            campaignMap.set(cid, {
                                ...parsed,
                                id: cid,
                                name: parsed.campaignName,
                                status: 'PAUSED',
                                effective_status: 'PAUSED',
                                daily_budget: null,
                                lifetime_budget: null,
                                adsets_daily_budget: 0,
                                adsets_lifetime_budget: 0,
                                budget_level: null,
                                currency: accCurrency,
                                currency_offset: currencyOffset
                            });
                        }
                    }

                    const campaigns = Array.from(campaignMap.values()).sort((a, b) => {
                        const aActive = (a.effective_status === 'ACTIVE' || a.status === 'ACTIVE') ? 1 : 0;
                        const bActive = (b.effective_status === 'ACTIVE' || b.status === 'ACTIVE') ? 1 : 0;
                        if (aActive !== bActive) return bActive - aActive;
                        if (b.spend !== a.spend) return b.spend - a.spend;
                        return Number(b.daily_budget || b.adsets_daily_budget || 0) - Number(a.daily_budget || a.adsets_daily_budget || 0);
                    });

                    let spend = 0, impressions = 0, clicks = 0, leads = 0, purchases = 0, revenue = 0;
                    campaigns.forEach(c => {
                        spend += c.spend;
                        impressions += c.impressions;
                        clicks += c.clicks;
                        leads += c.leads;
                        purchases += c.purchases;
                        revenue += c.revenue;
                    });
                    const cpm = impressions > 0 ? spend / (impressions / 1000) : 0;
                    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
                    const cpc = clicks > 0 ? spend / clicks : 0;
                    const cpl = leads > 0 ? spend / leads : 0;
                    const roas = spend > 0 && revenue > 0 ? revenue / spend : 0;

                    accountsInsights[cleanId] = {
                        metrics: {
                            spend: +spend.toFixed(2),
                            cpm: +cpm.toFixed(2),
                            ctr: +ctr.toFixed(2),
                            cpc: +cpc.toFixed(2),
                            impressions,
                            clicks,
                            leads,
                            cpl: +cpl.toFixed(2),
                            purchases,
                            revenue: +revenue.toFixed(2),
                            roas: +roas.toFixed(2),
                            currency: accCurrency,
                            currency_offset: currencyOffset
                        },
                        campaigns
                    };
                } catch (e) {
                    accountsInsights[cleanId] = {
                        metrics: { spend: 0, cpm: 0, ctr: 0, cpc: 0, impressions: 0, clicks: 0, leads: 0, cpl: 0, purchases: 0, revenue: 0, roas: 0, currency: accCurrency, currency_offset: currencyOffset },
                        campaigns: []
                    };
                }
            })
        );

        metaInsightsCache.set(periodPreset, { timestamp: now, data: accountsInsights });
        res.json({ success: true, period: periodPreset, accountsInsights });
    } catch (err) {
        console.error('[API Proxy Meta Insights Error]:', err?.message);
        res.status(500).json({ success: false, error: err?.message });
    }
});

app.get('/api/meta/billing', async (_req, res) => {
    try {
        const now = Date.now();
        if (metaBillingCache.data.length > 0 && now - metaBillingCache.timestamp < 30000) {
            return res.json({ success: true, charges: metaBillingCache.data, totals: metaBillingCache.totals, cached: true });
        }

        const token = process.env.META_ACCESS_TOKEN || 'EAAUO1JVtzLgBS9gj3E8dtMiX2KkICYQyjZAUuy0SJJmzWPZCZABlSDFUllmoDfB5h1lt7xHJ3ifoY5jOMuLRKG9Bkq7Ulw9V3vOG3PgXEWqZByjMrv1ZCozA2hnjKCWyjlcHAsm4hxzFZCptbgtD3WbzZBxzg8ZBWncHbjBVjOdRON9xfxhX9EoYMQj0Yf7XbG3FDQZDZD';
        let accounts = metaAccountsCache.data;
        if (!accounts || accounts.length === 0) {
            accounts = await fetchMetaAccountsFromApi();
            if (accounts.length > 0) metaAccountsCache = { timestamp: now, data: accounts };
        }

        const allCharges = [];
        let totalPendingBalanceCents = 0;

        accounts.forEach(acc => {
            const bal = parseInt(acc.balance || 0, 10);
            if (bal > 0) totalPendingBalanceCents += bal;
        });

        await Promise.allSettled(
            accounts.map(async (acc) => {
                const rawId = acc.account_id || (acc.id ? acc.id.replace('act_', '') : '');
                const url = `https://graph.facebook.com/v21.0/act_${rawId}/activities?fields=actor_name,event_time,event_type,extra_data,translated_event_type&limit=20&access_token=${token}`;
                try {
                    const r = await fetch(url, { signal: AbortSignal.timeout(6000) });
                    const data = await r.json();
                    if (data.data && Array.isArray(data.data)) {
                        data.data.forEach(ev => {
                            if (ev.event_type === 'ad_account_billing_charge') {
                                let extra = ev.extra_data;
                                if (typeof extra === 'string') {
                                    try { extra = JSON.parse(extra); } catch (e) {}
                                }
                                const cardStr = acc.funding_source_details?.display_string || 'Mastercard *2017';
                                allCharges.push({
                                    accountId: rawId,
                                    accountName: acc.name,
                                    eventTime: ev.event_time,
                                    currency: extra?.currency || 'BRL',
                                    rawValue: extra?.new_value || 0,
                                    transactionId: extra?.transaction_id || '',
                                    card: cardStr,
                                });
                            }
                        });
                    }
                } catch (e) {}
            })
        );

        allCharges.sort((a, b) => new Date(b.eventTime) - new Date(a.eventTime));

        let totalDebitedReal = 0;
        allCharges.forEach(charge => {
            const netValue = (charge.rawValue || 0) / 100;
            const debitedValue = netValue > 0 ? (netValue / (1 - 0.122)) : 0;
            totalDebitedReal += debitedValue;
        });

        const totals = {
            totalDebitedReal,
            totalPendingReal: totalPendingBalanceCents / 100,
            count: allCharges.length
        };

        metaBillingCache = { timestamp: now, data: allCharges, totals };
        res.json({ success: true, charges: allCharges, totals });
    } catch (err) {
        console.error('[API Proxy Meta Billing Error]:', err?.message);
        res.status(500).json({ success: false, error: err?.message });
    }
});

app.post('/api/funnels/simulate-pix', async (req, res) => {
    try {
        const {
            funnelId,
            amount,
            phone,
            realPhone,
            name,
            campaignId,
            adId,
            ctwaClid,
            conversionData,
            sourceUrl,
            sourceId,
            testEventCode,
            dryRun
        } = req.body || {};
        const funnel = FUNNELS_CATALOG.find(f => f.id === funnelId) || FUNNELS_CATALOG[0];
        const paidValue = Number(amount || funnel.expectedAmount);
        const txId = 'tx_sim_' + Date.now();
        const now = new Date();
        const isDryRun = Boolean(dryRun || testEventCode);

        const decodedConv = decodeCtwaConversionData(conversionData || ctwaClid);
        let adContext = {
            ...(campaignId ? { campaignId: String(campaignId) } : {}),
            ...(adId ? { adId: String(adId) } : {}),
            ...(sourceId ? { sourceId: String(sourceId), adId: adId ? String(adId) : String(sourceId) } : {}),
            ...(sourceUrl ? { sourceUrl: String(sourceUrl) } : {}),
            ...(decodedConv.decodedToken && decodedConv.isOpaquePayload ? { ctwaPayload: decodedConv.decodedToken } : {}),
            ...(decodedConv.decodedToken && !decodedConv.isOpaquePayload ? { ctwaClid: decodedConv.decodedToken } : {})
        };
        if ((adContext.sourceUrl || adContext.sourceId || adContext.adId) && (!adContext.campaignId || !adContext.accountId)) {
            adContext = await resolveMetaAdAttribution(adContext);
        }

        const fallbackCamp = (!adContext.campaignId && !sourceUrl && !sourceId && !isDryRun) ? '1202084910284' : undefined;
        const fallbackAd = (!adContext.adId && !sourceUrl && !sourceId && !isDryRun) ? '1202084910285' : undefined;
        const finalCampId = adContext.campaignId || fallbackCamp || null;
        const finalAdId = adContext.adId || fallbackAd || null;

        const transactionRecord = {
            id: txId,
            timestamp: now.toISOString(),
            time: Date.now(),
            timeFormatted: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            dateFormatted: now.toLocaleDateString('pt-BR'),
            botId: 'bot_whatsapp_principal',
            funnelId: funnel.id,
            funnelName: funnel.name,
            amount: paidValue,
            beneficiary: funnel.beneficiary,
            userPhone: realPhone || phone || '5511999999999',
            realPhone: realPhone || undefined,
            pushName: name || 'Lead Simulado FaceHub',
            accountId: adContext.accountId || undefined,
            campaignId: finalCampId,
            campaignName: adContext.campaignName || undefined,
            adId: finalAdId,
            adName: adContext.adName || undefined,
            adTag: finalCampId ? `ref_${finalCampId}_${finalAdId || ''}` : undefined,
            sourceUrl: adContext.sourceUrl || undefined,
            creativeVideoId: adContext.creativeVideoId || undefined,
            ctwaClid: adContext.ctwaClid || undefined,
            ctwaPayload: adContext.ctwaPayload || undefined,
            isCtwa: Boolean(sourceUrl || sourceId || conversionData || ctwaClid || !isDryRun),
            status: 'APROVADO_PIX',
            capiStatus: 'PENDING'
        };

        const capiRes = await sendMetaCapiConversion(transactionRecord, testEventCode ? { testEventCode } : {});
        transactionRecord.capiMode = capiRes.capiMode || undefined;
        transactionRecord.capiMatchKeys = capiRes.matchKeys || undefined;
        transactionRecord.capiRealPhoneMatched = Boolean(capiRes.realPhoneMatched);
        transactionRecord.capiStatus = capiRes.success ? 'ENVIADO_CAPI_OK' : (capiRes.skipped ? 'CAPI_CONFIG_PENDENTE' : 'ERRO_CAPI: ' + capiRes.error);

        if (!isDryRun) {
            store.funnelTransactions = store.funnelTransactions || [];
            store.funnelTransactions.unshift(transactionRecord);
            store.funnelStats.convertedCount = (store.funnelStats.convertedCount || 0) + 1;
            store.funnelStats.totalRevenue = Number(((store.funnelStats.totalRevenue || 0) + paidValue).toFixed(2));
            saveStore(store);

            notifyFaceHubWebhook(transactionRecord).catch(() => {});
            sendNtfyNotification(transactionRecord).catch(() => {});
        }

        res.json({
            success: true,
            dryRun: isDryRun,
            attribution: adContext,
            capiResult: capiRes,
            transaction: transactionRecord
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Endpoints de Diagnóstico e Teste Direto do Cartão PIX Nativo (sem tocar em nenhum funil)
app.post('/api/test/send-pix-card', async (req, res) => {
    try {
        const {
            botId = 'bot_whatsapp_principal',
            to,
            pixKey = 'pastorguilhermeigreja@gmail.com',
            copyCode,
            beneficiaryName = 'Pastor Guilherme',
            amount = '20,00',
            footerText = 'Toque no botão abaixo para copiar',
            keyType = '',
            variant = DEFAULT_PIX_VARIANT,
            noBot = undefined,
            preferPn = false,
            waitMs = 2500
        } = req.body || {};

        if (!to) {
            return res.status(400).json({ success: false, error: 'Campo "to" obrigatório (JID ou telefone com DDI)' });
        }

        const sock = activeSockets.get(botId);
        if (!sock) {
            return res.status(400).json({ success: false, error: `Socket do bot ${botId} não está conectado` });
        }

        const initialJid = toWhatsAppJid(String(to).trim());
        const lidMapping = sock.signalRepository?.lidMapping;
        let pnForLid = null;
        let lidForPn = null;
        try {
            if (lidMapping && initialJid.endsWith('@lid') && typeof lidMapping.getPNForLID === 'function') {
                pnForLid = (await lidMapping.getPNForLID(initialJid)) || null;
            }
            if (lidMapping && initialJid.endsWith('@s.whatsapp.net') && typeof lidMapping.getLIDForPN === 'function') {
                lidForPn = (await lidMapping.getLIDForPN(initialJid)) || null;
            }
        } catch {}

        const remoteJid = preferPn && pnForLid ? toWhatsAppJid(pnForLid) : initialJid;
        const result = await sendUniversalPixCopyCard({
            sock,
            remoteJid,
            beneficiaryName,
            pixKey,
            copyCode: copyCode || pixKey,
            amount,
            footerText,
            configuredKeyType: keyType,
            botId,
            userPhone: String(to).trim(),
            variant,
            noBot
        });

        const delayMs = Math.min(Math.max(Number(waitMs) || 2500, 0), 10000);
        if (delayMs > 0) {
            await new Promise((r) => setTimeout(r, delayMs));
        }
        const tracked = result?.messageId ? pixDeliveryTracker.get(result.messageId) || null : null;

        res.json({
            success: Boolean(result),
            remoteJid,
            jidDiagnostics: { inputTo: String(to).trim(), initialJid, pnForLid, lidForPn, usedPreferPn: Boolean(preferPn && pnForLid) },
            result,
            deliveryStatus: tracked
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err?.message || 'Erro ao enviar cartão PIX de teste' });
    }
});

app.get('/api/test/pix-status', (req, res) => {
    const msgId = String(req.query.messageId || '').trim();
    const recentEvents = recentReceiptEvents.slice(-25).reverse();
    if (msgId) {
        return res.json({
            success: true,
            item: pixDeliveryTracker.get(msgId) || null,
            recentEvents
        });
    }
    const items = Array.from(pixDeliveryTracker.values()).slice(-20).reverse();
    res.json({ success: true, count: items.length, items, recentEvents });
});

// Endpoint de Teste do Alerta de Emergência Ntfy
app.post('/api/test/emergency-ntfy', async (req, res) => {
    try {
        const { title, message } = req.body || {};
        await sendNtfyEmergencyAlert({
            title: title || '🧪 TESTE DE ALERTA DE EMERGÊNCIA (RENDER)',
            message: message || 'Este é um teste do canal de emergência do Chatbot X1. Alertas de queda de WhatsApp, falhas de IA ou erros da Meta CAPI chegarão aqui com prioridade máxima!',
            priority: 'urgent',
            tags: 'test_tube,bell,white_check_mark',
            alertKey: 'manual_test_' + Date.now(),
            cooldownSec: 0
        });
        res.json({ success: true, message: 'Alerta de teste enviado com sucesso!' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─── SENTINELA DE MEMÓRIA RAM NO RENDER (LIMITE 512MB) ───
setInterval(() => {
    try {
        const mem = process.memoryUsage();
        const rssMb = Math.round(mem.rss / 1024 / 1024);
        const heapMb = Math.round(mem.heapUsed / 1024 / 1024);
        if (rssMb > 410) {
            console.warn(`[RAM Watchdog] ⚠️ CONSUMO DE MEMÓRIA CRÍTICO: RSS=${rssMb}MB, Heap=${heapMb}MB`);
            sendNtfyEmergencyAlert({
                title: '⚠️ ALERTA X1: USO ALTO DE MEMÓRIA RAM NO RENDER',
                message: `⚠️ O consumo de memória RAM do Chatbot atingiu ${rssMb}MB (limite de 512MB no Render)!\nHeap utilizado: ${heapMb}MB.\nSe o volume de arquivos PDF enviados for muito alto, a memória pode atingir o limite. Monitore pelo painel do Render!`,
                priority: 'high',
                tags: 'warning,chart_with_upwards_trend,fire',
                alertKey: 'render_ram_high',
                cooldownSec: 900 // Alerta no máximo uma vez a cada 15 min
            }).catch(() => {});
        }
    } catch (e) {
        console.error('[RAM Watchdog Error]:', e.message);
    }
}, 60 * 1000);

// ─── SENTINELA DE STATUS DE CONTAS DE ANÚNCIO (META GRAPH API) ───
const knownAccountStatuses = new Map();
async function checkMetaAdAccountsStatus() {
    const token = process.env.META_ACCESS_TOKEN || store.metaConfig?.accessToken;
    const bmId = process.env.META_BUSINESS_ID || '2124779294600156';
    if (!token) {
        console.log('[Meta Ad Watchdog] ℹ️ Token da Meta não configurado, pulando verificação de contas.');
        return { success: false, reason: 'Token da Meta ausente' };
    }

    try {
        const endpoints = [
            `https://graph.facebook.com/v21.0/${bmId}/client_ad_accounts?fields=id,name,account_status,disable_reason&access_token=${token}&limit=50`,
            `https://graph.facebook.com/v21.0/${bmId}/owned_ad_accounts?fields=id,name,account_status,disable_reason&access_token=${token}&limit=50`
        ];

        let checkedCount = 0;
        let alertTriggered = false;

        for (const ep of endpoints) {
            const res = await axios.get(ep, { timeout: 10000 });
            const accounts = res.data?.data || [];
            checkedCount += accounts.length;

            for (const acc of accounts) {
                const accId = acc.id;
                const accName = acc.name || 'Conta sem nome';
                const status = Number(acc.account_status); // 1 = ACTIVE, 2 = DISABLED, 3 = UNSETTLED (Payment Failed)
                const prev = knownAccountStatuses.get(accId);

                // Primeira execução: registrar estado base
                if (prev === undefined) {
                    knownAccountStatuses.set(accId, status);
                    continue;
                }

                // Detectar se uma conta que estava ativa (1) caiu para desativada (2) ou saldo devedor/cartão recusado (3)
                if (prev === 1 && status !== 1) {
                    knownAccountStatuses.set(accId, status);
                    alertTriggered = true;
                    const reason = status === 2 ? 'DESATIVADA PELA POLÍTICA DA META' : status === 3 ? 'SALDO DEVEDOR / CARTÃO RECUSADO' : `STATUS ANORMAL (${status})`;
                    console.error(`[Meta Ad Watchdog] 🚨 CONTA CAIU: ${accName} (${accId}) -> ${reason}`);
                    sendNtfyEmergencyAlert({
                        title: '🚨 ALERTA CRÍTICO: CONTA DE ANÚNCIO DESATIVADA!',
                        message: `⚠️ A conta de anúncio "${accName}" (${accId}) caiu!\nMotivo: ${reason}\nStatus atual: ${status}\nVerifique o Gerenciador de Anúncios imediatamente para pausar ou substituir!`,
                        priority: 'max',
                        tags: 'rotating_light,credit_card,warning',
                        alertKey: `meta_acc_drop_${accId}`,
                        cooldownSec: 300
                    }).catch(() => {});
                } else {
                    knownAccountStatuses.set(accId, status);
                }
            }
        }
        console.log(`[Meta Ad Watchdog] ✅ Verificação concluída em ${checkedCount} contas de anúncio da BM ${bmId}.`);
        return { success: true, checkedCount, alertTriggered };
    } catch (err) {
        const errorDetail = err?.response?.data?.error?.message || err.message;
        console.warn(`[Meta Ad Watchdog Warning]: Falha ao consultar Meta Graph API:`, errorDetail);
        return { success: false, error: errorDetail };
    }
}

// Inicia verificação 30 segundos após boot e roda a cada 15 minutos
setTimeout(checkMetaAdAccountsStatus, 30 * 1000);
setInterval(checkMetaAdAccountsStatus, 15 * 60 * 1000);

// Endpoint para testar o watchdog das contas da Meta sob demanda
app.post('/api/test/meta-watchdog', async (_req, res) => {
    try {
        const result = await checkMetaAdAccountsStatus();
        res.json({ success: true, message: 'Watchdog da Meta executado!', result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Endpoint para simular alerta de RAM sob demanda
app.post('/api/test/ram-watchdog', async (_req, res) => {
    try {
        const mem = process.memoryUsage();
        const rssMb = Math.round(mem.rss / 1024 / 1024);
        const heapMb = Math.round(mem.heapUsed / 1024 / 1024);
        await sendNtfyEmergencyAlert({
            title: '🧪 TESTE DO SENTINELA DE MEMÓRIA RAM',
            message: `✅ Teste de alerta de memória RAM recebido com sucesso!\nRSS Atual: ${rssMb}MB (Limite: 512MB)\nHeap Utilizado: ${heapMb}MB`,
            priority: 'high',
            tags: 'test_tube,chart_with_upwards_trend,fire',
            alertKey: 'manual_ram_test_' + Date.now(),
            cooldownSec: 0
        });
        res.json({ success: true, message: 'Alerta de teste de RAM enviado ao ntfy!', rssMb, heapMb });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─── CAPTURA GLOBAL DE EXCEÇÕES E REJEIÇÕES ───
process.on('uncaughtException', (err) => {
    console.error('[UNCAUGHT EXCEPTION]:', err);
    sendNtfyEmergencyAlert({
        title: '🚨 ALERTA CRÍTICO: EXCEÇÃO NO MOTOR NODE.JS',
        message: `⚠️ Exceção fatal no motor do Chatbot:\n${err?.message || err}\nVerifique os logs no Render imediatamente.`,
        priority: 'max',
        tags: 'rotating_light,fire',
        alertKey: 'uncaught_exception',
        cooldownSec: 60
    }).catch(() => {});
});

process.on('unhandledRejection', (reason) => {
    console.error('[UNHANDLED REJECTION]:', reason);
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

app.get('/api/scheduler/jobs', (_req, res) => {
    res.json({
        success: true,
        count: store.scheduledJobs?.length || 0,
        jobs: store.scheduledJobs || []
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Motor QR Code + Cloud KV Sync rodando em http://localhost:${PORT}`);
    startQrSession('bot_whatsapp_principal', false).catch(console.error);
    initSchedulerWorker();
});

// ─── Rotina Keep-Alive Anti-Sleep Universal (Render Free Tier) ───
// Dispara um ping HTTP a cada 4 minutos para a rota /api/health garantindo que o servidor permaneça acordado 24/7
const RENDER_PING_URL = process.env.RENDER_EXTERNAL_URL ? `${process.env.RENDER_EXTERNAL_URL}/api/health` : 'https://carol-whatsapp-qr-engine.onrender.com/api/health';
setInterval(async () => {
    try {
        await fetch(RENDER_PING_URL).catch(() => {});
    } catch {}
}, 3 * 60 * 1000);

// Backup automático de sessões e conversas ao receber sinal de restart/deploy (SIGTERM/SIGINT)
let isShuttingDown = false;
async function handleGracefulShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`[QR Engine] 🛑 Recebido sinal ${signal}. Salvando sessões e jobs no Cloudflare KV antes de encerrar...`);
    try {
        await Promise.race([
            flushRuntimeStateBackupNow('bot_whatsapp_principal', true),
            new Promise((r) => setTimeout(r, 3500))
        ]);
    } catch {}
    process.exit(0);
}
process.on('SIGTERM', () => { handleGracefulShutdown('SIGTERM'); });
process.on('SIGINT', () => { handleGracefulShutdown('SIGINT'); });
