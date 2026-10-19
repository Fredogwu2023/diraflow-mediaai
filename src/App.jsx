import { useEffect, useMemo, useState } from 'react'
import diraflowLogo from './assets/Diraflow-MediaAI-logo.png'
import lewishamLogo from './assets/Lewisham-Multi-Solutions-Ltd-logo-transparent.png'

import podcastDiscussionImage from './assets/01-ai-podcast-public-discussion.jpg'
import aiReceptionistImage from './assets/02-ai-receptionist.jpg'
import creatorStudioImage from './assets/03-creator-content-studio.jpg'
import presenterVoiceImage from './assets/04-ai-presenter-voice.jpg'
import liveNewsImage from './assets/05-live-news-communication.jpg'
import voiceMediaImage from './assets/06-voice-media-assets.jpg'
import licensedTalentImage from './assets/07-licensed-talent-marketplace.jpg'
import distributionAgentImage from './assets/08-distribution-agent.jpg'
import royaltyManagementImage from './assets/09-monetisation-royalty-management.jpg'
import analyticsPerformanceImage from './assets/10-analytics-performance.jpg'
import './App.css'

import VideoStudio from './assets/VideoStudio.jsx'
const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '')

function zonedDateTimeToIso(dateValue, timeValue, timeZone) {
  const dateParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue || '')
  const timeParts = /^(\d{2}):(\d{2})$/.exec(timeValue || '')

  if (!dateParts || !timeParts) {
    throw new Error('Enter a valid publication date and time.')
  }

  const [, yearText, monthText, dayText] = dateParts
  const [, hourText, minuteText] = timeParts
  const desired = {
    year: Number(yearText),
    month: Number(monthText),
    day: Number(dayText),
    hour: Number(hourText),
    minute: Number(minuteText),
  }

  const desiredUtc = Date.UTC(
    desired.year, desired.month - 1, desired.day,
    desired.hour, desired.minute, 0
  )

  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })

  let guess = desiredUtc

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date(guess))
        .filter((part) => part.type !== 'literal')
        .map((part) => [part.type, Number(part.value)])
    )

    const representedUtc = Date.UTC(
      parts.year, parts.month - 1, parts.day,
      parts.hour, parts.minute, parts.second
    )

    const difference = desiredUtc - representedUtc
    if (difference === 0) break
    guess += difference
  }

  const check = Object.fromEntries(
    formatter.formatToParts(new Date(guess))
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)])
  )

  if (
    check.year !== desired.year ||
    check.month !== desired.month ||
    check.day !== desired.day ||
    check.hour !== desired.hour ||
    check.minute !== desired.minute
  ) {
    throw new Error(
      'That local time does not exist in the selected timezone because of a clock change. Choose another time.'
    )
  }

  return new Date(guess).toISOString()
}

const navigation = [
  { label: 'Dashboard', icon: 'dashboard' },
  { label: 'Create', icon: 'create' },
  { label: 'Live News', icon: 'news' },
  { label: 'AI Presenter', icon: 'presenter' },
  { label: 'Podcast / Public Discussion', icon: 'podcast' },
  { label: 'AI Receptionist', icon: 'receptionist' },
  { label: 'Distribution Agent', icon: 'analytics' },
  { label: 'Projects', icon: 'projects' },
  { label: 'Media', icon: 'media' },
  { label: 'Studio Theatre', icon: 'theatre' },
  { label: 'Voices', icon: 'voices' },
  { label: 'Brand Kit', icon: 'brand' },
  { label: 'Analytics', icon: 'analytics' },
  { label: 'Usage & Allowance', icon: 'analytics' },
]

function SidebarIcon({ name }) {
  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="4" rx="1.5" /><rect x="14" y="10" width="7" height="11" rx="1.5" /><rect x="3" y="13" width="7" height="8" rx="1.5" /></>,
    create: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
    news: <><path d="M4 4h16v15H4z" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
    presenter: <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="m10 8 5 2.5-5 2.5z" /><path d="M8 21h8M12 17v4" /></>,
    projects: <><path d="M3 7.5A1.5 1.5 0 0 1 4.5 6H10l2 2h7.5A1.5 1.5 0 0 1 21 9.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z" /><path d="M3.5 10h17" /></>,
    media: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9" r="1.5" /><path d="m4 17 5-5 3 3 3-4 5 6" /></>,
    voices: <><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" /></>,
    brand: <><path d="m12 3 2.5 5.5L20 11l-5.5 2.5L12 19l-2.5-5.5L4 11l5.5-2.5z" /><path d="m19 15 1.2 2.8L23 19l-2.8 1.2L19 23l-1.2-2.8L15 19l2.8-1.2z" /></>,
    theatre: <><rect x="3" y="4" width="18" height="15" rx="2" /><path d="m10 8 5 3.5-5 3.5z" /><path d="M8 22h8M12 19v3" /></>,
    analytics: <><path d="M4 20V11M10 20V5M16 20v-8M22 20H2" /></>,
    podcast: <><circle cx="12" cy="12" r="3" /><path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.5 5.5a9 9 0 0 0 0 13M18.5 5.5a9 9 0 0 1 0 13" /></>,
    receptionist: <><circle cx="12" cy="8" r="4" /><path d="M5 21v-2a7 7 0 0 1 14 0v2M19 8h2a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2M5 8H3a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h2" /></>,
  }

  return (
    <svg
      className="sidebar-svg-icon"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name] || paths.dashboard}
    </svg>
  )
}
const contentTypes = [
  'TEXT',
  'SCRIPT',
  'VIDEO',
  'AUDIO',
  'IMAGE',
  'SOCIAL_POST',
]

const statusFilters = [
  'ALL',
  'DRAFT',
  'IN_REVIEW',
  'APPROVED',
  'PUBLISHED',
  'ARCHIVED',
]

const statusLabels = {
  DRAFT: 'Draft',
  IN_REVIEW: 'In Review',
  APPROVED: 'Approved',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
}

const typeLabels = {
  TEXT: 'Text',
  SCRIPT: 'Script',
  VIDEO: 'Video',
  AUDIO: 'Audio',
  IMAGE: 'Image',
  SOCIAL_POST: 'Social Post',
}

const presenterOptions = [
  {
    id: 'avesta',
    name: 'System Avesta',
    role: 'DiraFlow AI Presenter',
    description:
      'Professional digital presenter designed for business communication, news and executive presentations.',
    category: 'System',
    initials: 'SA',
  },
  {
    id: 'executive',
    name: 'Executive Presenter',
    role: 'Corporate Communications',
    description:
      'A confident executive presentation persona for leadership updates, reports and business announcements.',
    category: 'Business',
    initials: 'EP',
  },
  {
    id: 'news',
    name: 'News Presenter',
    role: 'News & Current Affairs',
    description:
      'Designed for structured news delivery, briefings and information-led presentations.',
    category: 'News',
    initials: 'NP',
  },
  {
    id: 'specialist',
    name: 'Product Specialist',
    role: 'Product & Marketing',
    description:
      'A polished presenter for product demonstrations, customer education and marketing communication.',
    category: 'Marketing',
    initials: 'PS',
  },
]

const voiceOptions = [
  {
    id: 'professional-female',
    name: 'Matilda Professional',
    language: 'English',
    accent: 'International',
    style: 'Professional',
    gender: 'Female',
    elevenLabsVoiceId: 'XrExE9yKIg1WjnnlVkGX',
  },
  {
    id: 'executive-male',
    name: 'Eric Executive',
    language: 'English',
    accent: 'International',
    style: 'Executive',
    gender: 'Male',
    elevenLabsVoiceId: 'cjVigY5qzO86Huf0OWal',
  },
  {
    id: 'news-female',
    name: 'Sarah News',
    language: 'English',
    accent: 'International',
    style: 'News',
    gender: 'Female',
    elevenLabsVoiceId: 'EXAVITQu4vr4xnSDxMaL',
  },
  {
    id: 'africa-male',
    name: 'George Business',
    language: 'English',
    accent: 'International',
    style: 'Warm',
    gender: 'Male',
    elevenLabsVoiceId: 'JBFqnCBsd6RMkjVDRZzb',
  },
]
const presenterStyles = `
.presenter-studio {
  max-width: 1400px;
  margin: 0 auto;
}

.presenter-hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 32px;
  margin-bottom: 26px;
}

.presenter-hero-copy {
  max-width: 760px;
}

.presenter-hero h1 {
  margin: 5px 0 10px;
  font-size: 32px;
  line-height: 1.15;
  letter-spacing: -0.8px;
}

.presenter-hero-text {
  margin: 0;
  color: #667085;
  font-size: 15px;
  line-height: 1.7;
}

.presenter-readiness {
  min-width: 210px;
  border: 1px solid #e4e7ec;
  background: #ffffff;
  border-radius: 14px;
  padding: 15px 17px;
  box-shadow: 0 4px 16px rgba(16, 24, 40, 0.04);
}

.presenter-readiness-label {
  display: block;
  color: #98a2b3;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-bottom: 7px;
}

.presenter-readiness-value {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #344054;
}

.presenter-readiness-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #12b76a;
  box-shadow: 0 0 0 4px rgba(18, 183, 106, 0.1);
}

.presenter-stepper {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0;
  background: #ffffff;
  border: 1px solid #e4e7ec;
  border-radius: 16px;
  padding: 8px;
  margin-bottom: 20px;
  box-shadow: 0 4px 18px rgba(16, 24, 40, 0.04);
}

.presenter-step {
  position: relative;
  display: flex;
  align-items: center;
  gap: 11px;
  border: 0;
  background: transparent;
  padding: 13px 15px;
  border-radius: 11px;
  cursor: pointer;
  text-align: left;
  color: #667085;
}

.presenter-step:hover {
  background: #f8fafc;
}

.presenter-step.active {
  background: #f3f7ff;
  color: #1d4ed8;
}

.presenter-step-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  border-radius: 50%;
  border: 1px solid #d0d5dd;
  background: #ffffff;
  color: #667085;
  font-size: 12px;
  font-weight: 800;
}

.presenter-step.active .presenter-step-number {
  border-color: #315efb;
  background: #315efb;
  color: #ffffff;
}

.presenter-step.complete .presenter-step-number {
  border-color: #12b76a;
  background: #12b76a;
  color: #ffffff;
}

.presenter-step-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.presenter-step-copy strong {
  font-size: 13px;
}

.presenter-step-copy span {
  font-size: 11px;
  color: #98a2b3;
}

.presenter-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 310px;
  gap: 20px;
}

.presenter-main-panel,
.presenter-summary-panel {
  border: 1px solid #e4e7ec;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 4px 18px rgba(16, 24, 40, 0.04);
}

.presenter-main-panel {
  min-height: 570px;
  padding: 26px;
}

.presenter-summary-panel {
  padding: 21px;
  align-self: start;
  position: sticky;
  top: 20px;
}

.presenter-panel-heading {
  margin-bottom: 22px;
}

.presenter-panel-heading h2 {
  margin: 0 0 6px;
  font-size: 19px;
  color: #101828;
}

.presenter-panel-heading p {
  margin: 0;
  color: #667085;
  font-size: 13px;
  line-height: 1.6;
}

.presenter-option-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.presenter-option-card {
  position: relative;
  display: flex;
  gap: 15px;
  width: 100%;
  padding: 17px;
  border: 1px solid #e4e7ec;
  border-radius: 14px;
  background: #ffffff;
  text-align: left;
  cursor: pointer;
  transition: 0.18s ease;
}

.presenter-option-card:hover {
  border-color: #b8c6e8;
  box-shadow: 0 7px 20px rgba(16, 24, 40, 0.06);
}

.presenter-option-card.selected {
  border-color: #315efb;
  background: #f7f9ff;
  box-shadow: 0 0 0 2px rgba(49, 94, 251, 0.08);
}

.presenter-avatar {
  width: 62px;
  height: 76px;
  flex: 0 0 62px;
  border-radius: 12px;
  background: linear-gradient(145deg, #172554, #315efb);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 800;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.16);
}

.presenter-option-content {
  min-width: 0;
}

.presenter-option-content h3 {
  margin: 0 0 4px;
  font-size: 14px;
  color: #101828;
}

.presenter-option-role {
  display: block;
  margin-bottom: 8px;
  color: #315efb;
  font-size: 11px;
  font-weight: 700;
}

.presenter-option-content p {
  margin: 0;
  color: #667085;
  font-size: 12px;
  line-height: 1.55;
}

.presenter-category {
  display: inline-flex;
  margin-top: 11px;
  padding: 4px 8px;
  border-radius: 999px;
  background: #f2f4f7;
  color: #667085;
  font-size: 10px;
  font-weight: 700;
}

.presenter-selected-check {
  position: absolute;
  top: 13px;
  right: 13px;
  width: 21px;
  height: 21px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #315efb;
  color: #ffffff;
  font-size: 11px;
  font-weight: 800;
}

.voice-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.voice-card {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 15px;
  border: 1px solid #e4e7ec;
  border-radius: 13px;
  background: #ffffff;
  cursor: pointer;
  text-align: left;
}

.voice-card:hover {
  border-color: #b8c6e8;
}

.voice-card.selected {
  border-color: #315efb;
  background: #f7f9ff;
}

.voice-selection-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  flex: 0 0 22px;
  border: 2px solid #98a2b3;
  border-radius: 50%;
  background: #fff;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  box-sizing: border-box;
}

.voice-card.selected .voice-selection-indicator {
  border-color: #315efb;
  background: #315efb;
}

.voice-copy {
  min-width: 0;
  flex: 1;
}

.voice-copy strong {
  display: block;
  color: #101828;
  font-size: 13px;
  margin-bottom: 4px;
}

.voice-copy span {
  display: block;
  color: #667085;
  font-size: 11px;
  line-height: 1.45;
}

.voice-preview {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  min-height: 34px;
  padding: 0 11px;
  border: 1px solid #d0d5dd;
  border-radius: 8px;
  background: #fff;
  color: #344054;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
}

.voice-preview:hover {
  border-color: #315efb;
  background: #f2f5ff;
}

.script-layout {
  display: grid;
  grid-template-columns: 1fr 285px;
  gap: 18px;
}

.script-editor {
  width: 100%;
  min-height: 350px;
  resize: vertical;
  border: 1px solid #d0d5dd;
  border-radius: 12px;
  padding: 17px;
  font: inherit;
  font-size: 14px;
  line-height: 1.7;
  color: #101828;
  outline: none;
  box-sizing: border-box;
}

.script-editor:focus {
  border-color: #315efb;
  box-shadow: 0 0 0 3px rgba(49, 94, 251, 0.08);
}

.script-controls {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.presenter-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.presenter-field label {
  color: #475467;
  font-size: 11px;
  font-weight: 700;
}

.presenter-field select,
.presenter-field input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #d0d5dd;
  border-radius: 9px;
  padding: 10px 11px;
  background: #ffffff;
  color: #344054;
  outline: none;
}

.presenter-field select:focus,
.presenter-field input:focus {
  border-color: #315efb;
}

.script-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 9px;
  color: #98a2b3;
  font-size: 11px;
}

.ai-script-button {
  width: 100%;
  border: 1px solid #c7d2fe;
  background: #eef2ff;
  color: #3730a3;
  border-radius: 10px;
  padding: 11px 13px;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.ai-script-button:hover {
  background: #e0e7ff;
}

.production-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.production-choice-group {
  display: flex;
  gap: 9px;
}

.production-choice {
  flex: 1;
  padding: 14px;
  border: 1px solid #d0d5dd;
  border-radius: 11px;
  background: #ffffff;
  cursor: pointer;
  text-align: left;
}

.production-choice.selected {
  border-color: #315efb;
  background: #f7f9ff;
}

.production-choice strong {
  display: block;
  margin-bottom: 3px;
  font-size: 13px;
  color: #101828;
}

.production-choice span {
  font-size: 10px;
  color: #667085;
}

.production-option {
  padding: 15px;
  border: 1px solid #e4e7ec;
  border-radius: 12px;
}

.production-option-label {
  display: block;
  margin-bottom: 8px;
  color: #475467;
  font-size: 11px;
  font-weight: 700;
}

.production-option select {
  width: 100%;
  border: 1px solid #d0d5dd;
  border-radius: 9px;
  padding: 10px;
  background: #ffffff;
}

.production-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 26px;
  padding-top: 20px;
  border-top: 1px solid #eaecf0;
}

.presenter-nav-actions {
  display: flex;
  gap: 9px;
}

.presenter-summary-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 17px;
}

.presenter-summary-heading h3 {
  margin: 0;
  color: #101828;
  font-size: 14px;
}

.ready-badge {
  padding: 5px 8px;
  border-radius: 999px;
  background: #ecfdf3;
  color: #027a48;
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
}

.summary-preview {
  min-height: 170px;
  border-radius: 13px;
  background: linear-gradient(145deg, #101828, #1d2939);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 17px;
  overflow: hidden;
}

.summary-presenter {
  width: 82px;
  height: 112px;
  border-radius: 17px;
  background: linear-gradient(145deg, #344054, #315efb);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-weight: 800;
  font-size: 19px;
}

.summary-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-bottom: 18px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  padding: 10px 0;
  border-bottom: 1px solid #f2f4f7;
}

.summary-row span {
  color: #98a2b3;
  font-size: 11px;
}

.summary-row strong {
  color: #344054;
  font-size: 11px;
  text-align: right;
}

.production-ready-box {
  padding: 13px;
  border-radius: 11px;
  background: #f8fafc;
  border: 1px solid #eaecf0;
  margin-bottom: 14px;
}

.production-ready-box strong {
  display: block;
  color: #344054;
  font-size: 11px;
  margin-bottom: 4px;
}

.production-ready-box span {
  color: #667085;
  font-size: 10px;
  line-height: 1.5;
}

.generate-button {
  width: 100%;
  min-height: 45px;
  border: 0;
  border-radius: 10px;
  background: #315efb;
  color: #ffffff;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 5px 14px rgba(49, 94, 251, 0.22);
}

.generate-button:hover {
  background: #2449d8;
}

.presenter-footer-note {
  margin-top: 18px;
  color: #98a2b3;
  font-size: 10px;
  line-height: 1.6;
  text-align: center;
}

.presenter-preview {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 270px;
  gap: 20px;
}

.preview-stage {
  min-height: 470px;
  border-radius: 16px;
  background: #101828;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.preview-stage::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 50% 35%, rgba(49, 94, 251, 0.25), transparent 35%),
    linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.2));
}

.preview-presenter {
  position: relative;
  z-index: 1;
  width: 170px;
  height: 265px;
  border-radius: 30px 30px 22px 22px;
  background: linear-gradient(145deg, #344054, #315efb);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 30px;
  font-weight: 800;
  box-shadow: 0 25px 70px rgba(0,0,0,0.3);
}

.preview-overlay {
  position: absolute;
  z-index: 2;
  left: 20px;
  right: 20px;
  bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.preview-title {
  color: #ffffff;
}

.preview-title strong {
  display: block;
  font-size: 13px;
  margin-bottom: 4px;
}

.preview-title span {
  font-size: 10px;
  color: #cbd5e1;
}

.preview-format {
  padding: 6px 9px;
  border-radius: 7px;
  background: rgba(255,255,255,0.1);
  color: #ffffff;
  font-size: 9px;
  font-weight: 800;
}

.preview-checklist {
  border: 1px solid #e4e7ec;
  border-radius: 14px;
  padding: 17px;
  background: #ffffff;
}

.preview-checklist h3 {
  margin: 0 0 15px;
  font-size: 13px;
  color: #101828;
}

.preview-check {
  display: flex;
  gap: 9px;
  align-items: flex-start;
  margin-bottom: 13px;
}

.preview-check-mark {
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  border-radius: 50%;
  background: #ecfdf3;
  color: #039855;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 800;
}

.preview-check strong {
  display: block;
  color: #344054;
  font-size: 11px;
}

.preview-check span {
  display: block;
  margin-top: 2px;
  color: #98a2b3;
  font-size: 9px;
}

@media (max-width: 1100px) {
  .presenter-workspace,
  .script-layout,
  .presenter-preview {
    grid-template-columns: 1fr;
  }

  .presenter-summary-panel {
    position: static;
  }
}

@media (max-width: 760px) {
  .presenter-hero,
  .production-actions {
    flex-direction: column;
  }

  .presenter-stepper,
  .presenter-option-grid,
  .voice-grid,
  .production-grid {
    grid-template-columns: 1fr;
  }

  .presenter-main-panel {
    padding: 18px;
  }
}
`

function getStoredToken() {
  return (
    localStorage.getItem('token') ||
    localStorage.getItem('accessToken') ||
    localStorage.getItem('diraflow_token') ||
    ''
  )
}

async function apiRequest(path, options = {}) {
  const token = getStoredToken()

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  let payload = null

  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    throw new Error(
      payload?.message ||
        `Request failed with status ${response.status}`
    )
  }

  return payload
}

function formatDate(value) {
  if (!value) {
    return 'N/A';
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatType(type) {
  return typeLabels[type] || type || 'Unknown'
}

function StatusBadge({ status }) {
  return (
    <span className={`content-status status-${status?.toLowerCase()}`}>
      <span className="status-badge-dot" />
      {statusLabels[status] || status}
    </span>
  )
}

function TypeBadge({ type }) {
  return (
    <span className={`content-type type-${type?.toLowerCase()}`}>
      {formatType(type)}
    </span>
  )
}

function getYouTubeVideoId(value) {
  try {
    const parsed = new URL(value.trim())
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '')
    let videoId = ''

    if (hostname === 'youtu.be') {
      videoId = parsed.pathname.split('/').filter(Boolean)[0] || ''
    } else if (
      ['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com'].includes(hostname)
    ) {
      if (parsed.pathname === '/watch') {
        videoId = parsed.searchParams.get('v') || ''
      } else {
        const match = parsed.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/)
        videoId = match?.[1] || ''
      }
    }

    return /^[A-Za-z0-9_-]{11}$/.test(videoId) ? videoId : null
  } catch {
    return null
  }
}

function App() {
  const [activePage, setActivePage] = useState('Dashboard')
  const [apiStatus, setApiStatus] = useState('checking')
  const [voiceUsage, setVoiceUsage] = useState(null)
  const [voiceUsageLoading, setVoiceUsageLoading] = useState(false)
  const [voiceUsageError, setVoiceUsageError] = useState('')
  const [creditLedger, setCreditLedger] = useState(null)
  const [creditLedgerLoading, setCreditLedgerLoading] = useState(false)
  const [creditLedgerError, setCreditLedgerError] = useState('')

  const [currentUser, setCurrentUser] = useState(null)

  const canCreateContent =
    Array.isArray(currentUser?.permissions) &&
    currentUser.permissions.includes('content.create')
  const [authLoading, setAuthLoading] = useState(true)
  const [showLanding, setShowLanding] = useState(true)
  const [authError, setAuthError] = useState('')
  const [authMode, setAuthMode] = useState('login')
  const [registrationSubmitting, setRegistrationSubmitting] = useState(false)
  const [signupForm, setSignupForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  })

  const [loginSubmitting, setLoginSubmitting] = useState(false)

  const [content, setContent] = useState([])
  const [distributionMode, setDistributionMode] = useState('SCHEDULE')
  const [distributionContentId, setDistributionContentId] = useState('')
  const [distributionDate, setDistributionDate] = useState('')
  const [distributionTime, setDistributionTime] = useState('09:00')
  const [distributionTimezone, setDistributionTimezone] = useState('Africa/Lagos')
  const [distributionRepeatInterval, setDistributionRepeatInterval] = useState('WEEK')
  const [distributionRepeatCount, setDistributionRepeatCount] = useState('1')
  const [distributionPlatforms, setDistributionPlatforms] = useState([])
  const [distributionFeedback, setDistributionFeedback] = useState('')
  const [distributionError, setDistributionError] = useState('')
  const [distributionPlans, setDistributionPlans] = useState([])
  const [distributionPlansLoading, setDistributionPlansLoading] = useState(false)
  const [distributionPlansError, setDistributionPlansError] = useState('')
  const [distributionSubmitting, setDistributionSubmitting] = useState(false)
  const [distributionCancellingId, setDistributionCancellingId] = useState('')
  const [contentLoading, setContentLoading] = useState(false)
  const [contentError, setContentError] = useState('')
  const [mediaAssets, setMediaAssets] = useState([])
  const [mediaLoading, setMediaLoading] = useState(false)
  const [mediaUploading, setMediaUploading] = useState(false)
  const [mediaError, setMediaError] = useState('')
  const [mediaFeedback, setMediaFeedback] = useState('')
  const [mediaPreview, setMediaPreview] = useState(null)
  const [mediaRestoreAttempted, setMediaRestoreAttempted] = useState(false)
  const [externalVideoUrl, setExternalVideoUrl] = useState('')

  useEffect(() => {
    if (!mediaPreview?.objectUrl) return undefined
    const objectUrl = mediaPreview.url
    return () => URL.revokeObjectURL(objectUrl)
  }, [mediaPreview?.url, mediaPreview?.objectUrl])

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')

  const [selectedContent, setSelectedContent] = useState(null)

  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'SCRIPT',
    body: '',
  })

  const [formSaving, setFormSaving] = useState(false)
  const [formMessage, setFormMessage] = useState('')
  const [formError, setFormError] = useState('')

  const [presenterStage, setPresenterStage] = useState(1)
  const [selectedPresenter, setSelectedPresenter] = useState(
    presenterOptions[0]
  )
  const [selectedVoice, setSelectedVoice] = useState(
    voiceOptions[0]
  )

  const [script, setScript] = useState(
    'Welcome to DiraFlow MediaAI. Today, I want to share how intelligent digital communication can help businesses transform ideas, information and expertise into professional media experiences.'
  )

  const [scriptUploadLoading, setScriptUploadLoading] = useState(false)
  const [scriptUploadError, setScriptUploadError] = useState('')
  const [scriptUploadMessage, setScriptUploadMessage] = useState('')
  const [pendingExtractedScript, setPendingExtractedScript] = useState(null)

  async function loadMediaAssets({ preserveError = false } = {}) {
    setMediaLoading(true)
    if (!preserveError) setMediaError('')

    try {
      const payload = await apiRequest('/api/assets/')
      const assets = Array.isArray(payload?.assets) ? payload.assets : []
      setMediaAssets(assets)
      return assets
    } catch (error) {
      setMediaError(error.message || 'Unable to load the media library.')
    } finally {
      setMediaLoading(false)
    }
  }

  async function handleMediaUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return

    setMediaError('')
    setMediaFeedback('')

    const allowedTypes = new Set([
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'video/mp4', 'video/webm',
      'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg',
      'application/pdf', 'text/plain',
    ])

    if (!allowedTypes.has(file.type)) {
      setMediaError('This file type is not supported. Choose an accepted image, audio, video, PDF or plain-text file.')
      event.target.value = ''
      return
    }

    if (file.size < 1 || file.size > 100 * 1024 * 1024) {
      setMediaError('Choose a non-empty file no larger than 100 MB.')
      event.target.value = ''
      return
    }

    setMediaUploading(true)
    setMediaFeedback('Requesting an upload request...')

    try {
      const request = await apiRequest('/api/assets/upload-url', {
        method: 'POST',
        body: JSON.stringify({
          originalFilename: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        }),
      })

      if (!request?.success || !request?.asset?.id) {
        throw new Error('The server did not return a valid upload request.')
      }

      if (request.uploadMode === 'local') {
        setMediaFeedback('Uploading file to local development storage...')
        const formData = new FormData()
        formData.append('file', file)

        const token = getStoredToken()
        const headers = token ? { Authorization: `Bearer ${token}` } : {}
        const response = await fetch(
          `${API_BASE_URL}/api/assets/${encodeURIComponent(request.asset.id)}/local-upload`,
          { method: 'POST', headers, body: formData }
        )

        let payload = null
        try {
          payload = await response.json()
        } catch {
          payload = null
        }

        if (!response.ok || !payload?.success) {
          throw new Error(payload?.message || `Local upload failed (${response.status}).`)
        }
      } else {
        if (!request.uploadUrl) {
          throw new Error('The server did not return a storage upload URL.')
        }

        setMediaFeedback('Uploading file to cloud storage...')
        const response = await fetch(request.uploadUrl, {
          method: 'PUT',
          headers: request.requiredHeaders || { 'Content-Type': file.type },
          body: file,
        })

        if (!response.ok) {
          throw new Error(`Storage upload failed (${response.status}). Refresh the library and check the asset status before retrying.`)
        }

        setMediaFeedback('Verifying the stored file...')
        const completion = await apiRequest(
          `/api/assets/${encodeURIComponent(request.asset.id)}/complete`,
          { method: 'POST' }
        )

        if (!completion?.success) {
          throw new Error('The file was uploaded but the server could not verify it.')
        }
      }

      setMediaFeedback(`Uploaded and verified: ${file.name}`)
      await loadMediaAssets()
    } catch (error) {
      setMediaError(error.message || 'The upload could not be completed.')
      setMediaFeedback('')
      await loadMediaAssets({ preserveError: true })
    } finally {
      setMediaUploading(false)
      event.target.value = ''
    }
  }

  function handleExternalVideoSubmit(event) {
    event.preventDefault()
    setMediaError('')
    setMediaFeedback('')

    const originalUrl = externalVideoUrl.trim()
    const videoId = getYouTubeVideoId(originalUrl)

    if (!videoId) {
      setMediaError(
        'Enter a valid YouTube URL for a watch page, youtu.be link, Shorts, Live or embed video.'
      )
      return
    }

    localStorage.removeItem('diraflow_studio_theatre_asset_id')
    localStorage.setItem('diraflow_studio_theatre_external_video', originalUrl)
    sessionStorage.setItem('diraflow_studio_theatre_watching_video', '1')

    setMediaPreview({
      id: `external-youtube-${videoId}`,
      originalFilename: `YouTube video (${videoId})`,
      mimeType: 'video/youtube',
      url: `https://www.youtube-nocookie.com/embed/${videoId}`,
      externalUrl: originalUrl,
      external: true,
      objectUrl: false,
    })

    setExternalVideoUrl('')
    setActivePage('Studio Theatre')
  }

  async function handleMediaPreview(asset) {
    setMediaError('')
    setMediaFeedback('Requesting a secure file link...')

    try {
      const payload = await apiRequest(
        `/api/assets/${encodeURIComponent(asset.id)}/download-url`
      )

      if (!payload?.success) {
        throw new Error('The server did not return a valid file link.')
      }

      if (payload.localFile && payload.fileUrl) {
        setMediaFeedback('Loading protected local file...')
        const token = getStoredToken()
        const headers = token ? { Authorization: `Bearer ${token}` } : {}
        const response = await fetch(`${API_BASE_URL}${payload.fileUrl}`, { headers })

        if (!response.ok) {
          let errorPayload = null
          try {
            errorPayload = await response.json()
          } catch {
            errorPayload = null
          }
          throw new Error(
            errorPayload?.message || `File retrieval failed (${response.status}).`
          )
        }

        const objectUrl = URL.createObjectURL(await response.blob())
        setMediaPreview({ ...asset, url: objectUrl, objectUrl: true })
      } else {
        if (!payload.downloadUrl) {
          throw new Error('The server did not return a download link.')
        }
        setMediaPreview({ ...asset, url: payload.downloadUrl, objectUrl: false })
      }

      localStorage.removeItem('diraflow_studio_theatre_external_video')
      localStorage.setItem('diraflow_studio_theatre_asset_id', asset.id)

      if ((asset.mimeType || '').startsWith('video/')) {
        sessionStorage.setItem('diraflow_studio_theatre_watching_video', '1')
      } else {
        sessionStorage.removeItem('diraflow_studio_theatre_watching_video')
      }
      setMediaFeedback('')
      setActivePage('Studio Theatre')
    } catch (error) {
      setMediaFeedback('')
      setMediaError(error.message || 'Unable to open this asset.')
    }
  }

  async function handleMediaDelete(asset) {
    const confirmed = window.confirm(
      `Delete "${asset.originalFilename}"? This action removes the stored file when applicable.`
    )

    if (!confirmed) return

    setMediaError('')
    setMediaFeedback('Deleting asset...')

    try {
      await apiRequest(`/api/assets/${encodeURIComponent(asset.id)}`, {
        method: 'DELETE',
      })

      if (mediaPreview?.id === asset.id) {
        setMediaPreview(null)
        localStorage.removeItem('diraflow_studio_theatre_asset_id')
      }

      setMediaFeedback(`Deleted: ${asset.originalFilename}`)
      await loadMediaAssets()
    } catch (error) {
      setMediaFeedback('')
      setMediaError(error.message || 'Unable to delete this asset.')
    }
  }
  async function handleScriptDocumentUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return

    setScriptUploadError('')
    setScriptUploadMessage('')
    setPendingExtractedScript(null)

    const allowedExtensions = ['.docx', '.pdf', '.txt']
    const dot = file.name.lastIndexOf('.')
    const extension = dot >= 0 ? file.name.slice(dot).toLowerCase() : ''
    const maxBytes = 50 * 1024 * 1024

    if (!allowedExtensions.includes(extension)) {
      setScriptUploadError('Unsupported format. Choose a .docx, .pdf, or .txt document.')
      event.target.value = ''
      return
    }

    if (file.size > maxBytes) {
      setScriptUploadError('This document exceeds the 50 MB upload limit.')
      event.target.value = ''
      return
    }

    if (file.size === 0) {
      setScriptUploadError('The selected file is empty.')
      event.target.value = ''
      return
    }

    setScriptUploadLoading(true)
    setScriptUploadMessage('Extracting document text. Large files may take some time.')

    try {
      const formData = new FormData()
      formData.append('document', file)

      const token = getStoredToken()
      const response = await fetch(`${API_BASE_URL}/api/scripts/extract-script`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })

      let payload = null
      try {
        payload = await response.json()
      } catch {
        payload = null
      }

      if (!response.ok || !payload?.success || typeof payload.text !== 'string') {
        throw new Error(payload?.message || `Document extraction failed (${response.status}).`)
      }

      setPendingExtractedScript({
        fileName: payload.fileName || file.name,
        text: payload.text,
        wordCount: payload.wordCount,
      })
      setScriptUploadMessage('Text extracted. Review it below before replacing your current script.')
    } catch (error) {
      setScriptUploadMessage('')
      setScriptUploadError(
        error.message || 'Could not extract this document. Check the file and try again.'
      )
    } finally {
      setScriptUploadLoading(false)
      event.target.value = ''
    }
  }

  function applyExtractedScript() {
    if (!pendingExtractedScript) return
    setScript(pendingExtractedScript.text)
    setScriptUploadMessage(`Script replaced with text from ${pendingExtractedScript.fileName}. Review it before production.`)
    setScriptUploadError('')
    setPendingExtractedScript(null)
  }

  const [scriptObjective, setScriptObjective] = useState(
    'Business presentation'
  )

  const [podcastForm, setPodcastForm] = useState({
    title: '',
    format: 'Interview',
    persona: 'Professional Executive',
    language: 'UK English',
    production: 'Audio and video',
    topic: '',
    brief: '',
  })

  const [savedPodcastPlans, setSavedPodcastPlans] = useState(() => {
    try {
      const stored = localStorage.getItem('diraflow_podcast_plans')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  const [receptionistForm, setReceptionistForm] = useState(() => {
    const defaults = {
      businessName: '',
      greeting: 'Good morning, Joan speaking. How may I help you today?',
      instructions: "Greeting and enquiry identification: Announce the configured business name first, then deliver the configured opening greeting exactly once. Listen to the caller and identify the purpose of the enquiry. Ask concise follow-up questions when necessary.\n\nProduct and service enquiries: Use approved company information and FAQs. Never invent prices, product features, policies or commitments. If information is unavailable or uncertain, offer to refer the enquiry to the appropriate staff member.\n\nManagers and staff: Identify the appropriate person and attempt to route the call only when a call-routing service is connected and the action is available.\n\nUnanswered calls and messages: If the intended recipient is unavailable, explain politely and offer to take a message. Collect only necessary details, subject to the company privacy policy and caller consent. Do not claim that a message was delivered unless delivery is confirmed.\n\nUrgent and sensitive enquiries: Refer urgent matters to an appropriate human contact according to the configured escalation procedure. Do not make unauthorised decisions or promises.\n\nProfessional conduct and privacy: Remain courteous, calm and concise. Protect confidential information and never claim that a call was transferred or an action completed unless it actually succeeded.",
      routeTo: 'Production team',
      captureContact: true,
      escalateUrgent: true,
    }
    try {
      const stored = localStorage.getItem('diraflow_receptionist_config')
      return stored ? { ...defaults, ...JSON.parse(stored) } : defaults
    } catch {
      return defaults
    }
  })

  const [workspaceNotice, setWorkspaceNotice] = useState('')
  const [receptionistPreview, setReceptionistPreview] = useState('')
  const [receptionistGuidancePreview, setReceptionistGuidancePreview] = useState('')
  const [receptionistMessages, setReceptionistMessages] = useState([])
  const [receptionistInput, setReceptionistInput] = useState('')
  const [receptionistSending, setReceptionistSending] = useState(false)
  const [receptionistChatError, setReceptionistChatError] = useState('')

  const handleReceptionistSend = async () => {
    const message = receptionistInput.trim()

    if (!message || receptionistSending) return

    setReceptionistInput('')
    setReceptionistChatError('')
    setReceptionistMessages((previous) => [
      ...previous,
      { role: 'caller', text: message },
    ])
    setReceptionistSending(true)

    try {
      const result = await apiRequest('/api/receptionist/simulate', {
        method: 'POST',
        body: JSON.stringify({
          message,
          config: receptionistForm,
        }),
      })

      setReceptionistMessages((previous) => [
        ...previous,
        {
          role: 'receptionist',
          text: result.reply || 'No response was returned.',
          category: result.category || 'general',
          escalation: Boolean(result.escalation),
          notice: result.notice || '',
        },
      ])
    } catch (error) {
      setReceptionistChatError(
        error.message || 'Unable to simulate a response. Check your login and backend server.'
      )
    } finally {
      setReceptionistSending(false)
    }
  }

  const [scriptAudience, setScriptAudience] = useState(
    'Business decision makers'
  )

  const [scriptTone, setScriptTone] = useState(
    'Professional'
  )

  const [productionMode, setProductionMode] = useState(
    'VIDEO'
  )

  const [aspectRatio, setAspectRatio] = useState(
    '16:9'
  )

  const [background, setBackground] = useState(
    'DiraFlow Professional'
  )

  const [captions, setCaptions] = useState(true)
  const [generationStarted, setGenerationStarted] = useState(false)
  const [isGeneratingScript, setIsGeneratingScript] =
    useState(false)

  const [isVoicePreviewing, setIsVoicePreviewing] =
    useState(false)
  const [previewingVoiceId, setPreviewingVoiceId] =
    useState(null)

  const [previewLanguage, setPreviewLanguage] = useState('UK English')
  const [previewSpeed, setPreviewSpeed] = useState('1')

  const previewLanguageSettings = {
    'UK English': {
      speed: 1,
      sample: 'Hello, welcome to DiraFlow MediaAI. This is a voice preview.',
    },
    'American English': {
      speed: 1,
      sample: 'Hello, welcome to DiraFlow MediaAI. This is a voice preview.',
    },
    French: {
      speed: 0.85,
      sample: 'Bonjour et bienvenue sur DiraFlow MediaAI. Ceci est un aperÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§u vocal.',
    },
    Spanish: {
      speed: 0.85,
      sample: 'Hola y bienvenido a DiraFlow MediaAI. Esta es una prueba de voz.',
    },
    Portuguese: {
      speed: 0.7,
      sample: 'OlÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ e bem-vindo ao DiraFlow MediaAI. Esta ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â© uma prÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©via de voz.',
    },
    Swahili: {
      speed: 0.7,
      sample: 'Karibu kwenye DiraFlow MediaAI. Huu ni mfano wa sauti.',
    },
    Arabic: {
      speed: 0.75,
      sample: 'ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â±ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â­ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¨ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¹ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¨ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€ Ã¢â‚¬â„¢ ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â  DiraFlow MediaAI. ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¡ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¡ ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¹ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â© ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚ÂµÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Âª.',
    },
    Hausa: {
      speed: 0.7,
      sample: 'Barka da zuwa DiraFlow MediaAI. Wannan gwajin murya ne.',
    },
    Yoruba: {
      speed: 0.7,
      sample: 'ÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚ÂºÃƒâ€šÃ‚Â¸ kÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â bÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»Ãƒâ€šÃ‚ÂÃƒÆ’Ã…â€™ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ sÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­ DiraFlow MediaAI. ÃƒÆ’Ã†â€™Ãƒâ€¹Ã¢â‚¬Â yÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­ ni ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â yÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚ÂºÃƒâ€šÃ‚Â¹ÃƒÆ’Ã…â€™ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬wÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â² ohÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¹n.',
    },
    Igbo: {
      speed: 0.7,
      sample: 'NnÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»Ãƒâ€šÃ‚Â na DiraFlow MediaAI. Nke a bÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»Ãƒâ€šÃ‚Â¥ nnwale olu.',
    },
  }
  const previewVoice = async (voice, customText = '') => {
    if (!voice) {
      return
    }

    if (isVoicePreviewing && previewingVoiceId === voice.id) {
      if (window.__diraflowPreviewAudio) {
        window.__diraflowPreviewAudio.pause()
        window.__diraflowPreviewAudio.currentTime = 0
        window.__diraflowPreviewAudio = null
      }

      setIsVoicePreviewing(false)
      setPreviewingVoiceId(null)
      return
    }

    if (window.__diraflowPreviewAudio) {
      window.__diraflowPreviewAudio.pause()
      window.__diraflowPreviewAudio.currentTime = 0
      window.__diraflowPreviewAudio = null
    }

    try {
      setContentError('')
      setIsVoicePreviewing(true)
      setPreviewingVoiceId(voice.id)

      const languageSettings =
        previewLanguageSettings[previewLanguage] ||
        previewLanguageSettings['UK English']

      const previewText = customText.trim() || languageSettings.sample
      const token =
        localStorage.getItem('accessToken') ||
        localStorage.getItem('token') ||
        localStorage.getItem('diraflow_token')

      if (!token) {
        throw new Error(
          'Your session has expired. Please sign in again.'
        )
      }

      const response = await fetch(
        `${API_BASE_URL}/api/voices/preview`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            text: previewText,
            voiceId: voice.elevenLabsVoiceId || voice.voiceId,
            modelId: 'eleven_multilingual_v2',
            speed: Number(previewSpeed),
          }),
        }
      )

      if (!response.ok) {
        let message =
          'Unable to generate the voice preview.'

        try {
          const errorData = await response.json()

          if (errorData?.message) {
            message = errorData.message
          }
        } catch {
          // Keep the default error message.
        }

        throw new Error(message)
      }

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)

      window.__diraflowPreviewAudio = audio

      audio.onended = () => {
        if (window.__diraflowPreviewAudio === audio) {
          window.__diraflowPreviewAudio = null
        }

        URL.revokeObjectURL(audioUrl)
        setIsVoicePreviewing(false)
        setPreviewingVoiceId(null)
      }

      audio.onerror = () => {
        if (window.__diraflowPreviewAudio === audio) {
          window.__diraflowPreviewAudio = null
        }

        URL.revokeObjectURL(audioUrl)
        setIsVoicePreviewing(false)
        setPreviewingVoiceId(null)
        setContentError(
          'Unable to play the voice preview. Please try again.'
        )
      }

      await audio.play()
    } catch (error) {
      console.error(
        'ElevenLabs voice preview error:',
        error
      )

      if (window.__diraflowPreviewAudio) {
        window.__diraflowPreviewAudio.pause()
        window.__diraflowPreviewAudio = null
      }

      setIsVoicePreviewing(false)
      setPreviewingVoiceId(null)

      setContentError(
        error.message ||
          'Unable to generate the voice preview. Please try again.'
      )
    }
  }
  const checkApiHealth = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`)

      if (!response.ok) {
        throw new Error('API health check failed')
      }

      const data = await response.json()

      if (data.success && data.database === 'connected') {
        setApiStatus('connected')
      } else {
        setApiStatus('degraded')
      }
    } catch (error) {
      console.error('DiraFlow API healthcheck failed:', error)
      setApiStatus('offline')
    }
  }

  const restoreSession = async () => {
    const token = getStoredToken()

    if (!token) {
      setCurrentUser(null)
      setAuthLoading(false)
      return
    }

    try {
      const data = await apiRequest('/api/auth/me')

      if (data?.success && data?.user) {
        setCurrentUser(data.user)
      } else {
        throw new Error('Unable to restore authenticated session.')
      }
    } catch (error) {
      console.warn('Authentication session could not be restored:', error)

      localStorage.removeItem('token')
      localStorage.removeItem('accessToken')
      localStorage.removeItem('diraflow_token')

      setCurrentUser(null)
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogin = async (event) => {
    event.preventDefault()

    setAuthError('')

    const email = loginForm.email.trim()
    const password = loginForm.password

    if (!email || !password) {
      setAuthError('Please enter your email and password.')
      return
    }

    setLoginSubmitting(true)

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      )

      let data = null

      try {
        data = await response.json()
      } catch {
        data = null
      }

      if (!response.ok) {
        throw new Error(
          data?.message ||
            `Login failed with status ${response.status}.`
        )
      }

      if (!data?.token || !data?.user) {
        throw new Error(
          'Login succeeded but no authentication session was returned.'
        )
      }

      localStorage.setItem('token', data.token)

      setCurrentUser(data.user)

      setLoginForm({
        email: '',
        password: '',
      })

      setAuthError('')
      setActivePage('Dashboard')
    } catch (error) {
      console.error('Login error:', error)

      setAuthError(
        error.message ||
          'Unable to sign in. Please check your credentials.'
      )

      localStorage.removeItem('token')
      localStorage.removeItem('accessToken')
      localStorage.removeItem('diraflow_token')

      setCurrentUser(null)
    } finally {
      setLoginSubmitting(false)
    }
  }

  const handleRegister = async (event) => {
    event.preventDefault()
    setAuthError('')

    const firstName = signupForm.firstName.trim()
    const lastName = signupForm.lastName.trim()
    const email = signupForm.email.trim().toLowerCase()
    const password = signupForm.password
    const confirmPassword = signupForm.confirmPassword

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      setAuthError('Please complete all fields.')
      return
    }

    if (password.length < 8) {
      setAuthError('Password must be at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setAuthError('The passwords do not match.')
      return
    }

    setRegistrationSubmitting(true)

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, password }),
      })

      let data = null
      try {
        data = await response.json()
      } catch {
        data = null
      }

      if (!response.ok) {
        throw new Error(data?.message || `Registration failed (${response.status}).`)
      }

      if (!data?.token || !data?.user) {
        throw new Error('Registration succeeded, but no login session was returned.')
      }

      localStorage.setItem('token', data.token)
      setCurrentUser(data.user)
      setActivePage('Dashboard')
      setAuthError('')
      setShowLanding(false)
      setAuthMode('login')
      setSignupForm({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
      })
    } catch (error) {
      console.error('Registration error:', error)
      setAuthError(error.message || 'Unable to create your account. Please try again.')
    } finally {
      setRegistrationSubmitting(false)
    }
  }
  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('accessToken')
    localStorage.removeItem('diraflow_token')

    setCurrentUser(null)
    setShowLanding(true)
    setContent([])
    setSelectedContent(null)
    setDistributionPlans([])
    setDistributionPlansError('')
    setDistributionError('')
    setDistributionFeedback('')
    setActivePage('Dashboard')
    setContentError('')
    setFormMessage('')
    setFormError('')
  }


  const loadContent = async () => {
    setContentLoading(true)
    setContentError('')

    try {
      const data = await apiRequest('/api/content')
    setContent(data?.data || [])
    setContentError('')
    } catch (error) {
      console.error('Content loading error:', error)

      setContentError(
        error.message ||
          'Unable to load content. Sign in and try again.'
      )
    } finally {
      setContentLoading(false)
    }
  }

  async function loadDistributionPlans() {
    setDistributionPlansLoading(true)
    setDistributionPlansError('')

    try {
      const response = await apiRequest('/api/distribution')

      if (!response?.success || !Array.isArray(response?.data)) {
        throw new Error('The Distribution Agent returned an unexpected response.')
      }

      setDistributionPlans(response.data)
    } catch (error) {
      setDistributionPlansError(
        error.message || 'Unable to load distribution plans.'
      )
    } finally {
      setDistributionPlansLoading(false)
    }
  }

  async function cancelDistributionPlan(planId) {
    if (!planId || distributionCancellingId) return

    setDistributionCancellingId(planId)
    setDistributionPlansError('')
    setDistributionFeedback('')

    try {
      const response = await apiRequest(
        `/api/distribution/${encodeURIComponent(planId)}/cancel`,
        { method: 'POST' }
      )

      if (!response?.success) {
        throw new Error(response?.message || 'Unable to cancel this plan.')
      }

      setDistributionFeedback(response.message || 'Distribution plan cancelled.')
      await loadDistributionPlans()
    } catch (error) {
      setDistributionPlansError(
        error.message || 'Unable to cancel this plan. Please try again.'
      )
    } finally {
      setDistributionCancellingId('')
    }
  }
  async function loadVoiceUsage() {
    setVoiceUsageLoading(true)
    setVoiceUsageError('')

    try {
      const data = await apiRequest('/api/voices/usage')

      if (!data?.success) {
        throw new Error('The usage service returned an unexpected response.')
      }

      setVoiceUsage(data)
    } catch (error) {
      setVoiceUsageError(error.message || 'Unable to load usage information.')
    } finally {
      setVoiceUsageLoading(false)
    }
  }
  async function loadCreditLedger() {
    setCreditLedgerLoading(true)
    setCreditLedgerError('')
    try {
      const data = await apiRequest('/api/voices/credits')
      if (!data?.success || !data?.credits) {
        throw new Error('The credit service returned an unexpected response.')
      }
      setCreditLedger(data)
    } catch (error) {
      setCreditLedgerError(error.message || 'Unable to load credit information.')
    } finally {
      setCreditLedgerLoading(false)
    }
  }

  useEffect(() => {
    if (currentUser && activePage === 'Usage & Allowance') {
      loadVoiceUsage()
      loadCreditLedger()
    }
  }, [currentUser, activePage])
   useEffect(() => {
    checkApiHealth()
    restoreSession()
  }, [])

  useEffect(() => {
    if (currentUser) {
      loadContent()
    } else {
      setContent([])
    }
  }, [currentUser])

  // Load persisted distribution plans only for authenticated users.
  useEffect(() => {
    if (currentUser && activePage === 'Distribution Agent') {
      loadDistributionPlans()
    }
  }, [currentUser, activePage])

  // Reload the library whenever an authenticated user opens Media.
  useEffect(() => {
    if (currentUser && activePage === 'Media') {
      loadMediaAssets()
    }
  }, [currentUser, activePage])

  // Restore the saved Theatre selection after authentication on a full refresh.
  useEffect(() => {
    if (!currentUser || mediaRestoreAttempted) return

    setMediaRestoreAttempted(true)

    // Restore Theatre after refresh only for an active video-watching session.
    if (sessionStorage.getItem('diraflow_studio_theatre_watching_video') !== '1') {
      return
    }

    const savedExternalVideoUrl = localStorage.getItem('diraflow_studio_theatre_external_video')

    if (savedExternalVideoUrl) {
      const videoId = getYouTubeVideoId(savedExternalVideoUrl)

      if (videoId) {
        localStorage.removeItem('diraflow_studio_theatre_asset_id')
        setMediaPreview({
          id: `external-youtube-${videoId}`,
          originalFilename: `YouTube video (${videoId})`,
          mimeType: 'video/youtube',
          url: `https://www.youtube-nocookie.com/embed/${videoId}`,
          externalUrl: savedExternalVideoUrl,
          external: true,
          objectUrl: false,
        })
        setActivePage('Studio Theatre')
        return
      }

      localStorage.removeItem('diraflow_studio_theatre_external_video')
      setMediaError('The saved YouTube URL is invalid. Open Media Library to enter a valid link.')
      return
    }

    const savedAssetId = localStorage.getItem('diraflow_studio_theatre_asset_id')
    if (!savedAssetId) return

    setActivePage('Media')

    async function restoreTheatreAsset() {
      try {
        const payload = await apiRequest('/api/assets/')
        const assets = Array.isArray(payload?.assets) ? payload.assets : []
        setMediaAssets(assets)

        const asset = assets.find((item) => item.id === savedAssetId)
        if (!asset) {
          setMediaError(
            'The saved Theatre selection was not found in the accessible media library. Your stored files have not been deleted by this action.'
          )
          return
        }

        await handleMediaPreview(asset)
      } catch (error) {
        setMediaError(
          error.message || 'Unable to restore the saved Theatre selection.'
        )
      }
    }

    restoreTheatreAsset()
  }, [currentUser, mediaRestoreAttempted])

  const statistics = useMemo(() => {
    return {
      total: content.length,
      drafts: content.filter(
        (item) => item.status === 'DRAFT'
      ).length,
      inReview: content.filter(
        (item) => item.status === 'IN_REVIEW'
      ).length,
      approved: content.filter(
        (item) => item.status === 'APPROVED'
      ).length,
      published: content.filter(
        (item) => item.status === 'PUBLISHED'
      ).length,
    }
  }, [content])

  const filteredContent = useMemo(() => {
    const normalizedSearch = searchTerm
      .trim()
      .toLowerCase()

    return content.filter((item) => {
      const matchesSearch =
        !normalizedSearch ||
        item.title?.toLowerCase().includes(normalizedSearch) ||
        item.description
          ?.toLowerCase()
          .includes(normalizedSearch) ||
        item.createdBy?.firstName
          ?.toLowerCase()
          .includes(normalizedSearch) ||
        item.createdBy?.lastName
          ?.toLowerCase()
          .includes(normalizedSearch)

      const matchesStatus =
        statusFilter === 'ALL' ||
        item.status === statusFilter

      const matchesType =
        typeFilter === 'ALL' ||
        item.type === typeFilter

      return (
        matchesSearch &&
        matchesStatus &&
        matchesType
      )
    })
  }, [
    content,
    searchTerm,
    statusFilter,
    typeFilter,
  ])

  const resetCreateForm = () => {
    setForm({
      title: '',
      description: '',
      type: 'SCRIPT',
      body: '',
    })

    setFormMessage('')
    setFormError('')
  }

  const handleCreateContent = async (event) => {
    event.preventDefault()

    setFormSaving(true)
    setFormMessage('')
    setFormError('')

    try {
      const data = await apiRequest('/api/content', {
        method: 'POST',
        body: JSON.stringify({
          title: form.title.trim(),
          description:
            form.description.trim() || null,
          type: form.type,
          body: form.body || null,
        }),
      })

      const created = data?.data

      if (created) {
        setContent((current) => [
          created,
          ...current,
        ])
      }

      setFormMessage(
        'Content created successfully as a draft.'
      )

      setForm({
        title: '',
        description: '',
        type: 'SCRIPT',
        body: '',
      })
    } catch (error) {
      console.error('Create content error:', error)

      setFormError(
        error.message ||
          'Unable to create content.'
      )
    } finally {
      setFormSaving(false)
    }
  }

  const performContentAction = async (
    contentId,
    action
  ) => {
    try {
      setContentError('')

      const data = await apiRequest(
        `/api/content/${contentId}/${action}`,
        {
          method: 'POST',
        }
      )

      const updated = data?.data

      if (updated) {
        setContent((current) =>
          current.map((item) =>
            item.id === updated.id
              ? updated
              : item
          )
        )

        setSelectedContent(updated)
      }
    } catch (error) {
      console.error(
        `${action} content error:`,
        error
      )

      setContentError(
        error.message ||
          `Unable to ${action} content.`
      )
    }
  }

  const handleNavigation = (page) => {
    if (page !== 'Studio Theatre') {
      sessionStorage.removeItem('diraflow_studio_theatre_watching_video')
    }
    setActivePage(page)

    if (page === 'Projects') {
      loadContent()
    }

    if (page === 'Create') {
      resetCreateForm()
    }

    if (page === 'AI Presenter') {
      setGenerationStarted(false)
    }
  }

  const generateStarterScript = () => {
    setIsGeneratingScript(true)

    window.setTimeout(() => {
      const presenterName = selectedPresenter.name

      setScript(
        `Hello and welcome. I am ${presenterName}, your DiraFlow MediaAI presenter.

Today, I am presenting an important message for ${scriptAudience.toLowerCase()}.

Our objective is simple: ${scriptObjective.toLowerCase()}.

DiraFlow MediaAI helps organisations turn ideas, business information and important messages into professional AI-powered media. With an appropriate presenter, approved voice and structured script, teams can communicate consistently across presentations, marketing campaigns, internal communications and digital channels.

Our approach combines intelligent content preparation with professional media production, helping businesses move from an idea to a clear and engaging presentation.

Thank you for watching.`
      )

      setIsGeneratingScript(false)
    }, 650)
  }

  const estimatedDuration = useMemo(() => {
    const words = script
      .trim()
      .split(/\s+/)
      .filter(Boolean).length

    const seconds = Math.max(
      15,
      Math.round((words / 145) * 60)
    )

    const minutes = Math.floor(seconds / 60)
    const remaining = seconds % 60

    return `${String(minutes).padStart(2, '0')}:${String(
      remaining
    ).padStart(2, '0')}`
  }, [script])

  const presenterReady =
    Boolean(selectedPresenter) &&
    Boolean(selectedVoice) &&
    script.trim().length > 20

  const renderDashboard = () => (
    <>
      <section className="welcome-section">
        <div>
          <p className="eyebrow">
            COMMAND CENTER
          </p>

          <h1>{(() => {
            const hour = new Date().getHours()
            const greeting =
              hour < 12
                ? 'Good morning'
                : hour < 17
                  ? 'Good afternoon'
                  : 'Good evening'
            const firstName = currentUser?.firstName?.trim()
            const lastName = currentUser?.lastName?.trim()
            const displayName = firstName || lastName || 'Creator'

            return `${greeting}, ${displayName}.`
          })()}</h1>

          <p className="welcome-text">
            Turn ideas, documents and news into
            professional AI-powered media.
          </p>
        </div>

        {canCreateContent && (
        <button
          className="primary-button"
          onClick={() =>
            handleNavigation('Create')
          }
        >
          <span>+</span>
          Create Content
        </button>
        )}
      </section>

      <section className="quick-create">
        <div className="section-heading">
          <div>
            <h2>
              What would you like to create?
            </h2>

            <p>
              Start a new AI-powered production.
            </p>
          </div>
        </div>

        <div className="creation-grid">
          <button
            className="creation-card"
            onClick={() =>
              handleNavigation('Create')
            }
          >
            <div className="creation-icon document-icon">DOC</div>

            <div>
              <h3>Document to Video</h3>

              <p>
                Transform documents into engaging
                presentations.
              </p>
            </div>

            <span className="card-arrow">--&gt;</span>
          </button>

          <button
            className="creation-card"
            onClick={() =>
              handleNavigation('AI Presenter')
            }
          >
            <div className="creation-icon presenter-icon">PLAY</div>

            <div>
              <h3>AI Presenter</h3>

              <p>
                Create a presentation with an AI
                human presenter.
              </p>
            </div>

            <span className="card-arrow">--&gt;</span>
          </button>

          <button
            className="creation-card"
            onClick={() =>
              handleNavigation('Live News')
            }
          >
            <div className="creation-icon news-icon">NEWS</div>

            <div>
              <h3>Live News</h3>

              <p>
                Generate an AI-powered news
                presentation.
              </p>
            </div>

            <span className="card-arrow">--&gt;</span>
          </button>
        </div>
      </section>

      <section className="metric-grid dashboard-metrics">
        <MetricCard
          label="Total Content"
          value={statistics.total}
          icon="TC"
        />

        <MetricCard
          label="Drafts"
          value={statistics.drafts}
          icon="DR"
        />

        <MetricCard
          label="In Review"
          value={statistics.inReview}
          icon="RV"
        />

        <MetricCard
          label="Published"
          value={statistics.published}
          icon="PB"
        />
      </section>

      <section className="dashboard-grid">
        <div className="panel activity-panel">
          <div className="panel-heading">
            <div>
              <h2>Recent Content</h2>

              <p>
                Your latest content productions.
              </p>
            </div>

            <button
              className="text-button"
              onClick={() =>
                handleNavigation('Projects')
              }
            >
              View all
            </button>
          </div>

          {content.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">CD</div>

              <h3>No content yet</h3>

              <p>
                Your content productions will
                appear here.
              </p>

              <button
                className="secondary-button"
                onClick={() =>
                  handleNavigation('Create')
                }
              >
                Create your first content
              </button>
            </div>
          ) : (
            <div className="recent-content-list">
              {content
                .slice(0, 5)
                .map((item) => (
                  <button
                    key={item.id}
                    className="recent-content-row"
                    onClick={() => {
                      setSelectedContent(item)
                      handleNavigation(
                        'Projects'
                      )
                    }}
                  >
                    <div className="recent-content-main">
                      <strong>
                        {item.title}
                      </strong>

                      <span>
                        {formatType(item.type)} |{' '}
                        {formatDate(
                          item.updatedAt
                        )}
                      </span>
                    </div>

                    <StatusBadge
                      status={item.status}
                    />
                  </button>
                ))}
            </div>
          )}
        </div>

        <div className="panel status-panel">
          <div className="panel-heading">
            <div>
              <h2>MediaAI Status</h2>

              <p>Platform services</p>
            </div>

            <span
              className={`status-dot status-${apiStatus}`}
            >
              <span />
              {apiStatus === 'checking' &&
                'Checking'}

              {apiStatus === 'connected' &&
                'Operational'}

              {apiStatus === 'degraded' &&
                'Degraded'}

              {apiStatus === 'offline' &&
                'Offline'}
            </span>
          </div>

          <div className="status-list">
            <div className="status-row">
              <span>API Service</span>

              <strong
                className={
                  apiStatus === 'connected'
                    ? 'service-ready'
                    : 'service-muted'
                }
              >
                {apiStatus === 'connected'
                  ? 'Connected'
                  : apiStatus === 'checking'
                    ? 'Checking'
                    : 'Unavailable'}
              </strong>
            </div>

            <div className="status-row">
              <span>Database</span>

              <strong
                className={
                  apiStatus === 'connected'
                    ? 'service-ready'
                    : 'service-muted'
                }
              >
                {apiStatus === 'connected'
                  ? 'Connected'
                  : apiStatus === 'checking'
                    ? 'Checking'
                    : 'Unavailable'}
              </strong>
            </div>

            <div className="status-row">
              <span>AI Content Engine</span>

              <strong className="service-ready">
                Ready
              </strong>
            </div>

            <div className="status-row">
              <span>Media Processing</span>

              <strong className="service-ready">
                Ready
              </strong>
            </div>
          </div>
        </div>
      </section>
    </>
  )

  const renderCreate = () => (
    <section className="workspace-page">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">
            CONTENT CREATION
          </p>

          <h1>Create Content</h1>

          <p className="page-description">
            Create a content asset and save it as a
            DiraFlow draft.
          </p>
        </div>

        <button
          className="secondary-button"
          onClick={() =>
            handleNavigation('Projects')
          }
        >
          Open Command Center
        </button>
      </div>

      <form
        className="content-form-panel"
        onSubmit={handleCreateContent}
      >
        <div className="form-section">
          <div className="form-section-heading">
            <h2>Content details</h2>

            <p>
              Define the content asset before it
              enters the production workflow.
            </p>
          </div>

          <div className="form-grid">
            <label className="field field-wide">
              <span>Title</span>

              <input
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="e.g. Q4 Business Growth Presentation"
                required
              />
            </label>

            <label className="field">
              <span>Content type</span>

              <select
                value={form.type}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    type: event.target.value,
                  }))
                }
              >
                {contentTypes.map((type) => (
                  <option
                    key={type}
                    value={type}
                  >
                    {formatType(type)}
                  </option>
                ))}
              </select>
            </label>

            <label className="field field-wide">
              <span>Description</span>

              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description:
                      event.target.value,
                  }))
                }
                placeholder="Briefly describe the purpose of this content."
                rows={4}
              />
            </label>

            <label className="field field-wide">
              <span>
                Content body / script
              </span>

              <textarea
                value={form.body}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    body: event.target.value,
                  }))
                }
                placeholder="Enter the initial content, script, briefing or production notes..."
                rows={12}
              />
            </label>
          </div>
        </div>

        {formMessage && (
          <div className="form-alert form-alert-success">
            {formMessage}
          </div>
        )}

        {formError && (
          <div className="form-alert form-alert-error">
            {formError}
          </div>
        )}

        <div className="form-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={resetCreateForm}
          >
            Clear
          </button>

          <button
            type="submit"
            className="primary-button"
            disabled={formSaving}
          >
            {formSaving
              ? 'Creating...'
              : 'Save as Draft'}
          </button>
        </div>
      </form>
    </section>
  )

  const renderAIPresenter = () => {
    const stages = [
      {
        number: 1,
        title: 'Presenter',
        subtitle: 'Choose your persona',
      },
      {
        number: 2,
        title: 'Voice',
        subtitle: 'Select approved voice',
      },
      {
        number: 3,
        title: 'Script',
        subtitle: 'Create your message',
      },
      {
        number: 4,
        title: 'Production',
        subtitle: 'Configure & preview',
      },
    ]

    return (
      <section className="workspace-page presenter-studio">
        <style>{presenterStyles}</style>

        <div className="presenter-hero">
          <div className="presenter-hero-copy">
            <p className="eyebrow">
              AI MEDIA PRODUCTION
            </p>

            <h1>AI Presenter Studio</h1>

            <p className="presenter-hero-text">
              Create professional AI-powered presentations
              by combining a validated presenter persona,
              approved voice, intelligent script and
              production settings.
            </p>
          </div>

          <div className="presenter-readiness">
            <span className="presenter-readiness-label">
              Production status
            </span>

            <div className="presenter-readiness-value">
              <span className="presenter-readiness-dot" />

              {presenterReady
                ? 'Ready for production'
                : 'Configuration in progress'}
            </div>
          </div>
        </div>

        <div className="presenter-stepper">
          {stages.map((stage) => (
            <button
              key={stage.number}
              className={`presenter-step ${
                presenterStage === stage.number
                  ? 'active'
                  : ''
              } ${
                presenterStage > stage.number
                  ? 'complete'
                  : ''
              }`}
              onClick={() =>
                setPresenterStage(stage.number)
              }
            >
              <span className="presenter-step-number">
                {presenterStage > stage.number
                  ? '?'
                  : stage.number}
              </span>

              <span className="presenter-step-copy">
                <strong>{stage.title}</strong>
                <span>{stage.subtitle}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="presenter-workspace">
          <div className="presenter-main-panel">
            {presenterStage === 1 && (
              <>
                <div className="presenter-panel-heading">
                  <h2>Choose your presenter</h2>

                  <p>
                    Select the persona that will deliver
                    your presentation. System presenters
                    are available for immediate use.
                  </p>
                </div>

                <div className="presenter-option-grid">
                  {presenterOptions.map((presenter) => (
                    <button
                      key={presenter.id}
                      className={`presenter-option-card ${
                        selectedPresenter.id ===
                        presenter.id
                          ? 'selected'
                          : ''
                      }`}
                      onClick={() =>
                        setSelectedPresenter(
                          presenter
                        )
                      }
                    >
                      <div className="presenter-avatar">
                        {presenter.initials}
                      </div>

                      <div className="presenter-option-content">
                        <h3>
                          {presenter.name}
                        </h3>

                        <span className="presenter-option-role">
                          {presenter.role}
                        </span>

                        <p>
                          {presenter.description}
                        </p>

                        <span className="presenter-category">
                          {presenter.category}
                        </span>
                      </div>

                      {selectedPresenter.id ===
                        presenter.id && (
                        <span className="presenter-selected-check">ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ</span>
                      )}
                    </button>
                  ))}
                </div>

                <div className="production-actions">
                  <span className="presenter-footer-note">
                    Persona validation will be connected
                    to the production service in the next
                    backend phase.
                  </span>

                  <button
                    className="primary-button"
                    onClick={() =>
                      setPresenterStage(2)
                    }
                  >
                    Continue to Voice ?
                  </button>
                </div>
              </>
            )}

            {presenterStage === 2 && (
              <>
                <div className="presenter-panel-heading">
                  <h2>Select an approved voice</h2>

                  <p>
                    Choose the voice that will deliver
                    your selected presenter persona.
                  </p>
                </div>

                <div className="voice-preview-settings">
                  <div className="voice-preview-setting">
                    <label htmlFor="voice-preview-language">
                      Preview language
                    </label>
                    <select
                      id="voice-preview-language"
                      value={previewLanguage}
                      onChange={(event) => {
                        const language = event.target.value
                        setPreviewLanguage(language)
                        setPreviewSpeed(
                          String(previewLanguageSettings[language]?.speed ?? 1)
                        )
                      }}
                    >
                      {Object.keys(previewLanguageSettings).map((language) => (
                        <option key={language} value={language}>
                          {language}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="voice-preview-setting">
                    <label htmlFor="voice-preview-speed">
                      Speaking speed
                    </label>
                    <select
                      id="voice-preview-speed"
                      value={previewSpeed}
                      onChange={(event) => setPreviewSpeed(event.target.value)}
                    >
                      <option value="0.7">Extra slow ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â 0.70ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â</option>
                      <option value="0.75">Slow ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â 0.75ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â</option>
                      <option value="0.8">Gentle ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â 0.80ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â</option>
                      <option value="0.85">Measured ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â 0.85ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â</option>
                      <option value="0.9">Steady ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â 0.90ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â</option>
                      <option value="1">Normal ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â 1.00ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â</option>
                      <option value="1.1">Fast ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â 1.10ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â</option>
                    </select>
                  </div>
                </div>
                <div className="voice-grid">
  {voiceOptions.map((voice) => (
    <div
      key={voice.id}
      className={`voice-card ${
        selectedVoice.id === voice.id ? 'selected' : ''
      }`}
      onClick={() => setSelectedVoice(voice)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          setSelectedVoice(voice)
        }
      }}
    >
      <div className="voice-selection-indicator" aria-hidden="true">{selectedVoice.id === voice.id ? 'Selected' : ''}</div>

      <div className="voice-copy">
        <strong>
          {voice.name}
        </strong>

        <span>
          {voice.language} | {voice.accent}
        </span>

        <span>
          {voice.style} | {voice.gender}
        </span>
      </div>

      <button
        type="button"
        className="voice-preview"
        onClick={(event) => {
          event.stopPropagation()
          previewVoice(voice)
        }}
        title={`${previewingVoiceId === voice.id ? 'Stop' : 'View'} preview for ${voice.name}`}
        aria-label={`${previewingVoiceId === voice.id ? 'Stop' : 'View'} preview for ${voice.name}`}
      >
        <span className="voice-preview-icon" aria-hidden="true">
          {previewingVoiceId === voice.id ? 'ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ' : 'ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¶'}
        </span>
        <span>
          {previewingVoiceId === voice.id ? 'Stop preview' : 'View preview'}
        </span>
      </button>
    </div>
  ))}
</div>

<div className="production-actions">
                  <button
                    className="secondary-button"
                    onClick={() =>
                      setPresenterStage(1)
                    }
                  >
                    Back
                  </button>

                  <button
                    className="primary-button"
                    onClick={() =>
                      setPresenterStage(3)
                    }
                  >
                    Continue to Script
                  </button>
                </div>
              </>
            )}

            {presenterStage === 3 && (
              <>
                <div className="presenter-panel-heading">
                  <h2>Script Studio</h2>

                  <p>
                    Define the message, audience and tone
                    before sending it to the production
                    engine.
                  </p>
                </div>

                <div className="script-document-upload">
                  <label htmlFor="script-document-file">Upload a script document</label>
                  <p>Word (.docx), PDF (.pdf) or plain text (.txt). Maximum file size: 50 MB.</p>
                  <input
                    id="script-document-file"
                    type="file"
                    accept=".docx,.pdf,.txt"
                    disabled={scriptUploadLoading}
                    onChange={handleScriptDocumentUpload}
                  />
                  {scriptUploadLoading && (
                    <p role="status">{scriptUploadMessage}</p>
                  )}
                  {scriptUploadError && (
                    <p className="script-upload-error" role="alert">{scriptUploadError}</p>
                  )}
                  {!scriptUploadLoading && scriptUploadMessage && (
                    <p className="script-upload-message" role="status">{scriptUploadMessage}</p>
                  )}

                  {pendingExtractedScript && (
                    <div className="script-extraction-review">
                      <h3>Review extracted script</h3>
                      <p>
                        File: {pendingExtractedScript.fileName}
                        {' ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· '}
                        {pendingExtractedScript.wordCount ?? pendingExtractedScript.text.trim().split(/\s+/).filter(Boolean).length} words
                      </p>
                      <textarea
                        aria-label="Review and edit extracted script before replacing the current script"
                        value={pendingExtractedScript.text}
                        onChange={(event) =>
                          setPendingExtractedScript((current) =>
                            current ? { ...current, text: event.target.value } : current
                          )
                        }
                        rows={10}
                      />
                      <div className="script-upload-actions">
                        <button type="button" onClick={applyExtractedScript}>
                          Replace current script
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPendingExtractedScript(null)
                            setScriptUploadMessage('Import cancelled. Your current script was kept.')
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="script-layout">
                  <div>
                    <textarea
                      className="script-editor"
                      value={script}
                      onChange={(event) =>
                        setScript(
                          event.target.value
                        )
                      }
                      placeholder="Write your presentation script..."
                    />

                    <div className="script-meta">
                      <span>
                        {
                          script
                            .trim()
                            .split(/\s+/)
                            .filter(Boolean)
                            .length
                        }{' '}
                        words
                      </span>

                      <span>
                        Estimated duration:{' '}
                        {estimatedDuration}
                      </span>
                    </div>
                  </div>

                  <div className="script-controls">
                    <div className="presenter-field">
                      <label>
                        Presentation objective
                      </label>

                      <select
                        value={scriptObjective}
                        onChange={(event) =>
                          setScriptObjective(
                            event.target.value
                          )
                        }
                      >
                        <option>
                          Business presentation
                        </option>

                        <option>
                          Product introduction
                        </option>

                        <option>
                          Marketing campaign
                        </option>

                        <option>
                          Executive announcement
                        </option>

                        <option>
                          Educational briefing
                        </option>

                        <option>
                          News presentation
                        </option>
                      </select>
                    </div>

                    <div className="presenter-field">
                      <label>
                        Target audience
                      </label>

                      <input
                        value={scriptAudience}
                        onChange={(event) =>
                          setScriptAudience(
                            event.target.value
                          )
                        }
                      />
                    </div>

                    <div className="presenter-field">
                      <label>
                        Tone
                      </label>

                      <select
                        value={scriptTone}
                        onChange={(event) =>
                          setScriptTone(
                            event.target.value
                          )
                        }
                      >
                        <option>
                          Professional
                        </option>

                        <option>
                          Executive
                        </option>

                        <option>
                          Conversational
                        </option>

                        <option>
                          Persuasive
                        </option>

                        <option>
                          Educational
                        </option>

                        <option>
                          News
                        </option>
                      </select>
                    </div>

                    <button
                      className="ai-script-button"
                      onClick={
                        generateStarterScript
                      }
                      disabled={
                        isGeneratingScript
                      }
                    >
                      {isGeneratingScript
                        ? 'Preparing AI script...'
                        : '? Generate / Refine with AI'}
                    </button>
                  </div>
                </div>

                <div className="production-actions">
                  <button
                    className="secondary-button"
                    onClick={() =>
                      setPresenterStage(2)
                    }
                  >
                    Back
                  </button>

                  <button
                    className="primary-button"
                    disabled={
                      script.trim().length < 20
                    }
                    onClick={() =>
                      setPresenterStage(4)
                    }
                  >
                    Continue to Production ?
                  </button>
                </div>
              </>
            )}

            {presenterStage === 4 && !generationStarted && (
              <>
                <div className="presenter-panel-heading">
                  <h2>Production settings</h2>

                  <p>
                    Configure how DiraFlow should compose
                    the final presentation.
                  </p>
                </div>

                <div className="production-grid">
                  <div className="production-option">
                    <span className="production-option-label">
                      Delivery format
                    </span>

                    <div className="production-choice-group">
                      <button
                        className={`production-choice ${
                          productionMode === 'VIDEO'
                            ? 'selected'
                            : ''
                        }`}
                        onClick={() =>
                          setProductionMode(
                            'VIDEO'
                          )
                        }
                      >
                        <strong>
                          Video
                        </strong>

                        <span>
                          Presenter + voice + visual
                        </span>
                      </button>

                      <button
                        className={`production-choice ${
                          productionMode ===
                          'AUDIO'
                            ? 'selected'
                            : ''
                        }`}
                        onClick={() =>
                          setProductionMode(
                            'AUDIO'
                          )
                        }
                      >
                        <strong>
                          Audio Only
                        </strong>

                        <span>
                          Voice presentation
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="production-option">
                    <span className="production-option-label">
                      Aspect ratio
                    </span>

                    <select
                      value={aspectRatio}
                      onChange={(event) =>
                        setAspectRatio(
                          event.target.value
                        )
                      }
                    >
                      <option value="16:9">
                        16:9 | Landscape
                      </option>

                      <option value="9:16">
                        9:16 | Vertical
                      </option>

                      <option value="1:1">
                        1:1 | Square
                      </option>
                    </select>
                  </div>

                  <div className="production-option">
                    <span className="production-option-label">
                      Background
                    </span>

                    <select
                      value={background}
                      onChange={(event) =>
                        setBackground(
                          event.target.value
                        )
                      }
                    >
                      <option>
                        DiraFlow Professional
                      </option>

                      <option>
                        Executive Studio
                      </option>

                      <option>
                        News Studio
                      </option>

                      <option>
                        Clean Corporate
                      </option>

                      <option>
                        Custom Brand Background
                      </option>
                    </select>
                  </div>

                  <div className="production-option">
                    <span className="production-option-label">
                      Captions
                    </span>

                    <div className="production-choice-group">
                      <button
                        className={`production-choice ${
                          captions
                            ? 'selected'
                            : ''
                        }`}
                        onClick={() =>
                          setCaptions(true)
                        }
                      >
                        <strong>
                          Enabled
                        </strong>

                        <span>
                          Include captions
                        </span>
                      </button>

                      <button
                        className={`production-choice ${
                          !captions
                            ? 'selected'
                            : ''
                        }`}
                        onClick={() =>
                          setCaptions(false)
                        }
                      >
                        <strong>
                          Disabled
                        </strong>

                        <span>
                          No captions
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="production-actions">
                  <button
                    className="secondary-button"
                    onClick={() =>
                      setPresenterStage(3)
                    }
                  >
                    Back
                  </button>

                  <button
                    className="primary-button"
                    disabled={!presenterReady}
                    onClick={() =>
                      setGenerationStarted(
                        true
                      )
                    }
                  >
                    Preview Presentation ?
                  </button>
                </div>
              </>
            )}

            {presenterStage === 4 && generationStarted && (
              <>
                <div className="presenter-panel-heading">
                  <h2>Production preview</h2>

                  <p>
                    Review the presentation configuration
                    before the generation service is invoked.
                  </p>
                </div>

                <div className="presenter-preview">
                  <div className="preview-stage">
                    <div className="preview-presenter">
                      {selectedPresenter.initials}
                    </div>

                    <div className="preview-overlay">
                      <div className="preview-title">
                        <strong>
                          {selectedPresenter.name}
                        </strong>

                        <span>
                          {selectedVoice.name} |{' '}
                          {estimatedDuration}
                        </span>
                      </div>

                      <span className="preview-format">
                        {productionMode} |{' '}
                        {aspectRatio}
                      </span>
                    </div>
                  </div>

                  <div className="preview-checklist">
                    <h3>
                      Production checklist
                    </h3>

                    <div className="preview-check">
                      <span className="preview-check-mark">ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ</span>

                      <div>
                        <strong>
                          Presenter selected
                        </strong>

                        <span>
                          {selectedPresenter.name}
                        </span>
                      </div>
                    </div>

                    <div className="preview-check">
                      <span className="preview-check-mark">ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ</span>

                      <div>
                        <strong>
                          Voice selected
                        </strong>

                        <span>
                          {selectedVoice.name}
                        </span>
                      </div>
                    </div>

                    <div className="preview-check">
                      <span className="preview-check-mark">ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ</span>

                      <div>
                        <strong>
                          Script ready
                        </strong>

                        <span>
                          {estimatedDuration}
                          {' '}estimated
                        </span>
                      </div>
                    </div>

                    <div className="preview-check">
                      <span className="preview-check-mark">ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ</span>

                      <div>
                        <strong>
                          Production configured
                        </strong>

                        <span>
                          {background}
                        </span>
                      </div>
                    </div>

                    <button
                      className="generate-button"
                      onClick={() => {
                        alert(
                          'Production configuration is ready. The AI video generation service will be connected in the next production backend phase.'
                        )
                      }}
                    >
                      Generate Presentation
                    </button>
                  </div>
                </div>

                <div className="production-actions">
                  <button
                    className="secondary-button"
                    onClick={() =>
                      setGenerationStarted(
                        false
                      )
                    }
                  >
                    Back to Editing
                  </button>

                  <span className="presenter-footer-note">
                    Generation endpoint will be connected
                    after the production data model and
                    media provider adapter are implemented.
                  </span>
                </div>
              </>
            )}
          </div>

          <aside className="presenter-summary-panel">
            <div className="presenter-summary-heading">
              <h3>Production summary</h3>

              <span className="ready-badge">
                {presenterReady
                  ? 'Ready'
                  : 'Building'}
              </span>
            </div>

            <div className="summary-preview">
              <div className="summary-presenter">
                {selectedPresenter.initials}
              </div>
            </div>

            <div className="summary-list">
              <div className="summary-row">
                <span>Presenter</span>

                <strong>
                  {selectedPresenter.name}
                </strong>
              </div>

              <div className="summary-row">
                <span>Voice</span>

                <strong>
                  {selectedVoice.name}
                </strong>
              </div>

              <div className="summary-row">
                <span>Objective</span>

                <strong>
                  {scriptObjective}
                </strong>
              </div>

              <div className="summary-row">
                <span>Duration</span>

                <strong>
                  {estimatedDuration}
                </strong>
              </div>

              <div className="summary-row">
                <span>Format</span>

                <strong>
                  {productionMode}
                </strong>
              </div>

              <div className="summary-row">
                <span>Aspect</span>

                <strong>
                  {aspectRatio}
                </strong>
              </div>
            </div>

            <div className="production-ready-box">
              <strong>
                Production configuration
              </strong>

              <span>
                Presenter, voice, script and visual
                settings are assembled into a single
                production specification.
              </span>
            </div>

            {presenterStage !== 4 && (
              <button
                className="generate-button"
                onClick={() =>
                  setPresenterStage(
                    presenterStage + 1
                  )
                }
              >
                Continue
              </button>
            )}

            <p className="presenter-footer-note">
              DiraFlow MediaAI production pipeline
            </p>
          </aside>
        </div>
      </section>
    )
  }

  const renderContentCenter = () => (
    <section className="workspace-page">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">
            CONTENT COMMAND CENTER
          </p>

          <h1>Content</h1>

          <p className="page-description">
            Manage the complete content lifecycle
            from draft to publication.
          </p>
        </div>

        {canCreateContent && (
        <button
          className="primary-button"
          onClick={() =>
            handleNavigation('Create')
          }
        >
          <span>+</span>
          Create Content
        </button>
        )}
      </div>

      <section className="metric-grid">
        <MetricCard
          label="Total"
          value={statistics.total}
          icon="ALL"
        />

        <MetricCard
          label="Draft"
          value={statistics.drafts}
          icon="DR"
        />

        <MetricCard
          label="In Review"
          value={statistics.inReview}
          icon="RV"
        />

        <MetricCard
          label="Approved"
          value={statistics.approved}
          icon="ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“"
        />

        <MetricCard
          label="Published"
          value={statistics.published}
          icon="PB"
        />
      </section>

      <div className="content-toolbar">
        <div className="search-box">
          <span>&#8981;</span>

          <input
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(event.target.value)
            }
            placeholder="Search content..."
          />
        </div>

        <select
          className="filter-select"
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value)
          }
        >
          {statusFilters.map((status) => (
            <option
              key={status}
              value={status}
            >
              {status === 'ALL'
                ? 'All statuses'
                : statusLabels[status]}
            </option>
          ))}
        </select>

        <select
          className="filter-select"
          value={typeFilter}
          onChange={(event) =>
            setTypeFilter(event.target.value)
          }
        >
          <option value="ALL">
            All types
          </option>

          {contentTypes.map((type) => (
            <option
              key={type}
              value={type}
            >
              {formatType(type)}
            </option>
          ))}
        </select>

        <button
          className="refresh-button"
          onClick={loadContent}
          disabled={contentLoading}
          title="Refresh content"
        >
          ?
        </button>
      </div>

      {contentError && (
        <div className="content-error">
          <div>
            <strong>
              Unable to load content
            </strong>

            <span>{contentError}</span>
          </div>

          <button
            className="secondary-button"
            onClick={loadContent}
          >
            Retry
          </button>
        </div>
      )}

      <div className="content-command-layout">
        <div className="content-table-panel">
          <div className="panel-heading">
            <div>
              <h2>Content Library</h2>

              <p>
                {filteredContent.length} content
                {filteredContent.length === 1
                  ? ''
                  : 's'} shown
              </p>
            </div>
          </div>

          {contentLoading ? (
            <div className="table-state">
              <div className="loading-spinner" />
              <span>
                Loading content...
              </span>
            </div>
          ) : filteredContent.length === 0 ? (
            <div className="table-state">
              <div className="empty-icon">CD</div>

              <h3>
                {content.length === 0
                  ? 'No content created yet'
                  : 'No matching content'}
              </h3>

              <p>
                {content.length === 0
                  ? 'Create your first content asset to begin the production lifecycle.'
                  : 'Try adjusting your search or filters.'}
              </p>

              {content.length === 0 && canCreateContent && (
                <button
                  className="primary-button"
                  onClick={() =>
                    handleNavigation('Create')
                  }
                >
                  <span>+</span>
                  Create Content
                </button>
              )}
            </div>
          ) : (
            <div className="content-table-wrapper">
              <table className="content-table">
                <thead>
                  <tr>
                    <th>Content</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Created by</th>
                    <th>Updated</th>
                    <th />
                  </tr>
                </thead>

                <tbody>
                  {filteredContent.map(
                    (item) => (
                      <tr
                        key={item.id}
                        className={
                          selectedContent?.id ===
                          item.id
                            ? 'selected-row'
                            : ''
                        }
                        onClick={() =>
                          setSelectedContent(
                            item
                          )
                        }
                      >
                        <td>
                          <div className="content-title-cell">
                            <strong>
                              {item.title}
                            </strong>

                            <span>
                              {item.description ||
                                'No description'}
                            </span>
                          </div>
                        </td>

                        <td>
                          <TypeBadge
                            type={item.type}
                          />
                        </td>

                        <td>
                          <StatusBadge
                            status={item.status}
                          />
                        </td>

                        <td>
                          <div className="creator-cell">
                            <div className="mini-avatar">
                              {(
                                item.createdBy
                                  ?.firstName?.[0] ||
                                'U'
                              ).toUpperCase()}
                              {(
                                item.createdBy
                                  ?.lastName?.[0] ||
                                ''
                              ).toUpperCase()}
                            </div>

                            <span>
                              {item.createdBy
                                ? `${item.createdBy.firstName} ${item.createdBy.lastName}`
                                : 'Unknown'}
                            </span>
                          </div>
                        </td>

                        <td className="date-cell">
                          {formatDate(
                            item.updatedAt
                          )}
                        </td>

                        <td>
                          <button
                            className="row-open-button"
                            onClick={(event) => {
                              event.stopPropagation()
                              setSelectedContent(
                                item
                              )
                            }}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <ContentDetailPanel
          content={selectedContent}
          currentUser={currentUser}
          onClose={() =>
            setSelectedContent(null)
          }
          onAction={performContentAction}
        />
      </div>
    </section>
  )

  const renderDistributionWorkspace = () => {
    const eligibleContent = content.filter(
      (item) => item.status === 'APPROVED'
    )

    const platformOptions = [
      'LinkedIn',
      'Facebook',
      'Instagram',
      'YouTube',
      'TikTok',
      'X',
      'WhatsApp Business',
    ]

    const toggleDistributionPlatform = (platform) => {
      setDistributionPlatforms((current) =>
        current.includes(platform)
          ? current.filter((item) => item !== platform)
          : [...current, platform]
      )
    }

    const validateDistributionPlan = () => {
      setDistributionError('')
      setDistributionFeedback('')

      if (distributionSubmitting) return

      if (!distributionContentId) {
        setDistributionError('Select approved content first.')
        return
      }

      const selectedContent = eligibleContent.find(
        (item) => String(item.id) === String(distributionContentId)
      )

      if (!selectedContent) {
        setDistributionError('The selected content is not approved or is no longer available. Refresh your content and try again.')
        return
      }

      if (distributionPlatforms.length === 0) {
        setDistributionError('Select at least one intended destination.')
        return
      }

      if (distributionMode === 'SCHEDULE') {
        if (!distributionDate || !distributionTime) {
          setDistributionError('Choose a future date and time for scheduled distribution.')
          return
        }

        let scheduledAt
        try {
          scheduledAt = zonedDateTimeToIso(
            distributionDate,
            distributionTime,
            distributionTimezone
          )
        } catch (error) {
          setDistributionError(error.message || 'Unable to interpret the selected timezone.')
          return
        }

        if (new Date(scheduledAt) <= new Date()) {
          setDistributionError('The scheduled date and time must be in the future.')
          return
        }

        const repeatCount = Number(distributionRepeatCount)
        if (!Number.isInteger(repeatCount) || repeatCount < 1 || repeatCount > 30) {
          setDistributionError('Number of publications must be a whole number between 1 and 30.')
          return
        }
      }

      const platformIds = {
        'LinkedIn': 'linkedin',
        'Facebook': 'facebook',
        'Instagram': 'instagram',
        'YouTube': 'youtube',
        'TikTok': 'tiktok',
        'X': 'x',
        'WhatsApp Business': 'whatsapp_business',
      }

      const mappedPlatforms = distributionPlatforms.map(
        (platform) => platformIds[platform]
      )

      if (mappedPlatforms.some((platform) => !platform)) {
        setDistributionError('One or more selected destinations could not be mapped to a supported platform identifier.')
        return
      }

      setDistributionFeedback(
        'Validation passed. Your plan has not been queued or published.'
      )
    }

    const submitDistributionPlan = async (event) => {
      event.preventDefault()
      if (distributionSubmitting) return

      setDistributionFeedback('')
      setDistributionError('')

      if (!distributionContentId) {
        setDistributionError('Select approved content first.')
        return
      }

      const selectedContent = eligibleContent.find(
        (item) => String(item.id) === String(distributionContentId)
      )

      if (!selectedContent) {
        setDistributionError('The selected content is not approved or is no longer available. Refresh your content and try again.')
        return
      }

      if (distributionPlatforms.length === 0) {
        setDistributionError('Select at least one intended destination.')
        return
      }

      let scheduledAt
      let repeatInterval = 'NONE'
      let repeatCount = 1

      if (distributionMode === 'SCHEDULE') {
        if (!distributionDate || !distributionTime) {
          setDistributionError('Choose a future date and time for scheduled distribution.')
          return
        }

        try {
          scheduledAt = zonedDateTimeToIso(
            distributionDate,
            distributionTime,
            distributionTimezone
          )
        } catch (error) {
          setDistributionError(error.message || 'Unable to interpret the selected timezone.')
          return
        }

        if (new Date(scheduledAt) <= new Date()) {
          setDistributionError('The scheduled date and time must be in the future.')
          return
        }

        repeatInterval = distributionRepeatInterval
        repeatCount = Number(distributionRepeatCount)

        if (!Number.isInteger(repeatCount) || repeatCount < 1 || repeatCount > 30) {
          setDistributionError('Number of publications must be a whole number between 1 and 30.')
          return
        }

        if (repeatInterval === 'NONE') {
          repeatCount = 1
        }
      }

      const platformIds = {
        'LinkedIn': 'linkedin',
        'Facebook': 'facebook',
        'Instagram': 'instagram',
        'YouTube': 'youtube',
        'TikTok': 'tiktok',
        'X': 'x',
        'WhatsApp Business': 'whatsapp_business',
      }

      const payload = {
        contentId: distributionContentId,
        platforms: distributionPlatforms.map((platform) => platformIds[platform]),
        timezone: distributionTimezone,
        repeatInterval,
        repeatCount,
        ...(scheduledAt ? { scheduledAt } : {}),
      }

      if (payload.platforms.some((platform) => !platform)) {
        setDistributionError('One or more selected destinations could not be mapped to a supported platform identifier.')
        return
      }

      setDistributionSubmitting(true)

      try {
        const response = await apiRequest('/api/distribution', {
          method: 'POST',
          body: JSON.stringify(payload),
        })

        if (!response?.success || !response?.data) {
          throw new Error(response?.message || 'The server did not confirm that the plan was queued.')
        }

        setDistributionFeedback(
          'Plan queued in DiraFlow. External publishing is not connected, so no social post has been published.'
        )

        await loadDistributionPlans()
      } catch (error) {
        setDistributionError(
          error.message || 'Unable to queue this distribution plan. Please try again.'
        )
      } finally {
        setDistributionSubmitting(false)
      }
    }
    return (
      <>
      <section className="workspace-page distribution-workspace">
        <div className="workspace-heading">
          <p className="eyebrow">DIRAFLOW MEDIAAI ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· DISTRIBUTION</p>
          <h1>Distribution Agent</h1>
          <p>
            Prepare approved content for immediate or scheduled distribution across your selected channels.
          </p>
        </div>

        <div className="distribution-status-note" role="status">
          <strong>Queue connected Ã¢â‚¬â€ external publishing not connected</strong>
          <span>
            Plans can be saved to the DiraFlow queue. Publishing to external platforms requires authorised integrations and is not performed by this form.
          </span>
        </div>

        <form className="distribution-form" onSubmit={submitDistributionPlan}>
          <div className="distribution-section">
            <h2>1. Select content</h2>
            <label htmlFor="distribution-content">Approved content</label>
            <select
              id="distribution-content"
              value={distributionContentId}
              onChange={(event) => setDistributionContentId(event.target.value)}
              required
            >
              <option value="">Choose approved content</option>
              {eligibleContent.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title} ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· {item.status}
                </option>
              ))}
            </select>
            {eligibleContent.length === 0 && (
              <p className="distribution-help">
                No approved content is available. Submit content for review and approval in Projects first.
              </p>
            )}
          </div>

          <div className="distribution-section">
            <h2>2. Choose publication timing</h2>
            <div className="distribution-mode-options">
              <label className={distributionMode === 'NOW' ? 'distribution-mode selected' : 'distribution-mode'}>
                <input
                  type="radio"
                  name="distribution-mode"
                  value="NOW"
                  checked={distributionMode === 'NOW'}
                  onChange={() => setDistributionMode('NOW')}
                />
                <span>
                  <strong>Publish immediately</strong>
                  <small>Prepare the content for immediate distribution.</small>
                </span>
              </label>
              <label className={distributionMode === 'SCHEDULE' ? 'distribution-mode selected' : 'distribution-mode'}>
                <input
                  type="radio"
                  name="distribution-mode"
                  value="SCHEDULE"
                  checked={distributionMode === 'SCHEDULE'}
                  onChange={() => setDistributionMode('SCHEDULE')}
                />
                <span>
                  <strong>Schedule for later</strong>
                  <small>Choose a future date, time, and repeat pattern.</small>
                </span>
              </label>
            </div>

            {distributionMode === 'SCHEDULE' && (
              <>
                <div className="distribution-fields">
                  <div>
                    <label htmlFor="distribution-date">Publication date</label>
                    <input
                      id="distribution-date"
                      type="date"
                      min={new Date().toLocaleDateString('en-CA')}
                      value={distributionDate}
                      onChange={(event) => setDistributionDate(event.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="distribution-time">Publication time</label>
                    <input
                      id="distribution-time"
                      type="time"
                      value={distributionTime}
                      onChange={(event) => setDistributionTime(event.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="distribution-timezone">Timezone</label>
                    <select
                      id="distribution-timezone"
                      value={distributionTimezone}
                      onChange={(event) => setDistributionTimezone(event.target.value)}
                    >
                      <option value="Africa/Lagos">Africa/Lagos (WAT)</option>
                      <option value="Europe/London">Europe/London</option>
                      <option value="America/New_York">America/New_York</option>
                      <option value="America/Chicago">America/Chicago</option>
                      <option value="America/Toronto">America/Toronto</option>
                      <option value="Europe/Paris">Europe/Paris</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>
                </div>

                <div className="distribution-fields">
                  <div>
                    <label htmlFor="distribution-repeat-interval">Repeat interval</label>
                    <select
                      id="distribution-repeat-interval"
                      value={distributionRepeatInterval}
                      onChange={(event) => setDistributionRepeatInterval(event.target.value)}
                    >
                      <option value="NONE">Do not repeat</option>
                      <option value="DAY">Every day</option>
                      <option value="WEEK">Every week</option>
                      <option value="MONTH">Every month</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="distribution-repeat-count">Number of publications</label>
                    <input
                      id="distribution-repeat-count"
                      type="number"
                      min="1"
                      max="30"
                      value={distributionRepeatCount}
                      onChange={(event) => setDistributionRepeatCount(event.target.value)}
                      disabled={distributionRepeatInterval === 'NONE'}
                    />
                  </div>
                </div>
                <p className="distribution-help">
                  Recurring occurrences are stored as queued deliveries. External publishing remains disconnected.
                </p>
              </>
            )}
          </div>

          <div className="distribution-section">
            <h2>3. Select destinations</h2>
            <p className="distribution-help">
              Select the platforms you intend to use. Each requires an authorised connection before publishing can work.
            </p>
            <div className="distribution-platform-grid">
              {platformOptions.map((platform) => (
                <label key={platform} className="distribution-platform-option">
                  <input
                    type="checkbox"
                    checked={distributionPlatforms.includes(platform)}
                    onChange={() => toggleDistributionPlatform(platform)}
                  />
                  <span>{platform}</span>
                  <small>Not connected</small>
                </label>
              ))}
            </div>
          </div>

          {distributionError && (
            <p className="distribution-feedback error" role="alert">{distributionError}</p>
          )}
          {distributionFeedback && (
            <p className="distribution-feedback success" role="status">{distributionFeedback}</p>
          )}

          <div className="distribution-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={validateDistributionPlan}
              disabled={distributionSubmitting}
            >
              Validate distribution plan
            </button>
            <button
              type="submit"
              className="primary-button"
              disabled={distributionSubmitting}
            >
              {distributionSubmitting ? 'Queuing plan...' : 'Queue distribution plan'}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setDistributionContentId('')
                setDistributionDate('')
                setDistributionTime('09:00')
                setDistributionTimezone('Africa/Lagos')
                setDistributionRepeatInterval('WEEK')
                setDistributionRepeatCount('1')
                setDistributionPlatforms([])
                setDistributionError('')
                setDistributionFeedback('')
              }}
            >
              Clear selections
            </button>
          </div>
        </form>
      </section>
        <section className="distribution-saved-plans" aria-labelledby="distribution-saved-plans-title">
          <div className="distribution-plans-heading">
            <div>
              <h2 id="distribution-saved-plans-title">Saved distribution plans</h2>
              <p className="distribution-help">
                Review queued plans and individual destination delivery statuses. Queueing does not publish externally.
              </p>
            </div>
            <button
              type="button"
              className="secondary-button"
              onClick={loadDistributionPlans}
              disabled={distributionPlansLoading}
            >
              {distributionPlansLoading ? 'Refreshing...' : 'Refresh plans'}
            </button>
          </div>

          {distributionPlansError && (
            <p className="distribution-feedback error" role="alert">
              {distributionPlansError}
            </p>
          )}

          {distributionPlansLoading && distributionPlans.length === 0 && (
            <p className="distribution-help" role="status">Loading saved plans...</p>
          )}

          {!distributionPlansLoading && !distributionPlansError && distributionPlans.length === 0 && (
            <p className="distribution-plans-empty">
              No distribution plans found for this workspace yet. Queue an approved item above to see it here.
            </p>
          )}

          {distributionPlans.map((plan) => (
            <article className="distribution-plan-card" key={plan.id}>
              <div className="distribution-plan-heading">
                <div className="distribution-plan-title">
                  <h3>{plan.content?.title || 'Untitled content'}</h3>
                  <p>{plan.content?.type || 'Content'} Ã‚Â· Plan ID: {plan.id}</p>
                </div>
                <span className={`distribution-plan-status status-${String(plan.status || 'unknown').toLowerCase()}`}>
                  {String(plan.status || 'UNKNOWN').replaceAll('_', ' ')}
                </span>
              </div>

              <dl className="distribution-plan-details">
                <div>
                  <dt>Schedule</dt>
                  <dd>
                    {plan.scheduledAt
                      ? new Date(plan.scheduledAt).toLocaleString()
                      : 'Queued without a scheduled time'}
                  </dd>
                </div>
                <div>
                  <dt>Timezone</dt>
                  <dd>{plan.timezone || 'Not specified'}</dd>
                </div>
                <div>
                  <dt>Repeat</dt>
                  <dd>
                    {plan.repeatInterval && plan.repeatInterval !== 'NONE'
                      ? `${plan.repeatInterval} Ã‚Â· ${plan.repeatCount || 1} occurrence(s)`
                      : 'No repeat'}
                  </dd>
                </div>
              </dl>

              <div className="distribution-deliveries">
                <h4>Destination deliveries</h4>
                {Array.isArray(plan.deliveries) && plan.deliveries.length > 0 ? (
                  <ul>
                    {plan.deliveries.map((delivery) => (
                      <li key={delivery.id}>
                        <span>
                          {String(delivery.platform || 'Unknown platform').replaceAll('_', ' ')}
                          {delivery.occurrenceNumber
                            ? ` Ã‚Â· Occurrence ${delivery.occurrenceNumber}`
                            : ''}
                        </span>
                        <span className={`distribution-delivery-status status-${String(delivery.status || 'unknown').toLowerCase()}`}>
                          {String(delivery.status || 'UNKNOWN').replaceAll('_', ' ')}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="distribution-help">No delivery records are available for this plan.</p>
                )}
              </div>

              <p className="distribution-plan-notice">
                External publishing is not connected. Delivery status reflects the queue, not confirmation of a social post.
              </p>

              {plan.status === 'QUEUED' && (
                <div className="distribution-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => cancelDistributionPlan(plan.id)}
                    disabled={Boolean(distributionCancellingId)}
                  >
                    {distributionCancellingId === plan.id
                      ? 'Cancelling...'
                      : 'Cancel queued plan'}
                  </button>
                </div>
              )}
            </article>
          ))}
        </section>
      </>
    )
  }
  const renderMediaWorkspace = () => (
    <section className="workspace-page">
      <div className="workspace-heading">
        <p className="eyebrow">DIRAFLOW MEDIAAI</p>
        <h1>Media Library</h1>
        <p>Manage your uploaded images, audio, video and supporting documents in your current workspace.</p>
      </div>

      <section className="workspace-card">
        <h2>Upload media</h2>
        <p>Accepted formats include JPEG, PNG, WebP, GIF, MP4, WebM, MP3, MP4 audio, WAV, OGG, PDF and plain text. Maximum file size: 100 MB.</p>

        {canCreateContent ? (
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,audio/mpeg,audio/mp4,audio/wav,audio/ogg,application/pdf,text/plain"
            disabled={mediaUploading}
            onChange={handleMediaUpload}
          />
        ) : (
          <p>You do not have the content creation permission needed to upload or delete assets.</p>
        )}

        {mediaUploading && <p role="status">{mediaFeedback}</p>}
      </section>

      <section className="workspace-card" style={{ marginTop: 24 }}>
        <h2>Open an external YouTube video</h2>
        <p>
          Paste a YouTube video link to play it in Studio Theatre. The link is saved in this browser only;
          DiraFlow does not upload or download the YouTube video.
        </p>
        <form
          onSubmit={handleExternalVideoSubmit}
          style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}
        >
          <input
            type="url"
            value={externalVideoUrl}
            onChange={(event) => setExternalVideoUrl(event.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            aria-label="YouTube video URL"
            required
            style={{ flex: '1 1 320px', minWidth: 0 }}
          />
          <button type="submit" className="primary-button">
            Open in Studio Theatre
          </button>
        </form>
      </section>

      <VideoStudio
        assets={mediaAssets}
        canCreateContent={canCreateContent}
        apiRequest={apiRequest}
        apiBaseUrl={API_BASE_URL}
        getStoredToken={getStoredToken}
        onSaved={async (savedAsset) => {
          const refreshedAssets = await loadMediaAssets()
          const assetForPreview = refreshedAssets.find(
            (asset) => asset.id === savedAsset?.id
          )

          if (!assetForPreview) {
            throw new Error(
              'The video was uploaded, but it could not be found in the refreshed Media Library.'
            )
          }

          await handleMediaPreview(assetForPreview)
        }}
      />

      {mediaError && (
        <p className="workspace-feedback" role="alert">{mediaError}</p>
      )}

      {!mediaUploading && mediaFeedback && (
        <p className="workspace-feedback" role="status">{mediaFeedback}</p>
      )}

      <section className="workspace-card" style={{ marginTop: 24 }}>
        <div className="workspace-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h2>Workspace assets ({mediaAssets.length})</h2>
          <button
            type="button"
            className="secondary-button"
            disabled={mediaLoading}
            onClick={loadMediaAssets}
          >
            {mediaLoading ? 'Refreshing...' : 'Refresh library'}
          </button>
        </div>

        {mediaLoading && mediaAssets.length === 0 && <p>Loading media assets...</p>}

        {!mediaLoading && mediaAssets.length === 0 && (
          <div className="empty-state">
            <h3>Your media library is empty</h3>
            <p>Upload a supported file to start building your library.</p>
          </div>
        )}

        {mediaAssets.length > 0 && (
          <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
            {mediaAssets.map((asset) => (
              <article
                key={asset.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12,
                  padding: 14,
                  border: '1px solid var(--border-color, #dfe4ec)',
                  borderRadius: 12,
                }}
              >
                <div style={{ minWidth: 0, flex: '1 1 240px' }}>
                  <strong style={{ overflowWrap: 'anywhere' }}>{asset.originalFilename}</strong>
                  <p style={{ margin: '6px 0', color: 'var(--text-secondary, #687386)' }}>
                    {asset.mimeType} Ãƒâ€šÃ‚Â· {(Number(asset.sizeBytes) / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  <span>{asset.status}</span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {asset.status === 'AVAILABLE' && (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => handleMediaPreview(asset)}
                    >
                      Open / Preview
                    </button>
                  )}

                  {canCreateContent && ['AVAILABLE', 'PENDING_UPLOAD', 'FAILED'].includes(asset.status) && (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => handleMediaDelete(asset)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

    </section>
  )

  const renderStudioTheatre = () => (
    <section className="workspace-page">
      <div className="workspace-heading">
        <p className="eyebrow">DIRAFLOW MEDIAAI Ãƒâ€šÃ‚Â· DEMO</p>
        <h1>Studio Theatre</h1>
        <p>Review and play selected media in a dedicated demonstration workspace.</p>
      </div>

      <section className="workspace-card" style={{ marginTop: 24 }}>
        {mediaPreview ? (
          <>
            <div
              className="workspace-actions"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}
            >
              <div>
                <h2 style={{ overflowWrap: 'anywhere' }}>{mediaPreview.originalFilename}</h2>
                <p>{mediaPreview.mimeType || 'Media file'}</p>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setMediaPreview(null)
                  localStorage.removeItem('diraflow_studio_theatre_asset_id')
                  localStorage.removeItem('diraflow_studio_theatre_external_video')
                  sessionStorage.removeItem('diraflow_studio_theatre_watching_video')
                  setMediaError('')
                  setActivePage('Media')
                }}
              >
                Back to Media Library
              </button>
            </div>

            {(mediaPreview.mimeType || '').startsWith('image/') && (
              <img
                src={mediaPreview.url}
                alt={mediaPreview.originalFilename}
                style={{ display: 'block', width: '100%', maxHeight: 650, objectFit: 'contain', marginTop: 20 }}
              />
            )}

            {(mediaPreview.mimeType || '').startsWith('audio/') && (
              <div style={{ marginTop: 24 }}>
                <p>Audio playback</p>
                <audio controls preload="metadata" src={mediaPreview.url} style={{ width: '100%' }}>
                  Your browser does not support audio playback.
                </audio>
              </div>
            )}

            {mediaPreview.external && mediaPreview.mimeType === 'video/youtube' && (
              <iframe
                title={mediaPreview.originalFilename}
                src={mediaPreview.url}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                style={{
                  display: 'block',
                  width: '100%',
                  aspectRatio: '16 / 9',
                  border: 0,
                  marginTop: 20,
                  background: '#111',
                }}
              />
            )}

            {!mediaPreview.external && (mediaPreview.mimeType || '').startsWith('video/') && (
              <video
                controls
                preload="metadata"
                src={mediaPreview.url}
                style={{ display: 'block', width: '100%', maxHeight: 650, marginTop: 20, background: '#111' }}
              >
                Your browser does not support video playback.
              </video>
            )}

            {mediaPreview.mimeType === 'application/pdf' && (
              <iframe
                title={mediaPreview.originalFilename}
                src={mediaPreview.url}
                style={{ width: '100%', height: 650, border: '1px solid var(--border-color, #dfe4ec)', marginTop: 20 }}
              />
            )}

            {!mediaPreview.external &&
             !(mediaPreview.mimeType || '').startsWith('image/') &&
             !(mediaPreview.mimeType || '').startsWith('audio/') &&
             !(mediaPreview.mimeType || '').startsWith('video/') &&
             mediaPreview.mimeType !== 'application/pdf' && (
              <p style={{ marginTop: 20 }}>
                Inline preview is not available for this file type.
              </p>
            )}

            <p style={{ marginTop: 16 }}>
              <a href={mediaPreview.externalUrl || mediaPreview.url} target="_blank" rel="noreferrer">
                Open media in a new tab
              </a>
            </p>
            <p className="workspace-feedback" role="status">
              {mediaPreview.external
                ? 'This is an embedded external YouTube video. Playback depends on YouTube availability and the videoÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢s embedding permissions. DiraFlow does not store or download this video.'
                : 'Demo playback uses the selected stored asset. It does not represent AI video generation.'}
            </p>
          </>
        ) : (
          <>
            <h2>No media selected</h2>
            <p>Choose an available image, audio file, or video from the Media Library to preview it here.</p>
            <button
              type="button"
              className="primary-button"
              onClick={() => handleNavigation('Media')}
            >
              Open Media Library
            </button>
          </>
        )}
      </section>
    </section>
  )

  const renderPlaceholder = () => (
    <section className="page-placeholder">
      <p className="eyebrow">
        DIRAFLOW MEDIAAI
      </p>

      <h1>{activePage}</h1>

      <p>
        The {activePage.toLowerCase()} workspace
        is being prepared as part of the
        DiraFlow MediaAI platform.
      </p>

      <button
        className="primary-button"
        onClick={() =>
          handleNavigation('Dashboard')
        }
      >
        Back to Dashboard
      </button>
    </section>
  )

  const renderUsageWorkspace = () => (
    <section className="workspace-page">
      <div className="workspace-heading">
        <p className="eyebrow">DIRAFLOW MEDIAAI</p>
        <h1>Usage &amp; Allowance</h1>
        <p>Review recorded usage and your account status. Current totals reflect voice-preview events only; video tracking will appear when video-processing services are connected.</p>
      </div>
      <div className="panel">
        <button
          type="button"
          onClick={() => {
            loadVoiceUsage()
            loadCreditLedger()
          }}
          disabled={voiceUsageLoading || creditLedgerLoading}
        >
          {voiceUsageLoading || creditLedgerLoading
            ? 'Refreshing...'
            : 'Refresh usage and credits'}
        </button>
        {voiceUsageError && <p role="alert">{voiceUsageError}</p>}
      </div>
      <div className="dashboard-grid">
        <div className="panel">
          <h2>Voice-preview activity summary</h2>
          <p>Total requests: <strong>{voiceUsage?.usage?.total ?? 0}</strong></p>
          <p>Successful: {voiceUsage?.usage?.succeeded ?? 0}</p>
          <p>Failed: {voiceUsage?.usage?.failed ?? 0}</p>
          <p>Blocked: {voiceUsage?.usage?.blocked ?? 0}</p>
        </div>
<div className="panel">
          <h2>Credit account</h2>
          <p>Available credits: <strong>{creditLedger?.credits?.balance ?? 'ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â'}</strong></p>
          <p>Account status: {creditLedger?.credits?.status || 'Not loaded'}</p>
          <p>Lifetime credited: {creditLedger?.credits?.lifetimeCredited ?? 'ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â'}</p>
          <p>Lifetime debited: {creditLedger?.credits?.lifetimeDebited ?? 'ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â'}</p>
          {creditLedgerLoading && <p>Loading credit account...</p>}
          {creditLedger?.credits?.status === 'NOT_INITIALIZED' && (
            <p>No credit account has been initialized for this organisation.</p>
          )}
          {creditLedgerError && <p role="alert">{creditLedgerError}</p>}
        </div>
        <div className="panel">
          <h2>Subscription allowance</h2>
          <p><strong>Not connected</strong></p>
          <p>{voiceUsage?.subscriptionAllowance?.message || 'Verified plan limits, remaining allowance and reset dates are not available yet.'}</p>
        </div>
        <div className="panel">
          <h2>Voice-preview provider status</h2>
          <p>{voiceUsage?.recentEvents?.some(event => event.errorCode === 'provider_not_configured') ? 'Service configuration is required before previews can run.' : 'Service status is based on recorded events, not a live availability check.'}</p>
        </div>
        <div className="panel">
          <h2>Top-ups and billing</h2>
          <p><strong>Not yet connected</strong></p>
          <p>Secure payment confirmation and DiraFlow credit allocation are not available yet. No payment has been initiated.</p>
        </div>
      </div>
<div className="panel">
        <h2>Recent credit transactions</h2>
        {creditLedgerError && <p role="alert">{creditLedgerError}</p>}
        {(creditLedger?.transactions || []).map(transaction => (
          <div className="workspace-notice" key={transaction.id}>
            <strong>{String(transaction.type || 'Transaction').replace(/_/g, ' ')}</strong>
            <p>Amount: {transaction.amount} credits Ãƒâ€šÃ‚Â· Balance after: {transaction.balanceAfter}</p>
            {transaction.description && <p>{transaction.description}</p>}
            <p>{transaction.createdAt ? new Date(transaction.createdAt).toLocaleString() : 'Date unavailable'}</p>
          </div>
        ))}
        {!creditLedgerLoading && !creditLedgerError &&
          !(creditLedger?.transactions || []).length && (
            <p>No credit transactions have been recorded.</p>
          )}
      </div>
      <div className="panel">
        <h2>Recent voice-preview history</h2>
        {(voiceUsage?.recentEvents || []).map(event => (
          <div className="workspace-notice" key={event.id}>
            <strong>{String(event.operation || 'Voice preview').replace(/_/g, ' ')}</strong>
            <p>Status: {event.status || 'Unknown'} ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· Characters: {event.characterCount ?? 0}</p>
            <p>{event.createdAt ? new Date(event.createdAt).toLocaleString() : 'Date unavailable'}</p>
            {event.errorCode && <p>Details: {String(event.errorCode).replace(/_/g, ' ')}</p>}
          </div>
        ))}
        {!voiceUsageLoading && !(voiceUsage?.recentEvents || []).length && <p>No recorded events returned.</p>}
      </div>
    </section>
  )
  const renderPodcastWorkspace = () => (
    <section className="workspace-page">
      <div className="workspace-heading">
        <p className="eyebrow">DIRAFLOW MEDIAAI STUDIO</p>
        <h1>Podcast / Public Discussion</h1>
        <p>Plan interviews, panel discussions and licensed-persona productions.</p>
      </div>

      <div className="workspace-notice">
        <strong>Production workspace prototype</strong>
        <span>Session planning is available here. Audio/video generation and publishing require connected production services.</span>
      </div>

      <form className="workspace-panel" onSubmit={(event) => {
        event.preventDefault()
        try {
          const plan = {
            ...podcastForm,
            id: `${Date.now()}`,
            savedAt: new Date().toISOString(),
          }
          const nextPlans = [plan, ...savedPodcastPlans].slice(0, 10)
          localStorage.setItem('diraflow_podcast_plans', JSON.stringify(nextPlans))
          setSavedPodcastPlans(nextPlans)
          setWorkspaceNotice(`Session plan saved for "${plan.title || 'Untitled discussion'}". Production integrations are not connected yet.`)
        } catch {
          setWorkspaceNotice('Could not save the session plan in this browser. Check browser storage settings and try again.')
        }
      }}>
        <div className="workspace-panel-heading">
          <h2>Session brief</h2>
          <p>Define the discussion before production.</p>
        </div>

        <div className="workspace-form-grid">
          <label className="workspace-field">
            <span>Session title</span>
            <input value={podcastForm.title} onChange={(event) => setPodcastForm({ ...podcastForm, title: event.target.value })} placeholder="e.g. The future of African SMEs" />
          </label>

          <label className="workspace-field">
            <span>Discussion format</span>
            <select value={podcastForm.format} onChange={(event) => setPodcastForm({ ...podcastForm, format: event.target.value })}>
              <option>Interview</option>
              <option>Panel discussion</option>
              <option>Podcast conversation</option>
              <option>Public affairs discussion</option>
              <option>Roundtable</option>
            </select>
          </label>

          <label className="workspace-field">
            <span>Licensed persona</span>
            <select value={podcastForm.persona} onChange={(event) => setPodcastForm({ ...podcastForm, persona: event.target.value })}>
              <option>Actor</option>
              <option>Professional Executive</option>
              <option>Clergy</option>
            </select>
          </label>

          <label className="workspace-field">
            <span>Language</span>
            <select value={podcastForm.language} onChange={(event) => setPodcastForm({ ...podcastForm, language: event.target.value })}>
              <option>UK English</option>
              <option>American English</option>
              <option>French</option>
              <option>Spanish</option>
              <option>Portuguese</option>
              <option>Swahili</option>
              <option>Arabic</option>
              <option>Hausa</option>
              <option>Yoruba</option>
              <option>Igbo</option>
            </select>
          </label>

          <label className="workspace-field">
            <span>Production mode</span>
            <select value={podcastForm.production} onChange={(event) => setPodcastForm({ ...podcastForm, production: event.target.value })}>
              <option>Audio and video</option>
              <option>Audio only</option>
              <option>Video only</option>
            </select>
          </label>

          <label className="workspace-field">
            <span>Discussion topic</span>
            <input value={podcastForm.topic} onChange={(event) => setPodcastForm({ ...podcastForm, topic: event.target.value })} placeholder="What will the conversation cover?" />
          </label>

          <label className="workspace-field workspace-field-full">
            <span>Discussion brief and key questions</span>
            <textarea rows={5} value={podcastForm.brief} onChange={(event) => setPodcastForm({ ...podcastForm, brief: event.target.value })} placeholder="Add context, intended audience, talking points and questions." />
          </label>
        </div>

        <div className="workspace-actions">
          <button className="primary-button" type="submit">Save session plan</button>
          <span>Persona use is subject to the relevant licence and permissions.</span>
        </div>
      </form>

      {savedPodcastPlans.length > 0 && (
        <div className="workspace-panel">
          <div className="workspace-panel-heading">
            <h2>Saved session plans</h2>
            <p>Stored in this browser. Up to 10 recent plans are retained.</p>
          </div>
          <div className="workspace-saved-list">
            {savedPodcastPlans.map((plan) => (
              <div className="workspace-saved-item" key={plan.id}>
                <div>
                  <strong>{plan.title || 'Untitled discussion'}</strong>
                  <p>{plan.format} ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· {plan.persona} ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· {plan.language}</p>
                  <small>{plan.topic || 'No topic added'}</small>
                </div>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setPodcastForm({
                      title: plan.title || '',
                      format: plan.format || 'Interview',
                      persona: plan.persona || 'Professional Executive',
                      language: plan.language || 'UK English',
                      production: plan.production || 'Audio and video',
                      topic: plan.topic || '',
                      brief: plan.brief || '',
                    })
                    setWorkspaceNotice(`Loaded "${plan.title || 'Untitled discussion'}" into the session form.`)
                  }}
                >
                  Load plan
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {workspaceNotice && <p className="workspace-feedback" role="status">{workspaceNotice}</p>}
    </section>
  )

  const renderReceptionistWorkspace = () => (
    <section className="workspace-page">
      <div className="workspace-heading">
        <p className="eyebrow">BUSINESS COMMUNICATIONS</p>
        <h1>AI Receptionist</h1>
        <p>Configure how a future virtual receptionist should greet, triage and route enquiries.</p>
      </div>

      <div className="workspace-notice">
        <strong>Configuration prototype</strong>
        <span>This form does not answer live calls or send messages. Telephony, messaging and voice services must be connected before activation.</span>
      </div>

      <form className="workspace-panel" onSubmit={(event) => {
        event.preventDefault()
        try {
          localStorage.setItem('diraflow_receptionist_config', JSON.stringify(receptionistForm))
          setWorkspaceNotice(`Receptionist settings saved for "${receptionistForm.businessName || 'your business'}" in this browser. Live call handling is not connected.`)
        } catch {
          setWorkspaceNotice('Could not save receptionist settings in this browser. Check browser storage settings and try again.')
        }
      }}>
        <div className="workspace-panel-heading">
          <h2>Receptionist settings</h2>
          <p>Set the business identity, response guidance and escalation preferences.</p>
        </div>

        <div className="workspace-form-grid">
          <label className="workspace-field">
            <span>Business or production name</span>
            <input value={receptionistForm.businessName} onChange={(event) => setReceptionistForm({ ...receptionistForm, businessName: event.target.value })} placeholder="Business name" />
          </label>

          <label className="workspace-field">
            <span>Route enquiries to</span>
            <select value={receptionistForm.routeTo} onChange={(event) => setReceptionistForm({ ...receptionistForm, routeTo: event.target.value })}>
              <option>Production team</option>
              <option>Business development</option>
              <option>Customer support</option>
              <option>Finance team</option>
              <option>Human operator</option>
            </select>
          </label>

          <label className="workspace-field workspace-field-full">
            <span>Opening greeting</span>
            <textarea rows={3} value={receptionistForm.greeting} onChange={(event) => setReceptionistForm({ ...receptionistForm, greeting: event.target.value })} placeholder="Thank you for contacting us. How may I direct your enquiry?" />
          </label>

          <label className="workspace-field workspace-field-full">
            <span>Receptionist instructions</span>
            <textarea rows={5} value={receptionistForm.instructions} onChange={(event) => setReceptionistForm({ ...receptionistForm, instructions: event.target.value })} placeholder="Describe business hours, FAQs, information to collect and when to transfer to a person." />
          </label>
        </div>

        <div className="workspace-preferences">
          <label className="workspace-check">
            <input type="checkbox" checked={receptionistForm.captureContact} onChange={(event) => setReceptionistForm({ ...receptionistForm, captureContact: event.target.checked })} />
            <span>
              <strong>Capture contact details</strong>
              <small>Request caller name and preferred contact method when appropriate.</small>
            </span>
          </label>

          <label className="workspace-check">
            <input type="checkbox" checked={receptionistForm.escalateUrgent} onChange={(event) => setReceptionistForm({ ...receptionistForm, escalateUrgent: event.target.checked })} />
            <span>
              <strong>Escalate urgent enquiries</strong>
              <small>Direct urgent or sensitive matters to a human contact.</small>
            </span>
          </label>
        </div>

        <div className="workspace-actions">
          <button className="primary-button" type="submit">Save receptionist settings</button>
          <button
            className="secondary-button"
            type="button"
            onClick={() => {
              const business = receptionistForm.businessName.trim() || 'your business'
              const rawGreeting = receptionistForm.greeting.trim()
              const escapedBusiness = business.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
              const greetingWithoutBusiness = rawGreeting
                .replace(new RegExp(`^(?:thank you for\\s+)?(?:calling|contacting)\\s+${escapedBusiness}[,.!\\s]*`, 'i'), '')
                .trim()
              const opening = `Thank you for calling ${business}.`
              const greeting = greetingWithoutBusiness || 'Good morning. How may I help you today?'
              const contactLine = receptionistForm.captureContact
                ? 'Contact handling: The receptionist may request the caller\u2019s name and preferred contact method when appropriate.'
                : 'Contact handling: Do not request contact details in this sample.'
              const escalationLine = receptionistForm.escalateUrgent
                ? `Escalation: Urgent or sensitive enquiries should be referred to a human contact. Intended routing team: ${receptionistForm.routeTo}.`
                : `Routing: Intended team is ${receptionistForm.routeTo}. Urgent escalation is disabled in this configuration.`
              setReceptionistPreview([opening, greeting, contactLine, escalationLine].join('\n\n'))
              const internalGuidance = receptionistForm.instructions.trim()
                || 'Announce the configured business name first, then deliver the configured opening greeting exactly once. Listen to the caller and identify the enquiry before responding.'
              setReceptionistGuidancePreview(
                internalGuidance.replace(
                  /Begin with the configured greeting:\s*["\u201C\u201D]*/gi,
                  'Announce the configured business name first, then deliver the configured opening greeting exactly once. '
                )
              )
            }}
          >
            Preview sample response
          </button>
        </div>

        <span>Settings are stored in this browser. Live call handling is not connected.</span>
      </form>

        <div className="workspace-panel receptionist-chat-panel">
        <div className="workspace-panel-heading">
          <h2>Test the receptionist</h2>
          <p>Try a sample conversation using your current settings.</p>
        </div>

        <div
          role="log"
          aria-live="polite"
          aria-label="Receptionist conversation"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            maxHeight: '360px',
            overflowY: 'auto',
            padding: '12px',
            marginBottom: '16px',
            border: '1px solid var(--border-color, #d8dee8)',
            borderRadius: '10px',
          }}
        >
          {receptionistMessages.length === 0 && (
            <p className="workspace-feedback">
              Start with "Hello", "What services do you offer?", or "I need urgent help".
            </p>
          )}

          {receptionistMessages.map((item, index) => (
            <div
              key={`${item.role}-${index}`}
              style={{
                alignSelf: item.role === 'caller' ? 'flex-end' : 'flex-start',
                maxWidth: '90%',
                padding: '10px 12px',
                borderRadius: '10px',
                background: item.role === 'caller' ? '#e8f1ff' : '#f1f3f5',
                color: '#202733',
                whiteSpace: 'pre-wrap',
                overflowWrap: 'anywhere',
              }}
            >
              <strong>
                {item.role === 'caller' ? 'You' : 'Receptionist simulator'}
              </strong>
              <p style={{ margin: '6px 0 0' }}>{item.text}</p>
              {item.role !== 'caller' && (
                <button
                  type="button"
                  onClick={() => {
                    if (selectedVoice) {
                      previewVoice(selectedVoice, item.text.slice(0, 1200));
                    }
                  }}
                  disabled={!selectedVoice}
                  aria-label="Play receptionist reply using the selected voice"
                  style={{
                    marginTop: '10px',
                    padding: '6px 10px',
                    border: '1px solid #c8d0dc',
                    borderRadius: '6px',
                    background: '#ffffff',
                    color: '#202733',
                    cursor: selectedVoice ? 'pointer' : 'not-allowed',
                  }}
                >
                  {isVoicePreviewing && previewingVoiceId === selectedVoice?.id
                    ? 'Stop voice preview'
                    : 'Play reply with selected voice'}
                </button>
              )}
              {item.escalation && (
                <p style={{ margin: '8px 0 0', fontWeight: 600 }}>
                  Escalation flag: human follow-up indicated.
                </p>
              )}
              {item.notice && (
                <small style={{ display: 'block', marginTop: '8px' }}>
                  {item.notice}
                </small>
              )}
            </div>
          ))}
        </div>

        <label className="workspace-field">
          <span>Your test message</span>
          <textarea
            rows={3}
            maxLength={1000}
            value={receptionistInput}
            onChange={(event) => setReceptionistInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                handleReceptionistSend()
              }
            }}
            placeholder="Type a caller's message. Press Enter to send; Shift+Enter for a new line."
            disabled={receptionistSending}
          />
        </label>

        {receptionistChatError && (
          <p className="workspace-feedback" role="alert">
            {receptionistChatError}
          </p>
        )}

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '12px' }}>
          <button
            type="button"
            className="primary-button"
            onClick={handleReceptionistSend}
            disabled={receptionistSending || !receptionistInput.trim()}
          >
            {receptionistSending ? 'RespondingÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦' : 'Send test message'}
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setReceptionistMessages([])
              setReceptionistChatError('')
              setReceptionistInput('')
            }}
            disabled={receptionistSending}
          >
            Clear conversation
          </button>
        </div>

        <p className="workspace-feedback" style={{ marginTop: '12px' }}>
          Prototype only. The simulator does not place or receive calls, transfer callers,
          notify staff, or send messages. Contact details entered here are not saved by this chat panel.
        </p>
      </div>


      {receptionistPreview && (
        <div className="workspace-panel" aria-live="polite">
          <div className="workspace-panel-heading">
            <h2>Sample receptionist response</h2>
            <p>Illustrative preview only ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â this does not connect to a caller or send a message.</p>
          </div>
          <p className="workspace-feedback" style={{ whiteSpace: 'pre-wrap' }}>{receptionistPreview}</p>
          <button
            className="secondary-button"
            type="button"
            disabled={!selectedVoice}
            onClick={() => {
              const spokenGreeting = receptionistPreview.split('\n\n').slice(0, 2).join(' ')
              previewVoice(selectedVoice, spokenGreeting)
            }}
          >
            {isVoicePreviewing && previewingVoiceId === selectedVoice?.id
              ? 'Stop greeting preview'
              : 'Play greeting with selected voice'}
          </button>
          <div className="workspace-panel-heading">
            <h2>Internal guidance (not spoken to callers)</h2>
          </div>
          <p className="workspace-feedback" style={{ whiteSpace: 'pre-wrap' }}>{receptionistGuidancePreview}</p>
        </div>
      )}

      {workspaceNotice && <p className="workspace-feedback" role="status">{workspaceNotice}</p>}
    </section>
  )
  const renderPageContent = () => {
    if (activePage === 'Dashboard') {
      return renderDashboard()
    }

    if (activePage === 'Create') {
      return renderCreate()
    }

    if (activePage === 'Usage & Allowance') {
      return renderUsageWorkspace()
    }

    if (activePage === 'AI Presenter') {
      return renderAIPresenter()
    }

    if (activePage === 'Projects') {
      return renderContentCenter()
    }

    if (activePage === 'Podcast / Public Discussion') {
      return renderPodcastWorkspace()
    }

    if (activePage === 'AI Receptionist') {
      return renderReceptionistWorkspace()
    }

    if (activePage === 'Distribution Agent') {
      return renderDistributionWorkspace()
    }

    if (activePage === 'Media') {
      return renderMediaWorkspace()
    }

    if (activePage === 'Studio Theatre') {
      return renderStudioTheatre()
    }
    return renderPlaceholder()
  }

  const renderLanding = () => (
    <div className="public-landing-shell">

      <header className="public-landing-header">
        <button
          type="button"
          className="public-landing-brand"
          onClick={() => setShowLanding(true)}
          aria-label="DiraFlow MediaAI home"
        >
          <img
            src={diraflowLogo}
            alt="DiraFlow MediaAI"
            className="public-landing-logo"
          />

          <span className="public-landing-brand-copy">
            <strong>DiraFlow</strong>
            <span>MediaAI</span>
          </span>
        </button>

        <nav className="public-landing-nav" aria-label="Public navigation">
          <button type="button" onClick={() => document.querySelector(".public-landing-shell section")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Product</button>
          <button type="button" onClick={() => document.querySelector(".landing-capabilities-section")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Capabilities</button>
          <button type="button" onClick={() => document.querySelector(".landing-process-section")?.scrollIntoView({ behavior: "smooth", block: "start" })}>How It Works</button>
          <button type="button" onClick={() => document.querySelector(".landing-cta-section")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Benefits</button>
        </nav>

        <div className="public-landing-actions">
          <button
            type="button"
            className="landing-signin"
            onClick={() => setShowLanding(false)}
          >
            Sign In
          </button>

          <button
            type="button"
            className="landing-primary-button landing-header-cta"
            onClick={() => setShowLanding(false)}
          >
            Get Started
          </button>
        </div>
      </header>

      <main className="public-landing-main">

        <section className="landing-hero">
          <div className="landing-hero-copy">

            <div className="landing-status-pill">
              <span className="landing-status-dot" />
              AI-powered business communication and media production
            </div>

            <p className="landing-eyebrow">
              CREATE | COMMUNICATE | PRODUCE | DISTRIBUTE | MONETISE
            </p>

            <h1>
              Less time managing distractions.
              <span> More time creating value.</span>
            </h1>

            <p className="landing-hero-text">
              DiraFlow MediaAI brings together AI Receptionist workflows,
              podcast and public-discussion production, digital presenters,
              voice tools and content distribution workflows. Help protect
              productive time, streamline production and prepare content
              for the audiences that matter.
            </p>

            <div className="landing-hero-actions">
              <button
                type="button"
                className="landing-primary-button landing-hero-button"
                onClick={() => setShowLanding(false)}
              >
                Get Started
                <span>ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢</span>
              </button>

              <button
                type="button"
                className="landing-secondary-button"
                onClick={() => setShowLanding(false)}
              >
                Sign In
              </button>
            </div>

            <div className="landing-trust-row">
              <span>Built for modern businesses</span>
              <span className="landing-trust-divider" />
              <span>AI-assisted workflows</span>
              <span className="landing-trust-divider" />
              <span>One connected workspace</span>
            </div>
          </div>

          <div className="landing-hero-visual">

            <div className="landing-glow landing-glow-one" />
            <div className="landing-glow landing-glow-two" />

            <div className="landing-visual-card">

              <div className="landing-visual-top">
                <div>
                  <span className="landing-visual-kicker">
                    DIRAFLOW MEDIAAI
                  </span>
                  <strong>Command Center</strong>
                </div>

                <span className="landing-live-badge">
                  <span />
                  Live
                </span>
              </div>

              <div className="landing-visual-body">

                <div className="landing-dashboard-heading">
                  <div>
                    <span>Business visibility</span>
                    <strong>Content performance</strong>
                  </div>

                  <span className="landing-dashboard-period">
                    This cycle
                  </span>
                </div>

                <div className="landing-dashboard-chart">
                  <div className="landing-chart-grid">
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>

                  <div className="landing-chart-line">
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                </div>

                <div className="landing-dashboard-metrics">

                  <div className="landing-metric-card">
                    <span>Content</span>
                    <strong>128</strong>
                    <small>Created</small>
                  </div>

                  <div className="landing-metric-card">
                    <span>Published</span>
                    <strong>84</strong>
                    <small>Across channels</small>
                  </div>

                  <div className="landing-metric-card">
                    <span>Visibility</span>
                    <strong>+42%</strong>
                    <small>Performance trend</small>
                  </div>

                </div>

                <div className="landing-workflow-card">
                  <div className="landing-workflow-icon">AI</div>

                  <div>
                    <span>AI workflow</span>
                    <strong>Idea ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Media ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Audience</strong>
                  </div>

                  <span className="landing-workflow-arrow">ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢</span>
                </div>

              </div>
            </div>

            <div className="landing-floating-card landing-floating-ai">
              <span className="landing-floating-icon">AI</span>
              <div>
                <strong>AI Presenter</strong>
                <span>Ready for review</span>
              </div>
              <span className="landing-floating-check">ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“</span>
            </div>

            <div className="landing-floating-card landing-floating-news">
              <span className="landing-news-dot" />
              <div>
                <strong>Live News</strong>
                <span>New briefing available</span>
              </div>
            </div>

          </div>
        </section>

        <section className="landing-section landing-capabilities-section">
          <div className="landing-section-heading">
            <p className="landing-eyebrow">
              WHAT DIRAFLOW CAN DO
            </p>

            <h2>
              One platform for business content, conversations and communication.
            </h2>

            <p>
              Create, communicate and produce with tools designed to protect
              productive time, support creators and organise business media
              workflows in one workspace.
            </p>
          </div>

          <div className="landing-capability-grid">

            <article className="landing-capability-card">
              <span>01</span>
              <img className="landing-capability-image" src={podcastDiscussionImage} alt="Professionals recording a podcast and public discussion" loading="lazy" />
              <h3>AI Podcast &amp; Public Discussion</h3>
              <p>
                Develop interviews, podcasts, panels and roundtables.
                Built for bloggers, podcasters, publishers and content
                creators who want to plan engaging conversations.
              </p>
            </article>

            <article className="landing-capability-card">
              <span>02</span>
              <img className="landing-capability-image" src={aiReceptionistImage} alt="Professional AI receptionist workspace" loading="lazy" />
              <h3>AI Receptionist</h3>
              <p>
                Organise routine enquiries, capture requests and route work
                to the right team, helping executives and production teams
                reduce avoidable interruptions during busy periods.
              </p>
            </article>

            <article className="landing-capability-card">
              <span>03</span>
              <img className="landing-capability-image" src={creatorStudioImage} alt="Creative team producing digital content" loading="lazy" />
              <h3>Creator &amp; Content Studio</h3>
              <p>
                Turn briefs and ideas into scripts, articles, social content
                and business communications through structured creation
                and review workflows.
              </p>
            </article>

            <article className="landing-capability-card">
              <span>04</span>
              <img className="landing-capability-image" src={presenterVoiceImage} alt="Digital presenter and voice production" loading="lazy" />
              <h3>AI Presenter &amp; Voice</h3>
              <p>
                Prepare presenter-led content with selected voices,
                approved scripts and multilingual options, subject to
                available voice and production capabilities.
              </p>
            </article>

            <article className="landing-capability-card">
              <span>05</span>
              <img className="landing-capability-image" src={liveNewsImage} alt="Team preparing news and business communications" loading="lazy" />
              <h3>Live News &amp; Communication</h3>
              <p>
                Organise relevant information into structured news-style
                briefings and presentations, with appropriate review
                before publication.
              </p>
            </article>

            <article className="landing-capability-card">
              <span>06</span>
              <img className="landing-capability-image" src={voiceMediaImage} alt="Voice recording and media asset production" loading="lazy" />
              <h3>Voice &amp; Media Assets</h3>
              <p>
                Manage voice options and media assets to support consistent,
                brand-ready communication and production workflows.
              </p>
            </article>

            <article className="landing-capability-card">
              <span>07</span>
              <img className="landing-capability-image" src={licensedTalentImage} alt="Professional talent collaborating on a media project" loading="lazy" />
              <h3>Licensed Talent Marketplace</h3>
              <p>
                Select talent for permitted project uses. Each use of a
                person's image, voice or digital likeness must follow
                applicable consent and licence terms.
              </p>
            </article>

            <article className="landing-capability-card">
              <span>08</span>
              <img className="landing-capability-image" src={distributionAgentImage} alt="Digital content distribution workflow" loading="lazy" />
              <h3>Distribution Agent</h3>
              <span className="landing-capability-status">In development</span>
              <p>
                Planned workflows for scheduling content, setting repeat
                intervals and tracking delivery status. External publishing
                depends on completed channel integrations.
              </p>
            </article>

            <article className="landing-capability-card">
              <span>09</span>
              <img className="landing-capability-image" src={royaltyManagementImage} alt="Media project revenue and royalty planning" loading="lazy" />
              <h3>Monetisation &amp; Royalty Management</h3>
              <span className="landing-capability-status">Planned</span>
              <p>
                Planned visibility into project revenue allocation, talent
                royalties, platform fees and payment status, supported by
                clear records and agreed project terms.
              </p>
            </article>

            <article className="landing-capability-card">
              <span>10</span>
              <img className="landing-capability-image" src={analyticsPerformanceImage} alt="Business media analytics and performance review" loading="lazy" />
              <h3>Analytics &amp; Performance</h3>
              <p>
                Review available performance information and use insights
                to guide future content and communication decisions.
              </p>
            </article>

          </div>
        </section>
<section className="landing-section landing-process-section">

          <div className="landing-section-heading">
            <p className="landing-eyebrow">
              THE USER JOURNEY
            </p>

            <h2>
              From your first idea to better business communication.
            </h2>

            <p>
              Follow a clear workflow whether you are creating media,
              planning a discussion or configuring a receptionist.
            </p>
          </div>

          <div className="landing-process-grid">

            <div className="landing-process-card">
              <strong>01</strong>
              <span>Choose Your Goal</span>
              <p>
                Start with content creation, an AI presentation, a podcast
                or public discussion, or a receptionist workflow.
              </p>
            </div>

            <div className="landing-process-card">
              <strong>02</strong>
              <span>Configure</span>
              <p>
                Add your brief, script, brand requirements, language,
                presenter or persona, and relevant workflow instructions.
              </p>
            </div>

            <div className="landing-process-card">
              <strong>03</strong>
              <span>Create or Prepare</span>
              <p>
                Develop media and discussion plans, or define receptionist
                greetings, enquiry categories and routing rules.
              </p>
            </div>

            <div className="landing-process-card">
              <strong>04</strong>
              <span>Review and Approve</span>
              <p>
                Check accuracy, brand standards, permissions and applicable
                digital-persona licences before proceeding.
              </p>
            </div>

            <div className="landing-process-card">
              <strong>05</strong>
              <span>Publish or Connect</span>
              <p>
                Prepare approved content for distribution, or connect and
                activate supported receptionist channels when available.
              </p>
            </div>

            <div className="landing-process-card">
              <strong>06</strong>
              <span>Measure and Improve</span>
              <p>
                Review available performance data, enquiry records and
                feedback to improve your next communication cycle.
              </p>
            </div>

          </div>
        </section>

        <section className="landing-cta-section">

          <div className="landing-cta-orb landing-cta-orb-one" />
          <div className="landing-cta-orb landing-cta-orb-two" />

          <div className="landing-cta-content">
            <p className="landing-eyebrow">
              READY TO GET STARTED?
            </p>

            <h2>
              Make your business more visible, consistent and ready to
              communicate.
            </h2>

            <p>
              Bring your ideas, content and communication workflows together
              in DiraFlow MediaAI.
            </p>

            <button
              type="button"
              className="landing-primary-button landing-cta-button"
              onClick={() => setShowLanding(false)}
            >
              Enter DiraFlow MediaAI
              <span>ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢</span>
            </button>
          </div>

        </section>

      </main>

      <footer className="public-landing-footer">

        <div className="landing-footer-brand">
          <img
            src={diraflowLogo}
            alt="DiraFlow MediaAI"
            className="landing-footer-diraflow-logo"
          />

          <div>
            <strong>DiraFlow MediaAI</strong>
            <span>
              AI-powered business visibility and communication.
            </span>
          </div>
        </div>

        <div className="landing-footer-powered">

          <span className="landing-powered-label">
            Powered by
          </span>

          <img
            src={lewishamLogo}
            alt="Lewisham Multi Solutions Limited"
            className="landing-footer-lewisham-logo"
          />

          <strong>
            Lewisham Multi Solutions Limited
          </strong>

        </div>

      </footer>

    </div>
  )
  const renderLogin = () => (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">
          <img
            src={diraflowLogo}
            alt="DiraFlow MediaAI"
            className="auth-logo"
          />

          <div>
            <strong>DiraFlow</strong>
            <span>MediaAI</span>
          </div>
        </div>

        <div className="auth-heading">
          <p className="eyebrow">
            DIRAFLOW MEDIAAI
          </p>

          <h1>Welcome back</h1>

          <p>
            Sign in to access your MediaAI Command Center.
          </p>
        </div>

        <form
          className="auth-form"
          onSubmit={handleLogin}
        >
          <div className="auth-field">
            <label htmlFor="login-email">
              Email address
            </label>

            <input
              id="login-email"
              type="email"
              value={loginForm.email}
              onChange={(event) =>
                setLoginForm((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
              disabled={loginSubmitting}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="login-password">
              Password
            </label>

            <input
              id="login-password"
              type="password"
              value={loginForm.password}
              onChange={(event) =>
                setLoginForm((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              placeholder="Enter your password"
              autoComplete="current-password"
              disabled={loginSubmitting}
            />
          </div>

          {authError && (
            <div className="auth-error">
              {authError}
            </div>
          )}

          <button
            type="submit"
            className="auth-submit"
            disabled={loginSubmitting}
          >
            {loginSubmitting
              ? 'Signing in...'
              : 'Sign In'}
          </button>
        </form>

        <button
          type="button"
          className="auth-back-home"
          onClick={() => {
            setAuthError('')
            setAuthMode('signup')
          }}
        >
          New to DiraFlow? Create an account
        </button>

        <button
          type="button"
          className="auth-back-home"
          onClick={() => {
            setAuthError('')
            setShowLanding(true)
          }}
        >
          Back to home
        </button>
        <div className="auth-footer">
          <span>
            DiraFlow MediaAI | v1.0
          </span>

          <span>
            Powered by Lewisham Multi Solutions Limited
          </span>
        </div>
      </div>
    </div>
  )

  if (authLoading) {
    return (
      <div className="auth-loading">
        <img
          src={diraflowLogo}
          alt="DiraFlow MediaAI"
          className="auth-loading-logo"
        />

        <p>Loading DiraFlow MediaAI...</p>
      </div>
    )
  }

  const renderSignup = () => (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">
          <img
            src={diraflowLogo}
            alt="DiraFlow MediaAI"
            className="auth-logo"
          />
          <div>
            <strong>DiraFlow</strong>
            <span>MediaAI</span>
          </div>
        </div>

        <div className="auth-heading">
          <p className="eyebrow">DIRAFLOW MEDIAAI</p>
          <h1>Create your account</h1>
          <p>Create your organization and access your MediaAI Command Center.</p>
        </div>

        <form className="auth-form" onSubmit={handleRegister}>
          <div className="auth-field">
            <label htmlFor="signup-first-name">First name</label>
            <input id="signup-first-name" value={signupForm.firstName}
              onChange={(event) => setSignupForm((current) => ({ ...current, firstName: event.target.value }))}
              autoComplete="given-name" required disabled={registrationSubmitting} />
          </div>

          <div className="auth-field">
            <label htmlFor="signup-last-name">Last name</label>
            <input id="signup-last-name" value={signupForm.lastName}
              onChange={(event) => setSignupForm((current) => ({ ...current, lastName: event.target.value }))}
              autoComplete="family-name" required disabled={registrationSubmitting} />
          </div>

          <div className="auth-field">
            <label htmlFor="signup-email">Email address</label>
            <input id="signup-email" type="email" value={signupForm.email}
              onChange={(event) => setSignupForm((current) => ({ ...current, email: event.target.value }))}
              autoComplete="email" required disabled={registrationSubmitting} />
          </div>

          <div className="auth-field">
            <label htmlFor="signup-password">Password</label>
            <input id="signup-password" type="password" value={signupForm.password}
              onChange={(event) => setSignupForm((current) => ({ ...current, password: event.target.value }))}
              autoComplete="new-password" minLength={8} required disabled={registrationSubmitting} />
          </div>

          <div className="auth-field">
            <label htmlFor="signup-confirm-password">Confirm password</label>
            <input id="signup-confirm-password" type="password" value={signupForm.confirmPassword}
              onChange={(event) => setSignupForm((current) => ({ ...current, confirmPassword: event.target.value }))}
              autoComplete="new-password" minLength={8} required disabled={registrationSubmitting} />
          </div>

          {authError && <div className="auth-error">{authError}</div>}

          <button type="submit" className="auth-submit" disabled={registrationSubmitting}>
            {registrationSubmitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <button type="button" className="auth-back-home" onClick={() => {
          setAuthError('')
          setAuthMode('login')
        }}>
          Already have an account? Sign in
        </button>
      </div>
    </div>
  )
  if (!currentUser) {
    if (showLanding) {
      return renderLanding()
    }

    return authMode === 'signup' ? renderSignup() : renderLogin()
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img
            src={diraflowLogo}
            alt="DiraFlow MediaAI"
            className="diraflow-logo"
          />

          <span className="brand-product">
            MediaAI
          </span>
        </div>

        <div className="workspace-selector">
          <div className="workspace-avatar">
            <img
              src={diraflowLogo}
              alt="DiraFlow"
              className="workspace-avatar-logo"
            />
          </div>

          <div className="workspace-info">
            <span>Workspace</span>

            <strong>My Workspace</strong>
          </div>

          <span className="workspace-chevron">
            &#x2304;
          </span>
        </div>

        <nav className="navigation">
          <p className="nav-label">
            WORKSPACE
          </p>

          {navigation.map((item) => (
            <button
              key={item.label}
              className={`nav-item ${
                activePage === item.label
                  ? 'active'
                  : ''
              }`}
              onClick={() =>
                handleNavigation(item.label)
              }
            >
              <span className="nav-icon">
                <SidebarIcon name={item.icon} />
              </span>

              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button
            className={`nav-item ${
              activePage === 'Settings'
                ? 'active'
                : ''
            }`}
            onClick={() =>
              handleNavigation('Settings')
            }
          >
            <span className="nav-icon">
              &#x2699;
            </span>

            <span>Settings</span>
          </button>

          <div className="lms-brand">
            <span className="powered-by">
              Powered by
            </span>

            <img
              src={lewishamLogo}
              alt="Lewisham Multi Solutions Limited"
              className="lms-logo"
            />
          </div>

          <div className="sidebar-version">
            DiraFlow MediaAI | v1.0
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            <span>DiraFlow MediaAI</span>

            <span>/</span>

            <strong>
              {activePage === 'Projects'
                ? 'Content'
                : activePage}
            </strong>
          </div>

          <div className="topbar-actions">
            <button
              className="icon-button"
              title="Notifications"
            >
              !</button>

                    <div className="user-profile">
            <div className="user-avatar">
              {(
                `${currentUser?.firstName || ''}${currentUser?.lastName || ''}`
              )
                .trim()
                .split(/\s+/)
                .map((part) => part.charAt(0))
                .join('')
                .slice(0, 2)
                .toUpperCase() || 'U'}
            </div>

            <div className="user-details">
              <strong>
                {currentUser?.firstName || 'User'}{' '}
                {currentUser?.lastName || ''}
              </strong>

              <span>
                {currentUser?.email || 'Authenticated User'}
              </span>
            </div>

            <button
              type="button"
              className="logout-button"
              onClick={handleLogout}
              title="Sign out"
            >
              Logout
            </button>
          </div>
          </div>
        </header>

        <div className="content-area">
          {renderPageContent()}
        </div>
      </main>
    </div>
  )
}

function MetricCard({ label, value, icon }) {
  return (
    <div className="metric-card">
      <div className="metric-icon">
        {icon}
      </div>

      <div className="metric-copy">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  )
}

function ContentDetailPanel({
  content,
  currentUser,
  onClose,
  onAction,
}) {
  if (!content) {
    return (
      <aside className="content-detail-panel content-detail-empty">
        <div className="detail-empty-icon">CD</div>

        <h3>Select content</h3>

        <p>
          Select an item from the content library
          to inspect its lifecycle and available
          actions.
        </p>
      </aside>
    )
  }


  const userPermissions = Array.isArray(
    currentUser?.permissions
  )
    ? currentUser.permissions
    : []

  const canSubmit =
    content.status === 'DRAFT' &&
    userPermissions.includes('content.create')

  const canReview =
    content.status === 'IN_REVIEW' &&
    userPermissions.includes('content.review')

  const canApprove =
    content.status === 'IN_REVIEW' &&
    Boolean(content.reviewedById) &&
    userPermissions.includes('content.approve')

  const canPublish =
    content.status === 'APPROVED' &&
    userPermissions.includes('content.publish')

  return (
    <aside className="content-detail-panel">
      <div className="detail-header">
        <div>
          <p className="detail-eyebrow">
            CONTENT ASSET
          </p>

          <h2>{content.title}</h2>
        </div>

        <button
          className="detail-close"
          onClick={onClose}
          title="Close"
        >
          |
        </button>
      </div>

      <div className="detail-status-row">
        <StatusBadge status={content.status} />

        <TypeBadge type={content.type} />
      </div>

      <div className="detail-section">
        <span className="detail-label">
          Description
        </span>

        <p className="detail-description">
          {content.description ||
            'No description provided.'}
        </p>
      </div>

      <div className="detail-section">
        <span className="detail-label">
          Created by
        </span>

        <div className="detail-person">
          <div className="mini-avatar">
            {(
              content.createdBy?.firstName?.[0] ||
              'U'
            ).toUpperCase()}
            {(
              content.createdBy?.lastName?.[0] ||
              ''
            ).toUpperCase()}
          </div>

          <div>
            <strong>
              {content.createdBy
                ? `${content.createdBy.firstName} ${content.createdBy.lastName}`
                : 'Unknown'}
            </strong>

            <span>
              {content.createdBy?.email ||
                'Unknown creator'}
            </span>
          </div>
        </div>
      </div>

      <div className="detail-meta-grid">
        <div>
          <span>Created</span>
          <strong>
            {formatDate(content.createdAt)}
          </strong>
        </div>

        <div>
          <span>Updated</span>
          <strong>
            {formatDate(content.updatedAt)}
          </strong>
        </div>

        <div>
          <span>Reviewed</span>
          <strong>
            {content.reviewedAt
              ? formatDate(
                  content.reviewedAt
                )
              : 'Pending'}
          </strong>
        </div>

        <div>
          <span>Approved</span>
          <strong>
            {content.approvedAt
              ? formatDate(
                  content.approvedAt
                )
              : 'Pending'}
          </strong>
        </div>
      </div>

      <div className="detail-section">
        <span className="detail-label">
          Production workflow
        </span>

        <div className="lifecycle">
          <LifecycleStep
            label="Draft"
            active={content.status === 'DRAFT'}
            complete={
              content.status !== 'DRAFT'
            }
          />

          <LifecycleStep
            label="Review"
            active={
              content.status === 'IN_REVIEW'
            }
            complete={[
              'APPROVED',
              'PUBLISHED',
            ].includes(content.status)}
          />

          <LifecycleStep
            label="Approved"
            active={
              content.status === 'APPROVED'
            }
            complete={
              content.status === 'PUBLISHED'
            }
          />

          <LifecycleStep
            label="Published"
            active={
              content.status === 'PUBLISHED'
            }
            complete={
              content.status === 'PUBLISHED'
            }
          />
        </div>
      </div>

      <div className="detail-actions">
        {canSubmit && (
          <button
            className="primary-button full-button"
            onClick={() =>
              onAction(
                content.id,
                'submit-review'
              )
            }
          >
            Submit for Review
          </button>
        )}

        {canReview && (
          <button
            className="secondary-button full-button"
            onClick={() =>
              onAction(
                content.id,
                'review'
              )
            }
          >
            Mark as Reviewed
          </button>
        )}

        {canApprove && (
          <button
            className="primary-button full-button"
            onClick={() =>
              onAction(
                content.id,
                'approve'
              )
            }
          >
            Approve Content
          </button>
        )}

        {canPublish && (
          <button
            className="primary-button full-button"
            onClick={() =>
              onAction(
                content.id,
                'publish'
              )
            }
          >
            Publish Content
          </button>
        )}

        {content.status === 'PUBLISHED' && (
          <div className="published-message">
            ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ This content has been published.
          </div>
        )}
      </div>
    </aside>
  )
}

function LifecycleStep({
  label,
  active,
  complete,
}) {
  return (
    <div
      className={`lifecycle-step ${
        active ? 'active' : ''
      } ${complete ? 'complete' : ''}`}
    >
      <span className="lifecycle-dot">
        {complete ? '?' : ''}
      </span>

      <span>{label}</span>
    </div>
  )
}

export default App
