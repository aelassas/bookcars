/*
* This script fetches the latest releases from GitHub repository and generates .github/RELEASES.md markdown file.
* It handles pagination and formats the release notes, assets, and source code links.
* It uses the GitHub API to fetch releases and requires Node.js with https module.
*
* @file releases.js
* Usage: node releases.js
*/
import { mkdir, writeFile } from 'fs/promises'
import https from 'https'

const repo = 'aelassas/bookcars'
const url = `https://api.github.com/repos/${repo}/releases`

/**
 * Fetches a page of releases from the GitHub API.
 *
 * @param {*} url 
 * @returns {*} 
 */
const fetchReleasesPage = (url) => {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Node.js',
        'Accept': 'application/vnd.github+json'
      }
    }, (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)

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

/**
 * Extracts the next page URL from the Link header.
 *
 * @param {*} linkHeader 
 * @returns {*} 
 */
const getNextLink = (linkHeader) => {
  // Parse Link header to find rel="next"
  const links = linkHeader.split(',').map((s) => s.trim())
  for (const link of links) {
    const match = link.match(/<([^>]+)>;\s*rel="([^"]+)"/)
    if (match && match[2] === 'next') {
      return match[1]
    }
  }
  return null
}

/**
 * Fetches all releases from the GitHub repository, handling pagination.
 *
 * @async
 * @returns {unknown} 
 */
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

/**
 * Formats a file size in bytes to a human-readable string.
 *
 * @param {*} bytes 
 * @returns {string} 
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) {
    return '0 Bytes'
  }
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const size = bytes / Math.pow(k, i)
  return `${size.toFixed(2)} ${sizes[i]}`
}

/**
 * Generates the RELEASES.md markdown file from the fetched releases.
 *
 * @async
 * @returns {*} 
 */
const generateMarkdown = async () => {
  try {
    const releases = await fetchAllReleases()

    const lines = ['# Releases', '']

    for (const r of releases) {
      const title = r.name || r.tag_name
      const date = r.published_at?.split('T')[0]
      let body = r.body || 'No changelog provided.'

      // Add two '#' before any '##' header lines to shift them down two levels
      body = body.replace(/^##/gm, '####')

      lines.push(`## [${title}](${r.html_url}) – ${date}`, '')
      lines.push(body.trim(), '')

      // Attachments/files
      if (r.assets && r.assets.length > 0) {
        lines.push('### Assets')
        for (const asset of r.assets) {
          lines.push(`- [${asset.name}](${asset.browser_download_url}) (${formatFileSize(asset.size)})`)
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
    console.log('.github/RELEASES.md generated successfully.')
  } catch (err) {
    console.error('Error generating RELEASES.md:', err.message)
  }
}

generateMarkdown() // Genarate RELEASES.md markdown file
