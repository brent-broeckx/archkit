export function runScaffoldCommand(commandName: string, argument?: string): void {
  const suffix = argument ?? ''
  console.log(`arch ${commandName} (scaffold): ${suffix}`.trim())
}
