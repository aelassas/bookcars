// This script fetches the latest releases from GitHub repository and generates .github/RELEASES.md markdown file

import { mkdir, writeFile } from 'fs/promises'
import https from 'https'

const repo = 'aelassas/bookcars'
const url = `https://api.github.com/repos/${repo}/releases`

const fetchReleasesPage = (url) => {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Node.js',
        'Accept': 'application/vnd.github+json'
      }
    }, res => {
      let data = ''
      res.on('data', chunk => data += chunk)

      // Capture Link header for pagination
      const linkHeader = res.headers.link || ''
      res.on('end', () => {
        try {
          const releases = JSON.parse(data)
          resolve({ releases, linkHeader })
        } catch {
          reject(new Error('Failed to parse releases JSON'))
        }
      })
    }).on('error', reject)
  })
}

const getNextLink = (linkHeader) => {
  // Parse Link header to find rel="next"
  const links = linkHeader.split(',').map(s => s.trim())
  for (const link of links) {
    const match = link.match(/<([^>]+)>;\s*rel="([^"]+)"/)
    if (match && match[2] === 'next') {
      return match[1]
    }
  }
  return null
}

const fetchAllReleases = async () => {
  let allReleases = []
  let nextUrl = url

  while (nextUrl) {
    const { releases, linkHeader } = await fetchReleasesPage(nextUrl)
    allReleases = allReleases.concat(releases)
    nextUrl = getNextLink(linkHeader)
  }

  return allReleases
}

const generateMarkdown = async () => {
  try {
    const releases = await fetchAllReleases()

    const lines = ['# Releases', '']

    for (const r of releases) {
      const title = r.name || r.tag_name
      const date = r.published_at?.split('T')[0]
      let body = r.body || 'No changelog provided.'

      // Add one '#' before any '##' header lines to shift them down one level
      body = body.replace(/^##/gm, '####')

      lines.push(`## [${title}](${r.html_url}) – ${date}`, '')
      lines.push(body.trim(), '')

      // Attachments/files
      if (r.assets && r.assets.length > 0) {
        lines.push('### Assets')
        for (const asset of r.assets) {
          lines.push(`- [${asset.name}](${asset.browser_download_url}) (${(asset.size / 1024).toFixed(2)} KB)`)
        }
        lines.push('')
      }

      // Source code links (zip and tarball)
      lines.push('### Source Code')
      lines.push(`- [Source code (zip)](${r.zipball_url})`)
      lines.push(`- [Source code (tar)](${r.tarball_url})`)
      lines.push('')
    }

    await mkdir('.github', { recursive: true })
    await writeFile('.github/RELEASES.md', lines.join('\n'), 'utf-8')
    console.log('✅ .github/RELEASES.md generated successfully.')
  } catch (err) {
    console.error('❌ Error generating RELEASES.md:', err.message)
  }
}

generateMarkdown()
