/**
 * グループのカラー・アイコンのプリセット定義。
 * テーマ非依存の固定パレットとし、どのテーマでもグループを色・アイコンで識別できるようにする。
 */

/** グループのカラーパレット（テーマ非依存・8色） */
export const GROUP_COLORS = [
  { id: 'coral', value: '#FF6B6B' },
  { id: 'blue', value: '#2563EB' },
  { id: 'green', value: '#10B981' },
  { id: 'amber', value: '#F59E0B' },
  { id: 'purple', value: '#8B5CF6' },
  { id: 'pink', value: '#EC4899' },
  { id: 'cyan', value: '#06B6D4' },
  { id: 'orange', value: '#F97316' },
] as const;

/** グループのアイコンセット（Ionicons、日本ユーザー向け） */
export const GROUP_ICONS = [
  { id: 'people-outline', label: 'グループ' },
  { id: 'airplane-outline', label: '旅行' },
  { id: 'restaurant-outline', label: '食事' },
  { id: 'beer-outline', label: '飲み会' },
  { id: 'home-outline', label: '住まい' },
  { id: 'car-outline', label: 'ドライブ' },
  { id: 'train-outline', label: '交通' },
  { id: 'cart-outline', label: '買い物' },
  { id: 'gift-outline', label: 'プレゼント' },
  { id: 'football-outline', label: 'スポーツ' },
  { id: 'musical-notes-outline', label: '音楽' },
  { id: 'cafe-outline', label: 'カフェ' },
  { id: 'globe-outline', label: '海外' },
  { id: 'heart-outline', label: '家族・友人' },
  { id: 'briefcase-outline', label: '仕事' },
  { id: 'sunny-outline', label: 'レジャー' },
] as const;

export const DEFAULT_GROUP_COLOR = GROUP_COLORS[0].value; // '#FF6B6B'
export const DEFAULT_GROUP_ICON = GROUP_ICONS[0].id; // 'people-outline'
