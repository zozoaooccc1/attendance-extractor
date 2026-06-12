export interface ChangelogItem {
  version: string;
  title: string;
  date: string;
  items: { type: 'new' | 'fix' | 'improve'; text: string }[];
}

const changelog: ChangelogItem[] = [
  {
    version: '3.1.3',
    title: 'fix_crash_and_ai',
    date: '2026-06-12',
    items: [
      { type: 'fix', text: 'fix_crash_loop' },
      { type: 'fix', text: 'fix_ai_scan_403' },
    ],
  },
  {
    version: '3.1.2',
    title: 'fix_update_check',
    date: '2026-06-12',
    items: [
      { type: 'fix', text: 'fix_update_button' },
    ],
  },
  {
    version: '3.1.1',
    title: 'fix_4_issues',
    date: '2026-06-12',
    items: [
      { type: 'fix', text: 'font_size_slider_by_1_percent' },
      { type: 'fix', text: 'home_page_selection_persists' },
      { type: 'fix', text: 'install_dialog_stays_after_download' },
      { type: 'new', text: 'storage_limit_configurable' },
    ],
  },
  {
    version: '3.1.0',
    title: 'loud_alarm_and_cleanup',
    date: '2026-06-12',
    items: [
      { type: 'new',     text: 'loud_alarm_every_5s_before_entry' },
      { type: 'new',     text: 'high_priority_notification_channel' },
      { type: 'fix',     text: 'remove_early_minutes_tracking' },
      { type: 'improve', text: 'monthly_delay_card_full_title' },
    ],
  },
  {
    version: '3.0.0',
    title: 'ai_storage_search',
    date: '2026-06-12',
    items: [
      { type: 'new',     text: 'font_size_slider_80_150' },
      { type: 'new',     text: 'high_contrast_mode' },
      { type: 'new',     text: 'storage_stats_with_cleanup' },
      { type: 'new',     text: 'full_backup_with_images' },
      { type: 'new',     text: 'ai_scanner_extracts_time' },
      { type: 'new',     text: 'advanced_log_filters' },
      { type: 'improve', text: 'search_includes_notes' },
    ],
  },
  {
    version: '2.8.0',
    title: 'onesignal_push_notifications',
    date: '2026-06-11',
    items: [
      { type: 'new',     text: 'onesignal_instant_push_on_release' },
      { type: 'improve', text: 'permission_request_on_first_launch' },
      { type: 'improve', text: 'free_without_own_server' },
    ],
  },
  {
    version: '2.7.0',
    title: 'apk_update_system',
    date: '2026-06-11',
    items: [
      { type: 'new',     text: 'apk_update_notification_with_link' },
      { type: 'improve', text: 'remove_old_ota_system' },
      { type: 'new',     text: 'delay_notes_in_pdf_whatsapp_csv' },
      { type: 'new',     text: 'badge_for_delay_notes' },
    ],
  },
];

export function getVersionChangelog(version: string): ChangelogItem | null {
  return changelog.find(c => c.version === version) ?? null;
}

export function getLatestChangelog(): ChangelogItem | null {
  return changelog[0] ?? null;
}

export const CURRENT_VERSION = '3.1.3';
