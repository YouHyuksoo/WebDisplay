'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface LineRow {
  lineCode: string;
  lineName: string;
  sequence: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface LineSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  screenId: string;
}

/**
 * @description 라인 다중 선택 공통 모달 (PB 원본: w_line_multi_select_flat_smd.srw 대응)
 * 화면별로 선택된 라인을 localStorage에 저장하여 조회 시 조건으로 사용합니다.
 */
export default function LineSelectModal({ isOpen, onClose, screenId }: LineSelectModalProps) {
  // SWR을 통해 라인 목록 패칭
  const { data, isLoading } = useSWR<{ lines: LineRow[] }>(
    isOpen ? '/api/display/lines?orgId=1' : null,
    fetcher
  );
  
  const [selectedLines, setSelectedLines] = useState<Set<string>>(new Set());

  // 모달이 열릴 때 기존 스토리지에 저장된 라인 정보 로드
  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem(`display-lines-${screenId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
             setSelectedLines(new Set(parsed));
          }
        } catch(e) {}
      } else {
        // 기본값: % (전체)
        setSelectedLines(new Set(['%']));
      }
    }
  }, [isOpen, screenId]);

  const lines = data?.lines || [];
  
  // % 가 포함되어 있거나 아예 선택된 항목이 없다면 PB 기준 '전체 선택'으로 간주
  const isSelectAll = selectedLines.size === 0 || selectedLines.has('%');

  const toggleLine = (lineCode: string) => {
    const newSet = new Set(selectedLines);
    newSet.delete('%'); // 개별 라인을 클릭할 땐 % 태그 삭제
    
    if (newSet.has(lineCode)) {
      newSet.delete(lineCode);
    } else {
      newSet.add(lineCode);
    }
    
    // 만약 다 해제되었다면 다시 전체 선택(%) 화
    if (newSet.size === 0) newSet.add('%');
    
    setSelectedLines(newSet);
  };

  const toggleAll = () => {
    if (isSelectAll) {
      // 전체 선택 해제? (목록 전체가 선택 해제되며, 저장 시엔 validate를 할 수 있음)
      setSelectedLines(new Set());
    } else {
      // 명시적인 % 세팅
      setSelectedLines(new Set(['%']));
    }
  };

  const handleSave = () => {
    const arr = Array.from(selectedLines);
    const valueToSave = arr.length > 0 ? arr : ['%'];
    localStorage.setItem(`display-lines-${screenId}`, JSON.stringify(valueToSave));
    
    // 로컬 스토리지 변경 이벤트를 발생시켜 상위 뷰가 재랜더링 되도록 유도
    window.dispatchEvent(new Event(`line-config-changed-${screenId}`));
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Line Select (라인 선택)" size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>취소</Button>
          <Button variant="primary" onClick={handleSave}>OK</Button>
        </>
      }
    >
       {isLoading ? (
         <div className="flex h-40 items-center justify-center">
            <svg className="h-8 w-8 animate-spin text-sky-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
         </div>
       ) : (
         <div className="flex flex-col gap-2">
           {/* 전체 선택 (%) */}
           <label className="flex cursor-pointer items-center gap-3 rounded-lg border-b border-zinc-200 p-3 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
             <input type="checkbox" className="h-5 w-5 accent-sky-500" 
                checked={isSelectAll} 
                onChange={toggleAll} />
             <span className="font-bold text-zinc-900 dark:text-white">% (ALL LINES)</span>
           </label>

           {/* 개별 라인 목록 */}
           <div className="flex flex-col gap-1 overflow-y-auto pr-2" style={{ maxHeight: '400px' }}>
             {lines.map(line => (
               <label key={line.lineCode} 
                  className={`flex cursor-pointer items-center gap-3 rounded-lg p-3 transition-colors ${
                    !isSelectAll && selectedLines.has(line.lineCode) 
                    ? 'bg-sky-50 dark:bg-sky-900/20' 
                    : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                  }`}>
                 <input type="checkbox" className="h-5 w-5 accent-sky-500" 
                    checked={isSelectAll || selectedLines.has(line.lineCode)} 
                    onChange={() => toggleLine(line.lineCode)} 
                    disabled={isSelectAll}
                  />
                 <span className={`${
                    isSelectAll || selectedLines.has(line.lineCode) 
                    ? 'font-semibold text-sky-700 dark:text-sky-300' 
                    : 'text-zinc-700 dark:text-zinc-300'
                  }`}>
                   {line.lineCode} : {line.lineName}
                 </span>
               </label>
             ))}
           </div>
         </div>
       )}
    </Modal>
  );
}
