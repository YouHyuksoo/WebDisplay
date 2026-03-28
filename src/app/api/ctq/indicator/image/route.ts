/**
 * @file src/app/api/ctq/indicator/image/route.ts
 * @description IQ_DAILY_NOTIFY BLOB 이미지 서빙 API
 *
 * 초보자 가이드:
 * 1. ACTION_DATE + NOTIFY_SEQUENCE + ORGANIZATION_ID 로 레코드 식별
 * 2. type 파라미터: inspect(검사이미지), document(문서이미지), ng(불량이미지)
 * 3. BLOB -> Buffer -> Response로 바이너리 반환
 * 4. executeBlobQuery가 db.ts에 없으면 별도 구현 필요
 */

import { type NextRequest } from "next/server";
import { executeQuery } from "@/lib/db";

export const dynamic = "force-dynamic";

const IMAGE_COLUMNS: Record<string, { blob: string; fileName: string }> = {
  inspect:  { blob: "INSPECT_IMAGE",  fileName: "INSPECT_IMAGE_FILE_NAME" },
  document: { blob: "DOCUMENT_IMAGE", fileName: "DOCUMENT_IMAGE_FILE_NAME" },
  ng:       { blob: "NG_IMAGE",       fileName: "NG_IMAGE_FILE_NAME" },
};

/** 파일 확장자 -> Content-Type */
function getContentType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
    gif: "image/gif", bmp: "image/bmp", pdf: "application/pdf",
    doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
  return map[ext] ?? "application/octet-stream";
}

interface BlobRow {
  BLOB_DATA: Buffer | null;
  FILE_NAME: string;
}

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl;
    const actionDate = url.searchParams.get("actionDate") ?? "";
    const seq = url.searchParams.get("seq") ?? "";
    const orgId = url.searchParams.get("orgId") ?? "";
    const type = url.searchParams.get("type") ?? "";

    if (!actionDate || !seq || !orgId || !type) {
      return new Response("필수 파라미터 누락", { status: 400 });
    }

    const col = IMAGE_COLUMNS[type];
    if (!col) {
      return new Response(`알 수 없는 type: ${type}`, { status: 400 });
    }

    const sql = `
      SELECT ${col.blob} AS BLOB_DATA,
             NVL(${col.fileName}, '-') AS FILE_NAME
      FROM IQ_DAILY_NOTIFY
      WHERE ACTION_DATE = TO_DATE(:actionDate, 'YYYY/MM/DD')
        AND NOTIFY_SEQUENCE = :seq
        AND ORGANIZATION_ID = :orgId
    `;

    const rows = await executeQuery<BlobRow>(sql, {
      actionDate,
      seq: Number(seq),
      orgId: Number(orgId),
    });

    if (rows.length === 0 || !rows[0].BLOB_DATA) {
      return new Response("이미지 없음", { status: 404 });
    }

    const data = rows[0].BLOB_DATA;
    const fileName = rows[0].FILE_NAME;
    const contentType = getContentType(fileName);

    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(fileName)}"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Indicator image API error:", error);
    return new Response("이미지 조회 실패", { status: 500 });
  }
}
