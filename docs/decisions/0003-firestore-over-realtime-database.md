# 0003. Firestore замість Realtime Database

Status: Accepted

## Context

Firebase пропонує дві real-time бази даних: Realtime Database (RTDB) і Firestore. Обидві дають потрібну для гри синхронізацію в реальному часі.

## Decision

Використовуємо Firestore.

## Consequences

- Зручніша query-модель (знадобиться навіть у MVP — наприклад, майбутній список активних кімнат)
- Природніша документна структура для "кімната → гравці → слова → стан клітинок"
- Firestore — рекомендований Google вибір для нових проєктів; RTDB де-факто в режимі підтримки застарілих застосунків
