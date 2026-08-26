# 전개도 포장 검수소

초등 5~6학년 수학 수업에서 정육면체 전개도를 예측하고 한 면씩 접어 보는 서버 없는 정적 SPA입니다. 가상 접기는 실제 종이의 두께나 포장재의 강도를 측정하는 도구가 아니라 면의 관계를 보여 주는 기하 모형입니다.

## 개발 명령

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
npm test -- --run
npm run test:e2e
npm run check:file-size
```

검수소는 로그인, 서버, 외부 AI, 사용자 파일 업로드 없이 브라우저에서 실행됩니다. 학습 기능은 이후 단계에서 설계 문서의 예측 → 접기 → 진단 → 수리 순서로 확장합니다.
