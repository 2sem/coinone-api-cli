import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'coinone-api-cli',
  description: 'Developer-friendly CLI guide for Coinone public and guarded private APIs.',
  base: '/coinone-api-cli/',
  cleanUrls: true,
  lastUpdated: true,
  themeConfig: {
    siteTitle: 'coinone-api-cli',
    logo: '/logo.svg',
    nav: [
      { text: 'Guide', link: '/' },
      { text: 'Commands', link: '/command-reference' },
      { text: 'GitHub', link: 'https://github.com/2sem/coinone-api-cli' }
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Overview', link: '/' },
          { text: 'Install', link: '/install' },
          { text: 'Quickstart', link: '/quickstart' },
          { text: 'Commands', link: '/commands' },
          { text: 'Command Reference', link: '/command-reference' },
          { text: 'Auth and Safety', link: '/auth-and-safety' },
          { text: 'Output and Automation', link: '/output-and-automation' },
          { text: 'Troubleshooting', link: '/troubleshooting' },
          { text: 'Development', link: '/development' }
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
