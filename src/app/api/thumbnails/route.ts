/**
 * @file src/app/api/thumbnails/route.ts
 * @description 디스플레이 화면 스크린샷 업로드 API
 *
 * 초보자 가이드:
 * 1. POST 요청으로 screenId + 이미지 파일을 전송
 * 2. sharp로 640x400 리사이즈 후 /public/thumbnails/{screenId}.png 저장
 * 3. DB 연결 없이 정적 파일만 사용
 */

import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import path from 'path';
import { writeFile, mkdir } from 'fs/promises';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const screenId = formData.get('screenId') as string;
    const file = formData.get('file') as File;

    if (!screenId || !file) {
      return NextResponse.json(
        { success: false, error: 'screenId와 file이 필요합니다' },
        { status: 400 },
      );
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: '이미지 파일만 업로드 가능합니다' },
        { status: 400 },
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: '파일 크기는 10MB 이하여야 합니다' },
        { status: 400 },
      );
    }

    if (!/^\d+$/.test(screenId)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 screenId입니다' },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const resized = await sharp(buffer)
      .resize(640, 400, { fit: 'cover' })
      .png()
      .toBuffer();

    const thumbnailDir = path.join(process.cwd(), 'public', 'thumbnails');
    await mkdir(thumbnailDir, { recursive: true });

    const filePath = path.join(thumbnailDir, `${screenId}.png`);
    await writeFile(filePath, resized);

    return NextResponse.json({
      success: true,
      path: `/thumbnails/${screenId}.png`,
    });
  } catch (error) {
    console.error('Thumbnail upload error:', error);
    return NextResponse.json(
      { success: false, error: '이미지 업로드에 실패했습니다' },
      { status: 500 },
    );
  }
}
