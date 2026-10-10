import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

// 관리 화면은 관리 셸(admin.html)에서만 그리고 공개 번들 첫 로드에 섞이지 않게 나눠 받는다
const PartnerAdmin = lazy(() => import('./PartnerAdmin'));

// 관리 레이아웃: 공개 Header·Footer·광고·동의 배너 없음. 프론트 가드는 보안 경계가 아니다(Access·BE JWT 가 막는다).
export default function AdminLayout() {
  useEffect(() => {
    document.title = '제휴 업체 관리 - 웨딩챌린저';
  }, []);

  return (
    <div data-layout="admin" className="min-h-screen bg-cream">
      <Suspense fallback={<p className="p-6 text-sm text-charcoal/50">관리 화면을 불러오는 중…</p>}>
        <Routes>
          <Route path="partners" element={<PartnerAdmin />} />
          <Route path="*" element={<Navigate to="/admin/partners" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}
