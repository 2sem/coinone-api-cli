import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import type { Command } from 'commander'

import { createCli } from '../src/cli.js'

const outputPath = path.resolve(process.cwd(), 'docs/command-reference.md')

function getVisibleCommands(command: Command): Command[] {
  return command.commands.filter((child) => child.name() !== 'help')
}

function getCommandPath(command: Command): string[] {
  const names: string[] = []
  let current: Command | null = command

  while (current) {
    const name = current.name()

    if (name && name !== 'help') {
      names.unshift(name)
    }

    current = current.parent ?? null
  }

  return names
}

function getHeadingLevel(depth: number): string {
  return '#'.repeat(Math.min(depth + 2, 6))
}

function normalizeHelp(command: Command): string {
  return command.helpInformation().trimEnd()
}

function renderCommandSection(command: Command, depth = 0): string {
  const commandPath = getCommandPath(command).join(' ')
  const heading = `${getHeadingLevel(depth)} \`${commandPath}\``
  const childCommands = getVisibleCommands(command)
  const childList =
    childCommands.length === 0
      ? ''
      : `\nSubcommands:\n${childCommands.map((child) => `- \`${getCommandPath(child).join(' ')}\``).join('\n')}`

  const sections = [
    heading,
    '',
    '```text',
    normalizeHelp(command),
    '```',
    childList
  ].filter(Boolean)

  const descendants = childCommands.map((child) => renderCommandSection(child, depth + 1))

  return [sections.join('\n'), ...descendants].join('\n\n')
}

async function main(): Promise<void> {
  const cli = createCli({
    stdout: { write() {} },
    stderr: { write() {} }
  })

  const content = [
    '# Command Reference',
    '',
    '> [!IMPORTANT]',
    '> This file is generated from the live CLI command tree. Do not edit it by hand.',
    '> Refresh it with `npm run docs:generate-reference`.',
    '',
    '## Generation flow',
    '',
    '```mermaid',
    'flowchart TD',
    '  A[coinone CLI definitions] --> B[generate-command-reference script]',
    '  B --> C[docs/command-reference.md]',
    '  C --> D[VitePress build and GitHub Pages]',
    '```',
    '',
    '## Overview',
    '',
    '- generated from `createCli()` so command docs follow the shipped CLI structure',
    '- includes root help plus nested subcommand help blocks',
    '- excludes the built-in Commander `help` command from navigation sections',
    '',
    renderCommandSection(cli)
  ].join('\n')

  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${content}\n`, 'utf8')
}

await main()
