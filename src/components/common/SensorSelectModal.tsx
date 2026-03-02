/**
 * @file SensorSelectModal.tsx
 * @description 온습도 센서 선택 모달 래퍼. DisplaySelectModal을 type='sensor'로 호출.
 * 초보자 가이드: DisplayHeader의 설정 아이콘을 클릭하면 열린다 (온습도 화면 전용).
 * 실제 로직은 DisplaySelectModal.tsx에 통합되어 있고, 이 파일은 하위 호환용 래퍼.
 */
'use client';

import DisplaySelectModal from './DisplaySelectModal';

interface SensorSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  screenId: string;
}

/** 온습도기 선택 모달 — DisplaySelectModal(type='sensor') 래퍼 */
export default function SensorSelectModal({ isOpen, onClose, screenId }: SensorSelectModalProps) {
  return (
    <DisplaySelectModal
      isOpen={isOpen}
      onClose={onClose}
      screenId={screenId}
      type="sensor"
    />
  );
}
