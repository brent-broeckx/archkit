import { Command } from 'commander'
import { runBuildCommand } from './commands/build'
import { runQueryCommand } from './commands/query'
import { runScaffoldCommand } from './commands/scaffold'
import { runShowCommand } from './commands/show'
import { runStatsCommand } from './commands/stats'
import { printCliBanner } from './utils/output'

export function buildProgram(): Command {
  const program = new Command()

  program
    .name('arch')
    .description('Arch CLI')
    .version('0.1.0')
    .action(() => {
      printCliBanner()
    })

  program
    .command('build')
    .description('Build the architecture graph')
    .argument('[repoPath]', 'Repository path', '.')
    .action(async (repoPath: string) => {
      await runBuildCommand(repoPath)
    })

  program
    .command('stats')
    .description('Display architecture statistics')
    .argument('[repoPath]', 'Repository path', '.')
    .action(async (repoPath: string) => {
      await runStatsCommand(repoPath)
    })

  program
    .command('query')
    .description('Search for symbols')
    .argument('[term]', 'Symbol query term')
    .action(async (term: string | undefined) => {
      await runQueryCommand(term)
    })

  program
    .command('deps')
    .description('Show dependencies for a symbol')
    .argument('[symbol]', 'Symbol name')
    .action((symbol: string | undefined) => {
      runScaffoldCommand('deps', symbol)
    })

  program
    .command('show')
    .description('Display a symbol snippet')
    .argument('[symbol]', 'Symbol name')
    .action(async (symbol: string | undefined) => {
      await runShowCommand(symbol)
    })

  program
    .command('context')
    .description('Compile context for a feature or symbol')
    .argument('[query]', 'Context query')
    .action((query: string | undefined) => {
      runScaffoldCommand('context', query)
    })

  return program
}
