import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'coinone-api-cli',
  description: '코인원 공개 API와 제한된 개인 API 워크플로를 위한 CLI 가이드.',
  base: '/coinone-api-cli/',
  cleanUrls: true,
  lastUpdated: true,
  themeConfig: {
    siteTitle: 'coinone-api-cli',
    logo: '/logo.svg',
    nav: [
      { text: '가이드', link: '/' },
      { text: '명령어 레퍼런스', link: '/command-reference' },
      { text: 'GitHub', link: 'https://github.com/2sem/coinone-api-cli' }
    ],
    sidebar: [
      {
        text: '가이드',
        items: [
          { text: '소개', link: '/' },
          { text: '설치', link: '/install' },
          { text: '빠른 시작', link: '/quickstart' },
          { text: '명령어 개요', link: '/commands' },
          { text: '명령어 레퍼런스', link: '/command-reference' },
          { text: '인증과 안전장치', link: '/auth-and-safety' },
          { text: '출력과 자동화', link: '/output-and-automation' },
          { text: '문제 해결', link: '/troubleshooting' },
          { text: '개발', link: '/development' }
        ]
      }
    ],
    search: {
      provider: 'local'
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/2sem/coinone-api-cli' }
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 2sem'
    }
  }
})
