/**
 * @file src/lib/ai-config.ts
 * @description AI 챗 설정 JSON 파일 관리 — data/ai-config.json 한 파일에
 *   프로바이더·페르소나·글로서리를 통합 저장. 서버별로 독립 관리됨.
 *
 * 초보자 가이드:
 * - getAiConfig(): 파일 읽기 (없으면 디폴트 시드)
 * - saveAiConfig(): 파일 쓰기 (data/ 자동 생성)
 * - 패턴: slack-settings.ts와 동일 (readFile → merge defaults → writeFile)
 */

import fs from 'fs/promises';
import path from 'path';

/* ------------------------------------------------------------------ */
/*  타입                                                               */
/* ------------------------------------------------------------------ */

export interface ProviderSetting {
  providerId: string;
  enabled: boolean;
  apiKey: string | null;
  defaultModelId: string | null;
  sqlSystemPrompt: string | null;
  analysisPrompt: string | null;
}

export interface PersonaSetting {
  personaId: string;
  name: string;
  description: string | null;
  icon: string | null;
  systemPrompt: string;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface GlossaryTerm {
  termId: string;
  category: 'abbreviation' | 'code' | 'rule' | 'example';
  term: string;
  definition: string;
  exampleSql: string | null;
  priority: number;
  isActive: boolean;
}

export interface AiConfig {
  providers: ProviderSetting[];
  personas: PersonaSetting[];
  glossary: GlossaryTerm[];
}

/* ------------------------------------------------------------------ */
/*  디폴트 시드                                                        */
/* ------------------------------------------------------------------ */

const DEFAULT_CONFIG: AiConfig = {
  providers: [
    { providerId: 'claude', enabled: false, apiKey: null, defaultModelId: 'claude-opus-4-6', sqlSystemPrompt: null, analysisPrompt: null },
    { providerId: 'gemini', enabled: false, apiKey: null, defaultModelId: 'gemini-2.0-flash', sqlSystemPrompt: null, analysisPrompt: null },
    { providerId: 'mistral', enabled: false, apiKey: null, defaultModelId: 'mistral-large-latest', sqlSystemPrompt: null, analysisPrompt: null },
    { providerId: 'kimi', enabled: false, apiKey: null, defaultModelId: 'kimi-k2-0905-preview', sqlSystemPrompt: null, analysisPrompt: null },
  ],
  personas: [
    {
      personaId: 'p_default', name: 'MES 분석가', description: '데이터를 객관적으로 요약·해석',
      icon: 'BarChart3',
      systemPrompt: '당신은 MES 데이터 분석가입니다. 결과를 표/차트 중심으로 객관적으로 요약하고 이상치를 강조하세요. 감정·장식 표현을 줄이고 숫자와 비율로 말하세요.',
      isDefault: true, isActive: true, sortOrder: 0,
    },
    {
      personaId: 'p_manager', name: '라인 매니저', description: '의사결정에 직접 쓸 수 있는 인사이트',
      icon: 'ClipboardCheck',
      systemPrompt: '당신은 라인 매니저를 보좌하는 어시스턴트입니다. 각 응답 끝에 "조치 제안"을 1~3개 bullet로 제공하세요. 통계 용어 대신 현장 용어를 사용하세요.',
      isDefault: false, isActive: true, sortOrder: 1,
    },
    {
      personaId: 'p_quality', name: '품질 엔지니어', description: 'FPY/SPC/이상점 중심의 품질 관점',
      icon: 'ShieldCheck',
      systemPrompt: '당신은 품질 엔지니어 관점으로 응답합니다. FPY·CTQ·SPC 이상점·MSL 경고에 우선순위를 두고, 통계적 유의성과 시간 추이에 주목하세요.',
      isDefault: false, isActive: true, sortOrder: 2,
    },
  ],
  glossary: [
    { termId: 'g_p51', category: 'code', term: 'P51', definition: 'SMPS-1 라인. 베트남 SMPS 1호기.', exampleSql: null, priority: 100, isActive: true },
    { termId: 'g_w220', category: 'code', term: 'W220', definition: '포장 공정 코드. IP_PRODUCT_WORKSTAGE_IO.WORKSTAGE_CODE 컬럼.', exampleSql: null, priority: 100, isActive: true },
    { termId: 'g_w310', category: 'code', term: 'W310', definition: '투입 공정 코드.', exampleSql: null, priority: 100, isActive: true },
    { termId: 'g_uph', category: 'abbreviation', term: 'UPH', definition: 'Units Per Hour. 시간당 생산수량 목표.', exampleSql: null, priority: 50, isActive: true },
    { termId: 'g_eol', category: 'abbreviation', term: 'EOL', definition: 'End Of Line 검사 — 생산 라인 마지막 단계.', exampleSql: null, priority: 50, isActive: true },
  ],
};

/* ------------------------------------------------------------------ */
/*  파일 I/O                                                           */
/* ------------------------------------------------------------------ */

const CONFIG_PATH = path.join(process.cwd(), 'data', 'ai-config.json');

export async function getAiConfig(): Promise<AiConfig> {
  try {
    const raw = await fs.readFile(CONFIG_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<AiConfig>;
    return {
      providers: parsed.providers ?? DEFAULT_CONFIG.providers,
      personas: parsed.personas ?? DEFAULT_CONFIG.personas,
      glossary: parsed.glossary ?? DEFAULT_CONFIG.glossary,
    };
  } catch {
    return structuredClone(DEFAULT_CONFIG);
  }
}

export async function saveAiConfig(config: AiConfig): Promise<void> {
  const dir = path.dirname(CONFIG_PATH);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

/* ------------------------------------------------------------------ */
/*  채팅 세션 파일 I/O                                                  */
/* ------------------------------------------------------------------ */

export interface ChatSession {
  sessionId: string;
  title: string;
  providerId: string | null;
  modelId: string | null;
  personaId: string | null;
  createdAt: string;
  lastMessageAt: string | null;
  messages: ChatMessage[];
}

export interface ChatMessage {
  messageId: string;
  role: 'user' | 'assistant' | 'system' | 'sql' | 'sql_result';
  content: string | null;
  sqlText: string | null;
  resultJson: string | null;
  tokensIn: number | null;
  tokensOut: number | null;
  execMs: number | null;
  createdAt: string;
}

const CHATS_DIR = path.join(process.cwd(), 'data', 'ai-chats');
const INDEX_PATH = path.join(CHATS_DIR, 'index.json');

export interface SessionIndex {
  sessionId: string;
  title: string;
  providerId: string | null;
  modelId: string | null;
  personaId: string | null;
  createdAt: string;
  lastMessageAt: string | null;
  messageCount: number;
}

async function ensureChatsDir() {
  await fs.mkdir(CHATS_DIR, { recursive: true });
}

export async function loadSessionIndex(): Promise<SessionIndex[]> {
  try {
    const raw = await fs.readFile(INDEX_PATH, 'utf-8');
    return JSON.parse(raw) as SessionIndex[];
  } catch {
    return [];
  }
}

async function saveSessionIndex(index: SessionIndex[]): Promise<void> {
  await ensureChatsDir();
  await fs.writeFile(INDEX_PATH, JSON.stringify(index, null, 2), 'utf-8');
}

export async function loadChatSession(sessionId: string): Promise<ChatSession | null> {
  try {
    const raw = await fs.readFile(path.join(CHATS_DIR, `${sessionId}.json`), 'utf-8');
    return JSON.parse(raw) as ChatSession;
  } catch {
    return null;
  }
}

export async function saveChatSession(session: ChatSession): Promise<void> {
  await ensureChatsDir();
  await fs.writeFile(
    path.join(CHATS_DIR, `${session.sessionId}.json`),
    JSON.stringify(session, null, 2),
    'utf-8',
  );
  // index 갱신
  const index = await loadSessionIndex();
  const existing = index.findIndex((s) => s.sessionId === session.sessionId);
  const meta: SessionIndex = {
    sessionId: session.sessionId,
    title: session.title,
    providerId: session.providerId,
    modelId: session.modelId,
    personaId: session.personaId,
    createdAt: session.createdAt,
    lastMessageAt: session.lastMessageAt,
    messageCount: session.messages.length,
  };
  if (existing >= 0) index[existing] = meta;
  else index.unshift(meta);
  await saveSessionIndex(index);
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  try { await fs.unlink(path.join(CHATS_DIR, `${sessionId}.json`)); } catch { /* 무시 */ }
  const index = await loadSessionIndex();
  await saveSessionIndex(index.filter((s) => s.sessionId !== sessionId));
}
