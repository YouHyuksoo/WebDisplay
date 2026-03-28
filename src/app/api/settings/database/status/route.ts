/**
 * @file route.ts
 * @description 현재 활성 DB 프로필의 연결 상태를 확인하는 API.
 * 초보자 가이드:
 *   GET → 활성 프로필명, 접속 정보, 연결 성공 여부를 반환한다.
 *   메뉴 화면의 DbStatusBadge 컴포넌트에서 호출하여 DB 상태를 표시한다.
 */
import { NextResponse } from 'next/server';
import { loadFileConfig, buildConnectString, executeQuery } from '@/lib/db';

export async function GET() {
  const fileData = loadFileConfig();

  /* 활성 프로필 정보 추출 */
  let profileName = 'default';
  let connectInfo = '';

  if (fileData && fileData.profiles.length > 0) {
    const active = fileData.profiles.find((p) => p.name === fileData.activeProfile)
      ?? fileData.profiles[0];
    profileName = active.name;
    connectInfo = `${active.host}:${active.port}/${active.sidOrService}`;
  } else {
    connectInfo = process.env.ORACLE_CONNECT_STRING ?? '';
  }

  /* 실제 연결 테스트 (간단한 SELECT) */
  try {
    await executeQuery('SELECT 1 FROM DUAL');
    return NextResponse.json({
      profile: profileName,
      connectInfo,
      connected: true,
    });
  } catch (e) {
    return NextResponse.json({
      profile: profileName,
      connectInfo,
      connected: false,
      error: String(e),
    });
  }
}
