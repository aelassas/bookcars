// This script fetches the latest releases from GitHub repository and generates .github/RELEASES.md markdown file

import { mkdir, writeFile } from 'fs/promises'
import https from 'https'

const repo = 'aelassas/bookcars'
const baseUrl = `https://api.github.com/repos/${repo}/releases?per_page=100`

const fetchAllReleases = async () => {
  const releases = []

  let url = baseUrl
  while (url) {
    const { data, next } = await fetchReleasesPage(url)
    releases.push(...data)
    url = next
  }

  return releases
}

const fetchReleasesPage = (url) => {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Node.js',
        'Accept': 'application/vnd.github+json'
      }
    }, res => {
      let body = ''
      res.on('data', chunk => body += chunk)
      res.on('end', () => {
        try {
          const json = JSON.parse(body)
          const linkHeader = res.headers.link
          const nextUrl = parseNextLink(linkHeader)
          resolve({ data: json, next: nextUrl })
        } catch (err) {
          reject(new Error('Failed to parse response: ' + err.message))
        }
      })
    }).on('error', reject)
  })
}

const parseNextLink = (linkHeader) => {
  if (!linkHeader) {
    return null
  }
  const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/)
  return match ? match[1] : null
}

const generateMarkdown = async () => {
  try {
    const releases = await fetchAllReleases()

    const lines = ['# Releases', '']
    for (const r of releases) {
      const title = r.name || r.tag_name
      const date = r.published_at?.split('T')[0]
      const body = r.body || 'No changelog provided.'
      lines.push(`## ${title} – ${date}`, '', body.trim(), '')
    }

    await mkdir('.github', { recursive: true })
    await writeFile('.github/RELEASES.md', lines.join('\n'), 'utf-8')
    console.log('✅ .github/RELEASES.md generated successfully.')
  } catch (err) {
    console.error('❌ Error generating RELEASES.md:', err.message)
  }
}

generateMarkdown()
