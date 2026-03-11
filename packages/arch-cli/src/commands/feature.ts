import {
  FeatureMappingConfigError,
  assignFeaturePattern,
  getFeatureDetails,
  listFeatureSummaries,
  listUnmappedFiles,
  loadFeatureMapping,
  suggestFeatureMappings,
} from '@archkit/graph'
import { formatFeatureResult } from '../formatters/feature'
import type {
  FeatureAssignCommandResult,
  FeatureShowCommandResult,
  FeatureUnmappedCommandResult,
  FeaturesListCommandResult,
  FeaturesSuggestCommandResult,
} from '../models/command-results'
import type { OutputOptions } from '../models/output-mode'
import { CliCommandError, handleCommandError, resolveOutputMode, writeFormattedOutput } from '../utils/command-output'

export async function executeFeaturesListCommand(
  cwd: string = process.cwd(),
): Promise<FeaturesListCommandResult> {
  try {
    const [mapping, features] = await Promise.all([
      loadFeatureMapping(cwd),
      listFeatureSummaries(cwd),
    ])

    return {
      action: 'list',
      hasConfig: mapping.hasConfig,
      configPath: mapping.configPath,
      features,
    }
  } catch {
    throw new CliCommandError('COMMAND_FAILED', 'Failed to list configured features.')
  }
}

export async function executeFeaturesSuggestCommand(
  cwd: string = process.cwd(),
): Promise<FeaturesSuggestCommandResult> {
  try {
    const result = await suggestFeatureMappings(cwd)
    return {
      action: 'suggest',
      suggestions: result.suggestions,
    }
  } catch (error) {
    if (isMissingFileError(error)) {
      throw new CliCommandError('GRAPH_NOT_FOUND', 'No graph data found. Run `arch build` first.')
    }

    throw new CliCommandError('COMMAND_FAILED', 'Failed to generate feature suggestions.')
  }
}

export async function executeFeatureShowCommand(
  name: string | undefined,
  cwd: string = process.cwd(),
): Promise<FeatureShowCommandResult> {
  const featureName = name?.trim()
  if (!featureName) {
    throw new CliCommandError('INVALID_INPUT', 'Provide a feature name. Usage: `arch feature <name>`.')
  }

  try {
    const [mapping, details] = await Promise.all([
      loadFeatureMapping(cwd),
      getFeatureDetails(cwd, featureName),
    ])

    if (!details) {
      throw new CliCommandError('FEATURE_NOT_FOUND', `No configured feature found for: ${featureName}`)
    }

    return {
      action: 'show',
      hasConfig: mapping.hasConfig,
      configPath: mapping.configPath,
      feature: details,
    }
  } catch (error) {
    if (error instanceof CliCommandError) {
      throw error
    }

    throw new CliCommandError('COMMAND_FAILED', 'Failed to load feature details.')
  }
}

export async function executeFeatureAssignCommand(
  feature: string | undefined,
  pattern: string | undefined,
  cwd: string = process.cwd(),
): Promise<FeatureAssignCommandResult> {
  const featureName = feature?.trim()
  const patternInput = pattern?.trim()

  if (!featureName || !patternInput) {
    throw new CliCommandError(
      'INVALID_INPUT',
      'Provide feature and pattern. Usage: `arch feature assign <feature> <pattern>`.',
    )
  }

  try {
    const assignment = await assignFeaturePattern(cwd, featureName, patternInput)
    return {
      action: 'assign',
      assignment,
    }
  } catch (error) {
    if (error instanceof FeatureMappingConfigError) {
      throw new CliCommandError('INVALID_INPUT', error.message)
    }

    throw new CliCommandError('COMMAND_FAILED', 'Failed to assign feature mapping.')
  }
}

export async function executeFeatureUnmappedCommand(
  cwd: string = process.cwd(),
): Promise<FeatureUnmappedCommandResult> {
  try {
    const [mapping, result] = await Promise.all([
      loadFeatureMapping(cwd),
      listUnmappedFiles(cwd),
    ])

    return {
      action: 'unmapped',
      hasConfig: mapping.hasConfig,
      configPath: mapping.configPath,
      unmappedFiles: result.unmappedFiles,
    }
  } catch (error) {
    if (isMissingFileError(error)) {
      throw new CliCommandError('GRAPH_NOT_FOUND', 'No graph data found. Run `arch build` first.')
    }

    throw new CliCommandError('COMMAND_FAILED', 'Failed to compute unmapped files.')
  }
}

export async function runFeaturesListCommand(outputOptions: OutputOptions): Promise<void> {
  try {
    const mode = resolveOutputMode(outputOptions, false)
    const result = await executeFeaturesListCommand()
    writeFormattedOutput(formatFeatureResult(result, mode))
  } catch (error) {
    handleCommandError(error, outputOptions)
  }
}

export async function runFeaturesSuggestCommand(outputOptions: OutputOptions): Promise<void> {
  try {
    const mode = resolveOutputMode(outputOptions, false)
    const result = await executeFeaturesSuggestCommand()
    writeFormattedOutput(formatFeatureResult(result, mode))
  } catch (error) {
    handleCommandError(error, outputOptions)
  }
}

export async function runFeatureShowCommand(
  name: string | undefined,
  outputOptions: OutputOptions,
): Promise<void> {
  try {
    const mode = resolveOutputMode(outputOptions, false)
    const result = await executeFeatureShowCommand(name)
    writeFormattedOutput(formatFeatureResult(result, mode))
  } catch (error) {
    handleCommandError(error, outputOptions)
  }
}

export async function runFeatureAssignCommand(
  feature: string | undefined,
  pattern: string | undefined,
  outputOptions: OutputOptions,
): Promise<void> {
  try {
    const mode = resolveOutputMode(outputOptions, false)
    const result = await executeFeatureAssignCommand(feature, pattern)
    writeFormattedOutput(formatFeatureResult(result, mode))
  } catch (error) {
    handleCommandError(error, outputOptions)
  }
}

export async function runFeatureUnmappedCommand(outputOptions: OutputOptions): Promise<void> {
  try {
    const mode = resolveOutputMode(outputOptions, false)
    const result = await executeFeatureUnmappedCommand()
    writeFormattedOutput(formatFeatureResult(result, mode))
  } catch (error) {
    handleCommandError(error, outputOptions)
  }
}

function isMissingFileError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false
  }

  const withCode = error as { code?: unknown }
  return withCode.code === 'ENOENT'
}
