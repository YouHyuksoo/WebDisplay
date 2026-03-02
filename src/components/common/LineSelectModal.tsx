/**
 * @file LineSelectModal.tsx
 * @description 라인 선택 모달 래퍼. DisplaySelectModal을 type='line'으로 호출.
 * 초보자 가이드: DisplayHeader의 설정 아이콘을 클릭하면 열린다.
 * 실제 로직은 DisplaySelectModal.tsx에 통합되어 있고, 이 파일은 하위 호환용 래퍼.
 * PB 원본: w_line_multi_select_flat 대응
 */
'use client';

import DisplaySelectModal from './DisplaySelectModal';

interface LineSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  screenId: string;
  /** true이면 최소 1개 이상 선택 필수 (저장값 없으면 닫기 불가) */
  required?: boolean;
}

/** 라인 선택 모달 — DisplaySelectModal(type='line') 래퍼 */
export default function LineSelectModal({ isOpen, onClose, screenId, required }: LineSelectModalProps) {
  return (
    <DisplaySelectModal
      isOpen={isOpen}
      onClose={onClose}
      screenId={screenId}
      type="line"
      required={required}
    />
  );
}
