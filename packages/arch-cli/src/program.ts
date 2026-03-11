import { Command } from 'commander'
import { runBuildCommand } from './commands/build'
import { runContextCommand, type ContextOutputOptions } from './commands/context'
import { runDepsCommand } from './commands/deps'
import {
  runFeatureAssignCommand,
  runFeatureShowCommand,
  runFeatureUnmappedCommand,
  runFeaturesListCommand,
  runFeaturesSuggestCommand,
} from './commands/feature'
import {
  type KnowledgeAddOptions,
  runKnowledgeAddCommand,
  runKnowledgeListCommand,
  runKnowledgeSearchCommand,
  runKnowledgeShowCommand,
} from './commands/knowledge'
import { runQueryCommand } from './commands/query'
import { runShowCommand } from './commands/show'
import { runStatsCommand } from './commands/stats'
import type { OutputOptions } from './models/output-mode'
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
    .option('--json', 'Output JSON')
    .option('--format <format>', 'Output format (human|llm)', 'human')
    .action(async (repoPath: string, outputOptions: OutputOptions) => {
      await runBuildCommand(repoPath, outputOptions)
    })

  program
    .command('stats')
    .description('Display architecture statistics')
    .argument('[repoPath]', 'Repository path', '.')
    .option('--json', 'Output JSON')
    .option('--format <format>', 'Output format (human|llm)', 'human')
    .action(async (repoPath: string, outputOptions: OutputOptions) => {
      await runStatsCommand(repoPath, outputOptions)
    })

  program
    .command('query')
    .description('Search for symbols')
    .argument('[term]', 'Symbol query term')
    .option('--json', 'Output JSON')
    .option('--format <format>', 'Output format (human|llm)', 'human')
    .action(async (term: string | undefined, outputOptions: OutputOptions) => {
      await runQueryCommand(term, outputOptions)
    })

  program
    .command('deps')
    .description('Show dependencies for a symbol')
    .argument('[symbol]', 'Symbol name')
    .option('--json', 'Output JSON')
    .option('--format <format>', 'Output format (human|llm)', 'human')
    .action(async (symbol: string | undefined, outputOptions: OutputOptions) => {
      await runDepsCommand(symbol, outputOptions)
    })

  program
    .command('show')
    .description('Display a symbol snippet')
    .argument('[symbol]', 'Symbol name')
    .option('--json', 'Output JSON')
    .option('--format <format>', 'Output format (human|llm)', 'human')
    .action(async (symbol: string | undefined, outputOptions: OutputOptions) => {
      await runShowCommand(symbol, outputOptions)
    })

  program
    .command('context')
    .description('Compile context for a feature or symbol')
    .argument('[query]', 'Context query')
    .option('--no-limits', 'Disable context limits and return full matched context')
    .option('--json', 'Output JSON')
    .option('--format <format>', 'Output format (human|llm)', 'human')
    .action(async (query: string | undefined, outputOptions: ContextOutputOptions) => {
      await runContextCommand(query, outputOptions)
    })

  const featuresCommand = program
    .command('features')
    .description('List configured features')
    .option('--json', 'Output JSON')
    .option('--format <format>', 'Output format (human|llm)', 'human')
    .action(async (outputOptions: OutputOptions) => {
      await runFeaturesListCommand(outputOptions)
    })

  featuresCommand
    .command('suggest')
    .description('Suggest feature mappings from known repository files')
    .option('--json', 'Output JSON')
    .option('--format <format>', 'Output format (human|llm)', 'human')
    .action(async (outputOptions: OutputOptions) => {
      await runFeaturesSuggestCommand(outputOptions)
    })

  const featureCommand = program
    .command('feature')
    .description('Inspect and manage feature mappings')
    .argument('[name]', 'Feature name')
    .option('--json', 'Output JSON')
    .option('--format <format>', 'Output format (human|llm)', 'human')
    .action(async (name: string | undefined, outputOptions: OutputOptions) => {
      await runFeatureShowCommand(name, outputOptions)
    })

  featureCommand
    .command('assign')
    .description('Assign a feature mapping pattern')
    .argument('<feature>', 'Feature name')
    .argument('<pattern>', 'Repository-relative glob pattern')
    .option('--json', 'Output JSON')
    .option('--format <format>', 'Output format (human|llm)', 'human')
    .action(async (feature: string, pattern: string, outputOptions: OutputOptions) => {
      await runFeatureAssignCommand(feature, pattern, outputOptions)
    })

  featureCommand
    .command('unmapped')
    .description('List source files not mapped to any configured feature')
    .option('--json', 'Output JSON')
    .option('--format <format>', 'Output format (human|llm)', 'human')
    .action(async (outputOptions: OutputOptions) => {
      await runFeatureUnmappedCommand(outputOptions)
    })

  const knowledgeCommand = program
    .command('knowledge')
    .description('Manage architecture knowledge entries')

  knowledgeCommand
    .command('add')
    .description('Add a knowledge entry')
    .requiredOption('--type <type>', 'Knowledge type')
    .requiredOption('--title <title>', 'Knowledge title')
    .requiredOption('--body <body>', 'Knowledge body')
    .option('--feature <feature>', 'Feature group', 'general')
    .option('--tags <tags>', 'Comma-separated tags')
    .option('--json', 'Output JSON')
    .option('--format <format>', 'Output format (human|llm)', 'human')
    .action(async (options: KnowledgeAddOptions) => {
      await runKnowledgeAddCommand(options)
    })

  knowledgeCommand
    .command('list')
    .description('List knowledge entries')
    .option('--json', 'Output JSON')
    .option('--format <format>', 'Output format (human|llm)', 'human')
    .action(async (outputOptions: OutputOptions) => {
      await runKnowledgeListCommand(outputOptions)
    })

  knowledgeCommand
    .command('show')
    .description('Show a knowledge entry')
    .argument('<id>', 'Knowledge entry id')
    .option('--json', 'Output JSON')
    .option('--format <format>', 'Output format (human|llm)', 'human')
    .action(async (id: string, outputOptions: OutputOptions) => {
      await runKnowledgeShowCommand(id, outputOptions)
    })

  knowledgeCommand
    .command('search')
    .description('Search knowledge entries')
    .argument('<query>', 'Knowledge search query')
    .option('--json', 'Output JSON')
    .option('--format <format>', 'Output format (human|llm)', 'human')
    .action(async (query: string, outputOptions: OutputOptions) => {
      await runKnowledgeSearchCommand(query, outputOptions)
    })

  return program
}
